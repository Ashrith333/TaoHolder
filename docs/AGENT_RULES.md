# AGENT_RULES (TH-PRD-002 wins over your defaults)

NEVER
- one big HTML/CSS/JS file; inline `<style>`/`<script>` (the theme boot script in `app/layout.tsx` is the one exception)
- logic in `src/app/` routes: pages compose `<PageSections page="…" />` + metadata only
- numbers, copy or colours in components: use `content/` (or Supabase) and `src/styles/tokens.css`
- float maths for amounts: bigint rao in `src/services/`
- raw signing, seed input, storing keys (CI grep: `scripts/check-security.mjs`)
- import another feature's internals: use its `index.ts` (ESLint enforces)

ALWAYS
- line limits: page 80/150, component 200/350, service 200/300 (`scripts/check-limits.mjs`)
- Zod-validate content and API data (`src/adapters/content/schemas.ts`)
- unit tests with every service change; E2E for every flow change
- run `pnpm lint && pnpm typecheck && pnpm test` before finishing
- change JSON and guard config before changing screens
- list files changed and why at the end of each task
