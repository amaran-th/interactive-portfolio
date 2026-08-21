"use client";

import { useMemo } from "react";
import { GROUP_PALETTE, Scenario, SimulationInput } from "./types";
import { runSimulation } from "./simulation";

type ScenarioComparisonChartProps = {
  scenarios: Scenario[];
  today: Date;
  horizonMonths: number;
  selectedMonth: number;
};

const WIDTH = 600;
const HEIGHT = 180;
const PADDING = 12;

export default function ScenarioComparisonChart({
  scenarios,
  today,
  horizonMonths,
  selectedMonth,
}: ScenarioComparisonChartProps) {
  const series = useMemo(
    () =>
      scenarios.map((scenario, i) => {
        const input: SimulationInput = {
          groups: scenario.groups,
          assetClasses: scenario.assetClasses,
          incomes: scenario.incomes,
          expenses: scenario.expenses,
          transferRules: scenario.transferRules,
          exchangeRate: scenario.exchangeRate,
        };
        return {
          id: scenario.id,
          name: scenario.name,
          color: GROUP_PALETTE[i % GROUP_PALETTE.length],
          snapshots: runSimulation(input, today, horizonMonths),
        };
      }),
    [scenarios, today, horizonMonths],
  );

  if (series.length === 0 || series[0].snapshots.length === 0) {
    return (
      <div className="mb-4 flex h-[200px] items-center justify-center rounded-2xl border border-white/40 bg-white/70 text-sm text-gray-400 backdrop-blur">
        시나리오를 만들면 비교 그래프가 나타납니다
      </div>
    );
  }

  const maxTotal = Math.max(
    1,
    ...series.flatMap((s) => s.snapshots.map((snap) => snap.totalBalance)),
  );
  const snapshotCount = series[0].snapshots.length;
  const stepX = (WIDTH - PADDING * 2) / (snapshotCount - 1);
  const scaleY = (value: number) =>
    HEIGHT - PADDING - (value / maxTotal) * (HEIGHT - PADDING * 2);
  const cursorX = PADDING + selectedMonth * stepX;

  return (
    <div className="mb-4 rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
      <p className="text-sm text-gray-500">시나리오 비교 · 총자산 추이</p>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="mt-2 w-full">
        {series.map((s) => {
          const points = s.snapshots
            .map(
              (snap, i) => `${PADDING + i * stepX},${scaleY(snap.totalBalance)}`,
            )
            .join(" ");
          return (
            <polyline key={s.id} points={points} fill="none" stroke={s.color} strokeWidth={2}>
              <title>{s.name}</title>
            </polyline>
          );
        })}
        <line
          x1={cursorX}
          y1={PADDING}
          x2={cursorX}
          y2={HEIGHT - PADDING}
          stroke="#4338ca"
          strokeWidth={1.5}
          strokeDasharray="4 4"
        />
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
        {series.map((s) => (
          <span key={s.id} className="flex items-center gap-1">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}
