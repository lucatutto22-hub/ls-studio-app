"use client";

import { useActionState } from "react";
import { updatePassword, type FormState } from "@/app/(auth)/actions";

export function PasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(updatePassword, {});
  return (
    <form action={action} className="stack">
      <label className="field">
        Nouveau mot de passe
        <input name="password" type="password" autoComplete="new-password" minLength={10} required />
      </label>
      <label className="field">
        Confirmer
        <input name="confirm" type="password" autoComplete="new-password" minLength={10} required />
      </label>
      {state.error && <p className="error" role="alert">{state.error}</p>}
      {state.ok && <p className="success" role="status">{state.ok}</p>}
      <button className="btn primary" type="submit" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}
