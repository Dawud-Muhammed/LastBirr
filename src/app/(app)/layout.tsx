import { getFinanceData } from "@/lib/data";
import { AppShell } from "@/components/app-shell";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const data = await getFinanceData();
  return <AppShell name={data.profile.name}>{children}</AppShell>;
}
