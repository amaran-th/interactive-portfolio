"use client";

import { Inbox } from "lucide-react";
import { useState } from "react";
import {
  AssetClass,
  Goal,
  Group,
  MonthSnapshot,
  SimulationInput,
  formatKRW,
  toRealValue,
} from "./types";
import TimelineSlider from "./TimelineSlider";
import GoalCard from "./GoalCard";
import ChartTooltip from "./ChartTooltip";

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

const WIDTH = 600;
const HEIGHT = 150;
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
  const date = new Date(
    today.getFullYear(),
    today.getMonth() + monthIndex,
    1,
  );
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
  const [hoverMonth, setHoverMonth] = useState<number | null>(null);
  const [hoverPercent, setHoverPercent] = useState({ x: 0, y: 0 });

  const assets = isEmpty ? [] : orderedAssets(assetClasses, groups);
  const maxTotal = isEmpty
    ? 1
    : Math.max(1, ...snapshots.map((s) => s.totalBalance));
  const stepX = isEmpty ? 1 : (WIDTH - PADDING * 2) / (snapshots.length - 1);

  const { bands: rawBands, minValue, maxValue } = assets.reduce<{
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
        (snapshot, i) =>
          bottom[i] + (snapshot.assetBalancesKRW[asset.id] ?? 0),
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
    HEIGHT -
    PADDING -
    ((value - domainMin) / domainRange) * (HEIGHT - PADDING * 2);
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
  const totalBalance = snapshots[selectedMonth]?.totalBalance ?? 0;
  const displayBalance = inflationEnabled
    ? toRealValue(totalBalance, selectedMonth, inflationRate)
    : totalBalance;
  const cursorY = scaleY(totalBalance);
  const nearRightEdge = cursorX > WIDTH - PADDING - 60;

  const hoverSnapshot = hoverMonth !== null ? snapshots[hoverMonth] : null;
  const tooltipLines = hoverSnapshot
    ? [
        monthLabel(hoverMonth!, today),
        `총자산 ${formatKRW(hoverSnapshot.totalBalance)}`,
        ...assets.map(
          (asset) =>
            `${asset.name} ${formatKRW(hoverSnapshot.assetBalancesKRW[asset.id] ?? 0)}`,
        ),
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
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
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
          <div className="relative mt-3 w-full">
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full">
            <defs>
              <clipPath id={BELOW_ZERO_CLIP_ID} clipPathUnits="userSpaceOnUse">
                <rect
                  x={0}
                  y={zeroY}
                  width={WIDTH}
                  height={Math.max(0, HEIGHT - zeroY)}
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
              y={Math.min(HEIGHT - PADDING - 3, zeroY - 3)}
              className="fill-gray-400 text-[9px]"
            >
              0
            </text>
            <line
              x1={cursorX}
              y1={PADDING}
              x2={cursorX}
              y2={HEIGHT - PADDING}
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
          {hoverSnapshot && (
            <ChartTooltip
              xPercent={hoverPercent.x}
              yPercent={hoverPercent.y}
              lines={tooltipLines}
            />
          )}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
            {assets.map((asset) => (
              <span key={asset.id} className="flex items-center gap-1">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: asset.color }}
                />
                {asset.name}
              </span>
            ))}
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
