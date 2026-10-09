import type { Metadata } from "next";
import { ConversationList } from "./ConversationList";

export const metadata: Metadata = { title: "Messagerie" };

export default function MessagingIndex() {
  return (
    <>
      <div className="head">
        <div>
          <h1>Messagerie</h1>
          <p className="muted small" style={{ marginTop: 4 }}>Une conversation par client. Toute l&apos;équipe voit les échanges.</p>
        </div>
      </div>
      <div className="chat">
        <ConversationList />
        <section className="thread">
          <p className="empty-state" style={{ margin: "auto", padding: 40 }}>Choisissez une conversation.</p>
        </section>
      </div>
    </>
  );
}
