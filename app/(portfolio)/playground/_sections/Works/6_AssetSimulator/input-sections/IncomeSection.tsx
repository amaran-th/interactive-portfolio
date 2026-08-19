"use client";

import { useRef, useState } from "react";
import {
  FixedIncome,
  Group,
  HORIZON_MONTHS,
  IrregularCashflow,
  NewFixedIncomeInput,
  NewIrregularCashflowInput,
  formatMonthsFromNow,
} from "../types";
import { monthIndexFromTargetDate } from "../simulation";
import GroupPicker from "./GroupPicker";

type IncomeSectionProps = {
  groups: Group[];
  onAddGroup: (name: string) => string;
  fixedIncomes: FixedIncome[];
  onAddFixedIncome: (input: NewFixedIncomeInput) => void;
  onUpdateFixedIncome: (id: string, input: NewFixedIncomeInput) => void;
  onRemoveFixedIncome: (id: string) => void;
  irregularIncomes: IrregularCashflow[];
  onAddIrregularIncome: (input: NewIrregularCashflowInput) => void;
  onUpdateIrregularIncome: (id: string, input: NewIrregularCashflowInput) => void;
  onRemoveIrregularIncome: (id: string) => void;
  today: Date;
};

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function toMonthInputValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function IncomeSection({
  groups,
  onAddGroup,
  fixedIncomes,
  onAddFixedIncome,
  onUpdateFixedIncome,
  onRemoveFixedIncome,
  irregularIncomes,
  onAddIrregularIncome,
  onUpdateIrregularIncome,
  onRemoveIrregularIncome,
  today,
}: IncomeSectionProps) {
  const nextMonthValue = toMonthInputValue(addMonths(today, 1));

  const [fixedEditingId, setFixedEditingId] = useState<string | null>(null);
  const [fixedName, setFixedName] = useState("");
  const [fixedAmount, setFixedAmount] = useState("");
  const [fixedGroupId, setFixedGroupId] = useState("");
  const fixedNameRef = useRef<HTMLInputElement>(null);
  const fixedAmountRef = useRef<HTMLInputElement>(null);

  const [irregularEditingId, setIrregularEditingId] = useState<string | null>(
    null,
  );
  const [irregularName, setIrregularName] = useState("");
  const [irregularAmount, setIrregularAmount] = useState("");
  const [irregularDate, setIrregularDate] = useState(nextMonthValue);
  const [irregularError, setIrregularError] = useState<string | null>(null);
  const irregularNameRef = useRef<HTMLInputElement>(null);
  const irregularAmountRef = useRef<HTMLInputElement>(null);
  const irregularDateRef = useRef<HTMLInputElement>(null);

  const resetFixedForm = () => {
    setFixedEditingId(null);
    setFixedName("");
    setFixedAmount("");
    setFixedGroupId("");
  };

  const startEditFixed = (item: FixedIncome) => {
    setFixedEditingId(item.id);
    setFixedName(item.name);
    setFixedAmount(String(item.amount));
    setFixedGroupId(item.groupId ?? "");
  };

  const handleSubmitFixed = () => {
    if (!fixedName.trim()) {
      fixedNameRef.current?.focus();
      return;
    }
    if (!fixedAmount || Number(fixedAmount) === 0) {
      fixedAmountRef.current?.focus();
      return;
    }
    const input: NewFixedIncomeInput = {
      name: fixedName.trim(),
      amount: Number(fixedAmount),
      groupId: fixedGroupId || undefined,
    };
    if (fixedEditingId) {
      onUpdateFixedIncome(fixedEditingId, input);
    } else {
      onAddFixedIncome(input);
    }
    resetFixedForm();
  };

  const resetIrregularForm = () => {
    setIrregularEditingId(null);
    setIrregularName("");
    setIrregularAmount("");
    setIrregularDate(nextMonthValue);
    setIrregularError(null);
  };

  const startEditIrregular = (item: IrregularCashflow) => {
    setIrregularEditingId(item.id);
    setIrregularName(item.name);
    setIrregularAmount(String(item.amount));
    setIrregularDate(item.targetDate);
    setIrregularError(null);
  };

  const handleSubmitIrregular = () => {
    if (!irregularName.trim()) {
      irregularNameRef.current?.focus();
      return;
    }
    if (!irregularAmount || Number(irregularAmount) === 0) {
      irregularAmountRef.current?.focus();
      return;
    }
    const monthsFromNow = monthIndexFromTargetDate(irregularDate, today);
    if (monthsFromNow < 1 || monthsFromNow > HORIZON_MONTHS) {
      setIrregularError(
        `1개월 후부터 ${HORIZON_MONTHS}개월 후 사이의 날짜만 선택할 수 있습니다.`,
      );
      irregularDateRef.current?.focus();
      return;
    }
    setIrregularError(null);
    const input: NewIrregularCashflowInput = {
      name: irregularName.trim(),
      amount: Number(irregularAmount),
      targetDate: irregularDate,
    };
    if (irregularEditingId) {
      onUpdateIrregularIncome(irregularEditingId, input);
    } else {
      onAddIrregularIncome(input);
    }
    resetIrregularForm();
  };

  const handleFixedKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmitFixed();
    }
  };

  const handleIrregularKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmitIrregular();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-emerald-200 bg-white/70 p-4 backdrop-blur">
        <h3 className="text-sm font-semibold text-emerald-700">고정수입</h3>
        <ul className="mt-2 flex flex-col gap-2">
          {fixedIncomes.map((item) => {
            const group = groups.find((g) => g.id === item.groupId);
            return (
              <li
                key={item.id}
                onClick={() => startEditFixed(item)}
                className="flex cursor-pointer items-center justify-between rounded-xl border border-emerald-100 bg-white/80 px-3 py-2 text-sm hover:border-emerald-300"
              >
                <span className="flex items-center gap-2">
                  {group && (
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: group.color }}
                    />
                  )}
                  {item.name} · {item.amount.toLocaleString()}원/월
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFixedIncome(item.id);
                  }}
                  className="text-gray-400 hover:text-gray-700"
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
        <div className="mt-3 flex flex-col gap-2" onKeyDown={handleFixedKeyDown}>
          <div className="flex gap-2">
            <input
              ref={fixedNameRef}
              value={fixedName}
              onChange={(e) => setFixedName(e.target.value)}
              placeholder="예: 월급, 부수입"
              className="flex-1 rounded-full border border-emerald-200 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-emerald-400"
            />
            <GroupPicker
              groups={groups}
              value={fixedGroupId}
              onChange={setFixedGroupId}
              onCreateGroup={onAddGroup}
            />
          </div>
          <input
            ref={fixedAmountRef}
            value={fixedAmount}
            onChange={(e) => setFixedAmount(e.target.value)}
            type="number"
            placeholder="금액"
            className="rounded-full border border-emerald-200 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-emerald-400"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSubmitFixed}
              className="self-start rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-600"
            >
              {fixedEditingId ? "저장" : "추가"}
            </button>
            {fixedEditingId && (
              <button
                type="button"
                onClick={resetFixedForm}
                className="self-start rounded-full px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700"
              >
                취소
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-white/70 p-4 backdrop-blur">
        <h3 className="text-sm font-semibold text-emerald-700">비정기 수입</h3>
        <ul className="mt-2 flex flex-col gap-2">
          {irregularIncomes.map((item) => {
            const monthsFromNow = monthIndexFromTargetDate(
              item.targetDate,
              today,
            );
            return (
              <li
                key={item.id}
                onClick={() => startEditIrregular(item)}
                className="flex cursor-pointer items-center justify-between rounded-xl border border-emerald-100 bg-white/80 px-3 py-2 text-sm hover:border-emerald-300"
              >
                <span>
                  {item.name} · {item.amount.toLocaleString()}원 ·{" "}
                  {formatMonthsFromNow(monthsFromNow)}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveIrregularIncome(item.id);
                  }}
                  className="text-gray-400 hover:text-gray-700"
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
        <div
          className="mt-3 flex flex-col gap-2"
          onKeyDown={handleIrregularKeyDown}
        >
          <input
            ref={irregularNameRef}
            value={irregularName}
            onChange={(e) => setIrregularName(e.target.value)}
            placeholder="예: 프리랜서 계약금"
            className="rounded-full border border-emerald-200 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-emerald-400"
          />
          <input
            ref={irregularAmountRef}
            value={irregularAmount}
            onChange={(e) => setIrregularAmount(e.target.value)}
            type="number"
            placeholder="금액"
            className="rounded-full border border-emerald-200 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-emerald-400"
          />
          <div className="flex items-center gap-2">
            <input
              ref={irregularDateRef}
              value={irregularDate}
              onChange={(e) => setIrregularDate(e.target.value)}
              type="month"
              min={nextMonthValue}
              className="rounded-full border border-emerald-200 bg-white/80 px-3 py-1.5 text-sm"
            />
            <span className="text-xs text-gray-500">
              {formatMonthsFromNow(
                monthIndexFromTargetDate(irregularDate, today),
              )}
            </span>
          </div>
          {irregularError && (
            <p className="text-xs text-rose-500">{irregularError}</p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSubmitIrregular}
              className="self-start rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-600"
            >
              {irregularEditingId ? "저장" : "추가"}
            </button>
            {irregularEditingId && (
              <button
                type="button"
                onClick={resetIrregularForm}
                className="self-start rounded-full px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700"
              >
                취소
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
