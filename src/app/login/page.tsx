import { AuthForm } from "@/features/auth/auth-form";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return <AuthForm mode="login" invalidLink={!!params.error} />;
}
