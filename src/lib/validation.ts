import { z } from "zod";
import { parseMoney, validDate, todayInAddis } from "./finance";
import { expenseCategories, incomeCategories } from "./types";
import { nameSchema, phoneSchema } from "./identity";
const safeText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "tooLong")
    .refine((v) => !/[\u0000-\u001f\u007f<>]/u.test(v), "invalidText");
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
    note: safeText(240),
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
export const onboardingSchema = planSchema
  .extend({
    name: nameSchema,
    balance: moneySchema,
    commitment: moneySchema,
    commitmentTitle: safeText(100),
  })
  .refine(
    (v) => {
      try {
        return parseMoney(v.commitment) === 0 || v.commitmentTitle.length >= 2;
      } catch {
        return true;
      }
    },
    { message: "commitmentNameRequired", path: ["commitmentTitle"] },
  );
export const commitmentSchema = z.object({
  id: z.uuid(),
  title: safeText(100).refine((v) => v.length >= 2, "required"),
  amount: positiveMoney,
  due_on: z.union([z.literal(""), dateSchema]),
});
export const profileSchema = z.object({
  name: nameSchema,
  locale: z.enum(["en", "am"]),
  theme: z.enum(["system", "light", "dark"]),
});
export const contactSchema = z.object({ phone: phoneSchema });
export function transactionSchemaForWallet(openedOn: string) {
  return transactionSchema.refine((v) => v.occurred_on >= openedOn, {
    message: "transactionDateRange",
    path: ["occurred_on"],
  });
}
