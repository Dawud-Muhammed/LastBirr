"use client";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  useTransition,
  type ReactElement,
  type HTMLAttributes,
} from "react";
import { Input } from "@/components/ui/input";
import { ArrowUpRight, Sprout, SunMoon } from "lucide-react";
import { setLocale, setAppearance } from "@/features/finance/actions";
export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="LastBirr">
      <span className="brand-mark">
        <Sprout size={22} strokeWidth={1.8} />
      </span>
      lastbirr<span className="brand-dot">.</span>
    </Link>
  );
}
export function Preferences() {
  const locale = useLocale();
  const t = useTranslations();
  const { setTheme } = useTheme();
  const [pending, start] = useTransition();
  return (
    <div className="preferences">
      <button
        className="language-button"
        disabled={pending}
        aria-label={t("language")}
        onClick={() => start(() => setLocale(locale === "en" ? "am" : "en"))}
      >
        {locale === "en" ? "አማርኛ" : "English"}
      </button>
      <label className="theme-control">
        <SunMoon size={18} />
        <span className="sr-only">{t("theme")}</span>
        <select
          aria-label={t("theme")}
          defaultValue=""
          onChange={(e) => {
            setTheme(e.target.value);
            start(() => setAppearance(e.target.value));
          }}
        >
          <option value="" disabled>
            {t("theme")}
          </option>
          {["light", "dark", "system"].map((v) => (
            <option key={v} value={v}>
              {t(v)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
export function PageHeading({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  const t = useTranslations();
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{t("tagline")}</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}
export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Sprout size={27} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function TextLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link className="text-link" href={href}>
      {children}
      <ArrowUpRight size={15} />
    </Link>
  );
}
export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const t = useTranslations();
  const id = useId();
  const describe =
    [hint ? `${id}-hint` : "", error ? `${id}-error` : ""]
      .filter(Boolean)
      .join(" ") || undefined;
  // Attach accessible validation to both direct controls and password wrappers.
  function annotate(nodes: React.ReactNode): React.ReactNode {
    return Children.map(nodes, (node) => {
      if (!isValidElement(node)) return node;
      const element = node as ReactElement<HTMLAttributes<HTMLElement>>;
      if (
        element.type === Input ||
        ["input", "select", "textarea"].includes(String(element.type))
      ) {
        return cloneElement(element, {
          id,
          "aria-invalid": !!error,
          "aria-describedby": describe,
        });
      }
      if (element.type === "div")
        return cloneElement(element, {}, annotate(element.props.children));
      return node;
    });
  }
  return (
    <div className={`field${error ? " field-invalid" : ""}`}>
      <label htmlFor={id}>{label}</label>
      {annotate(children)}
      {hint && (
        <small id={`${id}-hint`} className="muted">
          {hint}
        </small>
      )}
      {error && (
        <small id={`${id}-error`} className="field-error" role="alert">
          {t.has(error) ? t(error) : t("invalidForm")}
        </small>
      )}
    </div>
  );
}
export function DateText({ value }: { value: string }) {
  const locale = useLocale();
  return (
    <time dateTime={value}>
      {new Intl.DateTimeFormat(locale === "am" ? "am-ET" : "en-ET", {
        dateStyle: "medium",
        timeZone: "Africa/Addis_Ababa",
      }).format(new Date(`${value}T12:00:00Z`))}
    </time>
  );
}
