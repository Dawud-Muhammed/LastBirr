# LastBirr

**Make every birr last.** A bilingual financial planning app for Ethiopian university students, built with Next.js App Router, TypeScript, Tailwind v4, shadcn/Base UI and Supabase.

Implemented: public landing page, real Supabase authentication, onboarding, protected dashboard, exact-santim daily budgeting, income/expense management, essential payments, savings reservations, planning periods, real-data Recharts insights, English/Amharic, and light/dark/system themes.

## Start here

The hosted database migration has not been applied because the Supabase CLI is not authenticated. Follow [the setup and manual testing guide](docs/TESTING.md) before testing a real account. Existing `.env.local` values were preserved.

```powershell
Set-Location D:\Projects\LastBirr
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000).

## Verify

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm audit --omit=dev
```

- [Setup, Supabase configuration, acceptance checklist and Vercel readiness](docs/TESTING.md)
- [Financial model, data invariants and architecture](docs/ARCHITECTURE.md)
- [Executed checks, screenshots and remaining verification limits](docs/VERIFICATION.md)
- [Versioned database migration](supabase/migrations/202611040001_lastbirr.sql)

No deployment or Git push was performed. No service-role key is required. The application uses only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
