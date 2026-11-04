import { getFinanceData } from "@/lib/data";
import { Transactions } from "@/features/finance/transactions";
export default async function Page() {
  return <Transactions data={await getFinanceData()} />;
}
