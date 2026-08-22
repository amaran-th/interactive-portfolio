"use client";

import { AssetClass, MonthSnapshot } from "./types";

type FlowDiagramProps = {
  snapshot: MonthSnapshot;
  primaryAsset: AssetClass | undefined;
  assetClasses: AssetClass[];
  exchangeRate: number;
};

const WIDTH = 600;
const HEIGHT = 220;

function NodeBox({
  x,
  y,
  label,
  amount,
  color,
}: {
  x: number;
  y: number;
  label: string;
  amount: number;
  color: string;
}) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect width={140} height={44} rx={12} fill={color} fillOpacity={0.85} />
      <text
        x={70}
        y={18}
        textAnchor="middle"
        className="fill-white text-[11px] font-medium"
      >
        {label}
      </text>
      <text x={70} y={34} textAnchor="middle" className="fill-white text-[11px]">
        {Math.round(amount).toLocaleString()}원
      </text>
    </g>
  );
}

export default function FlowDiagram({
  snapshot,
  primaryAsset,
  assetClasses,
  exchangeRate,
}: FlowDiagramProps) {
  if (!primaryAsset) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-2xl border border-white/40 bg-white/70 text-sm text-gray-400 backdrop-blur">
        📭 기본 계좌를 지정하면 흐름도가 나타납니다
      </div>
    );
  }

  const destinationTotals = new Map<string, number>();
  for (const transfer of snapshot.flow.transfers) {
    const fromAsset = assetClasses.find((a) => a.id === transfer.fromAssetId);
    const amountKRW =
      fromAsset?.currency === "USD"
        ? transfer.amount * exchangeRate
        : transfer.amount;
    destinationTotals.set(
      transfer.toAssetId,
      (destinationTotals.get(transfer.toAssetId) ?? 0) + amountKRW,
    );
  }

  const rightEntries: { id: string; label: string; amount: number }[] = [];
  if (snapshot.flow.expenseOut > 0) {
    rightEntries.push({
      id: "expense",
      label: "지출",
      amount: snapshot.flow.expenseOut,
    });
  }
  for (const [assetId, amount] of destinationTotals) {
    const asset = assetClasses.find((a) => a.id === assetId);
    if (asset && amount > 0) {
      rightEntries.push({ id: assetId, label: asset.name, amount });
    }
  }

  const maxAmount = Math.max(
    1,
    snapshot.flow.incomeIn,
    ...rightEntries.map((entry) => entry.amount),
  );
  const strokeWidth = (amount: number) => 1 + (amount / maxAmount) * 10;

  const incomeY = 20;
  const primaryY = 88;
  const rightGap =
    rightEntries.length > 0 ? HEIGHT / (rightEntries.length + 1) : HEIGHT / 2;

  return (
    <div className="rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
      <p className="text-sm text-gray-500">🌊 자금 흐름</p>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="mt-2 w-full">
        {snapshot.flow.incomeIn > 0 && (
          <line
            x1={140}
            y1={incomeY + 22}
            x2={230}
            y2={primaryY + 22}
            stroke="#6366f1"
            strokeWidth={strokeWidth(snapshot.flow.incomeIn)}
            strokeOpacity={0.5}
          />
        )}
        {rightEntries.map((entry, i) => (
          <line
            key={entry.id}
            x1={370}
            y1={primaryY + 22}
            x2={460}
            y2={rightGap * (i + 1) + 22}
            stroke="#a855f7"
            strokeWidth={strokeWidth(entry.amount)}
            strokeOpacity={0.5}
          />
        ))}

        {snapshot.flow.incomeIn > 0 && (
          <NodeBox
            x={0}
            y={incomeY}
            label="수입"
            amount={snapshot.flow.incomeIn}
            color="#6366f1"
          />
        )}
        <NodeBox
          x={230}
          y={primaryY}
          label={primaryAsset.name}
          amount={snapshot.assetBalances[primaryAsset.id] ?? 0}
          color="#4338ca"
        />
        {rightEntries.map((entry, i) => (
          <NodeBox
            key={entry.id}
            x={460}
            y={rightGap * (i + 1)}
            label={entry.label}
            amount={entry.amount}
            color="#a855f7"
          />
        ))}
      </svg>
    </div>
  );
}
