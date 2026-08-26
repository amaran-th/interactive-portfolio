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
// Matches the 수입/지출/이체 section colors used in the input panel
// (emerald/rose/amber), so the same category reads the same color here.
const INCOME_COLOR = "#10b981";
const EXPENSE_COLOR = "#f43f5e";
const TRANSFER_COLOR = "#f59e0b";

function NodeBox({
  x,
  y,
  label,
  amount,
  color,
  onHoverMove,
  onHoverEnd,
}: {
  x: number;
  y: number;
  label: string;
  amount: number;
  color: string;
  onHoverMove: (e: React.PointerEvent<SVGRectElement>) => void;
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
        onPointerMove={onHoverMove}
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

type HoverTooltip = {
  xPercent: number;
  yPercent: number;
  lines: string[];
  color: string;
};

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

  const rightEntries: {
    id: string;
    label: string;
    amount: number;
    color: string;
  }[] = [];
  const hasExpense = snapshot.flow.expenseOut > 0;
  if (hasExpense) {
    rightEntries.push({
      id: "expense",
      label: "지출",
      amount: snapshot.flow.expenseOut,
      color: EXPENSE_COLOR,
    });
  }
  for (const [assetId, amount] of destinationTotals) {
    const asset = assetClasses.find((a) => a.id === assetId);
    if (asset && amount > 0) {
      // A transfer to another asset isn't money leaving net worth like an
      // expense — use the shared transfer color (matching the 이체 section
      // elsewhere) instead of the expense color, so the two categories
      // never read as the same thing.
      rightEntries.push({
        id: assetId,
        label: asset.name,
        amount,
        color: TRANSFER_COLOR,
      });
    }
  }

  const FLOW_LINE_WIDTH = 3;

  const primaryBalance = snapshot.assetBalances[primaryAsset.id] ?? 0;
  const primaryColor = primaryBalance < 0 ? DEFICIT_COLOR : PRIMARY_COLOR;

  const incomeX = 0;
  const primaryX = 230;
  const rightX = 460;
  const rightGap =
    rightEntries.length > 0 ? HEIGHT / (rightEntries.length + 1) : HEIGHT / 2;
  // Nudge every entry after the expense entry down a bit, so the 지출
  // node and the 이체 nodes read as two separate clusters (not just a
  // color change within one continuous list).
  const GROUP_GAP = hasExpense && rightEntries.length > 1 ? 14 : 0;
  const entryTopY = (i: number) =>
    rightGap * (i + 1) + (hasExpense && i >= 1 ? GROUP_GAP : 0);

  const pointerPercent = (
    e: React.PointerEvent<SVGRectElement | SVGLineElement>,
  ) => {
    const rect = e.currentTarget.ownerSVGElement!.getBoundingClientRect();
    return {
      xPercent: ((e.clientX - rect.left) / rect.width) * 100,
      yPercent: ((e.clientY - rect.top) / rect.height) * 100,
    };
  };

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
            id="flow-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="8"
            markerHeight="8"
            markerUnits="userSpaceOnUse"
            orient="auto-start-reverse"
          >
            {/* Inherits whichever line's stroke color references this marker,
                so one definition covers income, expense, and every transfer's
                own asset color. */}
            <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
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
              strokeWidth={24}
              strokeOpacity={0}
              pointerEvents="stroke"
              onPointerMove={(e) =>
                setHoverTooltip({
                  ...pointerPercent(e),
                  color: INCOME_COLOR,
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
              strokeWidth={FLOW_LINE_WIDTH}
              strokeOpacity={0.5}
              markerEnd="url(#flow-arrow)"
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
          const y2 = entryTopY(i) + NODE_HEIGHT / 2;
          return (
            <g key={entry.id}>
              <line
                x1={primaryX + NODE_WIDTH}
                y1={y1}
                x2={rightX - 6}
                y2={y2}
                stroke={entry.color}
                strokeWidth={24}
                strokeOpacity={0}
                pointerEvents="stroke"
                onPointerMove={(e) =>
                  setHoverTooltip({
                    ...pointerPercent(e),
                    color: entry.color,
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
                stroke={entry.color}
                strokeWidth={FLOW_LINE_WIDTH}
                strokeOpacity={0.5}
                markerEnd="url(#flow-arrow)"
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
            onHoverMove={(e) =>
              setHoverTooltip({
                ...pointerPercent(e),
                color: INCOME_COLOR,
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
          onHoverMove={(e) =>
            setHoverTooltip({
              ...pointerPercent(e),
              color: primaryColor,
              lines: [primaryAsset.name, formatKRW(primaryBalance)],
            })
          }
          onHoverEnd={() => setHoverTooltip(null)}
        />
        {rightEntries.map((entry, i) => (
          <NodeBox
            key={entry.id}
            x={rightX}
            y={entryTopY(i)}
            label={entry.label}
            amount={entry.amount}
            color={entry.color}
            onHoverMove={(e) =>
              setHoverTooltip({
                ...pointerPercent(e),
                color: entry.color,
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
          accentColor={hoverTooltip.color}
          lines={hoverTooltip.lines}
        />
      )}
      </div>
      </div>
    </div>
  );
}
