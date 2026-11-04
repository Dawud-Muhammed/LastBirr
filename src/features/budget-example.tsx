"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { RotateCcw, ArrowDownLeft } from "lucide-react";
import { calculatePlan, formatMoney } from "@/lib/finance";
import { Button } from "@/components/ui/button";

export function BudgetExample() {
  const t = useTranslations();
  const locale = useLocale();
  const [spent, setSpent] = useState(false);
  // A fixed, clearly labelled example uses the same calculation as real plans.
  // It has no account, network request, or saved financial record.
  const plan = calculatePlan({
    opening: 150000,
    entries: spent
      ? [{ kind: "expense", amount: 3500, occurred_on: "2026-11-04" }]
      : [],
    commitments: [{ amount: 40000, paid: false }],
    savings: 10000,
    today: "2026-11-04",
    end: "2026-11-14",
  });
  const money = (amount: number) => formatMoney(amount, locale);
  return (
    <section
      className="budget-example"
      id="budget-example"
      aria-labelledby="example-title"
    >
      <div className="example-heading">
        <h2 id="example-title">{t("exampleTitle")}</h2>
        <span>{t("exampleOnly")}</span>
      </div>
      <div className="example-budget">
        <p>{t("todayRemaining")}</p>
        <div className="example-amount">{money(plan.remainingToday)}</div>
        <p className="example-equation">
          {money(plan.allocation)} − {money(plan.spentToday)} ={" "}
          {money(plan.remainingToday)}
        </p>
      </div>
      <dl className="example-ledger">
        <div>
          <dt>{t("balance")}</dt>
          <dd>{money(plan.balance)}</dd>
        </div>
        <div>
          <dt>{t("essentials")}</dt>
          <dd>{money(plan.essentials)}</dd>
        </div>
        <div>
          <dt>{t("savings")}</dt>
          <dd>{money(plan.savings)}</dd>
        </div>
      </dl>
      <p className="example-footnote">{t("exampleSetup")}</p>
      <div className="example-actions">
        <Button type="button" disabled={spent} onClick={() => setSpent(true)}>
          <ArrowDownLeft size={16} />
          {t(spent ? "exampleRecorded" : "exampleSpend")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={!spent}
          onClick={() => setSpent(false)}
        >
          <RotateCcw size={15} />
          {t("resetExample")}
        </Button>
      </div>
      <p className="example-feedback" role="status">
        {t(spent ? "exampleAfter" : "exampleBefore")}
      </p>
    </section>
  );
}
