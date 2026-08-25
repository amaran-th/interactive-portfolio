"use client";

import { Inbox, LineChart as LineChartIcon } from "lucide-react";
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
  onToggleInflation: () => void;
  onSetInflationRate: (rate: number) => void;
};

const WIDTH = 600;
const HEIGHT = 220;
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
  onToggleInflation,
  onSetInflationRate,
}: AssetAreaChartProps) {
  const isEmpty = assetClasses.length === 0 || snapshots.length === 0;

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

  const maxFlow = isEmpty
    ? 1
    : Math.max(
        1,
        ...snapshots.map((s) => Math.max(s.flow.incomeIn, s.flow.expenseOut)),
      );
  const scaleFlow = (value: number) =>
    HEIGHT - PADDING - (value / maxFlow) * (HEIGHT - PADDING * 2);
  const incomePoints = snapshots
    .map(
      (snapshot, i) =>
        `${PADDING + i * stepX},${scaleFlow(snapshot.flow.incomeIn)}`,
    )
    .join(" ");
  const expensePoints = snapshots
    .map(
      (snapshot, i) =>
        `${PADDING + i * stepX},${scaleFlow(snapshot.flow.expenseOut)}`,
    )
    .join(" ");

  return (
    <div className="rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
      {isEmpty ? (
        <div className="flex h-[180px] items-center justify-center gap-1.5 text-sm text-gray-400">
          <Inbox className="h-4 w-4" /> 자산을 추가하면 그래프가 나타납니다
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
            <p className="flex items-center gap-1.5">
              <LineChartIcon className="h-4 w-4" />{" "}
              {inflationEnabled ? "현재 자산(오늘 가치)" : "현재 자산"}{" "}
              <span className="text-lg font-semibold text-gray-800">
                {formatKRW(displayBalance)}
              </span>
            </p>
            <GoalCard
              goal={goal}
              onSetGoal={onSetGoal}
              assetClasses={assetClasses}
              groups={groups}
              simulationInput={simulationInput}
              today={today}
              inflationEnabled={inflationEnabled}
              inflationRate={inflationRate}
            />
            <div className="flex w-full items-center gap-1.5 text-xs text-gray-500">
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={inflationEnabled}
                  onChange={onToggleInflation}
                />
                물가상승률 반영
              </label>
              {inflationEnabled && (
                <>
                  <input
                    type="number"
                    value={inflationRate}
                    onChange={(e) =>
                      onSetInflationRate(Number(e.target.value) || 0)
                    }
                    className="w-14 rounded-full border border-gray-200 bg-white/80 px-2 py-0.5 text-xs outline-none focus:border-gray-400"
                  />
                  <span>% (연간)</span>
                </>
              )}
            </div>
          </div>
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="mt-3 w-full">
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
            <polyline
              points={incomePoints}
              fill="none"
              stroke="#10b981"
              strokeWidth={1.5}
              strokeOpacity={0.8}
            />
            <polyline
              points={expensePoints}
              fill="none"
              stroke="#f43f5e"
              strokeWidth={1.5}
              strokeOpacity={0.8}
            />
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
          </svg>
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
            <span className="flex items-center gap-1">
              <span className="h-0.5 w-3 rounded-full bg-emerald-500" />
              수입
            </span>
            <span className="flex items-center gap-1">
              <span className="h-0.5 w-3 rounded-full bg-rose-500" />
              지출
            </span>
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
