"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Lightbulb } from "lucide-react";
import { balanceFromLedger, formatMoney } from "@/lib/finance";
import type { FinanceData } from "@/lib/types";
import { EmptyState, PageHeading } from "@/components/common";
import { Input } from "@/components/ui/input";
const COLORS = [
  "#338164",
  "#7fab8a",
  "#bc9c65",
  "#7299b0",
  "#a1819f",
  "#b57a65",
  "#7e8c62",
  "#9e9e9e",
  "#74807c",
];
export function Insights({ data }: { data: FinanceData }) {
  const t = useTranslations();
  const locale = useLocale();
  const money = (n: number) => formatMoney(n, locale);
  const [from, setFrom] = useState(data.plan.start_on);
  const [to, setTo] = useState(data.today);
  const entries = data.transactions.filter(
    (e) => (!from || e.occurred_on >= from) && (!to || e.occurred_on <= to),
  );
  const income = entries
    .filter((e) => e.kind === "income")
    .reduce((s, e) => s + e.amount, 0);
  const expenses = entries
    .filter((e) => e.kind === "expense")
    .reduce((s, e) => s + e.amount, 0);
  const categoryTotals = new Map<string, number>();
  const dailyTotals = new Map<
    string,
    { expense: number; actual: number; income: number; planned: number | null }
  >();
  for (const entry of entries) {
    if (entry.kind === "expense")
      categoryTotals.set(
        entry.category,
        (categoryTotals.get(entry.category) || 0) + entry.amount,
      );
    const day = dailyTotals.get(entry.occurred_on) || {
      expense: 0,
      actual: 0,
      income: 0,
      planned: null,
    };
    day[entry.kind] += entry.amount;
    if (entry.kind === "expense" && !entry.commitment_id)
      day.actual += entry.amount;
    dailyTotals.set(entry.occurred_on, day);
  }
  for (const snapshot of data.snapshots.filter(
    (s) => (!from || s.day >= from) && (!to || s.day <= to),
  )) {
    const day = dailyTotals.get(snapshot.day) || {
      expense: 0,
      actual: 0,
      income: 0,
      planned: null,
    };
    day.planned = snapshot.allocation;
    dailyTotals.set(snapshot.day, day);
  }
  const categories = [...categoryTotals]
    .map(([key, value]) => ({ name: t(`categories.${key}`), value }))
    .sort((a, b) => b.value - a.value);
  const daily = [...dailyTotals]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, values]) => ({ date, ...values }));
  const axisMoney = (value: number) =>
    new Intl.NumberFormat(locale, {
      maximumFractionDigits: 0,
      notation: "compact",
    }).format(value / 100);
  const shortDate = (date: string) =>
    new Intl.DateTimeFormat(locale === "am" ? "am-ET" : "en-ET", {
      month: "short",
      day: "numeric",
      timeZone: "Africa/Addis_Ababa",
    }).format(new Date(`${date}T12:00:00Z`));
  const tooltipStyle = {
    backgroundColor: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    color: "var(--foreground)",
    fontSize: 12,
  };
  return (
    <>
      <PageHeading title={t("insights")} description={t("insightsIntro")} />
      <div className="date-filters insight-filters">
        <label>
          {t("from")}
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          {t("to")}
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
      </div>
      {from && to && from > to && (
        <p role="alert" className="notice notice-error">
          {t("rangeInvalid")}
        </p>
      )}
      <div className="stats-grid">
        {[
          { key: "totalIncome", value: income },
          { key: "totalExpenses", value: expenses },
          { key: "netChange", value: income - expenses },
          {
            key: "balance",
            value: balanceFromLedger(
              data.wallet.opening_balance,
              data.transactions,
            ),
          },
        ].map((v) => (
          <div className="stat-card" key={v.key}>
            <span>{t(v.key)}</span>
            <strong>{money(v.value)}</strong>
          </div>
        ))}
      </div>
      {!entries.length ? (
        <section className="panel">
          <EmptyState
            title={t("insightsEmpty")}
            description={t("insightsEmptyText")}
          />
        </section>
      ) : (
        <>
          <div className="charts-grid">
            <section className="panel chart-panel">
              <h2>{t("categorySpending")}</h2>
              {categories.length ? (
                <>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={categories}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={64}
                          outerRadius={95}
                          paddingAngle={3}
                          stroke="none"
                        >
                          {categories.map((v, i) => (
                            <Cell
                              key={v.name}
                              fill={COLORS[i % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v) => money(Number(v))}
                          contentStyle={tooltipStyle}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="chart-legend">
                    {categories.map((v, i) => (
                      <li key={v.name}>
                        <span
                          className="legend-dot"
                          style={{ backgroundColor: COLORS[i % COLORS.length] }}
                        />
                        <span>{v.name}</span>
                        <strong>{money(v.value)}</strong>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <EmptyState
                  title={t("noTransactions")}
                  description={t("noTransactionsText")}
                />
              )}
            </section>
            <section className="panel chart-panel">
              <h2>{t("dailyTrend")}</h2>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={daily}
                    margin={{ top: 20, right: 15, left: -10, bottom: 0 }}
                    accessibilityLayer
                  >
                    <CartesianGrid vertical={false} stroke="var(--border)" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={shortDate}
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={25}
                    />
                    <YAxis
                      tickFormatter={axisMoney}
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(v) => money(Number(v))}
                      labelFormatter={(v) => shortDate(String(v))}
                      contentStyle={tooltipStyle}
                    />
                    <Line
                      type="monotone"
                      dataKey="expense"
                      name={t("expense")}
                      stroke="#338164"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="observation">
                <Lightbulb size={19} />
                <p>
                  {categories.length
                    ? t("topCategory", {
                        category: categories[0].name,
                        amount: money(categories[0].value),
                      })
                    : t("periodNet", { amount: money(income - expenses) })}
                </p>
              </div>
            </section>
            <section className="panel chart-panel">
              <h2>{t("incomeExpense")}</h2>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={[
                      { name: t("income"), amount: income },
                      { name: t("expense"), amount: expenses },
                    ]}
                    accessibilityLayer
                  >
                    <CartesianGrid vertical={false} stroke="var(--border)" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={axisMoney}
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(v) => money(Number(v))}
                      contentStyle={tooltipStyle}
                    />
                    <Bar
                      dataKey="amount"
                      name={t("amount")}
                      radius={[6, 6, 0, 0]}
                      maxBarSize={72}
                    >
                      <Cell fill="#338164" />
                      <Cell fill="#bc9c65" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="muted small">
                {t("periodNet", { amount: money(income - expenses) })}
              </p>
            </section>
            <section className="panel chart-panel">
              <h2>{t("plannedActual")}</h2>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart
                    data={daily}
                    margin={{ top: 20, right: 15, left: -10 }}
                    accessibilityLayer
                  >
                    <CartesianGrid vertical={false} stroke="var(--border)" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={shortDate}
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={25}
                    />
                    <YAxis
                      tickFormatter={axisMoney}
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(v) => money(Number(v))}
                      contentStyle={tooltipStyle}
                    />
                    <Line
                      dataKey="planned"
                      name={t("planned")}
                      stroke="#338164"
                      strokeDasharray="5 5"
                      strokeWidth={2}
                      connectNulls={false}
                    />
                    <Line
                      dataKey="actual"
                      name={t("actual")}
                      stroke="#bc9c65"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="inline-legend">
                <span>
                  <i style={{ background: "#338164" }} />
                  {t("planned")}
                </span>
                <span>
                  <i style={{ background: "#bc9c65" }} />
                  {t("actual")}
                </span>
              </div>
              <p className="muted small">{t("snapshotNote")}</p>
            </section>
          </div>
          <details className="calculation-details">
            <summary>{t("chartTable")}</summary>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    {["date", "income", "expense", "planned", "actual"].map(
                      (k) => (
                        <th key={k}>{t(k)}</th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {daily.map((day) => (
                    <tr key={day.date}>
                      <td>{shortDate(day.date)}</td>
                      <td>{money(day.income)}</td>
                      <td>{money(day.expense)}</td>
                      <td>{day.planned === null ? "—" : money(day.planned)}</td>
                      <td>{money(day.actual)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </>
  );
}
