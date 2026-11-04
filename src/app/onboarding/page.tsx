import { redirect } from "next/navigation";
import { requireUser } from "@/lib/data";
import { Onboarding } from "@/features/finance/onboarding";
export default async function Page() {
  const { db, user } = await requireUser();
  const { data, error } = await db
    .from("profiles")
    .select("user_id")
    .maybeSingle();
  if (data) redirect("/dashboard");
  if (error) {
    /* Keep the form available; submission reports database setup errors. */
  }
  return (
    <Onboarding
      name={
        typeof user.user_metadata.name === "string"
          ? user.user_metadata.name
          : ""
      }
    />
  );
}
