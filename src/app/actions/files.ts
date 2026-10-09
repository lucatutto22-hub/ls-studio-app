"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin, getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { deleteObject } from "@/lib/r2";
import { sendMail, siteUrl } from "@/lib/notify";

type Uploaded = { key: string; name: string; mime: string; size: number };

function kindOf(mime: string): "photo" | "video" | "autre" {
  if (mime.startsWith("image/")) return "photo";
  if (mime.startsWith("video/")) return "video";
  return "autre";
}

/** Enregistre les fichiers envoyés sur R2 et prévient le client par e-mail. */
export async function registerFiles(clientId: string, campaign: string, files: Uploaded[]) {
  const profile = await assertAdmin();
  const supabase = await createClient();
  const valid = files.filter((f) => f.key.startsWith(`${clientId}/`));
  if (valid.length === 0) return { error: "Aucun fichier à enregistrer." };

  const { error } = await supabase.from("files").insert(
    valid.map((f) => ({
      client_id: clientId,
      storage_key: f.key,
      name: f.name.slice(0, 250),
      kind: kindOf(f.mime),
      mime_type: f.mime,
      size_bytes: f.size,
      campaign: campaign.trim() || null,
      uploaded_by: profile.id,
    })),
  );
  if (error) return { error: "Les fichiers sont envoyés mais n'ont pas pu être enregistrés. Réessayez." };

  const { data: people } = await supabase.from("profiles").select("email").eq("client_id", clientId).eq("role", "client");
  const n = valid.length;
  await sendMail({
    to: (people ?? []).map((p) => p.email as string),
    subject: `${n} nouveau${n > 1 ? "x" : ""} fichier${n > 1 ? "s" : ""} dans votre espace LS Studio`,
    text: `Bonjour,\n\nLS Studio vient de déposer ${n} fichier${n > 1 ? "s" : ""}${
      campaign.trim() ? ` (${campaign.trim()})` : ""
    } dans votre espace.\n\nLes voir et les télécharger : ${siteUrl("/espace")}\n\nÀ bientôt,\nL'équipe LS Studio`,
  });

  revalidatePath("/admin", "layout");
  return { ok: true };
}

/** Le client valide un fichier ou demande une modification. */
export async function reviewFile(fileId: string, status: "valide" | "modif_demandee", comment?: string) {
  const profile = await getProfile();
  if (!profile || profile.role !== "client") return { error: "Action réservée aux clients." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_file", {
    p_file_id: fileId,
    p_status: status,
    p_comment: comment?.slice(0, 1000) ?? null,
  });
  if (error) return { error: "Impossible d'enregistrer votre réponse. Réessayez." };

  if (status === "modif_demandee") {
    const { data: file } = await supabase.from("files").select("name").eq("id", fileId).single();
    const { data: client } = await supabase.from("clients").select("name").eq("id", profile.client_id!).single();
    const { createAdminClient } = await import("@/lib/supabase/admin");
    if (process.env.SUPABASE_SECRET_KEY) {
      const { data: admins } = await createAdminClient().from("profiles").select("email").eq("role", "admin");
      await sendMail({
        to: (admins ?? []).map((a) => a.email as string),
        subject: `Modification demandée par ${client?.name ?? "un client"}`,
        text: `Fichier : ${file?.name ?? ""}\nCommentaire : ${comment?.trim() || "(aucun)"}\n\nUne tâche a été créée : ${siteUrl("/admin/taches")}`,
      });
    }
  }
  revalidatePath("/espace");
  return { ok: true };
}

export async function markAllSeen(fileIds: string[]) {
  const supabase = await createClient();
  await supabase.rpc("mark_files_seen", { p_file_ids: fileIds });
  revalidatePath("/espace");
}

export async function deleteFile(fileId: string) {
  await assertAdmin();
  const supabase = await createClient();
  const { data: file } = await supabase.from("files").select("storage_key").eq("id", fileId).single();
  if (!file) return { error: "Fichier introuvable." };
  await deleteObject(file.storage_key);
  await supabase.from("files").delete().eq("id", fileId);
  revalidatePath("/admin", "layout");
  return { ok: true };
}
