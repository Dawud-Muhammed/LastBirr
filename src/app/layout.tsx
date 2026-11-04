import type { Metadata } from "next";
import { getLocale, getMessages } from "next-intl/server";
import { Providers } from "@/components/providers";
import "./globals.css";
import "@fontsource/noto-sans-ethiopic/400.css";
import "@fontsource/noto-sans-ethiopic/600.css";

export const metadata: Metadata = {
  title: {
    default: "LastBirr — Make every birr last.",
    template: "%s · LastBirr",
  },
  description:
    "A calmer way to manage student money. Plan essentials and know what you can spend today.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <Providers locale={locale} messages={await getMessages()}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
