import Link from "next/link";
import { getTranslations } from "next-intl/server";
export default async function NotFound() {
  const t = await getTranslations();
  return (
    <main className="error-page">
      <span className="eyebrow">404</span>
      <h1>{t("notFound")}</h1>
      <Link className="button button-primary" href="/">
        {t("backHome")}
      </Link>
    </main>
  );
}
