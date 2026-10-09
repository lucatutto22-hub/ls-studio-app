import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminAccess, removeAccess, updateCompanySettings } from "@/app/actions/admin";
import { ActionForm } from "@/components/ActionForm";
import { ActionButton } from "@/components/ConfirmButton";
import { requireAdmin } from "@/lib/auth";
import type { CompanySettings, Profile } from "@/lib/types";

export const metadata: Metadata = { title: "Paramètres" };

export default async function SettingsPage() {
  const me = await requireAdmin();
  const supabase = await createClient();
  const [{ data: s }, { data: a }] = await Promise.all([
    supabase.from("company_settings").select("*").eq("id", 1).single(),
    supabase.from("profiles").select("id, full_name, email, role, client_id").eq("role", "admin"),
  ]);
  const co = (s ?? {}) as Partial<CompanySettings>;
  const admins = (a ?? []) as Profile[];
  return (
    <>
      <div className="head"><h1>Paramètres</h1></div>
      <section className="panel stack">
        <h2>Coordonnées sur les factures</h2>
        <ActionForm action={updateCompanySettings} submitLabel="Enregistrer">
          <div className="form-grid">
            <label className="field">Raison sociale<input name="legal_name" defaultValue={co.legal_name ?? "LS Studio"} /></label>
            <label className="field">SIRET<input name="siret" defaultValue={co.siret ?? ""} /></label>
            <label className="field">N° de TVA<input name="vat_number" defaultValue={co.vat_number ?? ""} /></label>
            <label className="field">E-mail<input name="email" type="email" defaultValue={co.email ?? ""} /></label>
            <label className="field">Téléphone<input name="phone" defaultValue={co.phone ?? ""} /></label>
            <label className="field">IBAN<input name="iban" defaultValue={co.iban ?? ""} /></label>
            <label className="field" style={{ gridColumn: "1 / -1" }}>Adresse<textarea name="address" defaultValue={co.address ?? ""} /></label>
            <label className="field" style={{ gridColumn: "1 / -1" }}>
              Mention si TVA à 0 %
              <input name="vat_note" defaultValue={co.vat_note ?? ""} placeholder="TVA non applicable, art. 293 B du CGI" />
            </label>
          </div>
        </ActionForm>
      </section>
      <section className="panel stack">
        <h2>Équipe</h2>
        <div className="list">
          {admins.map((p) => (
            <div key={p.id} className="list-row">
              <div className="grow"><strong>{p.full_name || p.email}</strong> <span className="small muted">{p.email}</span></div>
              {p.id !== me.id && (
                <ActionButton run={removeAccess.bind(null, p.id)} label="Retirer l'accès" confirmLabel="Confirmer le retrait" className="btn sm danger" />
              )}
            </div>
          ))}
        </div>
        <ActionForm action={createAdminAccess} submitLabel="Ajouter un administrateur" resetOnSuccess>
          <div className="form-grid">
            <label className="field">Prénom<input name="full_name" required /></label>
            <label className="field">E-mail<input name="email" type="email" required /></label>
          </div>
        </ActionForm>
      </section>
    </>
  );
}
