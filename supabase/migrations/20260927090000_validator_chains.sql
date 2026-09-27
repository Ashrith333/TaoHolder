-- Validators become ordered chains: scope 'all' applies to every subnet (primary, backup, …),
-- scope 'netuid' rows are tried first for that subnet. Lower rank = tried first.
-- maxTake moves to app_config key 'validator-policy'.
drop index if exists public.validators_scope_netuid_uq;
alter table public.validators drop constraint if exists validators_scope_check;
alter table public.validators drop constraint if exists validators_netuid_scope;
delete from public.validators; -- placeholders only; reseeded by scripts/seed-*.ts
alter table public.validators add column if not exists rank int not null default 0;
alter table public.validators drop column if exists max_take;
alter table public.validators add constraint validators_scope_check check (scope in ('all', 'netuid'));
alter table public.validators add constraint validators_netuid_scope check ((scope = 'netuid') = (netuid is not null));
create unique index validators_chain_uq on public.validators (scope, coalesce(netuid, -1), rank);
comment on table public.validators is 'Validator chains. scope=all: shared chain for every subnet. scope=netuid: tried first for that subnet. Lower rank first. An entry is skipped if take > validator-policy.maxTake or it has no permit on the subnet (when permit data is available).';
insert into public.validators (scope, netuid, rank, name, hotkey, take) values
  ('all', null, 0, 'REPLACE: primary validator (on every subnet)', '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', 0.09),
  ('all', null, 1, 'REPLACE: backup validator', '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty', 0.1);
insert into public.app_config (key, value, description) values ('validator-policy', '{"maxTake":0.18}'::jsonb, 'Validator rules (D3)')
  on conflict (key) do update set value = excluded.value;
