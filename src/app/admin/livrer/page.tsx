import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Uploader } from "./Uploader";

export const metadata: Metadata = { title: "Livrer des fichiers" };

export default async function DeliverPage({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const { client } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("clients").select("id, name").in("status", ["actif", "pause"]).order("name");
  const clients = data ?? [];
  return (
    <>
      <div className="head">
        <div>
          <h1>Livrer des fichiers</h1>
          <p className="muted small" style={{ marginTop: 4 }}>
            Les fichiers apparaissent tout de suite dans l&apos;espace du client, qui est prévenu par e-mail.
          </p>
        </div>
      </div>
      {clients.length === 0 ? (
        <p className="panel empty-state">
          Aucun client actif. <Link href="/admin/clients">Ajoutez un client</Link> pour commencer.
        </p>
      ) : (
        <Uploader clients={clients} defaultClient={clients.some((c) => c.id === client) ? client : undefined} />
      )}
    </>
  );
}
