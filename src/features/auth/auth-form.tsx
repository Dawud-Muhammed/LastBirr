"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { restorePreferences } from "@/features/finance/actions";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { authSchema, authErrorKey, type AuthMode } from "@/lib/identity";
import { signUp } from "./actions";
import { createClient } from "@/lib/supabase/browser";
import { Brand, Preferences, Field } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [showPassword, setShowPassword] = useState(false);
  const submitting = useRef(false);
  const schema = authSchema(mode);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });
  const submit = async (v: z.infer<typeof schema>) => {
    if (submitting.current) return;
    submitting.current = true;
    setError("");
    setNotice("");
    try {
      const db = createClient();
      const origin = window.location.origin;
      if (mode === "login") {
        const r = await db.auth.signInWithPassword({
          email: v.email.trim().toLowerCase(),
          password: v.password,
        });
        if (r.error) throw r.error;
        const theme = await restorePreferences();
        if (theme) setTheme(theme);
        router.replace("/dashboard");
        router.refresh();
      }
      if (mode === "register") {
        const r = await signUp(v);
        if (r.ok) {
          router.replace("/onboarding");
          router.refresh();
        } else setError(r.error || "authRequestFailed");
      }
      if (mode === "forgot") {
        const r = await db.auth.resetPasswordForEmail(
          v.email.trim().toLowerCase(),
          {
            redirectTo: `${origin}/auth/callback?next=/reset-password`,
          },
        );
        if (r.error) throw r.error;
        setNotice("checkEmail");
      }
      if (mode === "reset") {
        const r = await db.auth.updateUser({ password: v.password });
        if (r.error) throw r.error;
        setNotice("passwordSaved");
      }
    } catch (error) {
      setError(
        authErrorKey(error && typeof error === "object" ? error : {}, mode),
      );
    } finally {
      submitting.current = false;
    }
  };
  return (
    <div className={`auth-page auth-${mode}`}>
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
          {mode === "register" && (
            <p className="auth-subtitle">{t("simpleSignup")}</p>
          )}
          <form
            onSubmit={(event) => void handleSubmit(submit)(event)}
            className="form-stack"
            noValidate
          >
            {mode === "register" && (
              <Field label={t("name")} error={errors.name?.message}>
                <Input
                  autoComplete="name"
                  maxLength={80}
                  {...register("name")}
                  aria-invalid={!!errors.name}
                />
              </Field>
            )}
            {mode === "register" && (
              <Field
                label={t("phone")}
                hint={t("phoneHint")}
                error={errors.phone?.message}
              >
                <Input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="09… / 07… / +251…"
                  maxLength={30}
                  {...register("phone")}
                />
              </Field>
            )}
            {mode !== "reset" && (
              <Field label={t("email")} error={errors.email?.message}>
                <Input
                  type="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={254}
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
                <div className="password-field">
                  <Input
                    type={showPassword ? "text" : "password"}
                    maxLength={128}
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    {...register("password")}
                    aria-invalid={!!errors.password}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    aria-label={t(
                      showPassword ? "hidePassword" : "showPassword",
                    )}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </Field>
            )}
            {(mode === "register" || mode === "reset") && (
              <Field
                label={t("confirmPassword")}
                error={errors.confirmPassword?.message}
              >
                <Input
                  type={showPassword ? "text" : "password"}
                  maxLength={128}
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
          {mode === "register" && (
            <p className="signup-assurance">
              <ShieldCheck size={15} />
              {t("signupAssurance")}
            </p>
          )}
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
