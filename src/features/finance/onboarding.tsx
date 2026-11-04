"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, ChevronDown } from "lucide-react";
import { onboardingSchema } from "@/lib/validation";
import { nameSchema } from "@/lib/identity";
import { addDays, todayInAddis } from "@/lib/finance";
import { Brand, Preferences, Field } from "@/components/common";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { onboard } from "./actions";
export function Onboarding({ name }: { name: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [error, setError] = useState("");
  const [reservesOpen, setReservesOpen] = useState(false);
  const [nameOpen, setNameOpen] = useState(!nameSchema.safeParse(name).success);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof onboardingSchema>>({
    resolver: zodResolver(onboardingSchema),
    mode: "onTouched",
    defaultValues: {
      name,
      balance: "",
      end_on: addDays(todayInAddis(), 10),
      savings: "0",
      horizon_type: "custom",
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
      <main className="onboarding onboarding-simple" id="main-content">
        <div className="onboarding-heading">
          <p className="eyebrow">{t("onboardStep")}</p>
          <h1>{t("welcome")}</h1>
          <p>{t("onboardIntro")}</p>
        </div>
        <form
          className="panel form-stack"
          noValidate
          onSubmit={handleSubmit(
            async (v) => {
              setError("");
              try {
                const result = await onboard(v);
                if (!result.ok) setError(result.error || "saveFailed");
                else {
                  router.push("/dashboard");
                  router.refresh();
                }
              } catch {
                setError("saveFailed");
              }
            },
            (invalid) => {
              if (invalid.name) setNameOpen(true);
              if (
                invalid.commitment ||
                invalid.commitmentTitle ||
                invalid.savings
              )
                setReservesOpen(true);
            },
          )}
        >
          <Field
            label={t("openingQuestion")}
            hint={t("balanceHint")}
            error={errors.balance?.message}
          >
            <Input
              autoFocus
              inputMode="decimal"
              placeholder="1500.00"
              {...register("balance")}
            />
          </Field>
          <Field
            label={t("endQuestion")}
            hint={t("endQuestionHint")}
            error={errors.end_on?.message}
          >
            <Input type="date" min={todayInAddis()} {...register("end_on")} />
          </Field>
          <details
            className="form-disclosure"
            open={reservesOpen}
            onToggle={(event) => setReservesOpen(event.currentTarget.open)}
          >
            <summary>
              <span>
                {t("optionalReserves")}
                <small>{t("optionalReservesHint")}</small>
              </span>
              <ChevronDown size={18} />
            </summary>
            <div className="form-stack disclosure-body">
              <Field
                label={t("essentialLabel")}
                error={errors.commitment?.message}
                hint={t("essentialHint")}
              >
                <Input inputMode="decimal" {...register("commitment")} />
              </Field>
              <Field
                label={t("essentialName")}
                error={errors.commitmentTitle?.message}
              >
                <Input maxLength={100} {...register("commitmentTitle")} />
              </Field>
              <Field
                label={t("savingsLabel")}
                error={errors.savings?.message}
                hint={t("savingsHint")}
              >
                <Input inputMode="decimal" {...register("savings")} />
              </Field>
            </div>
          </details>
          <details
            className="form-disclosure profile-disclosure"
            open={nameOpen}
            onToggle={(event) => setNameOpen(event.currentTarget.open)}
          >
            <summary>
              <span>{t("profileName")}</span>
              <ChevronDown size={18} />
            </summary>
            <div className="disclosure-body">
              <Field label={t("name")} error={errors.name?.message}>
                <Input
                  autoComplete="name"
                  maxLength={80}
                  {...register("name")}
                />
              </Field>
            </div>
          </details>
          {error && (
            <p role="alert" className="notice notice-error">
              {t(error)}
            </p>
          )}
          <Button className="form-submit" type="submit" disabled={isSubmitting}>
            {t(isSubmitting ? "saving" : "startPlan")}
            <ArrowRight size={17} />
          </Button>
          <p className="muted small">{t("onboardFooter")}</p>
        </form>
      </main>
    </div>
  );
}
