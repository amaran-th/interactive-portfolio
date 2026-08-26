"use client";

import { Inbox, Workflow } from "lucide-react";
import { useState } from "react";
import { AssetClass, MonthSnapshot, formatKRW } from "./types";
import ChartTooltip from "./ChartTooltip";

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
  onHoverStart,
  onHoverEnd,
}: {
  x: number;
  y: number;
  label: string;
  amount: number;
  color: string;
  onHoverStart: () => void;
  onHoverEnd: () => void;
}) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect
        width={NODE_WIDTH}
        height={NODE_HEIGHT}
        rx={12}
        fill={color}
        fillOpacity={0.85}
        onPointerEnter={onHoverStart}
        onPointerLeave={onHoverEnd}
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

type HoverTooltip = { xPercent: number; yPercent: number; lines: string[] };

export default function FlowDiagram({
  snapshot,
  primaryAsset,
  assetClasses,
  exchangeRate,
}: FlowDiagramProps) {
  const [hoverTooltip, setHoverTooltip] = useState<HoverTooltip | null>(null);

  if (!primaryAsset) {
    return (
      <div className="flex h-[220px] items-center justify-center gap-1.5 rounded-2xl border border-white/40 bg-white/70 text-sm text-gray-400 backdrop-blur">
        <Inbox className="h-4 w-4" /> 기본 계좌를 지정하면 흐름도가 나타납니다
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
    <div className="flex h-full flex-col rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
      <p className="flex items-center gap-1.5 text-sm text-gray-500">
        <Workflow className="h-4 w-4" /> 자금 흐름
      </p>
      <div className="mt-2 flex flex-1 items-center justify-center">
      <div className="relative w-full">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full">
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
          <>
            <line
              x1={incomeX + NODE_WIDTH}
              y1={CENTER_Y + NODE_HEIGHT / 2}
              x2={primaryX - 6}
              y2={CENTER_Y + NODE_HEIGHT / 2}
              stroke={INCOME_COLOR}
              strokeWidth={Math.max(24, strokeWidth(snapshot.flow.incomeIn))}
              strokeOpacity={0}
              pointerEvents="stroke"
              onPointerEnter={() =>
                setHoverTooltip({
                  xPercent: ((incomeX + NODE_WIDTH + primaryX - 6) / 2 / WIDTH) * 100,
                  yPercent: ((CENTER_Y + NODE_HEIGHT / 2) / HEIGHT) * 100,
                  lines: [`수입 → ${primaryAsset.name}`, formatKRW(snapshot.flow.incomeIn)],
                })
              }
              onPointerLeave={() => setHoverTooltip(null)}
            />
            <line
              x1={incomeX + NODE_WIDTH}
              y1={CENTER_Y + NODE_HEIGHT / 2}
              x2={primaryX - 6}
              y2={CENTER_Y + NODE_HEIGHT / 2}
              stroke={INCOME_COLOR}
              strokeWidth={strokeWidth(snapshot.flow.incomeIn)}
              strokeOpacity={0.5}
              markerEnd="url(#flow-arrow-income)"
              pointerEvents="none"
            />
            <text
              x={(incomeX + NODE_WIDTH + primaryX - 6) / 2}
              y={CENTER_Y + NODE_HEIGHT / 2 - 8}
              textAnchor="middle"
              stroke="white"
              strokeWidth={3}
              paintOrder="stroke"
              className="fill-gray-700 text-[10px] font-medium"
            >
              {Math.round(snapshot.flow.incomeIn).toLocaleString()}원
            </text>
          </>
        )}
        {rightEntries.map((entry, i) => {
          const y1 = CENTER_Y + NODE_HEIGHT / 2;
          const y2 = rightGap * (i + 1) + NODE_HEIGHT / 2;
          return (
            <g key={entry.id}>
              <line
                x1={primaryX + NODE_WIDTH}
                y1={y1}
                x2={rightX - 6}
                y2={y2}
                stroke={OUTFLOW_COLOR}
                strokeWidth={Math.max(24, strokeWidth(entry.amount))}
                strokeOpacity={0}
                pointerEvents="stroke"
                onPointerEnter={() =>
                  setHoverTooltip({
                    xPercent: ((primaryX + NODE_WIDTH + rightX - 6) / 2 / WIDTH) * 100,
                    yPercent: ((y1 + y2) / 2 / HEIGHT) * 100,
                    lines: [`${primaryAsset.name} → ${entry.label}`, formatKRW(entry.amount)],
                  })
                }
                onPointerLeave={() => setHoverTooltip(null)}
              />
              <line
                x1={primaryX + NODE_WIDTH}
                y1={y1}
                x2={rightX - 6}
                y2={y2}
                stroke={OUTFLOW_COLOR}
                strokeWidth={strokeWidth(entry.amount)}
                strokeOpacity={0.5}
                markerEnd="url(#flow-arrow-out)"
                pointerEvents="none"
              />
              <text
                x={(primaryX + NODE_WIDTH + rightX - 6) / 2}
                y={(y1 + y2) / 2 - 8}
                textAnchor="middle"
                stroke="white"
                strokeWidth={3}
                paintOrder="stroke"
                className="fill-gray-700 text-[10px] font-medium"
              >
                {Math.round(entry.amount).toLocaleString()}원
              </text>
            </g>
          );
        })}

        {snapshot.flow.incomeIn > 0 && (
          <NodeBox
            x={incomeX}
            y={CENTER_Y}
            label="수입"
            amount={snapshot.flow.incomeIn}
            color={INCOME_COLOR}
            onHoverStart={() =>
              setHoverTooltip({
                xPercent: ((incomeX + NODE_WIDTH / 2) / WIDTH) * 100,
                yPercent: (CENTER_Y / HEIGHT) * 100,
                lines: ["수입", formatKRW(snapshot.flow.incomeIn)],
              })
            }
            onHoverEnd={() => setHoverTooltip(null)}
          />
        )}
        <NodeBox
          x={primaryX}
          y={CENTER_Y}
          label={primaryAsset.name}
          amount={primaryBalance}
          color={primaryColor}
          onHoverStart={() =>
            setHoverTooltip({
              xPercent: ((primaryX + NODE_WIDTH / 2) / WIDTH) * 100,
              yPercent: (CENTER_Y / HEIGHT) * 100,
              lines: [primaryAsset.name, formatKRW(primaryBalance)],
            })
          }
          onHoverEnd={() => setHoverTooltip(null)}
        />
        {rightEntries.map((entry, i) => (
          <NodeBox
            key={entry.id}
            x={rightX}
            y={rightGap * (i + 1)}
            label={entry.label}
            amount={entry.amount}
            color={OUTFLOW_COLOR}
            onHoverStart={() =>
              setHoverTooltip({
                xPercent: ((rightX + NODE_WIDTH / 2) / WIDTH) * 100,
                yPercent: ((rightGap * (i + 1)) / HEIGHT) * 100,
                lines: [entry.label, formatKRW(entry.amount)],
              })
            }
            onHoverEnd={() => setHoverTooltip(null)}
          />
        ))}
      </svg>
      {hoverTooltip && (
        <ChartTooltip
          xPercent={hoverTooltip.xPercent}
          yPercent={hoverTooltip.yPercent}
          lines={hoverTooltip.lines}
        />
      )}
      </div>
      </div>
    </div>
  );
}
