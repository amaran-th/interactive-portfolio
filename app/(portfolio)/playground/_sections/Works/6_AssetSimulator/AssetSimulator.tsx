"use client";

import { useMemo, useState } from "react";
import {
  AssetClass,
  FixedExpense,
  Group,
  IrregularCashflow,
  NewAssetClassInput,
  NewFixedExpenseInput,
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

export default function AssetSimulator() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [assetClasses, setAssetClasses] = useState<AssetClass[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [irregularIncomes, setIrregularIncomes] = useState<
    IrregularCashflow[]
  >([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [irregularExpenses, setIrregularExpenses] = useState<
    IrregularCashflow[]
  >([]);
  const [transferRules, setTransferRules] = useState<TransferRule[]>([]);
  const today = useMemo(() => new Date(), []);

  const handleAddGroup = (name: string) => {
    setGroups((prev) => [
      ...prev,
      { id: newId(), name, color: nextGroupColor(prev.length) },
    ]);
  };
  const handleRemoveGroup = (id: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== id));
    setAssetClasses((prev) => prev.filter((a) => a.groupId !== id));
  };
  const handleAddAssetClass = (input: NewAssetClassInput) => {
    setAssetClasses((prev) => [...prev, { id: newId(), ...input }]);
  };
  const handleRemoveAssetClass = (id: string) => {
    setAssetClasses((prev) => prev.filter((a) => a.id !== id));
  };
  const handleSetPrimaryAsset = (id: string) => {
    setAssetClasses((prev) =>
      prev.map((a) => ({ ...a, isPrimary: a.id === id })),
    );
  };
  const handleAddIrregularIncome = (input: NewIrregularCashflowInput) => {
    setIrregularIncomes((prev) => [...prev, { id: newId(), ...input }]);
  };
  const handleRemoveIrregularIncome = (id: string) => {
    setIrregularIncomes((prev) => prev.filter((e) => e.id !== id));
  };
  const handleAddFixedExpense = (input: NewFixedExpenseInput) => {
    setFixedExpenses((prev) => [...prev, { id: newId(), ...input }]);
  };
  const handleRemoveFixedExpense = (id: string) => {
    setFixedExpenses((prev) => prev.filter((e) => e.id !== id));
  };
  const handleAddIrregularExpense = (input: NewIrregularCashflowInput) => {
    setIrregularExpenses((prev) => [...prev, { id: newId(), ...input }]);
  };
  const handleRemoveIrregularExpense = (id: string) => {
    setIrregularExpenses((prev) => prev.filter((e) => e.id !== id));
  };
  const handleAddTransferRule = (input: NewTransferRuleInput) => {
    setTransferRules((prev) => [...prev, { id: newId(), ...input }]);
  };
  const handleRemoveTransferRule = (id: string) => {
    setTransferRules((prev) => prev.filter((r) => r.id !== id));
  };

  const simulationInput = useMemo<SimulationInput>(
    () => ({
      groups,
      assetClasses,
      monthlyIncome,
      fixedExpenses,
      irregularIncomes,
      irregularExpenses,
      transferRules,
    }),
    [
      groups,
      assetClasses,
      monthlyIncome,
      fixedExpenses,
      irregularIncomes,
      irregularExpenses,
      transferRules,
    ],
  );

  const snapshots = useSimulation(simulationInput);
  const selectedSnapshot = snapshots[selectedMonth];

  return (
    <div className="h-full w-full overflow-y-auto bg-gradient-to-br from-indigo-100 via-blue-50 to-purple-100 p-4 text-gray-800">
      <div className="grid gap-4 md:grid-cols-[320px_1fr]">
        <InputPanel
          groups={groups}
          onAddGroup={handleAddGroup}
          onRemoveGroup={handleRemoveGroup}
          assetClasses={assetClasses}
          onAddAssetClass={handleAddAssetClass}
          onRemoveAssetClass={handleRemoveAssetClass}
          onSetPrimaryAsset={handleSetPrimaryAsset}
          monthlyIncome={monthlyIncome}
          onChangeMonthlyIncome={setMonthlyIncome}
          irregularIncomes={irregularIncomes}
          onAddIrregularIncome={handleAddIrregularIncome}
          onRemoveIrregularIncome={handleRemoveIrregularIncome}
          fixedExpenses={fixedExpenses}
          onAddFixedExpense={handleAddFixedExpense}
          onRemoveFixedExpense={handleRemoveFixedExpense}
          irregularExpenses={irregularExpenses}
          onAddIrregularExpense={handleAddIrregularExpense}
          onRemoveIrregularExpense={handleRemoveIrregularExpense}
          transferRules={transferRules}
          onAddTransferRule={handleAddTransferRule}
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
        </div>
      </div>
    </div>
  );
}
