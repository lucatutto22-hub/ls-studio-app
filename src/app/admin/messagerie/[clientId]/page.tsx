import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Chat } from "@/components/Chat";
import { ConversationList } from "../ConversationList";
import type { Message } from "@/lib/types";

export const metadata: Metadata = { title: "Messagerie" };

export default async function Conversation({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const supabase = await createClient();
  const { data: client } = await supabase.from("clients").select("id, name, email").eq("id", clientId).maybeSingle();
  if (!client) notFound();
  const { data } = await supabase.from("messages").select("*").eq("client_id", clientId).order("created_at").limit(500);
  return (
    <>
      <div className="head">
        <h1>Messagerie</h1>
      </div>
      <div className="chat">
        <ConversationList current={clientId} />
        <Chat
          key={clientId}
          clientId={clientId}
          initialMessages={(data ?? []) as Message[]}
          viewer="team"
          title={client.name}
          subtitle={client.email ?? undefined}
          placeholder={`Écrire à ${client.name}…`}
        />
      </div>
    </>
  );
}
