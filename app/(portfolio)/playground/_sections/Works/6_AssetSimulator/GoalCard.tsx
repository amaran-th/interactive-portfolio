"use client";

import { ArrowRight, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
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
  const suppressBlurCommit = useRef(false);

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

  const revertAmount = () => {
    setAmount(goal ? String(goal.targetAmount) : "");
  };

  const commitAmount = () => {
    if (suppressBlurCommit.current) {
      suppressBlurCommit.current = false;
      return;
    }
    const targetAmount = Number(amount);
    if (!targetAmount || targetAmount <= 0) {
      revertAmount();
      setIsEditing(false);
      return;
    }
    let metric: GoalMetric;
    if (metricType === "total") {
      metric = { type: "total" };
    } else if (metricType === "asset") {
      if (!targetId || !assetClasses.some((a) => a.id === targetId)) {
        revertAmount();
        setIsEditing(false);
        return;
      }
      metric = { type: "asset", assetId: targetId };
    } else {
      if (!targetId || !groups.some((g) => g.id === targetId)) {
        revertAmount();
        setIsEditing(false);
        return;
      }
      metric = { type: "group", groupId: targetId };
    }
    onSetGoal({ metric, targetAmount });
    setIsEditing(false);
  };

  const handleClear = () => {
    onSetGoal(null);
  };

  const targetOptions =
    metricType === "asset"
      ? assetClasses.map((asset) => ({ value: asset.id, label: asset.name }))
      : groups.map((group) => ({ value: group.id, label: group.name }));

  const needsTargetSelection =
    (metricType === "asset" || metricType === "group") && !targetId;

  const achievementLabel =
    goal && achievementMonth !== undefined
      ? achievementMonth === null
        ? "500년 내 불가"
        : achievementMonth === 0
          ? "달성"
          : formatMonthsFromNow(achievementMonth)
      : null;

  return (
    <div className="flex w-full flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-white/60 pt-2 text-sm">
      <CustomSelect
        value={metricType}
        onChange={(v) => {
          setMetricType(v as MetricType);
          setTargetId("");
          setIsEditing(true);
        }}
        options={METRIC_TYPE_OPTIONS}
        className="w-30 shrink-0"
      />
      {(metricType === "asset" || metricType === "group") && (
        <CustomSelect
          value={targetId}
          onChange={setTargetId}
          options={targetOptions}
          placeholder={metricType === "asset" ? "자산 선택" : "그룹 선택"}
          className="w-30 shrink-0"
        />
      )}
      {needsTargetSelection ? (
        <p className="text-xs text-gray-400">
          {metricType === "asset" ? "자산을" : "그룹을"} 선택하면 목표를
          설정할 수 있어요
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-gray-400">현재</span>
          <span className="font-semibold text-gray-800">
            {formatKRW(currentValue)}
          </span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-gray-300" />
          <span className="text-xs text-gray-400">목표</span>
          {isEditing || !goal ? (
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onBlur={commitAmount}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                } else if (e.key === "Escape") {
                  suppressBlurCommit.current = true;
                  revertAmount();
                  setIsEditing(!goal);
                  e.currentTarget.blur();
                }
              }}
              autoFocus
              type="number"
              placeholder="금액"
              className="w-24 rounded-full border border-gray-200 bg-white/80 px-2 py-0.5 text-sm outline-none focus:border-gray-400"
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="font-semibold text-gray-800 hover:text-indigo-600"
            >
              {formatKRW(goal!.targetAmount)}
            </button>
          )}
          {achievementLabel && (
            <span className="text-xs text-gray-400">
              · {achievementLabel} 예상
            </span>
          )}
          {goal && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="목표 해제"
              className="shrink-0 text-gray-300 hover:text-rose-500"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
