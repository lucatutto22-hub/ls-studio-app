"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { addDays, todayIso } from "@/lib/format";
import { sendMail, siteUrl } from "@/lib/notify";

export type ActionState = { error?: string; ok?: string; password?: string };

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const optional = (fd: FormData, k: string) => str(fd, k) || null;
const money = (fd: FormData, k: string) => Number(str(fd, k).replace(",", ".") || 0);

// ---------- Clients ----------

function clientFields(fd: FormData) {
  return {
    name: str(fd, "name"),
    contact_name: optional(fd, "contact_name"),
    email: optional(fd, "email")?.toLowerCase() ?? null,
    phone: optional(fd, "phone"),
    plan: optional(fd, "plan"),
    monthly_fee: money(fd, "monthly_fee"),
    status: str(fd, "status") || "actif",
    address: optional(fd, "address"),
    notes: optional(fd, "notes"),
  };
}

export async function createClientRecord(_p: ActionState, fd: FormData): Promise<ActionState> {
  await assertAdmin();
  const fields = clientFields(fd);
  if (!fields.name) return { error: "Indiquez le nom du client." };
  if (!(fields.monthly_fee >= 0)) return { error: "Le montant mensuel est invalide." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("clients").insert(fields).select("id").single();
  if (error || !data) return { error: "Impossible de créer le client." };
  revalidatePath("/admin", "layout");
  redirect(`/admin/clients/${data.id}`);
}

export async function updateClientRecord(id: string, _p: ActionState, fd: FormData): Promise<ActionState> {
  await assertAdmin();
  const fields = clientFields(fd);
  if (!fields.name) return { error: "Indiquez le nom du client." };
  if (!(fields.monthly_fee >= 0)) return { error: "Le montant mensuel est invalide." };
  const supabase = await createClient();
  const { error } = await supabase.from("clients").update(fields).eq("id", id);
  if (error) return { error: "Impossible d'enregistrer." };
  revalidatePath("/admin", "layout");
  return { ok: "Fiche client enregistrée." };
}

function tempPassword(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(14));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/** Crée un compte (client ou administrateur) avec un mot de passe provisoire affiché une fois. */
async function createAccount(
  role: "client" | "admin",
  email: string,
  fullName: string,
  clientId: string | null,
): Promise<ActionState> {
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Adresse e-mail invalide." };
  const password = tempPassword();
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role, client_id: clientId ?? "" },
    user_metadata: { full_name: fullName },
  });
  if (error) {
    return {
      error: /already|registered|exists/i.test(error.message)
        ? "Un compte existe déjà avec cette adresse."
        : "Impossible de créer le compte.",
    };
  }
  await sendMail({
    to: [email],
    subject: role === "admin" ? "Votre accès à LS Studio" : "Votre espace client LS Studio",
    text: `Bonjour${fullName ? " " + fullName : ""},\n\nVotre accès est prêt : ${siteUrl("/connexion")}\nIdentifiant : ${email}\nMot de passe provisoire : ${password}\n\nPensez à le changer après votre première connexion (${siteUrl(
      "/compte/mot-de-passe",
    )}).\n\nL'équipe LS Studio`,
  });
  return { ok: `Compte créé pour ${email}.`, password };
}

export async function createClientAccess(clientId: string, _p: ActionState, fd: FormData): Promise<ActionState> {
  await assertAdmin();
  const res = await createAccount("client", str(fd, "email").toLowerCase(), str(fd, "full_name"), clientId);
  revalidatePath(`/admin/clients/${clientId}`);
  return res;
}

export async function createAdminAccess(_p: ActionState, fd: FormData): Promise<ActionState> {
  await assertAdmin();
  const res = await createAccount("admin", str(fd, "email").toLowerCase(), str(fd, "full_name"), null);
  revalidatePath("/admin/parametres");
  return res;
}

export async function removeAccess(userId: string) {
  const me = await assertAdmin();
  if (userId === me.id) return { error: "Vous ne pouvez pas supprimer votre propre accès." };
  const { error } = await createAdminClient().auth.admin.deleteUser(userId);
  if (error) return { error: "Impossible de supprimer cet accès." };
  revalidatePath("/admin", "layout");
  return { ok: true };
}

// ---------- Factures ----------

export async function createInvoice(_p: ActionState, fd: FormData): Promise<ActionState> {
  await assertAdmin();
  const clientId = str(fd, "client_id");
  const amount = money(fd, "amount_ht");
  const vat = Number(str(fd, "vat_rate").replace(",", ".") || 0);
  const issued = str(fd, "issued_on") || todayIso();
  const due = str(fd, "due_on") || addDays(issued, 30);
  if (!clientId) return { error: "Choisissez un client." };
  if (!(amount > 0)) return { error: "Le montant doit être supérieur à 0 €." };
  if (!(vat >= 0 && vat <= 100)) return { error: "Taux de TVA invalide." };
  if (due < issued) return { error: "L'échéance doit être après la date d'émission." };

  const supabase = await createClient();
  // Deux essais au cas où l'autre administrateur crée une facture au même moment.
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data: number } = await supabase.rpc("next_invoice_number", { p_year: Number(issued.slice(0, 4)) });
    const { error } = await supabase.from("invoices").insert({
      number,
      client_id: clientId,
      label: str(fd, "label") || "Prestation de création de contenu",
      amount_ht: amount,
      vat_rate: vat,
      issued_on: issued,
      due_on: due,
    });
    if (!error) {
      revalidatePath("/admin", "layout");
      return { ok: `Facture ${number} créée.` };
    }
    if (error.code !== "23505") break;
  }
  return { error: "Impossible de créer la facture." };
}

export async function setInvoicePaid(id: string, paid: boolean) {
  await assertAdmin();
  const supabase = await createClient();
  await supabase.from("invoices").update({ paid_on: paid ? todayIso() : null }).eq("id", id);
  revalidatePath("/admin", "layout");
}

export async function deleteInvoice(id: string) {
  await assertAdmin();
  const supabase = await createClient();
  await supabase.from("invoices").delete().eq("id", id).is("paid_on", null);
  revalidatePath("/admin", "layout");
}

export async function sendInvoiceEmail(id: string) {
  await assertAdmin();
  const supabase = await createClient();
  const { data: inv } = await supabase.from("invoices").select("number, client_id, due_on").eq("id", id).single();
  if (!inv) return { error: "Facture introuvable." };
  const { data: people } = await supabase.from("profiles").select("email").eq("client_id", inv.client_id).eq("role", "client");
  const { data: client } = await supabase.from("clients").select("email").eq("id", inv.client_id).single();
  const to = [...(people ?? []).map((p) => p.email as string), client?.email ?? ""];
  if (!to.some(Boolean)) return { error: "Aucune adresse e-mail pour ce client." };
  await sendMail({
    to,
    subject: `Facture ${inv.number} - LS Studio`,
    text: `Bonjour,\n\nVotre facture ${inv.number} est disponible dans votre espace : ${siteUrl(
      `/factures/${id}`,
    )}\n\nMerci,\nL'équipe LS Studio`,
  });
  return { ok: true };
}

// ---------- Tâches ----------

export async function createTask(_p: ActionState, fd: FormData): Promise<ActionState> {
  await assertAdmin();
  const title = str(fd, "title");
  if (!title) return { error: "Décrivez la tâche." };
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").insert({
    title: title.slice(0, 300),
    client_id: optional(fd, "client_id"),
    due_on: optional(fd, "due_on"),
    assignee_id: optional(fd, "assignee_id"),
  });
  if (error) return { error: "Impossible d'ajouter la tâche." };
  revalidatePath("/admin", "layout");
  return { ok: "Tâche ajoutée." };
}

export async function setTaskStatus(id: string, status: "a_faire" | "en_cours" | "termine") {
  await assertAdmin();
  const supabase = await createClient();
  await supabase.from("tasks").update({ status }).eq("id", id);
  revalidatePath("/admin", "layout");
}

export async function deleteTask(id: string) {
  await assertAdmin();
  const supabase = await createClient();
  await supabase.from("tasks").delete().eq("id", id);
  revalidatePath("/admin", "layout");
}

// ---------- Paramètres ----------

export async function updateCompanySettings(_p: ActionState, fd: FormData): Promise<ActionState> {
  await assertAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("company_settings")
    .update({
      legal_name: str(fd, "legal_name") || "LS Studio",
      address: optional(fd, "address"),
      siret: optional(fd, "siret"),
      vat_number: optional(fd, "vat_number"),
      vat_note: optional(fd, "vat_note"),
      iban: optional(fd, "iban"),
      email: optional(fd, "email"),
      phone: optional(fd, "phone"),
    })
    .eq("id", 1);
  if (error) return { error: "Impossible d'enregistrer." };
  revalidatePath("/admin/parametres");
  return { ok: "Coordonnées enregistrées." };
}
