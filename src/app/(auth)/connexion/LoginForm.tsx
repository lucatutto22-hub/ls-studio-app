"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, type FormState } from "../actions";

export function LoginForm({ notice }: { notice?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(signIn, {});
  return (
    <form action={action} className="stack">
      {notice && <p className="error">{notice}</p>}
      <label className="field">
        E-mail
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label className="field">
        Mot de passe
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      {state.error && <p className="error" role="alert">{state.error}</p>}
      <button className="btn primary" type="submit" disabled={pending}>
        {pending ? "Connexion…" : "Se connecter"}
      </button>
      <Link href="/mot-de-passe-oublie" className="small muted">Mot de passe oublié ?</Link>
    </form>
  );
}
