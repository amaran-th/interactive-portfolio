"use client";

import { Inbox, Workflow } from "lucide-react";
import { useState } from "react";
import { AssetClass, Group, MonthSnapshot, assetColor, formatKRW } from "./types";
import ChartTooltip from "./ChartTooltip";

type FlowDiagramProps = {
  snapshot: MonthSnapshot;
  primaryAsset: AssetClass | undefined;
  assetClasses: AssetClass[];
  groups: Group[];
  exchangeRate: number;
};

const WIDTH = 600;
const HEIGHT = 220;
const NODE_WIDTH = 140;
const NODE_HEIGHT = 44;
const DEFICIT_COLOR = "#e11d48";
const PRIMARY_COLOR = "#4338ca";
// Matches the 수입/지출/이체 section colors used in the input panel
// (emerald/rose/amber), so the same category reads the same color here.
const INCOME_COLOR = "#10b981";
const EXPENSE_COLOR = "#f43f5e";

function NodeBox({
  x,
  y,
  label,
  amount,
  color,
  showAmount = true,
  onHoverMove,
  onHoverEnd,
}: {
  x: number;
  y: number;
  label: string;
  amount: number;
  color: string;
  /** Skip the amount line when it's already shown on this node's connecting arrow. */
  showAmount?: boolean;
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
        y={showAmount ? 18 : NODE_HEIGHT / 2 + 4}
        textAnchor="middle"
        className="fill-white text-[11px] font-medium"
      >
        {label}
      </text>
      {showAmount && (
        <text
          x={NODE_WIDTH / 2}
          y={34}
          textAnchor="middle"
          className="fill-white text-[11px]"
        >
          {Math.round(amount).toLocaleString()}원
        </text>
      )}
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
  groups,
  exchangeRate,
}: FlowDiagramProps) {
  const [hoverTooltip, setHoverTooltip] = useState<HoverTooltip | null>(null);

  if (!primaryAsset) {
    return (
      <div className="flex h-[220px] items-center justify-center gap-1.5 rounded-2xl border border-white/40 bg-white/70 text-sm text-gray-400 backdrop-blur">
        <Inbox className="h-4 w-4" /> 기본 자산을 지정하면 흐름도가 나타납니다
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

  const primaryBalance = snapshot.assetBalances[primaryAsset.id] ?? 0;
  const primaryColor = primaryBalance < 0 ? DEFICIT_COLOR : PRIMARY_COLOR;
  const hasExpense = snapshot.flow.expenseOut > 0;

  // 이체 대상도 현금과 같은 실제 자산이라, 지출과 같은 열에 두지 않고
  // 기본 자산과 같은 열에 세로로 쌓는다. 박스에는 이번 달 이체액이 아니라
  // 그 자산의 실제 잔액을 보여준다 — 자산 목록·자산 비교와 같은 정보.
  const transferEntries: {
    id: string;
    label: string;
    amount: number;
    balance: number;
    color: string;
  }[] = [];
  for (const [assetId, amount] of destinationTotals) {
    const asset = assetClasses.find((a) => a.id === assetId);
    if (asset && amount > 0) {
      transferEntries.push({
        id: assetId,
        label: asset.name,
        amount,
        balance: snapshot.assetBalancesKRW[assetId] ?? 0,
        color: assetColor(asset, groups),
      });
    }
  }

  const FLOW_LINE_WIDTH = 3;

  const incomeX = 0;
  const primaryX = 230;
  const rightX = 460;

  const assetCount = 1 + transferEntries.length;
  const assetGap = HEIGHT / (assetCount + 1);
  const assetTopY = (i: number) => assetGap * (i + 1);
  const primaryY = assetTopY(0);
  const primaryRowCenter = primaryY + NODE_HEIGHT / 2;

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
              y1={primaryRowCenter}
              x2={primaryX - 6}
              y2={primaryRowCenter}
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
              y1={primaryRowCenter}
              x2={primaryX - 6}
              y2={primaryRowCenter}
              stroke={INCOME_COLOR}
              strokeWidth={FLOW_LINE_WIDTH}
              strokeOpacity={0.5}
              markerEnd="url(#flow-arrow)"
              pointerEvents="none"
            />
            <text
              x={(incomeX + NODE_WIDTH + primaryX - 6) / 2}
              y={primaryRowCenter - 8}
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
        {hasExpense && (
          <g>
            <line
              x1={primaryX + NODE_WIDTH}
              y1={primaryRowCenter}
              x2={rightX - 6}
              y2={primaryRowCenter}
              stroke={EXPENSE_COLOR}
              strokeWidth={24}
              strokeOpacity={0}
              pointerEvents="stroke"
              onPointerMove={(e) =>
                setHoverTooltip({
                  ...pointerPercent(e),
                  color: EXPENSE_COLOR,
                  lines: [`${primaryAsset.name} → 지출`, formatKRW(snapshot.flow.expenseOut)],
                })
              }
              onPointerLeave={() => setHoverTooltip(null)}
            />
            <line
              x1={primaryX + NODE_WIDTH}
              y1={primaryRowCenter}
              x2={rightX - 6}
              y2={primaryRowCenter}
              stroke={EXPENSE_COLOR}
              strokeWidth={FLOW_LINE_WIDTH}
              strokeOpacity={0.5}
              markerEnd="url(#flow-arrow)"
              pointerEvents="none"
            />
            <text
              x={(primaryX + NODE_WIDTH + rightX - 6) / 2}
              y={primaryRowCenter - 8}
              textAnchor="middle"
              stroke="white"
              strokeWidth={3}
              paintOrder="stroke"
              className="fill-gray-700 text-[10px] font-medium"
            >
              {Math.round(snapshot.flow.expenseOut).toLocaleString()}원
            </text>
          </g>
        )}
        {transferEntries.map((entry, i) => {
          const x = primaryX + NODE_WIDTH / 2;
          const y1 = primaryY + NODE_HEIGHT;
          const y2 = assetTopY(i + 1) - 6;
          return (
            <g key={entry.id}>
              <line
                x1={x}
                y1={y1}
                x2={x}
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
                x1={x}
                y1={y1}
                x2={x}
                y2={y2}
                stroke={entry.color}
                strokeWidth={FLOW_LINE_WIDTH}
                strokeOpacity={0.5}
                markerEnd="url(#flow-arrow)"
                pointerEvents="none"
              />
              <text
                x={x + 8}
                y={(y1 + y2) / 2 + 3}
                textAnchor="start"
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
            y={primaryY}
            label="수입"
            amount={snapshot.flow.incomeIn}
            color={INCOME_COLOR}
            showAmount={false}
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
        {hasExpense && (
          <NodeBox
            x={rightX}
            y={primaryY}
            label="지출"
            amount={snapshot.flow.expenseOut}
            color={EXPENSE_COLOR}
            showAmount={false}
            onHoverMove={(e) =>
              setHoverTooltip({
                ...pointerPercent(e),
                color: EXPENSE_COLOR,
                lines: ["지출", formatKRW(snapshot.flow.expenseOut)],
              })
            }
            onHoverEnd={() => setHoverTooltip(null)}
          />
        )}
        {/* 기본 자산 열: 현금과 이체로 늘어난 자산을 같은 x축에 세로로 쌓아
            같은 종류(자산)라는 걸 위치만으로도 보여준다. */}
        <NodeBox
          x={primaryX}
          y={primaryY}
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
        {transferEntries.map((entry, i) => (
          <NodeBox
            key={entry.id}
            x={primaryX}
            y={assetTopY(i + 1)}
            label={entry.label}
            amount={entry.balance}
            color={entry.color}
            onHoverMove={(e) =>
              setHoverTooltip({
                ...pointerPercent(e),
                color: entry.color,
                lines: [entry.label, formatKRW(entry.balance)],
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
