/** All money is integer santim. Recommendations round down, never over-allocate. */
export const TIME_ZONE = "Africa/Addis_Ababa";
export const MAX_MONEY = 1_000_000_000_000;
export function todayInAddis(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function validDate(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export function daysBetween(start: string, end: string): number {
  if (!validDate(start) || !validDate(end)) throw new Error("invalidDate");
  return Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000);
}
export function addDays(date: string, days: number): string {
  if (!validDate(date)) throw new Error("invalidDate");
  return new Date(Date.parse(date) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}
export function parseMoney(value: string): number {
  if (!/^\d{1,11}(\.\d{1,2})?$/.test(value.trim()))
    throw new Error("invalidMoney");
  const [whole, fraction = ""] = value.trim().split(".");
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(amount) || amount > MAX_MONEY)
    throw new Error("invalidMoney");
  return amount;
}
export function moneyInput(amount: number): string {
  return (amount / 100).toFixed(2);
}
export function formatMoney(amount: number, locale = "en"): string {
  return new Intl.NumberFormat(locale === "am" ? "am-ET" : "en-ET", {
    style: "currency",
    currency: "ETB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}
export type LedgerEntry = {
  amount: number;
  kind: "income" | "expense";
  occurred_on: string;
  commitment_id?: string | null;
};
export type Commitment = {
  id: string;
  amount: number;
  title: string;
  due_on: string | null;
  paid: boolean;
};
export function balanceFromLedger(
  opening: number,
  entries: LedgerEntry[],
): number {
  const total = entries.reduce((balance, entry) => {
    if (!Number.isSafeInteger(entry.amount) || entry.amount <= 0)
      throw new Error("invalidMoney");
    return balance + (entry.kind === "income" ? entry.amount : -entry.amount);
  }, opening);
  if (!Number.isSafeInteger(total)) throw new Error("invalidMoney");
  return total;
}
export function calculatePlan(input: {
  opening: number;
  entries: LedgerEntry[];
  commitments: Pick<Commitment, "amount" | "paid">[];
  savings: number;
  end: string | null;
  today: string;
}) {
  const balance = balanceFromLedger(input.opening, input.entries);
  const essentials = input.commitments
    .filter((c) => !c.paid)
    .reduce((sum, c) => sum + c.amount, 0);
  const spendable = Math.max(0, balance - essentials - input.savings);
  const days = input.end ? daysBetween(input.today, input.end) : null;
  const divisor = Math.max(1, days ?? 1);
  const spentToday = input.entries
    .filter(
      (t) =>
        t.kind === "expense" &&
        !t.commitment_id &&
        t.occurred_on === input.today,
    )
    .reduce((sum, t) => sum + t.amount, 0);
  // Reconstruct today's discretionary pool. Income/plan edits rebase it; today's
  // discretionary expenses are added back exactly once. Settlements are excluded.
  const allocation = Math.floor(
    Math.max(0, balance + spentToday - essentials - input.savings) / divisor,
  );
  const remainingToday = Math.max(
    0,
    Math.min(spendable, allocation - spentToday),
  );
  const dailyGuide = Math.floor(spendable / divisor);
  const warnings: string[] = [];
  if (balance < essentials) warnings.push("commitmentShortage");
  if (balance - essentials < input.savings) warnings.push("savingsRisk");
  if (spentToday > allocation) warnings.push("overspent");
  if (days === null) warnings.push("missingDate");
  else if (days < 0) warnings.push("overdue");
  else if (days === 0) warnings.push("endsToday");
  else if (days <= 3) warnings.push("approaching");
  const recent = input.entries.filter(
    (t) =>
      t.kind === "expense" &&
      !t.commitment_id &&
      daysBetween(t.occurred_on, input.today) >= 0 &&
      daysBetween(t.occurred_on, input.today) < 7,
  );
  const observedDays = recent.length
    ? Math.min(
        7,
        Math.max(
          ...recent.map((t) => daysBetween(t.occurred_on, input.today)),
        ) + 1,
      )
    : 0;
  const recentAverage = observedDays
    ? Math.ceil(recent.reduce((sum, t) => sum + t.amount, 0) / observedDays)
    : 0;
  const runway =
    recentAverage > 0 ? Math.floor(spendable / recentAverage) : null;
  if (days && days > 0 && recentAverage > dailyGuide) warnings.push("pace");
  return {
    balance,
    essentials,
    savings: input.savings,
    spendable,
    days,
    dailyGuide,
    allocation,
    spentToday,
    remainingToday,
    shortage: Math.max(0, essentials + input.savings - balance),
    runway,
    warnings,
  };
}
