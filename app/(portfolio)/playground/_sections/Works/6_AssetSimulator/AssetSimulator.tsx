"use client";

import { useEffect, useMemo, useState } from "react";
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
  formatKRW,
  newId,
  nextAssetColor,
  nextGroupColor,
  toMonthInputValue,
} from "./types";
import { useSimulation } from "./useSimulation";
import InputPanel from "./InputPanel";
import TimelineSlider from "./TimelineSlider";
import AssetAreaChart from "./AssetAreaChart";
import GroupDonutChart from "./GroupDonutChart";
import FlowDiagram from "./FlowDiagram";
import ComparisonBarChart from "./ComparisonBarChart";
import GoalCard from "./GoalCard";
import CashFlowChart from "./CashFlowChart";
import HistoryPanel from "./HistoryPanel";
import ScenarioTabs from "./ScenarioTabs";
import ScenarioComparisonChart from "./ScenarioComparisonChart";

function withGuaranteedPrimary(assets: AssetClass[]): AssetClass[] {
  if (assets.some((a) => a.isPrimary && a.currency === "KRW")) {
    return assets;
  }
  const candidate = assets.find((a) => a.currency === "KRW");
  if (!candidate) return assets;
  return assets.map((a) => ({ ...a, isPrimary: a.id === candidate.id }));
}

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
  };
}

// 첫 로드 시 온보딩용으로 예시 데이터를 채운 시나리오. 사용자의 실제 수정이
// 아니므로 dirty 플래그와 무관하게, 어떤 핸들러도 거치지 않고 초기 state로
// 직접 넣는다.
function seedScenario(name: string, today: Date): Scenario {
  const assetId = newId();
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
    groups: [],
    assetClasses: [
      {
        id: assetId,
        name: "현금",
        currency: "KRW",
        initialBalance: 10_000_000,
        annualReturnRate: 0,
        isPrimary: true,
        color: nextAssetColor(0),
      },
    ],
    incomes: [
      {
        id: newId(),
        name: "월급",
        amount: 3_000_000,
        schedule: monthlyRecurring(nextMonth),
      },
    ],
    expenses: [
      {
        id: newId(),
        name: "생활비",
        amount: 1_000_000,
        schedule: monthlyRecurring(nextMonth),
      },
    ],
    transferRules: [],
    exchangeRate: 1350,
    goal: null,
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
  };
}

export default function AssetSimulator() {
  const today = useMemo(() => new Date(), []);

  const [scenarios, setScenarios] = useState<Scenario[]>(() => [
    seedScenario("시나리오 1", today),
  ]);
  const [activeScenarioId, setActiveScenarioId] = useState(
    () => scenarios[0].id,
  );
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [horizonYears, setHorizonYears] = useState(DEFAULT_HORIZON_YEARS);
  const [isDirty, setIsDirty] = useState(false);

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

  const updateActiveScenario = (
    updater: (scenario: Scenario) => Scenario,
  ) => {
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
      groups: [...s.groups, { id, name, color: nextGroupColor(s.groups.length) }],
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
      return { ...s, assetClasses: nextAssetClasses, transferRules: nextTransferRules };
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

  const handleSetGoal = (goal: Goal | null) => {
    updateActiveScenario((s) => ({ ...s, goal }));
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

  const snapshots = useSimulation(simulationInput, today, horizonMonths);
  const selectedSnapshot = snapshots[selectedMonth];
  const primaryAsset = activeScenario.assetClasses.find((a) => a.isPrimary);
  const assetGroups = activeScenario.groups.filter((g) =>
    activeScenario.assetClasses.some((a) => a.groupId === g.id),
  );

  return (
    <div className="h-full w-full overflow-y-auto bg-gradient-to-br from-indigo-100 via-blue-50 to-purple-100 p-4 text-gray-800">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-gray-800">자산 시뮬레이터</h2>
          <div className="flex flex-wrap items-center gap-3">
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
        />

        <ScenarioComparisonChart
          scenarios={scenarios}
          today={today}
          horizonMonths={horizonMonths}
          selectedMonth={selectedMonth}
        />

        <div className="mb-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
            <p className="text-sm text-gray-500">💰 현재 자산</p>
            <p className="mt-1 text-2xl font-bold text-gray-800">
              {formatKRW(snapshots[0]?.totalBalance ?? 0)}
            </p>
          </div>
          <GoalCard
            goal={activeScenario.goal}
            onSetGoal={handleSetGoal}
            assetClasses={activeScenario.assetClasses}
            groups={assetGroups}
            simulationInput={simulationInput}
            today={today}
            selectedSnapshot={selectedSnapshot}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-[640px_1fr_320px]">
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
            expenses={activeScenario.expenses}
            onAddExpense={handleAddExpense}
            onUpdateExpense={handleUpdateExpense}
            onRemoveExpense={handleRemoveExpense}
            transferRules={activeScenario.transferRules}
            onAddTransferRule={handleAddTransferRule}
            onUpdateTransferRule={handleUpdateTransferRule}
            onRemoveTransferRule={handleRemoveTransferRule}
            today={today}
            horizonMonths={horizonMonths}
          />
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <AssetAreaChart
                snapshots={snapshots}
                groups={assetGroups}
                assetClasses={activeScenario.assetClasses}
                selectedMonth={selectedMonth}
              />
              <ComparisonBarChart
                snapshots={snapshots}
                groups={assetGroups}
                assetClasses={activeScenario.assetClasses}
                selectedMonth={selectedMonth}
              />
              <GroupDonutChart
                groups={assetGroups}
                assetClasses={activeScenario.assetClasses}
                snapshot={selectedSnapshot}
              />
              <FlowDiagram
                snapshot={selectedSnapshot}
                primaryAsset={primaryAsset}
                assetClasses={activeScenario.assetClasses}
                exchangeRate={activeScenario.exchangeRate}
              />
              <CashFlowChart snapshots={snapshots} selectedMonth={selectedMonth} />
            </div>
            <TimelineSlider
              selectedMonth={selectedMonth}
              onChange={setSelectedMonth}
              today={today}
              horizonMonths={horizonMonths}
            />
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
