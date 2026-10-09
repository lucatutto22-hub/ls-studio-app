import { AwsClient } from "aws4fetch";

// Stockage des photos et vidéos sur Cloudflare R2 (compatible S3).
// Le navigateur envoie et télécharge les fichiers directement via des liens signés et temporaires.

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} manquante`);
  return v;
}

function r2() {
  return new AwsClient({
    accessKeyId: env("R2_ACCESS_KEY_ID"),
    secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
    service: "s3",
    region: "auto",
  });
}

function objectUrl(key: string): URL {
  const path = key.split("/").map(encodeURIComponent).join("/");
  return new URL(`https://${env("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com/${env("R2_BUCKET")}/${path}`);
}

export async function presignUpload(key: string, contentType: string, expiresIn = 3600): Promise<string> {
  const url = objectUrl(key);
  url.searchParams.set("X-Amz-Expires", String(expiresIn));
  const signed = await r2().sign(new Request(url, { method: "PUT", headers: { "content-type": contentType } }), {
    aws: { signQuery: true },
  });
  return signed.url;
}

export async function presignDownload(
  key: string,
  opts: { downloadName?: string; expiresIn?: number } = {},
): Promise<string> {
  const url = objectUrl(key);
  url.searchParams.set("X-Amz-Expires", String(opts.expiresIn ?? 3600));
  if (opts.downloadName) {
    const ascii = opts.downloadName.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "");
    url.searchParams.set(
      "response-content-disposition",
      `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(opts.downloadName)}`,
    );
  }
  const signed = await r2().sign(new Request(url, { method: "GET" }), { aws: { signQuery: true } });
  return signed.url;
}

export async function deleteObject(key: string): Promise<void> {
  const res = await r2().fetch(objectUrl(key).toString(), { method: "DELETE" });
  if (!res.ok && res.status !== 404) throw new Error(`Suppression R2 impossible (${res.status})`);
}

export function storageKey(clientId: string, fileName: string): string {
  const safe =
    fileName
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(-120) || "fichier";
  const month = new Date().toISOString().slice(0, 7);
  return `${clientId}/${month}/${crypto.randomUUID()}-${safe}`;
}
