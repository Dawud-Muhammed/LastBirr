"use client";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations();
  return (
    <main className="error-page">
      <h1>{t("errorTitle")}</h1>
      <p>{t("databaseUnavailable")}</p>
      <Button onClick={reset}>{t("retry")}</Button>
    </main>
  );
}
