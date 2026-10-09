"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMail, siteUrl } from "@/lib/notify";
import type { Message } from "@/lib/types";

const QUIET_MINUTES = 15;

export async function sendMessage(clientId: string, body: string): Promise<{ message?: Message; error?: string }> {
  const text = body.trim();
  if (!text) return { error: "Le message est vide." };
  if (text.length > 5000) return { error: "Le message est trop long (5 000 caractères maximum)." };

  const profile = await getProfile();
  if (!profile) return { error: "Votre session a expiré. Reconnectez-vous." };
  const fromTeam = profile.role === "admin";
  if (!fromTeam && profile.client_id !== clientId) return { error: "Conversation introuvable." };

  const supabase = await createClient();
  const { data: previous } = await supabase
    .from("messages")
    .select("created_at, from_team")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("messages")
    .insert({ client_id: clientId, from_team: fromTeam, body: text })
    .select("*")
    .single();
  if (error || !data) return { error: "Le message n'a pas pu être envoyé. Réessayez." };

  // Un seul e-mail par salve de messages : pas de nouvel e-mail si la même personne
  // a déjà écrit dans les 15 dernières minutes.
  const recent =
    previous &&
    previous.from_team === fromTeam &&
    Date.now() - Date.parse(previous.created_at) < QUIET_MINUTES * 60_000;
  if (!recent) await notifyNewMessage(clientId, fromTeam, data as Message).catch(console.error);

  revalidatePath(fromTeam ? "/admin" : "/espace", "layout");
  return { message: data as Message };
}

async function notifyNewMessage(clientId: string, fromTeam: boolean, message: Message) {
  if (!process.env.RESEND_API_KEY || !process.env.SUPABASE_SECRET_KEY) return;
  const admin = createAdminClient();
  const { data: client } = await admin.from("clients").select("name").eq("id", clientId).single();
  const query = admin.from("profiles").select("email");
  const { data: people } = fromTeam
    ? await query.eq("client_id", clientId).eq("role", "client")
    : await query.eq("role", "admin");
  const to = (people ?? []).map((p) => p.email as string);
  const preview = message.body.length > 280 ? message.body.slice(0, 280) + "…" : message.body;
  await sendMail({
    to,
    subject: fromTeam ? "Nouveau message de LS Studio" : `Nouveau message de ${client?.name ?? "un client"}`,
    text: `${message.sender_name ?? ""} a écrit :\n\n${preview}\n\nRépondre : ${siteUrl(
      fromTeam ? "/espace/messages" : `/admin/messagerie/${clientId}`,
    )}`,
  });
}

export async function markRead(clientId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("mark_messages_read", { p_client_id: clientId });
}
