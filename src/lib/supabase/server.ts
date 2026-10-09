import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Client Supabase lié à la session de la personne connectée (respecte les règles d'accès).
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Appelé depuis un composant serveur : le proxy rafraîchit déjà la session.
          }
        },
      },
    },
  );
}
