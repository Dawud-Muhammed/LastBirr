"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  ArrowLeftRight,
  ChartNoAxesCombined,
  SlidersHorizontal,
  Wallet,
  LogOut,
  Sprout,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/browser";
import { todayInAddis } from "@/lib/finance";
import { Brand, Preferences } from "./common";
const links = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { key: "transactions", href: "/transactions", icon: ArrowLeftRight },
  { key: "plan", href: "/plan", icon: Wallet },
  { key: "insights", href: "/insights", icon: ChartNoAxesCombined },
  { key: "settings", href: "/settings", icon: SlidersHorizontal },
];
export function SignOut() {
  const t = useTranslations();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="signout-button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const { error } = await createClient().auth.signOut();
          if (error) throw error;
          router.replace("/login");
          router.refresh();
        } catch {
          toast.error(t("signoutFailed"));
          setBusy(false);
        }
      }}
    >
      <LogOut size={17} />
      {t("logout")}
    </button>
  );
}
export function AppShell({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) {
  const t = useTranslations();
  const path = usePathname();
  const router = useRouter();
  useEffect(() => {
    let day = todayInAddis();
    const check = () => {
      const current = todayInAddis();
      if (current !== day) {
        day = current;
        router.refresh();
      }
    };
    const timer = window.setInterval(check, 15000);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, [router]);
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        {t("skipContent")}
      </a>
      <aside className="sidebar">
        <Brand />
        <div className="sidebar-label">{t("tagline")}</div>
        <nav>
          {links.map(({ key, href, icon: Icon }) => (
            <Link
              key={key}
              href={href}
              className={path === href ? "nav-link active" : "nav-link"}
              aria-current={path === href ? "page" : undefined}
            >
              <Icon size={19} strokeWidth={1.7} />
              {t(key)}
              {path === href && <span className="nav-dot" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <Sprout size={25} />
            <p>{t("privacyShort")}</p>
          </div>
          <SignOut />
          <div className="user-chip">
            <span className="avatar">{name.slice(0, 1).toUpperCase()}</span>
            <div>
              <strong>{name}</strong>
              <small>LastBirr</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="app-main">
        <header className="app-topbar">
          <span className="breadcrumb">
            LastBirr <span>/</span>{" "}
            {t(links.find((l) => l.href === path)?.key || "dashboard")}
          </span>
          <div className="mobile-brand">
            <Brand />
          </div>
          <Preferences />
        </header>
        <main className="app-content" id="main-content">
          {children}
        </main>
        <footer className="app-footer">
          <Sprout size={14} />
          {t("tagline")}
        </footer>
      </div>
      <nav className="bottom-nav">
        {links.map(({ key, href, icon: Icon }) => (
          <Link
            key={key}
            href={href}
            className={path === href ? "active" : ""}
            aria-current={path === href ? "page" : undefined}
          >
            <Icon size={20} />
            <span>{t(key)}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
