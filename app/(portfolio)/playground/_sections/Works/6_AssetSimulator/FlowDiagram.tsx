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
const NODE_WIDTH = 140;
const NODE_HEIGHT = 44;
const CENTER_Y = (HEIGHT - NODE_HEIGHT) / 2;
const DEFICIT_COLOR = "#e11d48";
const PRIMARY_COLOR = "#4338ca";
const INCOME_COLOR = "#6366f1";
const OUTFLOW_COLOR = "#a855f7";

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
      <rect
        width={NODE_WIDTH}
        height={NODE_HEIGHT}
        rx={12}
        fill={color}
        fillOpacity={0.85}
      />
      <text
        x={NODE_WIDTH / 2}
        y={18}
        textAnchor="middle"
        className="fill-white text-[11px] font-medium"
      >
        {label}
      </text>
      <text
        x={NODE_WIDTH / 2}
        y={34}
        textAnchor="middle"
        className="fill-white text-[11px]"
      >
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
    if (transfer.fromAssetId !== primaryAsset.id) continue;
    const amountKRW =
      primaryAsset.currency === "USD"
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

  const primaryBalance = snapshot.assetBalances[primaryAsset.id] ?? 0;
  const primaryColor = primaryBalance < 0 ? DEFICIT_COLOR : PRIMARY_COLOR;

  const incomeX = 0;
  const primaryX = 230;
  const rightX = 460;
  const rightGap =
    rightEntries.length > 0 ? HEIGHT / (rightEntries.length + 1) : HEIGHT / 2;

  return (
    <div className="rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
      <p className="text-sm text-gray-500">🌊 자금 흐름</p>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="mt-2 w-full">
        <defs>
          <marker
            id="flow-arrow-income"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={INCOME_COLOR} />
          </marker>
          <marker
            id="flow-arrow-out"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={OUTFLOW_COLOR} />
          </marker>
        </defs>
        {snapshot.flow.incomeIn > 0 && (
          <line
            x1={incomeX + NODE_WIDTH}
            y1={CENTER_Y + NODE_HEIGHT / 2}
            x2={primaryX - 6}
            y2={CENTER_Y + NODE_HEIGHT / 2}
            stroke={INCOME_COLOR}
            strokeWidth={strokeWidth(snapshot.flow.incomeIn)}
            strokeOpacity={0.5}
            markerEnd="url(#flow-arrow-income)"
          />
        )}
        {rightEntries.map((entry, i) => (
          <line
            key={entry.id}
            x1={primaryX + NODE_WIDTH}
            y1={CENTER_Y + NODE_HEIGHT / 2}
            x2={rightX - 6}
            y2={rightGap * (i + 1) + NODE_HEIGHT / 2}
            stroke={OUTFLOW_COLOR}
            strokeWidth={strokeWidth(entry.amount)}
            strokeOpacity={0.5}
            markerEnd="url(#flow-arrow-out)"
          />
        ))}

        {snapshot.flow.incomeIn > 0 && (
          <NodeBox
            x={incomeX}
            y={CENTER_Y}
            label="수입"
            amount={snapshot.flow.incomeIn}
            color={INCOME_COLOR}
          />
        )}
        <NodeBox
          x={primaryX}
          y={CENTER_Y}
          label={primaryAsset.name}
          amount={primaryBalance}
          color={primaryColor}
        />
        {rightEntries.map((entry, i) => (
          <NodeBox
            key={entry.id}
            x={rightX}
            y={rightGap * (i + 1)}
            label={entry.label}
            amount={entry.amount}
            color={OUTFLOW_COLOR}
          />
        ))}
      </svg>
    </div>
  );
}
