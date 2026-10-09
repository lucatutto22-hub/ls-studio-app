"use client";

import { useState, useTransition } from "react";
import { reviewFile } from "@/app/actions/files";
import { FileStatusPill } from "@/components/ui";
import { fileSize, shortDate } from "@/lib/format";
import type { StoredFile } from "@/lib/types";

export function FilePreview({ file }: { file: StoredFile }) {
  const src = `/api/files/${file.id}`;
  return (
    <div className="thumb">
      {file.kind === "photo" ? (
        // eslint-disable-next-line @next/next/no-img-element -- lien signé R2, pas d'optimisation Next
        <img src={src} alt={file.name} loading="lazy" />
      ) : file.kind === "video" ? (
        <video src={src} preload="metadata" controls playsInline />
      ) : (
        <span className="muted small">{file.mime_type ?? "Fichier"}</span>
      )}
      {!file.client_seen_at && <span className="badge">Nouveau</span>}
    </div>
  );
}

export function ClientFileCard({ file }: { file: StoredFile }) {
  const [asking, setAsking] = useState(false);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function send(status: "valide" | "modif_demandee") {
    setError(null);
    start(async () => {
      const res = await reviewFile(file.id, status, comment);
      if (res.error) setError(res.error);
      else setAsking(false);
    });
  }

  return (
    <article className="file">
      <FilePreview file={file} />
      <div className="body">
        <div className="title">{file.name}</div>
        <div className="small muted">
          {shortDate(file.created_at)}
          {file.size_bytes ? ` · ${fileSize(file.size_bytes)}` : ""}
        </div>
        <FileStatusPill status={file.status} />
        {file.client_comment && <p className="small muted">« {file.client_comment} »</p>}
        {asking && (
          <label className="field">
            Que faut-il changer ?
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} />
          </label>
        )}
        {error && <p className="error">{error}</p>}
        <div className="acts">
          <a className="btn sm primary" href={`/api/files/${file.id}?dl=1`}>Télécharger</a>
          {file.status === "a_valider" && !asking && (
            <>
              <button className="btn sm" disabled={pending} onClick={() => send("valide")}>Valider</button>
              <button className="btn sm ghost" disabled={pending} onClick={() => setAsking(true)}>Demander une modif</button>
            </>
          )}
          {asking && (
            <>
              <button className="btn sm accent" disabled={pending} onClick={() => send("modif_demandee")}>Envoyer la demande</button>
              <button className="btn sm ghost" disabled={pending} onClick={() => setAsking(false)}>Annuler</button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
