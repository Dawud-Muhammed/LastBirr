# Signup release and online test flow

## What is already live

On 4 November 2026, the authenticated Supabase CLI updated only these settings on LastBirr (`jzzmlvjifepeokapwmlj`):

- Email confirmation is off. A successful new email/password signup receives a session immediately.
- Minimum password length is eight characters.
- Site URL is `https://last-birr.vercel.app/`. That origin was added to the redirect allowlist; existing entries were preserved.

The existing financial tables were verified with RLS enabled. The new `account_contacts` table is not live yet. No frontend deployment, Git commit/push, user creation, email sending or financial data mutation was performed during this update.

## Release the database and app together

The live database has no `supabase_migrations.schema_migrations` history table. Its original schema is already installed. **Do not blindly push both migration files or rerun the first migration.** Use the SQL Editor for this update, consistent with the existing installation.

1. Commit the reviewed local changes and prepare the Vercel deployment from that commit. Use the existing public Supabase URL and publishable key; no service-role key is needed.
2. In the LastBirr Supabase project, briefly disable **Allow new users to sign up** during this coordinated release. Existing accounts can keep signing in. This avoids using the old phone-less form against the new required-phone trigger.
3. In SQL Editor, run the entire `supabase/migrations/202611040002_unique_contacts.sql` file once. It runs in a transaction, preserves existing accounts and finances, and backfills canonical contacts. If existing normalized email/phone duplicates are found, it fails and rolls back; resolve the ownership conflict explicitly before retrying. Do not delete accounts or drop unique constraints to make the release pass.
4. Deploy the new frontend to the existing Vercel project. Check `/register` shows name, mobile number, email, password and confirmation. Check Settings displays the contact form for an existing account.
5. Re-enable new user signup. Keep **Confirm email** off and password minimum **8**. Run the acceptance flow below on [the deployed site](https://last-birr.vercel.app/).

Missing or invalid legacy phones remain empty until their owners add one in Settings. All stored phone numbers are globally unique; new signups must supply one. Existing valid short passwords can still sign in, but all newly created or changed passwords require at least eight characters.

If the frontend needs rollback after this migration, keep new signup disabled until the compatible phone form is restored. Existing login and financial data remain available.

## Real account acceptance flow

Use two email inboxes and two mobile numbers you control, with two separate browser profiles. Format examples below are illustrative; do not create accounts for numbers you do not own. Use a fresh test account because an existing ledger changes the expected totals. Perform the money steps on the same Addis Ababa calendar day.

1. **Validation before signup:** submit the empty form. Every required field shows a localized error. Try a one-character name, malformed email, a landline such as `0111234567`, a foreign number, seven-character password, and mismatched confirmation. None should create an account. Test English and Amharic.
2. **Account A:** enter your name, your Ethiopian mobile number, inbox A and a matching password of at least eight characters. Expected: immediate onboarding, no confirmation email step. Reload and confirm the session persists.
3. **Identity uniqueness:** in the second browser, attempt inbox A again using different email capitalization and an unused valid phone. Expect rejection. Then attempt inbox B with A's phone written in another format (for example `09…` versus `+2519…`, with spaces/hyphens). Expect rejection and no second Auth user. Auth may return the safe generic contact-conflict message for a phone collision; it does not expose a public lookup of another user's phone.
4. **Account B:** use inbox B and your second, distinct mobile number. Signup succeeds. This account must have its own onboarding and must never show account A's records.
5. **Onboard A:** balance **1500 ETB**, planning date **10 days from today**, essentials **400**, essential name **Rent**, savings **100**. Expect balance **1500**, protected essentials **400**, discretionary money **1000**, average daily guide **100**, today's allocation **100**, left today **100**.
6. **Expense:** add **35 ETB**, Food, today, note Lunch. Expect balance **1465**, daily guide **96.50**, today's allocation **100**, left today **65**. Reload and sign out/in: the transaction persists.
7. **Essential payment:** pay the **400 ETB Rent** commitment once. Expect balance **1065**, unpaid essentials **0**, left today still **65**. It must create only one linked payment. Delete that payment through Transactions: balance returns to **1465** and the **400 ETB** commitment reopens.
8. **Income and edits:** add **100 ETB income**. Expect balance **1565**, allocation **110**, left today **75**. Edit Lunch to **50**: balance **1550**, left today **60**. Delete Lunch: balance **1600**, left today **110**. These are ledger entries only; the app does not transfer real money.
9. **Other form checks:** reject negative/zero transaction amounts, more than two decimal places, future transaction dates, dates before wallet opening, past planning dates, blank commitment names, and overly long notes. A positive initial essential amount requires a name. Date filters show an error for a reversed range. Expected income never increases balance until recorded.
10. **Contact edits:** in Settings, A can save the same phone in a different accepted format. Trying B's phone must fail without changing either account. An existing account with no phone can add a unique one. Reload to confirm persistence. Name, theme and language changes must also persist.
11. **Password and recovery:** signed-in Change password requires eight characters and matching confirmation. Sign out and verify the old password fails and the new one works. Use Forgot password and open the email in the browser that requested it. The link must return to `last-birr.vercel.app`, allow a new password, and reject expired/reused links. Recovery still needs working SMTP; signup does not depend on email delivery.
12. **Privacy and UI:** when signed out, visit `/dashboard`, `/transactions`, `/plan`, `/insights`, `/settings`, `/onboarding`, `/reset-password`; each must require sign-in. Account B must still have no A data. At phone, tablet and desktop widths check rounded controls, focus/error states, scrollability, language, themes, dialogs and hover effects. Reduced-motion preferences suppress animation.

The broader financial edge cases are in [TESTING.md](TESTING.md).

## Security boundaries

Email is trimmed/lowercased, and phone is normalized to `+251` plus nine national digits before comparison. Unique database constraints enforce collisions even across simultaneous requests or direct Auth API calls. A trigger captures contacts in the same transaction as Auth signup; a rejected contact leaves no partial new Auth user. Editable user metadata cannot change an existing contact. Settings uses an authenticated RPC deriving identity from the JWT. RLS permits each user to read only their own contact, with no direct client writes.

Phone validation follows the Ethiopian mobile allocations in [Google libphonenumber metadata](https://github.com/google/libphonenumber/blob/master/resources/PhoneNumberMetadata.xml), checked 4 November 2026. Accepted input supports `09…`, assigned `07…`, allocated `080…`/`081…`, `+251…`, `251…`, and `00251…`, with spaces/hyphens. Length and allocation are checked in both TypeScript and SQL; landlines, foreign and unassigned prefixes are rejected. Update both patterns together when allocations change.

Without email confirmation or SMS OTP, email/phone ownership is **not verified**. Phone is a contact field, not a login or recovery credential. Keep Supabase rate limits active; configure [custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp) for reliable password recovery. No public contact-availability endpoint or admin auto-confirm workaround was added.

## Suggested commit message

```text
feat: secure signup with unique Ethiopian contacts and refresh LastBirr UI

- enforce canonical email and mobile uniqueness with protected contact updates
- validate forms and require matching passwords of at least eight characters
- support immediate signup without email confirmation
- broaden English and Amharic messaging for everyone
- improve rounded controls, accessible errors and branded hover effects
- add database regression tests and deployed acceptance instructions
```
