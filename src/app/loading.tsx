import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
export default async function Loading() {
  const t = await getTranslations();
  return (
    <div className="loading-page" role="status">
      <span className="sr-only">{t("loading")}</span>
      <Skeleton className="h-10 w-64 mb-6" />
      <Skeleton className="h-60 w-full mb-6" />
      <div className="grid grid-cols-2 gap-6">
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
      </div>
    </div>
  );
}
