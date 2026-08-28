"use client";

import { useState } from "react";
import { Inbox, PieChart as PieChartIcon, TrendingDown } from "lucide-react";
import {
  AssetClass,
  GROUP_PALETTE,
  Group,
  MonthSnapshot,
  formatKRW,
} from "./types";
import ChartTooltip from "./ChartTooltip";

type GroupDonutChartProps = {
  groups: Group[];
  assetClasses: AssetClass[];
  snapshot: MonthSnapshot;
};

type Item = { id: string; name: string; amount: number; color: string };

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

const SIZE = 108;
const STROKE = 18;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const ALL_TAB_ID = "__all__";

/** Extra room reserved around the ring for outside labels, and how far
 * past the ring's outer edge each label's anchor point sits. Sized to fit
 * this panel's narrower column share (see AssetSimulator's row2 grid). */
const LABEL_MARGIN = 60;
const LABEL_GAP = 12;
const TEXT_GAP = LABEL_GAP + 8;
const LABEL_TEXT_WIDTH = 64;
const CONTAINER_SIZE = SIZE + LABEL_MARGIN * 2;

/** Angle to a slice's arc midpoint (the dash math runs inside a
 * `rotate(-90)` group, so this reproduces that rotation manually for
 * label placement outside that group). */
function sliceAngleRad(slice: Slice): number {
  const midOffset = -slice.dashOffset + (slice.ratio * CIRCUMFERENCE) / 2;
  return ((-90 + (midOffset / CIRCUMFERENCE) * 360) * Math.PI) / 180;
}

export default function GroupDonutChart({
  groups,
  assetClasses,
  snapshot,
}: GroupDonutChartProps) {
  const tabs = [
    { id: ALL_TAB_ID, name: "전체" },
    ...groups.map((g) => ({ id: g.id, name: g.name })),
  ];

  const [selectedTabId, setSelectedTabId] = useState(tabs[0]?.id ?? "");
  const activeTabId = tabs.some((t) => t.id === selectedTabId)
    ? selectedTabId
    : tabs[0]?.id;
  const hasLiabilities = assetClasses.some(
    (a) => (snapshot.assetBalancesKRW[a.id] ?? 0) < 0,
  );
  const [includeLiabilities, setIncludeLiabilities] = useState(false);
  const [legendMode, setLegendMode] = useState<"ratio" | "amount">("ratio");
  const [hoveredSlice, setHoveredSlice] = useState<Slice | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });

  if (assetClasses.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center gap-1.5 break-keep rounded-2xl border border-white/40 bg-white/70 text-center text-sm text-gray-400 backdrop-blur">
        <Inbox className="h-4 w-4 shrink-0" /> 자산을 추가하면 비율이 나타납니다
      </div>
    );
  }

  // "전체" 탭: 그룹은 하나로 합쳐 그룹 색으로, 미분류 자산은 자기 색으로
  // — 자산 비교 그래프와 같은 방식. 특정 그룹 탭에서는 그 안의 자산들이
  // 다른 곳에서 전부 그룹 색을 공유하므로, 여기서는 도넛 안에서만 쓰는
  // 색을 따로 생성해 슬라이스가 서로 구분되게 한다.
  const items: Item[] =
    activeTabId === ALL_TAB_ID
      ? [
          ...groups
            .filter((g) => assetClasses.some((a) => a.groupId === g.id))
            .map((g) => ({
              id: g.id,
              name: g.name,
              amount: assetClasses
                .filter((a) => a.groupId === g.id)
                .reduce(
                  (sum, a) => sum + (snapshot.assetBalancesKRW[a.id] ?? 0),
                  0,
                ),
              color: g.color,
            })),
          ...assetClasses
            .filter((a) => !a.groupId)
            .map((a) => ({
              id: a.id,
              name: a.name,
              amount: snapshot.assetBalancesKRW[a.id] ?? 0,
              color: a.color,
            })),
        ]
      : assetClasses
          .filter((a) => a.groupId === activeTabId)
          .map((a, i) => ({
            id: a.id,
            name: a.name,
            amount: snapshot.assetBalancesKRW[a.id] ?? 0,
            color: GROUP_PALETTE[i % GROUP_PALETTE.length],
          }));

  const itemsInTab = includeLiabilities
    ? items
    : items.filter((item) => item.amount >= 0);
  const tabTotal = itemsInTab.reduce(
    (sum, item) => sum + Math.abs(item.amount),
    0,
  );

  const { items: slices } = itemsInTab.reduce<{
    offset: number;
    items: Slice[];
  }>(
    (acc, item) => {
      const ratio = tabTotal > 0 ? Math.abs(item.amount) / tabTotal : 0;
      const dash = ratio * CIRCUMFERENCE;
      const slice: Slice = {
        id: item.id,
        name: item.name,
        amount: item.amount,
        ratio,
        color: item.color,
        dashArray: `${dash} ${CIRCUMFERENCE - dash}`,
        dashOffset: -acc.offset,
        isLiability: item.amount < 0,
      };
      return { offset: acc.offset + dash, items: [...acc.items, slice] };
    },
    { offset: 0, items: [] },
  );

  return (
    <div className="@container flex h-full flex-col rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm text-gray-500">
          <PieChartIcon className="h-4 w-4" /> 자산 비율
        </p>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-full bg-gray-100 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setLegendMode("ratio")}
              className={`rounded-full px-2 py-0.5 ${
                legendMode === "ratio"
                  ? "bg-white font-medium text-gray-800 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              비율
            </button>
            <button
              type="button"
              onClick={() => setLegendMode("amount")}
              className={`rounded-full px-2 py-0.5 ${
                legendMode === "amount"
                  ? "bg-white font-medium text-gray-800 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              금액
            </button>
          </div>
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
      <div className="mt-3 flex flex-1 items-center justify-center">
        <div
          className="relative shrink-0"
          style={{ width: CONTAINER_SIZE, height: CONTAINER_SIZE }}
        >
          <svg
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="absolute"
            style={{ left: LABEL_MARGIN, top: LABEL_MARGIN }}
          >
            <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
              {tabTotal === 0 ? (
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
          {tabTotal === 0 && (
            <div
              className="pointer-events-none absolute flex items-center justify-center break-keep px-5 text-center text-[11px] text-gray-400"
              style={{
                left: LABEL_MARGIN,
                top: LABEL_MARGIN,
                width: SIZE,
                height: SIZE,
              }}
            >
              표시할 데이터가 없어요
            </div>
          )}
          {hoveredSlice && (
            <div
              className="pointer-events-none absolute"
              style={{ left: LABEL_MARGIN, top: LABEL_MARGIN, width: SIZE, height: SIZE }}
            >
              <ChartTooltip
                xPercent={(hoverPos.x / SIZE) * 100}
                yPercent={(hoverPos.y / SIZE) * 100}
                accentColor={hoveredSlice.color}
                lines={[
                  hoveredSlice.name,
                  `${Math.round(hoveredSlice.ratio * 100)}% · ${formatKRW(hoveredSlice.amount)}`,
                ]}
              />
            </div>
          )}
          <svg
            width={CONTAINER_SIZE}
            height={CONTAINER_SIZE}
            viewBox={`0 0 ${CONTAINER_SIZE} ${CONTAINER_SIZE}`}
            className="pointer-events-none absolute inset-0"
          >
            {slices.map((slice) => {
              if (Math.round(slice.ratio * 100) === 0) return null;
              const angle = sliceAngleRad(slice);
              const cx = CONTAINER_SIZE / 2;
              const cy = CONTAINER_SIZE / 2;
              return (
                <line
                  key={slice.id}
                  x1={cx + (SIZE / 2) * Math.cos(angle)}
                  y1={cy + (SIZE / 2) * Math.sin(angle)}
                  x2={cx + (SIZE / 2 + LABEL_GAP) * Math.cos(angle)}
                  y2={cy + (SIZE / 2 + LABEL_GAP) * Math.sin(angle)}
                  stroke={slice.color}
                  strokeWidth={1.5}
                />
              );
            })}
          </svg>
          {slices.map((slice) => {
            if (Math.round(slice.ratio * 100) === 0) return null;
            const angle = sliceAngleRad(slice);
            const onRight = Math.cos(angle) >= 0;
            const x =
              CONTAINER_SIZE / 2 +
              (SIZE / 2 + TEXT_GAP) * Math.cos(angle);
            const y =
              CONTAINER_SIZE / 2 +
              (SIZE / 2 + TEXT_GAP) * Math.sin(angle);
            return (
              <div
                key={slice.id}
                className={`pointer-events-none absolute flex items-start gap-1 text-[11px] ${
                  onRight ? "" : "flex-row-reverse"
                }`}
                style={{
                  left: x,
                  top: y,
                  transform: `translate(${onRight ? "0" : "-100%"}, -50%)`,
                }}
              >
                {slice.isLiability && (
                  <TrendingDown className="mt-0.5 h-3 w-3 shrink-0 text-rose-500" />
                )}
                <span
                  className={`break-keep leading-tight ${onRight ? "text-left" : "text-right"} ${
                    slice.isLiability ? "text-rose-500" : "text-gray-600"
                  }`}
                  style={{ width: LABEL_TEXT_WIDTH }}
                >
                  {slice.name}{" "}
                  {legendMode === "ratio"
                    ? `${Math.round(slice.ratio * 100)}%`
                    : formatKRW(slice.amount)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
