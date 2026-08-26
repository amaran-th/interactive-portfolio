"use client";

import {
  Activity,
  Inbox,
  LineChart as LineChartIcon,
  TriangleAlert,
} from "lucide-react";
import { useMemo, useState } from "react";
import ChartTooltip from "./ChartTooltip";
import GoalCard from "./GoalCard";
import { findGoalAchievementMonth } from "./simulation";
import TimelineSlider from "./TimelineSlider";
import {
  AssetClass,
  Goal,
  Group,
  MonthSnapshot,
  SimulationInput,
  formatKRW,
  toRealValue,
} from "./types";

type AssetAreaChartProps = {
  snapshots: MonthSnapshot[];
  groups: Group[];
  assetClasses: AssetClass[];
  selectedMonth: number;
  onChangeMonth: (month: number) => void;
  today: Date;
  horizonMonths: number;
  goal: Goal | null;
  onSetGoal: (goal: Goal | null) => void;
  simulationInput: SimulationInput;
  inflationEnabled: boolean;
  inflationRate: number;
};

type ChartMode = "asset" | "flow";

const WIDTH = 600;
const ASSET_HEIGHT = 150;
const FLOW_HEIGHT = 220;
const PADDING = 12;
const BELOW_ZERO_CLIP_ID = "asset-area-below-zero-clip";
const DEFICIT_COLOR = "#f43f5e";

function orderedAssets(
  assetClasses: AssetClass[],
  groups: Group[],
): AssetClass[] {
  const grouped = groups.flatMap((g) =>
    assetClasses.filter((a) => a.groupId === g.id),
  );
  const ungrouped = assetClasses.filter((a) => !a.groupId);
  return [...grouped, ...ungrouped];
}

function monthLabel(monthIndex: number, today: Date): string {
  if (monthIndex === 0) return "지금";
  const date = new Date(today.getFullYear(), today.getMonth() + monthIndex, 1);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function AssetAreaChart({
  snapshots,
  groups,
  assetClasses,
  selectedMonth,
  onChangeMonth,
  today,
  horizonMonths,
  goal,
  onSetGoal,
  simulationInput,
  inflationEnabled,
  inflationRate,
}: AssetAreaChartProps) {
  const isEmpty = assetClasses.length === 0 || snapshots.length === 0;
  const [mode, setMode] = useState<ChartMode>("asset");
  const [hoverMonth, setHoverMonth] = useState<number | null>(null);
  const [hoverPercent, setHoverPercent] = useState({ x: 0, y: 0 });

  const goalAchievementMonth = useMemo(() => {
    if (!goal) return undefined;
    return findGoalAchievementMonth(simulationInput, goal, today);
  }, [goal, simulationInput, today]);
  const goalUnreachableInRange =
    goal !== null &&
    goalAchievementMonth !== undefined &&
    (goalAchievementMonth === null || goalAchievementMonth > horizonMonths);

  const assets = isEmpty ? [] : orderedAssets(assetClasses, groups);
  const maxTotal = isEmpty
    ? 1
    : Math.max(1, ...snapshots.map((s) => s.totalBalance));
  const stepX = isEmpty ? 1 : (WIDTH - PADDING * 2) / (snapshots.length - 1);

  const {
    bands: rawBands,
    minValue,
    maxValue,
  } = assets.reduce<{
    prevTop: number[];
    bands: {
      id: string;
      name: string;
      fill: string;
      stroke: string | undefined;
      bottom: number[];
      top: number[];
    }[];
    minValue: number;
    maxValue: number;
  }>(
    (acc, asset) => {
      const bottom = acc.prevTop;
      const top = snapshots.map(
        (snapshot, i) => bottom[i] + (snapshot.assetBalancesKRW[asset.id] ?? 0),
      );
      const group = groups.find((g) => g.id === asset.groupId);

      return {
        prevTop: top,
        minValue: Math.min(acc.minValue, ...bottom, ...top),
        maxValue: Math.max(acc.maxValue, ...bottom, ...top),
        bands: [
          ...acc.bands,
          {
            id: asset.id,
            name: asset.name,
            fill: asset.color,
            stroke: group?.color,
            bottom,
            top,
          },
        ],
      };
    },
    {
      prevTop: snapshots.map(() => 0),
      bands: [],
      minValue: 0,
      maxValue: 0,
    },
  );

  const domainMin = Math.min(0, minValue);
  const domainMax = Math.max(1, maxTotal, maxValue);
  const domainRange = domainMax - domainMin || 1;
  const scaleY = (value: number) =>
    ASSET_HEIGHT -
    PADDING -
    ((value - domainMin) / domainRange) * (ASSET_HEIGHT - PADDING * 2);
  const zeroY = scaleY(0);

  const bands = rawBands.map((band) => {
    const topPoints = band.top.map(
      (value, i) => `${PADDING + i * stepX},${scaleY(value)}`,
    );
    const bottomPoints = band.bottom
      .map((value, i) => `${PADDING + i * stepX},${scaleY(value)}`)
      .reverse();
    return {
      id: band.id,
      name: band.name,
      fill: band.fill,
      stroke: band.stroke,
      points: [...topPoints, ...bottomPoints].join(" "),
    };
  });

  const cursorX = PADDING + selectedMonth * stepX;
  const hoverX = hoverMonth !== null ? PADDING + hoverMonth * stepX : null;
  const totalBalance = snapshots[selectedMonth]?.totalBalance ?? 0;
  const displayBalance = inflationEnabled
    ? toRealValue(totalBalance, selectedMonth, inflationRate)
    : totalBalance;
  const cursorY = scaleY(totalBalance);
  const nearRightEdge = cursorX > WIDTH - PADDING - 60;

  const flows = isEmpty
    ? []
    : snapshots.map((snapshot, i) => ({
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
  const flowBaselineY = FLOW_HEIGHT / 2;
  const flowHalfHeight = FLOW_HEIGHT / 2 - PADDING;
  const flowBarWidth = Math.max(1, stepX * 0.7);
  const scaleFlow = (value: number) => (value / maxFlow) * flowHalfHeight;
  const netPoints = flows
    .map((flow, i) => {
      const net = flow.incomeIn - flow.expenseOut;
      const y = flowBaselineY - scaleFlow(net);
      return `${PADDING + i * stepX},${y}`;
    })
    .join(" ");
  const selectedFlow = flows[selectedMonth];
  const netAmount =
    (selectedFlow?.incomeIn ?? 0) - (selectedFlow?.expenseOut ?? 0);
  const hoverFlow = hoverMonth !== null ? flows[hoverMonth] : null;

  const hoverSnapshot = hoverMonth !== null ? snapshots[hoverMonth] : null;
  const tooltipLines =
    mode === "asset"
      ? hoverSnapshot
        ? [
            monthLabel(hoverMonth!, today),
            `총자산 ${formatKRW(hoverSnapshot.totalBalance)}`,
            ...assets.map(
              (asset) =>
                `${asset.name} ${formatKRW(hoverSnapshot.assetBalancesKRW[asset.id] ?? 0)}`,
            ),
          ]
        : []
      : hoverFlow && hoverMonth !== null
        ? [
            monthLabel(hoverMonth, today),
            {
              text: `수입 ${formatKRW(hoverFlow.incomeIn)}`,
              className: "text-emerald-600",
            },
            {
              text: `지출 ${formatKRW(hoverFlow.expenseOut)}`,
              className: "text-rose-500",
            },
            {
              text: `순수입 ${formatKRW(hoverFlow.incomeIn - hoverFlow.expenseOut)}`,
              className: "font-medium text-gray-800",
            },
          ]
        : [];

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
    <div className="rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
      {isEmpty ? (
        <div className="flex h-[180px] items-center justify-center gap-1.5 text-sm text-gray-400">
          <Inbox className="h-4 w-4" /> 자산을 추가하면 그래프가 나타납니다
        </div>
      ) : (
        <>
          <div className="flex items-center gap-1 self-start rounded-full bg-gray-100 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setMode("asset")}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 ${
                mode === "asset"
                  ? "bg-white font-medium text-gray-800 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <LineChartIcon className="h-3.5 w-3.5" /> 자산
            </button>
            <button
              type="button"
              onClick={() => setMode("flow")}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 ${
                mode === "flow"
                  ? "bg-white font-medium text-gray-800 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Activity className="h-3.5 w-3.5" /> 수입/지출
            </button>
          </div>
          {mode === "asset" ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-500">
              <GoalCard
                goal={goal}
                onSetGoal={onSetGoal}
                assetClasses={assetClasses}
                groups={groups}
                simulationInput={simulationInput}
                snapshots={snapshots}
                today={today}
              />
            </div>
          ) : (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-500">
              <Activity className="h-4 w-4" /> 순수입
              {inflationEnabled && (
                <span className="text-xs text-gray-400">(오늘 가치)</span>
              )}{" "}
              <span className="text-lg font-semibold text-gray-800">
                {formatKRW(netAmount)}
              </span>
            </p>
          )}
          <div className="relative mt-3 w-full">
            {mode === "asset" ? (
              <svg viewBox={`0 0 ${WIDTH} ${ASSET_HEIGHT}`} className="w-full">
                <defs>
                  <clipPath
                    id={BELOW_ZERO_CLIP_ID}
                    clipPathUnits="userSpaceOnUse"
                  >
                    <rect
                      x={0}
                      y={zeroY}
                      width={WIDTH}
                      height={Math.max(0, ASSET_HEIGHT - zeroY)}
                    />
                  </clipPath>
                </defs>
                {bands.map((band) => (
                  <g key={band.id}>
                    <polygon
                      points={band.points}
                      fill={band.fill}
                      fillOpacity={0.55}
                      stroke={band.stroke}
                      strokeWidth={band.stroke ? 2 : 0}
                    >
                      <title>{band.name}</title>
                    </polygon>
                    <polygon
                      points={band.points}
                      fill={DEFICIT_COLOR}
                      fillOpacity={0.55}
                      clipPath={`url(#${BELOW_ZERO_CLIP_ID})`}
                      pointerEvents="none"
                    />
                  </g>
                ))}
                <line
                  x1={PADDING}
                  y1={zeroY}
                  x2={WIDTH - PADDING}
                  y2={zeroY}
                  stroke="#9ca3af"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                />
                <text
                  x={PADDING}
                  y={Math.min(ASSET_HEIGHT - PADDING - 3, zeroY - 3)}
                  className="fill-gray-400 text-[9px]"
                >
                  0
                </text>
                <line
                  x1={cursorX}
                  y1={PADDING}
                  x2={cursorX}
                  y2={ASSET_HEIGHT - PADDING}
                  stroke="#4338ca"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                />
                <circle
                  cx={cursorX}
                  cy={cursorY}
                  r={4}
                  fill="#4338ca"
                  stroke="white"
                  strokeWidth={1.5}
                />
                <text
                  x={nearRightEdge ? cursorX - 8 : cursorX + 8}
                  y={Math.max(10, cursorY - 6)}
                  textAnchor={nearRightEdge ? "end" : "start"}
                  className="fill-gray-700 text-[10px] font-medium"
                >
                  {formatKRW(displayBalance)}
                </text>
                {hoverX !== null && (
                  <>
                    <line
                      x1={hoverX}
                      y1={PADDING}
                      x2={hoverX}
                      y2={ASSET_HEIGHT - PADDING}
                      stroke="#9ca3af"
                      strokeWidth={1}
                      strokeDasharray="2 2"
                      pointerEvents="none"
                    />
                    {rawBands.map((band) => (
                      <circle
                        key={`hover-${band.id}`}
                        cx={hoverX}
                        cy={scaleY(band.top[hoverMonth!])}
                        r={3}
                        fill={band.fill}
                        stroke="white"
                        strokeWidth={1.2}
                        pointerEvents="none"
                      />
                    ))}
                  </>
                )}
                <rect
                  x={0}
                  y={0}
                  width={WIDTH}
                  height={ASSET_HEIGHT}
                  fill="transparent"
                  onPointerMove={handlePointerMove}
                  onPointerLeave={() => setHoverMonth(null)}
                />
              </svg>
            ) : (
              <svg viewBox={`0 0 ${WIDTH} ${FLOW_HEIGHT}`} className="w-full">
                <line
                  x1={PADDING}
                  y1={flowBaselineY}
                  x2={WIDTH - PADDING}
                  y2={flowBaselineY}
                  stroke="#d1d5db"
                  strokeWidth={1}
                />
                {snapshots.map((snapshot, i) => {
                  const x = PADDING + i * stepX - flowBarWidth / 2;
                  const incomeHeight = scaleFlow(flows[i].incomeIn);
                  const expenseHeight = scaleFlow(flows[i].expenseOut);
                  return (
                    <g key={snapshot.monthIndex}>
                      <rect
                        x={x}
                        y={flowBaselineY - incomeHeight}
                        width={flowBarWidth}
                        height={incomeHeight}
                        fill="#10b981"
                        fillOpacity={0.7}
                        pointerEvents="none"
                      />
                      <rect
                        x={x}
                        y={flowBaselineY}
                        width={flowBarWidth}
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
                  y2={FLOW_HEIGHT - PADDING}
                  stroke="#4338ca"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  pointerEvents="none"
                />
                {hoverX !== null && hoverFlow && (
                  <>
                    <line
                      x1={hoverX}
                      y1={PADDING}
                      x2={hoverX}
                      y2={FLOW_HEIGHT - PADDING}
                      stroke="#9ca3af"
                      strokeWidth={1}
                      strokeDasharray="2 2"
                      pointerEvents="none"
                    />
                    <circle
                      cx={hoverX}
                      cy={
                        flowBaselineY -
                        scaleFlow(hoverFlow.incomeIn - hoverFlow.expenseOut)
                      }
                      r={4}
                      fill="#1f2937"
                      stroke="white"
                      strokeWidth={1.5}
                      pointerEvents="none"
                    />
                  </>
                )}
                <rect
                  x={0}
                  y={0}
                  width={WIDTH}
                  height={FLOW_HEIGHT}
                  fill="transparent"
                  onPointerMove={handlePointerMove}
                  onPointerLeave={() => setHoverMonth(null)}
                />
              </svg>
            )}
            {tooltipLines.length > 0 && (
              <ChartTooltip
                xPercent={hoverPercent.x}
                yPercent={hoverPercent.y}
                lines={tooltipLines}
              />
            )}
            {mode === "asset" && goalUnreachableInRange && (
              <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center px-2">
                <div className="flex items-center gap-1.5 rounded-full border border-rose-300 bg-rose-50/95 px-3 py-1.5 text-xs font-medium text-rose-600 shadow-sm backdrop-blur-sm">
                  <TriangleAlert className="h-3.5 w-3.5 shrink-0" />이 범위
                  내에서는 목표에 도달할 수 없어요
                </div>
              </div>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
            {mode === "asset" ? (
              assets.map((asset) => (
                <span key={asset.id} className="flex items-center gap-1">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: asset.color }}
                  />
                  {asset.name}
                </span>
              ))
            ) : (
              <>
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
              </>
            )}
          </div>
        </>
      )}
      <div className="mt-3 border-t border-white/60 pt-3">
        <TimelineSlider
          selectedMonth={selectedMonth}
          onChange={onChangeMonth}
          today={today}
          horizonMonths={horizonMonths}
        />
      </div>
    </div>
  );
}
