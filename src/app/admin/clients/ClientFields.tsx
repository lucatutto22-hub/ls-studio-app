import type { Client } from "@/lib/types";

export function ClientFields({ client }: { client?: Client }) {
  return (
    <div className="form-grid">
      <label className="field">Nom de l&apos;entreprise<input name="name" defaultValue={client?.name} required /></label>
      <label className="field">Contact<input name="contact_name" defaultValue={client?.contact_name ?? ""} /></label>
      <label className="field">E-mail<input name="email" type="email" defaultValue={client?.email ?? ""} /></label>
      <label className="field">Téléphone<input name="phone" defaultValue={client?.phone ?? ""} /></label>
      <label className="field">Formule<input name="plan" defaultValue={client?.plan ?? ""} placeholder="Ex. : 8 posts + 2 reels / mois" /></label>
      <label className="field">Montant mensuel HT (€)<input name="monthly_fee" type="number" min="0" step="0.01" defaultValue={client?.monthly_fee ?? 0} /></label>
      <label className="field">
        Statut
        <select name="status" defaultValue={client?.status ?? "actif"}>
          <option value="prospect">Prospect</option>
          <option value="actif">Actif</option>
          <option value="pause">En pause</option>
          <option value="termine">Terminé</option>
        </select>
      </label>
      <label className="field" style={{ gridColumn: "1 / -1" }}>Adresse de facturation<textarea name="address" defaultValue={client?.address ?? ""} /></label>
      <label className="field" style={{ gridColumn: "1 / -1" }}>Notes internes<textarea name="notes" defaultValue={client?.notes ?? ""} /></label>
    </div>
  );
}
