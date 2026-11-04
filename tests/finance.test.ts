import test from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  balanceFromLedger,
  calculatePlan,
  daysBetween,
  parseMoney,
  todayInAddis,
  validDate,
  type LedgerEntry,
} from "../src/lib/finance";
import { transactionSchema, onboardingSchema } from "../src/lib/validation";
import en from "../src/i18n/en.json";
import am from "../src/i18n/am.json";
const today = "2026-11-04";
const base = {
  opening: 150000,
  entries: [] as LedgerEntry[],
  commitments: [{ amount: 40000, paid: false }],
  savings: 10000,
  end: "2026-11-14",
  today,
};
const expense: LedgerEntry = {
  amount: 3500,
  kind: "expense",
  occurred_on: today,
};
test("standard guide and protected money", () => {
  const p = calculatePlan(base);
  assert.equal(p.balance, 150000);
  assert.equal(p.essentials, 40000);
  assert.equal(p.spendable, 100000);
  assert.equal(p.dailyGuide, 10000);
  assert.equal(p.remainingToday, 10000);
});
test("expense changes average without resetting today's allocation", () => {
  const p = calculatePlan({ ...base, entries: [expense] });
  assert.equal(p.balance, 146500);
  assert.equal(p.spendable, 96500);
  assert.equal(p.dailyGuide, 9650);
  assert.equal(p.allocation, 10000);
  assert.equal(p.remainingToday, 6500);
});
test("income rebases today's allocation with no expense counted twice", () => {
  const p = calculatePlan({
    ...base,
    entries: [expense, { amount: 10000, kind: "income", occurred_on: today }],
  });
  assert.equal(p.balance, 156500);
  assert.equal(p.allocation, 11000);
  assert.equal(p.remainingToday, 7500);
});
test("essential settlement releases reserve and leaves discretionary money unchanged", () => {
  const p = calculatePlan({
    ...base,
    commitments: [{ amount: 40000, paid: true }],
    entries: [
      {
        amount: 40000,
        kind: "expense",
        occurred_on: today,
        commitment_id: "rent",
      },
    ],
  });
  assert.equal(p.balance, 110000);
  assert.equal(p.essentials, 0);
  assert.equal(p.spendable, 100000);
  assert.equal(p.remainingToday, 10000);
});
test("virtual savings change the plan, never the actual balance", () => {
  const p = calculatePlan({ ...base, savings: 20000 });
  assert.equal(p.balance, 150000);
  assert.equal(p.spendable, 90000);
});
test("commitment changes rebase today's allocation", () => {
  const p = calculatePlan({
    ...base,
    entries: [expense],
    commitments: [{ amount: 50000, paid: false }],
  });
  assert.equal(p.allocation, 9000);
  assert.equal(p.remainingToday, 5500);
});
test("shortage never shows a negative spending allowance", () => {
  const p = calculatePlan({ ...base, opening: 20000 });
  assert.equal(p.spendable, 0);
  assert.equal(p.remainingToday, 0);
  assert.equal(p.shortage, 30000);
  assert.ok(p.warnings.includes("commitmentShortage"));
  assert.ok(p.warnings.includes("savingsRisk"));
});
test("zero days explicitly uses one day", () => {
  const p = calculatePlan({ ...base, end: today });
  assert.equal(p.days, 0);
  assert.equal(p.dailyGuide, 100000);
  assert.ok(p.warnings.includes("endsToday"));
});
test("overdue date does not invent received income", () => {
  const p = calculatePlan({ ...base, end: "2026-11-01" });
  assert.equal(p.days, -3);
  assert.equal(p.balance, 150000);
  assert.equal(p.dailyGuide, 100000);
  assert.ok(p.warnings.includes("overdue"));
});
test("missing dates use conservative one-day horizon and warning", () => {
  const p = calculatePlan({ ...base, end: null });
  assert.equal(p.days, null);
  assert.ok(p.warnings.includes("missingDate"));
  assert.equal(p.dailyGuide, 100000);
});
test("overspending clamps remaining today and warns", () => {
  const p = calculatePlan({
    ...base,
    entries: [{ ...expense, amount: 12000 }],
  });
  assert.equal(p.remainingToday, 0);
  assert.equal(p.allocation, 10000);
  assert.ok(p.warnings.includes("overspent"));
});
test("new Addis day recalculates from remaining cash", () => {
  const p = calculatePlan({ ...base, entries: [expense], today: "2026-11-05" });
  assert.equal(p.spentToday, 0);
  assert.equal(p.allocation, 10722);
  assert.equal(p.remainingToday, 10722);
});
test("editing and deleting ledger entries correctly recompute balances", () => {
  assert.equal(balanceFromLedger(150000, [expense]), 146500);
  assert.equal(
    balanceFromLedger(150000, [{ ...expense, amount: 5000 }]),
    145000,
  );
  assert.equal(balanceFromLedger(150000, []), 150000);
});
test("changing horizon recalculates daily allocation", () => {
  const p = calculatePlan({ ...base, entries: [expense], end: "2026-11-09" });
  assert.equal(p.allocation, 20000);
  assert.equal(p.remainingToday, 16500);
});
test("Addis boundary is 21:00 UTC", () => {
  assert.equal(todayInAddis(new Date("2026-11-04T20:59:59Z")), "2026-11-04");
  assert.equal(todayInAddis(new Date("2026-11-04T21:00:00Z")), "2026-11-05");
});
test("leap days, month and year boundaries", () => {
  assert.equal(daysBetween("2028-02-28", "2028-03-01"), 2);
  assert.equal(daysBetween("2027-02-28", "2027-03-01"), 1);
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(validDate("2026-02-30"), false);
  assert.equal(validDate("bad"), false);
});
test("money parses exactly and rejects ambiguous or excessive precision", () => {
  assert.equal(parseMoney("0.29"), 29);
  assert.equal(parseMoney("1234.5"), 123450);
  assert.equal(parseMoney("10000000000"), 1000000000000);
  for (const v of ["-1", "1.001", "1e3", "NaN", "1,000", "10000000000.01", ""])
    assert.throws(() => parseMoney(v));
});
test("daily division rounds down to santim", () => {
  const p = calculatePlan({
    ...base,
    opening: 10000,
    savings: 0,
    commitments: [],
    end: "2026-11-07",
  });
  assert.equal(p.dailyGuide, 3333);
  assert.ok(p.dailyGuide * 3 <= 10000);
});
test("many small ledger expenses remain exact", () => {
  assert.equal(
    balanceFromLedger(
      10000,
      Array.from({ length: 100 }, () => ({ ...expense, amount: 29 })),
    ),
    7100,
  );
});
test("zero and negative entries are rejected", () => {
  assert.throws(() => balanceFromLedger(100, [{ ...expense, amount: 0 }]));
  assert.throws(() => balanceFromLedger(100, [{ ...expense, amount: -1 }]));
});
test("backdated edit changes current allocation but not today's spending", () => {
  const p = calculatePlan({
    ...base,
    entries: [{ ...expense, occurred_on: "2026-11-03" }],
  });
  assert.equal(p.spentToday, 0);
  assert.equal(p.remainingToday, 9650);
});
test("UI schema rejects future income, invalid categories, zero amounts", () => {
  const v = {
    id: "11111111-1111-4111-8111-111111111111",
    kind: "income",
    category: "allowance",
    amount: "50",
    occurred_on: todayInAddis(),
    note: "",
  };
  assert.ok(transactionSchema.safeParse(v).success);
  assert.ok(
    !transactionSchema.safeParse({ ...v, occurred_on: "2099-01-01" }).success,
  );
  assert.ok(!transactionSchema.safeParse({ ...v, category: "food" }).success);
  assert.ok(!transactionSchema.safeParse({ ...v, amount: "0" }).success);
});
test("onboarding validates exact amounts and a valid horizon", () => {
  const v = {
    name: "Dawit",
    balance: "1500",
    end_on: addDays(todayInAddis(), 10),
    savings: "100",
    horizon_type: "allowance",
    commitment: "400",
    commitmentTitle: "Essentials",
  };
  assert.ok(onboardingSchema.safeParse(v).success);
  assert.ok(!onboardingSchema.safeParse({ ...v, balance: "1500.001" }).success);
});
test("both languages have exactly the same complete message keys", () => {
  const flatten = (v: Record<string, unknown>, prefix = ""): string[] =>
    Object.entries(v).flatMap(([k, value]) =>
      typeof value === "object" && value
        ? flatten(value as Record<string, unknown>, `${prefix}${k}.`)
        : [`${prefix}${k}`],
    );
  assert.deepEqual(flatten(en).sort(), flatten(am).sort());
});
