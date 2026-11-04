import { getTranslations } from "next-intl/server";
import { AuthForm } from "@/features/auth/auth-form";
import { requireUser } from "@/lib/data";
export default async function Page() {
  await requireUser();
  return <AuthForm mode="reset" />;
}

export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t("reset") };
}
