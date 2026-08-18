"use client";

import { useState } from "react";
import { IrregularCashflow, NewIrregularCashflowInput } from "../types";
import { monthIndexFromTargetDate } from "../simulation";

type IncomeSectionProps = {
  monthlyIncome: number;
  onChangeMonthlyIncome: (value: number) => void;
  irregularIncomes: IrregularCashflow[];
  onAddIrregularIncome: (input: NewIrregularCashflowInput) => void;
  onRemoveIrregularIncome: (id: string) => void;
  today: Date;
};

function toMonthInputValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function IncomeSection({
  monthlyIncome,
  onChangeMonthlyIncome,
  irregularIncomes,
  onAddIrregularIncome,
  onRemoveIrregularIncome,
  today,
}: IncomeSectionProps) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [targetDate, setTargetDate] = useState(toMonthInputValue(today));

  const handleAdd = () => {
    if (!name.trim() || !amount) return;
    onAddIrregularIncome({
      name: name.trim(),
      amount: Number(amount),
      targetDate,
    });
    setName("");
    setAmount("");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
        <h3 className="text-sm font-semibold text-gray-800">월 고정수입</h3>
        <input
          value={monthlyIncome || ""}
          onChange={(e) => onChangeMonthlyIncome(Number(e.target.value) || 0)}
          type="number"
          placeholder="월급 등"
          className="mt-2 w-full rounded-full border border-white/60 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-indigo-300"
        />
      </div>

      <div className="rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
        <h3 className="text-sm font-semibold text-gray-800">비정기 수입</h3>
        <ul className="mt-2 flex flex-col gap-2">
          {irregularIncomes.map((item) => {
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
                  onClick={() => onRemoveIrregularIncome(item.id)}
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
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 프리랜서 계약금"
            className="rounded-full border border-white/60 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-indigo-300"
          />
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            placeholder="금액"
            className="rounded-full border border-white/60 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-indigo-300"
          />
          <div className="flex items-center gap-2">
            <input
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              type="month"
              min={toMonthInputValue(today)}
              className="rounded-full border border-white/60 bg-white/80 px-3 py-1.5 text-sm"
            />
            <span className="text-xs text-gray-500">
              {monthIndexFromTargetDate(targetDate, today)}개월 후
            </span>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            className="self-start rounded-full bg-indigo-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-600"
          >
            추가
          </button>
        </div>
      </div>
    </div>
  );
}
