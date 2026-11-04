import type { Commitment, LedgerEntry } from "./finance";
export type { Commitment } from "./finance";
export type Profile = {
  user_id: string;
  name: string;
  locale: "en" | "am";
  theme: "light" | "dark" | "system";
};
export type Wallet = {
  user_id: string;
  opening_balance: number;
  opened_on: string;
};
export type Plan = {
  id: string;
  user_id: string;
  end_on: string;
  start_on: string;
  savings: number;
  horizon_type: "allowance" | "custom";
  active: boolean;
};
export type Transaction = LedgerEntry & {
  id: string;
  user_id: string;
  category: string;
  note: string;
  created_at: string;
};
export type Snapshot = { day: string; allocation: number };
export type FinanceData = {
  profile: Profile;
  wallet: Wallet;
  plan: Plan;
  transactions: Transaction[];
  commitments: Commitment[];
  snapshots: Snapshot[];
  today: string;
};
export const expenseCategories = [
  "food",
  "transport",
  "data",
  "education",
  "housing",
  "health",
  "shopping",
  "entertainment",
  "other",
] as const;
export const incomeCategories = [
  "allowance",
  "work",
  "gift",
  "otherIncome",
] as const;
