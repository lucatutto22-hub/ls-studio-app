import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RevenueChart } from "@/components/RevenueChart";
import { Pill, dueInfo } from "@/components/ui";
import { eur, invoiceState, longDate, plural, shortDate, todayIso } from "@/lib/format";
import type { Client, Invoice, StoredFile, Task } from "@/lib/types";

export const metadata: Metadata = { title: "Tableau de bord" };

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

export default async function Dashboard() {
  const supabase = await createClient();
  const today = todayIso();
  const [{ data: c }, { data: i }, { data: t }, { data: f }] = await Promise.all([
    supabase.from("clients").select("*"),
    supabase.from("invoices").select("*"),
    supabase.from("tasks").select("*").neq("status", "termine").order("due_on", { nullsFirst: false }),
    supabase.from("files").select("id, name, client_id, client_comment, created_at, status").eq("status", "modif_demandee").order("created_at", { ascending: false }).limit(5),
  ]);
  const clients = (c ?? []) as Client[];
  const invoices = (i ?? []) as Invoice[];
  const tasks = (t ?? []) as Task[];
  const feedback = (f ?? []) as Pick<StoredFile, "id" | "name" | "client_id" | "client_comment" | "created_at">[];
  const clientName = (id: string | null) => clients.find((x) => x.id === id)?.name ?? "";

  // CA encaissé (HT) par mois de paiement, sur les 12 derniers mois.
  const [yy, mm] = today.split("-").map(Number);
  const months = Array.from({ length: 12 }, (_, k) => {
    const d = new Date(Date.UTC(yy, mm - 1 - (11 - k), 1));
    const key = d.toISOString().slice(0, 7);
    const value = invoices.filter((x) => x.paid_on?.startsWith(key)).reduce((s, x) => s + Number(x.amount_ht), 0);
    return { key, label: MONTHS[d.getUTCMonth()], value, current: k === 11 };
  });
  const yearRevenue = invoices.filter((x) => x.paid_on?.startsWith(String(yy))).reduce((s, x) => s + Number(x.amount_ht), 0);
  const prev = months[10].value, cur = months[11].value;
  const active = clients.filter((x) => x.status === "actif");
  const mrr = active.reduce((s, x) => s + Number(x.monthly_fee), 0);
  const unpaid = invoices.filter((x) => !x.paid_on);
  const overdue = unpaid.filter((x) => x.due_on < today);
  const lateTasks = tasks.filter((x) => dueInfo(x.due_on, x.status, today).late);

  return (
    <>
      <div className="head">
        <div>
          <div className="label">{longDate(today)}</div>
          <h1>Tableau de bord</h1>
        </div>
      </div>
      <div className="kpis">
        <div className="kpi">
          <span className="label">CA {yy} encaissé</span>
          <span className="v">{eur(yearRevenue)}</span>
          <span className="d">HT, depuis le 1er janvier</span>
        </div>
        <div className="kpi">
          <span className="label">CA du mois</span>
          <span className="v">{eur(cur)}</span>
          <span className="d">{months[10].label} : {eur(prev)}</span>
        </div>
        <div className="kpi">
          <span className="label">Abonnements / mois</span>
          <span className="v">{eur(mrr)}</span>
          <span className="d">{plural(active.length, "client actif", "clients actifs")} sur {clients.length}</span>
        </div>
        <div className="kpi">
          <span className="label">À encaisser</span>
          <span className="v">{eur(unpaid.reduce((s, x) => s + Number(x.amount_ht), 0))}</span>
          <span className={`d${overdue.length ? " bad" : ""}`}>
            {plural(unpaid.length, "facture", "factures")}{overdue.length ? ` · ${overdue.length} en retard` : ""}
          </span>
        </div>
        <div className="kpi">
          <span className="label">Tâches en retard</span>
          <span className="v">{lateTasks.length}</span>
          <span className={`d${lateTasks.length ? " bad" : ""}`}>sur {tasks.length} en cours</span>
        </div>
      </div>

      <div className="grid2">
        <section className="panel chart">
          <div className="head" style={{ marginBottom: 10 }}>
            <h2>Chiffre d&apos;affaires encaissé</h2>
            <span className="small muted">12 derniers mois, HT</span>
          </div>
          <RevenueChart months={months} />
        </section>
        <section className="panel">
          <div className="head" style={{ marginBottom: 6 }}>
            <h2>Prochaines échéances</h2>
            <Link className="btn sm ghost" href="/admin/taches">Tout voir</Link>
          </div>
          <div className="list">
            {tasks.length === 0 && <p className="empty-state">Aucune tâche en cours.</p>}
            {tasks.slice(0, 6).map((task) => {
              const d = dueInfo(task.due_on, task.status, today);
              return (
                <div key={task.id} className="list-row">
                  <div className="grow">
                    <div style={{ fontWeight: 600 }}>{task.title}</div>
                    <div className="small muted">{clientName(task.client_id)}</div>
                  </div>
                  <Pill tone={d.tone}>{d.label}</Pill>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="grid2">
        <section className="panel">
          <div className="head" style={{ marginBottom: 6 }}>
            <h2>Factures non payées</h2>
            <Link className="btn sm ghost" href="/admin/factures">Facturation</Link>
          </div>
          <div className="list">
            {unpaid.length === 0 && <p className="empty-state">Tout est encaissé.</p>}
            {unpaid.sort((a, b) => a.due_on.localeCompare(b.due_on)).map((inv) => {
              const s = invoiceState(inv, today);
              return (
                <div key={inv.id} className="list-row">
                  <div className="grow">
                    <strong>{clientName(inv.client_id)}</strong>{" "}
                    <span className="small muted">{inv.number} · échéance {shortDate(inv.due_on)}</span>
                  </div>
                  <span className="num">{eur(Number(inv.amount_ht))}</span>
                  <Pill tone={s.tone}>{s.label}</Pill>
                </div>
              );
            })}
          </div>
        </section>
        <section className="panel">
          <h2 style={{ marginBottom: 6 }}>Retours clients</h2>
          <div className="list">
            {feedback.length === 0 && <p className="empty-state">Aucune modification demandée.</p>}
            {feedback.map((file) => (
              <div key={file.id} className="list-row">
                <div className="grow">
                  <div style={{ fontWeight: 600 }}>{clientName(file.client_id)}</div>
                  <div className="small muted">
                    {file.name}
                    {file.client_comment ? ` : « ${file.client_comment} »` : ""}
                  </div>
                </div>
                <Pill tone="warn">Modif</Pill>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
