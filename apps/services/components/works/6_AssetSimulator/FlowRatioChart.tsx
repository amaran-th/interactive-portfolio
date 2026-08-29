"use client";

import { useState } from "react";
import { Inbox, PieChart as PieChartIcon } from "lucide-react";
import {
  Category,
  ExpenseItem,
  GROUP_PALETTE,
  IncomeItem,
  MonthSnapshot,
  formatKRW,
  toRealValue,
} from "./types";
import { fires } from "./simulation";
import ChartTooltip from "./ChartTooltip";

type FlowRatioChartProps = {
  snapshot: MonthSnapshot;
  incomes: IncomeItem[];
  expenses: ExpenseItem[];
  categories: Category[];
  today: Date;
  inflationEnabled: boolean;
  inflationRate: number;
  exportMode?: boolean;
};

type FlowItem = { id: string; name: string; categoryId?: string; amount: number };

type Slice = {
  id: string;
  name: string;
  amount: number;
  ratio: number;
  color: string;
  dashArray: string;
  dashOffset: number;
};

const SIZE = 116;
const STROKE = 20;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Extra room reserved around the ring for outside labels, and how far
 * past the ring's outer edge each label's anchor point sits. */
const LABEL_MARGIN = 58;
const LABEL_GAP = 8;
const TEXT_GAP = LABEL_GAP + 10;
const LABEL_TEXT_WIDTH = 64;
const CONTAINER_SIZE = SIZE + LABEL_MARGIN * 2;

/** Angle to a slice's arc midpoint (the dash math runs inside a
 * `rotate(-90)` group, so this reproduces that rotation manually for
 * label placement outside that group). */
function sliceAngleRad(slice: Slice): number {
  const midOffset = -slice.dashOffset + (slice.ratio * CIRCUMFERENCE) / 2;
  return ((-90 + (midOffset / CIRCUMFERENCE) * 360) * Math.PI) / 180;
}

function buildSlices(
  items: FlowItem[],
  categories: Category[],
  viewMode: "item" | "category",
): Slice[] {
  // 카테고리별: 카테고리가 있는 항목은 카테고리 하나로 합치고, 카테고리
  // 없는 항목은 그 자체로 단일 카테고리이니 개별 표시를 유지한다 —
  // 자산 그룹/미분류 자산과 같은 구조.
  const grouped: { id: string; name: string; amount: number }[] =
    viewMode === "item"
      ? items.map((it) => ({ id: it.id, name: it.name, amount: it.amount }))
      : (() => {
          const categoryTotals = new Map<string, number>();
          const uncategorized: { id: string; name: string; amount: number }[] =
            [];
          for (const item of items) {
            if (item.categoryId) {
              categoryTotals.set(
                item.categoryId,
                (categoryTotals.get(item.categoryId) ?? 0) + item.amount,
              );
            } else {
              uncategorized.push({
                id: item.id,
                name: item.name,
                amount: item.amount,
              });
            }
          }
          const categoryItems = Array.from(categoryTotals.entries()).map(
            ([categoryId, amount]) => ({
              id: categoryId,
              name: categories.find((c) => c.id === categoryId)?.name ?? "?",
              amount,
            }),
          );
          return [...categoryItems, ...uncategorized];
        })();

  const total = grouped.reduce((sum, g) => sum + g.amount, 0);

  return grouped.reduce<{ offset: number; slices: Slice[] }>(
    (acc, item, i) => {
      const ratio = total > 0 ? item.amount / total : 0;
      const dash = ratio * CIRCUMFERENCE;
      const slice: Slice = {
        id: item.id,
        name: item.name,
        amount: item.amount,
        ratio,
        color: GROUP_PALETTE[i % GROUP_PALETTE.length],
        dashArray: `${dash} ${CIRCUMFERENCE - dash}`,
        dashOffset: -acc.offset,
      };
      return { offset: acc.offset + dash, slices: [...acc.slices, slice] };
    },
    { offset: 0, slices: [] },
  ).slices;
}

function FlowSideDonut({
  title,
  accentClassName,
  items,
  categories,
  exportMode = false,
}: {
  title: string;
  accentClassName: string;
  items: FlowItem[];
  categories: Category[];
  exportMode?: boolean;
}) {
  const [viewMode, setViewMode] = useState<"item" | "category">("item");
  const [hoveredSlice, setHoveredSlice] = useState<Slice | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });

  const hasCategorizable = categories.length > 0;
  const effectiveViewMode = hasCategorizable ? viewMode : "item";
  const slices = buildSlices(items, categories, effectiveViewMode);
  const total = items.reduce((sum, it) => sum + it.amount, 0);

  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Redundant on mobile — the 수입/지출 toggle above already says
        which one is showing. */}
        <p className={`hidden text-sm font-medium @min-[500px]:block ${accentClassName}`}>
          {title}
        </p>
        {hasCategorizable &&
          items.length > 0 &&
          (exportMode ? (
            <span className="text-xs text-gray-500">
              {effectiveViewMode === "item" ? "항목별" : "카테고리별"}
            </span>
          ) : (
            <div className="flex items-center gap-1 rounded-full bg-gray-100 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setViewMode("item")}
                className={`rounded-full px-2 py-0.5 ${
                  effectiveViewMode === "item"
                    ? "bg-white font-medium text-gray-800 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                항목별
              </button>
              <button
                type="button"
                onClick={() => setViewMode("category")}
                className={`rounded-full px-2 py-0.5 ${
                  effectiveViewMode === "category"
                    ? "bg-white font-medium text-gray-800 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                카테고리별
              </button>
            </div>
          ))}
      </div>
      <div className="mt-2 flex items-center justify-center">
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
              {total === 0 ? (
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
          {total === 0 && (
            <div
              className="pointer-events-none absolute flex items-center justify-center break-keep px-4 text-center text-[10px] text-gray-400"
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
              CONTAINER_SIZE / 2 + (SIZE / 2 + TEXT_GAP) * Math.cos(angle);
            const y =
              CONTAINER_SIZE / 2 + (SIZE / 2 + TEXT_GAP) * Math.sin(angle);
            return (
              <div
                key={slice.id}
                className={`pointer-events-none absolute break-keep leading-tight text-[10px] text-gray-600 ${
                  onRight ? "text-left" : "text-right"
                }`}
                style={{
                  left: x,
                  top: y,
                  width: LABEL_TEXT_WIDTH,
                  transform: `translate(${onRight ? "0" : "-100%"}, -50%)`,
                }}
              >
                {slice.name} {Math.round(slice.ratio * 100)}%
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function FlowRatioChart({
  snapshot,
  incomes,
  expenses,
  categories,
  today,
  inflationEnabled,
  inflationRate,
  exportMode = false,
}: FlowRatioChartProps) {
  const [mobileTab, setMobileTab] = useState<"income" | "expense">("income");
  const failedExpenseIds = new Set(
    snapshot.flow.failedExpenses.map((f) => f.itemId),
  );
  const realAmount = (amount: number) =>
    inflationEnabled
      ? toRealValue(amount, snapshot.monthIndex, inflationRate)
      : amount;
  const incomeItems: FlowItem[] = incomes
    .filter((item) => fires(item.schedule, snapshot.monthIndex, today))
    .map((item) => ({
      id: item.id,
      name: item.name,
      categoryId: item.categoryId,
      amount: realAmount(item.amount),
    }));
  const expenseItems: FlowItem[] = expenses
    .filter(
      (item) =>
        fires(item.schedule, snapshot.monthIndex, today) &&
        !failedExpenseIds.has(item.id),
    )
    .map((item) => ({
      id: item.id,
      name: item.name,
      categoryId: item.categoryId,
      amount: realAmount(item.amount),
    }));

  if (incomes.length === 0 && expenses.length === 0) {
    return (
      <div className="flex h-[180px] items-center justify-center gap-1.5 break-keep rounded-2xl border border-white/40 bg-white/70 text-center text-sm text-gray-400 backdrop-blur">
        <Inbox className="h-4 w-4 shrink-0" /> 수입/지출을 추가하면 구성
        비율이 나타납니다
      </div>
    );
  }

  return (
    <div className="@container flex h-full flex-col rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm text-gray-500">
          <PieChartIcon className="h-4 w-4" /> 이번 달 수입/지출 구성
        </p>
        <div className="flex items-center gap-1 rounded-full bg-gray-100 p-0.5 text-xs @min-[500px]:hidden">
          <button
            type="button"
            onClick={() => setMobileTab("income")}
            className={`rounded-full px-2.5 py-1 ${
              mobileTab === "income"
                ? "bg-white font-medium text-emerald-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            수입
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("expense")}
            className={`rounded-full px-2.5 py-1 ${
              mobileTab === "expense"
                ? "bg-white font-medium text-rose-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            지출
          </button>
        </div>
      </div>
      <div className="mt-3 flex flex-1 flex-col items-center justify-center gap-6 @min-[420px]:flex-row">
        <div
          className={
            mobileTab === "income" ? "block" : "hidden @min-[500px]:block"
          }
        >
          <FlowSideDonut
            title="수입"
            accentClassName="text-emerald-600"
            items={incomeItems}
            categories={categories}
            exportMode={exportMode}
          />
        </div>
        <div
          className={
            mobileTab === "expense" ? "block" : "hidden @min-[500px]:block"
          }
        >
          <FlowSideDonut
            title="지출"
            accentClassName="text-rose-600"
            items={expenseItems}
            categories={categories}
            exportMode={exportMode}
          />
        </div>
      </div>
    </div>
  );
}
