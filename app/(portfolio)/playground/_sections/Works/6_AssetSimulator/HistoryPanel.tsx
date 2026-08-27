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
  /** Measured height of the sibling charts column, so this panel matches it
   * exactly instead of growing to fit its own (potentially very long)
   * history list — the list scrolls internally within that budget. */
  maxHeight: number | null;
};

type HistoryEntry = {
  key: string;
  month: number;
  kind: "income" | "expense" | "transfer";
  label: string;
  amount: number;
  /** True when this occurrence didn't actually happen (insufficient balance). */
  failed?: boolean;
};

type MonthGroup = {
  month: number;
  year: number;
  monthOfYear: number;
  entries: HistoryEntry[];
};

type YearGroup = {
  year: number;
  months: MonthGroup[];
};

function formatMonthLabel(monthIndex: number, today: Date): string {
  const date = new Date(
    today.getFullYear(),
    today.getMonth() + monthIndex,
    1,
  );
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function groupByYearAndMonth(
  entries: HistoryEntry[],
  today: Date,
): YearGroup[] {
  const byMonth = new Map<number, HistoryEntry[]>();
  for (const entry of entries) {
    const list = byMonth.get(entry.month) ?? [];
    list.push(entry);
    byMonth.set(entry.month, list);
  }

  const yearMap = new Map<number, MonthGroup[]>();
  for (const month of Array.from(byMonth.keys()).sort((a, b) => a - b)) {
    const date = new Date(today.getFullYear(), today.getMonth() + month, 1);
    const year = date.getFullYear();
    const list = yearMap.get(year) ?? [];
    list.push({
      month,
      year,
      monthOfYear: date.getMonth() + 1,
      entries: byMonth.get(month)!,
    });
    yearMap.set(year, list);
  }

  return Array.from(yearMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([year, months]) => ({ year, months }));
}

export default function HistoryPanel({
  snapshots,
  incomes,
  expenses,
  assetClasses,
  today,
  selectedMonth,
  maxHeight,
}: HistoryPanelProps) {
  if (selectedMonth === 0 || snapshots.length === 0) {
    return (
      <div className="flex h-full flex-col rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
          <History className="h-4 w-4" /> 누적 이력
        </h3>
        <div className="flex flex-1 items-center justify-center">
          <p className="flex flex-col items-center gap-1.5 text-center text-sm text-gray-400">
            <Inbox className="h-4 w-4 shrink-0" />
            슬라이더를 옮기면 지금부터의 이력이 나타납니다
          </p>
        </div>
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
    const failedExpenseIds = new Set(
      snapshot.flow.failedExpenses.map((f) => f.itemId),
    );
    for (const item of expenses) {
      if (!fires(item.schedule, month, today)) continue;
      const failed = failedExpenseIds.has(item.id);
      entries.push({
        key: `expense-${item.id}-${month}`,
        month,
        kind: "expense",
        label: item.name,
        amount: item.amount,
        failed,
      });
      if (!failed) totalExpense += item.amount;
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
    for (const transfer of snapshot.flow.failedTransfers) {
      entries.push({
        key: `transfer-failed-${transfer.ruleId}-${month}`,
        month,
        kind: "transfer",
        label: `${nameOf(transfer.fromAssetId)} → ${nameOf(transfer.toAssetId)}`,
        amount: transfer.amount,
        failed: true,
      });
    }
  }

  const netIncome = totalIncome - totalExpense;
  const yearGroups = groupByYearAndMonth(entries, today);

  return (
    <div
      className="flex h-full min-h-0 max-h-150 flex-col gap-3 rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur"
      style={maxHeight != null ? { maxHeight } : undefined}
    >
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
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto text-xs">
        {yearGroups.map((yearGroup) => (
          <div key={yearGroup.year} className="flex flex-col gap-2">
            <p className="text-[11px] font-semibold text-gray-500">
              {yearGroup.year}년
            </p>
            {yearGroup.months.map((monthGroup) => (
              <div key={monthGroup.month} className="flex flex-col gap-1">
                <p className="pl-1 text-[11px] text-gray-400">
                  {monthGroup.monthOfYear}월
                </p>
                <ul className="flex flex-col gap-1">
                  {monthGroup.entries.map((entry) => (
                    <li
                      key={entry.key}
                      className={`flex items-center justify-between rounded-lg px-2 py-1.5 ${
                        entry.failed ? "bg-gray-100/80" : "bg-white/80"
                      }`}
                    >
                      <span className={entry.failed ? "text-gray-400" : "text-gray-500"}>
                        {entry.label}
                        {entry.failed && (
                          <span className="ml-1 text-[10px] text-gray-400">
                            (잔액 부족으로 중단)
                          </span>
                        )}
                      </span>
                      <span
                        className={
                          entry.failed
                            ? "text-gray-400 line-through"
                            : entry.kind === "income"
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
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
