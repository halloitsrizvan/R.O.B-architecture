-- Public portfolio content; private inquiries are accessible only on the server.
create table public.projects (
  slug text primary key check (slug ~ '^project-[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 160),
  description text not null default '',
  categories text[] not null default '{}',
  facts jsonb not null default '[]'::jsonb check (jsonb_typeof(facts) = 'array'),
  sort_order integer not null unique check (sort_order >= 0),
  featured boolean not null default false,
  published boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.project_images (
  id uuid primary key default gen_random_uuid(),
  project_slug text not null references public.projects(slug) on delete cascade,
  src text not null check (src like '/assets/%' or src like '/api/media/%' or src like 'https://%'),
  alt text not null check (char_length(alt) between 1 and 300),
  src_set text,
  sizes text,
  sort_order integer not null check (sort_order >= 0),
  unique (project_slug, sort_order)
);
create table public.contact_inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  email text not null check (char_length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  service text not null check (service in ('Architecture', 'Interior design', 'Landscape design')),
  message text not null check (char_length(trim(message)) between 10 and 5000),
  status text not null default 'new' check (status in ('new', 'contacted', 'archived')),
  request_hash text not null check (char_length(request_hash) = 64),
  created_at timestamptz not null default now()
);
create index contact_inquiries_request_window_idx on public.contact_inquiries (request_hash, created_at desc);
create index contact_inquiries_new_idx on public.contact_inquiries (created_at desc) where status = 'new';

alter table public.project_images add column storage_key text unique;
create table public.studio_admins (user_id text primary key, email text not null unique, created_at timestamptz not null default now());
create function public.submit_contact_inquiry(
  p_name text, p_email text, p_service text, p_message text, p_request_hash text
) returns void language plpgsql security invoker set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_request_hash, 0));
  if (select count(*) from public.contact_inquiries where request_hash = p_request_hash and created_at > now() - interval '15 minutes') >= 5 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;
  insert into public.contact_inquiries (name, email, service, message, request_hash)
  values (p_name, p_email, p_service, p_message, p_request_hash);
end;
$$;

revoke all on public.projects,public.project_images,public.contact_inquiries,public.studio_admins from public;
revoke execute on function public.submit_contact_inquiry(text,text,text,text,text) from public;
