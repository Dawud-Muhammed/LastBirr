import { getFinanceData } from "@/lib/data";
import { Insights } from "@/features/finance/insights";
export default async function Page() {
  return <Insights data={await getFinanceData()} />;
}
