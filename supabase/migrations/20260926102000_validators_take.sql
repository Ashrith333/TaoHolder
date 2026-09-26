alter table public.validators add column take numeric check (take >= 0 and take <= 1);
comment on table public.app_config is 'Config documents by key: app, features, risk-guards, buckets, wallets, errors. Value is validated by Zod in the app; invalid rows fall back to content/ JSON.';
comment on table public.data_sources is 'Input sources per kind and network. provider must match a key in src/adapters/sources/registry.ts. Lowest priority wins; failures fall through to the next row. Put API keys in env vars and name them in config.apiKeyEnv.';
comment on table public.page_sections is 'Replaceable page sections. component must be a key in src/sections/registry.tsx. props.when = always | connected | disconnected.';
