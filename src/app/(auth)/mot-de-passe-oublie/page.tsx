import type { Metadata } from "next";
import { AuthCard } from "@/components/AuthCard";
import { ResetForm } from "./ResetForm";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard title="Mot de passe oublié" subtitle="Nous vous envoyons un lien pour en choisir un nouveau.">
      <ResetForm />
    </AuthCard>
  );
}
