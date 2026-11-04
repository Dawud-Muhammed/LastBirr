import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { FinanceData } from "./types";
export const requireUser = cache(async () => {
  const db = await createClient();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user) redirect("/login");
  return { db, user };
});
export const getFinanceData = cache(async (): Promise<FinanceData> => {
  const { db } = await requireUser();
  const { data, error } = await db.rpc("read_finances");
  if (error || !data) throw new Error("databaseUnavailable");
  const result = data as FinanceData;
  if (!result.profile) redirect("/onboarding");
  if (!result.wallet || !result.plan) throw new Error("databaseUnavailable");
  return result;
});
