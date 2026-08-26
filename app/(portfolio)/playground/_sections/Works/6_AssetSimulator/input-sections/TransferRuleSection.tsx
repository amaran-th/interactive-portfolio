"use client";

import { ArrowLeftRight, GripVertical, Plus, Settings } from "lucide-react";
import { useRef, useState } from "react";
import CustomSelect from "../CustomSelect";
import { validateSchedule } from "../simulation";
import {
  AssetClass,
  NewTransferRuleInput,
  RepeatSchedule,
  TransferMode,
  TransferRule,
  addMonths,
  toMonthInputValue,
} from "../types";
import FloatingFormPanel from "./FloatingFormPanel";
import ScheduleEditor from "./ScheduleEditor";
import { useDragReorder } from "./useDragReorder";

const TRANSFER_MODE_OPTIONS = [
  { value: "fixed", label: "고정 금액" },
  { value: "percentOfSource", label: "출발 잔액 비율(%)" },
];

type TransferRuleSectionProps = {
  assetClasses: AssetClass[];
  transferRules: TransferRule[];
  onAddTransferRule: (input: NewTransferRuleInput) => void;
  onUpdateTransferRule: (id: string, input: NewTransferRuleInput) => void;
  onRemoveTransferRule: (id: string) => void;
  onReorderTransferRule: (from: number, to: number) => void;
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

export default function TransferRuleSection({
  assetClasses,
  transferRules,
  onAddTransferRule,
  onUpdateTransferRule,
  onRemoveTransferRule,
  onReorderTransferRule,
  isFormOpen,
  onOpenForm,
  onCloseForm,
  today,
  horizonMonths,
}: TransferRuleSectionProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fromAssetId, setFromAssetId] = useState("");
  const [toAssetId, setToAssetId] = useState("");
  const [mode, setMode] = useState<TransferMode>("fixed");
  const [amount, setAmount] = useState("");
  const [schedule, setSchedule] = useState<RepeatSchedule>(
    defaultSchedule(today),
  );
  const [error, setError] = useState<string | null>(null);
  const isFormVisible = isFormOpen || Boolean(editingId);
  const { registerItemRef, startDrag, getItemStyle } = useDragReorder(
    transferRules.length,
    onReorderTransferRule,
  );
  const amountRef = useRef<HTMLInputElement>(null);

  const nameOf = (id: string) =>
    assetClasses.find((a) => a.id === id)?.name ?? "?";

  const effectiveFrom = fromAssetId || assetClasses[0]?.id || "";
  const fromAsset = assetClasses.find((a) => a.id === effectiveFrom);
  const sameCurrencyAssets = assetClasses.filter(
    (a) => a.id !== effectiveFrom && a.currency === fromAsset?.currency,
  );
  const effectiveTo =
    toAssetId && sameCurrencyAssets.some((a) => a.id === toAssetId)
      ? toAssetId
      : sameCurrencyAssets[0]?.id || "";

  const resetForm = () => {
    setEditingId(null);
    setFromAssetId("");
    setToAssetId("");
    setMode("fixed");
    setAmount("");
    setSchedule(defaultSchedule(today));
    setError(null);
  };

  const startEdit = (rule: TransferRule) => {
    onOpenForm();
    setEditingId(rule.id);
    setFromAssetId(rule.fromAssetId);
    setToAssetId(rule.toAssetId);
    setMode(rule.mode);
    setAmount(String(rule.amount));
    setSchedule(rule.schedule);
    setError(null);
  };

  const handleSubmit = () => {
    if (!effectiveFrom || !effectiveTo || effectiveFrom === effectiveTo) {
      setError("이체할 수 있는 같은 통화의 자산이 2개 이상 필요합니다.");
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
    const input: NewTransferRuleInput = {
      fromAssetId: effectiveFrom,
      toAssetId: effectiveTo,
      mode,
      amount: Number(amount),
      schedule,
    };
    if (editingId) {
      onUpdateTransferRule(editingId, input);
    } else {
      onAddTransferRule(input);
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
      className={`relative min-w-55 basis-full @min-[500px]:flex-1 rounded-2xl border border-amber-200 bg-white/70 p-4 backdrop-blur ${
        isFormVisible ? "z-30" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-amber-700">
          <ArrowLeftRight className="h-4 w-4" /> 자산 내 이체
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
              ? "bg-amber-500 text-white"
              : "text-amber-600 hover:bg-amber-100"
          }`}
          aria-label="입력 폼 토글"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>
      <ul className="mt-2 flex flex-col gap-2">
        {transferRules.map((rule, index) => (
          <li
            key={rule.id}
            ref={registerItemRef(index)}
            onClick={() => startEdit(rule)}
            style={getItemStyle(index)}
            className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-amber-100 bg-white/80 px-3 py-2 text-sm hover:border-amber-300"
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
                <p className="truncate font-medium text-gray-800">
                  {nameOf(rule.fromAssetId)} → {nameOf(rule.toAssetId)}
                </p>
                <p className="text-xs text-gray-400">
                  {scheduleSummary(rule.schedule)}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="font-semibold text-amber-600">
                {rule.mode === "fixed"
                  ? `${rule.amount.toLocaleString()}원`
                  : `${rule.amount}%`}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveTransferRule(rule.id);
                }}
                className="text-gray-400 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
          </li>
        ))}
      </ul>

      {isFormVisible && (
        <FloatingFormPanel
          onKeyDown={handleKeyDown}
          className="border-amber-200"
        >
          <div className="flex items-center gap-2">
            <CustomSelect
              value={effectiveFrom}
              onChange={(v) => {
                setFromAssetId(v);
                setToAssetId("");
              }}
              options={assetClasses.map((asset) => ({
                value: asset.id,
                label: `${asset.name}(${asset.currency})`,
              }))}
              borderClassName="border-amber-200"
              className="min-w-0 flex-1"
            />
            <span className="text-gray-400">→</span>
            <CustomSelect
              value={effectiveTo}
              onChange={setToAssetId}
              options={sameCurrencyAssets.map((asset) => ({
                value: asset.id,
                label: `${asset.name}(${asset.currency})`,
              }))}
              placeholder="같은 통화 자산이 없습니다"
              disabled={sameCurrencyAssets.length === 0}
              borderClassName="border-amber-200"
              className="min-w-0 flex-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <CustomSelect
              value={mode}
              onChange={(v) => setMode(v as TransferMode)}
              options={TRANSFER_MODE_OPTIONS}
              borderClassName="border-amber-200"
              className="w-44 shrink-0"
            />
            <input
              ref={amountRef}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="number"
              placeholder={mode === "fixed" ? "금액" : "%"}
              className="w-24 rounded-full border border-amber-200 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-amber-400"
            />
          </div>
          <ScheduleEditor
            value={schedule}
            onChange={setSchedule}
            today={today}
          />
          {error && <p className="text-xs text-rose-500">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={sameCurrencyAssets.length === 0}
              className="inline-flex items-center gap-1.5 self-start rounded-full bg-amber-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {editingId ? (
                "저장"
              ) : (
                <>
                  <Plus className="h-4 w-4" /> 이체 규칙 추가
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
