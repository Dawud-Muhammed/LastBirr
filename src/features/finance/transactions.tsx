"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowDownLeft, ArrowUpRight, Search } from "lucide-react";
import { formatMoney } from "@/lib/finance";
import {
  expenseCategories,
  incomeCategories,
  type FinanceData,
  type Transaction,
} from "@/lib/types";
import { DateText, EmptyState, PageHeading } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmButton, TransactionButton } from "./forms";
export function TransactionList({
  entries,
  openedOn,
  compact = false,
}: {
  entries: Transaction[];
  openedOn: string;
  compact?: boolean;
}) {
  const t = useTranslations();
  const locale = useLocale();
  return (
    <div className="transaction-list">
      {entries.map((entry) => (
        <article className="transaction-row" key={entry.id}>
          <span className={`transaction-icon ${entry.kind}`}>
            {entry.kind === "income" ? (
              <ArrowDownLeft size={20} />
            ) : (
              <ArrowUpRight size={20} />
            )}
          </span>
          <div className="transaction-info">
            <strong>{entry.note || t(`categories.${entry.category}`)}</strong>
            <small>
              {t(`categories.${entry.category}`)} <span>·</span>{" "}
              <DateText value={entry.occurred_on} />
              {entry.commitment_id && (
                <span className="settlement-label"> · {t("settlement")}</span>
              )}
            </small>
          </div>
          <strong className={`transaction-amount ${entry.kind}`}>
            {entry.kind === "income" ? "+" : "−"}
            {formatMoney(entry.amount, locale)}
          </strong>
          {!compact && (
            <div className="transaction-actions">
              {!entry.commitment_id && (
                <TransactionButton entry={entry} openedOn={openedOn} />
              )}
              <ConfirmButton
                operation="deleteTransaction"
                id={entry.id}
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
  );
}
export function Transactions({ data }: { data: FinanceData }) {
  const t = useTranslations();
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("");
  const [category, setCategory] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const filtered = data.transactions.filter(
    (e) =>
      (!kind || e.kind === kind) &&
      (!category || e.category === category) &&
      (!from || e.occurred_on >= from) &&
      (!to || e.occurred_on <= to) &&
      `${e.note} ${t(`categories.${e.category}`)}`
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()),
  );
  return (
    <>
      <PageHeading
        title={t("transactions")}
        description={t("transactionIntro")}
      >
        <TransactionButton openedOn={data.wallet.opened_on} />
        <TransactionButton kind="income" openedOn={data.wallet.opened_on} />
      </PageHeading>
      <section className="panel">
        <div className="filter-bar">
          <label className="search-field">
            <Search size={18} />
            <Input
              aria-label={t("search")}
              placeholder={t("search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label className="filter-field">
            <span>{t("type")}</span>
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="">{t("all")}</option>
              <option value="expense">{t("expense")}</option>
              <option value="income">{t("income")}</option>
            </select>
          </label>
          <label className="filter-field">
            <span>{t("category")}</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">{t("all")}</option>
              {[...expenseCategories, ...incomeCategories].map((c) => (
                <option key={c} value={c}>
                  {t(`categories.${c}`)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="date-filters">
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
          <Button
            variant="ghost"
            onClick={() => {
              setSearch("");
              setKind("");
              setCategory("");
              setFrom("");
              setTo("");
            }}
          >
            {t("clearFilters")}
          </Button>
        </div>
        {from && to && from > to && (
          <p className="field-error" role="alert">
            {t("rangeInvalid")}
          </p>
        )}
        {filtered.length ? (
          <TransactionList
            entries={filtered}
            openedOn={data.wallet.opened_on}
          />
        ) : (
          <EmptyState
            title={t(data.transactions.length ? "noResults" : "noTransactions")}
            description={t(
              data.transactions.length ? "noResultsText" : "noTransactionsText",
            )}
          />
        )}
        <p className="muted small panel-footnote">
          {t("recordedFrom", { date: data.wallet.opened_on })}
        </p>
      </section>
    </>
  );
}
