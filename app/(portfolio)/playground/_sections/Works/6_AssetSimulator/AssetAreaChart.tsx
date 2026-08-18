"use client";

import { Group, MonthSnapshot } from "./types";

type AssetAreaChartProps = {
  snapshots: MonthSnapshot[];
  groups: Group[];
  selectedMonth: number;
};

const WIDTH = 600;
const HEIGHT = 220;
const PADDING = 12;

export default function AssetAreaChart({
  snapshots,
  groups,
  selectedMonth,
}: AssetAreaChartProps) {
  if (groups.length === 0 || snapshots.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-2xl border border-white/40 bg-white/70 text-sm text-gray-400 backdrop-blur">
        그룹과 자산군을 추가하면 그래프가 나타납니다
      </div>
    );
  }

  const maxTotal = Math.max(1, ...snapshots.map((s) => s.totalBalance));
  const stepX = (WIDTH - PADDING * 2) / (snapshots.length - 1);
  const scaleY = (value: number) =>
    HEIGHT - PADDING - (value / maxTotal) * (HEIGHT - PADDING * 2);

  const { bands } = groups.reduce<{
    prevTop: number[];
    bands: { groupId: string; color: string; points: string }[];
  }>(
    (acc, group) => {
      const bottom = acc.prevTop;
      const top = snapshots.map(
        (snapshot, i) => bottom[i] + (snapshot.groupTotals[group.id] ?? 0),
      );

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
            groupId: group.id,
            color: group.color,
            points: [...topPoints, ...bottomPoints].join(" "),
          },
        ],
      };
    },
    { prevTop: snapshots.map(() => 0), bands: [] },
  );

  const cursorX = PADDING + selectedMonth * stepX;

  return (
    <div className="rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full">
        {bands.map((band) => (
          <polygon
            key={band.groupId}
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
