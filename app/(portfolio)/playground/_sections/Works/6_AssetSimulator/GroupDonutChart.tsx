"use client";

import { useState } from "react";
import {
  AssetClass,
  Group,
  MonthSnapshot,
  UNGROUPED_LABEL,
  formatKRW,
} from "./types";

type GroupDonutChartProps = {
  groups: Group[];
  assetClasses: AssetClass[];
  snapshot: MonthSnapshot;
};

type Slice = {
  id: string;
  name: string;
  amount: number;
  ratio: number;
  color: string;
  dashArray: string;
  dashOffset: number;
};

const SIZE = 160;
const STROKE = 24;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const UNGROUPED_TAB_ID = "__ungrouped__";

export default function GroupDonutChart({
  groups,
  assetClasses,
  snapshot,
}: GroupDonutChartProps) {
  const hasUngrouped = assetClasses.some((a) => !a.groupId);
  const tabs = [
    ...groups.map((g) => ({ id: g.id, name: g.name })),
    ...(hasUngrouped ? [{ id: UNGROUPED_TAB_ID, name: UNGROUPED_LABEL }] : []),
  ];

  const [selectedTabId, setSelectedTabId] = useState(tabs[0]?.id ?? "");
  const activeTabId = tabs.some((t) => t.id === selectedTabId)
    ? selectedTabId
    : tabs[0]?.id;

  if (!activeTabId) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-2xl border border-white/40 bg-white/70 text-sm text-gray-400 backdrop-blur">
        📭 자산을 추가하면 비율이 나타납니다
      </div>
    );
  }

  const assetsInTab =
    activeTabId === UNGROUPED_TAB_ID
      ? assetClasses.filter((a) => !a.groupId)
      : assetClasses.filter((a) => a.groupId === activeTabId);
  const tabTotal =
    activeTabId === UNGROUPED_TAB_ID
      ? snapshot.ungroupedTotalKRW
      : (snapshot.groupTotals[activeTabId] ?? 0);

  const { items: slices } = assetsInTab.reduce<{
    offset: number;
    items: Slice[];
  }>(
    (acc, asset) => {
      const amount = snapshot.assetBalancesKRW[asset.id] ?? 0;
      const ratio = tabTotal > 0 ? amount / tabTotal : 0;
      const dash = ratio * CIRCUMFERENCE;
      const slice: Slice = {
        id: asset.id,
        name: asset.name,
        amount,
        ratio,
        color: asset.color,
        dashArray: `${dash} ${CIRCUMFERENCE - dash}`,
        dashOffset: -acc.offset,
      };
      return { offset: acc.offset + dash, items: [...acc.items, slice] };
    },
    { offset: 0, items: [] },
  );

  return (
    <div className="rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
      <p className="text-sm text-gray-500">🥧 그룹별 비율</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSelectedTabId(tab.id)}
            className={`rounded-full px-3 py-1 text-xs ${
              tab.id === activeTabId
                ? "bg-indigo-500 text-white"
                : "bg-white/80 text-gray-600"
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-4">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
            {assetsInTab.length === 0 ? (
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
              {slice.name} · {Math.round(slice.ratio * 100)}% ·{" "}
              {formatKRW(slice.amount)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
