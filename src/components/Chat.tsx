"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/browser";
import { markRead, sendMessage } from "@/app/actions/messages";
import { shortDate, time } from "@/lib/format";
import type { Message } from "@/lib/types";

type Props = {
  clientId: string;
  initialMessages: Message[];
  viewer: "team" | "client";
  title: string;
  subtitle?: string;
  placeholder: string;
};

function dayKey(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date(iso));
}

export function Chat({ clientId, initialMessages, viewer, title, subtitle, placeholder }: Props) {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);

  // Nouveaux messages en direct.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${clientId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `client_id=eq.${clientId}` },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          if (m.from_team !== (viewer === "team")) void markRead(clientId);
        },
      )
      .subscribe();
    void markRead(clientId);
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [clientId, viewer]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  function submit() {
    const text = draft.trim();
    if (!text || pending) return;
    setError(null);
    startTransition(async () => {
      const res = await sendMessage(clientId, text);
      if (res.error) return setError(res.error);
      setDraft("");
      if (res.message) {
        const m = res.message;
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      }
    });
  }

  return (
    <section className="thread">
      <div className="thread-h">
        <h2>{title}</h2>
        {subtitle && <span className="small muted">{subtitle}</span>}
      </div>
      <div className="msgs" ref={listRef} aria-live="polite">
        {messages.length === 0 && (
          <p className="empty-state" style={{ margin: "auto" }}>
            Aucun message pour l&apos;instant.
            <br />
            Écrivez le premier ci-dessous.
          </p>
        )}
        {messages.map((m, i) => {
          const d = dayKey(m.created_at);
          const showDay = i === 0 || d !== dayKey(messages[i - 1].created_at);
          const mine = m.from_team === (viewer === "team");
          return (
            <div key={m.id} style={{ display: "contents" }}>
              {showDay && <div className="day">{shortDate(d)}</div>}
              <div className={`msg${mine ? " me" : ""}`}>
                <div className="who">
                  {m.sender_name ?? (m.from_team ? "LS Studio" : "Client")} · {time(m.created_at)}
                </div>
                {m.body}
              </div>
            </div>
          );
        })}
      </div>
      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <textarea
          aria-label="Votre message"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={placeholder}
          rows={1}
          maxLength={5000}
        />
        <button className="btn primary" type="submit" disabled={pending || !draft.trim()}>
          Envoyer
        </button>
      </form>
      {error && (
        <p className="error" role="alert" style={{ padding: "0 12px 12px" }}>
          {error}
        </p>
      )}
    </section>
  );
}
