import Image from "next/image";
import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { NavLink } from "@/components/NavLink";
import { SignOutButton } from "@/components/SignOutButton";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireClient();
  const supabase = await createClient();
  const [{ count: newFiles }, { count: unread }] = await Promise.all([
    supabase.from("files").select("id", { count: "exact", head: true }).is("client_seen_at", null),
    supabase.from("messages").select("id", { count: "exact", head: true }).eq("from_team", true).is("read_at", null),
  ]);
  return (
    <>
      <header className="topbar">
        <Link href="/espace" className="brand">
          <Image className="brand-mark" src="/logo-mark.png" alt="" width={240} height={198} />
          <span className="brand-word">LS Studio</span>
        </Link>
        <nav aria-label="Rubriques">
          <NavLink href="/espace" exact>
            Mes fichiers{newFiles ? <span className="count">{newFiles}</span> : null}
          </NavLink>
          <NavLink href="/espace/messages">
            Messages{unread ? <span className="count">{unread}</span> : null}
          </NavLink>
          <NavLink href="/espace/factures">Factures</NavLink>
        </nav>
        <span className="spacer" />
        <Link href="/compte/mot-de-passe" className="small muted">{profile.email}</Link>
        <SignOutButton />
      </header>
      {children}
    </>
  );
}
