"use client";

import { useState } from "react";
import { AssetClass, Group, MonthSnapshot } from "./types";

type GroupDonutChartProps = {
  groups: Group[];
  assetClasses: AssetClass[];
  snapshot: MonthSnapshot;
};

type Slice = {
  id: string;
  name: string;
  ratio: number;
  color: string;
  dashArray: string;
  dashOffset: number;
};

const SIZE = 160;
const STROKE = 24;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const SLICE_COLORS = [
  "#6366f1",
  "#a855f7",
  "#14b8a6",
  "#ec4899",
  "#3b82f6",
  "#f59e0b",
];

export default function GroupDonutChart({
  groups,
  assetClasses,
  snapshot,
}: GroupDonutChartProps) {
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id ?? "");
  const activeGroupId = groups.some((g) => g.id === selectedGroupId)
    ? selectedGroupId
    : groups[0]?.id;

  if (!activeGroupId) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-2xl border border-white/40 bg-white/70 text-sm text-gray-400 backdrop-blur">
        그룹을 추가하면 비율을 볼 수 있습니다
      </div>
    );
  }

  const assetsInGroup = assetClasses.filter(
    (a) => a.groupId === activeGroupId,
  );
  const groupTotal = snapshot.groupTotals[activeGroupId] ?? 0;

  const { items: slices } = assetsInGroup.reduce<{
    offset: number;
    items: Slice[];
  }>(
    (acc, asset, i) => {
      const value = snapshot.assetBalances[asset.id] ?? 0;
      const ratio = groupTotal > 0 ? value / groupTotal : 0;
      const dash = ratio * CIRCUMFERENCE;
      const slice: Slice = {
        id: asset.id,
        name: asset.name,
        ratio,
        color: SLICE_COLORS[i % SLICE_COLORS.length],
        dashArray: `${dash} ${CIRCUMFERENCE - dash}`,
        dashOffset: -acc.offset,
      };
      return { offset: acc.offset + dash, items: [...acc.items, slice] };
    },
    { offset: 0, items: [] },
  );

  return (
    <div className="rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
      <div className="flex flex-wrap gap-2">
        {groups.map((group) => (
          <button
            key={group.id}
            type="button"
            onClick={() => setSelectedGroupId(group.id)}
            className={`rounded-full px-3 py-1 text-xs ${
              group.id === activeGroupId
                ? "bg-indigo-500 text-white"
                : "bg-white/80 text-gray-600"
            }`}
          >
            {group.name}
          </button>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-4">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
            {assetsInGroup.length === 0 ? (
              <circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke="#e5e7eb"
                strokeWidth={STROKE}
              />
            ) : (
              slices.map((slice) => (
                <circle
                  key={slice.id}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth={STROKE}
                  strokeDasharray={slice.dashArray}
                  strokeDashoffset={slice.dashOffset}
                />
              ))
            )}
          </g>
        </svg>
        <ul className="flex flex-col gap-1 text-sm">
          {slices.map((slice) => (
            <li key={slice.id} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              {slice.name} · {Math.round(slice.ratio * 100)}%
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
