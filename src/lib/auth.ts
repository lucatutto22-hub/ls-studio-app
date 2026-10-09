import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export const getProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, role, client_id, full_name, email")
    .eq("id", user.id)
    .single();
  return (data as Profile | null) ?? null;
});

export async function requireAdmin(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/connexion");
  if (profile.role !== "admin") redirect("/espace");
  return profile;
}

export async function requireClient(): Promise<Profile & { client_id: string }> {
  const profile = await getProfile();
  if (!profile) redirect("/connexion");
  if (profile.role === "admin") redirect("/admin");
  if (!profile.client_id) redirect("/connexion?erreur=compte");
  return profile as Profile & { client_id: string };
}

/** Pour les actions serveur : lève une erreur au lieu de rediriger. */
export async function assertAdmin(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") throw new Error("Accès réservé à l'équipe LS Studio.");
  return profile;
}
