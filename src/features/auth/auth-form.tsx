"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { restorePreferences } from "@/features/finance/actions";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { Brand, Preferences, Field } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export type AuthMode = "login" | "register" | "forgot" | "reset";
export function AuthForm({
  mode,
  invalidLink = false,
}: {
  mode: AuthMode;
  invalidLink?: boolean;
}) {
  const t = useTranslations();
  const router = useRouter();
  const { setTheme } = useTheme();
  const [notice, setNotice] = useState("");
  const [error, setError] = useState(invalidLink ? "invalidLink" : "");
  const schema = z
    .object({
      name:
        mode === "register"
          ? z.string().trim().min(1, "required").max(80, "tooLong")
          : z.string(),
      email: mode !== "reset" ? z.email("invalidEmail") : z.string(),
      password:
        mode !== "forgot" ? z.string().min(8, "shortPassword") : z.string(),
      confirmPassword: z.string(),
    })
    .refine((v) => mode !== "reset" || v.password === v.confirmPassword, {
      message: "passwordMismatch",
      path: ["confirmPassword"],
    });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });
  const submit = handleSubmit(async (v) => {
    setError("");
    setNotice("");
    try {
      const db = createClient();
      const origin = window.location.origin;
      if (mode === "login") {
        const r = await db.auth.signInWithPassword({
          email: v.email,
          password: v.password,
        });
        if (r.error) throw r.error;
        const theme = await restorePreferences();
        if (theme) setTheme(theme);
        router.replace("/dashboard");
        router.refresh();
      }
      if (mode === "register") {
        const r = await db.auth.signUp({
          email: v.email,
          password: v.password,
          options: {
            data: { name: v.name },
            emailRedirectTo: `${origin}/auth/callback`,
          },
        });
        if (r.error) throw r.error;
        if (r.data.session) {
          router.replace("/onboarding");
          router.refresh();
        } else setNotice("confirmEmail");
      }
      if (mode === "forgot") {
        const r = await db.auth.resetPasswordForEmail(v.email, {
          redirectTo: `${origin}/auth/callback?next=/reset-password`,
        });
        if (r.error) throw r.error;
        setNotice("checkEmail");
      }
      if (mode === "reset") {
        const r = await db.auth.updateUser({ password: v.password });
        if (r.error) throw r.error;
        setNotice("passwordSaved");
      }
    } catch {
      setError(mode === "login" ? "authFailed" : "authRequestFailed");
    }
  });
  return (
    <div className="auth-page">
      <header className="public-header">
        <Brand />
        <Preferences />
      </header>
      <main className="auth-layout" id="main-content">
        <aside className="auth-story">
          <span className="eyebrow">{t("tagline")}</span>
          <h1>{t("authIntro")}</h1>
          <p>{t("authNote")}</p>
          <div className="auth-art" aria-hidden="true">
            <div />
            <div />
            <div />
            <span>ብር</span>
          </div>
        </aside>
        <section className="auth-card">
          <p className="eyebrow">LASTBIRR</p>
          <h2>{t(mode)}</h2>
          <form onSubmit={submit} className="form-stack" noValidate>
            {mode === "register" && (
              <Field label={t("name")} error={errors.name?.message}>
                <Input
                  autoComplete="name"
                  {...register("name")}
                  aria-invalid={!!errors.name}
                />
              </Field>
            )}
            {mode !== "reset" && (
              <Field label={t("email")} error={errors.email?.message}>
                <Input
                  type="email"
                  autoComplete="email"
                  {...register("email")}
                  aria-invalid={!!errors.email}
                />
              </Field>
            )}
            {mode !== "forgot" && (
              <Field
                label={t("password")}
                error={errors.password?.message}
                hint={mode !== "login" ? t("passwordHint") : undefined}
              >
                <Input
                  type="password"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  {...register("password")}
                  aria-invalid={!!errors.password}
                />
              </Field>
            )}
            {mode === "reset" && (
              <Field
                label={t("confirmPassword")}
                error={errors.confirmPassword?.message}
              >
                <Input
                  type="password"
                  autoComplete="new-password"
                  {...register("confirmPassword")}
                />
              </Field>
            )}
            {mode === "login" && (
              <Link className="text-link" href="/forgot-password">
                {t("forgotLink")}
              </Link>
            )}
            {error && (
              <p className="notice notice-error" role="alert">
                {t(error)}
              </p>
            )}
            {notice && (
              <p className="notice" role="status">
                {t(notice)}
              </p>
            )}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="form-submit"
            >
              {t(
                isSubmitting
                  ? "saving"
                  : mode === "forgot"
                    ? "sendReset"
                    : mode === "reset"
                      ? "save"
                      : mode,
              )}
              <ArrowRight size={16} />
            </Button>
          </form>
          <p className="auth-switch">
            {mode === "login"
              ? t("noAccount")
              : mode === "register"
                ? t("hasAccount")
                : ""}{" "}
            <Link href={mode === "login" ? "/register" : "/login"}>
              {t(mode === "login" ? "register" : "backLogin")}
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}
