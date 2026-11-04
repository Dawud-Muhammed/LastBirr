import { getTranslations } from "next-intl/server";
import { getFinanceData } from "@/lib/data";
import { Dashboard } from "@/features/finance/dashboard";
export default async function Page() {
  return <Dashboard data={await getFinanceData()} />;
}

export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t("dashboard") };
}
