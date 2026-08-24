"use client";

import { useRef, useState } from "react";
import { Landmark, Plus, Settings } from "lucide-react";
import {
  AssetClass,
  Currency,
  Goal,
  GROUP_PALETTE,
  Group,
  MonthSnapshot,
  NewAssetClassInput,
  SimulationInput,
} from "../types";
import GroupPicker from "./GroupPicker";
import GoalCard from "../GoalCard";
import FloatingFormPanel from "./FloatingFormPanel";
import CustomSelect from "../CustomSelect";

const CURRENCY_OPTIONS = [
  { value: "KRW", label: "KRW(원)" },
  { value: "USD", label: "USD(달러)" },
];

type GroupAssetSectionProps = {
  groups: Group[];
  assetGroups: Group[];
  onAddGroup: (name: string) => string;
  onUpdateGroup: (id: string, input: { name: string; color: string }) => void;
  onRemoveGroup: (id: string) => void;
  assetClasses: AssetClass[];
  onAddAssetClass: (input: NewAssetClassInput) => void;
  onUpdateAssetClass: (id: string, input: NewAssetClassInput) => void;
  onRemoveAssetClass: (id: string) => void;
  onSetPrimaryAsset: (id: string) => void;
  onChangeAssetColor: (id: string, color: string) => void;
  goal: Goal | null;
  onSetGoal: (goal: Goal | null) => void;
  simulationInput: SimulationInput;
  today: Date;
  selectedSnapshot: MonthSnapshot;
};

export default function GroupAssetSection({
  groups,
  assetGroups,
  onAddGroup,
  onUpdateGroup,
  onRemoveGroup,
  assetClasses,
  onAddAssetClass,
  onUpdateAssetClass,
  onRemoveAssetClass,
  onSetPrimaryAsset,
  onChangeAssetColor,
  goal,
  onSetGoal,
  simulationInput,
  today,
  selectedSnapshot,
}: GroupAssetSectionProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [groupId, setGroupId] = useState("");
  const [currency, setCurrency] = useState<Currency>("KRW");
  const [balance, setBalance] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [returnRate, setReturnRate] = useState("0");
  const [makePrimary, setMakePrimary] = useState(false);
  const [colorPickerId, setColorPickerId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const isFormVisible = showForm || Boolean(editingId);

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
    <div
      className={`relative rounded-2xl border border-indigo-200 bg-white/70 p-4 backdrop-blur md:col-span-2 ${
        isFormVisible ? "z-30" : ""
      }`}
    >
      <GoalCard
        goal={goal}
        onSetGoal={onSetGoal}
        assetClasses={assetClasses}
        groups={assetGroups}
        simulationInput={simulationInput}
        today={today}
        selectedSnapshot={selectedSnapshot}
      />
      <div className="mt-4 flex items-center justify-between border-t border-indigo-100 pt-4">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-indigo-700">
          <Landmark className="h-4 w-4" /> 현재 자산
        </h3>
        <button
          type="button"
          onClick={() => {
            if (isFormVisible) {
              resetForm();
              setShowForm(false);
            } else {
              setShowForm(true);
            }
          }}
          className={`rounded-full p-1.5 ${
            isFormVisible
              ? "bg-indigo-500 text-white"
              : "text-indigo-600 hover:bg-indigo-100"
          }`}
          aria-label="입력 폼 토글"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>
      <ul className="mt-2 flex flex-col gap-2">
        {assetClasses.map((asset) => {
          const group = groups.find((g) => g.id === asset.groupId);
          return (
            <li
              key={asset.id}
              className="flex flex-col gap-1.5 rounded-xl border border-indigo-100 bg-white/80 px-3 py-2 text-sm hover:border-indigo-300"
            >
              <div
                onClick={() => startEdit(asset)}
                className="flex cursor-pointer items-center justify-between"
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
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setColorPickerId((prev) =>
                        prev === asset.id ? null : asset.id,
                      );
                    }}
                    className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
                    style={{ backgroundColor: asset.color }}
                    aria-label="자산 색상 변경"
                  />
                  {group && (
                    <span
                      className="h-2.5 w-2.5 rounded-full ring-2 ring-white"
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
              </div>
              {colorPickerId === asset.id && (
                <div className="flex flex-wrap gap-1.5 pl-6">
                  {GROUP_PALETTE.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onChangeAssetColor(asset.id, color);
                        setColorPickerId(null);
                      }}
                      className="h-5 w-5 rounded-full ring-1 ring-black/10"
                      style={{ backgroundColor: color }}
                      aria-label={`색상 ${color}로 변경`}
                    />
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {isFormVisible && (
      <FloatingFormPanel onKeyDown={handleKeyDown} className="border-indigo-200">
        <div className="flex gap-2">
          <input
            ref={nameRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="자산 이름"
            className="flex-1 rounded-full border border-indigo-200 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-indigo-400"
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
        <div className="flex gap-2">
          <CustomSelect
            value={currency}
            onChange={(v) => {
              const next = v as Currency;
              setCurrency(next);
              if (next === "USD") setMakePrimary(false);
            }}
            options={CURRENCY_OPTIONS}
            borderClassName="border-indigo-200"
            className="w-32 shrink-0"
          />
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
            className="inline-flex items-center gap-1.5 self-start rounded-full bg-indigo-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-600"
          >
            {editingId ? (
              "저장"
            ) : (
              <>
                <Plus className="h-4 w-4" /> 자산 추가
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
