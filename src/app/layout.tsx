import type { Metadata } from "next";
import { getLocale, getMessages } from "next-intl/server";
import { Providers } from "@/components/providers";
import "./globals.css";
import "@fontsource/noto-sans-ethiopic/400.css";
import "@fontsource/noto-sans-ethiopic/600.css";

export const metadata: Metadata = {
  title: {
    default: "LastBirr — Expense tracker & daily budget",
    template: "%s · LastBirr",
  },
  description:
    "Track income and expenses in Ethiopian birr, plan for bills and savings, and see what is left to spend today. Available in English and Amharic.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  return (
    <html lang={locale} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        <Providers locale={locale} messages={await getMessages()}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
