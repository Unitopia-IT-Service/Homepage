-- Unitopia IT-Service: Datenbank-Einrichtung für Supabase
-- Im Supabase-Dashboard unter "SQL Editor" einfügen und einmal ausführen.

-- 1) Zugänge (Admin und Mitarbeiter)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'staff' check (role in ('admin','staff')),
  active boolean not null default true,
  first_name text,
  last_name text,
  phone text,
  job_title text,
  created_at timestamptz not null default now()
);

create or replace function public.is_staff() returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.profiles where id = auth.uid() and active);
$$;

create or replace function public.is_admin() returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.profiles where id = auth.uid() and active and role = 'admin');
$$;

-- 2) Anfragen aus dem Formular
create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null,
  email text not null,
  phone text not null,
  customer_type text not null,          -- Privatkunde / Geschäftskunde
  device_type text not null,            -- Gerät oder Projekt
  device_count integer check (device_count between 1 and 999),  -- Anzahl Geräte (optional)
  preferred_date date,                  -- Wunschtermin (optional)
  location text not null,               -- Ort / PLZ
  services text[] not null default '{}',
  message text,
  status text not null default 'Neu'
    check (status in ('Neu','Angenommen','In Bearbeitung','Abgeschlossen','Abgelehnt')),
  confirm_mail text,                    -- sent / failed
  notify_mail text,                     -- sent / failed
  mail_error text
);
-- falls die Tabelle schon aus einer älteren Version existiert:
alter table public.inquiries add column if not exists device_count integer check (device_count between 1 and 999);
create index if not exists inquiries_created_idx on public.inquiries (created_at desc);

-- 3) Interne Notizen
create table if not exists public.inquiry_notes (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries(id) on delete cascade,
  note text not null,
  author_email text,
  created_at timestamptz not null default now()
);

-- 4) Zugriffsregeln (Row Level Security)
alter table public.profiles       enable row level security;
alter table public.inquiries      enable row level security;
alter table public.inquiry_notes  enable row level security;

drop policy if exists "profiles lesen"   on public.profiles;
drop policy if exists "profiles ändern"  on public.profiles;
create policy "profiles lesen"  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy "profiles ändern" on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "anfragen lesen" on public.inquiries;
create policy "anfragen lesen" on public.inquiries for select to authenticated
  using (public.is_staff());
-- Einfügen, Status ändern und Löschen laufen nur über die Edge Functions (kein Zugriff aus dem Browser).

drop policy if exists "notizen lesen"    on public.inquiry_notes;
drop policy if exists "notizen schreiben" on public.inquiry_notes;
create policy "notizen lesen"     on public.inquiry_notes for select to authenticated using (public.is_staff());
create policy "notizen schreiben" on public.inquiry_notes for insert to authenticated with check (public.is_staff());

-- 5) Live-Aktualisierung im Admin-Bereich
do $$ begin
  alter publication supabase_realtime add table public.inquiries;
exception when duplicate_object then null;
end $$;

-- 6) Ersten Administrator festlegen (NACHDEM du ihn unter Authentication > Users angelegt hast):
-- insert into public.profiles (id, email, role, first_name, last_name, job_title)
-- select id, email, 'admin', 'Vorname', 'Nachname', 'Inhaber' from auth.users where email = 'DEINE-LOGIN-MAIL';
