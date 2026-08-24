"use client";

import { History, Inbox } from "lucide-react";
import { AssetClass, ExpenseItem, IncomeItem, MonthSnapshot, formatKRW } from "./types";
import { fires } from "./simulation";

type HistoryPanelProps = {
  snapshots: MonthSnapshot[];
  incomes: IncomeItem[];
  expenses: ExpenseItem[];
  assetClasses: AssetClass[];
  today: Date;
  selectedMonth: number;
};

type HistoryEntry = {
  key: string;
  month: number;
  kind: "income" | "expense" | "transfer";
  label: string;
  amount: number;
};

function formatMonthLabel(monthIndex: number, today: Date): string {
  const date = new Date(
    today.getFullYear(),
    today.getMonth() + monthIndex,
    1,
  );
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function HistoryPanel({
  snapshots,
  incomes,
  expenses,
  assetClasses,
  today,
  selectedMonth,
}: HistoryPanelProps) {
  if (selectedMonth === 0 || snapshots.length === 0) {
    return (
      <div className="rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
          <History className="h-4 w-4" /> 누적 이력
        </h3>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-400">
          <Inbox className="h-4 w-4" /> 슬라이더를 옮기면 지금부터의 이력이 나타납니다
        </p>
      </div>
    );
  }

  const nameOf = (id: string) =>
    assetClasses.find((a) => a.id === id)?.name ?? "?";

  let totalIncome = 0;
  let totalExpense = 0;
  let totalTransfer = 0;
  const entries: HistoryEntry[] = [];

  for (let month = 1; month <= selectedMonth; month++) {
    const snapshot = snapshots[month];
    if (!snapshot) continue;

    for (const item of incomes) {
      if (fires(item.schedule, month, today)) {
        entries.push({
          key: `income-${item.id}-${month}`,
          month,
          kind: "income",
          label: item.name,
          amount: item.amount,
        });
        totalIncome += item.amount;
      }
    }
    for (const item of expenses) {
      if (fires(item.schedule, month, today)) {
        entries.push({
          key: `expense-${item.id}-${month}`,
          month,
          kind: "expense",
          label: item.name,
          amount: item.amount,
        });
        totalExpense += item.amount;
      }
    }
    for (const transfer of snapshot.flow.transfers) {
      entries.push({
        key: `transfer-${transfer.ruleId}-${month}`,
        month,
        kind: "transfer",
        label: `${nameOf(transfer.fromAssetId)} → ${nameOf(transfer.toAssetId)}`,
        amount: transfer.amount,
      });
      totalTransfer += transfer.amount;
    }
  }

  const netIncome = totalIncome - totalExpense;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
        <History className="h-4 w-4" /> 누적 이력 (지금 ~ {formatMonthLabel(selectedMonth, today)})
      </h3>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-white/80 p-2">
          <p className="text-xs text-gray-400">총 수입</p>
          <p className="font-semibold text-emerald-600">
            {formatKRW(totalIncome)}
          </p>
        </div>
        <div className="rounded-xl bg-white/80 p-2">
          <p className="text-xs text-gray-400">총 지출</p>
          <p className="font-semibold text-rose-500">
            {formatKRW(totalExpense)}
          </p>
        </div>
        <div className="rounded-xl bg-white/80 p-2">
          <p className="text-xs text-gray-400">순수입</p>
          <p className="font-semibold text-gray-800">
            {formatKRW(netIncome)}
          </p>
        </div>
        <div className="rounded-xl bg-white/80 p-2">
          <p className="text-xs text-gray-400">이체 총액</p>
          <p className="font-semibold text-amber-600">
            {formatKRW(totalTransfer)}
          </p>
        </div>
      </div>
      <ul className="flex max-h-[400px] flex-col gap-1 overflow-y-auto text-xs">
        {entries.map((entry) => (
          <li
            key={entry.key}
            className="flex items-center justify-between rounded-lg bg-white/80 px-2 py-1.5"
          >
            <span className="text-gray-500">
              {formatMonthLabel(entry.month, today)} · {entry.label}
            </span>
            <span
              className={
                entry.kind === "income"
                  ? "text-emerald-600"
                  : entry.kind === "expense"
                    ? "text-rose-500"
                    : "text-amber-600"
              }
            >
              {entry.kind === "expense"
                ? "-"
                : entry.kind === "income"
                  ? "+"
                  : ""}
              {formatKRW(entry.amount)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
