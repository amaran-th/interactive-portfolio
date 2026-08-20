"use client";

import { useMemo, useState } from "react";
import {
  AssetClass,
  DEFAULT_HORIZON_YEARS,
  ExpenseItem,
  Goal,
  Group,
  HORIZON_PRESET_YEARS,
  IncomeItem,
  NewAssetClassInput,
  NewExpenseItemInput,
  NewIncomeItemInput,
  NewTransferRuleInput,
  SimulationInput,
  TransferRule,
  formatKRW,
  newId,
  nextAssetColor,
  nextGroupColor,
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

export default function AssetSimulator() {
  const today = useMemo(() => new Date(), []);

  const [groups, setGroups] = useState<Group[]>([]);
  const [assetClasses, setAssetClasses] = useState<AssetClass[]>([]);
  const [incomes, setIncomes] = useState<IncomeItem[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [transferRules, setTransferRules] = useState<TransferRule[]>([]);
  const [exchangeRate, setExchangeRate] = useState(1350);
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [horizonYears, setHorizonYears] = useState(DEFAULT_HORIZON_YEARS);
  const [goal, setGoal] = useState<Goal | null>(null);

  const horizonMonths = horizonYears * 12;

  const handleChangeHorizon = (years: number) => {
    setHorizonYears(years);
    setSelectedMonth((prev) => Math.min(prev, years * 12));
  };

  const handleAddGroup = (name: string): string => {
    const id = newId();
    setGroups((prev) => [
      ...prev,
      { id, name, color: nextGroupColor(prev.length) },
    ]);
    return id;
  };
  const handleUpdateGroup = (
    id: string,
    input: { name: string; color: string },
  ) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ...input } : g)),
    );
  };
  const handleRemoveGroup = (id: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== id));
    setAssetClasses((prev) =>
      prev.map((a) => (a.groupId === id ? { ...a, groupId: undefined } : a)),
    );
    setIncomes((prev) =>
      prev.map((i) => (i.groupId === id ? { ...i, groupId: undefined } : i)),
    );
    setExpenses((prev) =>
      prev.map((e) => (e.groupId === id ? { ...e, groupId: undefined } : e)),
    );
    setGoal((prev) => (goalReferences(prev, "group", id) ? null : prev));
  };

  const handleAddAssetClass = (input: NewAssetClassInput) => {
    setAssetClasses((prev) => {
      const withNew = [
        ...(input.isPrimary
          ? prev.map((a) => ({ ...a, isPrimary: false }))
          : prev),
        { id: newId(), ...input, color: nextAssetColor(prev.length) },
      ];
      return withGuaranteedPrimary(withNew);
    });
  };
  const handleUpdateAssetClass = (id: string, input: NewAssetClassInput) => {
    setAssetClasses((prev) => {
      const updated = prev.map((a) => {
        if (a.id === id) return { ...a, ...input };
        if (input.isPrimary) return { ...a, isPrimary: false };
        return a;
      });
      return withGuaranteedPrimary(updated);
    });
    setTransferRules((prev) => {
      const nextAssets = assetClasses.map((a) =>
        a.id === id ? { ...a, ...input } : a,
      );
      return prev.filter((r) => {
        const from = nextAssets.find((a) => a.id === r.fromAssetId);
        const to = nextAssets.find((a) => a.id === r.toAssetId);
        return from && to && from.currency === to.currency;
      });
    });
  };
  const handleChangeAssetColor = (id: string, color: string) => {
    setAssetClasses((prev) =>
      prev.map((a) => (a.id === id ? { ...a, color } : a)),
    );
  };
  const handleRemoveAssetClass = (id: string) => {
    setAssetClasses((prev) => {
      const removed = prev.find((a) => a.id === id);
      const rest = prev.filter((a) => a.id !== id);
      if (removed?.isPrimary) {
        const nextPrimary = rest.find((a) => a.currency === "KRW");
        if (nextPrimary) {
          return rest.map((a) =>
            a.id === nextPrimary.id ? { ...a, isPrimary: true } : a,
          );
        }
      }
      return rest;
    });
    setTransferRules((prev) =>
      prev.filter((r) => r.fromAssetId !== id && r.toAssetId !== id),
    );
    setGoal((prev) => (goalReferences(prev, "asset", id) ? null : prev));
  };
  const handleSetPrimaryAsset = (id: string) => {
    setAssetClasses((prev) =>
      prev.map((a) => ({ ...a, isPrimary: a.id === id })),
    );
  };

  const handleAddIncome = (input: NewIncomeItemInput) => {
    setIncomes((prev) => [...prev, { id: newId(), ...input }]);
  };
  const handleUpdateIncome = (id: string, input: NewIncomeItemInput) => {
    setIncomes((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...input } : i)),
    );
  };
  const handleRemoveIncome = (id: string) => {
    setIncomes((prev) => prev.filter((i) => i.id !== id));
  };

  const handleAddExpense = (input: NewExpenseItemInput) => {
    setExpenses((prev) => [...prev, { id: newId(), ...input }]);
  };
  const handleUpdateExpense = (id: string, input: NewExpenseItemInput) => {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...input } : e)),
    );
  };
  const handleRemoveExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const handleAddTransferRule = (input: NewTransferRuleInput) => {
    setTransferRules((prev) => [...prev, { id: newId(), ...input }]);
  };
  const handleUpdateTransferRule = (
    id: string,
    input: NewTransferRuleInput,
  ) => {
    setTransferRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...input } : r)),
    );
  };
  const handleRemoveTransferRule = (id: string) => {
    setTransferRules((prev) => prev.filter((r) => r.id !== id));
  };

  const simulationInput = useMemo<SimulationInput>(
    () => ({
      groups,
      assetClasses,
      incomes,
      expenses,
      transferRules,
      exchangeRate,
    }),
    [groups, assetClasses, incomes, expenses, transferRules, exchangeRate],
  );

  const snapshots = useSimulation(simulationInput, today, horizonMonths);
  const selectedSnapshot = snapshots[selectedMonth];
  const primaryAsset = assetClasses.find((a) => a.isPrimary);
  const assetGroups = groups.filter((g) =>
    assetClasses.some((a) => a.groupId === g.id),
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
                value={exchangeRate}
                onChange={(e) =>
                  setExchangeRate(Math.max(1, Number(e.target.value) || 1))
                }
                className="w-24 rounded-full border border-white/60 bg-white/80 px-2 py-1 text-sm"
              />
            </label>
          </div>
        </div>
        <div className="mb-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
            <p className="text-sm text-gray-500">현재 자산</p>
            <p className="mt-1 text-2xl font-bold text-gray-800">
              {formatKRW(snapshots[0]?.totalBalance ?? 0)}
            </p>
          </div>
          <GoalCard
            goal={goal}
            onSetGoal={setGoal}
            assetClasses={assetClasses}
            groups={assetGroups}
            simulationInput={simulationInput}
            today={today}
            selectedSnapshot={selectedSnapshot}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-[360px_1fr_320px]">
          <InputPanel
            groups={groups}
            onAddGroup={handleAddGroup}
            onUpdateGroup={handleUpdateGroup}
            onRemoveGroup={handleRemoveGroup}
            assetClasses={assetClasses}
            onAddAssetClass={handleAddAssetClass}
            onUpdateAssetClass={handleUpdateAssetClass}
            onRemoveAssetClass={handleRemoveAssetClass}
            onSetPrimaryAsset={handleSetPrimaryAsset}
            onChangeAssetColor={handleChangeAssetColor}
            incomes={incomes}
            onAddIncome={handleAddIncome}
            onUpdateIncome={handleUpdateIncome}
            onRemoveIncome={handleRemoveIncome}
            expenses={expenses}
            onAddExpense={handleAddExpense}
            onUpdateExpense={handleUpdateExpense}
            onRemoveExpense={handleRemoveExpense}
            transferRules={transferRules}
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
                assetClasses={assetClasses}
                selectedMonth={selectedMonth}
              />
              <ComparisonBarChart
                snapshots={snapshots}
                groups={assetGroups}
                assetClasses={assetClasses}
                selectedMonth={selectedMonth}
              />
              <GroupDonutChart
                groups={assetGroups}
                assetClasses={assetClasses}
                snapshot={selectedSnapshot}
              />
              <FlowDiagram
                snapshot={selectedSnapshot}
                primaryAsset={primaryAsset}
                assetClasses={assetClasses}
                exchangeRate={exchangeRate}
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
            incomes={incomes}
            expenses={expenses}
            assetClasses={assetClasses}
            today={today}
            selectedMonth={selectedMonth}
          />
        </div>
      </div>
    </div>
  );
}
