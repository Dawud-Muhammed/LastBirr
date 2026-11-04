import { z } from "zod";

// Ethiopian mobile allocations, checked against Google's libphonenumber ET
// metadata on 2026-11-04. Keep this pattern in sync with the SQL normalizer.
const MOBILE =
  /^(?:700[1-9]\d{5}|(?:7(?:0[1-9]|1[0-8]|2[1-35-79]|3\d|77|86|99)|(?:8[01]|9\d)\d)\d{6})$/;
export function normalizeEthiopianPhone(input: string): string | null {
  if (input.length > 30 || !/^[+0-9 -]+$/.test(input.trim())) return null;
  const compact = input.trim().replace(/[ -]/g, "");
  const national = compact.startsWith("+251")
    ? compact.slice(4)
    : compact.startsWith("00251")
      ? compact.slice(5)
      : compact.startsWith("251")
        ? compact.slice(3)
        : compact.startsWith("0")
          ? compact.slice(1)
          : "";
  return MOBILE.test(national) ? `+251${national}` : null;
}
export const phoneSchema = z
  .string()
  .trim()
  .min(1, "required")
  .max(30, "invalidPhone")
  .refine((v) => normalizeEthiopianPhone(v) !== null, "invalidPhone");
export const nameSchema = z
  .string()
  .trim()
  .min(2, "nameTooShort")
  .max(80, "tooLong")
  .regex(/^[\p{L}\p{M}][\p{L}\p{M} .’'\-]*$/u, "invalidName");
export const emailSchema = z
  .string()
  .trim()
  .min(1, "required")
  .max(254, "invalidEmail")
  .pipe(z.email("invalidEmail"));
export const passwordSchema = z
  .string()
  .min(8, "shortPassword")
  .max(128, "longPassword")
  .refine(
    (v) => v.trim().length > 0 && !/[\u0000-\u001f\u007f]/u.test(v),
    "invalidPassword",
  );
export type AuthMode = "login" | "register" | "forgot" | "reset";
export function authSchema(mode: AuthMode) {
  return z
    .object({
      name: mode === "register" ? nameSchema : z.string(),
      phone: mode === "register" ? phoneSchema : z.string(),
      email: mode === "reset" ? z.string() : emailSchema,
      // Existing accounts may have an older password; enforce the new minimum
      // when creating/changing a password, without locking those users out.
      password:
        mode === "forgot"
          ? z.string()
          : mode === "login"
            ? z.string().min(1, "required").max(128, "longPassword")
            : passwordSchema,
      confirmPassword:
        mode === "register" || mode === "reset"
          ? z.string().min(1, "required").max(128, "longPassword")
          : z.string(),
    })
    .refine(
      (v) =>
        (mode !== "register" && mode !== "reset") ||
        v.password === v.confirmPassword,
      { message: "passwordMismatch", path: ["confirmPassword"] },
    );
}
export const signupSchema = authSchema("register");
export function authErrorKey(
  error: { code?: string; status?: number },
  mode: AuthMode,
): string {
  if (
    error.status === 429 ||
    ["over_request_rate_limit", "over_email_send_rate_limit"].includes(
      error.code || "",
    )
  )
    return "authRateLimited";
  if (["user_already_exists", "email_exists"].includes(error.code || ""))
    return "emailTaken";
  if (error.code === "weak_password") return "weakPassword";
  // Auth intentionally does not disclose the contents of a failing database
  // trigger. Do not turn this into a public phone/email availability endpoint.
  if (error.code === "unexpected_failure" && mode === "register")
    return "signupContactFailed";
  return mode === "login" ? "authFailed" : "authRequestFailed";
}
