# 자산 시뮬레이터 v3 4라운드(마무리) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** "자산군" 카드 명칭을 "현재 자산"으로 바꾸고, 입력 패널을 2단으로 분할하고, 첫 로드 시 예시 데이터로 온보딩하고, 수정 후 새로고침·창 닫기 시 경고하고, 카드 제목·빈 상태·버튼에 아이콘을 붙인다.

**Architecture:** 이번 라운드는 어떤 컴포넌트의 props 시그니처도 바꾸지 않는다 — 전부 문구·아이콘·레이아웃·`AssetSimulator.tsx` 내부 상태 추가뿐이다. 그래서 이전 라운드들과 달리 "컴파일 체크포인트"로 인한 교차 파일 에러가 발생할 여지가 없다: 모든 태스크가 항상 프로젝트 전체 기준으로 타입체크·린트가 클린해야 한다.

**Tech Stack:** Next.js 16(App Router), React 19, TypeScript, Tailwind CSS v4. 새 라이브러리 없음. 테스트 스위트 없음(CLAUDE.md).

**Spec:** [docs/superpowers/specs/2026-08-21-asset-simulator-v3-round4-design.md](../specs/2026-08-21-asset-simulator-v3-round4-design.md)

## Global Constraints

- 테스트 스위트 없음(CLAUDE.md) — 검증은 `npx tsc --noEmit` + `npm run lint` + Playwright 기반 수동 확인.
- 새 npm 의존성 추가 금지.
- **모든 태스크가 프로젝트 전체 기준으로 `npx tsc --noEmit`/`npm run lint` 클린해야 한다** — 스코프 제한(grep)이나 "이후 태스크에서 고쳐질 예정" 같은 예외가 없다. 어떤 컴포넌트의 props 시그니처도 이번 라운드에서 바뀌지 않기 때문이다.
- "그룹"(`Group` 타입, `groups` 변수명, "그룹 없음"/"새 그룹 만들기" 등 그룹 관리 UI 문구)은 이번 라운드에서 전혀 건드리지 않는다 — "자산군"→"현재 자산" 명칭 변경은 개별 계좌(`AssetClass`)를 등록하는 카드와 그 주변 문구에만 적용된다.
- 아이콘은 스펙의 표에 명시된 위치에만 붙인다 — 표에 없는 위치(리스트 개별 항목 등)에는 추가하지 않는다.
- Enter 제출 시 포커스 이동, 클릭 수정 등 기존 관례를 그대로 따른다. `react-hooks` ESLint 규칙(렌더 중 `.map()`/`.reduce()` 콜백 안에서 외부 `let` 재할당 금지)도 유지.

---

### Task 1: 자산 입력 카드 — 명칭 변경 + 아이콘 (`GroupAssetSection.tsx`)

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/input-sections/GroupAssetSection.tsx` (전체 교체)

**Interfaces:**
- Consumes: 없음(기존 props 시그니처 그대로).
- Produces: 없음 — 외부에서 관찰 가능한 인터페이스 변경 없음, 이 파일을 렌더하는 `InputPanel.tsx`는 수정할 필요 없다.

- [ ] **Step 1: `GroupAssetSection.tsx` 전체 교체**

```tsx
"use client";

import { useRef, useState } from "react";
import {
  AssetClass,
  Currency,
  GROUP_PALETTE,
  Group,
  NewAssetClassInput,
} from "../types";
import GroupPicker from "./GroupPicker";

type GroupAssetSectionProps = {
  groups: Group[];
  onAddGroup: (name: string) => string;
  onUpdateGroup: (id: string, input: { name: string; color: string }) => void;
  onRemoveGroup: (id: string) => void;
  assetClasses: AssetClass[];
  onAddAssetClass: (input: NewAssetClassInput) => void;
  onUpdateAssetClass: (id: string, input: NewAssetClassInput) => void;
  onRemoveAssetClass: (id: string) => void;
  onSetPrimaryAsset: (id: string) => void;
  onChangeAssetColor: (id: string, color: string) => void;
};

export default function GroupAssetSection({
  groups,
  onAddGroup,
  onUpdateGroup,
  onRemoveGroup,
  assetClasses,
  onAddAssetClass,
  onUpdateAssetClass,
  onRemoveAssetClass,
  onSetPrimaryAsset,
  onChangeAssetColor,
}: GroupAssetSectionProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [groupId, setGroupId] = useState("");
  const [currency, setCurrency] = useState<Currency>("KRW");
  const [balance, setBalance] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [returnRate, setReturnRate] = useState("0");
  const [makePrimary, setMakePrimary] = useState(false);
  const [colorPickerId, setColorPickerId] = useState<string | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setGroupId("");
    setCurrency("KRW");
    setBalance("");
    setReturnRate("0");
    setMakePrimary(false);
  };

  const startEdit = (asset: AssetClass) => {
    setEditingId(asset.id);
    setName(asset.name);
    setGroupId(asset.groupId ?? "");
    setCurrency(asset.currency);
    setBalance(String(asset.initialBalance));
    setReturnRate(String(asset.annualReturnRate));
    setMakePrimary(asset.isPrimary);
    setShowAdvanced(asset.annualReturnRate !== 0);
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      nameRef.current?.focus();
      return;
    }
    const input: NewAssetClassInput = {
      name: name.trim(),
      groupId: groupId || undefined,
      currency,
      initialBalance: Number(balance) || 0,
      annualReturnRate: Number(returnRate) || 0,
      isPrimary: currency === "KRW" && makePrimary,
    };
    if (editingId) {
      onUpdateAssetClass(editingId, input);
    } else {
      onAddAssetClass(input);
    }
    resetForm();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="rounded-2xl border border-indigo-200 bg-white/70 p-4 backdrop-blur">
      <h3 className="text-sm font-semibold text-indigo-700">🏦 현재 자산</h3>
      <ul className="mt-2 flex flex-col gap-2">
        {assetClasses.map((asset) => {
          const group = groups.find((g) => g.id === asset.groupId);
          return (
            <li
              key={asset.id}
              className="flex flex-col gap-1.5 rounded-xl border border-indigo-100 bg-white/80 px-3 py-2 text-sm hover:border-indigo-300"
            >
              <div
                onClick={() => startEdit(asset)}
                className="flex cursor-pointer items-center justify-between"
              >
                <span className="flex flex-1 items-center gap-2">
                  <input
                    type="radio"
                    name="primary-asset"
                    checked={asset.isPrimary}
                    disabled={asset.currency === "USD"}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => onSetPrimaryAsset(asset.id)}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setColorPickerId((prev) =>
                        prev === asset.id ? null : asset.id,
                      );
                    }}
                    className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
                    style={{ backgroundColor: asset.color }}
                    aria-label="자산 색상 변경"
                  />
                  {group && (
                    <span
                      className="h-2.5 w-2.5 rounded-full ring-2 ring-white"
                      style={{ backgroundColor: group.color }}
                    />
                  )}
                  <span>{asset.name}</span>
                  <span className="text-gray-400">
                    {asset.currency === "USD"
                      ? `$${asset.initialBalance.toLocaleString()}`
                      : `${asset.initialBalance.toLocaleString()}원`}
                  </span>
                  {asset.isPrimary && (
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-600">
                      기본 계좌
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveAssetClass(asset.id);
                  }}
                  className="text-gray-400 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              {colorPickerId === asset.id && (
                <div className="flex flex-wrap gap-1.5 pl-6">
                  {GROUP_PALETTE.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onChangeAssetColor(asset.id, color);
                        setColorPickerId(null);
                      }}
                      className="h-5 w-5 rounded-full ring-1 ring-black/10"
                      style={{ backgroundColor: color }}
                      aria-label={`색상 ${color}로 변경`}
                    />
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex flex-col gap-2" onKeyDown={handleKeyDown}>
        <div className="flex gap-2">
          <input
            ref={nameRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="자산 이름"
            className="flex-1 rounded-full border border-indigo-200 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-indigo-400"
          />
          <GroupPicker
            groups={groups}
            value={groupId}
            onChange={setGroupId}
            onCreateGroup={onAddGroup}
            onUpdateGroup={onUpdateGroup}
            onRemoveGroup={onRemoveGroup}
          />
        </div>
        <div className="flex gap-2">
          <select
            value={currency}
            onChange={(e) => {
              const next = e.target.value as Currency;
              setCurrency(next);
              if (next === "USD") setMakePrimary(false);
            }}
            className="rounded-full border border-indigo-200 bg-white/80 px-3 py-1.5 text-sm"
          >
            <option value="KRW">KRW(원)</option>
            <option value="USD">USD(달러)</option>
          </select>
          <input
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            type="number"
            placeholder="현재 잔액"
            className="flex-1 rounded-full border border-indigo-200 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-indigo-400"
          />
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={makePrimary}
            disabled={currency === "USD"}
            onChange={(e) => setMakePrimary(e.target.checked)}
          />
          기본 계좌로 지정{currency === "USD" && " (KRW 자산만 가능)"}
        </label>
        <button
          type="button"
          onClick={() => setShowAdvanced((prev) => !prev)}
          className="self-start text-xs text-indigo-500 hover:text-indigo-700"
        >
          {showAdvanced ? "상세 옵션 숨기기" : "상세 옵션 보기"}
        </button>
        {showAdvanced && (
          <label className="flex items-center gap-2 text-xs text-gray-600">
            연 수익률(%)
            <input
              value={returnRate}
              onChange={(e) => setReturnRate(e.target.value)}
              type="number"
              className="w-20 rounded-full border border-indigo-200 bg-white/80 px-2 py-1"
            />
          </label>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSubmit}
            className="self-start rounded-full bg-indigo-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-600"
          >
            {editingId ? "저장" : "➕ 자산 추가"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="self-start rounded-full px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              취소
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 전체 타입체크·린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음(프로젝트 전체).

- [ ] **Step 3: Playwright 기반 수동 확인(실제 dev 서버)**

`npm run dev`로 `/asset-simulator`를 열고 확인: (1) 카드 제목이 "🏦 현재 자산"으로 보이는지, (2) 이름 입력창 placeholder가 "자산 이름"인지, (3) 추가 버튼이 "➕ 자산 추가"인지, 자산을 하나 추가한 뒤 그 행을 클릭해 수정 모드로 들어가면 버튼이 (아이콘 없이) "저장"으로 바뀌는지.

- [ ] **Step 4: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/6_AssetSimulator/input-sections/GroupAssetSection.tsx
git commit -m "feat: 자산 입력 카드 명칭을 현재 자산으로 변경하고 아이콘 추가"
```

---

### Task 2: 차트 5종 — 명칭 변경 + 아이콘 (`AssetAreaChart`, `ComparisonBarChart`, `GroupDonutChart`, `FlowDiagram`, `CashFlowChart`)

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/AssetAreaChart.tsx` (전체 교체)
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/ComparisonBarChart.tsx` (전체 교체)
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/GroupDonutChart.tsx` (전체 교체)
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/FlowDiagram.tsx` (전체 교체)
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/CashFlowChart.tsx` (전체 교체)

**Interfaces:**
- Consumes: 없음(다섯 컴포넌트 모두 기존 props 시그니처 그대로).
- Produces: 없음 — `AssetSimulator.tsx`의 이 다섯 컴포넌트 호출부는 수정할 필요 없다.

- [ ] **Step 1: `AssetAreaChart.tsx` 전체 교체**

```tsx
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
```

- [ ] **Step 2: `ComparisonBarChart.tsx` 전체 교체**

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
        const y = BASE_Y - acc.cursor - height;
        const group = groups.find((g) => g.id === asset.groupId);
        return {
          cursor: acc.cursor + height,
          segments: [
            ...acc.segments,
            {
              id: asset.id,
              name: asset.name,
              fill: asset.color,
              stroke: group?.color,
              y,
              height,
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
            height={Math.max(0, seg.height)}
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
            height={Math.max(0, seg.height)}
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

- [ ] **Step 3: `GroupDonutChart.tsx` 전체 교체**

```tsx
"use client";

import { useState } from "react";
import {
  AssetClass,
  Group,
  MonthSnapshot,
  UNGROUPED_LABEL,
  formatKRW,
} from "./types";

type GroupDonutChartProps = {
  groups: Group[];
  assetClasses: AssetClass[];
  snapshot: MonthSnapshot;
};

type Slice = {
  id: string;
  name: string;
  amount: number;
  ratio: number;
  color: string;
  dashArray: string;
  dashOffset: number;
};

const SIZE = 160;
const STROKE = 24;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const UNGROUPED_TAB_ID = "__ungrouped__";

export default function GroupDonutChart({
  groups,
  assetClasses,
  snapshot,
}: GroupDonutChartProps) {
  const hasUngrouped = assetClasses.some((a) => !a.groupId);
  const tabs = [
    ...groups.map((g) => ({ id: g.id, name: g.name })),
    ...(hasUngrouped ? [{ id: UNGROUPED_TAB_ID, name: UNGROUPED_LABEL }] : []),
  ];

  const [selectedTabId, setSelectedTabId] = useState(tabs[0]?.id ?? "");
  const activeTabId = tabs.some((t) => t.id === selectedTabId)
    ? selectedTabId
    : tabs[0]?.id;

  if (!activeTabId) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-2xl border border-white/40 bg-white/70 text-sm text-gray-400 backdrop-blur">
        📭 자산을 추가하면 비율이 나타납니다
      </div>
    );
  }

  const assetsInTab =
    activeTabId === UNGROUPED_TAB_ID
      ? assetClasses.filter((a) => !a.groupId)
      : assetClasses.filter((a) => a.groupId === activeTabId);
  const tabTotal =
    activeTabId === UNGROUPED_TAB_ID
      ? snapshot.ungroupedTotalKRW
      : (snapshot.groupTotals[activeTabId] ?? 0);

  const { items: slices } = assetsInTab.reduce<{
    offset: number;
    items: Slice[];
  }>(
    (acc, asset) => {
      const amount = snapshot.assetBalancesKRW[asset.id] ?? 0;
      const ratio = tabTotal > 0 ? amount / tabTotal : 0;
      const dash = ratio * CIRCUMFERENCE;
      const slice: Slice = {
        id: asset.id,
        name: asset.name,
        amount,
        ratio,
        color: asset.color,
        dashArray: `${dash} ${CIRCUMFERENCE - dash}`,
        dashOffset: -acc.offset,
      };
      return { offset: acc.offset + dash, items: [...acc.items, slice] };
    },
    { offset: 0, items: [] },
  );

  return (
    <div className="rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
      <p className="text-sm text-gray-500">🥧 그룹별 비율</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSelectedTabId(tab.id)}
            className={`rounded-full px-3 py-1 text-xs ${
              tab.id === activeTabId
                ? "bg-indigo-500 text-white"
                : "bg-white/80 text-gray-600"
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-4">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
            {assetsInTab.length === 0 ? (
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
                />
              ))
            )}
          </g>
        </svg>
        <ul className="flex flex-col gap-1 text-sm">
          {slices.map((slice) => (
            <li key={slice.id} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              {slice.name} · {Math.round(slice.ratio * 100)}% ·{" "}
              {formatKRW(slice.amount)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: `FlowDiagram.tsx` 전체 교체**

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
```

- [ ] **Step 5: `CashFlowChart.tsx` 전체 교체**

```tsx
"use client";

import { MonthSnapshot, formatKRW } from "./types";

type CashFlowChartProps = {
  snapshots: MonthSnapshot[];
  selectedMonth: number;
};

const WIDTH = 600;
const HEIGHT = 220;
const PADDING = 12;
const BASELINE_Y = HEIGHT / 2;

export default function CashFlowChart({
  snapshots,
  selectedMonth,
}: CashFlowChartProps) {
  if (snapshots.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-2xl border border-white/40 bg-white/70 text-sm text-gray-400 backdrop-blur">
        📭 시뮬레이션을 시작하면 그래프가 나타납니다
      </div>
    );
  }

  const maxFlow = Math.max(
    1,
    ...snapshots.map((s) => Math.max(s.flow.incomeIn, s.flow.expenseOut)),
  );
  const stepX = (WIDTH - PADDING * 2) / (snapshots.length - 1);
  const halfHeight = HEIGHT / 2 - PADDING;
  const barWidth = Math.max(1, stepX * 0.7);
  const scaleFlow = (value: number) => (value / maxFlow) * halfHeight;

  const netPoints = snapshots
    .map((snapshot, i) => {
      const net = snapshot.flow.incomeIn - snapshot.flow.expenseOut;
      const y = BASELINE_Y - scaleFlow(net);
      return `${PADDING + i * stepX},${y}`;
    })
    .join(" ");

  const cursorX = PADDING + selectedMonth * stepX;
  const selected = snapshots[selectedMonth];
  const netAmount =
    (selected?.flow.incomeIn ?? 0) - (selected?.flow.expenseOut ?? 0);

  return (
    <div className="rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
      <p className="text-sm text-gray-500">
        💹 선택 시점 순수입{" "}
        <span className="text-lg font-semibold text-gray-800">
          {formatKRW(netAmount)}
        </span>
      </p>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="mt-2 w-full">
        <line
          x1={PADDING}
          y1={BASELINE_Y}
          x2={WIDTH - PADDING}
          y2={BASELINE_Y}
          stroke="#d1d5db"
          strokeWidth={1}
        />
        {snapshots.map((snapshot, i) => {
          const x = PADDING + i * stepX - barWidth / 2;
          const incomeHeight = scaleFlow(snapshot.flow.incomeIn);
          const expenseHeight = scaleFlow(snapshot.flow.expenseOut);
          return (
            <g key={snapshot.monthIndex}>
              <rect
                x={x}
                y={BASELINE_Y - incomeHeight}
                width={barWidth}
                height={incomeHeight}
                fill="#10b981"
                fillOpacity={0.7}
              />
              <rect
                x={x}
                y={BASELINE_Y}
                width={barWidth}
                height={expenseHeight}
                fill="#f43f5e"
                fillOpacity={0.7}
              />
            </g>
          );
        })}
        <polyline
          points={netPoints}
          fill="none"
          stroke="#1f2937"
          strokeWidth={1.5}
        />
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
      <div className="mt-2 flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          수입
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
          지출
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-gray-800" />
          순수입
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: 전체 타입체크·린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음(프로젝트 전체).

- [ ] **Step 7: Playwright 기반 수동 확인(실제 dev 서버)**

`npm run dev`로 `/asset-simulator`에서 확인: 자산을 하나도 안 만든 상태에서 AssetAreaChart/ComparisonBarChart/GroupDonutChart가 각각 "📭 자산을 추가하면 ~"로 시작하는 빈 상태 메시지를 보이는지, 기본 계좌를 지정하지 않은 상태에서 FlowDiagram이 "📭 기본 계좌를 지정하면 흐름도가 나타납니다"를 보이는지. 자산·수입·지출을 입력한 뒤 다섯 차트 제목에 각각 📈/📊/🥧/🌊/💹 아이콘이 붙어 있는지.

- [ ] **Step 8: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/6_AssetSimulator/AssetAreaChart.tsx app/\(portfolio\)/playground/_sections/Works/6_AssetSimulator/ComparisonBarChart.tsx app/\(portfolio\)/playground/_sections/Works/6_AssetSimulator/GroupDonutChart.tsx app/\(portfolio\)/playground/_sections/Works/6_AssetSimulator/FlowDiagram.tsx app/\(portfolio\)/playground/_sections/Works/6_AssetSimulator/CashFlowChart.tsx
git commit -m "feat: 차트 5종에 명칭 변경 및 아이콘 반영"
```

---

### Task 3: 입력 폼 3종 — 명칭 변경 + 아이콘 (`IncomeSection`, `ExpenseSection`, `TransferRuleSection`)

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/input-sections/IncomeSection.tsx` (전체 교체)
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/input-sections/ExpenseSection.tsx` (전체 교체)
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/input-sections/TransferRuleSection.tsx` (전체 교체)

**Interfaces:**
- Consumes: 없음(세 컴포넌트 모두 기존 props 시그니처 그대로).
- Produces: 없음.

- [ ] **Step 1: `IncomeSection.tsx` 전체 교체**

```tsx
"use client";

import { useRef, useState } from "react";
import {
  Group,
  IncomeItem,
  NewIncomeItemInput,
  RepeatSchedule,
  addMonths,
  toMonthInputValue,
} from "../types";
import { validateSchedule } from "../simulation";
import GroupPicker from "./GroupPicker";
import ScheduleEditor from "./ScheduleEditor";

type IncomeSectionProps = {
  groups: Group[];
  onAddGroup: (name: string) => string;
  onUpdateGroup: (id: string, input: { name: string; color: string }) => void;
  onRemoveGroup: (id: string) => void;
  incomes: IncomeItem[];
  onAddIncome: (input: NewIncomeItemInput) => void;
  onUpdateIncome: (id: string, input: NewIncomeItemInput) => void;
  onRemoveIncome: (id: string) => void;
  today: Date;
  horizonMonths: number;
};

function defaultSchedule(today: Date): RepeatSchedule {
  return {
    mode: "recurring",
    startDate: toMonthInputValue(addMonths(today, 1)),
    frequency: "monthly",
    until: { type: "indefinite" },
  };
}

function scheduleSummary(schedule: RepeatSchedule): string {
  if (schedule.mode === "once") return `${schedule.date} · 1회성`;
  const freq = schedule.frequency === "monthly" ? "매월" : "매년";
  if (schedule.until.type === "indefinite") return `${freq} · 무기한`;
  if (schedule.until.type === "count")
    return `${freq} · ${schedule.until.count}회`;
  return `${freq} · ${schedule.until.date}까지`;
}

export default function IncomeSection({
  groups,
  onAddGroup,
  onUpdateGroup,
  onRemoveGroup,
  incomes,
  onAddIncome,
  onUpdateIncome,
  onRemoveIncome,
  today,
  horizonMonths,
}: IncomeSectionProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [groupId, setGroupId] = useState("");
  const [schedule, setSchedule] = useState<RepeatSchedule>(
    defaultSchedule(today),
  );
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setAmount("");
    setGroupId("");
    setSchedule(defaultSchedule(today));
    setError(null);
  };

  const startEdit = (item: IncomeItem) => {
    setEditingId(item.id);
    setName(item.name);
    setAmount(String(item.amount));
    setGroupId(item.groupId ?? "");
    setSchedule(item.schedule);
    setError(null);
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      nameRef.current?.focus();
      return;
    }
    if (!amount || Number(amount) === 0) {
      amountRef.current?.focus();
      return;
    }
    const scheduleError = validateSchedule(schedule, today, horizonMonths);
    if (scheduleError) {
      setError(scheduleError);
      return;
    }
    setError(null);
    const input: NewIncomeItemInput = {
      name: name.trim(),
      amount: Number(amount),
      groupId: groupId || undefined,
      schedule,
    };
    if (editingId) {
      onUpdateIncome(editingId, input);
    } else {
      onAddIncome(input);
    }
    resetForm();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="rounded-2xl border border-emerald-200 bg-white/70 p-4 backdrop-blur">
      <h3 className="text-sm font-semibold text-emerald-700">💵 수입</h3>
      <ul className="mt-2 flex flex-col gap-2">
        {incomes.map((item) => {
          const group = groups.find((g) => g.id === item.groupId);
          return (
            <li
              key={item.id}
              onClick={() => startEdit(item)}
              className="flex cursor-pointer items-center justify-between rounded-xl border border-emerald-100 bg-white/80 px-3 py-2 text-sm hover:border-emerald-300"
            >
              <span className="flex items-center gap-2">
                {group && (
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: group.color }}
                  />
                )}
                {item.name} · {item.amount.toLocaleString()}원 ·{" "}
                {scheduleSummary(item.schedule)}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveIncome(item.id);
                }}
                className="text-gray-400 hover:text-gray-700"
              >
                ✕
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex flex-col gap-2" onKeyDown={handleKeyDown}>
        <div className="flex gap-2">
          <input
            ref={nameRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 월급, 프리랜서 계약금"
            className="flex-1 rounded-full border border-emerald-200 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-emerald-400"
          />
          <GroupPicker
            groups={groups}
            value={groupId}
            onChange={setGroupId}
            onCreateGroup={onAddGroup}
            onUpdateGroup={onUpdateGroup}
            onRemoveGroup={onRemoveGroup}
          />
        </div>
        <input
          ref={amountRef}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          type="number"
          placeholder="금액"
          className="rounded-full border border-emerald-200 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-emerald-400"
        />
        <ScheduleEditor value={schedule} onChange={setSchedule} today={today} />
        {error && <p className="text-xs text-rose-500">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSubmit}
            className="self-start rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-600"
          >
            {editingId ? "저장" : "➕ 추가"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="self-start rounded-full px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              취소
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `ExpenseSection.tsx` 전체 교체**

```tsx
"use client";

import { useRef, useState } from "react";
import {
  ExpenseItem,
  Group,
  NewExpenseItemInput,
  RepeatSchedule,
  addMonths,
  toMonthInputValue,
} from "../types";
import { validateSchedule } from "../simulation";
import GroupPicker from "./GroupPicker";
import ScheduleEditor from "./ScheduleEditor";

type ExpenseSectionProps = {
  groups: Group[];
  onAddGroup: (name: string) => string;
  onUpdateGroup: (id: string, input: { name: string; color: string }) => void;
  onRemoveGroup: (id: string) => void;
  expenses: ExpenseItem[];
  onAddExpense: (input: NewExpenseItemInput) => void;
  onUpdateExpense: (id: string, input: NewExpenseItemInput) => void;
  onRemoveExpense: (id: string) => void;
  today: Date;
  horizonMonths: number;
};

function defaultSchedule(today: Date): RepeatSchedule {
  return {
    mode: "recurring",
    startDate: toMonthInputValue(addMonths(today, 1)),
    frequency: "monthly",
    until: { type: "indefinite" },
  };
}

function scheduleSummary(schedule: RepeatSchedule): string {
  if (schedule.mode === "once") return `${schedule.date} · 1회성`;
  const freq = schedule.frequency === "monthly" ? "매월" : "매년";
  if (schedule.until.type === "indefinite") return `${freq} · 무기한`;
  if (schedule.until.type === "count")
    return `${freq} · ${schedule.until.count}회`;
  return `${freq} · ${schedule.until.date}까지`;
}

export default function ExpenseSection({
  groups,
  onAddGroup,
  onUpdateGroup,
  onRemoveGroup,
  expenses,
  onAddExpense,
  onUpdateExpense,
  onRemoveExpense,
  today,
  horizonMonths,
}: ExpenseSectionProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [groupId, setGroupId] = useState("");
  const [schedule, setSchedule] = useState<RepeatSchedule>(
    defaultSchedule(today),
  );
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setAmount("");
    setGroupId("");
    setSchedule(defaultSchedule(today));
    setError(null);
  };

  const startEdit = (item: ExpenseItem) => {
    setEditingId(item.id);
    setName(item.name);
    setAmount(String(item.amount));
    setGroupId(item.groupId ?? "");
    setSchedule(item.schedule);
    setError(null);
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      nameRef.current?.focus();
      return;
    }
    if (!amount || Number(amount) === 0) {
      amountRef.current?.focus();
      return;
    }
    const scheduleError = validateSchedule(schedule, today, horizonMonths);
    if (scheduleError) {
      setError(scheduleError);
      return;
    }
    setError(null);
    const input: NewExpenseItemInput = {
      name: name.trim(),
      amount: Number(amount),
      groupId: groupId || undefined,
      schedule,
    };
    if (editingId) {
      onUpdateExpense(editingId, input);
    } else {
      onAddExpense(input);
    }
    resetForm();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="rounded-2xl border border-rose-200 bg-white/70 p-4 backdrop-blur">
      <h3 className="text-sm font-semibold text-rose-700">💸 지출</h3>
      <ul className="mt-2 flex flex-col gap-2">
        {expenses.map((item) => {
          const group = groups.find((g) => g.id === item.groupId);
          return (
            <li
              key={item.id}
              onClick={() => startEdit(item)}
              className="flex cursor-pointer items-center justify-between rounded-xl border border-rose-100 bg-white/80 px-3 py-2 text-sm hover:border-rose-300"
            >
              <span className="flex items-center gap-2">
                {group && (
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: group.color }}
                  />
                )}
                {item.name} · {item.amount.toLocaleString()}원 ·{" "}
                {scheduleSummary(item.schedule)}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveExpense(item.id);
                }}
                className="text-gray-400 hover:text-gray-700"
              >
                ✕
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex flex-col gap-2" onKeyDown={handleKeyDown}>
        <div className="flex gap-2">
          <input
            ref={nameRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 월세, 여행"
            className="flex-1 rounded-full border border-rose-200 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-rose-400"
          />
          <GroupPicker
            groups={groups}
            value={groupId}
            onChange={setGroupId}
            onCreateGroup={onAddGroup}
            onUpdateGroup={onUpdateGroup}
            onRemoveGroup={onRemoveGroup}
          />
        </div>
        <input
          ref={amountRef}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          type="number"
          placeholder="금액"
          className="rounded-full border border-rose-200 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-rose-400"
        />
        <ScheduleEditor value={schedule} onChange={setSchedule} today={today} />
        {error && <p className="text-xs text-rose-500">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSubmit}
            className="self-start rounded-full bg-rose-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-rose-600"
          >
            {editingId ? "저장" : "➕ 추가"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="self-start rounded-full px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              취소
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: `TransferRuleSection.tsx` 전체 교체**

```tsx
"use client";

import { useRef, useState } from "react";
import {
  AssetClass,
  NewTransferRuleInput,
  RepeatSchedule,
  TransferMode,
  TransferRule,
  addMonths,
  toMonthInputValue,
} from "../types";
import { validateSchedule } from "../simulation";
import ScheduleEditor from "./ScheduleEditor";

type TransferRuleSectionProps = {
  assetClasses: AssetClass[];
  transferRules: TransferRule[];
  onAddTransferRule: (input: NewTransferRuleInput) => void;
  onUpdateTransferRule: (id: string, input: NewTransferRuleInput) => void;
  onRemoveTransferRule: (id: string) => void;
  today: Date;
  horizonMonths: number;
};

function defaultSchedule(today: Date): RepeatSchedule {
  return {
    mode: "recurring",
    startDate: toMonthInputValue(addMonths(today, 1)),
    frequency: "monthly",
    until: { type: "indefinite" },
  };
}

function scheduleSummary(schedule: RepeatSchedule): string {
  if (schedule.mode === "once") return `${schedule.date} · 1회성`;
  const freq = schedule.frequency === "monthly" ? "매월" : "매년";
  if (schedule.until.type === "indefinite") return `${freq} · 무기한`;
  if (schedule.until.type === "count")
    return `${freq} · ${schedule.until.count}회`;
  return `${freq} · ${schedule.until.date}까지`;
}

export default function TransferRuleSection({
  assetClasses,
  transferRules,
  onAddTransferRule,
  onUpdateTransferRule,
  onRemoveTransferRule,
  today,
  horizonMonths,
}: TransferRuleSectionProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fromAssetId, setFromAssetId] = useState("");
  const [toAssetId, setToAssetId] = useState("");
  const [mode, setMode] = useState<TransferMode>("fixed");
  const [amount, setAmount] = useState("");
  const [schedule, setSchedule] = useState<RepeatSchedule>(
    defaultSchedule(today),
  );
  const [error, setError] = useState<string | null>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  const nameOf = (id: string) =>
    assetClasses.find((a) => a.id === id)?.name ?? "?";

  const effectiveFrom = fromAssetId || assetClasses[0]?.id || "";
  const fromAsset = assetClasses.find((a) => a.id === effectiveFrom);
  const sameCurrencyAssets = assetClasses.filter(
    (a) => a.id !== effectiveFrom && a.currency === fromAsset?.currency,
  );
  const effectiveTo =
    toAssetId && sameCurrencyAssets.some((a) => a.id === toAssetId)
      ? toAssetId
      : sameCurrencyAssets[0]?.id || "";

  const resetForm = () => {
    setEditingId(null);
    setFromAssetId("");
    setToAssetId("");
    setMode("fixed");
    setAmount("");
    setSchedule(defaultSchedule(today));
    setError(null);
  };

  const startEdit = (rule: TransferRule) => {
    setEditingId(rule.id);
    setFromAssetId(rule.fromAssetId);
    setToAssetId(rule.toAssetId);
    setMode(rule.mode);
    setAmount(String(rule.amount));
    setSchedule(rule.schedule);
    setError(null);
  };

  const handleSubmit = () => {
    if (!effectiveFrom || !effectiveTo || effectiveFrom === effectiveTo) {
      setError("이체할 수 있는 같은 통화의 자산이 2개 이상 필요합니다.");
      return;
    }
    if (!amount || Number(amount) === 0) {
      amountRef.current?.focus();
      return;
    }
    const scheduleError = validateSchedule(schedule, today, horizonMonths);
    if (scheduleError) {
      setError(scheduleError);
      return;
    }
    setError(null);
    const input: NewTransferRuleInput = {
      fromAssetId: effectiveFrom,
      toAssetId: effectiveTo,
      mode,
      amount: Number(amount),
      schedule,
    };
    if (editingId) {
      onUpdateTransferRule(editingId, input);
    } else {
      onAddTransferRule(input);
    }
    resetForm();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="rounded-2xl border border-amber-200 bg-white/70 p-4 backdrop-blur">
      <h3 className="text-sm font-semibold text-amber-700">🔁 이체 규칙</h3>
      <ul className="mt-2 flex flex-col gap-2">
        {transferRules.map((rule) => (
          <li
            key={rule.id}
            onClick={() => startEdit(rule)}
            className="flex cursor-pointer items-center justify-between rounded-xl border border-amber-100 bg-white/80 px-3 py-2 text-sm hover:border-amber-300"
          >
            <span>
              {nameOf(rule.fromAssetId)} → {nameOf(rule.toAssetId)} ·{" "}
              {rule.mode === "fixed"
                ? `${rule.amount.toLocaleString()}원`
                : `${rule.amount}%`}{" "}
              · {scheduleSummary(rule.schedule)}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveTransferRule(rule.id);
              }}
              className="text-gray-400 hover:text-gray-700"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-col gap-2" onKeyDown={handleKeyDown}>
        <div className="flex items-center gap-2">
          <select
            value={effectiveFrom}
            onChange={(e) => {
              setFromAssetId(e.target.value);
              setToAssetId("");
            }}
            className="flex-1 rounded-full border border-amber-200 bg-white/80 px-3 py-1.5 text-sm"
          >
            {assetClasses.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name}({asset.currency})
              </option>
            ))}
          </select>
          <span className="text-gray-400">→</span>
          <select
            value={effectiveTo}
            onChange={(e) => setToAssetId(e.target.value)}
            className="flex-1 rounded-full border border-amber-200 bg-white/80 px-3 py-1.5 text-sm"
            disabled={sameCurrencyAssets.length === 0}
          >
            {sameCurrencyAssets.length === 0 && (
              <option value="">같은 통화 자산이 없습니다</option>
            )}
            {sameCurrencyAssets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name}({asset.currency})
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as TransferMode)}
            className="rounded-full border border-amber-200 bg-white/80 px-3 py-1.5 text-sm"
          >
            <option value="fixed">고정 금액</option>
            <option value="percentOfSource">출발 잔액 비율(%)</option>
          </select>
          <input
            ref={amountRef}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            placeholder={mode === "fixed" ? "금액" : "%"}
            className="w-24 rounded-full border border-amber-200 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-amber-400"
          />
        </div>
        <ScheduleEditor value={schedule} onChange={setSchedule} today={today} />
        {error && <p className="text-xs text-rose-500">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={sameCurrencyAssets.length === 0}
            className="self-start rounded-full bg-amber-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {editingId ? "저장" : "➕ 이체 규칙 추가"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="self-start rounded-full px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              취소
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 전체 타입체크·린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음(프로젝트 전체).

- [ ] **Step 5: Playwright 기반 수동 확인(실제 dev 서버)**

`npm run dev`로 `/asset-simulator`에서 확인: 세 카드 제목이 각각 "💵 수입"/"💸 지출"/"🔁 이체 규칙"인지, 추가 버튼이 "➕ 추가"/"➕ 추가"/"➕ 이체 규칙 추가"인지, 각 항목을 클릭해 수정 모드로 들어가면 버튼이 (아이콘 없이) "저장"으로 바뀌는지. 이체 규칙에서 자산이 1개뿐일 때 오른쪽 select에 "같은 통화 자산이 없습니다"가 보이는지.

- [ ] **Step 6: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/6_AssetSimulator/input-sections/IncomeSection.tsx app/\(portfolio\)/playground/_sections/Works/6_AssetSimulator/input-sections/ExpenseSection.tsx app/\(portfolio\)/playground/_sections/Works/6_AssetSimulator/input-sections/TransferRuleSection.tsx
git commit -m "feat: 수입·지출·이체 규칙 입력 폼에 명칭 변경 및 아이콘 반영"
```

---

### Task 4: 나머지 카드 4종 — 아이콘 (`GoalCard`, `HistoryPanel`, `ScenarioTabs`, `ScenarioComparisonChart`)

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/GoalCard.tsx` (전체 교체)
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/HistoryPanel.tsx` (전체 교체)
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/ScenarioTabs.tsx` (전체 교체)
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/ScenarioComparisonChart.tsx` (전체 교체)

**Interfaces:**
- Consumes: 없음(네 컴포넌트 모두 기존 props 시그니처 그대로).
- Produces: 없음.

- [ ] **Step 1: `GoalCard.tsx` 전체 교체**

```tsx
"use client";

import { useMemo, useState } from "react";
import {
  AssetClass,
  Goal,
  GoalMetric,
  Group,
  MonthSnapshot,
  SimulationInput,
  formatMonthsFromNow,
} from "./types";
import { findGoalAchievementMonth } from "./simulation";

type GoalCardProps = {
  goal: Goal | null;
  onSetGoal: (goal: Goal | null) => void;
  assetClasses: AssetClass[];
  groups: Group[];
  simulationInput: SimulationInput;
  today: Date;
  selectedSnapshot: MonthSnapshot;
};

type MetricType = GoalMetric["type"];

function metricValueFromSnapshot(
  metric: GoalMetric,
  snapshot: MonthSnapshot,
): number {
  if (metric.type === "total") return snapshot.totalBalance;
  if (metric.type === "asset") {
    return snapshot.assetBalancesKRW[metric.assetId] ?? 0;
  }
  return snapshot.groupTotals[metric.groupId] ?? 0;
}

function formatAchievementDate(monthIndex: number, today: Date): string {
  const date = new Date(
    today.getFullYear(),
    today.getMonth() + monthIndex,
    1,
  );
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function GoalCard({
  goal,
  onSetGoal,
  assetClasses,
  groups,
  simulationInput,
  today,
  selectedSnapshot,
}: GoalCardProps) {
  const [metricType, setMetricType] = useState<MetricType>("total");
  const [targetId, setTargetId] = useState("");
  const [amount, setAmount] = useState("");
  const [syncedGoal, setSyncedGoal] = useState<Goal | null>(null);

  // Adjust state during render when `goal` changes, instead of in an
  // effect (avoids the cascading-render anti-pattern for prop-driven
  // state sync; see https://react.dev/learn/you-might-not-need-an-effect).
  if (goal !== syncedGoal) {
    setSyncedGoal(goal);
    if (goal) {
      setMetricType(goal.metric.type);
      setTargetId(
        goal.metric.type === "asset"
          ? goal.metric.assetId
          : goal.metric.type === "group"
            ? goal.metric.groupId
            : "",
      );
      setAmount(String(goal.targetAmount));
    } else {
      setMetricType("total");
      setTargetId("");
      setAmount("");
    }
  } else if (
    // Invalidate a stale targetId if the asset/group it points at no
    // longer exists (e.g. deleted elsewhere while this form was left
    // unsubmitted). Render-time check for the same reason as the sync
    // above — this file avoids useEffect for prop-driven state sync.
    // Only runs when `goal` did NOT just change this render: when it did,
    // the branch above already set a targetId that is valid by
    // construction against the current assetClasses/groups, so re-checking
    // it here against the (still-stale, pre-render) local targetId/metricType
    // would incorrectly clobber what was just set.
    targetId &&
    ((metricType === "asset" &&
      !assetClasses.some((a) => a.id === targetId)) ||
      (metricType === "group" && !groups.some((g) => g.id === targetId)))
  ) {
    setTargetId("");
  }

  const achievementMonth = useMemo(() => {
    if (!goal) return undefined;
    return findGoalAchievementMonth(simulationInput, goal, today);
  }, [goal, simulationInput, today]);

  const handleSubmit = () => {
    const targetAmount = Number(amount);
    if (!targetAmount || targetAmount <= 0) return;
    let metric: GoalMetric;
    if (metricType === "total") {
      metric = { type: "total" };
    } else if (metricType === "asset") {
      if (!targetId || !assetClasses.some((a) => a.id === targetId)) return;
      metric = { type: "asset", assetId: targetId };
    } else {
      if (!targetId || !groups.some((g) => g.id === targetId)) return;
      metric = { type: "group", groupId: targetId };
    }
    onSetGoal({ metric, targetAmount });
  };

  const handleClear = () => {
    onSetGoal(null);
    setMetricType("total");
    setTargetId("");
    setAmount("");
  };

  const currentValue = goal
    ? metricValueFromSnapshot(goal.metric, selectedSnapshot)
    : 0;
  const progressRatio =
    goal && goal.targetAmount > 0 ? currentValue / goal.targetAmount : 0;

  return (
    <div className="rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
      <h3 className="text-sm font-semibold text-gray-700">🎯 목표</h3>
      <div className="mt-2 flex flex-col gap-2">
        <div className="flex gap-2">
          <select
            value={metricType}
            onChange={(e) => {
              setMetricType(e.target.value as MetricType);
              setTargetId("");
            }}
            className="rounded-full border border-gray-200 bg-white/80 px-3 py-1.5 text-sm"
          >
            <option value="total">총자산</option>
            <option value="asset">특정 자산</option>
            <option value="group">특정 그룹</option>
          </select>
          {metricType === "asset" && (
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="flex-1 rounded-full border border-gray-200 bg-white/80 px-3 py-1.5 text-sm"
            >
              <option value="">자산 선택</option>
              {assetClasses.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.name}
                </option>
              ))}
            </select>
          )}
          {metricType === "group" && (
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="flex-1 rounded-full border border-gray-200 bg-white/80 px-3 py-1.5 text-sm"
            >
              <option value="">그룹 선택</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          type="number"
          placeholder="목표 금액(원)"
          className="rounded-full border border-gray-200 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-gray-400"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSubmit}
            className="self-start rounded-full bg-gray-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            목표 설정
          </button>
          {goal && (
            <button
              type="button"
              onClick={handleClear}
              className="self-start rounded-full px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              목표 해제
            </button>
          )}
        </div>
        {goal && (
          <div className="mt-1 rounded-xl bg-white/80 p-3 text-sm">
            {achievementMonth === undefined ? null : achievementMonth ===
              null ? (
              <p className="text-rose-500">500년 내 달성 불가</p>
            ) : achievementMonth === 0 ? (
              <p className="text-emerald-600">이미 달성했습니다</p>
            ) : (
              <p className="text-gray-700">
                약 {formatMonthsFromNow(achievementMonth)} (
                {formatAchievementDate(achievementMonth, today)}) 달성 예상
              </p>
            )}
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-indigo-500"
                style={{
                  width: `${Math.min(100, Math.max(0, progressRatio * 100))}%`,
                }}
              />
            </div>
            <p className="mt-1 text-xs text-gray-400">
              진행률 {Math.round(progressRatio * 100)}%
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `HistoryPanel.tsx` 전체 교체**

```tsx
"use client";

import { AssetClass, ExpenseItem, IncomeItem, MonthSnapshot, formatKRW } from "./types";
import { fires } from "./simulation";

type HistoryPanelProps = {
  snapshots: MonthSnapshot[];
  incomes: IncomeItem[];
  expenses: ExpenseItem[];
  assetClasses: AssetClass[];
  today: Date;
  selectedMonth: number;
};

type HistoryEntry = {
  key: string;
  month: number;
  kind: "income" | "expense" | "transfer";
  label: string;
  amount: number;
};

function formatMonthLabel(monthIndex: number, today: Date): string {
  const date = new Date(
    today.getFullYear(),
    today.getMonth() + monthIndex,
    1,
  );
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function HistoryPanel({
  snapshots,
  incomes,
  expenses,
  assetClasses,
  today,
  selectedMonth,
}: HistoryPanelProps) {
  if (selectedMonth === 0 || snapshots.length === 0) {
    return (
      <div className="rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
        <h3 className="text-sm font-semibold text-gray-700">📝 누적 이력</h3>
        <p className="mt-2 text-sm text-gray-400">
          📭 슬라이더를 옮기면 지금부터의 이력이 나타납니다
        </p>
      </div>
    );
  }

  const nameOf = (id: string) =>
    assetClasses.find((a) => a.id === id)?.name ?? "?";

  let totalIncome = 0;
  let totalExpense = 0;
  let totalTransfer = 0;
  const entries: HistoryEntry[] = [];

  for (let month = 1; month <= selectedMonth; month++) {
    const snapshot = snapshots[month];
    if (!snapshot) continue;

    for (const item of incomes) {
      if (fires(item.schedule, month, today)) {
        entries.push({
          key: `income-${item.id}-${month}`,
          month,
          kind: "income",
          label: item.name,
          amount: item.amount,
        });
        totalIncome += item.amount;
      }
    }
    for (const item of expenses) {
      if (fires(item.schedule, month, today)) {
        entries.push({
          key: `expense-${item.id}-${month}`,
          month,
          kind: "expense",
          label: item.name,
          amount: item.amount,
        });
        totalExpense += item.amount;
      }
    }
    for (const transfer of snapshot.flow.transfers) {
      entries.push({
        key: `transfer-${transfer.ruleId}-${month}`,
        month,
        kind: "transfer",
        label: `${nameOf(transfer.fromAssetId)} → ${nameOf(transfer.toAssetId)}`,
        amount: transfer.amount,
      });
      totalTransfer += transfer.amount;
    }
  }

  const netIncome = totalIncome - totalExpense;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
      <h3 className="text-sm font-semibold text-gray-700">
        📝 누적 이력 (지금 ~ {formatMonthLabel(selectedMonth, today)})
      </h3>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-white/80 p-2">
          <p className="text-xs text-gray-400">총 수입</p>
          <p className="font-semibold text-emerald-600">
            {formatKRW(totalIncome)}
          </p>
        </div>
        <div className="rounded-xl bg-white/80 p-2">
          <p className="text-xs text-gray-400">총 지출</p>
          <p className="font-semibold text-rose-500">
            {formatKRW(totalExpense)}
          </p>
        </div>
        <div className="rounded-xl bg-white/80 p-2">
          <p className="text-xs text-gray-400">순수입</p>
          <p className="font-semibold text-gray-800">
            {formatKRW(netIncome)}
          </p>
        </div>
        <div className="rounded-xl bg-white/80 p-2">
          <p className="text-xs text-gray-400">이체 총액</p>
          <p className="font-semibold text-amber-600">
            {formatKRW(totalTransfer)}
          </p>
        </div>
      </div>
      <ul className="flex max-h-[400px] flex-col gap-1 overflow-y-auto text-xs">
        {entries.map((entry) => (
          <li
            key={entry.key}
            className="flex items-center justify-between rounded-lg bg-white/80 px-2 py-1.5"
          >
            <span className="text-gray-500">
              {formatMonthLabel(entry.month, today)} · {entry.label}
            </span>
            <span
              className={
                entry.kind === "income"
                  ? "text-emerald-600"
                  : entry.kind === "expense"
                    ? "text-rose-500"
                    : "text-amber-600"
              }
            >
              {entry.kind === "expense"
                ? "-"
                : entry.kind === "income"
                  ? "+"
                  : ""}
              {formatKRW(entry.amount)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 3: `ScenarioTabs.tsx` 전체 교체**

```tsx
"use client";

import { useState } from "react";
import { Scenario } from "./types";

type ScenarioTabsProps = {
  scenarios: Scenario[];
  activeScenarioId: string;
  onSelect: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onCreate: () => void;
};

export default function ScenarioTabs({
  scenarios,
  activeScenarioId,
  onSelect,
  onRename,
  onDelete,
  onDuplicate,
  onCreate,
}: ScenarioTabsProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  const startRename = (scenario: Scenario) => {
    setRenamingId(scenario.id);
    setRenameDraft(scenario.name);
  };

  const commitRename = (id: string) => {
    const name = renameDraft.trim();
    if (name) {
      onRename(id, name);
    }
    setRenamingId(null);
  };

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <ul className="flex flex-wrap items-center gap-1">
        {scenarios.map((scenario) => {
          const active = scenario.id === activeScenarioId;
          return (
            <li
              key={scenario.id}
              className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs ${
                active ? "bg-indigo-500 text-white" : "bg-white/80 text-gray-600"
              }`}
            >
              {renamingId === scenario.id ? (
                <input
                  autoFocus
                  value={renameDraft}
                  onChange={(e) => setRenameDraft(e.target.value)}
                  onBlur={() => commitRename(scenario.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitRename(scenario.id);
                    }
                    if (e.key === "Escape") {
                      setRenamingId(null);
                    }
                  }}
                  className="w-24 min-w-0 rounded border border-indigo-300 px-1 text-xs text-gray-800 outline-none"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => onSelect(scenario.id)}
                  className="max-w-[120px] truncate"
                >
                  {scenario.name}
                </button>
              )}
              <button
                type="button"
                onClick={() => startRename(scenario)}
                className={
                  active
                    ? "text-white/70 hover:text-white"
                    : "text-gray-400 hover:text-gray-700"
                }
                aria-label="시나리오 이름 수정"
              >
                ✎
              </button>
              <button
                type="button"
                onClick={() => onDelete(scenario.id)}
                disabled={scenarios.length <= 1}
                className={
                  scenarios.length <= 1
                    ? "cursor-not-allowed text-white/30"
                    : active
                      ? "text-white/70 hover:text-white"
                      : "text-gray-400 hover:text-rose-500"
                }
                aria-label="시나리오 삭제"
              >
                ✕
              </button>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={() => onDuplicate(activeScenarioId)}
        className="rounded-full bg-white/80 px-3 py-1 text-xs text-gray-600 hover:bg-white"
      >
        📋 현재 탭 복제
      </button>
      <button
        type="button"
        onClick={onCreate}
        className="rounded-full bg-white/80 px-3 py-1 text-xs text-indigo-600 hover:bg-white"
      >
        + 새 시나리오
      </button>
    </div>
  );
}
```

- [ ] **Step 4: `ScenarioComparisonChart.tsx` 전체 교체**

```tsx
"use client";

import { useMemo } from "react";
import { GROUP_PALETTE, Scenario, SimulationInput } from "./types";
import { runSimulation } from "./simulation";

type ScenarioComparisonChartProps = {
  scenarios: Scenario[];
  today: Date;
  horizonMonths: number;
  selectedMonth: number;
};

const WIDTH = 600;
const HEIGHT = 180;
const PADDING = 12;

export default function ScenarioComparisonChart({
  scenarios,
  today,
  horizonMonths,
  selectedMonth,
}: ScenarioComparisonChartProps) {
  const series = useMemo(
    () =>
      scenarios.map((scenario, i) => {
        const input: SimulationInput = {
          groups: scenario.groups,
          assetClasses: scenario.assetClasses,
          incomes: scenario.incomes,
          expenses: scenario.expenses,
          transferRules: scenario.transferRules,
          exchangeRate: scenario.exchangeRate,
        };
        return {
          id: scenario.id,
          name: scenario.name,
          color: GROUP_PALETTE[i % GROUP_PALETTE.length],
          snapshots: runSimulation(input, today, horizonMonths),
        };
      }),
    [scenarios, today, horizonMonths],
  );

  if (series.length === 0 || series[0].snapshots.length === 0) {
    return (
      <div className="mb-4 flex h-[200px] items-center justify-center rounded-2xl border border-white/40 bg-white/70 text-sm text-gray-400 backdrop-blur">
        📭 시나리오를 만들면 비교 그래프가 나타납니다
      </div>
    );
  }

  const maxTotal = Math.max(
    1,
    ...series.flatMap((s) => s.snapshots.map((snap) => snap.totalBalance)),
  );
  const snapshotCount = series[0].snapshots.length;
  const stepX = (WIDTH - PADDING * 2) / (snapshotCount - 1);
  const scaleY = (value: number) =>
    HEIGHT - PADDING - (value / maxTotal) * (HEIGHT - PADDING * 2);
  const cursorX = PADDING + selectedMonth * stepX;

  return (
    <div className="mb-4 rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
      <p className="text-sm text-gray-500">🆚 시나리오 비교 · 총자산 추이</p>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="mt-2 w-full">
        {series.map((s) => {
          const points = s.snapshots
            .map(
              (snap, i) => `${PADDING + i * stepX},${scaleY(snap.totalBalance)}`,
            )
            .join(" ");
          return (
            <polyline key={s.id} points={points} fill="none" stroke={s.color} strokeWidth={2}>
              <title>{s.name}</title>
            </polyline>
          );
        })}
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
        {series.map((s) => (
          <span key={s.id} className="flex items-center gap-1">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: 전체 타입체크·린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음(프로젝트 전체).

- [ ] **Step 6: Playwright 기반 수동 확인(실제 dev 서버)**

`npm run dev`로 `/asset-simulator`에서 확인: 목표 카드 제목이 "🎯 목표"이고 설정 버튼이 "🎯 목표 설정"인지, 누적 이력 패널 제목에 📝가 붙는지(슬라이더가 0일 때/0이 아닐 때 둘 다), "현재 탭 복제" 버튼에 📋가 붙는지("+ 새 시나리오"는 이미 +가 있으므로 그대로인지 확인), 시나리오 비교 그래프 제목에 🆚가 붙는지, 시나리오가 없을 수는 없으므로(항상 최소 1개) 이 빈 상태 메시지는 실제로는 볼 일이 없다는 점을 참고해 코드 리뷰로만 확인.

- [ ] **Step 7: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/6_AssetSimulator/GoalCard.tsx app/\(portfolio\)/playground/_sections/Works/6_AssetSimulator/HistoryPanel.tsx app/\(portfolio\)/playground/_sections/Works/6_AssetSimulator/ScenarioTabs.tsx app/\(portfolio\)/playground/_sections/Works/6_AssetSimulator/ScenarioComparisonChart.tsx
git commit -m "feat: 목표·누적 이력·시나리오 탭·시나리오 비교 카드에 아이콘 반영"
```

---

### Task 5: 입력 패널 2단 분할 레이아웃 (`InputPanel.tsx`)

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/InputPanel.tsx` (전체 교체)

**Interfaces:**
- Consumes: 없음(기존 props 시그니처 그대로, 네 자식 컴포넌트도 Task 1~4에서 props를 바꾸지 않았으므로 그대로).
- Produces: 없음 — `AssetSimulator.tsx`가 `InputPanel`을 호출하는 방식은 바뀌지 않는다(props는 동일, 다만 Task 6에서 이 컴포넌트가 차지하는 그리드 컬럼 폭을 넓힌다).

- [ ] **Step 1: `InputPanel.tsx` 전체 교체 — 자산·수입이 위, 지출·이체 규칙이 아래인 2×2 그리드로 변경**

```tsx
"use client";

import {
  AssetClass,
  ExpenseItem,
  Group,
  IncomeItem,
  NewAssetClassInput,
  NewExpenseItemInput,
  NewIncomeItemInput,
  NewTransferRuleInput,
  TransferRule,
} from "./types";
import GroupAssetSection from "./input-sections/GroupAssetSection";
import IncomeSection from "./input-sections/IncomeSection";
import ExpenseSection from "./input-sections/ExpenseSection";
import TransferRuleSection from "./input-sections/TransferRuleSection";

type InputPanelProps = {
  groups: Group[];
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
};

export default function InputPanel(props: InputPanelProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
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
    </div>
  );
}
```

- [ ] **Step 2: 전체 타입체크·린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음(프로젝트 전체).

- [ ] **Step 3: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/6_AssetSimulator/InputPanel.tsx
git commit -m "feat: 입력 패널을 2단 그리드 레이아웃으로 변경"
```

(이 태스크만으로는 화면에서 카드가 실제로 넓게 2열로 보이지 않을 수 있다 — 부모 컬럼 폭이 아직 360px로 좁기 때문이다. Task 6에서 `AssetSimulator.tsx`의 그리드 폭을 넓히면 완성된다. 이 태스크의 Playwright 확인은 Task 6에서 함께 진행한다.)

---

### Task 6: `AssetSimulator.tsx` — 최종 배선(레이아웃 폭 조정 + 온보딩 시딩 + 새로고침 경고 + 아이콘)

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/AssetSimulator.tsx` (전체 교체)

**Interfaces:**
- Consumes: Task 1~5에서 만든 모든 컴포넌트(전부 props 시그니처 변경 없음 — 이 태스크는 순수하게 `AssetSimulator.tsx` 자신의 내부 로직·레이아웃·문구만 바꾼다).
- Produces: 이 태스크 이후 프로젝트 전체가 `npx tsc --noEmit`/`npm run lint` 기준으로 완전히 클린해야 한다. 이후 태스크가 없다.

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
  formatKRW,
  newId,
  nextAssetColor,
  nextGroupColor,
  toMonthInputValue,
} from "./types";
import { useSimulation } from "./useSimulation";
import InputPanel from "./InputPanel";
import TimelineSlider from "./TimelineSlider";
import AssetAreaChart from "./AssetAreaChart";
import GroupDonutChart from "./GroupDonutChart";
import FlowDiagram from "./FlowDiagram";
import ComparisonBarChart from "./ComparisonBarChart";
import GoalCard from "./GoalCard";
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
        initialBalance: 10_000_000,
        annualReturnRate: 0,
        isPrimary: true,
        color: nextAssetColor(0),
      },
    ],
    incomes: [
      {
        id: newId(),
        name: "월급",
        amount: 3_000_000,
        schedule: monthlyRecurring(nextMonth),
      },
    ],
    expenses: [
      {
        id: newId(),
        name: "생활비",
        amount: 1_000_000,
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
      <div className="mx-auto max-w-[1600px]">
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

        <div className="mb-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
            <p className="text-sm text-gray-500">💰 현재 자산</p>
            <p className="mt-1 text-2xl font-bold text-gray-800">
              {formatKRW(snapshots[0]?.totalBalance ?? 0)}
            </p>
          </div>
          <GoalCard
            goal={activeScenario.goal}
            onSetGoal={handleSetGoal}
            assetClasses={activeScenario.assetClasses}
            groups={assetGroups}
            simulationInput={simulationInput}
            today={today}
            selectedSnapshot={selectedSnapshot}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-[640px_1fr_320px]">
          <InputPanel
            key={activeScenarioId}
            groups={activeScenario.groups}
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
          />
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <AssetAreaChart
                snapshots={snapshots}
                groups={assetGroups}
                assetClasses={activeScenario.assetClasses}
                selectedMonth={selectedMonth}
              />
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
            <TimelineSlider
              selectedMonth={selectedMonth}
              onChange={setSelectedMonth}
              today={today}
              horizonMonths={horizonMonths}
            />
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

- [ ] **Step 2: 전체 타입체크·린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음(프로젝트 전체).

- [ ] **Step 3: Playwright 기반 골든 패스 확인(실제 dev 서버)**

`npm run dev`로 실제 `/playground` 페이지에서 자산 시뮬레이터 Work를 열고 확인한다: (1) 처음 열었을 때 "현금 10,000,000원"·"월급 3,000,000원"·"생활비 1,000,000원"이 이미 채워져 있는지(현재 자산 카드가 1,000만원을 보여주는지), (2) 예시 데이터를 지우거나 수정할 수 있는지(특별 취급 없이 일반 삭제·수정처럼 동작하는지), (3) 입력 패널이 실제로 자산/수입이 위, 지출/이체 규칙이 아래인 2×2로 넓게 보이는지, (4) 아무것도 수정하지 않은 상태에서 새로고침해도 브라우저 경고가 뜨지 않는지(단순 슬라이더 이동·시뮬레이션 범위 변경도 경고를 띄우면 안 됨 — 둘 다 시도해보고 확인), (5) 자산 하나를 수정한 뒤 새로고침을 시도하면 브라우저 기본 확인창이 뜨는지(Playwright의 `page.on('dialog')`로 감지), (6) "현재 자산" 카드에 💰가 붙어 있는지, (7) 새 시나리오를 만들면(온보딩 예시가 아니라 완전히 빈 상태로) 그 시나리오에는 예시 데이터가 없는지.

- [ ] **Step 4: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/6_AssetSimulator/AssetSimulator.tsx
git commit -m "feat: 입력 패널 레이아웃 폭 조정, 온보딩 예시 데이터, 새로고침 경고, 아이콘 반영"
```

---

### Task 7: 전체 골든 패스 수동 검증

**Files:** 없음(코드 변경 없음, 검증만).

**Interfaces:** 없음.

- [ ] **Step 1: 타입 체크·린트 최종 확인**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음.

- [ ] **Step 2: 명칭 변경 전수 확인**

`grep -rn "자산군" app/\(portfolio\)/playground/_sections/Works/6_AssetSimulator/`을 실행해 결과가 완전히 비어있는지 확인한다(과거 8곳 전부 바뀌었는지).

- [ ] **Step 3: 온보딩 골든 패스**

브라우저 캐시/상태 없이 완전히 새로 `/asset-simulator`를 로드했을 때 예시 데이터(현금 1,000만원, 월급 300만원, 생활비 100만원)가 즉시 보이는지, 차트들이 빈 상태가 아니라 실제 곡선/막대를 바로 보여주는지 확인한다.

- [ ] **Step 4: 새로고침 경고 골든 패스**

Playwright의 `page.on('dialog')`로 `beforeunload` 경고 발생 여부를 감지한다: (1) 로드 직후 새로고침 시도 → 경고 없음, (2) 슬라이더만 옮기고 새로고침 시도 → 경고 없음, (3) 시뮬레이션 범위(5/10/20/30년)만 바꾸고 새로고침 시도 → 경고 없음, (4) 자산 이름을 하나 수정하고 새로고침 시도 → 경고 있음, (5) 시나리오를 하나 복제하고 새로고침 시도 → 경고 있음.

- [ ] **Step 5: 레이아웃 골든 패스**

입력 패널이 2×2 그리드로 넓게 보이는지, 전체 3열 레이아웃(입력 패널/차트 영역/이력 패널)이 예전처럼 정상 작동하는지(각 영역이 겹치거나 깨지지 않는지) 확인한다. 브라우저 창 폭을 줄여봤을 때(모바일 폭 미만) 레이아웃이 깨지지 않고 세로로 쌓이는지도 간단히 확인한다.

- [ ] **Step 6: 아이콘 전수 확인**

스펙의 아이콘 표에 있는 13개 위치(현재 자산, 목표, 자산 입력 카드, 수입, 지출, 이체 규칙, 자금 흐름도, 총자산 추이, 자산 비교, 그룹별 비율, 현금흐름, 누적 이력, 시나리오 비교) + 주요 추가 버튼들 + "현재 탭 복제" 버튼 + 빈 상태 메시지들에 아이콘이 실제로 보이는지 화면을 훑어 확인한다.

- [ ] **Step 7: 회귀 확인 — 이전 라운드 기능**

시나리오 전환·복제·삭제·이름변경, 자산·그룹 색상 변경, 목표 설정, 누적 이력, 시나리오 비교 그래프가 이번 라운드 변경 이후에도 정상 동작하는지 간단히 재확인한다.

- [ ] **Step 8: 독립 페이지 확인**

`/asset-simulator`(모달이 아닌 독립 페이지)에서도 위 항목들이 동일하게 동작하는지 확인한다.

이 태스크는 커밋할 코드 변경이 없다. 문제를 발견하면 해당 태스크로 돌아가 수정한다.

---
