"use client";

import { useRef, useState } from "react";
import { ChevronDown, ChevronUp, Plus, TrendingUp } from "lucide-react";
import {
  Group,
  IncomeItem,
  NewIncomeItemInput,
  RepeatSchedule,
  addMonths,
  toMonthInputValue,
} from "../types";
import { validateSchedule } from "../simulation";
import GroupPicker from "./GroupPicker";
import ScheduleEditor from "./ScheduleEditor";

type IncomeSectionProps = {
  groups: Group[];
  onAddGroup: (name: string) => string;
  onUpdateGroup: (id: string, input: { name: string; color: string }) => void;
  onRemoveGroup: (id: string) => void;
  incomes: IncomeItem[];
  onAddIncome: (input: NewIncomeItemInput) => void;
  onUpdateIncome: (id: string, input: NewIncomeItemInput) => void;
  onRemoveIncome: (id: string) => void;
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
  groups,
  onAddGroup,
  onUpdateGroup,
  onRemoveGroup,
  incomes,
  onAddIncome,
  onUpdateIncome,
  onRemoveIncome,
  today,
  horizonMonths,
}: IncomeSectionProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [groupId, setGroupId] = useState("");
  const [schedule, setSchedule] = useState<RepeatSchedule>(
    defaultSchedule(today),
  );
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(true);
  const isFormVisible = showForm || Boolean(editingId);
  const nameRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setAmount("");
    setGroupId("");
    setSchedule(defaultSchedule(today));
    setError(null);
  };

  const startEdit = (item: IncomeItem) => {
    setEditingId(item.id);
    setName(item.name);
    setAmount(String(item.amount));
    setGroupId(item.groupId ?? "");
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
      groupId: groupId || undefined,
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
    <div className="rounded-2xl border border-emerald-200 bg-white/70 p-4 backdrop-blur">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
        <TrendingUp className="h-4 w-4" /> 수입
      </h3>
      <ul className="mt-2 flex flex-col gap-2">
        {incomes.map((item) => {
          const group = groups.find((g) => g.id === item.groupId);
          return (
            <li
              key={item.id}
              onClick={() => startEdit(item)}
              className="flex cursor-pointer items-center justify-between rounded-xl border border-emerald-100 bg-white/80 px-3 py-2 text-sm hover:border-emerald-300"
            >
              <span className="flex items-center gap-2">
                {group && (
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: group.color }}
                  />
                )}
                {item.name} · {item.amount.toLocaleString()}원 ·{" "}
                {scheduleSummary(item.schedule)}
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
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={() => setShowForm((prev) => !prev)}
        className="mt-3 inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700"
      >
        {isFormVisible ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
        입력 폼
      </button>
      {isFormVisible && (
      <div className="mt-2 flex flex-col gap-2" onKeyDown={handleKeyDown}>
        <div className="flex gap-2">
          <input
            ref={nameRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 월급, 프리랜서 계약금"
            className="flex-1 rounded-full border border-emerald-200 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-emerald-400"
          />
          <GroupPicker
            groups={groups}
            value={groupId}
            onChange={setGroupId}
            onCreateGroup={onAddGroup}
            onUpdateGroup={onUpdateGroup}
            onRemoveGroup={onRemoveGroup}
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
      </div>
      )}
    </div>
  );
}
