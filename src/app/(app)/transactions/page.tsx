import { getTranslations } from "next-intl/server";
import { getFinanceData } from "@/lib/data";
import { Transactions } from "@/features/finance/transactions";
export default async function Page() {
  return <Transactions data={await getFinanceData()} />;
}

export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t("transactions") };
}
