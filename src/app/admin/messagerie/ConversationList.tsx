import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { shortDate } from "@/lib/format";
import type { Client, Message } from "@/lib/types";

export async function ConversationList({ current }: { current?: string }) {
  const supabase = await createClient();
  const [{ data: c }, { data: m }] = await Promise.all([
    supabase.from("clients").select("id, name, status").in("status", ["actif", "pause", "prospect"]),
    supabase.from("messages").select("client_id, body, from_team, sender_name, read_at, created_at").order("created_at", { ascending: false }).limit(1000),
  ]);
  const clients = (c ?? []) as Pick<Client, "id" | "name" | "status">[];
  const messages = (m ?? []) as Message[];
  const rows = clients
    .map((cl) => {
      const mine = messages.filter((x) => x.client_id === cl.id);
      return { ...cl, last: mine[0], unread: mine.filter((x) => !x.from_team && !x.read_at).length };
    })
    .sort((a, b) => (b.last?.created_at ?? "").localeCompare(a.last?.created_at ?? "") || a.name.localeCompare(b.name));

  return (
    <nav className="convs" aria-label="Conversations">
      {rows.length === 0 && <p className="empty-state small" style={{ padding: 16 }}>Ajoutez un client pour démarrer une conversation.</p>}
      {rows.map((r) => (
        <Link key={r.id} href={`/admin/messagerie/${r.id}`} className="conv" aria-current={r.id === current}>
          <span className="top-l">
            <span>{r.name}</span>
            {r.unread > 0 && <span className="dot" aria-label={`${r.unread} non lus`} />}
          </span>
          <span className="prev">
            {r.last
              ? `${shortDate(r.last.created_at)} · ${r.last.from_team ? (r.last.sender_name ?? "LS Studio") + " : " : ""}${r.last.body}`
              : "Pas encore de message"}
          </span>
        </Link>
      ))}
    </nav>
  );
}
