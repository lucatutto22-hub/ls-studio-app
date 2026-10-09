import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createInvoice, deleteInvoice, sendInvoiceEmail, setInvoicePaid } from "@/app/actions/admin";
import { ActionForm } from "@/components/ActionForm";
import { ActionButton } from "@/components/ConfirmButton";
import { Pill } from "@/components/ui";
import { addDays, eurCents, invoiceState, invoiceTotals, shortDate, todayIso } from "@/lib/format";
import type { Client, Invoice } from "@/lib/types";

export const metadata: Metadata = { title: "Facturation" };

export default async function InvoicesPage() {
  const supabase = await createClient();
  const [{ data: c }, { data: i }] = await Promise.all([
    supabase.from("clients").select("id, name, monthly_fee, status").order("name"),
    supabase.from("invoices").select("*").order("issued_on", { ascending: false }).order("number", { ascending: false }),
  ]);
  const clients = (c ?? []) as Pick<Client, "id" | "name" | "monthly_fee" | "status">[];
  const invoices = (i ?? []) as Invoice[];
  const name = (id: string) => clients.find((x) => x.id === id)?.name ?? "";
  const today = todayIso();

  return (
    <>
      <div className="head">
        <div>
          <h1>Facturation</h1>
          <p className="muted small" style={{ marginTop: 4 }}>
            Numérotation automatique. Pensez à renseigner vos coordonnées dans Paramètres pour qu&apos;elles apparaissent sur les factures.
          </p>
        </div>
      </div>
      <section className="panel stack">
        <h2>Nouvelle facture</h2>
        <ActionForm action={createInvoice} submitLabel="Créer la facture" resetOnSuccess>
          <div className="form-grid">
            <label className="field">
              Client
              <select name="client_id" required defaultValue="">
                <option value="" disabled>Choisir…</option>
                {clients.map((cl) => (
                  <option key={cl.id} value={cl.id}>{cl.name}</option>
                ))}
              </select>
            </label>
            <label className="field">Désignation<input name="label" placeholder="Abonnement contenu - octobre" /></label>
            <label className="field">Montant HT (€)<input name="amount_ht" type="number" min="0.01" step="0.01" required /></label>
            <label className="field">TVA (%)<input name="vat_rate" type="number" min="0" max="100" step="0.1" defaultValue="20" /></label>
            <label className="field">Émise le<input name="issued_on" type="date" defaultValue={today} /></label>
            <label className="field">Échéance<input name="due_on" type="date" defaultValue={addDays(today, 30)} /></label>
          </div>
        </ActionForm>
      </section>
      <section className="panel tbl-wrap">
        {invoices.length === 0 ? (
          <p className="empty-state">Aucune facture pour l&apos;instant.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>N°</th><th>Client</th><th>Émise</th><th>Échéance</th><th className="r">HT</th><th className="r">TTC</th><th>Statut</th><th></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const s = invoiceState(inv, today);
                const t = invoiceTotals(inv);
                return (
                  <tr key={inv.id}>
                    <td className="num"><Link href={`/factures/${inv.id}`}>{inv.number}</Link></td>
                    <td>{name(inv.client_id)}</td>
                    <td>{shortDate(inv.issued_on)}</td>
                    <td>{shortDate(inv.due_on)}</td>
                    <td className="r num">{eurCents(t.ht)}</td>
                    <td className="r num">{eurCents(t.ttc)}</td>
                    <td><Pill tone={s.tone}>{s.label}{inv.paid_on ? ` le ${shortDate(inv.paid_on)}` : ""}</Pill></td>
                    <td>
                      <div className="row-wrap" style={{ flexWrap: "nowrap" }}>
                        {inv.paid_on ? (
                          <ActionButton run={setInvoicePaid.bind(null, inv.id, false)} label="Annuler le paiement" className="btn sm ghost" />
                        ) : (
                          <>
                            <ActionButton run={setInvoicePaid.bind(null, inv.id, true)} label="Marquer payée" />
                            <ActionButton run={sendInvoiceEmail.bind(null, inv.id)} label="Envoyer par e-mail" className="btn sm ghost" />
                            <ActionButton run={deleteInvoice.bind(null, inv.id)} label="Supprimer" confirmLabel="Confirmer" className="btn sm ghost danger" />
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
