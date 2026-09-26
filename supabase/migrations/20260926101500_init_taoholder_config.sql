-- Applied to project qewsbecatbyguphoekab (taoholder) on 2026-09-26.
-- Config documents (features, risk-guards, buckets, app, wallets, errors). One row per JSON document.
create table public.app_config (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now()
);

-- Input sources: which adapter feeds which kind of data. Swap providers without code changes.
create table public.data_sources (
  id text primary key,
  kind text not null check (kind in ('subnets','pools','positions','history','price','rpc_http','rpc_ws','explorer')),
  provider text not null,
  url text,
  config jsonb not null default '{}'::jsonb,
  priority int not null default 100,
  enabled boolean not null default true,
  network text not null default 'mainnet' check (network in ('mainnet','testnet','local')),
  updated_at timestamptz not null default now()
);
create index data_sources_kind_idx on public.data_sources (kind, network, enabled, priority);

-- Curated subnet content (Learn + Trade rows).
create table public.subnets (
  netuid int primary key check (netuid >= 0),
  name text not null,
  layer text not null check (layer in ('compute','inference','data','other')),
  job text not null,
  twin text,
  stage text check (stage in ('shipping','early','research')),
  revenue_usd numeric,
  revenue_date date,
  product text,
  risks text[] not null default '{}',
  wins text[] not null default '{}',
  team text[] not null default '{}',
  links jsonb not null default '{}'::jsonb,
  curated_at date not null default current_date,
  published boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Default validators per subnet (D3). scope = default | fallback | netuid.
create table public.validators (
  id bigint generated always as identity primary key,
  scope text not null check (scope in ('default','fallback','netuid')),
  netuid int,
  name text not null,
  hotkey text not null,
  max_take numeric,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint validators_netuid_scope check ((scope = 'netuid') = (netuid is not null))
);
create unique index validators_scope_netuid_uq on public.validators (scope, coalesce(netuid, -1));

-- UI copy and error strings.
create table public.copy_strings (
  locale text not null default 'en',
  key text not null,
  text text not null,
  updated_at timestamptz not null default now(),
  primary key (locale, key)
);

-- Replaceable page sections: each page renders the enabled rows in order using the component registry.
create table public.page_sections (
  id text primary key,
  page text not null,
  component text not null,
  position int not null default 100,
  enabled boolean not null default true,
  props jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create index page_sections_page_idx on public.page_sections (page, enabled, position);

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

do $$ declare t text;
begin
  foreach t in array array['app_config','data_sources','subnets','validators','copy_strings','page_sections'] loop
    execute format('create trigger %I_touch before update on public.%I for each row execute function public.touch_updated_at()', t, t);
  end loop;
end $$;

-- RLS: public, read-only content. Writes go through the service role (seed script / dashboard).
do $$ declare t text;
begin
  foreach t in array array['app_config','data_sources','subnets','validators','copy_strings','page_sections'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "public read" on public.%I for select to anon, authenticated using (true)', t);
  end loop;
end $$;
