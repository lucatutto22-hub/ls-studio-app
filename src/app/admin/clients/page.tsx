import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createClientRecord } from "@/app/actions/admin";
import { ActionForm } from "@/components/ActionForm";
import { CLIENT_STATUS, Pill } from "@/components/ui";
import { eur, shortDate } from "@/lib/format";
import { ClientFields } from "./ClientFields";
import type { Client } from "@/lib/types";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage() {
  const supabase = await createClient();
  const [{ data: c }, { data: f }, { data: p }] = await Promise.all([
    supabase.from("clients").select("*").order("name"),
    supabase.from("files").select("client_id, status"),
    supabase.from("profiles").select("client_id").eq("role", "client"),
  ]);
  const clients = (c ?? []) as Client[];
  const files = f ?? [];
  const accounts = p ?? [];
  return (
    <>
      <div className="head">
        <div>
          <h1>Clients</h1>
          <p className="muted small" style={{ marginTop: 4 }}>Chaque client a ses identifiants et ne voit que ses propres fichiers.</p>
        </div>
      </div>
      <section className="panel tbl-wrap">
        {clients.length === 0 ? (
          <p className="empty-state">Aucun client pour l&apos;instant. Ajoutez le premier ci-dessous.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Client</th><th>Formule</th><th className="r">Mensuel HT</th><th>Depuis</th>
                <th className="r">Fichiers</th><th className="r">À valider</th><th>Accès</th><th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((cl) => {
                const mine = files.filter((x) => x.client_id === cl.id);
                const s = CLIENT_STATUS[cl.status];
                return (
                  <tr key={cl.id}>
                    <td>
                      <Link href={`/admin/clients/${cl.id}`} style={{ fontWeight: 600 }}>{cl.name}</Link>
                      <div className="small muted">{cl.email}</div>
                    </td>
                    <td>{cl.plan ?? "—"}</td>
                    <td className="r num">{Number(cl.monthly_fee) ? eur(Number(cl.monthly_fee)) : "—"}</td>
                    <td>{shortDate(cl.created_at)}</td>
                    <td className="r num">{mine.length}</td>
                    <td className="r num">{mine.filter((x) => x.status === "a_valider").length}</td>
                    <td>{accounts.some((a) => a.client_id === cl.id) ? <Pill tone="good">Oui</Pill> : <Pill tone="neutral">Non</Pill>}</td>
                    <td><Pill tone={s.tone}>{s.label}</Pill></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
      <section className="panel stack">
        <h2>Nouveau client</h2>
        <ActionForm action={createClientRecord} submitLabel="Créer le client">
          <ClientFields />
        </ActionForm>
      </section>
    </>
  );
}
