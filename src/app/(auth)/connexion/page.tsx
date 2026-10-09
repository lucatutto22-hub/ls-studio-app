import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/AuthCard";
import { getProfile } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  const { erreur } = await searchParams;
  const profile = await getProfile();
  if (profile && (profile.role === "admin" || profile.client_id)) redirect("/");
  const notice =
    erreur === "compte"
      ? "Votre compte n'est rattaché à aucun client. Contactez LS Studio."
      : erreur === "lien"
        ? "Ce lien a expiré ou a déjà servi. Demandez-en un nouveau."
        : undefined;
  return (
    <AuthCard title="Votre espace LS Studio" subtitle="Vos photos et vidéos, vos messages et vos factures au même endroit.">
      <LoginForm notice={notice} />
    </AuthCard>
  );
}
