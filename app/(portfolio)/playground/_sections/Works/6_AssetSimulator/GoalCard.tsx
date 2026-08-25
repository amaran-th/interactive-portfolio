"use client";

import { Target } from "lucide-react";
import { useMemo, useState } from "react";
import CustomSelect from "./CustomSelect";
import { findGoalAchievementMonth } from "./simulation";
import {
  AssetClass,
  Goal,
  GoalMetric,
  Group,
  SimulationInput,
  formatKRW,
  formatMonthsFromNow,
  toRealValue,
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
  today: Date;
  inflationEnabled: boolean;
  inflationRate: number;
};

type MetricType = GoalMetric["type"];

function formatAchievementDate(monthIndex: number, today: Date): string {
  const date = new Date(today.getFullYear(), today.getMonth() + monthIndex, 1);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function GoalCard({
  goal,
  onSetGoal,
  assetClasses,
  groups,
  simulationInput,
  today,
  inflationEnabled,
  inflationRate,
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
  } else if (
    // Invalidate a stale targetId if the asset/group it points at no
    // longer exists (e.g. deleted elsewhere while this form was left
    // unsubmitted). Render-time check for the same reason as the sync
    // above — this file avoids useEffect for prop-driven state sync.
    // Only runs when `goal` did NOT just change this render: when it did,
    // the branch above already set a targetId that is valid by
    // construction against the current assetClasses/groups, so re-checking
    // it here against the (still-stale, pre-render) local targetId/metricType
    // would incorrectly clobber what was just set.
    targetId &&
    ((metricType === "asset" && !assetClasses.some((a) => a.id === targetId)) ||
      (metricType === "group" && !groups.some((g) => g.id === targetId)))
  ) {
    setTargetId("");
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
      if (!targetId || !assetClasses.some((a) => a.id === targetId)) return;
      metric = { type: "asset", assetId: targetId };
    } else {
      if (!targetId || !groups.some((g) => g.id === targetId)) return;
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

  return (
    <>
      <span className="text-gray-300">·</span>
      <Target className="h-4 w-4 shrink-0 text-gray-400" />
      <CustomSelect
        value={metricType}
        onChange={(v) => {
          setMetricType(v as MetricType);
          setTargetId("");
        }}
        options={METRIC_TYPE_OPTIONS}
        className="w-28 shrink-0"
      />
      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        type="number"
        placeholder="목표 금액(원)"
        className="w-36 rounded-full border border-gray-200 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-gray-400"
      />
      <button
        type="button"
        onClick={handleSubmit}
        className="shrink-0 rounded-full bg-gray-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
      >
        목표 설정
      </button>
      {goal && (
        <button
          type="button"
          onClick={handleClear}
          className="shrink-0 rounded-full px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          목표 해제
        </button>
      )}
      {metricType === "asset" && (
        <div className="w-full">
          <CustomSelect
            value={targetId}
            onChange={setTargetId}
            options={assetClasses.map((asset) => ({
              value: asset.id,
              label: asset.name,
            }))}
            placeholder="자산 선택"
          />
        </div>
      )}
      {metricType === "group" && (
        <div className="w-full">
          <CustomSelect
            value={targetId}
            onChange={setTargetId}
            options={groups.map((group) => ({
              value: group.id,
              label: group.name,
            }))}
            placeholder="그룹 선택"
          />
        </div>
      )}
      {goal && achievementMonth !== undefined && (
        <p className="w-full text-xs text-gray-500">
          {achievementMonth === null ? (
            <span className="text-rose-500">500년 내 달성 불가</span>
          ) : achievementMonth === 0 ? (
            <span className="text-emerald-600">이미 달성했습니다</span>
          ) : (
            <>
              목표 {formatKRW(goal.targetAmount)}
              {inflationEnabled && (
                <>
                  (오늘 가치 약{" "}
                  {formatKRW(
                    toRealValue(
                      goal.targetAmount,
                      achievementMonth,
                      inflationRate,
                    ),
                  )}
                  )
                </>
              )}{" "}
              · 약 {formatMonthsFromNow(achievementMonth)} (
              {formatAchievementDate(achievementMonth, today)}) 달성 예상
            </>
          )}
        </p>
      )}
    </>
  );
}
