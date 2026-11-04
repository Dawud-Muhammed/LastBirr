# LastBirr

**Make every birr last.** A bilingual financial planning app for everyone in Ethiopia, built with Next.js App Router, TypeScript, Tailwind v4, shadcn/Base UI and Supabase.

Implemented: public landing page, real Supabase authentication, onboarding, protected dashboard, exact-santim daily budgeting, income/expense management, essential payments, savings reservations, planning periods, real-data Recharts insights, English/Amharic, and light/dark/system themes.

## Start here

The app is deployed at [last-birr.vercel.app](https://last-birr.vercel.app/). The existing financial schema is present with RLS enabled. This update adds unique email/mobile contacts, Ethiopian mobile validation, password confirmation and a refreshed interface. The new contact migration and frontend still need to be released together; follow [the release and online test flow](docs/RELEASE-TEST.md). Existing `.env.local` values were preserved.

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
- [Unique contact migration](supabase/migrations/202611040002_unique_contacts.sql)
- [Signup release and deployed acceptance tests](docs/RELEASE-TEST.md)

No deployment or Git push was performed. No service-role key is required. The application uses only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
