-- LS Studio : schéma initial
-- Deux rôles : "admin" (équipe LS Studio) et "client" (rattaché à une fiche client).
-- Les fichiers eux-mêmes sont stockés sur Cloudflare R2 ; la base ne garde que leurs métadonnées.

create extension if not exists pgcrypto;

-- ---------- Tables ----------

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  email text,
  phone text,
  plan text,
  monthly_fee numeric(10,2) not null default 0 check (monthly_fee >= 0),
  status text not null default 'actif' check (status in ('prospect','actif','pause','termine')),
  address text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null default 'client' check (role in ('admin','client')),
  client_id uuid references public.clients on delete set null,
  full_name text,
  email text,
  created_at timestamptz not null default now()
);

create table public.files (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients on delete cascade,
  storage_key text not null unique,
  name text not null,
  kind text not null check (kind in ('photo','video','autre')),
  mime_type text,
  size_bytes bigint,
  campaign text,
  status text not null default 'a_valider' check (status in ('a_valider','valide','modif_demandee')),
  client_comment text,
  uploaded_by uuid references public.profiles on delete set null,
  client_seen_at timestamptz,
  created_at timestamptz not null default now()
);
create index files_client_idx on public.files (client_id, created_at desc);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  client_id uuid not null references public.clients on delete restrict,
  label text not null default 'Prestation de création de contenu',
  amount_ht numeric(10,2) not null check (amount_ht > 0),
  vat_rate numeric(4,2) not null default 20 check (vat_rate >= 0),
  issued_on date not null default current_date,
  due_on date not null,
  paid_on date,
  created_at timestamptz not null default now()
);
create index invoices_client_idx on public.invoices (client_id);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 300),
  client_id uuid references public.clients on delete set null,
  due_on date,
  status text not null default 'a_faire' check (status in ('a_faire','en_cours','termine')),
  assignee_id uuid references public.profiles on delete set null,
  source_file_id uuid references public.files on delete set null,
  created_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients on delete cascade,
  sender_id uuid references public.profiles on delete set null,
  from_team boolean not null,
  sender_name text,
  body text not null check (length(body) between 1 and 5000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index messages_client_idx on public.messages (client_id, created_at);

-- Coordonnées de LS Studio imprimées sur les factures (une seule ligne).
create table public.company_settings (
  id int primary key default 1 check (id = 1),
  legal_name text not null default 'LS Studio',
  address text,
  siret text,
  vat_number text,
  vat_note text,
  iban text,
  email text,
  phone text
);
insert into public.company_settings (id) values (1);

-- ---------- Fonctions d'accès ----------

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.my_client_id() returns uuid
language sql stable security definer set search_path = public as $$
  select client_id from public.profiles where id = auth.uid() and role = 'client';
$$;

-- Profil créé automatiquement à l'inscription. Le rôle et le client viennent des
-- app_metadata, que seule la clé secrète (côté serveur) peut écrire.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, client_id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_app_meta_data->>'role', 'client'),
    nullif(new.raw_app_meta_data->>'client_id', '')::uuid,
    new.raw_user_meta_data->>'full_name',
    new.email
  );
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Numéro de facture suivant : F-AAAA-001, F-AAAA-002…
create or replace function public.next_invoice_number(p_year int default extract(year from current_date)::int)
returns text language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then return null; end if;
  return (
    select 'F-' || p_year || '-' || lpad((coalesce(max(split_part(number, '-', 3)::int), 0) + 1)::text, 3, '0')
    from public.invoices where number like 'F-' || p_year || '-%'
  );
end;
$$;

-- Le client valide un fichier ou demande une modification (crée une tâche pour l'équipe).
create or replace function public.review_file(p_file_id uuid, p_status text, p_comment text default null)
returns void language plpgsql security definer set search_path = public as $$
declare f public.files;
begin
  if p_status not in ('valide','modif_demandee') then raise exception 'statut invalide'; end if;
  select * into f from public.files where id = p_file_id;
  if f.id is null or f.client_id is distinct from public.my_client_id() then
    raise exception 'fichier introuvable';
  end if;
  update public.files set status = p_status, client_comment = nullif(trim(p_comment), ''),
    client_seen_at = coalesce(client_seen_at, now()) where id = p_file_id;
  if p_status = 'modif_demandee' then
    insert into public.tasks (title, client_id, due_on, source_file_id)
    values (left('Modif demandée : ' || f.name || coalesce(' (' || nullif(trim(p_comment), '') || ')', ''), 300),
            f.client_id, current_date + 2, f.id);
  end if;
end;
$$;

-- Le client marque ses nouveaux fichiers comme vus.
create or replace function public.mark_files_seen(p_file_ids uuid[]) returns void
language sql security definer set search_path = public as $$
  update public.files set client_seen_at = now()
  where id = any(p_file_ids) and client_id = public.my_client_id() and client_seen_at is null;
$$;

-- Marque comme lus les messages de l'autre partie dans une conversation.
create or replace function public.mark_messages_read(p_client_id uuid) returns void
language sql security definer set search_path = public as $$
  update public.messages set read_at = now()
  where client_id = p_client_id and read_at is null
    and (
      (public.is_admin() and from_team = false)
      or (p_client_id = public.my_client_id() and from_team = true)
    );
$$;

-- Nom de l'expéditeur recopié sur le message (le client ne lit pas les profils de l'équipe).
create or replace function public.set_message_sender() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.sender_id := auth.uid();
  select coalesce(nullif(p.full_name, ''), c.name, split_part(p.email, '@', 1))
    into new.sender_name
    from public.profiles p left join public.clients c on c.id = p.client_id
   where p.id = auth.uid();
  new.created_at := now();
  return new;
end;
$$;
create trigger messages_set_sender before insert on public.messages
  for each row execute function public.set_message_sender();

-- ---------- Sécurité au niveau des lignes ----------

alter table public.clients enable row level security;
alter table public.profiles enable row level security;
alter table public.files enable row level security;
alter table public.invoices enable row level security;
alter table public.tasks enable row level security;
alter table public.messages enable row level security;
alter table public.company_settings enable row level security;

create policy "admin_all" on public.clients for all using (public.is_admin()) with check (public.is_admin());
create policy "client_read_own" on public.clients for select using (id = public.my_client_id());

create policy "admin_all" on public.profiles for all using (public.is_admin()) with check (public.is_admin());
create policy "read_own" on public.profiles for select using (id = auth.uid());

create policy "admin_all" on public.files for all using (public.is_admin()) with check (public.is_admin());
create policy "client_read_own" on public.files for select using (client_id = public.my_client_id());

create policy "admin_all" on public.invoices for all using (public.is_admin()) with check (public.is_admin());
create policy "client_read_own" on public.invoices for select using (client_id = public.my_client_id());

create policy "admin_all" on public.tasks for all using (public.is_admin()) with check (public.is_admin());

create policy "admin_all" on public.messages for all using (public.is_admin()) with check (public.is_admin());
create policy "client_read_own" on public.messages for select using (client_id = public.my_client_id());
create policy "client_send_own" on public.messages for insert with check (
  client_id = public.my_client_id() and from_team = false and read_at is null
);

create policy "admin_all" on public.company_settings for all using (public.is_admin()) with check (public.is_admin());
create policy "client_read" on public.company_settings for select using (public.my_client_id() is not null);

revoke execute on function public.review_file(uuid, text, text) from public, anon;
revoke execute on function public.mark_files_seen(uuid[]) from public, anon;
revoke execute on function public.mark_messages_read(uuid) from public, anon;
revoke execute on function public.next_invoice_number(int) from public, anon;
grant execute on function public.review_file(uuid, text, text) to authenticated;
grant execute on function public.mark_files_seen(uuid[]) to authenticated;
grant execute on function public.mark_messages_read(uuid) to authenticated;
grant execute on function public.next_invoice_number(int) to authenticated;

-- Messagerie en temps réel
alter publication supabase_realtime add table public.messages;
