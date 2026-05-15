-- BPMN diagram storage. The DB holds the canonical BPMN 2.0 XML.
-- Auth is Clerk; Supabase trusts Clerk via the native third-party-auth
-- integration (Clerk Dashboard → Integrations → Supabase, and Supabase
-- Dashboard → Authentication → Third-party Auth → add Clerk).
-- With that integration the Clerk session token reaches Postgres as the
-- request JWT: auth.jwt()->>'sub' is the Clerk user id, and the active
-- organization id is exposed at auth.jwt()->>'org_id' (verify the claim
-- name against your Clerk JWT — adjust the policies below if it differs).

create extension if not exists "pgcrypto";

create table if not exists public.diagrams (
  id          uuid primary key default gen_random_uuid(),
  org_id      text not null,
  owner_id    text not null,
  name        text not null default 'Untitled',
  bpmn_xml    text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists diagrams_org_id_idx on public.diagrams (org_id);
create index if not exists diagrams_updated_at_idx on public.diagrams (updated_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists diagrams_set_updated_at on public.diagrams;
create trigger diagrams_set_updated_at
  before update on public.diagrams
  for each row execute function public.set_updated_at();

alter table public.diagrams enable row level security;

-- Members of an organization can read every diagram in that org.
drop policy if exists diagrams_select on public.diagrams;
create policy diagrams_select on public.diagrams
  for select using (org_id = auth.jwt()->>'org_id');

-- Authenticated members create diagrams in their active org, as themselves.
drop policy if exists diagrams_insert on public.diagrams;
create policy diagrams_insert on public.diagrams
  for insert with check (
    org_id = auth.jwt()->>'org_id'
    and owner_id = auth.jwt()->>'sub'
  );

-- Any org member can update a diagram in their org (shared editing).
drop policy if exists diagrams_update on public.diagrams;
create policy diagrams_update on public.diagrams
  for update using (org_id = auth.jwt()->>'org_id')
  with check (org_id = auth.jwt()->>'org_id');

-- Only the owner deletes their diagram.
drop policy if exists diagrams_delete on public.diagrams;
create policy diagrams_delete on public.diagrams
  for delete using (
    org_id = auth.jwt()->>'org_id'
    and owner_id = auth.jwt()->>'sub'
  );
