# Friendly Betting App (MVP)

MVP features:
- Google sign-in (Supabase OAuth)
- Create/join private groups
- Create events and betting markets
- Place bets with points wallet
- Leaderboard
- Bet history
- Simple analytics charts (Recharts)
- Optional manual settle (auto-settle can be added later)

## Tech Stack
- Next.js (App Router, TypeScript)
- Tailwind CSS
- shadcn-style UI primitives
- Recharts
- Supabase Auth + Postgres + RLS
- Vercel

## 1) Install

```bash
npm install
```

## 2) Environment

Copy `.env.example` to `.env.local` and fill values:

```bash
cp .env.example .env.local
```

Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only, never expose in browser)
- `NEXT_PUBLIC_APP_URL` (example: `http://localhost:3000`)

## 3) Supabase setup

1. Create a Supabase project.
2. In Auth -> Providers, enable Google OAuth and set redirect URL:
   - `http://localhost:3000/auth/callback`
   - your production callback URL
3. Run SQL in order:
   - [`supabase/migrations/0001_init.sql`](/c:/Users/HP/OneDrive/Documents/Coding/betting/supabase/migrations/0001_init.sql)
   - [`supabase/migrations/0002_grants_and_group_select_fix.sql`](/c:/Users/HP/OneDrive/Documents/Coding/betting/supabase/migrations/0002_grants_and_group_select_fix.sql)
   - [`supabase/migrations/0003_rls_group_visibility_fix.sql`](/c:/Users/HP/OneDrive/Documents/Coding/betting/supabase/migrations/0003_rls_group_visibility_fix.sql)
   - [`supabase/migrations/0004_rls_hardening_and_group_rpcs.sql`](/c:/Users/HP/OneDrive/Documents/Coding/betting/supabase/migrations/0004_rls_hardening_and_group_rpcs.sql)
   - [`supabase/migrations/0005_fix_group_members_select_policy.sql`](/c:/Users/HP/OneDrive/Documents/Coding/betting/supabase/migrations/0005_fix_group_members_select_policy.sql)
4. (Optional) Run [`supabase/seed.sql`](/c:/Users/HP/OneDrive/Documents/Coding/betting/supabase/seed.sql).

## 4) Run

```bash
npm run dev
```

Open `http://localhost:3000`.

## Notes

- Wallet is points-based (not real money).
- Manual market settlement is included from group owner/admin pages.
- Auto-settle can be added with Supabase Edge Functions + cron.

## Troubleshooting

- If "Create Group" appears to do nothing, it is usually DB permission policy/grant related.
- Make sure migration `0002_grants_and_group_select_fix.sql` has been run.
- Make sure migration `0003_rls_group_visibility_fix.sql` has been run.
- Make sure migration `0004_rls_hardening_and_group_rpcs.sql` has been run.
- Make sure migration `0005_fix_group_members_select_policy.sql` has been run.
- Dashboard now shows action error messages in-page.
