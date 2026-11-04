import { getFinanceData } from "@/lib/data";
import { Dashboard } from "@/features/finance/dashboard";
export default async function Page() {
  return <Dashboard data={await getFinanceData()} />;
}
