# 자산 시뮬레이터 시나리오 비교 UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 자산(계좌·그룹)까지 포함한 전체 설정을 시나리오 단위로 여러 벌 만들어 탭으로 전환하며 편집하고, 모든 시나리오의 총자산 추이를 한 그래프에 겹쳐 비교할 수 있게 한다.

**Architecture:** `AssetSimulator.tsx`가 지금 개별 `useState`로 들고 있던 `groups`/`assetClasses`/`incomes`/`expenses`/`transferRules`/`exchangeRate`/`goal`을 하나의 `Scenario` 타입으로 묶어 `scenarios: Scenario[]` + `activeScenarioId`로 관리한다. `today`/`horizonYears`/`selectedMonth`는 계속 공유 상태로 남는다. `InputPanel`/5개 차트/`GoalCard`/`HistoryPanel`은 인터페이스를 전혀 바꾸지 않고, `AssetSimulator.tsx`가 활성 시나리오에서 값을 꺼내 그대로 넘겨준다. 신규 컴포넌트 둘(탭 바, 비교 차트)을 추가한다.

**Tech Stack:** Next.js 16(App Router), React 19, TypeScript, Tailwind CSS v4. 외부 차트/상태관리 라이브러리 없음. 테스트 스위트 없음(CLAUDE.md).

**Spec:** [docs/superpowers/specs/2026-08-21-asset-simulator-scenario-comparison-design.md](../specs/2026-08-21-asset-simulator-scenario-comparison-design.md)

## Global Constraints

- 테스트 스위트 없음(CLAUDE.md) — 검증은 `npx tsc --noEmit` + `npm run lint` + Playwright 기반 수동 확인. 아직 배선 안 된 컴포넌트는 `app/scratch-*/page.tsx` 임시 라우트로 검증 후 삭제·`git status`로 흔적 없음 확인.
- 새 npm 의존성 추가 금지.
- `InputPanel.tsx`, 5개 차트 컴포넌트(`AssetAreaChart`/`ComparisonBarChart`/`GroupDonutChart`/`FlowDiagram`/`CashFlowChart`), `GoalCard.tsx`, `HistoryPanel.tsx`, `TimelineSlider.tsx`는 이 계획에서 건드리지 않는다 — props 시그니처가 이미 정확히 필요한 값들을 받고 있으므로, `AssetSimulator.tsx`가 어떤 시나리오에서 값을 꺼내 넘기는지만 바뀐다.
- `horizonYears`/`horizonMonths`/`selectedMonth`/`today`는 모든 시나리오가 공유한다 — 시나리오별로 따로 갖지 않는다(스펙에서 확정).
- 시나리오는 항상 최소 1개 유지 — 마지막 하나는 삭제할 수 없다.
- 시나리오 복제 시 그룹·자산·수입·지출·이체·목표의 모든 내부 id는 새로 발급하고, 그 id를 참조하는 필드(`groupId`, `fromAssetId`, `toAssetId`, `goal.metric.assetId`/`.groupId`)는 복제본 내부에서 새로 발급된 id로 일관되게 재연결한다.
- 컴파일 체크포인트는 Task 4(`AssetSimulator.tsx`)다 — Task 1~3은 각자 파일 내부적으로는 타입 일관성을 유지하되, 아직 아무도 새 컴포넌트를 import하지 않으므로 이 계획의 다른 태스크로 인한 교차 파일 에러는 없다(신규 파일 추가이므로 기존 파일을 깨뜨리지 않음). Task 4부터는 `npx tsc --noEmit`과 `npm run lint`가 프로젝트 전체에서 완전히 클린해야 한다.
- Enter 제출 시 포커스 이동, 클릭 수정, 인라인 리네임(Escape 취소·Enter/blur 저장) 등 기존 관례를 그대로 따른다. `react-hooks` ESLint 규칙(렌더 중 `.map()`/`.reduce()` 콜백 안에서 외부 `let` 재할당 금지)도 유지.
- React state 갱신 시 setState 업데이터 함수 내부에서 다른 state의 setter를 호출하지 않는다(부수효과 없는 순수 업데이터 유지) — 여러 state를 함께 갱신해야 하는 핸들러는 클로저의 현재 값을 직접 읽어 각 setter를 순차적으로 동기 호출한다(같은 이벤트 핸들러 안이므로 React가 한 번에 배칭한다).

---

### Task 1: `types.ts` — `Scenario` 타입 추가

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/types.ts:69` (`Goal` 타입 정의 직후, `SimulationInput` 정의 직전에 삽입)

**Interfaces:**
- Consumes: 없음(기존 `Group`, `AssetClass`, `IncomeItem`, `ExpenseItem`, `TransferRule`, `Goal` 타입을 그대로 재사용).
- Produces: `Scenario` 타입. Task 2~4가 이 타입을 그대로 소비한다.

- [ ] **Step 1: `Goal` 타입 뒤에 `Scenario` 타입 삽입**

`types.ts`에서 다음 부분을 찾는다:

```ts
export type Goal = {
  metric: GoalMetric;
  targetAmount: number;
};

export type SimulationInput = {
```

이 사이에 `Scenario` 타입을 삽입해 아래와 같은 순서가 되게 한다:

```ts
export type Goal = {
  metric: GoalMetric;
  targetAmount: number;
};

export type Scenario = {
  id: string;
  name: string;
  groups: Group[];
  assetClasses: AssetClass[];
  incomes: IncomeItem[];
  expenses: ExpenseItem[];
  transferRules: TransferRule[];
  exchangeRate: number;
  goal: Goal | null;
};

export type SimulationInput = {
```

- [ ] **Step 2: 스코프 타입체크**

Run: `npx tsc --noEmit | grep "types.ts"`
Expected: 빈 출력.

- [ ] **Step 3: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/6_AssetSimulator/types.ts
git commit -m "feat: 시나리오 타입(Scenario) 추가"
```

---

### Task 2: `ScenarioTabs.tsx` 신규 컴포넌트 — 탭 바(전환·리네임·삭제·복제·생성)

**Files:**
- Create: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/ScenarioTabs.tsx`

**Interfaces:**
- Consumes: Task 1의 `Scenario` 타입.
- Produces: `ScenarioTabs` 컴포넌트, props `{ scenarios: Scenario[]; activeScenarioId: string; onSelect: (id: string) => void; onRename: (id: string, name: string) => void; onDelete: (id: string) => void; onDuplicate: (id: string) => void; onCreate: () => void }`. Task 4가 이 컴포넌트를 렌더하고 다섯 개 콜백을 실제 핸들러로 공급한다.

- [ ] **Step 1: `ScenarioTabs.tsx` 작성**

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
        현재 탭 복제
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

- [ ] **Step 2: 스코프 타입체크**

Run: `npx tsc --noEmit | grep "ScenarioTabs.tsx"`
Expected: 빈 출력.

- [ ] **Step 3: Playwright 기반 수동 확인(스크래치 라우트, 커밋 금지)**

`app/scratch-task2-verify/page.tsx`에 `ScenarioTabs`를 `useState<Scenario[]>`로 감싼 임시 페이지를 만든다(시나리오 2개로 초기화, 다섯 콜백을 각각 로컬 state에 반영하는 최소 구현). `npm run dev`로 Playwright 확인: (1) 탭 클릭 시 전환되는지, (2) 연필 클릭 → 인라인 입력 → Enter로 이름 저장, Escape로 취소되는지, (3) 시나리오가 2개일 때는 ✕가 활성화되어 삭제되고 1개 남으면 ✕가 비활성화되는지, (4) "현재 탭 복제"·"+ 새 시나리오" 클릭 시 목록에 새 항목이 추가되고 그게 즉시 활성화되는지. 확인 후 `app/scratch-task2-verify/`를 삭제하고 `git status`로 흔적이 없는지 확인한다.

- [ ] **Step 4: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/6_AssetSimulator/ScenarioTabs.tsx
git commit -m "feat: 시나리오 탭 바(ScenarioTabs) 추가"
```

---

### Task 3: `ScenarioComparisonChart.tsx` 신규 컴포넌트 — 총자산 추이 비교 그래프

**Files:**
- Create: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/ScenarioComparisonChart.tsx`

**Interfaces:**
- Consumes: Task 1의 `Scenario` 타입, 기존 `runSimulation(input, today, horizonMonths)`(`simulation.ts`), `GROUP_PALETTE`(`types.ts`).
- Produces: `ScenarioComparisonChart` 컴포넌트, props `{ scenarios: Scenario[]; today: Date; horizonMonths: number; selectedMonth: number }`. Task 4가 이 컴포넌트를 렌더한다.

- [ ] **Step 1: `ScenarioComparisonChart.tsx` 작성**

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
        시나리오를 만들면 비교 그래프가 나타납니다
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
      <p className="text-sm text-gray-500">시나리오 비교 · 총자산 추이</p>
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

- [ ] **Step 2: 스코프 타입체크**

Run: `npx tsc --noEmit | grep "ScenarioComparisonChart.tsx"`
Expected: 빈 출력.

- [ ] **Step 3: Playwright 기반 수동 확인(스크래치 라우트, 커밋 금지)**

`app/scratch-task3-verify/page.tsx`에 `ScenarioComparisonChart`를 렌더하는 임시 페이지를 만든다. 두 개의 `Scenario`(둘 다 KRW 자산 하나씩, 서로 다른 `initialBalance` — 예: 100만원 vs 500만원, 나머지는 비어있음)를 하드코딩해서 넘긴다. `today`는 실제 `new Date()`, `horizonMonths=60`, `selectedMonth=12`. Playwright로 확인: (1) `<polyline>`이 정확히 2개 그려지는지, (2) 각 polyline의 `points` 속성에서 첫 좌표(월 0)의 y값이 초기 잔액 비율(100만 vs 500만)에 맞게 서로 다른지(더 큰 잔액일수록 y값이 작아야 함 — 위쪽), (3) 범례에 두 이름이 모두 나오는지, (4) 커서 선의 x좌표가 `selectedMonth=12`에 해당하는 위치인지 계산해서 확인. 확인 후 `app/scratch-task3-verify/`를 삭제하고 `git status`로 흔적이 없는지 확인한다.

- [ ] **Step 4: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/6_AssetSimulator/ScenarioComparisonChart.tsx
git commit -m "feat: 시나리오 비교 그래프(ScenarioComparisonChart) 추가"
```

---

### Task 4: `AssetSimulator.tsx` — 시나리오 상태로 전면 재배선(컴파일 체크포인트)

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/AssetSimulator.tsx` (전체 교체)

**Interfaces:**
- Consumes: Task 1의 `Scenario`, Task 2의 `ScenarioTabs`, Task 3의 `ScenarioComparisonChart`. `InputPanel`/5개 차트/`GoalCard`/`HistoryPanel`/`TimelineSlider`의 기존(변경 없는) props 시그니처.
- Produces: 이 태스크 이후 프로젝트 전체가 `npx tsc --noEmit`/`npm run lint` 기준으로 완전히 클린해야 한다. 이후 태스크가 없다.

- [ ] **Step 1: `AssetSimulator.tsx` 전체 교체**

```tsx
"use client";

import { useMemo, useState } from "react";
import {
  AssetClass,
  DEFAULT_HORIZON_YEARS,
  ExpenseItem,
  Goal,
  Group,
  HORIZON_PRESET_YEARS,
  IncomeItem,
  NewAssetClassInput,
  NewExpenseItemInput,
  NewIncomeItemInput,
  NewTransferRuleInput,
  Scenario,
  SimulationInput,
  TransferRule,
  formatKRW,
  newId,
  nextAssetColor,
  nextGroupColor,
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
    emptyScenario("시나리오 1"),
  ]);
  const [activeScenarioId, setActiveScenarioId] = useState(
    () => scenarios[0].id,
  );
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [horizonYears, setHorizonYears] = useState(DEFAULT_HORIZON_YEARS);

  const horizonMonths = horizonYears * 12;

  const handleChangeHorizon = (years: number) => {
    setHorizonYears(years);
    setSelectedMonth((prev) => Math.min(prev, years * 12));
  };

  const updateActiveScenario = (
    updater: (scenario: Scenario) => Scenario,
  ) => {
    setScenarios((prev) =>
      prev.map((s) => (s.id === activeScenarioId ? updater(s) : s)),
    );
  };

  const handleSelectScenario = (id: string) => setActiveScenarioId(id);

  const handleRenameScenario = (id: string, name: string) => {
    setScenarios((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
  };

  const handleDeleteScenario = (id: string) => {
    if (scenarios.length <= 1) return;
    const rest = scenarios.filter((s) => s.id !== id);
    setScenarios(rest);
    if (activeScenarioId === id) {
      setActiveScenarioId(rest[0].id);
    }
  };

  const handleDuplicateScenario = (id: string) => {
    const source = scenarios.find((s) => s.id === id);
    if (!source) return;
    const clone = duplicateScenario(source);
    setScenarios((prev) => [...prev, clone]);
    setActiveScenarioId(clone.id);
  };

  const handleCreateScenario = () => {
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
            <p className="text-sm text-gray-500">현재 자산</p>
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

        <div className="grid gap-4 md:grid-cols-[360px_1fr_320px]">
          <InputPanel
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

Run: `npx tsc --noEmit`
Expected: 에러 없음(프로젝트 전체, 스코프 제한 없이).

Run: `npm run lint`
Expected: 0 errors. 기존 무관한 파일들(`VisualNovelStudio`, `PixelArtMaker` 등)의 사전 존재 warning은 남아있어도 되지만, 이 계획이 만진 파일에서 새 warning이 생기면 안 된다.

- [ ] **Step 3: Playwright 기반 골든 패스 확인(실제 dev 서버)**

`npm run dev`로 실제 `/playground` 페이지에서 자산 시뮬레이터 Work를 열고 확인한다: (1) 처음 로드 시 시나리오 탭이 "시나리오 1" 하나뿐이고 삭제 버튼이 비활성화되어 있는지, (2) 자산·수입·지출을 입력한 뒤 "현재 탭 복제"를 누르면 새 탭("시나리오 1 복사본")이 생기고 그 탭이 활성화되며 원본과 동일한 데이터를 갖는지, (3) 복제본에서 자산을 하나 삭제해도 원본 탭(전환해서 확인)의 데이터는 그대로인지(진짜로 독립적인 복사본인지), (4) 복제본에서 그룹 하나를 삭제하면 그 복제본 내부의 자산·목표만 영향받고 원본 탭은 무관한지, (5) "+ 새 시나리오"로 빈 시나리오를 만들고 비교 그래프에 두 개의 선(하나는 원본 데이터 반영, 하나는 0에 가까운 선)이 나타나는지, (6) 비교 그래프의 범례에 두 시나리오 이름이 모두 보이는지, (7) 시나리오 탭 이름을 인라인으로 바꾸면 비교 그래프 범례에도 새 이름이 반영되는지, (8) 시나리오를 하나 삭제하면 남은 시나리오 중 첫 번째가 자동으로 활성화되는지, (9) 환율·수평선 범위·슬라이더가 시나리오 전환 후에도(공유 상태이므로) 그대로 유지되는지.

- [ ] **Step 4: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/6_AssetSimulator/AssetSimulator.tsx
git commit -m "feat: AssetSimulator를 시나리오 기반 상태로 재배선"
```

---

### Task 5: 전체 골든 패스 수동 검증

**Files:** 없음(코드 변경 없음, 검증만).

**Interfaces:** 없음.

- [ ] **Step 1: 타입 체크·린트 최종 확인**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음.

- [ ] **Step 2: 시나리오 독립성 골든 패스**

`/asset-simulator`에서 시나리오 A에 KRW 자산(초기 잔액 1000만원) + 매월 100만원 수입을 만든다. "현재 탭 복제"로 시나리오 B를 만들고, B에서만 매월 50만원 지출을 추가한다. 비교 그래프에서 A(꾸준히 우상향)와 B(A보다 완만하게 우상향)의 선이 서로 다르게 그려지는지, 슬라이더를 옮기며 A/B 각각의 총자산이 예상대로 다른지(A - B의 차이가 정확히 슬라이더 개월수 × 50만원과 일치하는지) 확인한다.

- [ ] **Step 3: 시나리오 참조 정리 골든 패스**

시나리오 하나에서 그룹을 만들고 그 그룹으로 목표(특정 그룹 기준)를 설정한 뒤, 그 시나리오를 복제한다. 복제본에서 해당 그룹을 삭제하면 복제본의 목표만 초기화되고(자동으로 총자산 기준 등으로 리셋), 원본 시나리오의 목표는 그대로 유지되는지 확인한다.

- [ ] **Step 4: 회귀 확인 — 기존 라운드 기능**

활성 시나리오 안에서 수입/지출/이체 규칙 추가·수정·삭제, 자산 색상 변경, 그룹 편집(이름·색상·삭제), 목표 설정, 누적 이력 패널, 현금흐름 차트가 이전 라운드와 동일하게 정상 동작하는지 간단히 재확인한다.

- [ ] **Step 5: 독립 페이지 확인**

`/asset-simulator`(모달이 아닌 독립 페이지)에서도 위 항목들이 동일하게 동작하는지 확인한다.

이 태스크는 커밋할 코드 변경이 없다. 문제를 발견하면 해당 태스크로 돌아가 수정한다.

---
