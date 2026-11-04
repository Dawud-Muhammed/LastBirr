import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { todayInAddis, addDays } from "../src/lib/finance";
const alice = "11111111-1111-4111-8111-111111111111";
const bob = "22222222-2222-4222-8222-222222222222";
const expense = "33333333-3333-4333-8333-333333333333";
test("PostgreSQL migration, RPC invariants and RLS integration", async (t) => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema public,auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;`,
    );
    await db.exec(
      readFileSync("supabase/migrations/202611040001_lastbirr.sql", "utf8"),
    );
    await db.query("insert into auth.users(id) values($1),($2)", [alice, bob]);
    const asUser = async (id: string) => {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id,
      ]);
      await db.exec("set role authenticated");
    };
    const rpc = async (op: string, data: object) =>
      db.query("select public.mutate_finances($1,$2::jsonb)", [
        op,
        JSON.stringify(data),
      ]);
    const rows = async (table: string) =>
      (await db.query<Record<string, unknown>>(`select * from public.${table}`))
        .rows;
    const today = todayInAddis();
    await asUser(alice);
    await t.test(
      "atomic onboarding and repeat requests do not reset the wallet",
      async () => {
        await db.query("select public.onboard($1,$2,$3,$4,$5,$6,$7,$8)", [
          "Alice",
          150000,
          addDays(today, 10),
          10000,
          "allowance",
          40000,
          "Rent",
          "en",
        ]);
        await db.query("select public.onboard($1,$2,$3,$4,$5,$6,$7,$8)", [
          "Changed",
          1,
          addDays(today, 10),
          0,
          "custom",
          0,
          "",
          "en",
        ]);
        assert.equal((await rows("wallets"))[0].opening_balance, 150000);
        assert.equal((await rows("daily_budgets"))[0].allocation, 10000);
      },
    );
    await t.test(
      "duplicate expense UUID creates exactly one ledger record",
      async () => {
        const data = {
          id: expense,
          amount: 3500,
          kind: "expense",
          category: "food",
          note: "Lunch",
          occurred_on: today,
        };
        await rpc("transaction", data);
        await rpc("transaction", data);
        assert.equal((await rows("transactions")).length, 1);
        assert.equal((await rows("daily_budgets"))[0].allocation, 10000);
      },
    );
    const commitment = (await rows("commitments"))[0].id as string;
    await t.test(
      "read RPC returns a consistent complete account snapshot",
      async () => {
        const result = await db.query<{
          read_finances: {
            profile: { name: string };
            transactions: unknown[];
            commitments: { paid: boolean }[];
          };
        }>("select public.read_finances()");
        assert.equal(result.rows[0].read_finances.profile.name, "Alice");
        assert.equal(result.rows[0].read_finances.transactions.length, 1);
        assert.equal(result.rows[0].read_finances.commitments[0].paid, false);
      },
    );
    await t.test(
      "repeated settlement creates one payment and releases reserve",
      async () => {
        await rpc("settle", { id: commitment });
        await rpc("settle", { id: commitment });
        const payments = (await rows("transactions")).filter(
          (r) => r.commitment_id === commitment,
        );
        assert.equal(payments.length, 1);
        assert.equal(payments[0].amount, 40000);
        assert.equal((await rows("daily_budgets"))[0].allocation, 10000);
      },
    );
    await t.test("settlement cannot be edited independently", async () => {
      const payment = (await rows("transactions")).find(
        (r) => r.commitment_id === commitment,
      )!;
      await assert.rejects(
        rpc("transaction", {
          id: payment.id,
          amount: 1,
          kind: "expense",
          category: "other",
          note: "",
          occurred_on: today,
        }),
        /protected_transaction/,
      );
      await assert.rejects(
        rpc("commitment", {
          id: commitment,
          title: "Changed",
          amount: 1,
          due_on: "",
        }),
        /paid_commitment/,
      );
    });
    await t.test(
      "deleting settlement reopens commitment without double counting",
      async () => {
        const payment = (await rows("transactions")).find(
          (r) => r.commitment_id === commitment,
        )!;
        await rpc("deleteTransaction", { id: payment.id });
        assert.equal(
          (await rows("transactions")).filter(
            (r) => r.commitment_id === commitment,
          ).length,
          0,
        );
        assert.equal((await rows("daily_budgets"))[0].allocation, 10000);
      },
    );
    await t.test(
      "edit and delete expense update ledger and daily allocation",
      async () => {
        await rpc("transaction", {
          id: expense,
          amount: 5000,
          kind: "expense",
          category: "food",
          note: "Lunch updated",
          occurred_on: today,
        });
        assert.equal((await rows("transactions"))[0].amount, 5000);
        await rpc("deleteTransaction", { id: expense });
        assert.equal((await rows("transactions")).length, 0);
      },
    );
    await t.test(
      "income increases allocation without planned income",
      async () => {
        await rpc("transaction", {
          id: expense,
          amount: 10000,
          kind: "income",
          category: "allowance",
          note: "Received",
          occurred_on: today,
        });
        assert.equal((await rows("daily_budgets"))[0].allocation, 11000);
      },
    );
    await t.test(
      "date and category constraints reject malformed direct RPC calls",
      async () => {
        await assert.rejects(
          rpc("transaction", {
            id: expense,
            amount: 100,
            kind: "income",
            category: "allowance",
            note: "",
            occurred_on: addDays(today, 1),
          }),
          /invalid_date/,
        );
        await assert.rejects(
          rpc("transaction", {
            id: expense,
            amount: 100,
            kind: "income",
            category: "food",
            note: "",
            occurred_on: today,
          }),
          /foreign key/,
        );
        await assert.rejects(
          rpc("transaction", {
            id: expense,
            amount: 0,
            kind: "income",
            category: "allowance",
            note: "",
            occurred_on: today,
          }),
          /check constraint/,
        );
      },
    );
    await t.test(
      "new periods carry wallet, ledger and commitments forward",
      async () => {
        await rpc("newPeriod", {
          end_on: addDays(today, 20),
          savings: 20000,
          horizon_type: "custom",
        });
        assert.equal((await rows("plans")).length, 2);
        assert.equal((await rows("plans")).filter((p) => p.active).length, 1);
        assert.equal((await rows("wallets"))[0].opening_balance, 150000);
        assert.equal((await rows("transactions")).length, 1);
        assert.equal((await rows("commitments")).length, 1);
      },
    );
    await t.test(
      "authenticated clients cannot write tables or call private helpers",
      async () => {
        await assert.rejects(
          db.exec("update public.wallets set opening_balance=0"),
          /permission denied/,
        );
        await assert.rejects(
          db.exec("select public.lb_snapshot()"),
          /permission denied/,
        );
      },
    );
    await asUser(bob);
    await t.test("second user cannot read any first-user rows", async () => {
      for (const table of [
        "profiles",
        "wallets",
        "plans",
        "transactions",
        "commitments",
        "daily_budgets",
      ])
        assert.equal((await rows(table)).length, 0);
    });
    await t.test(
      "read RPC preserves RLS and does not leak other profiles",
      async () => {
        const result = await db.query<{
          read_finances: { profile: unknown; transactions: unknown[] };
        }>("select public.read_finances()");
        assert.equal(result.rows[0].read_finances.profile, null);
        assert.equal(result.rows[0].read_finances.transactions.length, 0);
      },
    );
    await db.query("select public.onboard($1,$2,$3,$4,$5,$6,$7,$8)", [
      "Bob",
      50000,
      addDays(today, 10),
      0,
      "custom",
      0,
      "",
      "am",
    ]);
    await t.test(
      "cross-user record IDs cannot edit or settle someone else's money",
      async () => {
        await assert.rejects(
          rpc("transaction", {
            id: expense,
            amount: 1,
            kind: "income",
            category: "gift",
            note: "",
            occurred_on: today,
          }),
          /protected_transaction/,
        );
        await assert.rejects(rpc("settle", { id: commitment }), /not_found/);
        await rpc("deleteTransaction", { id: expense });
        assert.equal((await rows("transactions")).length, 0);
      },
    );
    await asUser(alice);
    assert.equal((await rows("transactions"))[0].amount, 10000);
    await t.test(
      "anonymous access to financial data and writes is denied",
      async () => {
        await db.exec("reset role; set role anon");
        await assert.rejects(
          db.exec("select * from public.transactions"),
          /permission denied/,
        );
        await assert.rejects(rpc("snapshot", {}), /permission denied/);
      },
    );
  } finally {
    await db.close();
  }
});
