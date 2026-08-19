"use client";

import { useMemo, useState } from "react";
import {
  AssetClass,
  FixedExpense,
  FixedIncome,
  Group,
  IrregularCashflow,
  NewAssetClassInput,
  NewFixedExpenseInput,
  NewFixedIncomeInput,
  NewIrregularCashflowInput,
  NewTransferRuleInput,
  SimulationInput,
  TransferRule,
  newId,
  nextGroupColor,
} from "./types";
import { useSimulation } from "./useSimulation";
import InputPanel from "./InputPanel";
import TimelineSlider from "./TimelineSlider";
import AssetAreaChart from "./AssetAreaChart";
import GroupDonutChart from "./GroupDonutChart";
import FlowDiagram from "./FlowDiagram";

export default function AssetSimulator() {
  const today = useMemo(() => new Date(), []);

  const [groups, setGroups] = useState<Group[]>([]);
  const [assetClasses, setAssetClasses] = useState<AssetClass[]>([]);
  const [fixedIncomes, setFixedIncomes] = useState<FixedIncome[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [irregularIncomes, setIrregularIncomes] = useState<
    IrregularCashflow[]
  >([]);
  const [irregularExpenses, setIrregularExpenses] = useState<
    IrregularCashflow[]
  >([]);
  const [transferRules, setTransferRules] = useState<TransferRule[]>([]);
  const [exchangeRate, setExchangeRate] = useState(1350);
  const [selectedMonth, setSelectedMonth] = useState(0);

  const handleAddGroup = (name: string): string => {
    const id = newId();
    setGroups((prev) => [
      ...prev,
      { id, name, color: nextGroupColor(prev.length) },
    ]);
    return id;
  };

  const handleAddAssetClass = (input: NewAssetClassInput) => {
    setAssetClasses((prev) => [
      ...(input.isPrimary
        ? prev.map((a) => ({ ...a, isPrimary: false }))
        : prev),
      { id: newId(), ...input },
    ]);
  };
  const handleUpdateAssetClass = (id: string, input: NewAssetClassInput) => {
    setAssetClasses((prev) =>
      prev.map((a) => {
        if (a.id === id) return { ...a, ...input };
        if (input.isPrimary) return { ...a, isPrimary: false };
        return a;
      }),
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
  };
  const handleSetPrimaryAsset = (id: string) => {
    setAssetClasses((prev) =>
      prev.map((a) => ({ ...a, isPrimary: a.id === id })),
    );
  };

  const handleAddFixedIncome = (input: NewFixedIncomeInput) => {
    setFixedIncomes((prev) => [...prev, { id: newId(), ...input }]);
  };
  const handleUpdateFixedIncome = (
    id: string,
    input: NewFixedIncomeInput,
  ) => {
    setFixedIncomes((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...input } : i)),
    );
  };
  const handleRemoveFixedIncome = (id: string) => {
    setFixedIncomes((prev) => prev.filter((i) => i.id !== id));
  };

  const handleAddIrregularIncome = (input: NewIrregularCashflowInput) => {
    setIrregularIncomes((prev) => [...prev, { id: newId(), ...input }]);
  };
  const handleUpdateIrregularIncome = (
    id: string,
    input: NewIrregularCashflowInput,
  ) => {
    setIrregularIncomes((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...input } : i)),
    );
  };
  const handleRemoveIrregularIncome = (id: string) => {
    setIrregularIncomes((prev) => prev.filter((i) => i.id !== id));
  };

  const handleAddFixedExpense = (input: NewFixedExpenseInput) => {
    setFixedExpenses((prev) => [...prev, { id: newId(), ...input }]);
  };
  const handleUpdateFixedExpense = (
    id: string,
    input: NewFixedExpenseInput,
  ) => {
    setFixedExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...input } : e)),
    );
  };
  const handleRemoveFixedExpense = (id: string) => {
    setFixedExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const handleAddIrregularExpense = (input: NewIrregularCashflowInput) => {
    setIrregularExpenses((prev) => [...prev, { id: newId(), ...input }]);
  };
  const handleUpdateIrregularExpense = (
    id: string,
    input: NewIrregularCashflowInput,
  ) => {
    setIrregularExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...input } : e)),
    );
  };
  const handleRemoveIrregularExpense = (id: string) => {
    setIrregularExpenses((prev) => prev.filter((e) => e.id !== id));
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
      fixedIncomes,
      fixedExpenses,
      irregularIncomes,
      irregularExpenses,
      transferRules,
      exchangeRate,
    }),
    [
      groups,
      assetClasses,
      fixedIncomes,
      fixedExpenses,
      irregularIncomes,
      irregularExpenses,
      transferRules,
      exchangeRate,
    ],
  );

  const snapshots = useSimulation(simulationInput, today);
  const selectedSnapshot = snapshots[selectedMonth];
  const primaryAsset = assetClasses.find((a) => a.isPrimary);

  return (
    <div className="h-full w-full overflow-y-auto bg-gradient-to-br from-indigo-100 via-blue-50 to-purple-100 p-4 text-gray-800">
      <div className="grid gap-4 md:grid-cols-[320px_1fr]">
        <InputPanel
          groups={groups}
          onAddGroup={handleAddGroup}
          assetClasses={assetClasses}
          onAddAssetClass={handleAddAssetClass}
          onUpdateAssetClass={handleUpdateAssetClass}
          onRemoveAssetClass={handleRemoveAssetClass}
          onSetPrimaryAsset={handleSetPrimaryAsset}
          fixedIncomes={fixedIncomes}
          onAddFixedIncome={handleAddFixedIncome}
          onUpdateFixedIncome={handleUpdateFixedIncome}
          onRemoveFixedIncome={handleRemoveFixedIncome}
          irregularIncomes={irregularIncomes}
          onAddIrregularIncome={handleAddIrregularIncome}
          onUpdateIrregularIncome={handleUpdateIrregularIncome}
          onRemoveIrregularIncome={handleRemoveIrregularIncome}
          fixedExpenses={fixedExpenses}
          onAddFixedExpense={handleAddFixedExpense}
          onUpdateFixedExpense={handleUpdateFixedExpense}
          onRemoveFixedExpense={handleRemoveFixedExpense}
          irregularExpenses={irregularExpenses}
          onAddIrregularExpense={handleAddIrregularExpense}
          onUpdateIrregularExpense={handleUpdateIrregularExpense}
          onRemoveIrregularExpense={handleRemoveIrregularExpense}
          transferRules={transferRules}
          onAddTransferRule={handleAddTransferRule}
          onUpdateTransferRule={handleUpdateTransferRule}
          onRemoveTransferRule={handleRemoveTransferRule}
          today={today}
        />
        <div className="flex flex-col gap-4">
          <TimelineSlider
            selectedMonth={selectedMonth}
            onChange={setSelectedMonth}
            totalBalance={selectedSnapshot.totalBalance}
            today={today}
          />
          <AssetAreaChart
            snapshots={snapshots}
            groups={groups}
            assetClasses={assetClasses}
            selectedMonth={selectedMonth}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <GroupDonutChart
              groups={groups}
              assetClasses={assetClasses}
              snapshot={selectedSnapshot}
            />
            <FlowDiagram
              snapshot={selectedSnapshot}
              primaryAsset={primaryAsset}
              assetClasses={assetClasses}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
