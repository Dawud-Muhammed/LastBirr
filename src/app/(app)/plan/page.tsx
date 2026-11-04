import { getFinanceData } from "@/lib/data";
import { MoneyPlan } from "@/features/finance/money-plan";
export default async function Page() {
  return <MoneyPlan data={await getFinanceData()} />;
}
