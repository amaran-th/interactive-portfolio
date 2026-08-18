"use client";

import { useState } from "react";
import { HORIZON_MONTHS, SimulationInput } from "./types";
import { useSimulation } from "./useSimulation";

const EMPTY_INPUT: SimulationInput = {
  groups: [],
  assetClasses: [],
  monthlyIncome: 0,
  fixedExpenses: [],
  irregularIncomes: [],
  irregularExpenses: [],
  transferRules: [],
};

export default function AssetSimulator() {
  const [selectedMonth, setSelectedMonth] = useState(0);
  const snapshots = useSimulation(EMPTY_INPUT);
  const selectedSnapshot = snapshots[selectedMonth];

  return (
    <div className="h-full w-full overflow-y-auto bg-gradient-to-br from-indigo-100 via-blue-50 to-purple-100 p-4 text-gray-800">
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
        className="mt-4 w-full accent-indigo-500"
      />
    </div>
  );
}
