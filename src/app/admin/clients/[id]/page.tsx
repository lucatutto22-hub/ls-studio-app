import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClientAccess, removeAccess, updateClientRecord } from "@/app/actions/admin";
import { deleteFile } from "@/app/actions/files";
import { ActionForm } from "@/components/ActionForm";
import { ActionButton } from "@/components/ConfirmButton";
import { FilePreview } from "@/components/FileCard";
import { FileStatusPill } from "@/components/ui";
import { fileSize, shortDate } from "@/lib/format";
import { ClientFields } from "../ClientFields";
import type { Client, Profile, StoredFile } from "@/lib/types";

export const metadata: Metadata = { title: "Fiche client" };

export default async function ClientDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("clients").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const client = data as Client;
  const [{ data: p }, { data: f }] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name, role, client_id").eq("client_id", id),
    supabase.from("files").select("*").eq("client_id", id).order("created_at", { ascending: false }),
  ]);
  const accounts = (p ?? []) as Profile[];
  const files = (f ?? []) as StoredFile[];

  return (
    <>
      <div className="head">
        <div>
          <Link href="/admin/clients" className="small muted">← Clients</Link>
          <h1>{client.name}</h1>
        </div>
        <div className="row-wrap">
          <Link className="btn" href={`/admin/messagerie/${id}`}>Messagerie</Link>
          <Link className="btn primary" href={`/admin/livrer?client=${id}`}>Livrer des fichiers</Link>
        </div>
      </div>

      <section className="panel stack">
        <h2>Accès à l&apos;espace client</h2>
        {accounts.length === 0 ? (
          <p className="muted small">Ce client n&apos;a pas encore d&apos;identifiants.</p>
        ) : (
          <div className="list">
            {accounts.map((a) => (
              <div key={a.id} className="list-row">
                <div className="grow">
                  <strong>{a.full_name || a.email}</strong> <span className="small muted">{a.email}</span>
                </div>
                <ActionButton run={removeAccess.bind(null, a.id)} label="Retirer l'accès" confirmLabel="Confirmer le retrait" className="btn sm danger" />
              </div>
            ))}
          </div>
        )}
        <ActionForm action={createClientAccess.bind(null, id)} submitLabel="Créer les identifiants" resetOnSuccess>
          <div className="form-grid">
            <label className="field">E-mail de connexion<input name="email" type="email" defaultValue={accounts.length ? "" : client.email ?? ""} required /></label>
            <label className="field">Nom de la personne<input name="full_name" defaultValue={accounts.length ? "" : client.contact_name ?? ""} /></label>
          </div>
        </ActionForm>
      </section>

      <section className="stack">
        <h2>Fichiers livrés ({files.length})</h2>
        {files.length === 0 && <p className="panel empty-state">Aucun fichier livré.</p>}
        <div className="files">
          {files.map((file) => (
            <article key={file.id} className="file">
              <FilePreview file={{ ...file, client_seen_at: file.client_seen_at ?? "vu" }} />
              <div className="body">
                <div className="title">{file.name}</div>
                <div className="small muted">
                  {file.campaign ? `${file.campaign} · ` : ""}{shortDate(file.created_at)} · {fileSize(file.size_bytes)}
                </div>
                <div className="row-wrap">
                  <FileStatusPill status={file.status} />
                  {!file.client_seen_at && <span className="pill neutral">Pas encore vu</span>}
                </div>
                {file.client_comment && <p className="small muted">« {file.client_comment} »</p>}
                <div className="acts">
                  <a className="btn sm" href={`/api/files/${file.id}?dl=1`}>Télécharger</a>
                  <ActionButton run={deleteFile.bind(null, file.id)} label="Supprimer" confirmLabel="Confirmer" className="btn sm ghost danger" />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel stack">
        <h2>Fiche client</h2>
        <ActionForm action={updateClientRecord.bind(null, id)} submitLabel="Enregistrer">
          <ClientFields client={client} />
        </ActionForm>
      </section>
    </>
  );
}
