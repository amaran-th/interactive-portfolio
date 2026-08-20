"use client";

import { useMemo, useState } from "react";
import {
  AssetClass,
  Goal,
  GoalMetric,
  Group,
  MonthSnapshot,
  SimulationInput,
  formatMonthsFromNow,
} from "./types";
import { findGoalAchievementMonth } from "./simulation";

type GoalCardProps = {
  goal: Goal | null;
  onSetGoal: (goal: Goal | null) => void;
  assetClasses: AssetClass[];
  groups: Group[];
  simulationInput: SimulationInput;
  today: Date;
  selectedSnapshot: MonthSnapshot;
};

type MetricType = GoalMetric["type"];

function metricValueFromSnapshot(
  metric: GoalMetric,
  snapshot: MonthSnapshot,
): number {
  if (metric.type === "total") return snapshot.totalBalance;
  if (metric.type === "asset") {
    return snapshot.assetBalancesKRW[metric.assetId] ?? 0;
  }
  return snapshot.groupTotals[metric.groupId] ?? 0;
}

function formatAchievementDate(monthIndex: number, today: Date): string {
  const date = new Date(
    today.getFullYear(),
    today.getMonth() + monthIndex,
    1,
  );
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function GoalCard({
  goal,
  onSetGoal,
  assetClasses,
  groups,
  simulationInput,
  today,
  selectedSnapshot,
}: GoalCardProps) {
  const [metricType, setMetricType] = useState<MetricType>("total");
  const [targetId, setTargetId] = useState("");
  const [amount, setAmount] = useState("");
  const [syncedGoal, setSyncedGoal] = useState<Goal | null>(null);

  // Adjust state during render when `goal` changes, instead of in an
  // effect (avoids the cascading-render anti-pattern for prop-driven
  // state sync; see https://react.dev/learn/you-might-not-need-an-effect).
  if (goal !== syncedGoal) {
    setSyncedGoal(goal);
    if (goal) {
      setMetricType(goal.metric.type);
      setTargetId(
        goal.metric.type === "asset"
          ? goal.metric.assetId
          : goal.metric.type === "group"
            ? goal.metric.groupId
            : "",
      );
      setAmount(String(goal.targetAmount));
    } else {
      setMetricType("total");
      setTargetId("");
      setAmount("");
    }
  }

  const achievementMonth = useMemo(() => {
    if (!goal) return undefined;
    return findGoalAchievementMonth(simulationInput, goal, today);
  }, [goal, simulationInput, today]);

  const handleSubmit = () => {
    const targetAmount = Number(amount);
    if (!targetAmount || targetAmount <= 0) return;
    let metric: GoalMetric;
    if (metricType === "total") {
      metric = { type: "total" };
    } else if (metricType === "asset") {
      if (!targetId) return;
      metric = { type: "asset", assetId: targetId };
    } else {
      if (!targetId) return;
      metric = { type: "group", groupId: targetId };
    }
    onSetGoal({ metric, targetAmount });
  };

  const handleClear = () => {
    onSetGoal(null);
    setMetricType("total");
    setTargetId("");
    setAmount("");
  };

  const currentValue = goal
    ? metricValueFromSnapshot(goal.metric, selectedSnapshot)
    : 0;
  const progressRatio =
    goal && goal.targetAmount > 0 ? currentValue / goal.targetAmount : 0;

  return (
    <div className="rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
      <h3 className="text-sm font-semibold text-gray-700">목표</h3>
      <div className="mt-2 flex flex-col gap-2">
        <div className="flex gap-2">
          <select
            value={metricType}
            onChange={(e) => {
              setMetricType(e.target.value as MetricType);
              setTargetId("");
            }}
            className="rounded-full border border-gray-200 bg-white/80 px-3 py-1.5 text-sm"
          >
            <option value="total">총자산</option>
            <option value="asset">특정 자산</option>
            <option value="group">특정 그룹</option>
          </select>
          {metricType === "asset" && (
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="flex-1 rounded-full border border-gray-200 bg-white/80 px-3 py-1.5 text-sm"
            >
              <option value="">자산 선택</option>
              {assetClasses.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.name}
                </option>
              ))}
            </select>
          )}
          {metricType === "group" && (
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="flex-1 rounded-full border border-gray-200 bg-white/80 px-3 py-1.5 text-sm"
            >
              <option value="">그룹 선택</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          type="number"
          placeholder="목표 금액(원)"
          className="rounded-full border border-gray-200 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-gray-400"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSubmit}
            className="self-start rounded-full bg-gray-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            목표 설정
          </button>
          {goal && (
            <button
              type="button"
              onClick={handleClear}
              className="self-start rounded-full px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              목표 해제
            </button>
          )}
        </div>
        {goal && (
          <div className="mt-1 rounded-xl bg-white/80 p-3 text-sm">
            {achievementMonth === undefined ? null : achievementMonth ===
              null ? (
              <p className="text-rose-500">500년 내 달성 불가</p>
            ) : achievementMonth === 0 ? (
              <p className="text-emerald-600">이미 달성했습니다</p>
            ) : (
              <p className="text-gray-700">
                약 {formatMonthsFromNow(achievementMonth)} (
                {formatAchievementDate(achievementMonth, today)}) 달성 예상
              </p>
            )}
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-indigo-500"
                style={{
                  width: `${Math.min(100, Math.max(0, progressRatio * 100))}%`,
                }}
              />
            </div>
            <p className="mt-1 text-xs text-gray-400">
              진행률 {Math.round(progressRatio * 100)}%
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
