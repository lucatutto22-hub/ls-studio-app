"use client";

import { useState, useTransition } from "react";

/** Bouton qui exécute une action serveur, avec confirmation en deux clics si demandé. */
export function ActionButton({
  run,
  label,
  confirmLabel,
  className = "btn sm",
}: {
  run: () => Promise<unknown>;
  label: string;
  confirmLabel?: string;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <>
      <button
        type="button"
        className={className}
        disabled={pending}
        onClick={() => {
          if (confirmLabel && !armed) return setArmed(true);
          setArmed(false);
          start(async () => {
            const res = (await run()) as { error?: string } | undefined;
            setError(res?.error ?? null);
          });
        }}
        onBlur={() => setArmed(false)}
      >
        {armed ? confirmLabel : label}
      </button>
      {error && <span className="error small">{error}</span>}
    </>
  );
}
