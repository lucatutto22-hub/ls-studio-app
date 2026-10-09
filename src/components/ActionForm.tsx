"use client";

import { useActionState, useEffect, useRef } from "react";
import type { ActionState } from "@/app/actions/admin";

type Props = {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  submitLabel: string;
  className?: string;
  resetOnSuccess?: boolean;
  children: React.ReactNode;
};

/** Formulaire relié à une action serveur, avec message de résultat. */
export function ActionForm({ action, submitLabel, className = "stack", resetOnSuccess, children }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      <div className="row-wrap">
        <button className="btn primary" type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : submitLabel}
        </button>
        {state.error && <span className="error" role="alert">{state.error}</span>}
        {state.ok && <span className="success" role="status">{state.ok}</span>}
      </div>
      {state.password && (
        <p className="panel small" style={{ background: "var(--accent-soft)", borderColor: "var(--accent)" }}>
          Mot de passe provisoire : <strong className="num">{state.password}</strong>
          <br />
          Notez-le maintenant, il ne sera plus affiché. Il a aussi été envoyé par e-mail si les e-mails sont configurés.
        </p>
      )}
    </form>
  );
}
