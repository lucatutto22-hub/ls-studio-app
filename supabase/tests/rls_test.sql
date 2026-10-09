-- Vérifie les règles d'accès : un client ne voit que ses données, l'équipe voit tout.
\set ON_ERROR_STOP 1
insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'luca@ls-studio.fr', '{"role":"admin"}', '{"full_name":"Luca"}');
insert into public.clients (id, name) values
  ('00000000-0000-0000-0000-0000000000c1', 'Boulangerie Martin'),
  ('00000000-0000-0000-0000-0000000000c2', 'Garage Dupuis');
insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000000b1', 'martin@ex.fr', '{"role":"client","client_id":"00000000-0000-0000-0000-0000000000c1"}'),
  ('00000000-0000-0000-0000-0000000000b2', 'dupuis@ex.fr', '{"role":"client","client_id":"00000000-0000-0000-0000-0000000000c2"}'),
  ('00000000-0000-0000-0000-0000000000b3', 'pirate@ex.fr', '{}');
insert into public.files (id, client_id, storage_key, name, kind) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000c1', 'k1', 'reel.mp4', 'video'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000c2', 'k2', 'photo.jpg', 'photo');
insert into public.invoices (number, client_id, amount_ht, due_on) values
  ('F-2026-001', '00000000-0000-0000-0000-0000000000c1', 490, '2026-10-31'),
  ('F-2026-002', '00000000-0000-0000-0000-0000000000c2', 690, '2026-10-31');

create function pg_temp.check(cond boolean, label text) returns void language plpgsql as $$
begin if not cond then raise exception 'ÉCHEC : %', label; end if; raise notice 'ok : %', label; end $$;

-- Client Martin
set role authenticated; select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', false);
select pg_temp.check((select count(*) from public.clients) = 1, 'client ne voit que sa fiche');
select pg_temp.check((select count(*) from public.files) = 1, 'client ne voit que ses fichiers');
select pg_temp.check((select count(*) from public.invoices) = 1, 'client ne voit que ses factures');
select pg_temp.check((select count(*) from public.tasks) = 0, 'client ne voit pas les tâches');
select pg_temp.check((select count(*) from public.profiles) = 1, 'client ne voit que son profil');
update public.files set status = 'valide';
select pg_temp.check((select status from public.files where id = '00000000-0000-0000-0000-0000000000f1') = 'a_valider', 'client ne peut pas modifier un fichier directement');
update public.profiles set role = 'admin';
select pg_temp.check(not public.is_admin(), 'client ne peut pas se promouvoir admin');
insert into public.messages (client_id, from_team, body) values ('00000000-0000-0000-0000-0000000000c1', false, 'Bonjour !');
select pg_temp.check((select sender_name from public.messages limit 1) = 'Boulangerie Martin', 'nom expéditeur client renseigné');
do $$ begin
  insert into public.messages (client_id, from_team, body) values ('00000000-0000-0000-0000-0000000000c2', false, 'intrus');
  raise exception 'ÉCHEC : message vers un autre client accepté';
exception when insufficient_privilege then raise notice 'ok : message vers un autre client refusé'; end $$;
do $$ begin
  insert into public.messages (client_id, from_team, body) values ('00000000-0000-0000-0000-0000000000c1', true, 'faux message équipe');
  raise exception 'ÉCHEC : faux message équipe accepté';
exception when insufficient_privilege then raise notice 'ok : client ne peut pas se faire passer pour l''équipe'; end $$;
do $$ begin
  perform public.review_file('00000000-0000-0000-0000-0000000000f2', 'valide');
  raise exception 'ÉCHEC : validation du fichier d''un autre client';
exception when raise_exception then
  if sqlerrm like 'ÉCHEC%' then raise; end if; raise notice 'ok : fichier d''un autre client refusé'; end $$;
select public.review_file('00000000-0000-0000-0000-0000000000f1', 'modif_demandee', 'plus court');
select pg_temp.check((select status from public.files) = 'modif_demandee', 'demande de modif enregistrée');
select pg_temp.check(public.next_invoice_number() is null, 'client n''obtient pas de numéro de facture');
reset role;
select pg_temp.check((select count(*) from public.tasks where source_file_id = '00000000-0000-0000-0000-0000000000f1') = 1, 'tâche créée pour l''équipe');

-- Utilisateur sans client
set role authenticated; select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b3', false);
select pg_temp.check((select count(*) from public.files) = 0 and (select count(*) from public.clients) = 0, 'compte sans client ne voit rien');

-- Anonyme
select set_config('request.jwt.claim.sub', '', false); set role anon;
select pg_temp.check((select count(*) from public.files) = 0, 'anonyme ne voit rien');
reset role;

-- Admin
set role authenticated; select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', false);
select pg_temp.check(public.is_admin(), 'admin reconnu');
select pg_temp.check((select count(*) from public.files) = 2 and (select count(*) from public.tasks) = 1, 'admin voit tout');
select pg_temp.check(public.next_invoice_number(2026) = 'F-2026-003', 'numéro de facture suivant');
insert into public.messages (client_id, from_team, body) values ('00000000-0000-0000-0000-0000000000c1', true, 'Bien reçu');
select pg_temp.check((select sender_name from public.messages where from_team) = 'Luca', 'nom expéditeur équipe renseigné');
select public.mark_messages_read('00000000-0000-0000-0000-0000000000c1');
select pg_temp.check((select read_at is not null from public.messages where not from_team) and (select read_at is null from public.messages where from_team), 'admin marque lus les messages du client seulement');
reset role;
\echo TOUS LES TESTS SONT PASSÉS
