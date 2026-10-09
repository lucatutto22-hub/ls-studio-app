import type { Metadata } from "next";
import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Pill } from "@/components/ui";
import { eurCents, invoiceState, invoiceTotals, shortDate } from "@/lib/format";
import type { Invoice } from "@/lib/types";

export const metadata: Metadata = { title: "Factures" };

export default async function ClientInvoicesPage() {
  await requireClient();
  const supabase = await createClient();
  const { data } = await supabase.from("invoices").select("*").order("issued_on", { ascending: false });
  const invoices = (data ?? []) as Invoice[];
  return (
    <main className="portal">
      <h1>Vos factures</h1>
      <section className="panel">
        {invoices.length === 0 ? (
          <p className="empty-state">Aucune facture pour l&apos;instant.</p>
        ) : (
          <div className="list">
            {invoices.map((inv) => {
              const s = invoiceState(inv);
              return (
                <div key={inv.id} className="list-row">
                  <div className="grow">
                    <strong className="num">{inv.number}</strong>{" "}
                    <span className="small muted">émise le {shortDate(inv.issued_on)} · {inv.label}</span>
                  </div>
                  <span className="num">{eurCents(invoiceTotals(inv).ttc)} TTC</span>
                  <Pill tone={s.tone}>{s.label}</Pill>
                  <Link className="btn sm" href={`/factures/${inv.id}`}>Voir</Link>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
