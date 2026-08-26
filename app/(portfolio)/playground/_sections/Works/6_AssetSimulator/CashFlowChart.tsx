"use client";

import { Activity, Inbox } from "lucide-react";
import { useState } from "react";
import {
  MonthSnapshot,
  formatKRW,
  formatMonthsFromNow,
  toRealValue,
} from "./types";
import ChartTooltip from "./ChartTooltip";

type CashFlowChartProps = {
  snapshots: MonthSnapshot[];
  selectedMonth: number;
  inflationEnabled: boolean;
  inflationRate: number;
};

const WIDTH = 600;
const HEIGHT = 220;
const PADDING = 12;
const BASELINE_Y = HEIGHT / 2;

export default function CashFlowChart({
  snapshots,
  selectedMonth,
  inflationEnabled,
  inflationRate,
}: CashFlowChartProps) {
  const [hoverMonth, setHoverMonth] = useState<number | null>(null);
  const [hoverPercent, setHoverPercent] = useState({ x: 0, y: 0 });

  if (snapshots.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center gap-1.5 rounded-2xl border border-white/40 bg-white/70 text-sm text-gray-400 backdrop-blur">
        <Inbox className="h-4 w-4" /> 시뮬레이션을 시작하면 그래프가 나타납니다
      </div>
    );
  }

  const flows = snapshots.map((snapshot, i) => ({
    incomeIn: inflationEnabled
      ? toRealValue(snapshot.flow.incomeIn, i, inflationRate)
      : snapshot.flow.incomeIn,
    expenseOut: inflationEnabled
      ? toRealValue(snapshot.flow.expenseOut, i, inflationRate)
      : snapshot.flow.expenseOut,
  }));

  const maxFlow = Math.max(
    1,
    ...flows.map((f) => Math.max(f.incomeIn, f.expenseOut)),
  );
  const stepX = (WIDTH - PADDING * 2) / (snapshots.length - 1);
  const halfHeight = HEIGHT / 2 - PADDING;
  const barWidth = Math.max(1, stepX * 0.7);
  const scaleFlow = (value: number) => (value / maxFlow) * halfHeight;

  const netPoints = flows
    .map((flow, i) => {
      const net = flow.incomeIn - flow.expenseOut;
      const y = BASELINE_Y - scaleFlow(net);
      return `${PADDING + i * stepX},${y}`;
    })
    .join(" ");

  const cursorX = PADDING + selectedMonth * stepX;
  const selected = flows[selectedMonth];
  const netAmount = (selected?.incomeIn ?? 0) - (selected?.expenseOut ?? 0);

  const hoverFlow = hoverMonth !== null ? flows[hoverMonth] : null;

  const handlePointerMove = (e: React.PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratioX = (e.clientX - rect.left) / rect.width;
    const month = Math.round(ratioX * (snapshots.length - 1));
    setHoverMonth(Math.max(0, Math.min(snapshots.length - 1, month)));
    setHoverPercent({
      x: ratioX * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  return (
    <div className="flex h-full flex-col rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
      <p className="flex items-center gap-1.5 text-sm text-gray-500">
        <Activity className="h-4 w-4" /> 선택 시점 순수입
        {inflationEnabled && (
          <span className="text-xs text-gray-400">(오늘 가치)</span>
        )}{" "}
        <span className="text-lg font-semibold text-gray-800">
          {formatKRW(netAmount)}
        </span>
      </p>
      <div className="mt-2 flex flex-1 items-center justify-center">
      <div className="relative w-full">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full">
        <line
          x1={PADDING}
          y1={BASELINE_Y}
          x2={WIDTH - PADDING}
          y2={BASELINE_Y}
          stroke="#d1d5db"
          strokeWidth={1}
        />
        {snapshots.map((snapshot, i) => {
          const x = PADDING + i * stepX - barWidth / 2;
          const incomeHeight = scaleFlow(flows[i].incomeIn);
          const expenseHeight = scaleFlow(flows[i].expenseOut);
          return (
            <g key={snapshot.monthIndex}>
              <rect
                x={x}
                y={BASELINE_Y - incomeHeight}
                width={barWidth}
                height={incomeHeight}
                fill="#10b981"
                fillOpacity={0.7}
                pointerEvents="none"
              />
              <rect
                x={x}
                y={BASELINE_Y}
                width={barWidth}
                height={expenseHeight}
                fill="#f43f5e"
                fillOpacity={0.7}
                pointerEvents="none"
              />
            </g>
          );
        })}
        <polyline
          points={netPoints}
          fill="none"
          stroke="#1f2937"
          strokeWidth={1.5}
          pointerEvents="none"
        />
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
      {hoverFlow && hoverMonth !== null && (
        <ChartTooltip
          xPercent={hoverPercent.x}
          yPercent={hoverPercent.y}
          lines={[
            hoverMonth === 0 ? "지금" : formatMonthsFromNow(hoverMonth),
            `수입 ${formatKRW(hoverFlow.incomeIn)}`,
            `지출 ${formatKRW(hoverFlow.expenseOut)}`,
            `순수입 ${formatKRW(hoverFlow.incomeIn - hoverFlow.expenseOut)}`,
          ]}
        />
      )}
      </div>
      </div>
      <div className="mt-2 flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          수입
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
          지출
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-gray-800" />
          순수입
        </span>
      </div>
    </div>
  );
}
