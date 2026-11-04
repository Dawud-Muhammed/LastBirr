import { getTranslations } from "next-intl/server";
import { getFinanceData } from "@/lib/data";
import { MoneyPlan } from "@/features/finance/money-plan";
export default async function Page() {
  return <MoneyPlan data={await getFinanceData()} />;
}

export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t("plan") };
}
