"use client";

import { useRef, useState } from "react";
import { AssetClass, Currency, Group, NewAssetClassInput } from "../types";
import GroupPicker from "./GroupPicker";

type GroupAssetSectionProps = {
  groups: Group[];
  onAddGroup: (name: string) => string;
  assetClasses: AssetClass[];
  onAddAssetClass: (input: NewAssetClassInput) => void;
  onUpdateAssetClass: (id: string, input: NewAssetClassInput) => void;
  onRemoveAssetClass: (id: string) => void;
  onSetPrimaryAsset: (id: string) => void;
};

export default function GroupAssetSection({
  groups,
  onAddGroup,
  assetClasses,
  onAddAssetClass,
  onUpdateAssetClass,
  onRemoveAssetClass,
  onSetPrimaryAsset,
}: GroupAssetSectionProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [groupId, setGroupId] = useState("");
  const [currency, setCurrency] = useState<Currency>("KRW");
  const [balance, setBalance] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [returnRate, setReturnRate] = useState("0");
  const [makePrimary, setMakePrimary] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setGroupId("");
    setCurrency("KRW");
    setBalance("");
    setReturnRate("0");
    setMakePrimary(false);
  };

  const startEdit = (asset: AssetClass) => {
    setEditingId(asset.id);
    setName(asset.name);
    setGroupId(asset.groupId ?? "");
    setCurrency(asset.currency);
    setBalance(String(asset.initialBalance));
    setReturnRate(String(asset.annualReturnRate));
    setMakePrimary(asset.isPrimary);
    setShowAdvanced(asset.annualReturnRate !== 0);
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      nameRef.current?.focus();
      return;
    }
    const input: NewAssetClassInput = {
      name: name.trim(),
      groupId: groupId || undefined,
      currency,
      initialBalance: Number(balance) || 0,
      annualReturnRate: Number(returnRate) || 0,
      isPrimary: currency === "KRW" && makePrimary,
    };
    if (editingId) {
      onUpdateAssetClass(editingId, input);
    } else {
      onAddAssetClass(input);
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
    <div className="rounded-2xl border border-indigo-200 bg-white/70 p-4 backdrop-blur">
      <h3 className="text-sm font-semibold text-indigo-700">자산군</h3>
      <ul className="mt-2 flex flex-col gap-2">
        {assetClasses.map((asset) => {
          const group = groups.find((g) => g.id === asset.groupId);
          return (
            <li
              key={asset.id}
              onClick={() => startEdit(asset)}
              className="flex cursor-pointer items-center justify-between rounded-xl border border-indigo-100 bg-white/80 px-3 py-2 text-sm hover:border-indigo-300"
            >
              <span className="flex flex-1 items-center gap-2">
                <input
                  type="radio"
                  name="primary-asset"
                  checked={asset.isPrimary}
                  disabled={asset.currency === "USD"}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => onSetPrimaryAsset(asset.id)}
                />
                {group && (
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: group.color }}
                  />
                )}
                <span>{asset.name}</span>
                <span className="text-gray-400">
                  {asset.currency === "USD"
                    ? `$${asset.initialBalance.toLocaleString()}`
                    : `${asset.initialBalance.toLocaleString()}원`}
                </span>
                {asset.isPrimary && (
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-600">
                    기본 계좌
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveAssetClass(asset.id);
                }}
                className="text-gray-400 hover:text-gray-700"
              >
                ✕
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex flex-col gap-2" onKeyDown={handleKeyDown}>
        <div className="flex gap-2">
          <input
            ref={nameRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="자산군 이름"
            className="flex-1 rounded-full border border-indigo-200 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-indigo-400"
          />
          <GroupPicker
            groups={groups}
            value={groupId}
            onChange={setGroupId}
            onCreateGroup={onAddGroup}
          />
        </div>
        <div className="flex gap-2">
          <select
            value={currency}
            onChange={(e) => {
              const next = e.target.value as Currency;
              setCurrency(next);
              if (next === "USD") setMakePrimary(false);
            }}
            className="rounded-full border border-indigo-200 bg-white/80 px-3 py-1.5 text-sm"
          >
            <option value="KRW">KRW(원)</option>
            <option value="USD">USD(달러)</option>
          </select>
          <input
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            type="number"
            placeholder="현재 잔액"
            className="flex-1 rounded-full border border-indigo-200 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-indigo-400"
          />
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={makePrimary}
            disabled={currency === "USD"}
            onChange={(e) => setMakePrimary(e.target.checked)}
          />
          기본 계좌로 지정{currency === "USD" && " (KRW 자산만 가능)"}
        </label>
        <button
          type="button"
          onClick={() => setShowAdvanced((prev) => !prev)}
          className="self-start text-xs text-indigo-500 hover:text-indigo-700"
        >
          {showAdvanced ? "상세 옵션 숨기기" : "상세 옵션 보기"}
        </button>
        {showAdvanced && (
          <label className="flex items-center gap-2 text-xs text-gray-600">
            연 수익률(%)
            <input
              value={returnRate}
              onChange={(e) => setReturnRate(e.target.value)}
              type="number"
              className="w-20 rounded-full border border-indigo-200 bg-white/80 px-2 py-1"
            />
          </label>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSubmit}
            className="self-start rounded-full bg-indigo-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-600"
          >
            {editingId ? "저장" : "자산군 추가"}
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
    </div>
  );
}
