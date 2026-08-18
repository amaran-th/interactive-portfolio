"use client";

import { useState } from "react";
import {
  AssetClass,
  NewTransferRuleInput,
  TransferFrequency,
  TransferMode,
  TransferRule,
} from "../types";

type TransferRuleSectionProps = {
  assetClasses: AssetClass[];
  transferRules: TransferRule[];
  onAddTransferRule: (input: NewTransferRuleInput) => void;
  onRemoveTransferRule: (id: string) => void;
};

export default function TransferRuleSection({
  assetClasses,
  transferRules,
  onAddTransferRule,
  onRemoveTransferRule,
}: TransferRuleSectionProps) {
  const [fromAssetId, setFromAssetId] = useState("");
  const [toAssetId, setToAssetId] = useState("");
  const [mode, setMode] = useState<TransferMode>("fixed");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<TransferFrequency>("monthly");

  const nameOf = (id: string) =>
    assetClasses.find((a) => a.id === id)?.name ?? "?";

  const handleAdd = () => {
    const from = fromAssetId || assetClasses[0]?.id;
    const to = toAssetId || assetClasses[1]?.id;
    if (!from || !to || from === to || !amount) return;
    onAddTransferRule({
      fromAssetId: from,
      toAssetId: to,
      mode,
      amount: Number(amount),
      frequency,
    });
    setAmount("");
  };

  return (
    <div className="rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
      <h3 className="text-sm font-semibold text-gray-800">이체 규칙</h3>
      <ul className="mt-2 flex flex-col gap-2">
        {transferRules.map((rule) => (
          <li
            key={rule.id}
            className="flex items-center justify-between rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm"
          >
            <span>
              {nameOf(rule.fromAssetId)} → {nameOf(rule.toAssetId)} ·{" "}
              {rule.mode === "fixed"
                ? `${rule.amount.toLocaleString()}원`
                : `${rule.amount}%`}{" "}
              · {rule.frequency === "monthly" ? "매월" : "매년"}
            </span>
            <button
              type="button"
              onClick={() => onRemoveTransferRule(rule.id)}
              className="text-gray-400 hover:text-gray-700"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <select
            value={fromAssetId || assetClasses[0]?.id || ""}
            onChange={(e) => setFromAssetId(e.target.value)}
            className="flex-1 rounded-full border border-white/60 bg-white/80 px-3 py-1.5 text-sm"
          >
            {assetClasses.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name}
              </option>
            ))}
          </select>
          <span className="text-gray-400">→</span>
          <select
            value={toAssetId || assetClasses[1]?.id || ""}
            onChange={(e) => setToAssetId(e.target.value)}
            className="flex-1 rounded-full border border-white/60 bg-white/80 px-3 py-1.5 text-sm"
          >
            {assetClasses.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as TransferMode)}
            className="rounded-full border border-white/60 bg-white/80 px-3 py-1.5 text-sm"
          >
            <option value="fixed">고정 금액</option>
            <option value="percentOfSource">출발 잔액 비율(%)</option>
          </select>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            placeholder={mode === "fixed" ? "금액" : "%"}
            className="w-24 rounded-full border border-white/60 bg-white/80 px-3 py-1.5 text-sm"
          />
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as TransferFrequency)}
            className="rounded-full border border-white/60 bg-white/80 px-3 py-1.5 text-sm"
          >
            <option value="monthly">매월</option>
            <option value="yearly">매년</option>
          </select>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={assetClasses.length < 2}
          className="self-start rounded-full bg-indigo-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          이체 규칙 추가
        </button>
      </div>
    </div>
  );
}
