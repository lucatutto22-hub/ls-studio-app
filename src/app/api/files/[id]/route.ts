import { NextResponse, type NextRequest } from "next/server";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { presignDownload } from "@/lib/r2";

// Ouvre (aperçu) ou télécharge un fichier. Les règles d'accès de la base décident
// qui peut le voir : un client ne reçoit que ses propres fichiers.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

  const supabase = await createClient();
  const { data: file } = await supabase.from("files").select("id, storage_key, name").eq("id", id).maybeSingle();
  if (!file) return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });

  const download = request.nextUrl.searchParams.has("dl");
  if (download && profile.role === "client") {
    await supabase.rpc("mark_files_seen", { p_file_ids: [file.id] });
  }
  const url = await presignDownload(file.storage_key, download ? { downloadName: file.name } : {});
  const res = NextResponse.redirect(url, 302);
  res.headers.set("Cache-Control", "private, max-age=600");
  return res;
}
