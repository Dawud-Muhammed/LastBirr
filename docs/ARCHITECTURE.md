# LastBirr implementation notes

## Money and daily boundaries

Stored amounts are integer santim; 100 santim = 1 ETB. Inputs are parsed as decimal strings, not `parseFloat(value) * 100`. Recommendations floor to the nearest santim so division cannot over-allocate. Amounts are bounded, and database checks constrain aggregates used by the planning engine. Presentation alone converts santim into decimal currency.

The wallet has an immutable opening balance and opening day. Current balance is opening cash plus all received income minus all recorded expenses. A plan's date is never a source of income. A savings reservation is a column on the current plan and does not create a ledger transaction.

The engine in `src/lib/finance.ts` implements:

```text
B = opening balance + received income - expenses
E = unpaid essential commitments
S = virtual savings reservation
D = end date - today, measured as calendar days in Africa/Addis_Ababa

spendable = max(0, B - E - S)
average guide = floor(spendable / max(1, D))
spent today = today's expenses without a commitment link
today's allocation = floor(max(0, B + spent today - E - S) / max(1, D))
left today = max(0, min(spendable, today's allocation - spent today))
```

The end date is an exclusive horizon (Nov 4 → Nov 14 is ten days). A missing, current, or overdue end date uses a one-day fallback with an explicit warning; it never assumes an allowance has arrived. The UI requires an end date on onboarding and plan edits, while the engine still handles missing data defensively.

Adding back today's discretionary expenses reconstructs the allocation without repeatedly reducing it by the same expense. Income and reserve changes rebase the pool intentionally. On a new day, yesterday's expenses remain in the ledger balance but leave the `spent today` term. This also makes expense edits and deletions deterministic. All calendar-date comparisons avoid the host machine's local timezone.

## Database invariants

- Every private row has ownership linked to `auth.users` through its wallet/profile.
- RLS protects reads. Authenticated clients have no direct financial-table write privilege.
- Security-definer RPCs use a fixed empty search path, `auth.uid()`, ownership checks, validation constraints, and a transaction-scoped per-user advisory lock.
- A transaction UUID is its idempotency key. Reusing it updates the same owned ordinary record, not the balance twice.
- An essential is paid when a transaction refers to it. The unique `commitment_id` prevents duplicate settlement; there is no second paid flag to drift out of sync.
- Settling inserts one expense. The read model now treats that commitment as paid, so the corresponding reserve is released atomically.
- Settlement amounts cannot be edited independently. Deleting the payment reopens the commitment; the user can then edit and settle it again.
- A new period archives the active plan and creates one successor under the same lock. Cash, unpaid commitments and transaction history remain intact.
- `read_finances()` returns a single PostgreSQL MVCC snapshot under caller RLS. JSON aggregation avoids PostgREST's row cap on a ledger read.
- Financial-write days have allocation snapshots. Settings changes do not modify those historical records.

## Application boundaries

- `src/app`: server-rendered route entrypoints, protected layouts, auth callbacks, loading/error states.
- `src/features`: authentication, onboarding, dashboard, transaction management, money plan, insights and settings.
- `src/lib`: pure financial logic, schemas, shared types, authenticated data access and separate Supabase browser/server clients.
- `src/components`: shared shell and existing shadcn/Base UI components; theme, next-intl, tooltip and toast providers.
- `src/i18n`: matching English/Amharic catalogs and cookie-based next-intl configuration. Same routes in both languages preserve the current location.
- `src/proxy.ts`: the single Next.js 16 proxy refreshes Supabase cookies and supplies the default locale cookie. Page/action authorization rechecks the actual user.
- `tests`: deterministic TypeScript money tests and real PostgreSQL migration/RLS tests in an isolated PGlite instance.

Server Actions validate inputs and revalidate the app after mutation. UI forms use React Hook Form and Zod; synchronous submission locks and stable transaction UUIDs guard repeated submissions. Financial data is not placed in a shared application cache. Auth uses Supabase email/password and PKCE or verified token-hash callbacks, with allowlisted callback destinations. No fake account mode or service-role credentials exist in the application.
