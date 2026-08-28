"use client";

import { useEffect, useRef, useState } from "react";
import { GripVertical, Plus, Settings, TrendingUp } from "lucide-react";
import {
  Category,
  IncomeItem,
  NewIncomeItemInput,
  RepeatSchedule,
  addMonths,
  toMonthInputValue,
} from "../types";
import { validateSchedule } from "../simulation";
import CategoryPicker from "./CategoryPicker";
import ScheduleEditor from "./ScheduleEditor";
import FloatingFormPanel from "./FloatingFormPanel";
import { useDragReorder } from "./useDragReorder";

type IncomeSectionProps = {
  categories: Category[];
  onAddCategory: (name: string) => string;
  onUpdateCategory: (id: string, name: string) => void;
  onRemoveCategory: (id: string) => void;
  incomes: IncomeItem[];
  onAddIncome: (input: NewIncomeItemInput) => void;
  onUpdateIncome: (id: string, input: NewIncomeItemInput) => void;
  onRemoveIncome: (id: string) => void;
  onReorderIncome: (from: number, to: number) => void;
  isFormOpen: boolean;
  onOpenForm: () => void;
  onCloseForm: () => void;
  today: Date;
  horizonMonths: number;
};

function defaultSchedule(today: Date): RepeatSchedule {
  return {
    mode: "recurring",
    startDate: toMonthInputValue(addMonths(today, 1)),
    frequency: "monthly",
    until: { type: "indefinite" },
  };
}

function scheduleSummary(schedule: RepeatSchedule): string {
  if (schedule.mode === "once") return `${schedule.date} · 1회성`;
  const freq = schedule.frequency === "monthly" ? "매월" : "매년";
  if (schedule.until.type === "indefinite") return `${freq} · 무기한`;
  if (schedule.until.type === "count")
    return `${freq} · ${schedule.until.count}회`;
  return `${freq} · ${schedule.until.date}까지`;
}

export default function IncomeSection({
  categories,
  onAddCategory,
  onUpdateCategory,
  onRemoveCategory,
  incomes,
  onAddIncome,
  onUpdateIncome,
  onRemoveIncome,
  onReorderIncome,
  isFormOpen,
  onOpenForm,
  onCloseForm,
  today,
  horizonMonths,
}: IncomeSectionProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [schedule, setSchedule] = useState<RepeatSchedule>(
    defaultSchedule(today),
  );
  const [error, setError] = useState<string | null>(null);
  const isFormVisible = isFormOpen || Boolean(editingId);
  const listRef = useRef<HTMLUListElement>(null);
  const { registerItemRef, startDrag, getItemStyle } = useDragReorder(
    incomes.length,
    onReorderIncome,
    listRef,
  );
  const nameRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const prevCountRef = useRef(incomes.length);

  useEffect(() => {
    if (incomes.length > prevCountRef.current && listRef.current) {
      listRef.current.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
    prevCountRef.current = incomes.length;
  }, [incomes.length]);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setAmount("");
    setCategoryId("");
    setSchedule(defaultSchedule(today));
    setError(null);
  };

  const startEdit = (item: IncomeItem) => {
    onOpenForm();
    setEditingId(item.id);
    setName(item.name);
    setAmount(String(item.amount));
    setCategoryId(item.categoryId ?? "");
    setSchedule(item.schedule);
    setError(null);
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      nameRef.current?.focus();
      return;
    }
    if (!amount || Number(amount) === 0) {
      amountRef.current?.focus();
      return;
    }
    const scheduleError = validateSchedule(schedule, today, horizonMonths);
    if (scheduleError) {
      setError(scheduleError);
      return;
    }
    setError(null);
    const input: NewIncomeItemInput = {
      name: name.trim(),
      amount: Number(amount),
      categoryId: categoryId || undefined,
      schedule,
    };
    if (editingId) {
      onUpdateIncome(editingId, input);
    } else {
      onAddIncome(input);
    }
    resetForm();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      className={`relative min-w-[220px] basis-full @min-[500px]:flex-1 rounded-2xl border border-emerald-200 bg-white/70 p-4 backdrop-blur ${
        isFormVisible ? "z-30" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
          <TrendingUp className="h-4 w-4" /> 수입
        </h3>
        <button
          type="button"
          onClick={() => {
            if (isFormVisible) {
              resetForm();
              onCloseForm();
            } else {
              onOpenForm();
            }
          }}
          className={`rounded-full p-1.5 ${
            isFormVisible
              ? "bg-emerald-500 text-white"
              : "text-emerald-600 hover:bg-emerald-100"
          }`}
          aria-label="입력 폼 토글"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>
      <ul
        ref={listRef}
        className="mt-2 flex max-h-40 flex-col gap-2 overflow-y-auto @min-[500px]:max-h-80"
      >
        {incomes.map((item, index) => {
          const category = categories.find((c) => c.id === item.categoryId);
          return (
            <li
              key={item.id}
              ref={registerItemRef(index)}
              onClick={() => startEdit(item)}
              style={getItemStyle(index)}
              className={`flex cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm ${
                editingId === item.id
                  ? "border-emerald-400 bg-emerald-50 ring-1 ring-emerald-200"
                  : "border-emerald-100 bg-white/80 hover:border-emerald-300"
              }`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  onPointerDown={startDrag(index)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label="순서 변경"
                  className="shrink-0 touch-none cursor-grab text-gray-300 hover:text-gray-500 active:cursor-grabbing"
                >
                  <GripVertical className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="flex min-w-0 items-center gap-1.5 text-gray-800">
                    <span className="truncate font-medium">{item.name}</span>
                    {category && (
                      <span className="shrink-0 text-xs font-normal text-gray-400">
                        {category.name}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400">
                    {scheduleSummary(item.schedule)}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="font-semibold text-emerald-600">
                  {item.amount.toLocaleString()}원
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveIncome(item.id);
                  }}
                  className="text-gray-400 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {isFormVisible && (
      <FloatingFormPanel
        onKeyDown={handleKeyDown}
        onClose={() => {
          resetForm();
          onCloseForm();
        }}
        className="border-emerald-200"
      >
        <div className="flex gap-2">
          <input
            ref={nameRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 월급, 프리랜서 계약금"
            className="flex-1 rounded-full border border-emerald-200 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-emerald-400"
          />
          <CategoryPicker
            categories={categories}
            value={categoryId}
            onChange={setCategoryId}
            onCreateCategory={onAddCategory}
            onUpdateCategory={onUpdateCategory}
            onRemoveCategory={onRemoveCategory}
          />
        </div>
        <input
          ref={amountRef}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          type="number"
          placeholder="금액"
          className="rounded-full border border-emerald-200 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-emerald-400"
        />
        <ScheduleEditor value={schedule} onChange={setSchedule} today={today} />
        {error && <p className="text-xs text-rose-500">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSubmit}
            className="inline-flex items-center gap-1.5 self-start rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-600"
          >
            {editingId ? (
              "저장"
            ) : (
              <>
                <Plus className="h-4 w-4" /> 추가
              </>
            )}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="self-start rounded-full px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              취소
            </button>
          )}
        </div>
      </FloatingFormPanel>
      )}
    </div>
  );
}
