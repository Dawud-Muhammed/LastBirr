import { getFinanceData, requireUser } from "@/lib/data";
import { Settings } from "@/features/settings";
export default async function Page() {
  const data = await getFinanceData();
  const { user, db } = await requireUser();
  const contact = await db
    .from("account_contacts")
    .select("phone")
    .maybeSingle();
  return (
    <Settings
      profile={data.profile}
      email={user.email || ""}
      phone={contact.data?.phone || ""}
      contactAvailable={!contact.error}
    />
  );
}
