"use client";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, Info, ArrowUpRight, ChevronDown } from "lucide-react";
import type { FinanceData } from "@/lib/types";
import { calculatePlan, formatMoney } from "@/lib/finance";
import {
  DateText,
  EmptyState,
  PageHeading,
  TextLink,
} from "@/components/common";
import { TransactionButton } from "./forms";
import { TransactionList } from "./transactions";
export function Dashboard({ data }: { data: FinanceData }) {
  const t = useTranslations();
  const locale = useLocale();
  const money = (n: number) => formatMoney(n, locale);
  const p = calculatePlan({
    opening: data.wallet.opening_balance,
    entries: data.transactions,
    commitments: data.commitments,
    savings: data.plan.savings,
    end: data.plan.end_on,
    today: data.today,
  });
  const progress =
    p.allocation > 0
      ? Math.min(100, Math.round((p.spentToday / p.allocation) * 100))
      : p.spentToday > 0
        ? 100
        : 0;
  const upcoming = data.commitments
    .filter((c) => !c.paid)
    .sort((a, b) => (a.due_on || "9999").localeCompare(b.due_on || "9999"))
    .slice(0, 3);
  return (
    <>
      <PageHeading title={t("hello")} description={t("dashboardIntro")}>
        <TransactionButton kind="income" openedOn={data.wallet.opened_on} />
      </PageHeading>
      <div className="dashboard-top dashboard-focused">
        <section className="daily-card">
          <div className="daily-card-top">
            <span>{t("today")}</span>
            <DateText value={data.today} />
          </div>
          <h2>{t("todayRemaining")}</h2>
          <div className="daily-amount">{money(p.remainingToday)}</div>
          <p className="daily-summary">
            {t("dailySummary", {
              allocation: money(p.allocation),
              spent: money(p.spentToday),
            })}
          </p>
          <div
            className="budget-progress"
            role="progressbar"
            aria-label={t("progress")}
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
          <div className="daily-action">
            <TransactionButton openedOn={data.wallet.opened_on} />
          </div>
          <p className="daily-footnote">{t("guideNote")}</p>
        </section>
        <section className="panel balance-summary">
          <h2>{t("balance")}</h2>
          <strong className="balance-amount">{money(p.balance)}</strong>
          <p className="muted">{t("balanceExplained")}</p>
          <div className="key-value">
            <span>{t("planningEnd")}</span>
            <strong>
              <DateText value={data.plan.end_on} />
            </strong>
          </div>
          <div className="key-value">
            <span>{t("daysLeft")}</span>
            <strong>{Math.max(0, p.days ?? 0)}</strong>
          </div>
          <TextLink href="/plan">{t("updatePlan")}</TextLink>
        </section>
      </div>
      {p.warnings.length > 0 && (
        <div className="warnings" role="status">
          {p.warnings.map((w) => (
            <div className="warning" key={w}>
              <Info size={18} />
              <p>{t(`warnings.${w}`)}</p>
            </div>
          ))}
        </div>
      )}
      <details className="budget-breakdown form-disclosure">
        <summary>
          <span>{t("calculation")}</span>
          <ChevronDown size={18} />
        </summary>
        <div className="breakdown-content">
          <dl className="breakdown-values">
            {[
              { key: "balance", value: p.balance },
              { key: "essentials", value: p.essentials },
              { key: "savings", value: p.savings },
              { key: "spendable", value: p.spendable },
              { key: "dailyGuide", value: p.dailyGuide },
            ].map(({ key, value }) => (
              <div key={key}>
                <dt>{t(key)}</dt>
                <dd>{money(value)}</dd>
              </div>
            ))}
          </dl>
          <div className="breakdown-explanation">
            <p>{t("calculationText")}</p>
            <p>{t("dailyGuideExplained")}</p>
            <p>{t("allocationNote")}</p>
            <p>{t("todayCalculation")}</p>
          </div>
        </div>
      </details>
      {!data.transactions.length && (
        <section className="first-entry">
          <div>
            <h2>{t("firstExpenseTitle")}</h2>
            <p>{t("firstExpenseText")}</p>
          </div>
          <TransactionButton openedOn={data.wallet.opened_on} />
        </section>
      )}
      <div className="dashboard-bottom">
        <section className="panel">
          <div className="panel-heading">
            <h2>{t("recentTransactions")}</h2>
            <TextLink href="/transactions">{t("viewAll")}</TextLink>
          </div>
          {data.transactions.length ? (
            <TransactionList
              compact
              entries={data.transactions.slice(0, 5)}
              openedOn={data.wallet.opened_on}
            />
          ) : (
            <EmptyState
              title={t("noTransactions")}
              description={t("noTransactionsText")}
            />
          )}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>{t("upcoming")}</h2>
            <TextLink href="/plan">{t("plan")}</TextLink>
          </div>
          {upcoming.length ? (
            upcoming.map((c) => (
              <div className="commitment-preview" key={c.id}>
                <span className="commitment-icon">
                  <CalendarDays size={18} />
                </span>
                <div>
                  <strong>{c.title}</strong>
                  <small>
                    {c.due_on ? <DateText value={c.due_on} /> : t("unpaid")}
                  </small>
                </div>
                <strong>{money(c.amount)}</strong>
              </div>
            ))
          ) : (
            <EmptyState
              title={t("noCommitments")}
              description={t("noCommitmentsText")}
            />
          )}
          <div className="runway">
            <ArrowUpRight size={18} />
            <div>
              <span>{t("runway")}</span>
              <strong>
                {p.runway === null
                  ? t("notEnoughData")
                  : t("days", { count: p.runway })}
              </strong>
              <small>{t("runwayNote")}</small>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
