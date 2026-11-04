# Verification record — 4 November 2026

## Current update

- `npm test`: **58 tests passed**. Includes finance calculations, date/money validation, auth field schemas, phone normalization, and actual PostgreSQL migration/RPC/RLS tests using PGlite.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run build`: passed on Next.js 16.4.5, including all application and auth routes.
- `npm run test:http`: **15 checks passed** against the optimized local server, covering public pages, protected routes, invalid auth callbacks, Amharic and 404 rendering.
- Contact SQL tests exercise normalized signup collisions, atomic rollback of rejected Auth users, existing-account preservation, migration rollback on legacy duplicates, metadata tampering, email changes, authenticated phone edits, table privileges, missing JWTs and two-account isolation.
- Repository search found no remaining audience-restricting English/Amharic wording in project-owned text. Existing preview screenshots were regenerated with the current copy.

## Browser checks

- Updated landing and registration pages rendered from the optimized local build.
- Empty registration shows errors for all five required fields, with accessible labels and error descriptions.
- Landline input and a seven-or-fewer-character password were rejected; mismatched confirmation displayed its own error. A valid `+2517…` format cleared the phone error. These submissions remained invalid and created no hosted account.
- Mobile registration at 390 × 844 and tablet at 768 × 1024 had no horizontal overflow.
- English and Amharic signup errors, dark theme and public navigation worked. No browser warnings/errors were captured during these checks.
- Temporary viewport overrides were reset after testing.

Screenshots: [desktop landing](preview-desktop.jpg), [Amharic mobile landing](preview-mobile-am.jpg), [mobile registration](preview-signup-mobile.jpg).

## Hosted checks and changes

The CLI is authenticated and the configured application URL matches LastBirr project `jzzmlvjifepeokapwmlj`. Read-only schema inspection confirmed the existing financial tables have RLS enabled and the new contact table is absent. The remote has no CLI migration history table; a direct migration-list connection stalled, and the read-only management API confirmed that absence.

Applied through a narrowly scoped config: email confirmation **off**, password minimum **8**, Site URL **https://last-birr.vercel.app/**, and the same origin added to allowed redirects. Existing redirect URLs and all undeclared settings were preserved. No secrets were replaced or printed.

The new contact migration is **not applied to production** because it requires the phone-enabled signup form to be released alongside it. No Git commit/push or Vercel deployment was performed. No real account was created, no email was sent, and no hosted financial data was changed. Live signup, recovery delivery, authenticated UI and contact persistence still need the real-account flow in [RELEASE-TEST.md](RELEASE-TEST.md).

## Boundaries

Phone validation checks supported Ethiopian mobile allocations and formatting, not possession of a SIM. With confirmation disabled, mailbox ownership is not verified either. The contact number is not a recovery factor. Row-level access control and unique constraints protect records; they do not establish contact ownership.

The earlier dependency audit reported zero production vulnerabilities and 16 moderate development-tool findings through minimatch/ESLint; dependencies were not changed by this update. The full financial model and MVP limits remain documented in [ARCHITECTURE.md](ARCHITECTURE.md) and [TESTING.md](TESTING.md).
