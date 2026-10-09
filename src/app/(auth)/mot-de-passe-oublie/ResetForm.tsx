"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, type FormState } from "../actions";

export function ResetForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(requestPasswordReset, {});
  return (
    <form action={action} className="stack">
      <label className="field">
        E-mail
        <input name="email" type="email" autoComplete="email" required />
      </label>
      {state.error && <p className="error" role="alert">{state.error}</p>}
      {state.ok && <p className="success" role="status">{state.ok}</p>}
      <button className="btn primary" type="submit" disabled={pending}>
        {pending ? "Envoi…" : "Recevoir un lien"}
      </button>
      <Link href="/connexion" className="small muted">Retour à la connexion</Link>
    </form>
  );
}
