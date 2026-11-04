# Everyday expense tracking update

This local update focuses on four parts of the existing application:

- Plain landing copy explains manual expense tracking and daily spending guidance. An explicitly labelled, resettable example uses the real calculation engine without creating records.
- Onboarding starts with available balance and planning end date. Bills, savings, and correcting the profile name are expandable; invalid hidden fields automatically reopen.
- The dashboard emphasizes money left today and Add expense. Available balance remains visible, while the calculation breakdown is expandable.
- Expense entry focuses the amount, offers category shortcuts, defaults to today, and keeps date and note optional. Editing opens those details. Failed saves keep the values and pending saves disable the controls.

English and Amharic copy, light/dark appearance, and responsive styles are included. Database schema, ledger rules, and authentication behavior are unchanged by this update.

## Local verification

The existing 58 tests passed, including finance calculations, validation, translation parity, SQL permissions, and user isolation. Browser checks used the actual components with temporary local fixtures for authenticated screens; the fixture route was removed before the production build.

The final production build, TypeScript check, lint, and all 15 HTTP smoke checks passed. Desktop and mobile screenshots are saved beside this guide. The first build encountered stale generated development types after fixture removal; clearing those generated references resolved it.

Browser checks covered the example changing 100 ETB to 65 ETB after a 35 ETB expense, reset, two-field onboarding, reopening invalid optional fields, transaction category/type switching, editing prefilled values, future-date rejection, pending controls, and values retained after an unauthenticated save is rejected. Mobile layouts were inspected at 390px, including Amharic and dark appearance.

Successful authenticated writes were not exercised against the live Supabase project in this pass. Run the real-account acceptance flow below after releasing the update. This update has not been pushed or deployed.

## Acceptance flow

1. On the landing page, try the 35 ETB example and reset it. Confirm that it is labelled as an example and does not require sign-in.
2. With a new account, enter 1500 ETB and an end date ten days away. Expand reserves, add Rent 400 ETB and savings 100 ETB, then submit. Expect 100 ETB left today.
3. Select Add expense, enter 35, choose Food, and save. Expect 65 ETB left today, 1465 ETB balance, and the new entry in Recent activity.
4. Expand the calculation breakdown. The average daily guide is now 96.50 ETB; today's allocation remains 100 ETB and today's spending is 35 ETB.
5. Edit the entry from Transactions. Confirm its date, category, note, and amount are retained. Change the amount to 50 and save; expect 50 ETB left today.
6. Try an empty amount and a future date. Errors should explain the problem and open hidden details. Disconnect temporarily before saving a valid entry; confirm a failed save retains the values. Restore the connection and retry.
7. With another new account, complete onboarding using only balance and date. Confirm the first-expense prompt appears and the two accounts cannot see each other's records.
8. Repeat key flows on a phone, switch English/Amharic and Light/Dark, and check keyboard navigation, visible focus, modal scrolling, and Cancel.

The complete ledger and deployment checklist remains in [TESTING.md](TESTING.md).

## Browser branding and dashboard clarity

The browser now uses the same sprout mark as the LastBirr navigation: an SVG icon, a replacement multi-size favicon, and an Apple home-screen icon. The sprout geometry comes from the existing Lucide icon (ISC license). Each account and authentication page has a translated browser title followed by LastBirr.

The dashboard labels current balance, reserved bills, savings, and remaining spending money separately. Today's budget and everyday expenses have separate rows. Calculation explanations and bill descriptions use plain language. The expandable new-month guide explains adding income, carrying balances forward, setting the next date, and manually adding recurring bills. Money plan now explicitly labels its action **Start a new month or period** and explains that the savings field replaces the total reservation.

The updated page headings, sidebar, and footer describe what users can do rather than repeat promotional slogans. English and Amharic are included. The dashboard screenshot uses labelled local sample records, not a real account. Its temporary preview route is removed from the release.

To verify after deployment:

1. Open the site in a new tab and check the green LastBirr sprout icon. If an existing tab keeps its old favicon, close and reopen it or try a private window.
2. Visit Sign in, Transactions, and Money plan. Their tab titles should identify the current page and include LastBirr. Switch language and check that the page title changes too.
3. On Overview, compare current balance with the amounts reserved for bills and savings. Expand the calculation and new-month instructions.
4. Check a phone-sized view in both languages. Confirm that amounts, buttons, and help text fit without horizontal scrolling.

The HTTP smoke test checks public page titles, translated sign-in metadata, and that all three served icon files exactly match the local LastBirr assets.

Verification for this pass: 58 tests and all 18 production HTTP checks passed, along with lint, the production build (including TypeScript), and the whitespace check. The dashboard was inspected at desktop and 390px widths with sample records; no live financial writes were made. Nothing was pushed or deployed.
