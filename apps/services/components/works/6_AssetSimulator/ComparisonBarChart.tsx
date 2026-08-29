"use client";

import { BarChart3, Inbox } from "lucide-react";
import { useState } from "react";
import {
  AssetClass,
  Group,
  MonthSnapshot,
  formatKRW,
  formatMonthsFromNow,
  realValueSnapshot,
} from "./types";
import ChartTooltip from "./ChartTooltip";

type ComparisonBarChartProps = {
  snapshots: MonthSnapshot[];
  groups: Group[];
  assetClasses: AssetClass[];
  selectedMonth: number;
  inflationEnabled: boolean;
  inflationRate: number;
  /** Caps the SVG at its own design width during PNG export instead of
   * stretching to fill the (wider, export-forced) card — otherwise the
   * fixed-viewBox chart scales up and its text looks oversized. */
  exportMode?: boolean;
  /** Same width cap as exportMode, for the mobile carousel slide — that
   * card has a fixed height (h-86), and this chart's taller-than-square
   * aspect ratio overflows it if the SVG is left to stretch to the full
   * (much wider) card width. */
  compact?: boolean;
};

const WIDTH = 260;
const HEIGHT = 228;
const BAR_WIDTH = 64;
// Base bottom margin (just the "지금"/"N개월 후" axis label). When a bar
// actually has debt, BASE_Y below reserves more room for the debt-total
// label too — computed per render rather than as a fixed constant, so the
// common no-debt case keeps the full bar height instead of permanently
// sacrificing space for a label that isn't always there.
const BOTTOM_MARGIN = 30;
const BOTTOM_MARGIN_WITH_DEBT = 38;
const MAX_BAR_HEIGHT = 160;

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

  // The segment holding the primary asset stacks at the bottom of the
  // positive stack (drawn first), matching AssetAreaChart.
  const primary = assetClasses.find((a) => a.isPrimary);
  const primarySegmentId = primary ? (primary.groupId ?? primary.id) : undefined;
  const allItems = [...groupItems, ...ungroupedItems];
  const orderedItems = primarySegmentId
    ? [
        ...allItems.filter((item) => item.id === primarySegmentId),
        ...allItems.filter((item) => item.id !== primarySegmentId),
      ]
    : allItems;

  // Positive (asset) items stack upward from 0, negative (liability) items
  // stack downward from 0 — kept fully separate so a liability never eats
  // into the asset stack's shape (a single running cursor would offset
  // everything stacked after it).
  let posCursor = 0;
  let negCursor = 0;
  const segments: RawSegment[] = [];
  for (const item of orderedItems) {
    if (item.value >= 0) {
      const bottom = posCursor;
      posCursor += item.value;
      segments.push({ id: item.id, name: item.name, fill: item.fill, bottom, top: posCursor });
    } else {
      const top = negCursor;
      negCursor += item.value;
      segments.push({ id: item.id, name: item.name, fill: item.fill, bottom: negCursor, top });
    }
  }
  return {
    segments,
    min: Math.min(0, negCursor),
    max: Math.max(0, posCursor),
  };
}

export default function ComparisonBarChart({
  snapshots,
  groups,
  assetClasses,
  selectedMonth,
  inflationEnabled,
  inflationRate,
  exportMode = false,
  compact = false,
}: ComparisonBarChartProps) {
  const [hovered, setHovered] = useState<HoveredBar | null>(null);
  const capWidth = exportMode || compact;

  if (assetClasses.length === 0 || snapshots.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center gap-1.5 break-keep rounded-2xl border border-white/40 bg-white/70 text-center text-sm text-gray-400 backdrop-blur">
        <Inbox className="h-4 w-4 shrink-0" /> 자산을 추가하면 비교 그래프가
        나타납니다
      </div>
    );
  }

  const nowSnapshot = realValueSnapshot(snapshots[0], inflationEnabled, inflationRate);
  const futureSnapshot = realValueSnapshot(
    snapshots[selectedMonth],
    inflationEnabled,
    inflationRate,
  );

  const nowRaw = buildRawSegments(nowSnapshot, groups, assetClasses);
  const futureRaw = buildRawSegments(futureSnapshot, groups, assetClasses);
  // The net-worth band only adds information when a bar has both an asset
  // stack and a liability stack — otherwise the bar's own top edge already
  // is the net worth, and the band would just redundantly trace it.
  const nowHasBoth = nowRaw.min < 0 && nowRaw.max > 0;
  const futureHasBoth = futureRaw.min < 0 && futureRaw.max > 0;
  // Only reserve the wider bottom margin when a debt-total label will
  // actually render — otherwise the far more common no-debt case would
  // permanently lose bar height to a label that's never there.
  const BASE_Y = HEIGHT - (nowHasBoth || futureHasBoth ? BOTTOM_MARGIN_WITH_DEBT : BOTTOM_MARGIN);
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

  const delta = futureSnapshot.totalBalance - nowSnapshot.totalBalance;
  // Plain fill attributes rather than Tailwind fill-* classes — PNG export
  // (html-to-image) doesn't reliably inline color-bearing classes onto SVG
  // <text>, silently falling back to black text.
  const deltaColor = delta > 0 ? "#059669" : delta < 0 ? "#e11d48" : "#9ca3af";
  const deltaLabel = `(${delta > 0 ? "+" : ""}${formatKRW(delta)})`;

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
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className={capWidth ? "mx-auto block" : "w-full"}
        style={capWidth ? { maxWidth: WIDTH } : undefined}
      >
        <line
          x1={0}
          y1={zeroY}
          x2={WIDTH}
          y2={zeroY}
          stroke="#e5e7eb"
          strokeWidth={1}
        />
        {nowHasBoth ? (
          <text
            x={nowX + BAR_WIDTH / 2}
            y={scaleY(nowRaw.max) - 6}
            textAnchor="middle"
            fill="#4b5563"
            fontSize={11}
          >
            {formatKRW(nowRaw.max)}
          </text>
        ) : (
          <text
            x={nowX + BAR_WIDTH / 2}
            y={30}
            textAnchor="middle"
            fill="#4b5563"
            fontSize={11}
          >
            {formatKRW(nowSnapshot.totalBalance)}
          </text>
        )}
        {selectedMonth !== 0 && (
          <text
            x={futureX + BAR_WIDTH / 2}
            y={14}
            textAnchor="middle"
            fill={deltaColor}
            fontSize={10}
            fontWeight={500}
          >
            {deltaLabel}
          </text>
        )}
        {futureHasBoth ? (
          <text
            x={futureX + BAR_WIDTH / 2}
            y={scaleY(futureRaw.max) - 6}
            textAnchor="middle"
            fill="#4b5563"
            fontSize={11}
          >
            {formatKRW(futureRaw.max)}
          </text>
        ) : (
          <text
            x={futureX + BAR_WIDTH / 2}
            y={30}
            textAnchor="middle"
            fill="#4b5563"
            fontSize={11}
          >
            {formatKRW(futureSnapshot.totalBalance)}
          </text>
        )}
        <g
          onPointerMove={(e) =>
            handleBarPointerMove(e, "지금", nowSegments, nowSnapshot.totalBalance)
          }
          onPointerLeave={() => setHovered(null)}
        >
          {nowSegments.map((seg) => (
            <rect
              key={seg.id}
              x={nowX}
              y={seg.y}
              width={BAR_WIDTH}
              height={seg.height}
              fill={seg.fill}
              fillOpacity={0.75}
            />
          ))}
          {nowHasBoth && (
            <>
              <rect
                x={nowX}
                y={scaleY(nowSnapshot.totalBalance) - 1.5}
                width={BAR_WIDTH}
                height={3}
                fill="#1f2937"
                pointerEvents="none"
              />
              <text
                x={nowX - 4}
                y={scaleY(nowSnapshot.totalBalance) + 3}
                textAnchor="end"
                fill="#1f2937"
                fontSize={9}
                fontWeight={500}
                pointerEvents="none"
              >
                {formatKRW(nowSnapshot.totalBalance)}
              </text>
              <text
                x={nowX + BAR_WIDTH / 2}
                y={scaleY(nowRaw.min) + 8}
                textAnchor="middle"
                fill="#e11d48"
                fontSize={11}
                pointerEvents="none"
              >
                {formatKRW(nowRaw.min)}
              </text>
            </>
          )}
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
            <rect
              key={seg.id}
              x={futureX}
              y={seg.y}
              width={BAR_WIDTH}
              height={seg.height}
              fill={seg.fill}
              fillOpacity={0.75}
            />
          ))}
          {futureHasBoth && (
            <>
              <rect
                x={futureX}
                y={scaleY(futureSnapshot.totalBalance) - 1.5}
                width={BAR_WIDTH}
                height={3}
                fill="#1f2937"
                pointerEvents="none"
              />
              <text
                x={futureX + BAR_WIDTH + 4}
                y={scaleY(futureSnapshot.totalBalance) + 3}
                textAnchor="start"
                fill="#1f2937"
                fontSize={9}
                fontWeight={500}
                pointerEvents="none"
              >
                {formatKRW(futureSnapshot.totalBalance)}
              </text>
              <text
                x={futureX + BAR_WIDTH / 2}
                y={scaleY(futureRaw.min) + 8}
                textAnchor="middle"
                fill="#e11d48"
                fontSize={11}
                pointerEvents="none"
              >
                {formatKRW(futureRaw.min)}
              </text>
            </>
          )}
        </g>
        <text
          x={nowX + BAR_WIDTH / 2}
          y={HEIGHT - 12}
          textAnchor="middle"
          fill="#6b7280"
          fontSize={11}
        >
          지금
        </text>
        <text
          x={futureX + BAR_WIDTH / 2}
          y={HEIGHT - 12}
          textAnchor="middle"
          fill="#6b7280"
          fontSize={11}
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
