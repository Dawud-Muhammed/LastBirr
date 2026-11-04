"use client";
import { useLocale, useTranslations } from "next-intl";
import {
  CalendarDays,
  ShieldCheck,
  Wallet,
  PiggyBank,
  Info,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
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
        <TransactionButton openedOn={data.wallet.opened_on} />
      </PageHeading>
      <div className="dashboard-top">
        <section className="daily-card">
          <div className="daily-card-top">
            <span className="mini-pill">
              <span className="live-dot" />
              {t("today")}
            </span>
            <DateText value={data.today} />
          </div>
          <h2>{t("todayQuestion")}</h2>
          <div className="daily-amount">{money(p.remainingToday)}</div>
          <p className="daily-label">{t("todayRemaining")}</p>
          <div className="daily-divider" />
          <div className="daily-substats">
            <div>
              <span>{t("allocation")}</span>
              <strong>{money(p.allocation)}</strong>
            </div>
            <div>
              <span>{t("spentToday")}</span>
              <strong>{money(p.spentToday)}</strong>
            </div>
          </div>
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
          <p className="daily-footnote">{t("guideNote")}</p>
        </section>
        <section className="panel period-card">
          <div className="panel-heading">
            <h2>{t("currentPlan")}</h2>
            <CalendarDays size={19} />
          </div>
          <div className="days-number">
            {Math.max(0, p.days ?? 0)}
            <span>{t("daysLeft")}</span>
          </div>
          <div className="key-value">
            <span>{t("planningEnd")}</span>
            <strong>
              <DateText value={data.plan.end_on} />
            </strong>
          </div>
          <div className="key-value">
            <span>{t("dailyGuide")}</span>
            <strong>{money(p.dailyGuide)}</strong>
          </div>
          <p className="muted small">{t("expectedOnly")}</p>
          <TextLink href="/plan">{t("updatePlan")}</TextLink>
        </section>
      </div>
      <div className="stats-grid">
        {[
          { key: "balance", value: p.balance, icon: Wallet },
          { key: "essentials", value: p.essentials, icon: ShieldCheck },
          { key: "savings", value: p.savings, icon: PiggyBank },
          { key: "spendable", value: p.spendable, icon: Sparkles },
        ].map(({ key, value, icon: Icon }) => (
          <section className="stat-card" key={key}>
            <div>
              <span>{t(key)}</span>
              <Icon size={18} strokeWidth={1.5} />
            </div>
            <strong>{money(value)}</strong>
          </section>
        ))}
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
              <div key={c.id} className="commitment-preview">
                <span className="commitment-icon">
                  <ShieldCheck size={18} />
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
      <details className="calculation-details">
        <summary>
          <Info size={17} />
          {t("calculation")}
        </summary>
        <div>
          <p>{t("calculationText")}</p>
          <p className="formula">
            {money(p.balance)} − {money(p.essentials)} − {money(p.savings)} →{" "}
            {money(p.spendable)}
          </p>
          <p>{t("allocationNote")}</p>
          <p>{t("todayCalculation")}</p>
        </div>
      </details>
    </>
  );
}
