import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
export default getRequestConfig(async () => {
  const locale =
    (await cookies()).get("NEXT_LOCALE")?.value === "am" ? "am" : "en";
  return {
    locale,
    timeZone: "Africa/Addis_Ababa",
    messages: (await import(`./${locale}.json`)).default,
  };
});
