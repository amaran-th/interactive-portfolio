"use client";

import {
  AssetClass,
  Group,
  MonthSnapshot,
  UNGROUPED_COLOR,
  UNGROUPED_LABEL,
  formatKRW,
} from "./types";

type AssetAreaChartProps = {
  snapshots: MonthSnapshot[];
  groups: Group[];
  assetClasses: AssetClass[];
  selectedMonth: number;
};

const WIDTH = 600;
const HEIGHT = 220;
const PADDING = 12;

export default function AssetAreaChart({
  snapshots,
  groups,
  assetClasses,
  selectedMonth,
}: AssetAreaChartProps) {
  if (assetClasses.length === 0 || snapshots.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-2xl border border-white/40 bg-white/70 text-sm text-gray-400 backdrop-blur">
        자산군을 추가하면 그래프가 나타납니다
      </div>
    );
  }

  const hasUngrouped = assetClasses.some((a) => !a.groupId);
  const bandDefs = [
    ...groups.map((g) => ({ id: g.id, color: g.color })),
    ...(hasUngrouped
      ? [{ id: "__ungrouped__", color: UNGROUPED_COLOR }]
      : []),
  ];

  const maxTotal = Math.max(1, ...snapshots.map((s) => s.totalBalance));
  const stepX = (WIDTH - PADDING * 2) / (snapshots.length - 1);
  const scaleY = (value: number) =>
    HEIGHT - PADDING - (value / maxTotal) * (HEIGHT - PADDING * 2);

  const { bands } = bandDefs.reduce<{
    prevTop: number[];
    bands: { id: string; color: string; points: string }[];
  }>(
    (acc, band) => {
      const bottom = acc.prevTop;
      const top = snapshots.map((snapshot, i) => {
        const value =
          band.id === "__ungrouped__"
            ? snapshot.ungroupedTotalKRW
            : (snapshot.groupTotals[band.id] ?? 0);
        return bottom[i] + value;
      });

      const topPoints = top.map(
        (value, i) => `${PADDING + i * stepX},${scaleY(value)}`,
      );
      const bottomPoints = bottom
        .map((value, i) => `${PADDING + i * stepX},${scaleY(value)}`)
        .reverse();

      return {
        prevTop: top,
        bands: [
          ...acc.bands,
          {
            id: band.id,
            color: band.color,
            points: [...topPoints, ...bottomPoints].join(" "),
          },
        ],
      };
    },
    { prevTop: snapshots.map(() => 0), bands: [] },
  );

  const cursorX = PADDING + selectedMonth * stepX;
  const totalBalance = snapshots[selectedMonth]?.totalBalance ?? 0;

  return (
    <div className="rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
      <p className="text-sm text-gray-500">
        총자산{" "}
        <span className="text-lg font-semibold text-gray-800">
          {formatKRW(totalBalance)}
        </span>
      </p>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="mt-2 w-full">
        {bands.map((band) => (
          <polygon
            key={band.id}
            points={band.points}
            fill={band.color}
            fillOpacity={0.55}
          />
        ))}
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
    </div>
  );
}
