# 자산 시뮬레이터: 음수 잔액 렌더링, 자금 흐름도, 레이아웃 재구성 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 음수 잔액이 시각적으로 깨지지 않게 차트 렌더링을 고치고, 자금 흐름도의 이체 오귀속 버그를 수정하며 가독성을 개선하고, 입력 패널(목표 카드 포함)을 페이지 상단으로, 슬라이더와 현재 자산 표시를 AssetAreaChart 안으로 재배치한다.

**Architecture:** `simulation.ts`는 변경하지 않는다(이미 음수를 올바르게 허용). 순수 시각화 레이어(AssetAreaChart, ComparisonBarChart)의 스택 계산에 0 기준선 개념을 추가하고, FlowDiagram은 버그 수정 + 가독성 개선을 하며, AssetSimulator.tsx가 최상위 배선을 다시 한다. **이번 라운드는 v3 4라운드와 달리 컴포넌트 props 시그니처가 실제로 바뀐다** — AssetAreaChart(슬라이더 관련 3개 prop 추가)와 InputPanel(목표 카드 관련 4개 prop 추가)의 호출부가 Task 5(AssetSimulator.tsx)에서만 갱신되므로, Task 1과 Task 4를 마친 직후에는 AssetSimulator.tsx에서 "필수 prop 누락" tsc 에러가 나는 것이 정상이다(v3 1~3라운드와 동일한 컴파일 체크포인트 패턴). Task 5가 완료되어야 프로젝트 전체가 다시 클린해진다.

**Tech Stack:** Next.js 16(App Router), React 19, TypeScript, Tailwind CSS v4(컨테이너 쿼리 포함, 이미 이전 라운드에서 도입됨). 새 라이브러리 없음. 테스트 스위트 없음(CLAUDE.md).

**Spec:** [docs/superpowers/specs/2026-08-23-asset-simulator-negative-balance-flow-layout-design.md](../specs/2026-08-23-asset-simulator-negative-balance-flow-layout-design.md)

## Global Constraints

- 테스트 스위트 없음(CLAUDE.md) — 검증은 `npx tsc --noEmit` + `npm run lint` + Playwright 기반 수동 확인.
- 새 npm 의존성 추가 금지.
- **Task 1~4는 각각 완료 직후 AssetSimulator.tsx에서 발생하는 "필수 prop 누락" tsc 에러가 예상된 상태다** — 해당 컴포넌트의 새 prop을 아직 아무도 넘기지 않기 때문이며, Task 5에서 한 번에 해소된다. Task 1~4의 리뷰어는 "자기 태스크가 건드린 파일 자체"가 tsc/lint 클린한지만 확인하고, AssetSimulator.tsx의 교차 파일 에러는 Task 5 완료를 기다리는 정상 상태로 간주한다. Task 5 완료 후에는 프로젝트 전체가 다시 tsc/lint 클린해야 한다(예외 없음).
- 적자(음수 값) 시각화 색상은 기존에 이미 지출/적자 맥락에서 쓰이던 rose-500 계열(`#f43f5e`)로 통일한다 — 새 색상 팔레트를 만들지 않는다.
- `GoalCard.tsx`의 렌더 중 상태 동기화 로직(`if (goal !== syncedGoal) {...} else if (...) {...}` 체인과 그 주석)은 이번 라운드에서 전혀 건드리지 않는다 — `GoalCard`는 오직 InputPanel 안으로 옮겨질 뿐이며 내부 로직/문구는 변경하지 않는다.
- `FlowDiagram`은 기본계좌 중심 구조를 유지한다 — 모든 자산 간 흐름을 보여주는 일반 네트워크 그래프로 확장하지 않는다(범위 밖).
- `GroupDonutChart`(그룹별 비율)의 음수 처리는 이번 범위에 포함하지 않는다 — 건드리지 않는다.

---

### Task 1: `AssetAreaChart.tsx` — 음수 잔액 지원 + 현재 자산 마커 + 슬라이더 통합, `TimelineSlider.tsx` — 카드 래퍼 제거

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/AssetAreaChart.tsx` (전체 교체)
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/TimelineSlider.tsx` (전체 교체)

**Interfaces:**
- Consumes: `TimelineSlider`의 기존 4개 props(`selectedMonth`, `onChange`, `today`, `horizonMonths`) — 시그니처는 바뀌지 않고 겉 카드 스타일만 제거됨.
- Produces: `AssetAreaChartProps`에 `onChangeMonth: (month: number) => void`, `today: Date`, `horizonMonths: number` 3개가 새로 추가됨(기존 `snapshots`/`groups`/`assetClasses`/`selectedMonth`는 유지). Task 5가 이 새 props를 실제로 채워 넘긴다. `TimelineSlider`는 이제 항상 `AssetAreaChart` 내부에서만 렌더된다(다른 소비자 없음, 이미 grep으로 확인됨).

- [ ] **Step 1: `TimelineSlider.tsx` 전체 교체 — 카드 래퍼 제거**

```tsx
"use client";

import { formatMonthsFromNow } from "./types";

type TimelineSliderProps = {
  selectedMonth: number;
  onChange: (month: number) => void;
  today: Date;
  horizonMonths: number;
};

function formatMonthLabel(monthIndex: number, today: Date): string {
  const date = new Date(
    today.getFullYear(),
    today.getMonth() + monthIndex,
    1,
  );
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function TimelineSlider({
  selectedMonth,
  onChange,
  today,
  horizonMonths,
}: TimelineSliderProps) {
  return (
    <div>
      <span className="text-sm text-gray-500">
        {selectedMonth === 0
          ? "지금"
          : `${formatMonthsFromNow(selectedMonth)} · ${formatMonthLabel(selectedMonth, today)}`}
      </span>
      <input
        type="range"
        min={0}
        max={horizonMonths}
        value={selectedMonth}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 w-full accent-indigo-500"
      />
    </div>
  );
}
```

- [ ] **Step 2: `AssetAreaChart.tsx` 전체 교체**

```tsx
"use client";

import { AssetClass, Group, MonthSnapshot, formatKRW } from "./types";
import TimelineSlider from "./TimelineSlider";

type AssetAreaChartProps = {
  snapshots: MonthSnapshot[];
  groups: Group[];
  assetClasses: AssetClass[];
  selectedMonth: number;
  onChangeMonth: (month: number) => void;
  today: Date;
  horizonMonths: number;
};

const WIDTH = 600;
const HEIGHT = 220;
const PADDING = 12;
const BELOW_ZERO_CLIP_ID = "asset-area-below-zero-clip";
const DEFICIT_COLOR = "#f43f5e";

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
  onChangeMonth,
  today,
  horizonMonths,
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

  const { bands: rawBands, minValue } = assets.reduce<{
    prevTop: number[];
    bands: {
      id: string;
      name: string;
      fill: string;
      stroke: string | undefined;
      bottom: number[];
      top: number[];
    }[];
    minValue: number;
  }>(
    (acc, asset) => {
      const bottom = acc.prevTop;
      const top = snapshots.map(
        (snapshot, i) =>
          bottom[i] + (snapshot.assetBalancesKRW[asset.id] ?? 0),
      );
      const group = groups.find((g) => g.id === asset.groupId);

      return {
        prevTop: top,
        minValue: Math.min(acc.minValue, ...bottom, ...top),
        bands: [
          ...acc.bands,
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
    { prevTop: snapshots.map(() => 0), bands: [], minValue: 0 },
  );

  const domainMin = Math.min(0, minValue);
  const domainMax = Math.max(1, maxTotal);
  const domainRange = domainMax - domainMin || 1;
  const scaleY = (value: number) =>
    HEIGHT -
    PADDING -
    ((value - domainMin) / domainRange) * (HEIGHT - PADDING * 2);
  const zeroY = scaleY(0);

  const bands = rawBands.map((band) => {
    const topPoints = band.top.map(
      (value, i) => `${PADDING + i * stepX},${scaleY(value)}`,
    );
    const bottomPoints = band.bottom
      .map((value, i) => `${PADDING + i * stepX},${scaleY(value)}`)
      .reverse();
    return {
      id: band.id,
      name: band.name,
      fill: band.fill,
      stroke: band.stroke,
      points: [...topPoints, ...bottomPoints].join(" "),
    };
  });

  const cursorX = PADDING + selectedMonth * stepX;
  const totalBalance = snapshots[selectedMonth]?.totalBalance ?? 0;
  const currentTotal = snapshots[0]?.totalBalance ?? 0;
  const currentY = scaleY(currentTotal);

  return (
    <div className="rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
      <p className="text-sm text-gray-500">
        📈 총자산{" "}
        <span className="text-lg font-semibold text-gray-800">
          {formatKRW(totalBalance)}
        </span>
      </p>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="mt-2 w-full">
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
        {bands.map((band) => (
          <g key={band.id}>
            <polygon
              points={band.points}
              fill={band.fill}
              fillOpacity={0.55}
              stroke={band.stroke}
              strokeWidth={band.stroke ? 2 : 0}
            >
              <title>{band.name}</title>
            </polygon>
            <polygon
              points={band.points}
              fill={DEFICIT_COLOR}
              fillOpacity={0.55}
              clipPath={`url(#${BELOW_ZERO_CLIP_ID})`}
            />
          </g>
        ))}
        {domainMin < 0 && (
          <line
            x1={PADDING}
            y1={zeroY}
            x2={WIDTH - PADDING}
            y2={zeroY}
            stroke="#9ca3af"
            strokeWidth={1}
            strokeDasharray="2 2"
          />
        )}
        <line
          x1={cursorX}
          y1={PADDING}
          x2={cursorX}
          y2={HEIGHT - PADDING}
          stroke="#4338ca"
          strokeWidth={1.5}
          strokeDasharray="4 4"
        />
        <circle
          cx={PADDING}
          cy={currentY}
          r={4}
          fill="#4338ca"
          stroke="white"
          strokeWidth={1.5}
        />
        <text
          x={PADDING + 8}
          y={Math.max(10, currentY - 6)}
          className="fill-gray-700 text-[10px] font-medium"
        >
          현재 {formatKRW(currentTotal)}
        </text>
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
      <div className="mt-3 border-t border-white/60 pt-3">
        <TimelineSlider
          selectedMonth={selectedMonth}
          onChange={onChangeMonth}
          today={today}
          horizonMonths={horizonMonths}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 타입체크(교차 파일 에러는 예상됨)**

Run: `npx tsc --noEmit`
Expected: `AssetAreaChart.tsx`와 `TimelineSlider.tsx` 자체에는 에러가 없어야 한다. `AssetSimulator.tsx`에서 `<AssetAreaChart>` 호출 시 `onChangeMonth`/`today`/`horizonMonths`가 없다는 에러가 나는 것은 **이 시점에 정상**이다(Task 5에서 해소).

- [ ] **Step 4: 두 파일만 린트로 스코프 확인**

Run: `npx eslint app/\(portfolio\)/playground/_sections/Works/6_AssetSimulator/AssetAreaChart.tsx app/\(portfolio\)/playground/_sections/Works/6_AssetSimulator/TimelineSlider.tsx`
Expected: 에러 없음(경고도 없어야 함 — 두 파일 다 새로 작성된 로직이므로).

- [ ] **Step 5: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/6_AssetSimulator/AssetAreaChart.tsx app/\(portfolio\)/playground/_sections/Works/6_AssetSimulator/TimelineSlider.tsx
git commit -m "feat: AssetAreaChart에 음수 잔액 렌더링과 슬라이더 통합, 현재 자산 마커 추가"
```

---

### Task 2: `ComparisonBarChart.tsx` — 음수 잔액 지원

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/ComparisonBarChart.tsx` (전체 교체)

**Interfaces:**
- Consumes: 없음(props 시그니처 변경 없음).
- Produces: 없음.

- [ ] **Step 1: `ComparisonBarChart.tsx` 전체 교체**

```tsx
"use client";

import {
  AssetClass,
  Group,
  MonthSnapshot,
  formatKRW,
  formatMonthsFromNow,
} from "./types";

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

type Segment = {
  id: string;
  name: string;
  fill: string;
  stroke: string | undefined;
  y: number;
  height: number;
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

export default function ComparisonBarChart({
  snapshots,
  groups,
  assetClasses,
  selectedMonth,
}: ComparisonBarChartProps) {
  if (assetClasses.length === 0 || snapshots.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-2xl border border-white/40 bg-white/70 text-sm text-gray-400 backdrop-blur">
        📭 자산을 추가하면 비교 그래프가 나타납니다
      </div>
    );
  }

  const nowSnapshot = snapshots[0];
  const futureSnapshot = snapshots[selectedMonth];
  const assets = orderedAssets(assetClasses, groups);

  const maxTotal = Math.max(
    1,
    nowSnapshot.totalBalance,
    futureSnapshot.totalBalance,
  );

  const buildSegments = (snapshot: MonthSnapshot): Segment[] => {
    const { segments } = assets.reduce<{
      cursor: number;
      segments: Segment[];
    }>(
      (acc, asset) => {
        const value = snapshot.assetBalancesKRW[asset.id] ?? 0;
        const height = (value / maxTotal) * MAX_BAR_HEIGHT;
        const stackTop = BASE_Y - acc.cursor;
        const isNegative = height < 0;
        const rectY = isNegative ? stackTop : stackTop - height;
        const rectHeight = Math.abs(height);
        const group = groups.find((g) => g.id === asset.groupId);
        return {
          cursor: acc.cursor + height,
          segments: [
            ...acc.segments,
            {
              id: asset.id,
              name: asset.name,
              fill: isNegative ? DEFICIT_COLOR : asset.color,
              stroke: group?.color,
              y: rectY,
              height: rectHeight,
            },
          ],
        };
      },
      { cursor: 0, segments: [] },
    );
    return segments;
  };

  const nowSegments = buildSegments(nowSnapshot);
  const futureSegments = buildSegments(futureSnapshot);
  const nowX = WIDTH / 2 - BAR_WIDTH - 16;
  const futureX = WIDTH / 2 + 16;

  return (
    <div className="rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
      <p className="text-sm text-gray-500">📊 자산 비교</p>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full">
        <line
          x1={0}
          y1={BASE_Y}
          x2={WIDTH}
          y2={BASE_Y}
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
          <rect
            key={seg.id}
            x={nowX}
            y={seg.y}
            width={BAR_WIDTH}
            height={seg.height}
            fill={seg.fill}
            fillOpacity={0.75}
            stroke={seg.stroke}
            strokeWidth={seg.stroke ? 2 : 0}
          >
            <title>{seg.name}</title>
          </rect>
        ))}
        {futureSegments.map((seg) => (
          <rect
            key={seg.id}
            x={futureX}
            y={seg.y}
            width={BAR_WIDTH}
            height={seg.height}
            fill={seg.fill}
            fillOpacity={0.75}
            stroke={seg.stroke}
            strokeWidth={seg.stroke ? 2 : 0}
          >
            <title>{seg.name}</title>
          </rect>
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
```

- [ ] **Step 2: 타입체크·린트(이 파일만 프로젝트 전체 기준으로 클린해야 함 — props 변경이 없으므로 교차 파일 에러 없음)**

Run: `npx tsc --noEmit && npm run lint`
Expected: `AssetSimulator.tsx`의 `AssetAreaChart` 관련 prop 누락 에러(Task 1에서 생긴 것)만 남아있고, 그 외 새 에러는 없어야 한다.

- [ ] **Step 3: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/6_AssetSimulator/ComparisonBarChart.tsx
git commit -m "feat: ComparisonBarChart에 음수 잔액 렌더링 추가"
```

---

### Task 3: `FlowDiagram.tsx` — 이체 오귀속 버그 수정 + 가독성 개선

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/FlowDiagram.tsx` (전체 교체)

**Interfaces:**
- Consumes: 없음(props 시그니처 변경 없음).
- Produces: 없음.

- [ ] **Step 1: `FlowDiagram.tsx` 전체 교체**

```tsx
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
```

- [ ] **Step 2: 타입체크·린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: 이 파일 자체는 에러 없음. `AssetSimulator.tsx`의 `AssetAreaChart` prop 누락 에러(Task 1에서 생긴 것)만 남아있어야 한다.

- [ ] **Step 3: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/6_AssetSimulator/FlowDiagram.tsx
git commit -m "fix: FlowDiagram 이체 오귀속 버그 수정 및 가독성 개선"
```

---

### Task 4: `InputPanel.tsx` — 목표 카드(GoalCard) 추가

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/InputPanel.tsx` (전체 교체)

**Interfaces:**
- Consumes: `GoalCard`의 기존 props(`goal`, `onSetGoal`, `assetClasses`, `groups`, `simulationInput`, `today`, `selectedSnapshot`) — `GoalCard.tsx` 자체는 이 태스크에서 수정하지 않는다.
- Produces: `InputPanelProps`에 `assetGroups: Group[]`, `goal: Goal | null`, `onSetGoal: (goal: Goal | null) => void`, `simulationInput: SimulationInput`, `selectedSnapshot: MonthSnapshot` 5개가 새로 추가됨. **주의**: 기존 `groups` prop(전체 그룹 목록, `GroupPicker` 소비용)과 새 `assetGroups` prop(자산이 있는 그룹만 필터링된 목록, `GoalCard` 소비용)은 서로 다른 값이다 — `AssetSimulator.tsx`의 기존 `assetGroups = activeScenario.groups.filter((g) => activeScenario.assetClasses.some((a) => a.groupId === g.id))` 계산과 동일한 필터링된 목록을 별도로 넘겨받아야 한다. `GoalCard`에는 반드시 `assetGroups`를 넘기고, 절대로 필터링되지 않은 `groups`를 넘기면 안 된다(기존에도 `GoalCard`는 항상 필터링된 목록을 받아왔다).

- [ ] **Step 1: `InputPanel.tsx` 전체 교체**

```tsx
"use client";

import {
  AssetClass,
  ExpenseItem,
  Goal,
  Group,
  IncomeItem,
  MonthSnapshot,
  NewAssetClassInput,
  NewExpenseItemInput,
  NewIncomeItemInput,
  NewTransferRuleInput,
  SimulationInput,
  TransferRule,
} from "./types";
import GroupAssetSection from "./input-sections/GroupAssetSection";
import IncomeSection from "./input-sections/IncomeSection";
import ExpenseSection from "./input-sections/ExpenseSection";
import TransferRuleSection from "./input-sections/TransferRuleSection";
import GoalCard from "./GoalCard";

type InputPanelProps = {
  groups: Group[];
  assetGroups: Group[];
  onAddGroup: (name: string) => string;
  onUpdateGroup: (id: string, input: { name: string; color: string }) => void;
  onRemoveGroup: (id: string) => void;
  assetClasses: AssetClass[];
  onAddAssetClass: (input: NewAssetClassInput) => void;
  onUpdateAssetClass: (id: string, input: NewAssetClassInput) => void;
  onRemoveAssetClass: (id: string) => void;
  onSetPrimaryAsset: (id: string) => void;
  onChangeAssetColor: (id: string, color: string) => void;
  incomes: IncomeItem[];
  onAddIncome: (input: NewIncomeItemInput) => void;
  onUpdateIncome: (id: string, input: NewIncomeItemInput) => void;
  onRemoveIncome: (id: string) => void;
  expenses: ExpenseItem[];
  onAddExpense: (input: NewExpenseItemInput) => void;
  onUpdateExpense: (id: string, input: NewExpenseItemInput) => void;
  onRemoveExpense: (id: string) => void;
  transferRules: TransferRule[];
  onAddTransferRule: (input: NewTransferRuleInput) => void;
  onUpdateTransferRule: (id: string, input: NewTransferRuleInput) => void;
  onRemoveTransferRule: (id: string) => void;
  today: Date;
  horizonMonths: number;
  goal: Goal | null;
  onSetGoal: (goal: Goal | null) => void;
  simulationInput: SimulationInput;
  selectedSnapshot: MonthSnapshot;
};

export default function InputPanel(props: InputPanelProps) {
  return (
    <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))]">
      <GroupAssetSection
        groups={props.groups}
        onAddGroup={props.onAddGroup}
        onUpdateGroup={props.onUpdateGroup}
        onRemoveGroup={props.onRemoveGroup}
        assetClasses={props.assetClasses}
        onAddAssetClass={props.onAddAssetClass}
        onUpdateAssetClass={props.onUpdateAssetClass}
        onRemoveAssetClass={props.onRemoveAssetClass}
        onSetPrimaryAsset={props.onSetPrimaryAsset}
        onChangeAssetColor={props.onChangeAssetColor}
      />
      <IncomeSection
        groups={props.groups}
        onAddGroup={props.onAddGroup}
        onUpdateGroup={props.onUpdateGroup}
        onRemoveGroup={props.onRemoveGroup}
        incomes={props.incomes}
        onAddIncome={props.onAddIncome}
        onUpdateIncome={props.onUpdateIncome}
        onRemoveIncome={props.onRemoveIncome}
        today={props.today}
        horizonMonths={props.horizonMonths}
      />
      <ExpenseSection
        groups={props.groups}
        onAddGroup={props.onAddGroup}
        onUpdateGroup={props.onUpdateGroup}
        onRemoveGroup={props.onRemoveGroup}
        expenses={props.expenses}
        onAddExpense={props.onAddExpense}
        onUpdateExpense={props.onUpdateExpense}
        onRemoveExpense={props.onRemoveExpense}
        today={props.today}
        horizonMonths={props.horizonMonths}
      />
      <TransferRuleSection
        assetClasses={props.assetClasses}
        transferRules={props.transferRules}
        onAddTransferRule={props.onAddTransferRule}
        onUpdateTransferRule={props.onUpdateTransferRule}
        onRemoveTransferRule={props.onRemoveTransferRule}
        today={props.today}
        horizonMonths={props.horizonMonths}
      />
      <GoalCard
        goal={props.goal}
        onSetGoal={props.onSetGoal}
        assetClasses={props.assetClasses}
        groups={props.assetGroups}
        simulationInput={props.simulationInput}
        today={props.today}
        selectedSnapshot={props.selectedSnapshot}
      />
    </div>
  );
}
```

- [ ] **Step 2: 타입체크·린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: 이 파일 자체는 에러 없음. `AssetSimulator.tsx`에 `AssetAreaChart` 관련 에러(Task 1) + `InputPanel`에 새 필수 prop 5개가 없다는 에러(이 태스크에서 새로 생김)가 남아있어야 한다 — 둘 다 Task 5에서 해소되는 예상된 상태다.

- [ ] **Step 3: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/6_AssetSimulator/InputPanel.tsx
git commit -m "feat: InputPanel에 목표 카드(GoalCard) 추가"
```

---

### Task 5: `AssetSimulator.tsx` — 최종 배선(레이아웃 재구성, 컴파일 체크포인트)

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/AssetSimulator.tsx` (전체 교체)

**Interfaces:**
- Consumes: Task 1~4에서 변경된 모든 컴포넌트(`AssetAreaChart`의 새 3개 prop, `InputPanel`의 새 5개 prop, `ComparisonBarChart`/`FlowDiagram`은 시그니처 변경 없음).
- Produces: 이 태스크 이후 프로젝트 전체가 `npx tsc --noEmit`/`npm run lint` 기준으로 완전히 클린해야 한다. 이후 태스크는 골든 패스 검증(Task 6)뿐, 코드 변경 없음.

- [ ] **Step 1: `AssetSimulator.tsx` 전체 교체**

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AssetClass,
  DEFAULT_HORIZON_YEARS,
  Goal,
  HORIZON_PRESET_YEARS,
  NewAssetClassInput,
  NewExpenseItemInput,
  NewIncomeItemInput,
  NewTransferRuleInput,
  RepeatSchedule,
  Scenario,
  SimulationInput,
  addMonths,
  newId,
  nextAssetColor,
  nextGroupColor,
  toMonthInputValue,
} from "./types";
import { useSimulation } from "./useSimulation";
import InputPanel from "./InputPanel";
import AssetAreaChart from "./AssetAreaChart";
import GroupDonutChart from "./GroupDonutChart";
import FlowDiagram from "./FlowDiagram";
import ComparisonBarChart from "./ComparisonBarChart";
import CashFlowChart from "./CashFlowChart";
import HistoryPanel from "./HistoryPanel";
import ScenarioTabs from "./ScenarioTabs";
import ScenarioComparisonChart from "./ScenarioComparisonChart";

function withGuaranteedPrimary(assets: AssetClass[]): AssetClass[] {
  if (assets.some((a) => a.isPrimary && a.currency === "KRW")) {
    return assets;
  }
  const candidate = assets.find((a) => a.currency === "KRW");
  if (!candidate) return assets;
  return assets.map((a) => ({ ...a, isPrimary: a.id === candidate.id }));
}

function goalReferences(
  goal: Goal | null,
  kind: "asset" | "group",
  id: string,
): boolean {
  if (!goal) return false;
  if (kind === "asset") {
    return goal.metric.type === "asset" && goal.metric.assetId === id;
  }
  return goal.metric.type === "group" && goal.metric.groupId === id;
}

function emptyScenario(name: string): Scenario {
  return {
    id: newId(),
    name,
    groups: [],
    assetClasses: [],
    incomes: [],
    expenses: [],
    transferRules: [],
    exchangeRate: 1350,
    goal: null,
  };
}

// 첫 로드 시 온보딩용으로 예시 데이터를 채운 시나리오. 사용자의 실제 수정이
// 아니므로 dirty 플래그와 무관하게, 어떤 핸들러도 거치지 않고 초기 state로
// 직접 넣는다.
function seedScenario(name: string, today: Date): Scenario {
  const assetId = newId();
  const monthlyRecurring = (startDate: string): RepeatSchedule => ({
    mode: "recurring",
    startDate,
    frequency: "monthly",
    until: { type: "indefinite" },
  });
  const nextMonth = toMonthInputValue(addMonths(today, 1));

  return {
    id: newId(),
    name,
    groups: [],
    assetClasses: [
      {
        id: assetId,
        name: "현금",
        currency: "KRW",
        initialBalance: 1_000_000,
        annualReturnRate: 0,
        isPrimary: true,
        color: nextAssetColor(0),
      },
    ],
    incomes: [
      {
        id: newId(),
        name: "월급",
        amount: 2_200_000,
        schedule: monthlyRecurring(nextMonth),
      },
    ],
    expenses: [
      {
        id: newId(),
        name: "생활비",
        amount: 700_000,
        schedule: monthlyRecurring(nextMonth),
      },
    ],
    transferRules: [],
    exchangeRate: 1350,
    goal: null,
  };
}

function duplicateScenario(scenario: Scenario): Scenario {
  const groupIdMap = new Map(scenario.groups.map((g) => [g.id, newId()]));
  const assetIdMap = new Map(scenario.assetClasses.map((a) => [a.id, newId()]));

  const groups = scenario.groups.map((g) => ({
    ...g,
    id: groupIdMap.get(g.id)!,
  }));
  const assetClasses = scenario.assetClasses.map((a) => ({
    ...a,
    id: assetIdMap.get(a.id)!,
    groupId: a.groupId ? groupIdMap.get(a.groupId) : undefined,
  }));
  const incomes = scenario.incomes.map((i) => ({
    ...i,
    id: newId(),
    groupId: i.groupId ? groupIdMap.get(i.groupId) : undefined,
  }));
  const expenses = scenario.expenses.map((e) => ({
    ...e,
    id: newId(),
    groupId: e.groupId ? groupIdMap.get(e.groupId) : undefined,
  }));
  const transferRules = scenario.transferRules.map((r) => ({
    ...r,
    id: newId(),
    fromAssetId: assetIdMap.get(r.fromAssetId)!,
    toAssetId: assetIdMap.get(r.toAssetId)!,
  }));
  const goal = scenario.goal
    ? {
        ...scenario.goal,
        metric:
          scenario.goal.metric.type === "asset"
            ? {
                type: "asset" as const,
                assetId: assetIdMap.get(scenario.goal.metric.assetId)!,
              }
            : scenario.goal.metric.type === "group"
              ? {
                  type: "group" as const,
                  groupId: groupIdMap.get(scenario.goal.metric.groupId)!,
                }
              : scenario.goal.metric,
      }
    : null;

  return {
    id: newId(),
    name: `${scenario.name} 복사본`,
    groups,
    assetClasses,
    incomes,
    expenses,
    transferRules,
    exchangeRate: scenario.exchangeRate,
    goal,
  };
}

export default function AssetSimulator() {
  const today = useMemo(() => new Date(), []);

  const [scenarios, setScenarios] = useState<Scenario[]>(() => [
    seedScenario("시나리오 1", today),
  ]);
  const [activeScenarioId, setActiveScenarioId] = useState(
    () => scenarios[0].id,
  );
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [horizonYears, setHorizonYears] = useState(DEFAULT_HORIZON_YEARS);
  const [isDirty, setIsDirty] = useState(false);

  const horizonMonths = horizonYears * 12;

  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const handleChangeHorizon = (years: number) => {
    setHorizonYears(years);
    setSelectedMonth((prev) => Math.min(prev, years * 12));
  };

  const updateActiveScenario = (
    updater: (scenario: Scenario) => Scenario,
  ) => {
    setIsDirty(true);
    setScenarios((prev) =>
      prev.map((s) => (s.id === activeScenarioId ? updater(s) : s)),
    );
  };

  const handleSelectScenario = (id: string) => setActiveScenarioId(id);

  const handleRenameScenario = (id: string, name: string) => {
    setIsDirty(true);
    setScenarios((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
  };

  const handleDeleteScenario = (id: string) => {
    if (scenarios.length <= 1) return;
    setIsDirty(true);
    const rest = scenarios.filter((s) => s.id !== id);
    setScenarios(rest);
    if (activeScenarioId === id) {
      setActiveScenarioId(rest[0].id);
    }
  };

  const handleDuplicateScenario = (id: string) => {
    const source = scenarios.find((s) => s.id === id);
    if (!source) return;
    setIsDirty(true);
    const clone = duplicateScenario(source);
    setScenarios((prev) => [...prev, clone]);
    setActiveScenarioId(clone.id);
  };

  const handleCreateScenario = () => {
    setIsDirty(true);
    const existingNames = new Set(scenarios.map((s) => s.name));
    let n = scenarios.length + 1;
    while (existingNames.has(`시나리오 ${n}`)) n++;
    const created = emptyScenario(`시나리오 ${n}`);
    setScenarios((prev) => [...prev, created]);
    setActiveScenarioId(created.id);
  };

  const handleAddGroup = (name: string): string => {
    const id = newId();
    updateActiveScenario((s) => ({
      ...s,
      groups: [...s.groups, { id, name, color: nextGroupColor(s.groups.length) }],
    }));
    return id;
  };
  const handleUpdateGroup = (
    id: string,
    input: { name: string; color: string },
  ) => {
    updateActiveScenario((s) => ({
      ...s,
      groups: s.groups.map((g) => (g.id === id ? { ...g, ...input } : g)),
    }));
  };
  const handleRemoveGroup = (id: string) => {
    updateActiveScenario((s) => ({
      ...s,
      groups: s.groups.filter((g) => g.id !== id),
      assetClasses: s.assetClasses.map((a) =>
        a.groupId === id ? { ...a, groupId: undefined } : a,
      ),
      incomes: s.incomes.map((i) =>
        i.groupId === id ? { ...i, groupId: undefined } : i,
      ),
      expenses: s.expenses.map((e) =>
        e.groupId === id ? { ...e, groupId: undefined } : e,
      ),
      goal: goalReferences(s.goal, "group", id) ? null : s.goal,
    }));
  };

  const handleAddAssetClass = (input: NewAssetClassInput) => {
    updateActiveScenario((s) => {
      const withNew = [
        ...(input.isPrimary
          ? s.assetClasses.map((a) => ({ ...a, isPrimary: false }))
          : s.assetClasses),
        { id: newId(), ...input, color: nextAssetColor(s.assetClasses.length) },
      ];
      return { ...s, assetClasses: withGuaranteedPrimary(withNew) };
    });
  };
  const handleUpdateAssetClass = (id: string, input: NewAssetClassInput) => {
    updateActiveScenario((s) => {
      const updated = s.assetClasses.map((a) => {
        if (a.id === id) return { ...a, ...input };
        if (input.isPrimary) return { ...a, isPrimary: false };
        return a;
      });
      const nextAssetClasses = withGuaranteedPrimary(updated);
      const nextTransferRules = s.transferRules.filter((r) => {
        const from = nextAssetClasses.find((a) => a.id === r.fromAssetId);
        const to = nextAssetClasses.find((a) => a.id === r.toAssetId);
        return from && to && from.currency === to.currency;
      });
      return { ...s, assetClasses: nextAssetClasses, transferRules: nextTransferRules };
    });
  };
  const handleChangeAssetColor = (id: string, color: string) => {
    updateActiveScenario((s) => ({
      ...s,
      assetClasses: s.assetClasses.map((a) =>
        a.id === id ? { ...a, color } : a,
      ),
    }));
  };
  const handleRemoveAssetClass = (id: string) => {
    updateActiveScenario((s) => {
      const removed = s.assetClasses.find((a) => a.id === id);
      let rest = s.assetClasses.filter((a) => a.id !== id);
      if (removed?.isPrimary) {
        const nextPrimary = rest.find((a) => a.currency === "KRW");
        if (nextPrimary) {
          rest = rest.map((a) =>
            a.id === nextPrimary.id ? { ...a, isPrimary: true } : a,
          );
        }
      }
      return {
        ...s,
        assetClasses: rest,
        transferRules: s.transferRules.filter(
          (r) => r.fromAssetId !== id && r.toAssetId !== id,
        ),
        goal: goalReferences(s.goal, "asset", id) ? null : s.goal,
      };
    });
  };
  const handleSetPrimaryAsset = (id: string) => {
    updateActiveScenario((s) => ({
      ...s,
      assetClasses: s.assetClasses.map((a) => ({
        ...a,
        isPrimary: a.id === id,
      })),
    }));
  };

  const handleAddIncome = (input: NewIncomeItemInput) => {
    updateActiveScenario((s) => ({
      ...s,
      incomes: [...s.incomes, { id: newId(), ...input }],
    }));
  };
  const handleUpdateIncome = (id: string, input: NewIncomeItemInput) => {
    updateActiveScenario((s) => ({
      ...s,
      incomes: s.incomes.map((i) => (i.id === id ? { ...i, ...input } : i)),
    }));
  };
  const handleRemoveIncome = (id: string) => {
    updateActiveScenario((s) => ({
      ...s,
      incomes: s.incomes.filter((i) => i.id !== id),
    }));
  };

  const handleAddExpense = (input: NewExpenseItemInput) => {
    updateActiveScenario((s) => ({
      ...s,
      expenses: [...s.expenses, { id: newId(), ...input }],
    }));
  };
  const handleUpdateExpense = (id: string, input: NewExpenseItemInput) => {
    updateActiveScenario((s) => ({
      ...s,
      expenses: s.expenses.map((e) => (e.id === id ? { ...e, ...input } : e)),
    }));
  };
  const handleRemoveExpense = (id: string) => {
    updateActiveScenario((s) => ({
      ...s,
      expenses: s.expenses.filter((e) => e.id !== id),
    }));
  };

  const handleAddTransferRule = (input: NewTransferRuleInput) => {
    updateActiveScenario((s) => ({
      ...s,
      transferRules: [...s.transferRules, { id: newId(), ...input }],
    }));
  };
  const handleUpdateTransferRule = (
    id: string,
    input: NewTransferRuleInput,
  ) => {
    updateActiveScenario((s) => ({
      ...s,
      transferRules: s.transferRules.map((r) =>
        r.id === id ? { ...r, ...input } : r,
      ),
    }));
  };
  const handleRemoveTransferRule = (id: string) => {
    updateActiveScenario((s) => ({
      ...s,
      transferRules: s.transferRules.filter((r) => r.id !== id),
    }));
  };

  const handleSetGoal = (goal: Goal | null) => {
    updateActiveScenario((s) => ({ ...s, goal }));
  };

  const activeScenario =
    scenarios.find((s) => s.id === activeScenarioId) ?? scenarios[0];

  const simulationInput = useMemo<SimulationInput>(
    () => ({
      groups: activeScenario.groups,
      assetClasses: activeScenario.assetClasses,
      incomes: activeScenario.incomes,
      expenses: activeScenario.expenses,
      transferRules: activeScenario.transferRules,
      exchangeRate: activeScenario.exchangeRate,
    }),
    [activeScenario],
  );

  const snapshots = useSimulation(simulationInput, today, horizonMonths);
  const selectedSnapshot = snapshots[selectedMonth];
  const primaryAsset = activeScenario.assetClasses.find((a) => a.isPrimary);
  const assetGroups = activeScenario.groups.filter((g) =>
    activeScenario.assetClasses.some((a) => a.groupId === g.id),
  );

  return (
    <div className="h-full w-full overflow-y-auto bg-gradient-to-br from-indigo-100 via-blue-50 to-purple-100 p-4 text-gray-800">
      <div className="mx-auto max-w-[1600px] @container">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-gray-800">자산 시뮬레이터</h2>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1">
              {HORIZON_PRESET_YEARS.map((years) => (
                <button
                  key={years}
                  type="button"
                  onClick={() => handleChangeHorizon(years)}
                  className={`rounded-full px-3 py-1 text-xs ${
                    horizonYears === years
                      ? "bg-indigo-500 text-white"
                      : "bg-white/80 text-gray-600"
                  }`}
                >
                  {years}년
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-600">
              환율(1달러 = 원)
              <input
                type="number"
                min={1}
                value={activeScenario.exchangeRate}
                onChange={(e) =>
                  updateActiveScenario((s) => ({
                    ...s,
                    exchangeRate: Math.max(1, Number(e.target.value) || 1),
                  }))
                }
                className="w-24 rounded-full border border-white/60 bg-white/80 px-2 py-1 text-sm"
              />
            </label>
          </div>
        </div>

        <ScenarioTabs
          scenarios={scenarios}
          activeScenarioId={activeScenarioId}
          onSelect={handleSelectScenario}
          onRename={handleRenameScenario}
          onDelete={handleDeleteScenario}
          onDuplicate={handleDuplicateScenario}
          onCreate={handleCreateScenario}
        />

        <ScenarioComparisonChart
          scenarios={scenarios}
          today={today}
          horizonMonths={horizonMonths}
          selectedMonth={selectedMonth}
        />

        <div className="mb-4">
          <InputPanel
            key={activeScenarioId}
            groups={activeScenario.groups}
            assetGroups={assetGroups}
            onAddGroup={handleAddGroup}
            onUpdateGroup={handleUpdateGroup}
            onRemoveGroup={handleRemoveGroup}
            assetClasses={activeScenario.assetClasses}
            onAddAssetClass={handleAddAssetClass}
            onUpdateAssetClass={handleUpdateAssetClass}
            onRemoveAssetClass={handleRemoveAssetClass}
            onSetPrimaryAsset={handleSetPrimaryAsset}
            onChangeAssetColor={handleChangeAssetColor}
            incomes={activeScenario.incomes}
            onAddIncome={handleAddIncome}
            onUpdateIncome={handleUpdateIncome}
            onRemoveIncome={handleRemoveIncome}
            expenses={activeScenario.expenses}
            onAddExpense={handleAddExpense}
            onUpdateExpense={handleUpdateExpense}
            onRemoveExpense={handleRemoveExpense}
            transferRules={activeScenario.transferRules}
            onAddTransferRule={handleAddTransferRule}
            onUpdateTransferRule={handleUpdateTransferRule}
            onRemoveTransferRule={handleRemoveTransferRule}
            today={today}
            horizonMonths={horizonMonths}
            goal={activeScenario.goal}
            onSetGoal={handleSetGoal}
            simulationInput={simulationInput}
            selectedSnapshot={selectedSnapshot}
          />
        </div>

        <div className="grid gap-4 @min-[650px]:grid-cols-[minmax(280px,1fr)_minmax(180px,320px)]">
          <div className="flex flex-col gap-4">
            <AssetAreaChart
              snapshots={snapshots}
              groups={assetGroups}
              assetClasses={activeScenario.assetClasses}
              selectedMonth={selectedMonth}
              onChangeMonth={setSelectedMonth}
              today={today}
              horizonMonths={horizonMonths}
            />
            <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))]">
              <ComparisonBarChart
                snapshots={snapshots}
                groups={assetGroups}
                assetClasses={activeScenario.assetClasses}
                selectedMonth={selectedMonth}
              />
              <GroupDonutChart
                groups={assetGroups}
                assetClasses={activeScenario.assetClasses}
                snapshot={selectedSnapshot}
              />
              <FlowDiagram
                snapshot={selectedSnapshot}
                primaryAsset={primaryAsset}
                assetClasses={activeScenario.assetClasses}
                exchangeRate={activeScenario.exchangeRate}
              />
              <CashFlowChart snapshots={snapshots} selectedMonth={selectedMonth} />
            </div>
          </div>
          <HistoryPanel
            snapshots={snapshots}
            incomes={activeScenario.incomes}
            expenses={activeScenario.expenses}
            assetClasses={activeScenario.assetClasses}
            today={today}
            selectedMonth={selectedMonth}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 전체 타입체크·린트(이제 프로젝트 전체가 클린해야 함)**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음(프로젝트 전체). Task 1~4에서 남아있던 모든 "prop 누락" 에러가 이 태스크로 해소되어야 한다.

- [ ] **Step 3: Playwright 기반 골든 패스 확인(실제 dev 서버)**

`npm run dev`로 실제 `/asset-simulator` 페이지를 열고 확인한다:
1. **레이아웃**: 시나리오 탭/비교 차트 아래에 5개 입력 카드(현재 자산/수입/지출/이체규칙/목표)가 전체 폭에 걸쳐 나타나는지, 그 아래 왼쪽(넓은 영역: AssetAreaChart + 2×2 차트)과 오른쪽(누적 이력) 2열 구조인지 확인.
2. **AssetAreaChart 통합**: 차트 카드 안에 슬라이더(범위 입력)가 포함되어 있는지, 슬라이더를 움직이면 차트의 점선 커서와 다른 모든 차트/패널이 함께 갱신되는지, "현재 {금액}" 마커가 t=0 위치에 항상 표시되는지(슬라이더를 움직여도 이 마커는 고정) 확인.
3. **음수 잔액 렌더링**: 기본 계좌 잔액보다 큰 지출을 등록해 잔액이 음수가 되는 시나리오를 만들고, AssetAreaChart와 ComparisonBarChart 양쪽에서 해당 구간이 자기교차 없이 0선 아래로 자연스럽게 내려가며 rose 계열로 구별되는지 확인. FlowDiagram의 기본계좌 노드도 음수일 때 빨간색으로 바뀌는지 확인.
4. **FlowDiagram 버그 수정**: 기본계좌가 아닌 두 자산 간 이체 규칙을 만들고, 그 이체가 FlowDiagram에 기본계좌에서 나가는 것처럼 잘못 표시되지 않는지(즉, 아예 표시되지 않아야 함 — 기본계좌 중심 다이어그램이므로) 확인.
5. **회귀 확인**: 시나리오 전환/복제/삭제, 목표 설정(이제 입력 패널 안에서), 자산 색상 변경, 누적 이력 패널이 기존과 동일하게 동작하는지 확인.
6. **좁은 컨테이너 확인**: `/playground` 모달에서 열었을 때도 레이아웃이 깨지지 않는지 확인(이전 라운드에서 발견된 것과 같은 종류의 그리드 오버플로우가 재발하지 않는지 — 이번 그리드 바닥값 합은 460px+16px 갭=476px로 이전에 문제됐던 최소 폭들보다 충분히 작다).

- [ ] **Step 4: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/6_AssetSimulator/AssetSimulator.tsx
git commit -m "feat: 입력 패널을 상단으로, 슬라이더·현재자산을 AssetAreaChart로 재배치"
```

---

### Task 6: 전체 골든 패스 수동 검증

**Files:** 없음(코드 변경 없음, 검증만).

**Interfaces:** 없음.

- [ ] **Step 1: 타입 체크·린트 최종 확인**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음.

- [ ] **Step 2: 음수 잔액 시나리오 심층 확인**

지출이 수입+잔액을 초과하는 시나리오를 만들고, 여러 달에 걸쳐 잔액이 계속 음수로 유지/성장(연 수익률이 있는 경우)하는지, AssetAreaChart의 자기교차 없는 렌더링이 여러 달에 걸쳐 일관되게 유지되는지 슬라이더를 여러 지점으로 옮겨가며 확인한다. 여러 자산이 동시에 음수인 경우(예: 연 수익률을 음수로 설정한 비기본 자산)도 만들어 스택이 깨지지 않는지 확인한다.

- [ ] **Step 3: FlowDiagram 정확성 심층 확인**

기본계좌를 포함한 이체와 기본계좌를 포함하지 않는 이체를 동시에 여러 개 설정하고, FlowDiagram에 기본계좌 관련 이체만 정확히 나타나는지, 화살표 방향이 명확한지 확인한다.

- [ ] **Step 4: 레이아웃 반응형 확인**

넓은 뷰포트(1600px+)와 좁은 컨테이너(모달, 375px 모바일) 양쪽에서 입력 패널 5장 그리드, AssetAreaChart+슬라이더, 2×2 차트 그리드, 누적 이력 사이드바가 모두 겹치거나 잘리지 않는지 확인한다.

- [ ] **Step 5: 회귀 확인 — 이전 라운드 기능 전체**

시나리오 관리(전환/복제/삭제/이름변경), 자산/그룹 색상 변경, 목표 설정 및 달성 예측, 누적 이력, 시나리오 비교 차트, 온보딩 예시 데이터, 새로고침 경고(dirty tracking)가 이번 라운드 변경 이후에도 정상 동작하는지 확인한다.

이 태스크는 커밋할 코드 변경이 없다. 문제를 발견하면 해당 태스크로 돌아가 수정한다.

---
