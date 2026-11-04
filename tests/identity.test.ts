import test from "node:test";
import assert from "node:assert/strict";
import {
  authSchema,
  signupSchema,
  normalizeEthiopianPhone,
  passwordSchema,
  authErrorKey,
} from "../src/lib/identity";
import {
  onboardingSchema,
  transactionSchemaForWallet,
  profileSchema,
  commitmentSchema,
} from "../src/lib/validation";
import { todayInAddis, addDays } from "../src/lib/finance";

export const phoneCases: [string, string | null][] = [
  ["0912345678", "+251912345678"],
  ["+251912345678", "+251912345678"],
  [" 09 1234-5678 ", "+251912345678"],
  ["00251 912 345 678", "+251912345678"],
  ["251912345678", "+251912345678"],
  ["0712345678", "+251712345678"],
  ["+251700123456", "+251700123456"],
  ["0801234567", "+251801234567"],
  ["0811234567", "+251811234567"],
  ["0991234567", "+251991234567"],
  ["", null],
  ["091234567", null],
  ["09123456789", null],
  ["+2510912345678", null],
  ["+254712345678", null],
  ["0111234567", null],
  ["0612345678", null],
  ["912345678", null],
  ["0700000000", null],
  ["0751234567", null],
  ["0821234567", null],
  ["09abc45678", null],
  ["+251912345678 ext 3", null],
  ["09/12345678", null],
  ["+251912345678\n1", null],
];
const validSignup = {
  name: "Dawit Bekele",
  email: "person@example.com",
  phone: "0912345678",
  password: "a secure phrase",
  confirmPassword: "a secure phrase",
};
test("Ethiopian mobile formats normalize to one canonical identity", () => {
  for (const [input, expected] of phoneCases)
    assert.equal(normalizeEthiopianPhone(input), expected, input);
});
test("signup validates every field and requires matching passwords", () => {
  assert.equal(signupSchema.safeParse(validSignup).success, true);
  for (const [field, value] of Object.entries({
    name: "<script>",
    email: "invalid",
    phone: "0111234567",
    password: "1234567",
    confirmPassword: "different",
  })) {
    const result = signupSchema.safeParse({ ...validSignup, [field]: value });
    assert.equal(result.success, false, field);
    if (!result.success)
      assert.ok(
        result.error.issues.some((i) => i.path.includes(field)),
        field,
      );
  }
  assert.equal(
    signupSchema.safeParse({ ...validSignup, name: "ሀና በቀለ" }).success,
    true,
  );
  assert.equal(
    signupSchema.safeParse({ ...validSignup, name: "Dawit 123" }).success,
    false,
  );
  assert.equal(
    signupSchema.safeParse({ ...validSignup, phone: undefined }).success,
    false,
  );
});
test("password boundaries and legacy sign in", () => {
  for (const value of ["1234567", "        ", "abc\n123456", "a".repeat(129)])
    assert.equal(passwordSchema.safeParse(value).success, false);
  for (const value of ["12345678", "long memorable phrase", "a".repeat(128)])
    assert.equal(passwordSchema.safeParse(value).success, true);
  assert.equal(
    authSchema("reset").safeParse({ ...validSignup, confirmPassword: "" })
      .success,
    false,
  );
  assert.equal(
    authSchema("login").safeParse({ ...validSignup, password: "oldsix" })
      .success,
    true,
  );
  assert.equal(
    authSchema("login").safeParse({ ...validSignup, password: "" }).success,
    false,
  );
});
test("financial form text, names and wallet date boundaries", () => {
  const today = todayInAddis();
  const values = {
    name: "Hana",
    balance: "1500",
    end_on: addDays(today, 10),
    savings: "100",
    horizon_type: "allowance",
    commitment: "400",
    commitmentTitle: "",
  };
  assert.equal(onboardingSchema.safeParse(values).success, false);
  assert.equal(
    onboardingSchema.safeParse({ ...values, commitment: "0" }).success,
    true,
  );
  assert.equal(
    onboardingSchema.safeParse({ ...values, commitmentTitle: "Rent" }).success,
    true,
  );
  assert.equal(
    profileSchema.safeParse({ name: " ", locale: "en", theme: "dark" }).success,
    false,
  );
  assert.equal(
    profileSchema.safeParse({ name: "Hana", locale: "xx", theme: "dark" })
      .success,
    false,
  );
  const tx = {
    id: "11111111-1111-4111-8111-111111111111",
    kind: "expense",
    amount: "35",
    category: "food",
    note: "Lunch",
    occurred_on: today,
  };
  assert.equal(transactionSchemaForWallet(today).safeParse(tx).success, true);
  assert.equal(
    transactionSchemaForWallet(today).safeParse({
      ...tx,
      occurred_on: addDays(today, -1),
    }).success,
    false,
  );
  assert.equal(
    transactionSchemaForWallet(today).safeParse({ ...tx, note: "<script>" })
      .success,
    false,
  );
  assert.equal(
    commitmentSchema.safeParse({
      id: tx.id,
      title: "\u0000Rent",
      amount: "100",
      due_on: "",
    }).success,
    false,
  );
});
test("auth failures provide safe actionable messages", () => {
  assert.equal(authErrorKey({ status: 429 }, "register"), "authRateLimited");
  assert.equal(
    authErrorKey({ code: "user_already_exists" }, "register"),
    "emailTaken",
  );
  assert.equal(
    authErrorKey({ code: "unexpected_failure" }, "register"),
    "signupContactFailed",
  );
  assert.equal(
    authErrorKey({ code: "invalid_credentials" }, "login"),
    "authFailed",
  );
});
