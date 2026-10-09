const eurFmt = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const eurCentsFmt = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export const eur = (n: number) => eurFmt.format(n);
export const eurCents = (n: number) => eurCentsFmt.format(n);

/** Date du jour à Paris, au format AAAA-MM-JJ. */
export function todayIso(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(toIso + "T12:00:00Z") - Date.parse(fromIso + "T12:00:00Z")) / 864e5);
}

export function shortDate(iso: string): string {
  return new Date(iso.length === 10 ? iso + "T12:00:00Z" : iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Paris",
  });
}

export function longDate(iso: string): string {
  return new Date(iso.length === 10 ? iso + "T12:00:00Z" : iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  });
}

export function time(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
}

export function fileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1).replace(".", ",")} Mo`;
  return `${(bytes / 1024 ** 3).toFixed(2).replace(".", ",")} Go`;
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n > 1 ? many : one}`;
}

export function invoiceState(inv: { paid_on: string | null; due_on: string }, today = todayIso()) {
  if (inv.paid_on) return { label: "Payée", tone: "good" as const };
  if (inv.due_on < today) return { label: "En retard", tone: "bad" as const };
  return { label: "En attente", tone: "warn" as const };
}

export function invoiceTotals(inv: { amount_ht: number; vat_rate: number }) {
  const ht = Number(inv.amount_ht);
  const tva = Math.round(ht * Number(inv.vat_rate)) / 100;
  return { ht, tva, ttc: ht + tva };
}
