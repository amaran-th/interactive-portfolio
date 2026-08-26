"use client";

import { useState } from "react";
import { Inbox, PieChart as PieChartIcon, TrendingDown } from "lucide-react";
import {
  AssetClass,
  Group,
  MonthSnapshot,
  UNGROUPED_LABEL,
  formatKRW,
} from "./types";
import ChartTooltip from "./ChartTooltip";

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
  isLiability: boolean;
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
  const hasLiabilities = assetClasses.some(
    (a) => (snapshot.assetBalancesKRW[a.id] ?? 0) < 0,
  );
  const [includeLiabilities, setIncludeLiabilities] = useState(false);
  const [hoveredSlice, setHoveredSlice] = useState<Slice | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });

  if (!activeTabId) {
    return (
      <div className="flex h-[220px] items-center justify-center gap-1.5 rounded-2xl border border-white/40 bg-white/70 text-sm text-gray-400 backdrop-blur">
        <Inbox className="h-4 w-4" /> 자산을 추가하면 비율이 나타납니다
      </div>
    );
  }

  const assetsInGroup =
    activeTabId === UNGROUPED_TAB_ID
      ? assetClasses.filter((a) => !a.groupId)
      : assetClasses.filter((a) => a.groupId === activeTabId);
  const assetsInTab = includeLiabilities
    ? assetsInGroup
    : assetsInGroup.filter((a) => (snapshot.assetBalancesKRW[a.id] ?? 0) >= 0);
  const tabTotal = assetsInTab.reduce(
    (sum, a) => sum + Math.abs(snapshot.assetBalancesKRW[a.id] ?? 0),
    0,
  );

  const { items: slices } = assetsInTab.reduce<{
    offset: number;
    items: Slice[];
  }>(
    (acc, asset) => {
      const amount = snapshot.assetBalancesKRW[asset.id] ?? 0;
      const ratio = tabTotal > 0 ? Math.abs(amount) / tabTotal : 0;
      const dash = ratio * CIRCUMFERENCE;
      const slice: Slice = {
        id: asset.id,
        name: asset.name,
        amount,
        ratio,
        color: asset.color,
        dashArray: `${dash} ${CIRCUMFERENCE - dash}`,
        dashOffset: -acc.offset,
        isLiability: amount < 0,
      };
      return { offset: acc.offset + dash, items: [...acc.items, slice] };
    },
    { offset: 0, items: [] },
  );

  return (
    <div className="flex h-full flex-col rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm text-gray-500">
          <PieChartIcon className="h-4 w-4" /> 그룹별 비율
        </p>
        {hasLiabilities && (
          <label className="flex items-center gap-1.5 text-xs text-gray-500">
            <input
              type="checkbox"
              checked={includeLiabilities}
              onChange={(e) => setIncludeLiabilities(e.target.checked)}
            />
            부채 포함
          </label>
        )}
      </div>
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
      <div className="mt-3 flex flex-1 items-center gap-4">
        <div className="relative shrink-0">
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
                  onPointerMove={(e) => {
                    const rect = e.currentTarget
                      .ownerSVGElement!.getBoundingClientRect();
                    setHoverPos({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                    });
                    setHoveredSlice(slice);
                  }}
                  onPointerLeave={() => setHoveredSlice(null)}
                />
              ))
            )}
          </g>
        </svg>
        {hoveredSlice && (
          <ChartTooltip
            xPercent={(hoverPos.x / SIZE) * 100}
            yPercent={(hoverPos.y / SIZE) * 100}
            accentColor={hoveredSlice.color}
            lines={[
              hoveredSlice.name,
              `${Math.round(hoveredSlice.ratio * 100)}% · ${formatKRW(hoveredSlice.amount)}`,
            ]}
          />
        )}
        </div>
        <ul className="flex flex-col gap-1 text-sm">
          {slices.map((slice) => (
            <li key={slice.id} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              {slice.isLiability && (
                <TrendingDown className="h-3.5 w-3.5 shrink-0 text-rose-500" />
              )}
              {slice.name} · {Math.round(slice.ratio * 100)}% ·{" "}
              <span className={slice.isLiability ? "text-rose-500" : ""}>
                {formatKRW(slice.amount)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
