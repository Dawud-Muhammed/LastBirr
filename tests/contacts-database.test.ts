import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { randomUUID } from "node:crypto";
import { normalizeEthiopianPhone } from "../src/lib/identity";
import { todayInAddis, addDays } from "../src/lib/finance";

test("legacy contact conflicts roll back the migration without deleting accounts", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key,email text,phone text,raw_user_meta_data jsonb default '{}'::jsonb);
      create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
      grant usage on schema public,auth to authenticated,anon;`);
    await db.exec(
      readFileSync("supabase/migrations/202611040001_lastbirr.sql", "utf8"),
    );
    await db.query(
      "insert into auth.users(id,email,phone) values($1,'one@example.com','0912345678'),($2,'two@example.com','+251912345678')",
      [randomUUID(), randomUUID()],
    );
    await assert.rejects(
      db.exec(
        readFileSync(
          "supabase/migrations/202611040002_unique_contacts.sql",
          "utf8",
        ),
      ),
      /unique/i,
    );
    await db.exec("rollback");
    assert.equal((await db.query("select id from auth.users")).rows.length, 2);
    assert.equal(
      (
        await db.query<{ table_name: string | null }>(
          "select to_regclass('public.account_contacts')::text as table_name",
        )
      ).rows[0].table_name,
      null,
    );
  } finally {
    await db.close();
  }
});

test("contact migration enforces identities and privacy at the PostgreSQL boundary", async (t) => {
  const db = new PGlite();
  const alice = randomUUID(),
    bob = randomUUID(),
    legacy = randomUUID();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key,email text,phone text,raw_user_meta_data jsonb default '{}'::jsonb);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema public,auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;`);
    await db.exec(
      readFileSync("supabase/migrations/202611040001_lastbirr.sql", "utf8"),
    );
    await db.query(
      "insert into auth.users(id,email) values($1,'legacy@example.com')",
      [legacy],
    );
    await db.exec(
      readFileSync(
        "supabase/migrations/202611040002_unique_contacts.sql",
        "utf8",
      ),
    );
    const insert = (id: string, email: string, phone?: string) =>
      db.query(
        "insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)",
        [id, email, JSON.stringify({ name: "Test Person", phone })],
      );
    const asUser = async (id: string) => {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id,
      ]);
      await db.exec("set role authenticated");
    };
    await t.test(
      "legacy account is preserved without an invented phone",
      async () => {
        const r = await db.query<{ phone: string | null }>(
          "select phone from public.account_contacts where user_id=$1",
          [legacy],
        );
        assert.equal(r.rows[0].phone, null);
      },
    );
    await t.test(
      "SQL and application agree on accepted phone formats",
      async () => {
        for (const input of [
          "0912345678",
          "+251912345678",
          "00251 912-345-678",
          "251912345678",
          "0712345678",
          "0700123456",
          "0801234567",
          "0811234567",
          "0991234567",
          "",
          "091234567",
          "09123456789",
          "+2510912345678",
          "+254712345678",
          "0111234567",
          "0700000000",
          "0751234567",
          "0821234567",
          "912345678",
          "09abc45678",
          "+251912345678 ext 3",
        ]) {
          const result = await db.query<{ phone: string | null }>(
            "select public.normalize_et_phone($1) as phone",
            [input],
          );
          assert.equal(
            result.rows[0].phone,
            normalizeEthiopianPhone(input),
            input,
          );
        }
      },
    );
    await t.test(
      "signup captures normalized email and phone atomically",
      async () => {
        await insert(alice, "Alice@Example.com", "09 1234-5678");
        await insert(bob, "bob@example.com", "0712345678");
        const r = await db.query<{ email: string; phone: string }>(
          "select email,phone from public.account_contacts where user_id=$1",
          [alice],
        );
        assert.deepEqual(r.rows[0], {
          email: "alice@example.com",
          phone: "+251912345678",
        });
      },
    );
    await t.test(
      "duplicate email, equivalent phone and missing phone roll back the Auth user",
      async () => {
        for (const [email, phone] of [
          ["ALICE@example.com", "0912345679"],
          ["other@example.com", "+251912345678"],
          ["no-phone@example.com", undefined],
          ["invalid@example.com", "0111234567"],
        ]) {
          const id = randomUUID();
          await assert.rejects(insert(id, email!, phone));
          assert.equal(
            (await db.query("select id from auth.users where id=$1", [id])).rows
              .length,
            0,
          );
        }
      },
    );
    await t.test(
      "editing metadata cannot replace the protected contact",
      async () => {
        await db.query(
          "update auth.users set raw_user_meta_data=$1 where id=$2",
          [JSON.stringify({ phone: "0712345678" }), alice],
        );
        const r = await db.query<{ phone: string }>(
          "select phone from public.account_contacts where user_id=$1",
          [alice],
        );
        assert.equal(r.rows[0].phone, "+251912345678");
      },
    );
    await t.test(
      "Auth email changes preserve uniqueness and rollback on conflict",
      async () => {
        await assert.rejects(
          db.query(
            "update auth.users set email='ALICE@example.com' where id=$1",
            [bob],
          ),
        );
        assert.equal(
          (
            await db.query<{ email: string }>(
              "select email from auth.users where id=$1",
              [bob],
            )
          ).rows[0].email,
          "bob@example.com",
        );
        await db.query(
          "update auth.users set email='alice-new@example.com' where id=$1",
          [alice],
        );
        assert.equal(
          (
            await db.query<{ email: string }>(
              "select email from public.account_contacts where user_id=$1",
              [alice],
            )
          ).rows[0].email,
          "alice-new@example.com",
        );
      },
    );
    await t.test(
      "RLS exposes only the caller contact and prohibits direct writes",
      async () => {
        await asUser(alice);
        const r = await db.query<{ user_id: string }>(
          "select user_id from public.account_contacts",
        );
        assert.deepEqual(
          r.rows.map((x) => x.user_id),
          [alice],
        );
        await assert.rejects(
          db.exec("update public.account_contacts set phone='+251911111111'"),
        );
        await assert.rejects(db.exec("delete from public.account_contacts"));
        await assert.rejects(
          db.query(
            "insert into public.account_contacts(user_id,email) values($1,'x@example.com')",
            [randomUUID()],
          ),
        );
      },
    );
    await t.test(
      "phone edits cannot claim another account's number",
      async () => {
        await assert.rejects(
          db.query("select public.update_contact_phone($1)", ["0712345678"]),
          /unique/i,
        );
        assert.equal(
          (
            await db.query<{ phone: string }>(
              "select phone from public.account_contacts",
            )
          ).rows[0].phone,
          "+251912345678",
        );
        await db.query("select public.update_contact_phone($1)", [
          "0912345679",
        ]);
        assert.equal(
          (
            await db.query<{ phone: string }>(
              "select phone from public.account_contacts",
            )
          ).rows[0].phone,
          "+251912345679",
        );
        await assert.rejects(
          db.query("select public.update_contact_phone($1)", ["0111234567"]),
        );
        await assert.rejects(
          db.query("select public.update_contact_phone($1)", [null]),
        );
      },
    );
    await t.test(
      "legacy users can add a phone through their own authenticated RPC",
      async () => {
        await asUser(legacy);
        await db.query("select public.update_contact_phone($1)", [
          "0912345680",
        ]);
        assert.equal(
          (
            await db.query<{ phone: string }>(
              "select phone from public.account_contacts",
            )
          ).rows[0].phone,
          "+251912345680",
        );
      },
    );
    await t.test(
      "anonymous callers cannot read or change contact records",
      async () => {
        await db.exec("reset role; set role anon");
        await assert.rejects(db.exec("select * from public.account_contacts"));
        await assert.rejects(
          db.exec("select public.update_contact_phone('0912345671')"),
        );
        await db.exec("reset role");
        await db.query("select set_config('request.jwt.claim.sub','',false)");
        await db.exec("set role authenticated");
        await assert.rejects(
          db.exec("select public.update_contact_phone('0912345671')"),
          /unauthorized/,
        );
      },
    );
    await t.test(
      "financial text validation cannot be bypassed through RPC",
      async () => {
        await asUser(alice);
        await assert.rejects(
          db.query(
            "select public.onboard($1,150000,$2,10000,'custom',40000,'Rent','en')",
            ["<script>", addDays(todayInAddis(), 10)],
          ),
        );
        await db.query(
          "select public.onboard('Hana Bekele',150000,$1,10000,'custom',40000,'Rent','en')",
          [addDays(todayInAddis(), 10)],
        );
        await assert.rejects(
          db.query("select public.mutate_finances('profile',$1)", [
            JSON.stringify({
              name: "Hana <script>",
              locale: "en",
              theme: "light",
            }),
          ]),
        );
        await assert.rejects(
          db.query("select public.mutate_finances('transaction',$1)", [
            JSON.stringify({
              id: randomUUID(),
              kind: "expense",
              amount: 3500,
              category: "food",
              note: "<script>",
              occurred_on: todayInAddis(),
            }),
          ]),
        );
        assert.equal(
          (await db.query("select * from public.transactions")).rows.length,
          0,
        );
      },
    );
  } finally {
    await db.close();
  }
});
