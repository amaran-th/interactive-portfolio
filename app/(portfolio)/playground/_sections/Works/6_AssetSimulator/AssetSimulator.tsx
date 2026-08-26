"use client";

import { useEffect, useMemo, useState } from "react";
import AssetAreaChart from "./AssetAreaChart";
import ComparisonBarChart from "./ComparisonBarChart";
import FlowDiagram from "./FlowDiagram";
import GroupDonutChart from "./GroupDonutChart";
import HistoryPanel from "./HistoryPanel";
import InputPanel from "./InputPanel";
import ScenarioComparisonChart from "./ScenarioComparisonChart";
import ScenarioTabs from "./ScenarioTabs";
import Switch from "./Switch";
import { findGoalAchievementMonth } from "./simulation";
import {
  AssetClass,
  DEFAULT_HORIZON_YEARS,
  Goal,
  HORIZON_PRESET_YEARS,
  NewAssetClassInput,
  NewExpenseItemInput,
  NewIncomeItemInput,
  NewTransferRuleInput,
  RepeatSchedule,
  Scenario,
  SimulationInput,
  addMonths,
  newId,
  nextAssetColor,
  nextGroupColor,
  toMonthInputValue,
} from "./types";
import { useSimulation } from "./useSimulation";

function withGuaranteedPrimary(assets: AssetClass[]): AssetClass[] {
  if (assets.some((a) => a.isPrimary && a.currency === "KRW")) {
    return assets;
  }
  const candidate = assets.find((a) => a.currency === "KRW");
  if (!candidate) return assets;
  return assets.map((a) => ({ ...a, isPrimary: a.id === candidate.id }));
}

const CHART_PANEL_COUNT_ARRAY = [0, 1, 2] as const;

function goalReferences(
  goal: Goal | null,
  kind: "asset" | "group",
  id: string,
): boolean {
  if (!goal) return false;
  if (kind === "asset") {
    return goal.metric.type === "asset" && goal.metric.assetId === id;
  }
  return goal.metric.type === "group" && goal.metric.groupId === id;
}

function emptyScenario(name: string): Scenario {
  return {
    id: newId(),
    name,
    groups: [],
    assetClasses: [],
    incomes: [],
    expenses: [],
    transferRules: [],
    exchangeRate: 1350,
    goal: null,
    inflationEnabled: false,
    inflationRate: 3,
  };
}

// 첫 로드 시 온보딩용으로 예시 데이터를 채운 시나리오. 사용자의 실제 수정이
// 아니므로 dirty 플래그와 무관하게, 어떤 핸들러도 거치지 않고 초기 state로
// 직접 넣는다.
function seedScenario(name: string, today: Date): Scenario {
  const primaryId = newId();
  const savingsId = newId();
  const spId = newId();
  const samsungId = newId();
  const savingsGroupId = newId();
  const investGroupId = newId();
  const monthlyRecurring = (startDate: string): RepeatSchedule => ({
    mode: "recurring",
    startDate,
    frequency: "monthly",
    until: { type: "indefinite" },
  });
  const nextMonth = toMonthInputValue(addMonths(today, 1));

  return {
    id: newId(),
    name,
    groups: [
      { id: savingsGroupId, name: "예적금", color: nextGroupColor(0) },
      { id: investGroupId, name: "투자", color: nextGroupColor(1) },
    ],
    assetClasses: [
      {
        id: primaryId,
        name: "파킹통장",
        currency: "KRW",
        initialBalance: 1_000_000,
        annualReturnRate: 0,
        isPrimary: true,
        color: nextAssetColor(0),
      },
      {
        id: savingsId,
        name: "청년미래적금",
        groupId: savingsGroupId,
        currency: "KRW",
        initialBalance: 0,
        annualReturnRate: 0,
        isPrimary: false,
        color: nextAssetColor(1),
      },
      {
        id: spId,
        name: "S&P500",
        groupId: investGroupId,
        currency: "KRW",
        initialBalance: 0,
        annualReturnRate: 0,
        isPrimary: false,
        color: nextAssetColor(2),
      },
      {
        id: samsungId,
        name: "삼성전자",
        groupId: investGroupId,
        currency: "KRW",
        initialBalance: 0,
        annualReturnRate: 0,
        isPrimary: false,
        color: nextAssetColor(3),
      },
    ],
    incomes: [
      {
        id: newId(),
        name: "아르바이트 월급",
        amount: 1_400_000,
        schedule: monthlyRecurring(nextMonth),
      },
      {
        id: newId(),
        name: "성적 장학금",
        amount: 500_000,
        schedule: { mode: "once", date: nextMonth },
      },
    ],
    expenses: [
      {
        id: newId(),
        name: "생활비",
        amount: 200_000,
        schedule: monthlyRecurring(nextMonth),
      },
      {
        id: newId(),
        name: "식비",
        amount: 100_000,
        schedule: monthlyRecurring(nextMonth),
      },
      {
        id: newId(),
        name: "월세",
        amount: 150_000,
        schedule: monthlyRecurring(nextMonth),
      },
      {
        id: newId(),
        name: "휴대폰 할부",
        amount: 150_000,
        schedule: {
          mode: "recurring",
          startDate: nextMonth,
          frequency: "monthly",
          until: { type: "count", count: 3 },
        },
      },
      {
        id: newId(),
        name: "일본여행",
        amount: 500_000,
        schedule: { mode: "once", date: toMonthInputValue(addMonths(today, 4)) },
      },
    ],
    transferRules: [
      {
        id: newId(),
        fromAssetId: primaryId,
        toAssetId: savingsId,
        mode: "fixed",
        amount: 500_000,
        schedule: monthlyRecurring(nextMonth),
      },
      {
        id: newId(),
        fromAssetId: primaryId,
        toAssetId: spId,
        mode: "fixed",
        amount: 100_000,
        schedule: monthlyRecurring(nextMonth),
      },
      {
        id: newId(),
        fromAssetId: primaryId,
        toAssetId: samsungId,
        mode: "fixed",
        amount: 100_000,
        schedule: monthlyRecurring(nextMonth),
      },
    ],
    exchangeRate: 1350,
    goal: null,
    inflationEnabled: false,
    inflationRate: 3,
  };
}

function duplicateScenario(scenario: Scenario): Scenario {
  const groupIdMap = new Map(scenario.groups.map((g) => [g.id, newId()]));
  const assetIdMap = new Map(scenario.assetClasses.map((a) => [a.id, newId()]));

  const groups = scenario.groups.map((g) => ({
    ...g,
    id: groupIdMap.get(g.id)!,
  }));
  const assetClasses = scenario.assetClasses.map((a) => ({
    ...a,
    id: assetIdMap.get(a.id)!,
    groupId: a.groupId ? groupIdMap.get(a.groupId) : undefined,
  }));
  const incomes = scenario.incomes.map((i) => ({
    ...i,
    id: newId(),
    groupId: i.groupId ? groupIdMap.get(i.groupId) : undefined,
  }));
  const expenses = scenario.expenses.map((e) => ({
    ...e,
    id: newId(),
    groupId: e.groupId ? groupIdMap.get(e.groupId) : undefined,
  }));
  const transferRules = scenario.transferRules.map((r) => ({
    ...r,
    id: newId(),
    fromAssetId: assetIdMap.get(r.fromAssetId)!,
    toAssetId: assetIdMap.get(r.toAssetId)!,
  }));
  const goal = scenario.goal
    ? {
        ...scenario.goal,
        metric:
          scenario.goal.metric.type === "asset"
            ? {
                type: "asset" as const,
                assetId: assetIdMap.get(scenario.goal.metric.assetId)!,
              }
            : scenario.goal.metric.type === "group"
              ? {
                  type: "group" as const,
                  groupId: groupIdMap.get(scenario.goal.metric.groupId)!,
                }
              : scenario.goal.metric,
      }
    : null;

  return {
    id: newId(),
    name: `${scenario.name} 복사본`,
    groups,
    assetClasses,
    incomes,
    expenses,
    transferRules,
    exchangeRate: scenario.exchangeRate,
    goal,
    inflationEnabled: scenario.inflationEnabled,
    inflationRate: scenario.inflationRate,
  };
}

export default function AssetSimulator() {
  const today = useMemo(() => new Date(), []);

  const [scenarios, setScenarios] = useState<Scenario[]>(() => [
    seedScenario("예시 시나리오", today),
  ]);
  const [activeScenarioId, setActiveScenarioId] = useState(
    () => scenarios[0].id,
  );
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [horizonYears, setHorizonYears] = useState(DEFAULT_HORIZON_YEARS);
  const [isDirty, setIsDirty] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [activeChartIndex, setActiveChartIndex] = useState(0);

  const horizonMonths = horizonYears * 12;

  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const handleChangeHorizon = (years: number) => {
    setHorizonYears(years);
    setSelectedMonth((prev) => Math.min(prev, years * 12));
  };

  const updateActiveScenario = (updater: (scenario: Scenario) => Scenario) => {
    setIsDirty(true);
    setScenarios((prev) =>
      prev.map((s) => (s.id === activeScenarioId ? updater(s) : s)),
    );
  };

  const handleSelectScenario = (id: string) => setActiveScenarioId(id);

  const handleRenameScenario = (id: string, name: string) => {
    setIsDirty(true);
    setScenarios((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
  };

  const handleDeleteScenario = (id: string) => {
    if (scenarios.length <= 1) return;
    setIsDirty(true);
    const rest = scenarios.filter((s) => s.id !== id);
    setScenarios(rest);
    if (activeScenarioId === id) {
      setActiveScenarioId(rest[0].id);
    }
  };

  const handleDuplicateScenario = (id: string) => {
    const source = scenarios.find((s) => s.id === id);
    if (!source) return;
    setIsDirty(true);
    const clone = duplicateScenario(source);
    setScenarios((prev) => [...prev, clone]);
    setActiveScenarioId(clone.id);
  };

  const handleCreateScenario = () => {
    setIsDirty(true);
    const existingNames = new Set(scenarios.map((s) => s.name));
    let n = scenarios.length + 1;
    while (existingNames.has(`시나리오 ${n}`)) n++;
    const created = emptyScenario(`시나리오 ${n}`);
    setScenarios((prev) => [...prev, created]);
    setActiveScenarioId(created.id);
  };

  const handleAddGroup = (name: string): string => {
    const id = newId();
    updateActiveScenario((s) => ({
      ...s,
      groups: [
        ...s.groups,
        { id, name, color: nextGroupColor(s.groups.length) },
      ],
    }));
    return id;
  };
  const handleUpdateGroup = (
    id: string,
    input: { name: string; color: string },
  ) => {
    updateActiveScenario((s) => ({
      ...s,
      groups: s.groups.map((g) => (g.id === id ? { ...g, ...input } : g)),
    }));
  };
  const handleRemoveGroup = (id: string) => {
    updateActiveScenario((s) => ({
      ...s,
      groups: s.groups.filter((g) => g.id !== id),
      assetClasses: s.assetClasses.map((a) =>
        a.groupId === id ? { ...a, groupId: undefined } : a,
      ),
      incomes: s.incomes.map((i) =>
        i.groupId === id ? { ...i, groupId: undefined } : i,
      ),
      expenses: s.expenses.map((e) =>
        e.groupId === id ? { ...e, groupId: undefined } : e,
      ),
      goal: goalReferences(s.goal, "group", id) ? null : s.goal,
    }));
  };

  const handleAddAssetClass = (input: NewAssetClassInput) => {
    updateActiveScenario((s) => {
      const withNew = [
        ...(input.isPrimary
          ? s.assetClasses.map((a) => ({ ...a, isPrimary: false }))
          : s.assetClasses),
        { id: newId(), ...input, color: nextAssetColor(s.assetClasses.length) },
      ];
      return { ...s, assetClasses: withGuaranteedPrimary(withNew) };
    });
  };
  const handleUpdateAssetClass = (id: string, input: NewAssetClassInput) => {
    updateActiveScenario((s) => {
      const updated = s.assetClasses.map((a) => {
        if (a.id === id) return { ...a, ...input };
        if (input.isPrimary) return { ...a, isPrimary: false };
        return a;
      });
      const nextAssetClasses = withGuaranteedPrimary(updated);
      const nextTransferRules = s.transferRules.filter((r) => {
        const from = nextAssetClasses.find((a) => a.id === r.fromAssetId);
        const to = nextAssetClasses.find((a) => a.id === r.toAssetId);
        return from && to && from.currency === to.currency;
      });
      return {
        ...s,
        assetClasses: nextAssetClasses,
        transferRules: nextTransferRules,
      };
    });
  };
  const handleChangeAssetColor = (id: string, color: string) => {
    updateActiveScenario((s) => ({
      ...s,
      assetClasses: s.assetClasses.map((a) =>
        a.id === id ? { ...a, color } : a,
      ),
    }));
  };
  const handleRemoveAssetClass = (id: string) => {
    updateActiveScenario((s) => {
      const removed = s.assetClasses.find((a) => a.id === id);
      let rest = s.assetClasses.filter((a) => a.id !== id);
      if (removed?.isPrimary) {
        const nextPrimary = rest.find((a) => a.currency === "KRW");
        if (nextPrimary) {
          rest = rest.map((a) =>
            a.id === nextPrimary.id ? { ...a, isPrimary: true } : a,
          );
        }
      }
      return {
        ...s,
        assetClasses: rest,
        transferRules: s.transferRules.filter(
          (r) => r.fromAssetId !== id && r.toAssetId !== id,
        ),
        goal: goalReferences(s.goal, "asset", id) ? null : s.goal,
      };
    });
  };
  const handleSetPrimaryAsset = (id: string) => {
    updateActiveScenario((s) => ({
      ...s,
      assetClasses: s.assetClasses.map((a) => ({
        ...a,
        isPrimary: a.id === id,
      })),
    }));
  };

  const reorderArray = <T,>(list: T[], from: number, to: number): T[] => {
    const next = [...list];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
  };

  const handleAddIncome = (input: NewIncomeItemInput) => {
    updateActiveScenario((s) => ({
      ...s,
      incomes: [...s.incomes, { id: newId(), ...input }],
    }));
  };
  const handleUpdateIncome = (id: string, input: NewIncomeItemInput) => {
    updateActiveScenario((s) => ({
      ...s,
      incomes: s.incomes.map((i) => (i.id === id ? { ...i, ...input } : i)),
    }));
  };
  const handleRemoveIncome = (id: string) => {
    updateActiveScenario((s) => ({
      ...s,
      incomes: s.incomes.filter((i) => i.id !== id),
    }));
  };
  const handleReorderIncome = (from: number, to: number) => {
    updateActiveScenario((s) => ({
      ...s,
      incomes: reorderArray(s.incomes, from, to),
    }));
  };

  const handleAddExpense = (input: NewExpenseItemInput) => {
    updateActiveScenario((s) => ({
      ...s,
      expenses: [...s.expenses, { id: newId(), ...input }],
    }));
  };
  const handleUpdateExpense = (id: string, input: NewExpenseItemInput) => {
    updateActiveScenario((s) => ({
      ...s,
      expenses: s.expenses.map((e) => (e.id === id ? { ...e, ...input } : e)),
    }));
  };
  const handleRemoveExpense = (id: string) => {
    updateActiveScenario((s) => ({
      ...s,
      expenses: s.expenses.filter((e) => e.id !== id),
    }));
  };
  const handleReorderExpense = (from: number, to: number) => {
    updateActiveScenario((s) => ({
      ...s,
      expenses: reorderArray(s.expenses, from, to),
    }));
  };

  const handleAddTransferRule = (input: NewTransferRuleInput) => {
    updateActiveScenario((s) => ({
      ...s,
      transferRules: [...s.transferRules, { id: newId(), ...input }],
    }));
  };
  const handleUpdateTransferRule = (
    id: string,
    input: NewTransferRuleInput,
  ) => {
    updateActiveScenario((s) => ({
      ...s,
      transferRules: s.transferRules.map((r) =>
        r.id === id ? { ...r, ...input } : r,
      ),
    }));
  };
  const handleRemoveTransferRule = (id: string) => {
    updateActiveScenario((s) => ({
      ...s,
      transferRules: s.transferRules.filter((r) => r.id !== id),
    }));
  };
  const handleReorderTransferRule = (from: number, to: number) => {
    updateActiveScenario((s) => ({
      ...s,
      transferRules: reorderArray(s.transferRules, from, to),
    }));
  };

  const activeScenario =
    scenarios.find((s) => s.id === activeScenarioId) ?? scenarios[0];

  const simulationInput = useMemo<SimulationInput>(
    () => ({
      groups: activeScenario.groups,
      assetClasses: activeScenario.assetClasses,
      incomes: activeScenario.incomes,
      expenses: activeScenario.expenses,
      transferRules: activeScenario.transferRules,
      exchangeRate: activeScenario.exchangeRate,
    }),
    [activeScenario],
  );

  const handleSetGoal = (goal: Goal | null) => {
    updateActiveScenario((s) => ({ ...s, goal }));
    if (goal) {
      const achievementMonth = findGoalAchievementMonth(
        simulationInput,
        goal,
        today,
      );
      if (achievementMonth !== null && achievementMonth <= horizonMonths) {
        setSelectedMonth(achievementMonth);
      }
    }
  };

  const handleToggleInflation = () => {
    updateActiveScenario((s) => ({
      ...s,
      inflationEnabled: !s.inflationEnabled,
    }));
  };

  const handleSetInflationRate = (rate: number) => {
    updateActiveScenario((s) => ({ ...s, inflationRate: rate }));
  };

  const snapshots = useSimulation(simulationInput, today, horizonMonths);
  const selectedSnapshot = snapshots[selectedMonth];
  const primaryAsset = activeScenario.assetClasses.find((a) => a.isPrimary);
  const assetGroups = activeScenario.groups.filter((g) =>
    activeScenario.assetClasses.some((a) => a.groupId === g.id),
  );

  return (
    <div className="h-full w-full overflow-y-auto bg-linear-to-br from-indigo-100 via-blue-50 to-purple-100 px-4 pb-4 text-gray-800">
      <div className="mx-auto max-w-400 @container">
        <div className="sticky top-0 z-40 -mx-4 mb-4 bg-linear-to-br from-indigo-100 via-blue-50 to-purple-100 px-4 pt-4 pb-3 shadow-[0_4px_10px_-6px_rgba(0,0,0,0.15)]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-gray-800">자산 시뮬레이터</h2>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-gray-600">
                환율(1달러 = 원)
                <input
                  type="number"
                  min={1}
                  value={activeScenario.exchangeRate}
                  onChange={(e) =>
                    updateActiveScenario((s) => ({
                      ...s,
                      exchangeRate: Math.max(1, Number(e.target.value) || 1),
                    }))
                  }
                  className="w-24 rounded-full border border-white/60 bg-white/80 px-2 py-1 text-sm"
                />
              </label>
              <div className="flex items-center gap-2 rounded-full border border-white/60 bg-white/50 px-3 py-1.5 text-xs text-gray-600">
                <Switch
                  checked={activeScenario.inflationEnabled}
                  onChange={handleToggleInflation}
                  label="물가상승률 반영"
                />
                <div className="h-4 w-px bg-white/60" />
                <input
                  type="number"
                  value={activeScenario.inflationRate}
                  onChange={(e) =>
                    handleSetInflationRate(Number(e.target.value) || 0)
                  }
                  disabled={!activeScenario.inflationEnabled}
                  className={`w-12 rounded-full border px-2 py-1 text-xs outline-none ${
                    activeScenario.inflationEnabled
                      ? "border-white/60 bg-white/80 focus:border-gray-400"
                      : "cursor-not-allowed border-transparent bg-white/30 text-gray-400"
                  }`}
                />
                <span
                  className={
                    activeScenario.inflationEnabled ? "" : "text-gray-400"
                  }
                >
                  % (연간)
                </span>
              </div>
            </div>
          </div>

          <ScenarioTabs
            scenarios={scenarios}
            activeScenarioId={activeScenarioId}
            onSelect={handleSelectScenario}
            onRename={handleRenameScenario}
            onDelete={handleDeleteScenario}
            onDuplicate={handleDuplicateScenario}
            onCreate={handleCreateScenario}
            showComparison={showComparison}
            onToggleComparison={() => setShowComparison((prev) => !prev)}
          />
        </div>

        {showComparison && (
          <ScenarioComparisonChart
            scenarios={scenarios}
            today={today}
            horizonMonths={horizonMonths}
            selectedMonth={selectedMonth}
          />
        )}

        <div className="mb-4">
          <InputPanel
            key={activeScenarioId}
            groups={activeScenario.groups}
            onAddGroup={handleAddGroup}
            onUpdateGroup={handleUpdateGroup}
            onRemoveGroup={handleRemoveGroup}
            assetClasses={activeScenario.assetClasses}
            onAddAssetClass={handleAddAssetClass}
            onUpdateAssetClass={handleUpdateAssetClass}
            onRemoveAssetClass={handleRemoveAssetClass}
            onSetPrimaryAsset={handleSetPrimaryAsset}
            onChangeAssetColor={handleChangeAssetColor}
            incomes={activeScenario.incomes}
            onAddIncome={handleAddIncome}
            onUpdateIncome={handleUpdateIncome}
            onRemoveIncome={handleRemoveIncome}
            onReorderIncome={handleReorderIncome}
            expenses={activeScenario.expenses}
            onAddExpense={handleAddExpense}
            onUpdateExpense={handleUpdateExpense}
            onRemoveExpense={handleRemoveExpense}
            onReorderExpense={handleReorderExpense}
            transferRules={activeScenario.transferRules}
            onAddTransferRule={handleAddTransferRule}
            onUpdateTransferRule={handleUpdateTransferRule}
            onRemoveTransferRule={handleRemoveTransferRule}
            onReorderTransferRule={handleReorderTransferRule}
            today={today}
            horizonMonths={horizonMonths}
          />
        </div>

        <div className="grid gap-4 @min-[650px]:grid-cols-[minmax(280px,1fr)_minmax(180px,320px)]">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-1">
              {HORIZON_PRESET_YEARS.map((years) => (
                <button
                  key={years}
                  type="button"
                  onClick={() => handleChangeHorizon(years)}
                  className={`rounded-full px-3 py-1 text-xs ${
                    horizonYears === years
                      ? "bg-indigo-500 text-white"
                      : "bg-white/80 text-gray-600"
                  }`}
                >
                  {years}년
                </button>
              ))}
            </div>
            <div className="hidden @max-[500px]:flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setActiveChartIndex((i) => Math.max(0, i - 1))}
                disabled={activeChartIndex === 0}
                className="text-gray-400 disabled:opacity-30"
                aria-label="이전 차트"
              >
                ‹
              </button>
              <div className="flex gap-1.5">
                {CHART_PANEL_COUNT_ARRAY.map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveChartIndex(i)}
                    aria-label={`${i + 1}번째 차트로 이동`}
                    className={`h-1.5 w-1.5 rounded-full ${
                      i === activeChartIndex ? "bg-indigo-500" : "bg-gray-300"
                    }`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  setActiveChartIndex((i) =>
                    Math.min(CHART_PANEL_COUNT_ARRAY.length - 1, i + 1),
                  )
                }
                disabled={
                  activeChartIndex === CHART_PANEL_COUNT_ARRAY.length - 1
                }
                className="text-gray-400 disabled:opacity-30"
                aria-label="다음 차트"
              >
                ›
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 @min-[500px]:grid-cols-2 @min-[900px]:grid-cols-3">
              <div className="min-w-80 @min-[500px]:col-span-2">
                <AssetAreaChart
                  snapshots={snapshots}
                  groups={assetGroups}
                  assetClasses={activeScenario.assetClasses}
                  selectedMonth={selectedMonth}
                  onChangeMonth={setSelectedMonth}
                  today={today}
                  horizonMonths={horizonMonths}
                  goal={activeScenario.goal}
                  onSetGoal={handleSetGoal}
                  simulationInput={simulationInput}
                  inflationEnabled={activeScenario.inflationEnabled}
                  inflationRate={activeScenario.inflationRate}
                />
              </div>
              <div
                className={`min-w-50 ${
                  activeChartIndex === 0 ? "block" : "block @max-[500px]:hidden"
                }`}
              >
                <ComparisonBarChart
                  snapshots={snapshots}
                  groups={assetGroups}
                  assetClasses={activeScenario.assetClasses}
                  selectedMonth={selectedMonth}
                  inflationEnabled={activeScenario.inflationEnabled}
                  inflationRate={activeScenario.inflationRate}
                />
              </div>
              <div
                className={`min-w-50 ${
                  activeChartIndex === 1 ? "block" : "block @max-[500px]:hidden"
                }`}
              >
                <GroupDonutChart
                  groups={assetGroups}
                  assetClasses={activeScenario.assetClasses}
                  snapshot={selectedSnapshot}
                />
              </div>
              <div
                className={`min-w-50 @min-[500px]:col-span-2 ${
                  activeChartIndex === 2 ? "block" : "block @max-[500px]:hidden"
                }`}
              >
                <FlowDiagram
                  snapshot={selectedSnapshot}
                  primaryAsset={primaryAsset}
                  assetClasses={activeScenario.assetClasses}
                  groups={activeScenario.groups}
                  exchangeRate={activeScenario.exchangeRate}
                />
              </div>
            </div>
          </div>
          <HistoryPanel
            snapshots={snapshots}
            incomes={activeScenario.incomes}
            expenses={activeScenario.expenses}
            assetClasses={activeScenario.assetClasses}
            today={today}
            selectedMonth={selectedMonth}
          />
        </div>
      </div>
    </div>
  );
}
