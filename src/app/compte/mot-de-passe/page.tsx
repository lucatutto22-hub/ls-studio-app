import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/AuthCard";
import { getProfile } from "@/lib/auth";
import { PasswordForm } from "./PasswordForm";

export const metadata: Metadata = { title: "Mot de passe" };

export default async function PasswordPage() {
  const profile = await getProfile();
  if (!profile) redirect("/connexion");
  return (
    <AuthCard title="Choisir un mot de passe" subtitle={profile.email ?? undefined}>
      <PasswordForm />
      <Link href="/" className="small muted">Retour à mon espace</Link>
    </AuthCard>
  );
}
