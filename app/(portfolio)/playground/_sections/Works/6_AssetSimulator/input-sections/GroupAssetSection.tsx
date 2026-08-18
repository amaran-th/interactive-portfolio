"use client";

import { useState } from "react";
import { AssetClass, Group, NewAssetClassInput } from "../types";

type GroupAssetSectionProps = {
  groups: Group[];
  onAddGroup: (name: string) => void;
  onRemoveGroup: (id: string) => void;
  assetClasses: AssetClass[];
  onAddAssetClass: (input: NewAssetClassInput) => void;
  onRemoveAssetClass: (id: string) => void;
  onSetPrimaryAsset: (id: string) => void;
};

export default function GroupAssetSection({
  groups,
  onAddGroup,
  onRemoveGroup,
  assetClasses,
  onAddAssetClass,
  onRemoveAssetClass,
  onSetPrimaryAsset,
}: GroupAssetSectionProps) {
  const [newGroupName, setNewGroupName] = useState("");
  const [newAssetName, setNewAssetName] = useState("");
  const [newAssetGroupId, setNewAssetGroupId] = useState("");
  const [newAssetBalance, setNewAssetBalance] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [newAssetReturnRate, setNewAssetReturnRate] = useState("0");

  const handleAddGroup = () => {
    if (!newGroupName.trim()) return;
    onAddGroup(newGroupName.trim());
    setNewGroupName("");
  };

  const handleAddAssetClass = () => {
    const groupId = newAssetGroupId || groups[0]?.id;
    if (!newAssetName.trim() || !groupId) return;
    onAddAssetClass({
      name: newAssetName.trim(),
      groupId,
      initialBalance: Number(newAssetBalance) || 0,
      annualReturnRate: Number(newAssetReturnRate) || 0,
      isPrimary: assetClasses.length === 0,
    });
    setNewAssetName("");
    setNewAssetBalance("");
    setNewAssetReturnRate("0");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
        <h3 className="text-sm font-semibold text-gray-800">그룹</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {groups.map((group) => (
            <span
              key={group.id}
              className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/80 px-3 py-1 text-sm"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: group.color }}
              />
              {group.name}
              <button
                type="button"
                onClick={() => onRemoveGroup(group.id)}
                className="text-gray-400 hover:text-gray-700"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="예: 저축, 투자"
            className="flex-1 rounded-full border border-white/60 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-indigo-300"
          />
          <button
            type="button"
            onClick={handleAddGroup}
            className="rounded-full bg-indigo-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-600"
          >
            추가
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
        <h3 className="text-sm font-semibold text-gray-800">자산군</h3>
        <ul className="mt-2 flex flex-col gap-2">
          {assetClasses.map((asset) => {
            const group = groups.find((g) => g.id === asset.groupId);
            return (
              <li
                key={asset.id}
                className="flex items-center justify-between rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm"
              >
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="primary-asset"
                    checked={asset.isPrimary}
                    onChange={() => onSetPrimaryAsset(asset.id)}
                  />
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: group?.color ?? "#ccc" }}
                  />
                  {asset.name}
                  <span className="text-gray-400">
                    {asset.initialBalance.toLocaleString()}원
                  </span>
                  {asset.isPrimary && (
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-600">
                      기본 계좌
                    </span>
                  )}
                </label>
                <button
                  type="button"
                  onClick={() => onRemoveAssetClass(asset.id)}
                  className="text-gray-400 hover:text-gray-700"
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-3 flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              value={newAssetName}
              onChange={(e) => setNewAssetName(e.target.value)}
              placeholder="자산군 이름"
              className="flex-1 rounded-full border border-white/60 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-indigo-300"
            />
            <select
              value={newAssetGroupId || groups[0]?.id || ""}
              onChange={(e) => setNewAssetGroupId(e.target.value)}
              className="rounded-full border border-white/60 bg-white/80 px-3 py-1.5 text-sm"
            >
              {groups.length === 0 && (
                <option value="">그룹을 먼저 추가하세요</option>
              )}
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>
          <input
            value={newAssetBalance}
            onChange={(e) => setNewAssetBalance(e.target.value)}
            type="number"
            placeholder="현재 잔액"
            className="rounded-full border border-white/60 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-indigo-300"
          />
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
                value={newAssetReturnRate}
                onChange={(e) => setNewAssetReturnRate(e.target.value)}
                type="number"
                className="w-20 rounded-full border border-white/60 bg-white/80 px-2 py-1"
              />
            </label>
          )}
          <button
            type="button"
            onClick={handleAddAssetClass}
            disabled={groups.length === 0}
            className="self-start rounded-full bg-indigo-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            자산군 추가
          </button>
        </div>
      </div>
    </div>
  );
}
