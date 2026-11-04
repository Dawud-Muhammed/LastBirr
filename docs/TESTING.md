# LastBirr local testing and deployment checklist

## Current status

The original app is deployed, and its financial tables have RLS enabled. The CLI is authenticated. The new contact migration and frontend are ready locally; follow [RELEASE-TEST.md](RELEASE-TEST.md) for the coordinated update and exact online acceptance flow. Existing `.env.local` values were preserved.

## 1. Configure the database

For a fresh database, apply both numbered files in `supabase/migrations/` in order. For the existing deployed database, apply only the new contact migration as described in [RELEASE-TEST.md](RELEASE-TEST.md).

It creates profiles, wallets, plans, categories, transactions, commitments and daily budgets. It enables RLS on every table, grants authenticated users access only to their own financial rows, and exposes narrowly scoped transactional RPCs. No service-role key is used by the app.

**SQL Editor option:** open the intended Supabase project, verify its reference matches the hostname in your existing `NEXT_PUBLIC_SUPABASE_URL`, and run the entire migration in SQL Editor once. Do not run it against a different application's database. If any named table already exists, stop and reconcile the schema instead of dropping it. SQL Editor does not automatically record CLI migration history; use one migration method consistently or reconcile history before subsequently using CLI push.

**CLI option (installed Supabase CLI 3):**

```powershell
Set-Location D:\Projects\LastBirr
npx supabase login
npx supabase projects list
$projectRef = "YOUR_LASTBIRR_PROJECT_REF"
npx supabase db push --remote=$projectRef --skip-vault --dry-run
# After confirming the intended target and the single LastBirr migration:
npx supabase db push --remote=$projectRef --skip-vault
```

CLI 3 defaults to the local database, so `--remote` is necessary. `--skip-vault` keeps this migration operation from updating Vault secrets from CLI configuration. Never run `db reset` against your hosted project.

Check RLS in SQL Editor:

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('profiles','wallets','plans','categories','transactions','commitments','daily_budgets');

select tablename, policyname, roles, cmd, qual
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles','wallets','plans','categories','transactions','commitments','daily_budgets');
```

All seven tables should have `rowsecurity = true`. Financial tables have an authenticated SELECT policy using `auth.uid() = user_id`; categories are readable by authenticated users. Direct INSERT/UPDATE/DELETE privileges are deliberately absent. Financial mutations go through `onboard` and `mutate_finances`, which derive identity from the JWT and lock that user's wallet. `read_finances` is security-invoker and respects RLS. The `lb_snapshot` helper is not publicly executable.

Run `npm test` for an executable two-user isolation check against a fresh, in-memory PostgreSQL database. Also test two real accounts in separate browser profiles after applying the hosted migration; SQL Editor's administrator role is not a substitute for testing authenticated RLS.

## 2. Configure Supabase Auth

Enable the email/password provider, set minimum password length to 8 and disable email confirmation for the requested immediate signup flow. These settings are already applied on the current hosted project. Email ownership is not verified in this mode.

For a separate local-testing Supabase project, set Site URL to `http://localhost:3000` and add these development Redirect URLs. Keep the live project Site URL on the deployed domain:

```text
http://localhost:3000/**
http://127.0.0.1:3000/**
```

Signup immediately returns a session. Password recovery requests `/auth/callback?next=/reset-password`. The callback only permits the dashboard and password-reset destinations. Use the same hostname throughout a PKCE flow, and open the email in the browser where you requested it.

The default Supabase recovery email links (`{{ .ConfirmationURL }}`) work with the PKCE callback. Alternatively, use these server-verified token-hash links in the respective templates:

```html
<!-- Reset password -->
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery"
  >Reset password</a
>
```

Token-hash templates use Site URL, so make sure it points at the environment you are testing. These links work without the originating browser's PKCE verifier. Expired/invalid links return a localized error on sign-in.

Configure custom SMTP before sending reset emails to people. The built-in sender is restricted to project organization team addresses and has a small project-wide quota; a missing email is not evidence that the form is broken. Verify sender domain and delivery, disable email link tracking if it rewrites links, and review auth/email rate limits. See [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [rate limits](https://supabase.com/docs/guides/auth/rate-limits), and [redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).

## 3. Start locally

Use Node.js 22 or 24 LTS and PowerShell. Node 24 was used during implementation.

```powershell
Set-Location D:\Projects\LastBirr
npm ci
# Only if .env.local does not exist; never overwrite existing values:
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
# Fill in the two public Supabase values if needed, then:
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). If the port is occupied, stop the previous server or use the URL printed by Next.js and add that origin to Supabase's redirect allowlist.

Required variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Use the publishable key from the same Supabase project as the URL. Do not put a service-role or secret key in a `NEXT_PUBLIC_` variable.

## 4. Manual acceptance test

1. Open the landing page. Switch English/Amharic and Light/Dark/System. Reload: the language and theme persist, and switching language keeps the current page.
2. Create an account with name, a unique Ethiopian mobile number, unique email, an 8+ character password and matching confirmation. Signup immediately goes to onboarding without an email confirmation step. Test duplicate contacts and malformed fields using [RELEASE-TEST.md](RELEASE-TEST.md).
3. Enter available balance **1500**, a date **10 calendar days from today in Addis Ababa**, unpaid essentials **400**, savings **100**, and an essential name such as Rent. Choose either Expected income or Custom horizon. Submit once.
4. Dashboard: actual balance **1,500.00 ETB**, protected essentials **400.00**, savings **100.00**, discretionary money **1,000.00**, average daily guide **100.00**, today's allocation **100.00**, and today's remaining amount **100.00**.
5. Add a **35.00 ETB Food expense today**, note Lunch. Expect balance **1,465.00**, discretionary **965.00**, average guide **96.50**, allocation **100.00**, and left today **65.00**. Values and recent activity update without manually refreshing.
6. On Money plan, record the **400 ETB essential payment** only once. Expect balance **1,065.00**, unpaid essentials **0**, discretionary **965.00**, and left today still **65.00**. A repeat payment must not create a second expense. Its transaction is marked Essential payment.
7. Delete that payment in Transactions and confirm. Expect balance **1,465.00**, the **400 ETB** commitment reopened, and discretionary **965.00**. This proves it was not subtracted twice. Paid commitments must not be editable until their payment is removed.
8. Add **100 ETB income** today. Expect balance **1,565.00**, discretionary **1,065.00**, allocation **110.00**, and left today **75.00**. Merely changing the expected income date must never increase balance.
9. Edit the lunch to **50.00**. Expect balance **1,550.00**, discretionary **1,050.00**, allocation **110.00**, left today **60.00**. Delete lunch: balance **1,600.00**, discretionary **1,100.00**, left today **110.00**.
10. Add/edit/remove an unpaid commitment and its due date. Check the reserve changes. Try a reserve above available cash: remaining budget clamps at zero with a calm shortage warning.
11. Change the planning end date or savings. Start a new period with confirmation. Transaction history, actual balance, and unpaid essentials carry forward; no expected income is automatically received. The savings reservation is virtual and changes no cash.
12. Transactions: search notes and translated category names; filter income/expense, category, and date range. Check the empty state when no records match. Negative, zero, invalid category, future-dated, or excessive-precision transactions must be rejected. Dates before onboarding are excluded because opening cash already includes earlier activity.
13. Insights: select a date range containing your entries. Verify totals, category breakdown, daily expenses, income-versus-expense chart, and allocation comparison. Expand the accessible data table. Only actual ledger data appears. Missing historical allocations stay blank.
14. Settings: change name, preferred language, theme; save and reload. Follow Change password while signed in. Separately sign out, request a password reset, follow the email, and verify the new password works. Check an expired link produces an error.
15. Sign out and visit `/dashboard`, `/transactions`, `/plan`, `/insights`, `/settings`, `/onboarding`, and `/reset-password`: each must send you to sign-in. Sign in with a second account in another browser profile: no first-user financial data should appear.
16. Test at 390px, 768px, and desktop width. On phones, verify the bottom navigation, forms, keyboard focus, dialog close/cancel, and scrollability. No horizontal page overflow should occur. Review Amharic text with a native speaker before public launch.
17. Addis Ababa midnight is 21:00 UTC. An open authenticated page checks the day every 15 seconds and on return to the tab, then refreshes. Yesterday's expenses no longer subtract from today's allocation; the remaining cash is divided by the new remaining days.

## 5. Automated checks

```powershell
Set-Location D:\Projects\LastBirr
npm run typecheck
npm run lint
npm test
npm run build
npm audit --omit=dev
# Optional full report, including development tooling:
npm audit
# With the development server running in another terminal:
npm run test:http
# Exercise the optimized local build:
npm start
```

Tests include financial calculations, date/money validation, translation-key parity, and execution of the actual SQL migration using PGlite. PostgreSQL tests use disposable memory-only records, not your Supabase project or credentials. They exercise duplicate expense IDs, repeat commitment payment, transaction changes, atomic onboarding, ledger history, RPC authorization, table privileges, RLS, and isolation of two users.

## 6. Before Vercel deployment

This update has not been deployed or pushed. The earlier app is already live.

- Coordinate the new contact migration with the phone-enabled form using [RELEASE-TEST.md](RELEASE-TEST.md).
- Configure the two public variables in Vercel's Production environment, and separately for Preview if needed. Use a separate development Supabase project for preview testing where practical. No service-role key is required.
- Use Vercel's Next.js preset, repository root, `npm run build`, and a compatible Node LTS runtime. Next.js handles output configuration. Rebuild after changing public environment values.
- Set Supabase Site URL to the final `https://YOUR_DOMAIN`. Add explicit production redirect URLs for `/auth/callback` and `/auth/callback?next=/reset-password`. Add only the preview origins you intend to trust. Keep development wildcards limited to local testing.
- Verify production SMTP, sender-domain records, immediate signup, reset emails, and auth rate limits. Test on the deployed domain before inviting people.
- Run the two-real-account isolation checklist against the hosted project; verify backups and project access are appropriate.

## Limits to understand

- The new hosted signup/contact flows still require the release and real-account acceptance checks. Local SQL tests do not establish live SMTP delivery or browser session behavior.
- One wallet and one active plan per account; ETB only. No banking, actual money transfers, AI advice, or guaranteed financial forecasts.
- Today has a reconstructed allocation: today's discretionary expenses are added back once before division, then subtracted from that allocation. Income and plan changes intentionally rebase it. Payments of reserved essentials do not consume the discretionary allocation.
- Historical allocations are snapshots from financial-write days. They are not fabricated for unobserved days, and backdated edits do not rewrite earlier allocations.
- All of a person's ledger is loaded in one consistent RPC snapshot. This avoids truncation and is practical for an MVP; very large histories would benefit from server-side aggregation and paginated history views.
- Full audit reports 16 moderate development-tool findings through minimatch/ESLint. The compatible dry run offered no changes; forced breaking changes were not applied. Production audit is clean at verification time.
