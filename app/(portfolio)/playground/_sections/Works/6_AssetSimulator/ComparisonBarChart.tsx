"use client";

import { BarChart3, Inbox } from "lucide-react";
import { useState } from "react";
import {
  AssetClass,
  Group,
  MonthSnapshot,
  formatKRW,
  formatMonthsFromNow,
  toRealValue,
} from "./types";
import ChartTooltip from "./ChartTooltip";

type ComparisonBarChartProps = {
  snapshots: MonthSnapshot[];
  groups: Group[];
  assetClasses: AssetClass[];
  selectedMonth: number;
  inflationEnabled: boolean;
  inflationRate: number;
};

function realValueSnapshot(
  snapshot: MonthSnapshot,
  month: number,
  inflationEnabled: boolean,
  inflationRate: number,
): MonthSnapshot {
  if (!inflationEnabled) return snapshot;
  return {
    ...snapshot,
    totalBalance: toRealValue(snapshot.totalBalance, month, inflationRate),
    assetBalancesKRW: Object.fromEntries(
      Object.entries(snapshot.assetBalancesKRW).map(([id, value]) => [
        id,
        toRealValue(value, month, inflationRate),
      ]),
    ),
  };
}

const WIDTH = 260;
const HEIGHT = 220;
const BAR_WIDTH = 64;
const BASE_Y = HEIGHT - 30;
const MAX_BAR_HEIGHT = 160;
const DEFICIT_COLOR = "#f43f5e";
const BELOW_ZERO_CLIP_ID = "comparison-bar-below-zero-clip";

type RawSegment = {
  id: string;
  name: string;
  fill: string;
  bottom: number;
  top: number;
};

type Segment = {
  id: string;
  name: string;
  fill: string;
  y: number;
  height: number;
  amount: number;
};

type HoveredBar = {
  barLabel: string;
  segments: Segment[];
  totalBalance: number;
  xPercent: number;
  yPercent: number;
};

type LegendItem = { id: string; name: string; color: string };

/**
 * A group with no members contributes nothing and is left out. An asset
 * with no group is, by itself, a single-member group, so it keeps its own
 * color instead of borrowing one.
 */
function legendItems(assetClasses: AssetClass[], groups: Group[]): LegendItem[] {
  const nonEmptyGroups = groups.filter((g) =>
    assetClasses.some((a) => a.groupId === g.id),
  );
  const ungrouped = assetClasses.filter((a) => !a.groupId);
  return [
    ...nonEmptyGroups.map((g) => ({ id: g.id, name: g.name, color: g.color })),
    ...ungrouped.map((a) => ({ id: a.id, name: a.name, color: a.color })),
  ];
}

/** One segment per group (assets inside share the group's own color) plus
 * one segment per ungrouped asset (its own color). */
function buildRawSegments(
  snapshot: MonthSnapshot,
  groups: Group[],
  assetClasses: AssetClass[],
): { segments: RawSegment[]; min: number; max: number } {
  const groupItems = groups
    .filter((g) => assetClasses.some((a) => a.groupId === g.id))
    .map((g) => ({
      id: g.id,
      name: g.name,
      fill: g.color,
      value: assetClasses
        .filter((a) => a.groupId === g.id)
        .reduce((sum, a) => sum + (snapshot.assetBalancesKRW[a.id] ?? 0), 0),
    }));
  const ungroupedItems = assetClasses
    .filter((a) => !a.groupId)
    .map((a) => ({
      id: a.id,
      name: a.name,
      fill: a.color,
      value: snapshot.assetBalancesKRW[a.id] ?? 0,
    }));

  const result = [...groupItems, ...ungroupedItems].reduce<{
    cursor: number;
    min: number;
    max: number;
    segments: RawSegment[];
  }>(
    (acc, item) => {
      const bottom = acc.cursor;
      const top = acc.cursor + item.value;
      return {
        cursor: top,
        min: Math.min(acc.min, bottom, top),
        max: Math.max(acc.max, bottom, top),
        segments: [
          ...acc.segments,
          { id: item.id, name: item.name, fill: item.fill, bottom, top },
        ],
      };
    },
    { cursor: 0, min: 0, max: 0, segments: [] },
  );
  return { segments: result.segments, min: result.min, max: result.max };
}

export default function ComparisonBarChart({
  snapshots,
  groups,
  assetClasses,
  selectedMonth,
  inflationEnabled,
  inflationRate,
}: ComparisonBarChartProps) {
  const [hovered, setHovered] = useState<HoveredBar | null>(null);

  if (assetClasses.length === 0 || snapshots.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center gap-1.5 rounded-2xl border border-white/40 bg-white/70 text-sm text-gray-400 backdrop-blur">
        <Inbox className="h-4 w-4" /> 자산을 추가하면 비교 그래프가 나타납니다
      </div>
    );
  }

  const nowSnapshot = realValueSnapshot(
    snapshots[0],
    0,
    inflationEnabled,
    inflationRate,
  );
  const futureSnapshot = realValueSnapshot(
    snapshots[selectedMonth],
    selectedMonth,
    inflationEnabled,
    inflationRate,
  );

  const nowRaw = buildRawSegments(nowSnapshot, groups, assetClasses);
  const futureRaw = buildRawSegments(futureSnapshot, groups, assetClasses);
  const domainMin = Math.min(0, nowRaw.min, futureRaw.min);
  const domainMax = Math.max(1, nowRaw.max, futureRaw.max);
  const domainRange = domainMax - domainMin || 1;
  const scaleY = (value: number) =>
    BASE_Y - ((value - domainMin) / domainRange) * MAX_BAR_HEIGHT;
  const zeroY = scaleY(0);

  const toSegments = (raw: RawSegment[]): Segment[] =>
    raw.map((seg) => {
      const yBottom = scaleY(seg.bottom);
      const yTop = scaleY(seg.top);
      return {
        id: seg.id,
        name: seg.name,
        fill: seg.fill,
        y: Math.min(yTop, yBottom),
        height: Math.abs(yBottom - yTop),
        amount: seg.top - seg.bottom,
      };
    });

  const nowSegments = toSegments(nowRaw.segments);
  const futureSegments = toSegments(futureRaw.segments);
  const nowX = WIDTH / 2 - BAR_WIDTH - 16;
  const futureX = WIDTH / 2 + 16;

  const handleBarPointerMove = (
    e: React.PointerEvent<SVGGElement>,
    barLabel: string,
    segments: Segment[],
    totalBalance: number,
  ) => {
    const rect = e.currentTarget.ownerSVGElement!.getBoundingClientRect();
    setHovered({
      barLabel,
      segments,
      totalBalance,
      xPercent: ((e.clientX - rect.left) / rect.width) * 100,
      yPercent: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  return (
    <div className="flex h-full flex-col rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
      <p className="flex items-center gap-1.5 text-sm text-gray-500">
        <BarChart3 className="h-4 w-4" /> 자산 비교
        {inflationEnabled && (
          <span className="text-xs text-gray-400">(오늘 가치)</span>
        )}
      </p>
      <div className="flex flex-1 items-center justify-center">
      <div className="relative w-full">
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
        <line
          x1={0}
          y1={zeroY}
          x2={WIDTH}
          y2={zeroY}
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
        <g
          onPointerMove={(e) =>
            handleBarPointerMove(e, "지금", nowSegments, nowSnapshot.totalBalance)
          }
          onPointerLeave={() => setHovered(null)}
        >
          {nowSegments.map((seg) => (
            <g key={seg.id}>
              <rect
                x={nowX}
                y={seg.y}
                width={BAR_WIDTH}
                height={seg.height}
                fill={seg.fill}
                fillOpacity={0.75}
              />
              <rect
                x={nowX}
                y={seg.y}
                width={BAR_WIDTH}
                height={seg.height}
                fill={DEFICIT_COLOR}
                fillOpacity={0.75}
                clipPath={`url(#${BELOW_ZERO_CLIP_ID})`}
                pointerEvents="none"
              />
            </g>
          ))}
        </g>
        <g
          onPointerMove={(e) =>
            handleBarPointerMove(
              e,
              selectedMonth === 0 ? "지금" : formatMonthsFromNow(selectedMonth),
              futureSegments,
              futureSnapshot.totalBalance,
            )
          }
          onPointerLeave={() => setHovered(null)}
        >
          {futureSegments.map((seg) => (
            <g key={seg.id}>
              <rect
                x={futureX}
                y={seg.y}
                width={BAR_WIDTH}
                height={seg.height}
                fill={seg.fill}
                fillOpacity={0.75}
              />
              <rect
                x={futureX}
                y={seg.y}
                width={BAR_WIDTH}
                height={seg.height}
                fill={DEFICIT_COLOR}
                fillOpacity={0.75}
                clipPath={`url(#${BELOW_ZERO_CLIP_ID})`}
                pointerEvents="none"
              />
            </g>
          ))}
        </g>
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
      {hovered && (
        <ChartTooltip
          xPercent={hovered.xPercent}
          yPercent={hovered.yPercent}
          anchor="above"
          lines={[
            `${hovered.barLabel} · 총자산 ${formatKRW(hovered.totalBalance)}`,
            ...hovered.segments.map((seg) => ({
              text: `${seg.name} ${formatKRW(seg.amount)}`,
              color: seg.fill,
            })),
          ]}
        />
      )}
      </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
        {legendItems(assetClasses, groups).map((item) => (
          <span key={item.id} className="flex items-center gap-1">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            {item.name}
          </span>
        ))}
      </div>
    </div>
  );
}
