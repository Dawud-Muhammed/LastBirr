"use client";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ShieldCheck, ArrowUpRight } from "lucide-react";
import { profileSchema, contactSchema } from "@/lib/validation";
import type { Profile } from "@/lib/types";
import { Field, PageHeading } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SignOut } from "@/components/app-shell";
import { useMutation } from "./finance/forms";
export function Settings({
  profile,
  email,
  phone,
  contactAvailable,
}: {
  profile: Profile;
  email: string;
  phone: string;
  contactAvailable: boolean;
}) {
  const t = useTranslations();
  const { setTheme } = useTheme();
  const { run, pending, error } = useMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    mode: "onTouched",
    defaultValues: {
      name: profile.name,
      locale: profile.locale,
      theme: profile.theme,
    },
  });
  return (
    <>
      <PageHeading title={t("settings")} description={t("settingsIntro")} />
      <div className="settings-grid">
        <form
          className="panel form-stack"
          noValidate
          onSubmit={handleSubmit((v) =>
            run("profile", v, () => setTheme(v.theme)),
          )}
        >
          <h2>{t("profile")}</h2>
          <Field label={t("name")} error={errors.name?.message}>
            <Input autoComplete="name" maxLength={80} {...register("name")} />
          </Field>
          <div className="field">
            <span>{t("accountEmail")}</span>
            <p className="muted break-all">{email}</p>
          </div>
          <hr />
          <h2>{t("preferences")}</h2>
          <div className="form-grid">
            <Field label={t("language")} error={errors.locale?.message}>
              <select {...register("locale")}>
                <option value="en">English</option>
                <option value="am">አማርኛ</option>
              </select>
            </Field>
            <Field label={t("theme")} error={errors.theme?.message}>
              <select {...register("theme")}>
                {["system", "light", "dark"].map((v) => (
                  <option key={v} value={v}>
                    {t(v)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="key-value">
            <span>{t("currency")}</span>
            <strong>{t("currencyValue")}</strong>
          </div>
          <div className="key-value">
            <span>{t("timezone")}</span>
            <strong>{t("timezoneValue")}</strong>
          </div>
          <Link className="text-link" href="/plan">
            {t("planningPreferences")}
            <ArrowUpRight size={17} />
          </Link>
          {error && (
            <p className="field-error" role="alert">
              {t(error)}
            </p>
          )}
          <Button type="submit" disabled={pending}>
            {t(pending ? "saving" : "save")}
          </Button>
        </form>
        <div className="form-stack">
          <ContactForm phone={phone} available={contactAvailable} />
          <section className="panel security-panel">
            <ShieldCheck size={30} />
            <h2>{t("security")}</h2>
            <p className="muted">{t("privacyText")}</p>
            <Link className="button button-outline" href="/reset-password">
              {t("changePassword")}
              <ArrowUpRight size={16} />
            </Link>
            <hr />
            <SignOut />
          </section>
        </div>
      </div>
    </>
  );
}

function ContactForm({
  phone,
  available,
}: {
  phone: string;
  available: boolean;
}) {
  const t = useTranslations();
  const { run, pending, error } = useMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof contactSchema>>({
    resolver: zodResolver(contactSchema),
    mode: "onTouched",
    defaultValues: { phone },
  });
  return (
    <form
      className="panel form-stack"
      noValidate
      onSubmit={handleSubmit((v) => run("contact", v))}
    >
      <h2>{t("contactDetails")}</h2>
      <Field
        label={t("phone")}
        error={errors.phone?.message}
        hint={t("phoneHint")}
      >
        <Input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={30}
          {...register("phone")}
        />
      </Field>
      <p className="muted small">{t("phoneOwnershipNote")}</p>
      {!available && (
        <p role="alert" className="notice">
          {t("contactSetupRequired")}
        </p>
      )}
      {error && (
        <p role="alert" className="field-error">
          {t(error)}
        </p>
      )}
      <Button type="submit" disabled={pending || !available}>
        {t(pending ? "saving" : "savePhone")}
      </Button>
    </form>
  );
}
