# Verification record — 4 November 2026

## Completed checks

- `npm test`: **40 tests passed**, none failed or skipped. Includes the pure financial engine, date/precision handling, validation, translation-key parity, and actual PostgreSQL migration/RLS/RPC execution in PGlite.
- `npm run typecheck`: **passed**.
- `npm run lint`: **passed**, zero warnings after replacing incompatible form watching and internal full-page navigation.
- `npm run build`: **passed** on Next.js 16.4.5, including the single proxy and all application/auth routes and the not-found route. The final build includes the callback-origin regression fix.
- `npm run test:http`: **15 checks passed** against the local Next.js server: four public pages, seven protected routes, two invalid auth callbacks, Amharic server rendering, and 404 status.
- `npm audit --omit=dev`: **passed**, zero reported production vulnerabilities.
- `npm audit`: **16 moderate development-tool findings**, via minimatch/ESLint. `npm audit fix --dry-run --json` offered no compatible changes. No forced breaking upgrade was applied.
- `git diff --check`: **passed**.

## Browser checks completed

- Desktop landing layout and real navigation to sign-in.
- Phone viewport at 390 × 844; measured content width equals viewport content width, with no horizontal overflow on the landing page.
- English ↔ Amharic switching, including keeping `/login` and translating its validation messages.
- Dark and light appearance; persisted preference across navigation.
- Empty sign-in submission shows localized email/password errors without sending credentials.
- Locally bundled Noto Sans Ethiopic renders Amharic clearly.
- Responsive viewport overrides were reset after testing.

Saved screenshots: [desktop](preview-desktop.jpg) and [Amharic mobile dark theme](preview-mobile-am.jpg).

## Issues found and corrected

- Existing shadcn components imported missing Base UI and class-variance-authority dependencies; installed compatible dependencies.
- SWC could not materialize its native cache inside the Windows sandbox; the production build passed with authorized normal user access. No system permissions were weakened.
- The sandbox blocked loopback HTTP testing; the same read-only test passed with authorized localhost access.
- An HTTP regression test caught callback redirects changing `127.0.0.1` to `localhost`. Fixed callbacks to return only fixed relative destinations, preserving origin and auth cookies. The same test then passed.
- Account reads now use a single PostgreSQL snapshot to keep ledger/reserve state consistent and avoid PostgREST row truncation.

## Not verified against the hosted service

The Supabase CLI reported that no access token is configured. No linked project reference exists in this checkout. The hosted migration was not applied, no real test account was created, no email was sent, and no hosted financial data was changed.

The production application has real Supabase authentication and protected server reads/actions. Nevertheless, hosted signup, email confirmation, recovery, session refresh with an actual account, financial persistence, and authenticated browser interactions still require the setup and acceptance tests in [TESTING.md](TESTING.md). Local PostgreSQL authorization tests do not establish that a remote project's migration or auth settings are correct.

Amharic has complete matching message coverage and was visually checked; native-speaker editorial review remains advisable before launch. The default one-wallet ETB scope, historical allocation behavior, and large-ledger limitations are documented in [ARCHITECTURE.md](ARCHITECTURE.md) and [TESTING.md](TESTING.md).

No Git commit/push, Vercel deployment, destructive database operation, or environment-secret replacement was performed.
