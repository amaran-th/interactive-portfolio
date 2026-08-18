"use client";

import { useMemo, useState } from "react";
import {
  AssetClass,
  Group,
  HORIZON_MONTHS,
  IrregularCashflow,
  NewAssetClassInput,
  NewIrregularCashflowInput,
  SimulationInput,
  newId,
  nextGroupColor,
} from "./types";
import { useSimulation } from "./useSimulation";
import InputPanel from "./InputPanel";

export default function AssetSimulator() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [assetClasses, setAssetClasses] = useState<AssetClass[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [irregularIncomes, setIrregularIncomes] = useState<
    IrregularCashflow[]
  >([]);
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

  const simulationInput = useMemo<SimulationInput>(
    () => ({
      groups,
      assetClasses,
      monthlyIncome,
      fixedExpenses: [],
      irregularIncomes,
      irregularExpenses: [],
      transferRules: [],
    }),
    [groups, assetClasses, monthlyIncome, irregularIncomes],
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
          today={today}
        />
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-500">
            선택 시점: {selectedMonth}개월 후 · 총자산{" "}
            {selectedSnapshot.totalBalance.toLocaleString()}원
          </p>
          <input
            type="range"
            min={0}
            max={HORIZON_MONTHS}
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="w-full accent-indigo-500"
          />
        </div>
      </div>
    </div>
  );
}
