import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { presignUpload, storageKey } from "@/lib/r2";

const MAX_BYTES = 5 * 1024 ** 3; // 5 Go par fichier

// Lien d'envoi temporaire vers R2, réservé à l'équipe.
export async function POST(request: Request) {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Accès réservé à l'équipe." }, { status: 403 });
  }
  const { clientId, name, type, size } = (await request.json().catch(() => ({}))) as {
    clientId?: string;
    name?: string;
    type?: string;
    size?: number;
  };
  if (!clientId || !name || typeof size !== "number") {
    return NextResponse.json({ error: "Requête incomplète." }, { status: 400 });
  }
  if (size > MAX_BYTES) return NextResponse.json({ error: "Fichier trop lourd (5 Go maximum)." }, { status: 413 });

  const supabase = await createClient();
  const { data: client } = await supabase.from("clients").select("id").eq("id", clientId).maybeSingle();
  if (!client) return NextResponse.json({ error: "Client introuvable." }, { status: 404 });

  const contentType = type || "application/octet-stream";
  const key = storageKey(clientId, name);
  const url = await presignUpload(key, contentType);
  return NextResponse.json({ url, key, contentType });
}
