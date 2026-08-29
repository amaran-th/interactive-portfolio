"use client";

import { useEffect, useRef, useState } from "react";
import { HelpCircle, Inbox, Landmark, Plus, Settings, X } from "lucide-react";
import {
  AssetClass,
  Currency,
  GROUP_PALETTE,
  Group,
  NewAssetClassInput,
  nextVisibleColor,
  usedColors,
} from "../types";
import GroupPicker from "./GroupPicker";
import FloatingFormPanel from "./FloatingFormPanel";
import CustomSelect from "../CustomSelect";

const CURRENCY_OPTIONS = [
  { value: "KRW", label: "KRW(원)" },
  { value: "USD", label: "USD(달러)" },
];

type GroupAssetSectionProps = {
  groups: Group[];
  onAddGroup: (name: string, color: string) => string;
  onUpdateGroup: (id: string, input: { name: string; color: string }) => void;
  onRemoveGroup: (id: string) => void;
  assetClasses: AssetClass[];
  onAddAssetClass: (input: NewAssetClassInput) => void;
  onUpdateAssetClass: (id: string, input: NewAssetClassInput) => void;
  onRemoveAssetClass: (id: string) => void;
  onChangeAssetColor: (id: string, color: string) => void;
  isFormOpen: boolean;
  onOpenForm: () => void;
  onCloseForm: () => void;
};

export default function GroupAssetSection({
  groups,
  onAddGroup,
  onUpdateGroup,
  onRemoveGroup,
  assetClasses,
  onAddAssetClass,
  onUpdateAssetClass,
  onRemoveAssetClass,
  onChangeAssetColor,
  isFormOpen,
  onOpenForm,
  onCloseForm,
}: GroupAssetSectionProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [groupId, setGroupId] = useState("");
  const [currency, setCurrency] = useState<Currency>("KRW");
  const [balance, setBalance] = useState("");
  const [returnRate, setReturnRate] = useState("0");
  const [isLiability, setIsLiability] = useState(false);
  const [color, setColor] = useState(() => nextVisibleColor(groups, assetClasses));
  const [colorPickerId, setColorPickerId] = useState<string | null>(null);
  const [formColorPickerOpen, setFormColorPickerOpen] = useState(false);
  const [primaryHelpOpen, setPrimaryHelpOpen] = useState(false);
  const isFormVisible = isFormOpen || Boolean(editingId);
  // Income/expense assume the primary asset's balance is non-negative, so
  // it can't be turned into a liability.
  const isEditingPrimary = Boolean(
    editingId && assetClasses.find((a) => a.id === editingId)?.isPrimary,
  );

  const nameRef = useRef<HTMLInputElement>(null);
  const formColorPickerRef = useRef<HTMLDivElement>(null);
  const primaryHelpRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!formColorPickerOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        formColorPickerRef.current &&
        !formColorPickerRef.current.contains(e.target as Node)
      ) {
        setFormColorPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [formColorPickerOpen]);

  // Tap-to-toggle on mobile needs an outside-click close since there's no
  // hover/mouseleave there to dismiss it.
  useEffect(() => {
    if (!primaryHelpOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        primaryHelpRef.current &&
        !primaryHelpRef.current.contains(e.target as Node)
      ) {
        setPrimaryHelpOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [primaryHelpOpen]);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setGroupId("");
    setCurrency("KRW");
    setBalance("");
    setReturnRate("0");
    setIsLiability(false);
    setColor(nextVisibleColor(groups, assetClasses));
    setFormColorPickerOpen(false);
  };

  const startEdit = (asset: AssetClass) => {
    onOpenForm();
    setEditingId(asset.id);
    setName(asset.name);
    setGroupId(asset.groupId ?? "");
    setCurrency(asset.currency);
    setBalance(String(Math.abs(asset.initialBalance)));
    setReturnRate(String(asset.annualReturnRate));
    setIsLiability(asset.initialBalance < 0);
    setColor(asset.color);
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
      initialBalance: (isLiability ? -1 : 1) * (Number(balance) || 0),
      annualReturnRate: Number(returnRate) || 0,
      color,
    };
    if (editingId) {
      onUpdateAssetClass(editingId, input);
    } else {
      onAddAssetClass(input);
    }
    resetForm();
  };

  const formUsedColors = usedColors(
    groups,
    assetClasses.filter((a) => a.id !== editingId),
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      className={`relative min-w-[280px] basis-full rounded-2xl border border-indigo-200 bg-white/70 p-4 backdrop-blur ${
        isFormVisible ? "z-30" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-indigo-700">
          <Landmark className="h-4 w-4" /> 현재 자산
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
              ? "bg-indigo-500 text-white"
              : "text-indigo-600 hover:bg-indigo-100"
          }`}
          aria-label="입력 폼 토글"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>
      {assetClasses.length === 0 ? (
        <div className="mt-2 flex flex-col items-center gap-1.5 px-3 py-6 text-center text-xs text-gray-400">
          <Inbox className="h-4 w-4" />
          현재 보유한 자산 정보를 추가해주세요
        </div>
      ) : (
      <ul className="mt-2 flex flex-col gap-2">
        {assetClasses.map((asset) => {
          const group = groups.find((g) => g.id === asset.groupId);
          return (
            <li
              key={asset.id}
              className={`flex flex-col gap-1.5 rounded-xl border px-3 py-2 text-sm ${
                editingId === asset.id
                  ? "border-indigo-400 bg-indigo-50 ring-1 ring-indigo-200"
                  : "border-indigo-100 bg-white/80 hover:border-indigo-300"
              }`}
            >
              <div
                onClick={() => startEdit(asset)}
                className="flex cursor-pointer items-center justify-between"
              >
                <span className="flex flex-1 items-center gap-2">
                  {group ? (
                    // 그룹에 속한 자산은 개별 색상이 없다 — 그룹 색을 그대로 쓴다.
                    // 색은 그룹의 것이므로 그룹명을 색 옆에 붙여서 보여준다.
                    <span className="flex shrink-0 items-center gap-1">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
                        style={{ backgroundColor: group.color }}
                      />
                      <span className="text-xs text-gray-400">
                        {group.name}
                      </span>
                    </span>
                  ) : (
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
                  )}
                  <span>{asset.name}</span>
                  <span
                    className={
                      asset.initialBalance < 0
                        ? "text-rose-500"
                        : "text-gray-400"
                    }
                  >
                    {asset.currency === "USD"
                      ? `$${asset.initialBalance.toLocaleString()}`
                      : `${asset.initialBalance.toLocaleString()}원`}
                  </span>
                  {asset.isPrimary && (
                    <span
                      ref={primaryHelpRef}
                      className="relative inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-600"
                    >
                      기본 자산
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPrimaryHelpOpen((prev) => !prev);
                        }}
                        onMouseEnter={() => setPrimaryHelpOpen(true)}
                        onMouseLeave={() => setPrimaryHelpOpen(false)}
                        className="text-indigo-400 hover:text-indigo-600"
                        aria-label="기본 자산 설명 보기"
                      >
                        <HelpCircle className="h-3 w-3" />
                      </button>
                      {primaryHelpOpen && (
                        <span
                          onClick={(e) => e.stopPropagation()}
                          className="absolute top-full left-0 z-20 mt-1 w-48 rounded-lg border border-gray-200 bg-white p-2 text-[11px] font-normal text-gray-600 shadow-lg"
                        >
                          모든 수입과 지출은 기본자산을 통해 들어오고
                          나갑니다.
                        </span>
                      )}
                    </span>
                  )}
                </span>
                {!asset.isPrimary && (
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
                )}
              </div>
              {!group && colorPickerId === asset.id && (
                <div className="flex flex-wrap gap-1.5 pl-6">
                  {GROUP_PALETTE.map((color) => {
                    const taken =
                      color !== asset.color &&
                      usedColors(
                        groups,
                        assetClasses.filter((a) => a.id !== asset.id),
                      ).has(color);
                    return (
                      <button
                        key={color}
                        type="button"
                        disabled={taken}
                        onClick={(e) => {
                          e.stopPropagation();
                          onChangeAssetColor(asset.id, color);
                          setColorPickerId(null);
                        }}
                        className="relative h-5 w-5 rounded-full ring-1 ring-black/10 disabled:cursor-not-allowed"
                        style={{ backgroundColor: color }}
                        aria-label={
                          taken
                            ? `색상 ${color}는 이미 사용 중`
                            : `색상 ${color}로 변경`
                        }
                      >
                        {taken && (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <X
                              className="h-3 w-3 text-white drop-shadow-[0_0_1.5px_rgba(0,0,0,0.9)]"
                              strokeWidth={3}
                            />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      )}

      {isFormVisible && (
      <FloatingFormPanel
        onKeyDown={handleKeyDown}
        onClose={() => {
          resetForm();
          onCloseForm();
        }}
        className="border-indigo-200"
      >
        <div className="flex items-center gap-2">
          <div ref={formColorPickerRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setFormColorPickerOpen((prev) => !prev)}
              disabled={Boolean(groupId)}
              className="h-5 w-5 rounded-full ring-1 ring-black/10 disabled:cursor-not-allowed"
              style={{
                backgroundColor: groupId
                  ? (groups.find((g) => g.id === groupId)?.color ?? color)
                  : color,
              }}
              aria-label="자산 색상 선택"
            />
            {formColorPickerOpen && !groupId && (
              <div className="absolute top-full left-0 z-10 mt-1 flex w-36 flex-wrap gap-1.5 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
                {GROUP_PALETTE.map((c) => {
                  const taken = c !== color && formUsedColors.has(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      disabled={taken}
                      onClick={() => {
                        setColor(c);
                        setFormColorPickerOpen(false);
                      }}
                      className={`relative h-5 w-5 rounded-full ring-1 disabled:cursor-not-allowed ${
                        color === c ? "ring-2 ring-indigo-500" : "ring-black/10"
                      }`}
                      style={{ backgroundColor: c }}
                      aria-label={
                        taken ? `색상 ${c}는 이미 사용 중` : `색상 ${c}로 설정`
                      }
                    >
                      {taken && (
                        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30">
                          <X className="h-3 w-3 text-white" strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <input
            ref={nameRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="자산 이름"
            className="flex-1 rounded-full border border-indigo-200 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-indigo-400"
          />
          <GroupPicker
            groups={groups}
            assetClasses={assetClasses}
            value={groupId}
            onChange={setGroupId}
            onCreateGroup={onAddGroup}
            onUpdateGroup={onUpdateGroup}
            onRemoveGroup={onRemoveGroup}
            defaultColor={nextVisibleColor(groups, assetClasses)}
          />
        </div>
        {groupId && (
          <p className="pl-1 text-[11px] text-gray-400">
            그룹에 속한 자산은 그룹 색상을 따라요
          </p>
        )}
        <div className="flex gap-2">
          <CustomSelect
            value={currency}
            onChange={(v) => setCurrency(v as Currency)}
            options={CURRENCY_OPTIONS}
            borderClassName="border-indigo-200"
            className="w-32 shrink-0"
          />
          <input
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            type="number"
            placeholder={isLiability ? "대출/부채 금액" : "현재 잔액"}
            className="flex-1 rounded-full border border-indigo-200 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-indigo-400"
          />
        </div>
        <label
          className={`flex items-center gap-2 text-xs ${
            isEditingPrimary ? "text-gray-300" : "text-gray-600"
          }`}
        >
          <input
            type="checkbox"
            checked={isLiability}
            disabled={isEditingPrimary}
            onChange={(e) => setIsLiability(e.target.checked)}
          />
          부채로 추가(대출 등)
          {isEditingPrimary && " (기본 자산은 부채로 설정할 수 없어요)"}
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-600">
          {isLiability ? "연 이자율(%)" : "연 이율(%)"}
          <input
            value={returnRate}
            onChange={(e) => setReturnRate(e.target.value)}
            type="number"
            className="w-20 rounded-full border border-indigo-200 bg-white/80 px-2 py-1"
          />
        </label>
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
