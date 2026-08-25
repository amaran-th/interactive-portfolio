"use client";

import { BarChart3, Inbox } from "lucide-react";
import { useState } from "react";
import {
  AssetClass,
  Group,
  MonthSnapshot,
  formatKRW,
  formatMonthsFromNow,
} from "./types";
import ChartTooltip from "./ChartTooltip";

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
const BELOW_ZERO_CLIP_ID = "comparison-bar-below-zero-clip";

type RawSegment = {
  id: string;
  name: string;
  fill: string;
  stroke: string | undefined;
  bottom: number;
  top: number;
};

type Segment = {
  id: string;
  name: string;
  fill: string;
  stroke: string | undefined;
  y: number;
  height: number;
  amount: number;
};

type HoveredSegment = {
  barLabel: string;
  segment: Segment;
  x: number;
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

function buildRawSegments(
  snapshot: MonthSnapshot,
  assets: AssetClass[],
  groups: Group[],
): { segments: RawSegment[]; min: number; max: number } {
  const result = assets.reduce<{
    cursor: number;
    min: number;
    max: number;
    segments: RawSegment[];
  }>(
    (acc, asset) => {
      const value = snapshot.assetBalancesKRW[asset.id] ?? 0;
      const bottom = acc.cursor;
      const top = acc.cursor + value;
      const group = groups.find((g) => g.id === asset.groupId);
      return {
        cursor: top,
        min: Math.min(acc.min, bottom, top),
        max: Math.max(acc.max, bottom, top),
        segments: [
          ...acc.segments,
          {
            id: asset.id,
            name: asset.name,
            fill: asset.color,
            stroke: group?.color,
            bottom,
            top,
          },
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
}: ComparisonBarChartProps) {
  const [hovered, setHovered] = useState<HoveredSegment | null>(null);

  if (assetClasses.length === 0 || snapshots.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center gap-1.5 rounded-2xl border border-white/40 bg-white/70 text-sm text-gray-400 backdrop-blur">
        <Inbox className="h-4 w-4" /> 자산을 추가하면 비교 그래프가 나타납니다
      </div>
    );
  }

  const nowSnapshot = snapshots[0];
  const futureSnapshot = snapshots[selectedMonth];
  const assets = orderedAssets(assetClasses, groups);

  const nowRaw = buildRawSegments(nowSnapshot, assets, groups);
  const futureRaw = buildRawSegments(futureSnapshot, assets, groups);
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
        stroke: seg.stroke,
        y: Math.min(yTop, yBottom),
        height: Math.abs(yBottom - yTop),
        amount: seg.top - seg.bottom,
      };
    });

  const nowSegments = toSegments(nowRaw.segments);
  const futureSegments = toSegments(futureRaw.segments);
  const nowX = WIDTH / 2 - BAR_WIDTH - 16;
  const futureX = WIDTH / 2 + 16;

  return (
    <div className="flex h-full flex-col rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
      <p className="flex items-center gap-1.5 text-sm text-gray-500">
        <BarChart3 className="h-4 w-4" /> 자산 비교
      </p>
      <div className="flex flex-1 items-center justify-center">
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
        {nowSegments.map((seg) => (
          <g
            key={seg.id}
            onPointerEnter={() =>
              setHovered({
                barLabel: "지금",
                segment: seg,
                x: nowX + BAR_WIDTH / 2,
              })
            }
            onPointerLeave={() => setHovered(null)}
          >
            <rect
              x={nowX}
              y={seg.y}
              width={BAR_WIDTH}
              height={seg.height}
              fill={seg.fill}
              fillOpacity={0.75}
              stroke={seg.stroke}
              strokeWidth={seg.stroke ? 2 : 0}
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
        {futureSegments.map((seg) => (
          <g
            key={seg.id}
            onPointerEnter={() =>
              setHovered({
                barLabel:
                  selectedMonth === 0
                    ? "지금"
                    : formatMonthsFromNow(selectedMonth),
                segment: seg,
                x: futureX + BAR_WIDTH / 2,
              })
            }
            onPointerLeave={() => setHovered(null)}
          >
            <rect
              x={futureX}
              y={seg.y}
              width={BAR_WIDTH}
              height={seg.height}
              fill={seg.fill}
              fillOpacity={0.75}
              stroke={seg.stroke}
              strokeWidth={seg.stroke ? 2 : 0}
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
        {hovered && (
          <ChartTooltip
            x={hovered.x}
            y={hovered.segment.y}
            viewBoxWidth={WIDTH}
            viewBoxHeight={HEIGHT}
            anchor="above"
            lines={[
              `${hovered.barLabel} · ${hovered.segment.name}`,
              formatKRW(hovered.segment.amount),
            ]}
          />
        )}
      </svg>
      </div>
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
