import { z } from "zod";
import { parseMoney, validDate, todayInAddis } from "./finance";
import { expenseCategories, incomeCategories } from "./types";
export const moneySchema = z.string().refine((v) => {
  try {
    parseMoney(v);
    return true;
  } catch {
    return false;
  }
}, "invalidMoney");
export const positiveMoney = moneySchema.refine((v) => {
  try {
    return parseMoney(v) > 0;
  } catch {
    return false;
  }
}, "positiveMoney");
export const dateSchema = z.string().refine(validDate, "invalidDate");
export const transactionSchema = z
  .object({
    id: z.uuid(),
    kind: z.enum(["income", "expense"]),
    amount: positiveMoney,
    category: z.string(),
    note: z.string().trim().max(240, "tooLong"),
    occurred_on: dateSchema.refine(
      (v) => v <= todayInAddis(),
      "futureTransaction",
    ),
  })
  .refine(
    (v) =>
      (v.kind === "expense"
        ? [...expenseCategories]
        : [...incomeCategories]
      ).includes(v.category as never),
    { message: "invalidCategory", path: ["category"] },
  );
export const planSchema = z.object({
  end_on: dateSchema.refine((v) => v >= todayInAddis(), "futurePlan"),
  savings: moneySchema,
  horizon_type: z.enum(["allowance", "custom"]),
});
export const onboardingSchema = planSchema.extend({
  name: z.string().trim().min(1, "required").max(80, "tooLong"),
  balance: moneySchema,
  commitment: moneySchema,
  commitmentTitle: z.string().trim().max(100, "tooLong"),
});
export const commitmentSchema = z.object({
  id: z.uuid(),
  title: z.string().trim().min(1, "required").max(100, "tooLong"),
  amount: positiveMoney,
  due_on: z.union([z.literal(""), dateSchema]),
});
export const profileSchema = z.object({
  name: z.string().trim().min(1, "required").max(80, "tooLong"),
  locale: z.enum(["en", "am"]),
  theme: z.enum(["system", "light", "dark"]),
});
