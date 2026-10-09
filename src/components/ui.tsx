import { daysBetween, shortDate, todayIso } from "@/lib/format";
import type { FileStatus, TaskStatus } from "@/lib/types";

export type Tone = "good" | "warn" | "bad" | "acc" | "neutral";

export function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}

export function FileStatusPill({ status }: { status: FileStatus }) {
  if (status === "valide") return <Pill tone="good">Validé</Pill>;
  if (status === "modif_demandee") return <Pill tone="warn">Modif demandée</Pill>;
  return <Pill tone="acc">À valider</Pill>;
}

export function dueInfo(due: string | null, status: TaskStatus, today = todayIso()): { label: string; tone: Tone; late: boolean } {
  if (status === "termine") return { label: "Terminé", tone: "good", late: false };
  if (!due) return { label: "Sans délai", tone: "neutral", late: false };
  const d = daysBetween(today, due);
  if (d < 0) return { label: `En retard de ${-d} j`, tone: "bad", late: true };
  if (d === 0) return { label: "Aujourd'hui", tone: "warn", late: false };
  if (d <= 2) return { label: `Dans ${d} j`, tone: "warn", late: false };
  return { label: shortDate(due), tone: "neutral", late: false };
}

export const CLIENT_STATUS: Record<string, { label: string; tone: Tone }> = {
  actif: { label: "Actif", tone: "good" },
  prospect: { label: "Prospect", tone: "acc" },
  pause: { label: "En pause", tone: "warn" },
  termine: { label: "Terminé", tone: "neutral" },
};
