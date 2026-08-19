"use client";

import {
  AssetClass,
  Group,
  MonthSnapshot,
  UNGROUPED_COLOR,
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

type Segment = { id: string; color: string; y: number; height: number };

export default function ComparisonBarChart({
  snapshots,
  groups,
  assetClasses,
  selectedMonth,
}: ComparisonBarChartProps) {
  if (assetClasses.length === 0 || snapshots.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-2xl border border-white/40 bg-white/70 text-sm text-gray-400 backdrop-blur">
        자산군을 추가하면 비교 그래프가 나타납니다
      </div>
    );
  }

  const nowSnapshot = snapshots[0];
  const futureSnapshot = snapshots[selectedMonth];
  const hasUngrouped = assetClasses.some((a) => !a.groupId);
  const segmentDefs = [
    ...groups.map((g) => ({ id: g.id, color: g.color })),
    ...(hasUngrouped ? [{ id: "__ungrouped__", color: UNGROUPED_COLOR }] : []),
  ];

  const maxTotal = Math.max(
    1,
    nowSnapshot.totalBalance,
    futureSnapshot.totalBalance,
  );

  const buildSegments = (snapshot: MonthSnapshot): Segment[] => {
    const { segments } = segmentDefs.reduce<{
      cursor: number;
      segments: Segment[];
    }>(
      (acc, def) => {
        const value =
          def.id === "__ungrouped__"
            ? snapshot.ungroupedTotalKRW
            : (snapshot.groupTotals[def.id] ?? 0);
        const height = (value / maxTotal) * MAX_BAR_HEIGHT;
        const y = BASE_Y - acc.cursor - height;
        return {
          cursor: acc.cursor + height,
          segments: [
            ...acc.segments,
            { id: def.id, color: def.color, y, height },
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
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full">
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
            height={Math.max(0, seg.height)}
            fill={seg.color}
            fillOpacity={0.75}
          />
        ))}
        {futureSegments.map((seg) => (
          <rect
            key={seg.id}
            x={futureX}
            y={seg.y}
            width={BAR_WIDTH}
            height={Math.max(0, seg.height)}
            fill={seg.color}
            fillOpacity={0.75}
          />
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
    </div>
  );
}
