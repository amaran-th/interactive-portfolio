"use client";

import { Target, X } from "lucide-react";
import { useMemo, useState } from "react";
import CustomSelect from "./CustomSelect";
import { findGoalAchievementMonth } from "./simulation";
import {
  AssetClass,
  Goal,
  GoalMetric,
  Group,
  MonthSnapshot,
  SimulationInput,
  formatKRW,
  formatMonthsFromNow,
} from "./types";

const METRIC_TYPE_OPTIONS = [
  { value: "total", label: "총자산" },
  { value: "asset", label: "특정 자산" },
  { value: "group", label: "특정 그룹" },
];

type GoalCardProps = {
  goal: Goal | null;
  onSetGoal: (goal: Goal | null) => void;
  assetClasses: AssetClass[];
  groups: Group[];
  simulationInput: SimulationInput;
  snapshots: MonthSnapshot[];
  today: Date;
};

type MetricType = GoalMetric["type"];

function metricTargetIdOf(metric: GoalMetric): string {
  if (metric.type === "asset") return metric.assetId;
  if (metric.type === "group") return metric.groupId;
  return "";
}

export default function GoalCard({
  goal,
  onSetGoal,
  assetClasses,
  groups,
  simulationInput,
  snapshots,
  today,
}: GoalCardProps) {
  const [metricType, setMetricType] = useState<MetricType>("total");
  const [targetId, setTargetId] = useState("");
  const [amount, setAmount] = useState("");
  const [isEditing, setIsEditing] = useState(true);
  const [syncedGoal, setSyncedGoal] = useState<Goal | null>(null);

  // Adjust state during render when `goal` changes, instead of in an
  // effect (avoids the cascading-render anti-pattern for prop-driven
  // state sync; see https://react.dev/learn/you-might-not-need-an-effect).
  if (goal !== syncedGoal) {
    setSyncedGoal(goal);
    setIsEditing(!goal);
    if (goal) {
      setMetricType(goal.metric.type);
      setTargetId(metricTargetIdOf(goal.metric));
      setAmount(String(goal.targetAmount));
    } else {
      setMetricType("total");
      setTargetId("");
      setAmount("");
    }
  } else if (
    // Invalidate a stale targetId if the asset/group it points at no
    // longer exists (e.g. deleted elsewhere while this form was left
    // unsubmitted). Render-time check for the same reason as the sync
    // above — this file avoids useEffect for prop-driven state sync.
    targetId &&
    ((metricType === "asset" && !assetClasses.some((a) => a.id === targetId)) ||
      (metricType === "group" && !groups.some((g) => g.id === targetId)))
  ) {
    setTargetId("");
  }

  const currentValue = useMemo(() => {
    const snapshot = snapshots[0];
    if (!snapshot) return 0;
    if (metricType === "total") return snapshot.totalBalance;
    if (!targetId) return 0;
    return metricType === "asset"
      ? (snapshot.assetBalancesKRW[targetId] ?? 0)
      : (snapshot.groupTotals[targetId] ?? 0);
  }, [snapshots, metricType, targetId]);

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
      if (!targetId || !assetClasses.some((a) => a.id === targetId)) return;
      metric = { type: "asset", assetId: targetId };
    } else {
      if (!targetId || !groups.some((g) => g.id === targetId)) return;
      metric = { type: "group", groupId: targetId };
    }
    onSetGoal({ metric, targetAmount });
  };

  const handleCancelEdit = () => {
    if (goal) {
      setMetricType(goal.metric.type);
      setTargetId(metricTargetIdOf(goal.metric));
      setAmount(String(goal.targetAmount));
    }
    setIsEditing(false);
  };

  const handleClear = () => {
    onSetGoal(null);
  };

  const targetOptions =
    metricType === "asset"
      ? assetClasses.map((asset) => ({ value: asset.id, label: asset.name }))
      : groups.map((group) => ({ value: group.id, label: group.name }));

  return (
    <div className="flex w-full flex-wrap items-end gap-x-3 gap-y-1.5 border-t border-white/60 pt-2">
      <div className="flex items-center gap-1.5">
        <Target className="h-3.5 w-3.5 shrink-0 text-gray-400" />
        <CustomSelect
          value={metricType}
          onChange={(v) => {
            setMetricType(v as MetricType);
            setTargetId("");
            setIsEditing(true);
          }}
          options={METRIC_TYPE_OPTIONS}
          className="w-24 shrink-0"
        />
        {(metricType === "asset" || metricType === "group") && (
          <CustomSelect
            value={targetId}
            onChange={setTargetId}
            options={targetOptions}
            placeholder={metricType === "asset" ? "자산 선택" : "그룹 선택"}
            className="w-24 shrink-0"
          />
        )}
      </div>
      <div className="flex flex-1 items-end justify-between gap-2">
        <div className="flex flex-col items-start">
          <span className="text-[10px] text-gray-400">현재</span>
          <span className="text-sm font-semibold text-gray-800">
            {formatKRW(currentValue)}
          </span>
        </div>
        <div className="flex flex-1 flex-col items-center px-1">
          <span className="whitespace-nowrap text-[10px] text-gray-400">
            {goal && achievementMonth !== undefined
              ? achievementMonth === null
                ? "500년 내 불가"
                : achievementMonth === 0
                  ? "달성"
                  : formatMonthsFromNow(achievementMonth)
              : ""}
          </span>
          <div className="flex w-full items-center text-gray-300">
            <span className="h-px flex-1 bg-gray-300" />
            <span className="text-xs">▸</span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-gray-400">목표</span>
          {isEditing ? (
            <div className="flex items-center gap-1">
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                type="number"
                placeholder="금액"
                className="w-24 rounded-full border border-gray-200 bg-white/80 px-2 py-0.5 text-right text-sm outline-none focus:border-gray-400"
              />
              <button
                type="button"
                onClick={handleSubmit}
                aria-label="목표 저장"
                className="shrink-0 rounded-full bg-gray-700 px-2 py-0.5 text-xs font-medium text-white hover:bg-gray-800"
              >
                저장
              </button>
              {goal && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  aria-label="편집 취소"
                  className="shrink-0 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="text-sm font-semibold text-gray-800 hover:text-indigo-600"
              >
                {formatKRW(goal!.targetAmount)}
              </button>
              <button
                type="button"
                onClick={handleClear}
                aria-label="목표 해제"
                className="shrink-0 text-gray-300 hover:text-rose-500"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
