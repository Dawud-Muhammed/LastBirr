import { getFinanceData, requireUser } from "@/lib/data";
import { Settings } from "@/features/settings";
export default async function Page() {
  const data = await getFinanceData();
  const { user } = await requireUser();
  return <Settings profile={data.profile} email={user.email || ""} />;
}
