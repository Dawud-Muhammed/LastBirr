"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ShieldCheck, Check, History } from "lucide-react";
import { planSchema } from "@/lib/validation";
import {
  formatMoney,
  moneyInput,
  parseMoney,
  todayInAddis,
} from "@/lib/finance";
import type { FinanceData } from "@/lib/types";
import { DateText, EmptyState, Field, PageHeading } from "@/components/common";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CommitmentButton, ConfirmButton, Modal, useMutation } from "./forms";
export function MoneyPlan({ data }: { data: FinanceData }) {
  const t = useTranslations();
  const locale = useLocale();
  const { run, pending, error } = useMutation();
  const [next, setNext] = useState<z.infer<typeof planSchema> | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof planSchema>>({
    resolver: zodResolver(planSchema),
    mode: "onTouched",
    defaultValues: {
      end_on: data.plan.end_on,
      savings: moneyInput(data.plan.savings),
      horizon_type: data.plan.horizon_type,
    },
  });
  return (
    <>
      <PageHeading title={t("plan")} description={t("planIntro")} />
      <div className="plan-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2>{t("currentPlan")}</h2>
            <ShieldCheck size={20} />
          </div>
          <form
            className="form-stack"
            noValidate
            onSubmit={handleSubmit((v) => run("plan", v))}
          >
            <Field label={t("horizon")} error={errors.horizon_type?.message}>
              <select {...register("horizon_type")}>
                <option value="allowance">{t("allowance")}</option>
                <option value="custom">{t("custom")}</option>
              </select>
            </Field>
            <Field label={t("endDate")} error={errors.end_on?.message}>
              <Input type="date" min={todayInAddis()} {...register("end_on")} />
            </Field>
            <Field
              label={t("savingsLabel")}
              hint={t("savingsHint")}
              error={errors.savings?.message}
            >
              <Input inputMode="decimal" {...register("savings")} />
            </Field>
            <p className="notice">{t("expectedOnly")}</p>
            {error && (
              <p className="field-error" role="alert">
                {t(error)}
              </p>
            )}
            <Button disabled={pending} type="submit">
              {t(pending ? "saving" : "updatePlan")}
            </Button>
            <Button
              variant="outline"
              type="button"
              disabled={pending}
              onClick={handleSubmit((v) => setNext(v))}
            >
              {t("newPeriod")}
            </Button>
            <p className="muted small">{t("newPeriodHint")}</p>
          </form>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>{t("commitments")}</h2>
            <CommitmentButton />
          </div>
          <p className="muted small">{t("planExplanation")}</p>
          {data.commitments.length ? (
            <div className="commitments-list">
              {[...data.commitments]
                .sort(
                  (a, b) =>
                    Number(a.paid) - Number(b.paid) ||
                    (a.due_on || "9999").localeCompare(b.due_on || "9999"),
                )
                .map((c) => (
                  <article className="commitment-card" key={c.id}>
                    <div className="commitment-card-top">
                      <span
                        className={`commitment-icon ${c.paid ? "paid" : ""}`}
                      >
                        {c.paid ? (
                          <Check size={20} />
                        ) : (
                          <ShieldCheck size={20} />
                        )}
                      </span>
                      <div>
                        <h3>{c.title}</h3>
                        <small className="muted">
                          {c.due_on && (
                            <>
                              <DateText value={c.due_on} /> ·{" "}
                            </>
                          )}
                          {t(c.paid ? "paid" : "unpaid")}
                        </small>
                      </div>
                      <strong>{formatMoney(c.amount, locale)}</strong>
                    </div>
                    {!c.paid && (
                      <div className="commitment-actions">
                        <ConfirmButton
                          operation="settle"
                          id={c.id}
                          label={t("pay")}
                          title={t("payTitle")}
                          description={t("payText")}
                        />
                        <CommitmentButton commitment={c} />
                        <ConfirmButton
                          operation="deleteCommitment"
                          id={c.id}
                          label={t("delete")}
                          title={t("deleteTitle")}
                          description={t("deleteText")}
                          destructive
                        />
                      </div>
                    )}
                  </article>
                ))}
            </div>
          ) : (
            <EmptyState
              title={t("noCommitments")}
              description={t("noCommitmentsText")}
            />
          )}
        </section>
      </div>
      <div className="history-note">
        <History size={22} />
        <div>
          <h3>{t("periodHistory")}</h3>
          <p>{t("periodHistoryText")}</p>
        </div>
      </div>
      {next && (
        <Modal
          title={t("newPeriodTitle")}
          description={t("newPeriodText")}
          close={() => setNext(null)}
          pending={pending}
        >
          <p>
            <DateText value={next.end_on} /> ·{" "}
            {formatMoney(parseMoney(next.savings), locale)}
          </p>
          <div className="form-actions">
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setNext(null)}
            >
              {t("cancel")}
            </Button>
            <Button
              disabled={pending}
              onClick={() => run("newPeriod", next, () => setNext(null))}
            >
              {t(pending ? "saving" : "newPeriod")}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
