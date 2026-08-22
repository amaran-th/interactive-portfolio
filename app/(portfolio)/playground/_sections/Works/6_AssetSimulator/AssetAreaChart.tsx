"use client";

import { AssetClass, Group, MonthSnapshot, formatKRW } from "./types";

type AssetAreaChartProps = {
  snapshots: MonthSnapshot[];
  groups: Group[];
  assetClasses: AssetClass[];
  selectedMonth: number;
};

const WIDTH = 600;
const HEIGHT = 220;
const PADDING = 12;

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

export default function AssetAreaChart({
  snapshots,
  groups,
  assetClasses,
  selectedMonth,
}: AssetAreaChartProps) {
  if (assetClasses.length === 0 || snapshots.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-2xl border border-white/40 bg-white/70 text-sm text-gray-400 backdrop-blur">
        📭 자산을 추가하면 그래프가 나타납니다
      </div>
    );
  }

  const assets = orderedAssets(assetClasses, groups);
  const maxTotal = Math.max(1, ...snapshots.map((s) => s.totalBalance));
  const stepX = (WIDTH - PADDING * 2) / (snapshots.length - 1);
  const scaleY = (value: number) =>
    HEIGHT - PADDING - (value / maxTotal) * (HEIGHT - PADDING * 2);

  const { bands } = assets.reduce<{
    prevTop: number[];
    bands: {
      id: string;
      name: string;
      fill: string;
      stroke: string | undefined;
      points: string;
    }[];
  }>(
    (acc, asset) => {
      const bottom = acc.prevTop;
      const top = snapshots.map(
        (snapshot, i) =>
          bottom[i] + (snapshot.assetBalancesKRW[asset.id] ?? 0),
      );

      const topPoints = top.map(
        (value, i) => `${PADDING + i * stepX},${scaleY(value)}`,
      );
      const bottomPoints = bottom
        .map((value, i) => `${PADDING + i * stepX},${scaleY(value)}`)
        .reverse();

      const group = groups.find((g) => g.id === asset.groupId);

      return {
        prevTop: top,
        bands: [
          ...acc.bands,
          {
            id: asset.id,
            name: asset.name,
            fill: asset.color,
            stroke: group?.color,
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
        📈 총자산{" "}
        <span className="text-lg font-semibold text-gray-800">
          {formatKRW(totalBalance)}
        </span>
      </p>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="mt-2 w-full">
        {bands.map((band) => (
          <polygon
            key={band.id}
            points={band.points}
            fill={band.fill}
            fillOpacity={0.55}
            stroke={band.stroke}
            strokeWidth={band.stroke ? 2 : 0}
          >
            <title>{band.name}</title>
          </polygon>
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
