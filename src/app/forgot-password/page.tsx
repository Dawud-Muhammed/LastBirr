import { getTranslations } from "next-intl/server";
import { AuthForm } from "@/features/auth/auth-form";
export default function Page() {
  return <AuthForm mode="forgot" />;
}

export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t("forgot") };
}
