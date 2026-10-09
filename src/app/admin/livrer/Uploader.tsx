"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { registerFiles } from "@/app/actions/files";
import { fileSize } from "@/lib/format";

type Item = { file: File; progress: number; state: "attente" | "envoi" | "ok" | "erreur"; error?: string };

function putWithProgress(url: string, file: File, contentType: string, onProgress: (p: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Erreur ${xhr.status}`)));
    xhr.onerror = () => reject(new Error("Connexion interrompue"));
    xhr.send(file);
  });
}

export function Uploader({ clients, defaultClient }: { clients: { id: string; name: string }[]; defaultClient?: string }) {
  const [clientId, setClientId] = useState(defaultClient ?? clients[0]?.id ?? "");
  const [campaign, setCampaign] = useState(() => {
    const m = new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    return m.charAt(0).toUpperCase() + m.slice(1);
  });
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const add = (list: FileList | null) => {
    if (!list) return;
    setDone(null);
    setItems((prev) => [...prev, ...Array.from(list).map((file) => ({ file, progress: 0, state: "attente" as const }))]);
  };
  const update = (i: number, patch: Partial<Item>) => setItems((prev) => prev.map((it, k) => (k === i ? { ...it, ...patch } : it)));

  async function sendAll() {
    if (!clientId) return;
    setBusy(true);
    setDone(null);
    const uploaded: { key: string; name: string; mime: string; size: number }[] = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.state === "ok") continue;
      update(i, { state: "envoi", progress: 0, error: undefined });
      try {
        const res = await fetch("/api/files/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId, name: it.file.name, type: it.file.type, size: it.file.size }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Envoi refusé");
        await putWithProgress(body.url, it.file, body.contentType, (p) => update(i, { progress: p }));
        uploaded.push({ key: body.key, name: it.file.name, mime: body.contentType, size: it.file.size });
        update(i, { state: "ok", progress: 1 });
      } catch (err) {
        update(i, { state: "erreur", error: err instanceof Error ? err.message : "Erreur" });
      }
    }
    if (uploaded.length) {
      const res = await registerFiles(clientId, campaign, uploaded);
      const name = clients.find((c) => c.id === clientId)?.name;
      setDone(res.error ?? `${uploaded.length} fichier${uploaded.length > 1 ? "s" : ""} livré${uploaded.length > 1 ? "s" : ""} à ${name}.`);
      setItems((prev) => prev.filter((it) => it.state !== "ok"));
    }
    setBusy(false);
  }

  return (
    <section className="panel stack">
      <div className="form-grid">
        <label className="field">
          Client
          <select value={clientId} onChange={(e) => setClientId(e.target.value)} disabled={busy}>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="field">
          Campagne ou dossier
          <input value={campaign} onChange={(e) => setCampaign(e.target.value)} disabled={busy} placeholder="Octobre 2026 · Campagne automne" />
        </label>
      </div>
      <div
        className={`drop${over ? " over" : ""}`}
        role="button"
        tabIndex={0}
        onClick={() => input.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); add(e.dataTransfer.files); }}
      >
        <strong>Glissez vos photos et vidéos ici</strong>
        <span className="small muted">ou cliquez pour les choisir (jusqu&apos;à 5 Go par fichier)</span>
        <input ref={input} type="file" multiple hidden accept="image/*,video/*,application/pdf,application/zip" onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
      </div>
      {items.length > 0 && (
        <div className="list">
          {items.map((it, i) => (
            <div key={i} className="list-row">
              <div className="grow">
                <div className="small" style={{ fontWeight: 600, overflowWrap: "anywhere" }}>{it.file.name}</div>
                <div className="progress" aria-label="Progression"><span style={{ width: `${Math.round(it.progress * 100)}%` }} /></div>
                {it.error && <span className="error small">{it.error}</span>}
              </div>
              <span className="small muted num">{fileSize(it.file.size)}</span>
              {!busy && it.state !== "ok" && (
                <button className="btn sm ghost" onClick={() => setItems((prev) => prev.filter((_, k) => k !== i))}>Retirer</button>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="row-wrap">
        <button className="btn primary" disabled={busy || !items.some((it) => it.state !== "ok") || !clientId} onClick={sendAll}>
          {busy ? "Envoi en cours…" : `Livrer ${items.length || ""} fichier${items.length > 1 ? "s" : ""}`}
        </button>
        {done && (
          <span className="success">
            {done} <Link href={`/admin/clients/${clientId}`}>Voir la fiche</Link>
          </span>
        )}
      </div>
    </section>
  );
}
