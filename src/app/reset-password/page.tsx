import { AuthForm } from "@/features/auth/auth-form";
import { requireUser } from "@/lib/data";
export default async function Page() {
  await requireUser();
  return <AuthForm mode="reset" />;
}
