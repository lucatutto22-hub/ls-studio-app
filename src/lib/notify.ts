// E-mails de notification via Resend. Sans RESEND_API_KEY, rien n'est envoyé (pratique en local).

type Mail = { to: string[]; subject: string; text: string };

export async function sendMail({ to, subject, text }: Mail): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  const recipients = [...new Set(to.filter(Boolean))];
  if (!key || !from || recipients.length === 0) return;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: recipients, subject, text }),
    });
    if (!res.ok) console.error("Envoi d'e-mail refusé", res.status, await res.text());
  } catch (err) {
    console.error("Envoi d'e-mail impossible", err);
  }
}

export function siteUrl(path = ""): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return base + path;
}
