import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/PrintButton";
import { eurCents, invoiceTotals, longDate } from "@/lib/format";
import type { Client, CompanySettings, Invoice } from "@/lib/types";

export const metadata: Metadata = { title: "Facture" };

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getProfile();
  if (!profile) redirect("/connexion");
  const supabase = await createClient();
  const { data: inv } = await supabase.from("invoices").select("*").eq("id", id).maybeSingle();
  if (!inv) notFound();
  const invoice = inv as Invoice;
  const [{ data: client }, { data: company }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", invoice.client_id).single(),
    supabase.from("company_settings").select("*").eq("id", 1).single(),
  ]);
  const c = client as Client;
  const co = (company ?? { legal_name: "LS Studio" }) as CompanySettings;
  const t = invoiceTotals(invoice);
  const back = profile.role === "admin" ? "/admin/factures" : "/espace/factures";

  return (
    <>
      <div className="no-print row-wrap" style={{ maxWidth: 820, margin: "24px auto 0", padding: "0 16px", justifyContent: "space-between" }}>
        <Link href={back} className="btn ghost">← Retour</Link>
        <PrintButton />
      </div>
      <article className="invoice">
        <div className="head" style={{ alignItems: "flex-start" }}>
          <Image src="/logo.png" alt="LS Studio" width={140} height={141} />
          <div style={{ textAlign: "right" }}>
            <h1>Facture</h1>
            <p className="num" style={{ fontWeight: 600 }}>{invoice.number}</p>
            <p className="small muted">Émise le {longDate(invoice.issued_on)}</p>
            <p className="small muted">Échéance : {longDate(invoice.due_on)}</p>
          </div>
        </div>
        <div className="head" style={{ marginTop: 32, alignItems: "flex-start" }}>
          <div className="small" style={{ whiteSpace: "pre-line" }}>
            <strong>{co.legal_name}</strong>
            {co.address && `\n${co.address}`}
            {co.siret && `\nSIRET : ${co.siret}`}
            {co.vat_number && `\nTVA : ${co.vat_number}`}
            {co.email && `\n${co.email}`}
            {co.phone && `\n${co.phone}`}
          </div>
          <div className="small" style={{ whiteSpace: "pre-line", textAlign: "right" }}>
            <span className="label">Facturé à</span>
            {`\n`}
            <strong>{c.name}</strong>
            {c.contact_name && `\n${c.contact_name}`}
            {c.address && `\n${c.address}`}
            {c.email && `\n${c.email}`}
          </div>
        </div>
        <table style={{ marginTop: 32 }}>
          <thead>
            <tr>
              <th>Désignation</th>
              <th className="r">Montant HT</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ whiteSpace: "normal" }}>{invoice.label}</td>
              <td className="r num">{eurCents(t.ht)}</td>
            </tr>
          </tbody>
        </table>
        <table style={{ marginTop: 16, maxWidth: 320, marginLeft: "auto" }}>
          <tbody>
            <tr>
              <td>Total HT</td>
              <td className="r num">{eurCents(t.ht)}</td>
            </tr>
            <tr>
              <td>TVA ({Number(invoice.vat_rate).toString().replace(".", ",")} %)</td>
              <td className="r num">{eurCents(t.tva)}</td>
            </tr>
            <tr>
              <td><strong>Total TTC</strong></td>
              <td className="r num"><strong>{eurCents(t.ttc)}</strong></td>
            </tr>
          </tbody>
        </table>
        <div className="small muted" style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 4 }}>
          {Number(invoice.vat_rate) === 0 && co.vat_note && <p>{co.vat_note}</p>}
          {invoice.paid_on ? (
            <p>Facture acquittée le {longDate(invoice.paid_on)}.</p>
          ) : (
            <>
              <p>Paiement par virement avant le {longDate(invoice.due_on)}.{co.iban ? ` IBAN : ${co.iban}` : ""}</p>
              <p>
                En cas de retard de paiement : pénalités au taux de trois fois le taux d&apos;intérêt légal et
                indemnité forfaitaire de 40 € pour frais de recouvrement. Pas d&apos;escompte pour paiement anticipé.
              </p>
            </>
          )}
        </div>
      </article>
    </>
  );
}
