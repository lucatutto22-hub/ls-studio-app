import type { Metadata } from "next";
import { requireClient } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Chat } from "@/components/Chat";
import type { Message } from "@/lib/types";

export const metadata: Metadata = { title: "Messages" };

export default async function ClientMessagesPage() {
  const profile = await requireClient();
  const supabase = await createClient();
  const { data } = await supabase.from("messages").select("*").order("created_at").limit(500);
  return (
    <main className="portal">
      <div className="chat solo">
        <Chat
          clientId={profile.client_id}
          initialMessages={(data ?? []) as Message[]}
          viewer="client"
          title="Votre conversation avec LS Studio"
          subtitle="L'équipe vous répond ici et vous prévient par e-mail."
          placeholder="Écrire à l'équipe LS Studio…"
        />
      </div>
    </main>
  );
}
