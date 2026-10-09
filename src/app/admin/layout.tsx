import Image from "next/image";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { todayIso } from "@/lib/format";
import { NavLink } from "@/components/NavLink";
import { SignOutButton } from "@/components/SignOutButton";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAdmin();
  const supabase = await createClient();
  const [{ count: unread }, { count: late }, { count: unpaid }] = await Promise.all([
    supabase.from("messages").select("id", { count: "exact", head: true }).eq("from_team", false).is("read_at", null),
    supabase.from("tasks").select("id", { count: "exact", head: true }).neq("status", "termine").lt("due_on", todayIso()),
    supabase.from("invoices").select("id", { count: "exact", head: true }).is("paid_on", null),
  ]);
  const badge = (n: number | null) => (n ? <span className="count">{n}</span> : null);
  return (
    <div className="shell">
      <nav className="rail" aria-label="Sections">
        <Link href="/admin" className="brand">
          <Image className="brand-mark" src="/logo-mark.png" alt="" width={240} height={198} />
          <span className="brand-word">LS Studio</span>
        </Link>
        <NavLink href="/admin" exact className="nav">Tableau de bord</NavLink>
        <NavLink href="/admin/messagerie" className="nav"><span>Messagerie</span>{badge(unread)}</NavLink>
        <NavLink href="/admin/clients" className="nav">Clients</NavLink>
        <NavLink href="/admin/factures" className="nav"><span>Facturation</span>{badge(unpaid)}</NavLink>
        <NavLink href="/admin/taches" className="nav"><span>Tâches</span>{badge(late)}</NavLink>
        <NavLink href="/admin/livrer" className="nav">Livrer des fichiers</NavLink>
        <NavLink href="/admin/parametres" className="nav">Paramètres</NavLink>
        <div className="me">
          <span className="small who-am-i">
            {profile.full_name || profile.email}
            <br />
            <Link href="/compte/mot-de-passe" className="muted">Mot de passe</Link>
          </span>
          <SignOutButton />
        </div>
      </nav>
      <main className="main">{children}</main>
    </div>
  );
}
