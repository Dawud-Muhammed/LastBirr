"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { onboardingSchema } from "@/lib/validation";
import { addDays, todayInAddis } from "@/lib/finance";
import { Brand, Preferences, Field } from "@/components/common";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { onboard } from "./actions";
export function Onboarding({ name }: { name: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof onboardingSchema>>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name,
      balance: "",
      end_on: addDays(todayInAddis(), 10),
      savings: "0",
      horizon_type: "allowance",
      commitment: "0",
      commitmentTitle: "",
    },
  });
  return (
    <div className="onboarding-page">
      <header className="public-header">
        <Brand />
        <Preferences />
      </header>
      <main className="onboarding" id="main-content">
        <div className="onboarding-heading">
          <span className="eyebrow">{t("onboardStep")}</span>
          <h1>{t("welcome")}</h1>
          <p className="muted">{t("onboardIntro")}</p>
        </div>
        <form
          className="panel form-stack"
          noValidate
          onSubmit={handleSubmit(async (v) => {
            setError("");
            try {
              const r = await onboard(v);
              if (!r.ok) setError(r.error || "saveFailed");
              else {
                router.push("/dashboard");
                router.refresh();
              }
            } catch {
              setError("saveFailed");
            }
          })}
        >
          <div className="form-section">
            <span className="step-number">01</span>
            <div className="form-stack">
              <Field label={t("name")} error={errors.name?.message}>
                <Input autoComplete="name" {...register("name")} />
              </Field>
              <Field
                label={t("openingBalance")}
                hint={t("balanceHint")}
                error={errors.balance?.message}
              >
                <Input
                  inputMode="decimal"
                  placeholder="1500.00"
                  {...register("balance")}
                />
              </Field>
            </div>
          </div>
          <div className="form-section">
            <span className="step-number">02</span>
            <div className="form-grid">
              <Field label={t("horizon")}>
                <select {...register("horizon_type")}>
                  <option value="allowance">{t("allowance")}</option>
                  <option value="custom">{t("custom")}</option>
                </select>
              </Field>
              <Field label={t("endDate")} error={errors.end_on?.message}>
                <Input
                  type="date"
                  min={todayInAddis()}
                  {...register("end_on")}
                />
              </Field>
            </div>
          </div>
          <div className="form-section">
            <span className="step-number">03</span>
            <div className="form-stack">
              <div className="form-grid">
                <Field
                  label={t("essentialLabel")}
                  error={errors.commitment?.message}
                >
                  <Input inputMode="decimal" {...register("commitment")} />
                </Field>
                <Field
                  label={t("savingsLabel")}
                  error={errors.savings?.message}
                >
                  <Input inputMode="decimal" {...register("savings")} />
                </Field>
              </div>
              <Field
                label={t("essentialName")}
                hint={t("essentialHint")}
                error={errors.commitmentTitle?.message}
              >
                <Input {...register("commitmentTitle")} />
              </Field>
              <p className="muted small">{t("savingsHint")}</p>
            </div>
          </div>
          {error && (
            <p role="alert" className="notice notice-error">
              {t(error)}
            </p>
          )}
          <Button className="form-submit" type="submit" disabled={isSubmitting}>
            {t(isSubmitting ? "saving" : "startPlan")}
            <ArrowRight size={17} />
          </Button>
          <p className="microcopy">
            <ShieldCheck size={18} />
            {t("onboardFooter")}
          </p>
        </form>
      </main>
    </div>
  );
}
