"use client";

import {
  AssetClass,
  Group,
  MonthSnapshot,
  formatKRW,
  formatMonthsFromNow,
} from "./types";

type ComparisonBarChartProps = {
  snapshots: MonthSnapshot[];
  groups: Group[];
  assetClasses: AssetClass[];
  selectedMonth: number;
};

const WIDTH = 260;
const HEIGHT = 220;
const BAR_WIDTH = 64;
const BASE_Y = HEIGHT - 30;
const MAX_BAR_HEIGHT = 160;
const DEFICIT_COLOR = "#f43f5e";

type Segment = {
  id: string;
  name: string;
  fill: string;
  stroke: string | undefined;
  y: number;
  height: number;
};

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

export default function ComparisonBarChart({
  snapshots,
  groups,
  assetClasses,
  selectedMonth,
}: ComparisonBarChartProps) {
  if (assetClasses.length === 0 || snapshots.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-2xl border border-white/40 bg-white/70 text-sm text-gray-400 backdrop-blur">
        📭 자산을 추가하면 비교 그래프가 나타납니다
      </div>
    );
  }

  const nowSnapshot = snapshots[0];
  const futureSnapshot = snapshots[selectedMonth];
  const assets = orderedAssets(assetClasses, groups);

  const maxTotal = Math.max(
    1,
    nowSnapshot.totalBalance,
    futureSnapshot.totalBalance,
  );

  const buildSegments = (snapshot: MonthSnapshot): Segment[] => {
    const { segments } = assets.reduce<{
      cursor: number;
      segments: Segment[];
    }>(
      (acc, asset) => {
        const value = snapshot.assetBalancesKRW[asset.id] ?? 0;
        const height = (value / maxTotal) * MAX_BAR_HEIGHT;
        const stackTop = BASE_Y - acc.cursor;
        const isNegative = height < 0;
        const rectY = isNegative ? stackTop : stackTop - height;
        const rectHeight = Math.abs(height);
        const group = groups.find((g) => g.id === asset.groupId);
        return {
          cursor: acc.cursor + height,
          segments: [
            ...acc.segments,
            {
              id: asset.id,
              name: asset.name,
              fill: isNegative ? DEFICIT_COLOR : asset.color,
              stroke: group?.color,
              y: rectY,
              height: rectHeight,
            },
          ],
        };
      },
      { cursor: 0, segments: [] },
    );
    return segments;
  };

  const nowSegments = buildSegments(nowSnapshot);
  const futureSegments = buildSegments(futureSnapshot);
  const nowX = WIDTH / 2 - BAR_WIDTH - 16;
  const futureX = WIDTH / 2 + 16;

  return (
    <div className="rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
      <p className="text-sm text-gray-500">📊 자산 비교</p>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full">
        <line
          x1={0}
          y1={BASE_Y}
          x2={WIDTH}
          y2={BASE_Y}
          stroke="#e5e7eb"
          strokeWidth={1}
        />
        <text
          x={nowX + BAR_WIDTH / 2}
          y={16}
          textAnchor="middle"
          className="fill-gray-600 text-[11px]"
        >
          {formatKRW(nowSnapshot.totalBalance)}
        </text>
        <text
          x={futureX + BAR_WIDTH / 2}
          y={16}
          textAnchor="middle"
          className="fill-gray-600 text-[11px]"
        >
          {formatKRW(futureSnapshot.totalBalance)}
        </text>
        {nowSegments.map((seg) => (
          <rect
            key={seg.id}
            x={nowX}
            y={seg.y}
            width={BAR_WIDTH}
            height={seg.height}
            fill={seg.fill}
            fillOpacity={0.75}
            stroke={seg.stroke}
            strokeWidth={seg.stroke ? 2 : 0}
          >
            <title>{seg.name}</title>
          </rect>
        ))}
        {futureSegments.map((seg) => (
          <rect
            key={seg.id}
            x={futureX}
            y={seg.y}
            width={BAR_WIDTH}
            height={seg.height}
            fill={seg.fill}
            fillOpacity={0.75}
            stroke={seg.stroke}
            strokeWidth={seg.stroke ? 2 : 0}
          >
            <title>{seg.name}</title>
          </rect>
        ))}
        <text
          x={nowX + BAR_WIDTH / 2}
          y={HEIGHT - 12}
          textAnchor="middle"
          className="fill-gray-500 text-[11px]"
        >
          지금
        </text>
        <text
          x={futureX + BAR_WIDTH / 2}
          y={HEIGHT - 12}
          textAnchor="middle"
          className="fill-gray-500 text-[11px]"
        >
          {selectedMonth === 0 ? "지금" : formatMonthsFromNow(selectedMonth)}
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
      </div>
    </div>
  );
}
