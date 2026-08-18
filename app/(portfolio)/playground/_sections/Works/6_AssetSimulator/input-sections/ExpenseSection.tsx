"use client";

import { useState } from "react";
import {
  FixedExpense,
  IrregularCashflow,
  NewFixedExpenseInput,
  NewIrregularCashflowInput,
} from "../types";
import { monthIndexFromTargetDate } from "../simulation";

type ExpenseSectionProps = {
  fixedExpenses: FixedExpense[];
  onAddFixedExpense: (input: NewFixedExpenseInput) => void;
  onRemoveFixedExpense: (id: string) => void;
  irregularExpenses: IrregularCashflow[];
  onAddIrregularExpense: (input: NewIrregularCashflowInput) => void;
  onRemoveIrregularExpense: (id: string) => void;
  today: Date;
};

function toMonthInputValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function ExpenseSection({
  fixedExpenses,
  onAddFixedExpense,
  onRemoveFixedExpense,
  irregularExpenses,
  onAddIrregularExpense,
  onRemoveIrregularExpense,
  today,
}: ExpenseSectionProps) {
  const [fixedName, setFixedName] = useState("");
  const [fixedAmount, setFixedAmount] = useState("");
  const [irregularName, setIrregularName] = useState("");
  const [irregularAmount, setIrregularAmount] = useState("");
  const [irregularDate, setIrregularDate] = useState(
    toMonthInputValue(today),
  );

  const handleAddFixed = () => {
    if (!fixedName.trim() || !fixedAmount) return;
    onAddFixedExpense({ name: fixedName.trim(), amount: Number(fixedAmount) });
    setFixedName("");
    setFixedAmount("");
  };

  const handleAddIrregular = () => {
    if (!irregularName.trim() || !irregularAmount) return;
    onAddIrregularExpense({
      name: irregularName.trim(),
      amount: Number(irregularAmount),
      targetDate: irregularDate,
    });
    setIrregularName("");
    setIrregularAmount("");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
        <h3 className="text-sm font-semibold text-gray-800">고정지출</h3>
        <ul className="mt-2 flex flex-col gap-2">
          {fixedExpenses.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm"
            >
              <span>
                {item.name} · {item.amount.toLocaleString()}원/월
              </span>
              <button
                type="button"
                onClick={() => onRemoveFixedExpense(item.id)}
                className="text-gray-400 hover:text-gray-700"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex gap-2">
          <input
            value={fixedName}
            onChange={(e) => setFixedName(e.target.value)}
            placeholder="예: 월세, 구독료"
            className="flex-1 rounded-full border border-white/60 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-indigo-300"
          />
          <input
            value={fixedAmount}
            onChange={(e) => setFixedAmount(e.target.value)}
            type="number"
            placeholder="금액"
            className="w-28 rounded-full border border-white/60 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-indigo-300"
          />
          <button
            type="button"
            onClick={handleAddFixed}
            className="rounded-full bg-indigo-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-600"
          >
            추가
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
        <h3 className="text-sm font-semibold text-gray-800">비정기 지출</h3>
        <ul className="mt-2 flex flex-col gap-2">
          {irregularExpenses.map((item) => {
            const monthsFromNow = monthIndexFromTargetDate(
              item.targetDate,
              today,
            );
            return (
              <li
                key={item.id}
                className="flex items-center justify-between rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm"
              >
                <span>
                  {item.name} · {item.amount.toLocaleString()}원 ·{" "}
                  {monthsFromNow}개월 후
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveIrregularExpense(item.id)}
                  className="text-gray-400 hover:text-gray-700"
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
        <div className="mt-3 flex flex-col gap-2">
          <input
            value={irregularName}
            onChange={(e) => setIrregularName(e.target.value)}
            placeholder="예: 여행, 가전 교체"
            className="rounded-full border border-white/60 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-indigo-300"
          />
          <input
            value={irregularAmount}
            onChange={(e) => setIrregularAmount(e.target.value)}
            type="number"
            placeholder="금액"
            className="rounded-full border border-white/60 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-indigo-300"
          />
          <div className="flex items-center gap-2">
            <input
              value={irregularDate}
              onChange={(e) => setIrregularDate(e.target.value)}
              type="month"
              min={toMonthInputValue(today)}
              className="rounded-full border border-white/60 bg-white/80 px-3 py-1.5 text-sm"
            />
            <span className="text-xs text-gray-500">
              {monthIndexFromTargetDate(irregularDate, today)}개월 후
            </span>
          </div>
          <button
            type="button"
            onClick={handleAddIrregular}
            className="self-start rounded-full bg-indigo-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-600"
          >
            추가
          </button>
        </div>
      </div>
    </div>
  );
}
