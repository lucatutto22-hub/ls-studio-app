import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createTask, deleteTask, setTaskStatus } from "@/app/actions/admin";
import { ActionForm } from "@/components/ActionForm";
import { ActionButton } from "@/components/ConfirmButton";
import { Pill, dueInfo } from "@/components/ui";
import { addDays, todayIso } from "@/lib/format";
import type { Client, Profile, Task, TaskStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Tâches" };

const COLUMNS: { key: TaskStatus; label: string }[] = [
  { key: "a_faire", label: "À faire" },
  { key: "en_cours", label: "En cours" },
  { key: "termine", label: "Terminé" },
];

export default async function TasksPage() {
  const supabase = await createClient();
  const since = addDays(todayIso(), -30);
  const [{ data: c }, { data: t }, { data: a }] = await Promise.all([
    supabase.from("clients").select("id, name").order("name"),
    supabase.from("tasks").select("*").or(`status.neq.termine,created_at.gte.${since}`).order("due_on", { nullsFirst: false }),
    supabase.from("profiles").select("id, full_name, email").eq("role", "admin"),
  ]);
  const clients = (c ?? []) as Pick<Client, "id" | "name">[];
  const tasks = (t ?? []) as Task[];
  const admins = (a ?? []) as Pick<Profile, "id" | "full_name" | "email">[];
  const who = (id: string | null) => {
    const p = admins.find((x) => x.id === id);
    return p ? p.full_name || p.email : null;
  };
  const today = todayIso();

  return (
    <>
      <div className="head"><h1>Tâches</h1></div>
      <section className="panel">
        <ActionForm action={createTask} submitLabel="Ajouter la tâche" resetOnSuccess>
          <div className="form-grid">
            <label className="field" style={{ gridColumn: "span 2" }}>Tâche<input name="title" placeholder="Ex. : tourner le reel de Noël" required maxLength={300} /></label>
            <label className="field">
              Client
              <select name="client_id" defaultValue="">
                <option value="">Interne</option>
                {clients.map((cl) => <option key={cl.id} value={cl.id}>{cl.name}</option>)}
              </select>
            </label>
            <label className="field">
              Pour
              <select name="assignee_id" defaultValue="">
                <option value="">Toute l&apos;équipe</option>
                {admins.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
              </select>
            </label>
            <label className="field">Délai<input name="due_on" type="date" defaultValue={addDays(today, 7)} /></label>
          </div>
        </ActionForm>
      </section>
      <div className="board">
        {COLUMNS.map((col, idx) => {
          const items = tasks.filter((x) => x.status === col.key);
          return (
            <section key={col.key} className="col">
              <h3>{col.label}<span className="muted num">{items.length}</span></h3>
              {items.length === 0 && <p className="small muted" style={{ margin: 4 }}>Rien ici.</p>}
              {items.map((task) => {
                const d = dueInfo(task.due_on, task.status, today);
                const prev = COLUMNS[idx - 1], next = COLUMNS[idx + 1];
                return (
                  <article key={task.id} className={`card${d.late ? " late" : ""}`}>
                    <div style={{ fontWeight: 600 }}>{task.title}</div>
                    <div className="meta">
                      <span className="small muted">
                        {clients.find((x) => x.id === task.client_id)?.name ?? "Interne"}
                        {who(task.assignee_id) ? ` · ${who(task.assignee_id)}` : ""}
                      </span>
                      <Pill tone={d.tone}>{d.label}</Pill>
                    </div>
                    <div className="meta">
                      {prev ? <ActionButton run={setTaskStatus.bind(null, task.id, prev.key)} label="← Reculer" className="btn sm ghost" /> : <ActionButton run={deleteTask.bind(null, task.id)} label="Supprimer" confirmLabel="Confirmer" className="btn sm ghost danger" />}
                      {next && <ActionButton run={setTaskStatus.bind(null, task.id, next.key)} label={idx === 0 ? "Commencer →" : "Terminer →"} />}
                    </div>
                  </article>
                );
              })}
            </section>
          );
        })}
      </div>
    </>
  );
}
