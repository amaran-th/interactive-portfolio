"use client";

import { useMemo, useState } from "react";
import { GitCompare, Inbox } from "lucide-react";
import { GROUP_PALETTE, Scenario, SimulationInput, formatKRW } from "./types";
import { runSimulation } from "./simulation";
import ChartTooltip from "./ChartTooltip";

type ScenarioComparisonChartProps = {
  scenarios: Scenario[];
  today: Date;
  horizonMonths: number;
  selectedMonth: number;
};

const WIDTH = 600;
const HEIGHT = 180;
const PADDING = 12;

function monthLabel(monthIndex: number, today: Date): string {
  if (monthIndex === 0) return "지금";
  const date = new Date(
    today.getFullYear(),
    today.getMonth() + monthIndex,
    1,
  );
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function ScenarioComparisonChart({
  scenarios,
  today,
  horizonMonths,
  selectedMonth,
}: ScenarioComparisonChartProps) {
  const [hoverMonth, setHoverMonth] = useState<number | null>(null);
  const [hoverPercent, setHoverPercent] = useState({ x: 0, y: 0 });

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
      <div className="mb-4 flex h-[200px] items-center justify-center gap-1.5 break-keep rounded-2xl border border-white/40 bg-white/70 text-center text-sm text-gray-400 backdrop-blur">
        <Inbox className="h-4 w-4 shrink-0" /> 시나리오를 만들면 비교 그래프가
        나타납니다
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
  const hoverX = hoverMonth !== null ? PADDING + hoverMonth * stepX : null;

  const hoverLines =
    hoverMonth !== null
      ? [
          monthLabel(hoverMonth, today),
          ...series.map((s) => ({
            text: `${s.name} ${formatKRW(s.snapshots[hoverMonth]?.totalBalance ?? 0)}`,
            color: s.color,
          })),
        ]
      : [];

  const handlePointerMove = (e: React.PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratioX = (e.clientX - rect.left) / rect.width;
    const month = Math.round(ratioX * (snapshotCount - 1));
    setHoverMonth(Math.max(0, Math.min(snapshotCount - 1, month)));
    setHoverPercent({
      x: ratioX * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  return (
    <div className="mb-4 rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
      <p className="flex items-center gap-1.5 text-sm text-gray-500">
        <GitCompare className="h-4 w-4" /> 시나리오 비교 · 총자산 추이
      </p>
      <div className="relative mt-2 w-full">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full">
        {series.map((s) => {
          const points = s.snapshots
            .map(
              (snap, i) => `${PADDING + i * stepX},${scaleY(snap.totalBalance)}`,
            )
            .join(" ");
          return (
            <polyline
              key={s.id}
              points={points}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              pointerEvents="none"
            />
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
          pointerEvents="none"
        />
        {hoverX !== null && (
          <>
            <line
              x1={hoverX}
              y1={PADDING}
              x2={hoverX}
              y2={HEIGHT - PADDING}
              stroke="#9ca3af"
              strokeWidth={1}
              strokeDasharray="2 2"
              pointerEvents="none"
            />
            {series.map((s) => (
              <circle
                key={`hover-${s.id}`}
                cx={hoverX}
                cy={scaleY(s.snapshots[hoverMonth!]?.totalBalance ?? 0)}
                r={4}
                fill={s.color}
                stroke="white"
                strokeWidth={1.5}
                pointerEvents="none"
              />
            ))}
          </>
        )}
        <rect
          x={0}
          y={0}
          width={WIDTH}
          height={HEIGHT}
          fill="transparent"
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverMonth(null)}
        />
      </svg>
      {hoverMonth !== null && (
        <ChartTooltip
          xPercent={hoverPercent.x}
          yPercent={hoverPercent.y}
          lines={hoverLines}
        />
      )}
      </div>
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
