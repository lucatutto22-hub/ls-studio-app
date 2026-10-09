import type { Metadata } from "next";
import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ClientFileCard } from "@/components/FileCard";
import { plural } from "@/lib/format";
import type { StoredFile } from "@/lib/types";

export const metadata: Metadata = { title: "Mes fichiers" };

const FILTERS = [
  { key: "", label: "Tout" },
  { key: "photo", label: "Photos" },
  { key: "video", label: "Vidéos" },
];

export default async function ClientFilesPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type = "" } = await searchParams;
  const profile = await requireClient();
  const supabase = await createClient();
  const [{ data: client }, { data }] = await Promise.all([
    supabase.from("clients").select("name").eq("id", profile.client_id).single(),
    supabase.from("files").select("*").order("created_at", { ascending: false }),
  ]);
  const all = (data ?? []) as StoredFile[];
  const files = type ? all.filter((f) => f.kind === type) : all;
  const nNew = all.filter((f) => !f.client_seen_at).length;
  const nToReview = all.filter((f) => f.status === "a_valider").length;

  const groups = new Map<string, StoredFile[]>();
  for (const f of files) {
    const k = f.campaign || "Autres fichiers";
    groups.set(k, [...(groups.get(k) ?? []), f]);
  }

  return (
    <main className="portal">
      <div className="head">
        <div>
          <div className="label">Espace client</div>
          <h1>Bonjour, {client?.name}</h1>
          <p className="muted" style={{ marginTop: 4 }}>
            {nNew ? `${plural(nNew, "nouveau fichier", "nouveaux fichiers")} depuis votre dernière visite` : "Vous êtes à jour"}
            {nToReview ? ` · ${nToReview} à valider` : ""}
          </p>
        </div>
      </div>
      <div className="chips" role="group" aria-label="Filtrer">
        {FILTERS.map((f) => (
          <Link key={f.key} className="chip" href={f.key ? `/espace?type=${f.key}` : "/espace"} aria-current={type === f.key}>
            {f.label}
          </Link>
        ))}
      </div>
      {files.length === 0 && (
        <div className="panel empty-state">
          Vos photos et vidéos apparaîtront ici dès que LS Studio les aura déposées.
        </div>
      )}
      {[...groups.entries()].map(([campaign, items]) => (
        <section key={campaign} className="stack">
          <h2>{campaign}</h2>
          <div className="files">
            {items.map((f) => (
              <ClientFileCard key={f.id} file={f} />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
