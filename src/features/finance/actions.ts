"use server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { parseMoney } from "@/lib/finance";
import {
  commitmentSchema,
  onboardingSchema,
  planSchema,
  profileSchema,
  transactionSchema,
  contactSchema,
} from "@/lib/validation";
import { normalizeEthiopianPhone } from "@/lib/identity";
export type ActionResult = { ok: boolean; error?: string };
export async function mutate(
  operation: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const db = await createClient();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) return { ok: false, error: "sessionExpired" };
    if (operation === "contact") {
      const v = contactSchema.parse(input);
      const { error } = await db.rpc("update_contact_phone", {
        p_phone: normalizeEthiopianPhone(v.phone),
      });
      if (error)
        return {
          ok: false,
          error: error.code === "23505" ? "phoneTaken" : "saveFailed",
        };
      revalidatePath("/settings");
      return { ok: true };
    }
    let payload: Record<string, unknown>;
    if (operation === "transaction") {
      const v = transactionSchema.parse(input);
      payload = { ...v, amount: parseMoney(v.amount) };
    } else if (operation === "commitment") {
      const v = commitmentSchema.parse(input);
      payload = { ...v, amount: parseMoney(v.amount) };
    } else if (operation === "plan" || operation === "newPeriod") {
      const v = planSchema.parse(input);
      payload = { ...v, savings: parseMoney(v.savings) };
    } else if (operation === "profile") payload = profileSchema.parse(input);
    else if (
      ["deleteTransaction", "deleteCommitment", "settle"].includes(operation)
    )
      payload = z.object({ id: z.uuid() }).parse(input);
    else return { ok: false, error: "invalidForm" };
    const { error } = await db.rpc("mutate_finances", {
      p_operation: operation,
      p_data: payload,
    });
    if (error)
      return {
        ok: false,
        error: error.message.includes("invalid_date")
          ? "transactionDateRange"
          : error.message.includes("protected_transaction") ||
              error.message.includes("paid_commitment")
            ? "settlementLocked"
            : "saveFailed",
      };
    if (operation === "profile")
      (await cookies()).set("NEXT_LOCALE", String(payload.locale), {
        path: "/",
        sameSite: "lax",
        maxAge: 31536000,
      });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { ok: false, error: "invalidForm" };
  }
}
export async function onboard(input: unknown): Promise<ActionResult> {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalidForm" };
  try {
    const db = await createClient();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) return { ok: false, error: "sessionExpired" };
    const v = parsed.data;
    const locale =
      (await cookies()).get("NEXT_LOCALE")?.value === "am" ? "am" : "en";
    const { error } = await db.rpc("onboard", {
      p_name: v.name,
      p_balance: parseMoney(v.balance),
      p_end: v.end_on,
      p_savings: parseMoney(v.savings),
      p_horizon: v.horizon_type,
      p_commitment: parseMoney(v.commitment),
      p_title:
        v.commitmentTitle ||
        (locale === "am" ? "አስፈላጊ ክፍያዎች" : "Essential commitments"),
      p_locale: locale,
    });
    if (error) return { ok: false, error: "databaseUnavailable" };
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { ok: false, error: "saveFailed" };
  }
}
export async function setLocale(locale: string) {
  if (locale !== "en" && locale !== "am") return;
  await savePreference({ locale });
  (await cookies()).set("NEXT_LOCALE", locale, {
    path: "/",
    sameSite: "lax",
    maxAge: 31536000,
  });
  revalidatePath("/", "layout");
}
async function savePreference(preference: { locale?: string; theme?: string }) {
  try {
    const db = await createClient();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (user)
      await db.rpc("mutate_finances", {
        p_operation: "preferences",
        p_data: preference,
      });
  } catch {
    /* Browser/cookie preferences remain available before database setup. */
  }
}
export async function setAppearance(theme: string) {
  if (!["light", "dark", "system"].includes(theme)) return;
  await savePreference({ theme });
}

export async function restorePreferences(): Promise<string | null> {
  try {
    const db = await createClient();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) return null;
    const { data } = await db
      .from("profiles")
      .select("locale,theme")
      .maybeSingle();
    if (!data) return null;
    if (data.locale === "en" || data.locale === "am") {
      (await cookies()).set("NEXT_LOCALE", data.locale, {
        path: "/",
        sameSite: "lax",
        maxAge: 31536000,
      });
    }
    return ["light", "dark", "system"].includes(data.theme) ? data.theme : null;
  } catch {
    return null;
  }
}
