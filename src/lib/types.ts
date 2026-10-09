export type Role = "admin" | "client";

export type Profile = {
  id: string;
  role: Role;
  client_id: string | null;
  full_name: string | null;
  email: string | null;
};

export type ClientStatus = "prospect" | "actif" | "pause" | "termine";

export type Client = {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  plan: string | null;
  monthly_fee: number;
  status: ClientStatus;
  address: string | null;
  notes: string | null;
  created_at: string;
};

export type FileStatus = "a_valider" | "valide" | "modif_demandee";

export type StoredFile = {
  id: string;
  client_id: string;
  storage_key: string;
  name: string;
  kind: "photo" | "video" | "autre";
  mime_type: string | null;
  size_bytes: number | null;
  campaign: string | null;
  status: FileStatus;
  client_comment: string | null;
  client_seen_at: string | null;
  created_at: string;
};

export type Invoice = {
  id: string;
  number: string;
  client_id: string;
  label: string;
  amount_ht: number;
  vat_rate: number;
  issued_on: string;
  due_on: string;
  paid_on: string | null;
  created_at: string;
};

export type TaskStatus = "a_faire" | "en_cours" | "termine";

export type Task = {
  id: string;
  title: string;
  client_id: string | null;
  due_on: string | null;
  status: TaskStatus;
  assignee_id: string | null;
  source_file_id: string | null;
  created_at: string;
};

export type Message = {
  id: string;
  client_id: string;
  sender_id: string | null;
  sender_name: string | null;
  from_team: boolean;
  body: string;
  read_at: string | null;
  created_at: string;
};

export type CompanySettings = {
  legal_name: string;
  address: string | null;
  siret: string | null;
  vat_number: string | null;
  vat_note: string | null;
  iban: string | null;
  email: string | null;
  phone: string | null;
};
