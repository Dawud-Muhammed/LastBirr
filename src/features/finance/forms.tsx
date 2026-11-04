"use client";
import { useRef, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Pencil, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Field } from "@/components/common";
import {
  commitmentSchema,
  transactionSchema,
  transactionSchemaForWallet,
} from "@/lib/validation";
import { moneyInput, todayInAddis } from "@/lib/finance";
import {
  expenseCategories,
  incomeCategories,
  type Transaction,
} from "@/lib/types";
import type { Commitment } from "@/lib/finance";
import { mutate } from "./actions";
export function useMutation() {
  const t = useTranslations();
  const lock = useRef(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  function run(
    operation: string,
    input: unknown,
    done?: () => void,
    successMessage?: string,
  ) {
    if (lock.current) return;
    lock.current = true;
    setError("");
    start(async () => {
      try {
        const result = await mutate(operation, input);
        if (!result.ok) {
          setError(result.error || "saveFailed");
          toast.error(t(result.error || "saveFailed"));
        } else {
          toast.success(
            successMessage ||
              t(operation.startsWith("delete") ? "deleted" : "saved"),
          );
          done?.();
        }
      } catch {
        setError("saveFailed");
        toast.error(t("saveFailed"));
      } finally {
        lock.current = false;
      }
    });
  }
  return { run, pending, error };
}
export function Modal({
  title,
  description,
  close,
  children,
  pending = false,
}: {
  title: string;
  description?: string;
  close: () => void;
  children: React.ReactNode;
  pending?: boolean;
}) {
  const t = useTranslations();
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) close();
      }}
    >
      <DialogContent showCloseButton={false} className="editor-modal">
        <div className="modal-heading">
          <DialogTitle>{title}</DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("close")}
            disabled={pending}
            onClick={close}
          >
            <X size={18} />
          </Button>
        </div>
        <DialogDescription className={description ? "muted" : "sr-only"}>
          {description || title}
        </DialogDescription>
        {children}
      </DialogContent>
    </Dialog>
  );
}
export function ConfirmButton({
  operation,
  id,
  label,
  title,
  description,
  destructive = false,
}: {
  operation: string;
  id: string;
  label: string;
  title: string;
  description: string;
  destructive?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { run, pending, error } = useMutation();
  const t = useTranslations();
  return (
    <>
      <Button
        variant={destructive ? "ghost" : "outline"}
        onClick={() => setOpen(true)}
        className={destructive ? "danger-text" : ""}
      >
        {label}
      </Button>
      {open && (
        <Modal
          title={title}
          description={description}
          close={() => setOpen(false)}
          pending={pending}
        >
          {error && (
            <p className="field-error" role="alert">
              {t(error)}
            </p>
          )}
          <div className="form-actions">
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              {t("cancel")}
            </Button>
            <Button
              variant={destructive ? "destructive" : "default"}
              disabled={pending}
              onClick={() => run(operation, { id }, () => setOpen(false))}
            >
              {t(pending ? "saving" : destructive ? "confirmDelete" : "pay")}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
export function TransactionButton({
  kind = "expense",
  entry,
  openedOn,
}: {
  kind?: "income" | "expense";
  entry?: Transaction;
  openedOn: string;
}) {
  const [id, setId] = useState<string | null>(null);
  const t = useTranslations();
  return (
    <>
      <Button
        variant={entry || kind === "income" ? "outline" : "default"}
        onClick={() => setId(entry?.id || crypto.randomUUID())}
      >
        {entry ? <Pencil size={14} /> : <Plus size={16} />}
        {t(
          entry ? "edit" : kind === "expense" ? "quickExpense" : "quickIncome",
        )}
      </Button>
      {id && (
        <TransactionEditor
          id={id}
          entry={entry}
          kind={kind}
          openedOn={openedOn}
          close={() => setId(null)}
        />
      )}
    </>
  );
}
function TransactionEditor({
  id,
  entry,
  kind,
  openedOn,
  close,
}: {
  id: string;
  entry?: Transaction;
  kind: "income" | "expense";
  openedOn: string;
  close: () => void;
}) {
  const t = useTranslations();
  const { run, pending, error } = useMutation();
  const [detailsOpen, setDetailsOpen] = useState(!!entry);
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<z.infer<typeof transactionSchema>>({
    resolver: zodResolver(transactionSchemaForWallet(openedOn)),
    mode: "onTouched",
    defaultValues: {
      id,
      kind: entry?.kind || kind,
      amount: entry ? moneyInput(entry.amount) : "",
      category: entry?.category || (kind === "income" ? "work" : "food"),
      note: entry?.note || "",
      occurred_on: entry?.occurred_on || todayInAddis(),
    },
  });
  const selectedKind = useWatch({ control, name: "kind" });
  const selectedCategory = useWatch({ control, name: "category" });
  const selectedDate = useWatch({ control, name: "occurred_on" });
  return (
    <Modal
      title={t(
        entry
          ? "editTransaction"
          : selectedKind === "expense"
            ? "quickExpense"
            : "quickIncome",
      )}
      close={close}
      pending={pending}
    >
      <form
        className="form-stack"
        noValidate
        onSubmit={handleSubmit(
          (v) =>
            run(
              "transaction",
              v,
              close,
              t(
                entry
                  ? "transactionUpdated"
                  : v.kind === "expense"
                    ? "expenseRecorded"
                    : "incomeRecorded",
              ),
            ),
          (invalid) => {
            if (invalid.occurred_on || invalid.note) setDetailsOpen(true);
          },
        )}
      >
        <fieldset className="form-stack entry-fields" disabled={pending}>
          <div className="transaction-kind" role="group" aria-label={t("type")}>
            {(["expense", "income"] as const).map((value) => (
              <button
                type="button"
                key={value}
                aria-pressed={selectedKind === value}
                disabled={pending}
                onClick={() => {
                  setValue("kind", value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                  setValue("category", value === "income" ? "work" : "food", {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }}
              >
                {t(value)}
              </button>
            ))}
          </div>
          <div className="amount-entry">
            <Field label={t("amount")} error={errors.amount?.message}>
              <Input
                autoFocus
                inputMode="decimal"
                placeholder="0.00"
                {...register("amount")}
                aria-invalid={!!errors.amount}
              />
            </Field>
          </div>
          <div
            className="category-shortcuts"
            role="group"
            aria-label={t("quickCategories")}
          >
            {(selectedKind === "expense"
              ? ["food", "transport", "data", "housing"]
              : [...incomeCategories]
            ).map((category) => (
              <button
                type="button"
                key={category}
                aria-pressed={selectedCategory === category}
                disabled={pending}
                onClick={() =>
                  setValue("category", category, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              >
                {t(`categories.${category}`)}
              </button>
            ))}
          </div>
          <Field label={t("category")} error={errors.category?.message}>
            <select {...register("category")} value={selectedCategory}>
              {(selectedKind === "expense"
                ? expenseCategories
                : incomeCategories
              ).map((c) => (
                <option key={c} value={c}>
                  {t(`categories.${c}`)}
                </option>
              ))}
            </select>
          </Field>
          <details
            className="form-disclosure"
            open={detailsOpen}
            onToggle={(event) => setDetailsOpen(event.currentTarget.open)}
          >
            <summary>
              <span>
                {t("transactionDetails")}
                <small>
                  {selectedDate === todayInAddis() ? t("today") : selectedDate}
                </small>
              </span>
              <ChevronDown size={18} />
            </summary>
            <div className="form-stack disclosure-body">
              <Field label={t("date")} error={errors.occurred_on?.message}>
                <Input
                  type="date"
                  min={openedOn}
                  max={todayInAddis()}
                  {...register("occurred_on")}
                />
              </Field>
              <Field label={t("note")} error={errors.note?.message}>
                <Input maxLength={240} {...register("note")} />
              </Field>
            </div>
          </details>
        </fieldset>
        {error && (
          <p className="field-error" role="alert">
            {t(error)}
          </p>
        )}
        <div className="form-actions">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={close}
          >
            {t("cancel")}
          </Button>
          <Button type="submit" disabled={pending}>
            {t(
              pending
                ? "saving"
                : entry
                  ? "save"
                  : selectedKind === "expense"
                    ? "quickExpense"
                    : "quickIncome",
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
export function CommitmentButton({ commitment }: { commitment?: Commitment }) {
  const t = useTranslations();
  const [id, setId] = useState<string | null>(null);
  return (
    <>
      <Button
        variant="outline"
        onClick={() => setId(commitment?.id || crypto.randomUUID())}
      >
        {commitment ? <Pencil size={14} /> : <Plus size={16} />}
        {t(commitment ? "edit" : "addCommitment")}
      </Button>
      {id && (
        <CommitmentEditor
          id={id}
          commitment={commitment}
          close={() => setId(null)}
        />
      )}
    </>
  );
}
function CommitmentEditor({
  id,
  commitment,
  close,
}: {
  id: string;
  commitment?: Commitment;
  close: () => void;
}) {
  const t = useTranslations();
  const { run, pending, error } = useMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof commitmentSchema>>({
    resolver: zodResolver(commitmentSchema),
    mode: "onTouched",
    defaultValues: {
      id,
      title: commitment?.title || "",
      amount: commitment ? moneyInput(commitment.amount) : "",
      due_on: commitment?.due_on || "",
    },
  });
  return (
    <Modal
      title={t(commitment ? "editCommitment" : "addCommitment")}
      close={close}
      pending={pending}
    >
      <form
        className="form-stack"
        noValidate
        onSubmit={handleSubmit((v) => run("commitment", v, close))}
      >
        <Field label={t("commitmentTitle")} error={errors.title?.message}>
          <Input autoFocus maxLength={100} {...register("title")} />
        </Field>
        <Field label={t("amount")} error={errors.amount?.message}>
          <Input
            inputMode="decimal"
            placeholder="0.00"
            {...register("amount")}
          />
        </Field>
        <Field label={t("dueDate")} error={errors.due_on?.message}>
          <Input type="date" {...register("due_on")} />
        </Field>
        {error && (
          <p className="field-error" role="alert">
            {t(error)}
          </p>
        )}
        <div className="form-actions">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={close}
          >
            {t("cancel")}
          </Button>
          <Button type="submit" disabled={pending}>
            {t(pending ? "saving" : "save")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
