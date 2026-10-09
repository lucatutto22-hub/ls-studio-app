import { createClient } from "@supabase/supabase-js";

// Client avec la clé secrète : contourne les règles d'accès. Uniquement côté serveur,
// et uniquement après avoir vérifié que la personne connectée est administrateur.
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY manquante");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
