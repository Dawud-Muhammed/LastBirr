"use server";
import { createClient } from "@/lib/supabase/server";
import {
  signupSchema,
  normalizeEthiopianPhone,
  authErrorKey,
} from "@/lib/identity";
export async function signUp(
  input: unknown,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalidForm" };
  const v = parsed.data;
  try {
    const db = await createClient();
    const { data, error } = await db.auth.signUp({
      email: v.email.trim().toLowerCase(),
      password: v.password,
      options: {
        data: { name: v.name, phone: normalizeEthiopianPhone(v.phone) },
      },
    });
    if (error) return { ok: false, error: authErrorKey(error, "register") };
    // No admin auto-confirm workaround: the actual Supabase setting must agree.
    if (!data.session) return { ok: false, error: "signupConfiguration" };
    return { ok: true };
  } catch {
    return { ok: false, error: "authRequestFailed" };
  }
}
