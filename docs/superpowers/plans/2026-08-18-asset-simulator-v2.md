# 자산 시뮬레이터 v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** v1(12개 태스크, 이미 구현·리뷰 완료)에 얹어 자산 시뮬레이터를 재설계한다 — 모달 다크 테마 복원, 카테고리 색상 구분, 그룹 옵션화+인라인 관리, 고정수입 다중화, 전 항목 수정 기능, 달러 자산+환율, 4번째 비교 차트, 숫자 축약, 레이아웃 확장, 키보드 UX, v1 리뷰에서 발견된 버그 수정.

**Architecture:** 데이터 모델(`types.ts`, `simulation.ts`)을 먼저 확장하고, 공유 컴포넌트(`WorkModal.tsx`)를 원복한 뒤, 입력 섹션 5개를 통화·그룹 인라인·수정·Enter 제출을 지원하는 공통 패턴으로 재작성하고, 마지막으로 시각화 4종과 `AssetSimulator.tsx` 조립을 갱신한다. 기존 v1 파일 구조(`6_AssetSimulator/` 폴더, `input-sections/` 하위 폴더)를 그대로 유지한다.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4. 외부 차트 라이브러리 없음(v1과 동일).

**Spec:** `docs/superpowers/specs/2026-08-18-asset-simulator-v2-design.md` (v1 스펙 `docs/superpowers/specs/2026-08-18-asset-simulator-design.md` 위에 얹는 재설계 — 두 문서 모두 유효)

## Global Constraints

- 저장은 세션 메모리(`useState`)만 — v1과 동일, 이번에도 유지.
- `HORIZON_MONTHS` = 120 고정 — 변경 없음.
- 차트는 외부 라이브러리 없이 SVG로 직접 구현 — 4번째 비교 차트도 동일 원칙.
- **모달 테마는 다시 다크 하나만** — `WorkModal.tsx`의 `theme` 분기와 `WorkItem.theme` 필드를 제거한다. Work 콘텐츠 영역 자체는 계속 밝은 배경 유지, 카테고리 색상(자산군=인디고, 수입=에메랄드, 지출=로즈, 이체=앰버)으로 구분한다.
- **기본 계좌는 반드시 KRW 자산만** — USD 자산에는 기본 계좌 라디오를 비활성화한다.
- **이체 규칙은 같은 통화의 자산군 사이만** — select 옵션에서 다른 통화 자산을 제외한다.
- **그룹 삭제/이름변경 UI는 만들지 않는다** — 인라인 생성/선택만 지원.
- 프로젝트에 테스트 스위트가 없다 — 검증은 `npx tsc --noEmit`, `npm run lint`, `npm run dev` 브라우저 확인. 순수 함수(`simulation.ts`, `formatKRW`)만 예외적으로 저장소 루트에 임시 `tsx` 스크립트를 만들어 `npx --yes tsx`로 실행 후 삭제한다.
- **새 npm 의존성을 추가하지 않는다.** 각 태스크 종료 전 `git status --short package.json package-lock.json`으로 드리프트가 없는지 확인한다.
- 모든 사용자 노출 문구는 CLAUDE.md의 Writing Guidelines(번역투 금지, 반복 표현 금지, 단정형)를 따른다.
- **`formatKRW` 적용 범위 명확화**: 차트 라벨·카드 상단 합계(총자산, 도넛 조각 금액, 비교 막대 금액) 등 "집계·요약" 표시에는 전부 적용한다. 반면 리스트 항목 한 줄(고정수입/고정지출/비정기 항목/이체 규칙의 개별 금액)은 사용자가 실제로 입력한 값을 정확히 확인할 수 있도록 `toLocaleString()` 원본 표기를 유지한다(v1과 동일). 이 구분은 스펙 문서의 "표시용 텍스트 전부"라는 표현을 구현 단계에서 좁힌 것이다.

## 현재 코드 상태 (v1, 이미 구현됨)

이 플랜의 모든 태스크는 아래 기존 파일들을 **수정**한다(새로 만드는 파일도 있음, 각 태스크에 명시):

```
app/(portfolio)/playground/_sections/Works/6_AssetSimulator/
  types.ts, simulation.ts, useSimulation.ts
  AssetSimulator.tsx, InputPanel.tsx
  input-sections/GroupAssetSection.tsx, IncomeSection.tsx, ExpenseSection.tsx, TransferRuleSection.tsx
  TimelineSlider.tsx, AssetAreaChart.tsx, GroupDonutChart.tsx, FlowDiagram.tsx
app/(portfolio)/playground/_sections/Works/Work.tsx   (WorkItem.theme 필드 포함)
app/(portfolio)/playground/_sections/Works/WorkModal.tsx  (theme 분기 포함)
app/(portfolio)/playground/_sections/Works/data.tsx   (id:6 항목, theme: "light" 포함)
app/(services)/asset-simulator/page.tsx
app/robots.ts   (asset-simulator 경로 누락 상태)
```

**컴파일 상태에 대한 노트:** 이 플랜은 이미 서로 참조하는 기존 파일들을 함께 바꾼다. Task 1~7은 각자 자기 파일 내부적으로는 새 타입에 맞게 올바르지만, 아직 갱신되지 않은 이웃 파일(예: `InputPanel.tsx`가 아직 옛날 props를 기대하는 상태)과 맞물려 `npx tsc --noEmit`이 프로젝트 전체 기준으로는 에러를 낼 수 있다. 각 태스크의 검증 단계는 "이 태스크가 만든/수정한 파일에서 새로 발생한 에러가 없는지"를 `npx tsc --noEmit 2>&1 | grep <파일명>`으로 좁혀서 확인한다. **Task 8(AssetSimulator.tsx)이 끝나면 프로젝트 전체가 다시 컴파일 체크포인트**이며, 그 이후 모든 태스크는 필터 없이 `npx tsc --noEmit`이 완전히 clean해야 한다.

---

### Task 1: 데이터 모델 확장 + 계산 엔진 (통화·그룹 옵션화·고정수입 리스트화)

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/types.ts` (전체 교체)
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/simulation.ts` (전체 교체)

**Interfaces:**
- Produces: `Currency`, `AssetClass`(groupId 옵션+currency 추가), `FixedIncome`, `NewFixedIncomeInput`, `SimulationInput`(monthlyIncome 제거, fixedIncomes+exchangeRate 추가), `MonthSnapshot`(assetBalancesKRW+ungroupedTotalKRW 추가), `formatKRW()`, `formatMonthsFromNow(months: number): string`(1년 이상이면 "N년 M개월 후"로 표기, 나머지가 0이면 "N년 후"), `UNGROUPED_LABEL` — 이후 모든 태스크가 이 타입/함수를 가져다 쓴다. `formatMonthsFromNow`는 Task 4·5(비정기 수입/지출의 "N개월 후" 라벨)와 Task 10·12(TimelineSlider, ComparisonBarChart의 시점 라벨)가 기존에 직접 쓰던 `` `${monthsFromNow}개월 후` `` 템플릿 문자열을 전부 대체한다.
- Consumes: 없음(최하위 레이어)

- [ ] **Step 1: types.ts 전체 교체**

```ts
export type Currency = "KRW" | "USD";

export type Group = {
  id: string;
  name: string;
  color: string;
};

export type AssetClass = {
  id: string;
  name: string;
  groupId?: string;
  currency: Currency;
  initialBalance: number;
  annualReturnRate: number;
  isPrimary: boolean;
};

export type FixedExpense = {
  id: string;
  name: string;
  amount: number;
};

export type FixedIncome = {
  id: string;
  name: string;
  amount: number;
  groupId?: string;
};

export type IrregularCashflow = {
  id: string;
  name: string;
  amount: number;
  targetDate: string; // "YYYY-MM"
};

export type TransferMode = "fixed" | "percentOfSource";
export type TransferFrequency = "monthly" | "yearly";

export type TransferRule = {
  id: string;
  fromAssetId: string;
  toAssetId: string;
  mode: TransferMode;
  amount: number;
  frequency: TransferFrequency;
};

export type SimulationInput = {
  groups: Group[];
  assetClasses: AssetClass[];
  fixedIncomes: FixedIncome[];
  fixedExpenses: FixedExpense[];
  irregularIncomes: IrregularCashflow[];
  irregularExpenses: IrregularCashflow[];
  transferRules: TransferRule[];
  exchangeRate: number;
};

export type MonthFlow = {
  incomeIn: number;
  expenseOut: number;
  transfers: {
    ruleId: string;
    fromAssetId: string;
    toAssetId: string;
    amount: number;
  }[];
};

export type MonthSnapshot = {
  monthIndex: number;
  assetBalances: Record<string, number>;
  assetBalancesKRW: Record<string, number>;
  groupTotals: Record<string, number>;
  ungroupedTotalKRW: number;
  totalBalance: number;
  flow: MonthFlow;
};

export type NewAssetClassInput = {
  name: string;
  groupId?: string;
  currency: Currency;
  initialBalance: number;
  annualReturnRate: number;
  isPrimary: boolean;
};

export type NewFixedExpenseInput = { name: string; amount: number };

export type NewFixedIncomeInput = {
  name: string;
  amount: number;
  groupId?: string;
};

export type NewIrregularCashflowInput = {
  name: string;
  amount: number;
  targetDate: string;
};

export type NewTransferRuleInput = {
  fromAssetId: string;
  toAssetId: string;
  mode: TransferMode;
  amount: number;
  frequency: TransferFrequency;
};

export const HORIZON_MONTHS = 120;

export const GROUP_PALETTE = [
  "#818cf8",
  "#c084fc",
  "#5eead4",
  "#f9a8d4",
  "#93c5fd",
  "#fcd34d",
  "#a3e635",
  "#fca5a5",
];

export const UNGROUPED_LABEL = "미분류";
export const UNGROUPED_COLOR = "#9ca3af";

export function nextGroupColor(existingCount: number): string {
  return GROUP_PALETTE[existingCount % GROUP_PALETTE.length];
}

export function newId(): string {
  return crypto.randomUUID();
}

export function formatKRW(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 100_000_000) {
    return `${sign}${(abs / 100_000_000).toFixed(1)}억원`;
  }
  if (abs >= 10_000) {
    return `${sign}${Math.round(abs / 10_000).toLocaleString()}만원`;
  }
  return `${sign}${Math.round(abs).toLocaleString()}원`;
}

export function formatMonthsFromNow(months: number): string {
  if (months < 12) {
    return `${months}개월 후`;
  }
  const years = Math.floor(months / 12);
  const remainder = months % 12;
  return remainder === 0 ? `${years}년 후` : `${years}년 ${remainder}개월 후`;
}
```

- [ ] **Step 2: simulation.ts 전체 교체**

```ts
import {
  AssetClass,
  Group,
  HORIZON_MONTHS,
  MonthSnapshot,
  SimulationInput,
} from "./types";

export function monthIndexFromTargetDate(
  targetDate: string,
  today: Date,
): number {
  const [year, month] = targetDate.split("-").map(Number);
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;
  return (year - todayYear) * 12 + (month - todayMonth);
}

function toKRW(asset: AssetClass, nativeBalance: number, exchangeRate: number): number {
  return asset.currency === "USD" ? nativeBalance * exchangeRate : nativeBalance;
}

function computeGroupTotals(
  balancesKRW: Record<string, number>,
  assetClasses: AssetClass[],
  groups: Group[],
): { groupTotals: Record<string, number>; ungroupedTotalKRW: number } {
  const groupTotals: Record<string, number> = {};
  for (const group of groups) {
    groupTotals[group.id] = 0;
  }
  let ungroupedTotalKRW = 0;
  for (const asset of assetClasses) {
    const value = balancesKRW[asset.id] ?? 0;
    if (asset.groupId && groupTotals[asset.groupId] !== undefined) {
      groupTotals[asset.groupId] += value;
    } else {
      ungroupedTotalKRW += value;
    }
  }
  return { groupTotals, ungroupedTotalKRW };
}

function sumBalances(balancesKRW: Record<string, number>): number {
  return Object.values(balancesKRW).reduce((sum, value) => sum + value, 0);
}

function buildSnapshot(
  monthIndex: number,
  balances: Record<string, number>,
  assetClasses: AssetClass[],
  groups: Group[],
  exchangeRate: number,
  flow: MonthSnapshot["flow"],
): MonthSnapshot {
  const assetBalancesKRW: Record<string, number> = {};
  for (const asset of assetClasses) {
    assetBalancesKRW[asset.id] = toKRW(asset, balances[asset.id] ?? 0, exchangeRate);
  }
  const { groupTotals, ungroupedTotalKRW } = computeGroupTotals(
    assetBalancesKRW,
    assetClasses,
    groups,
  );
  return {
    monthIndex,
    assetBalances: { ...balances },
    assetBalancesKRW,
    groupTotals,
    ungroupedTotalKRW,
    totalBalance: sumBalances(assetBalancesKRW),
    flow,
  };
}

export function runSimulation(
  input: SimulationInput,
  today: Date = new Date(),
): MonthSnapshot[] {
  const { groups, assetClasses, transferRules, exchangeRate } = input;
  const primary = assetClasses.find((asset) => asset.isPrimary);

  const balances: Record<string, number> = {};
  for (const asset of assetClasses) {
    balances[asset.id] = asset.initialBalance;
  }

  const snapshots: MonthSnapshot[] = [
    buildSnapshot(0, balances, assetClasses, groups, exchangeRate, {
      incomeIn: 0,
      expenseOut: 0,
      transfers: [],
    }),
  ];

  for (let month = 1; month <= HORIZON_MONTHS; month++) {
    const flow: MonthSnapshot["flow"] = {
      incomeIn: 0,
      expenseOut: 0,
      transfers: [],
    };

    if (primary) {
      const fixedIncomeTotal = input.fixedIncomes.reduce(
        (sum, item) => sum + item.amount,
        0,
      );
      const irregularIncomeThisMonth = input.irregularIncomes
        .filter(
          (item) => monthIndexFromTargetDate(item.targetDate, today) === month,
        )
        .reduce((sum, item) => sum + item.amount, 0);
      const incomeIn = fixedIncomeTotal + irregularIncomeThisMonth;
      balances[primary.id] += incomeIn;
      flow.incomeIn = incomeIn;

      const fixedExpenseTotal = input.fixedExpenses.reduce(
        (sum, item) => sum + item.amount,
        0,
      );
      const irregularExpenseThisMonth = input.irregularExpenses
        .filter(
          (item) => monthIndexFromTargetDate(item.targetDate, today) === month,
        )
        .reduce((sum, item) => sum + item.amount, 0);
      const expenseOut = fixedExpenseTotal + irregularExpenseThisMonth;
      balances[primary.id] -= expenseOut;
      flow.expenseOut = expenseOut;
    }

    for (const rule of transferRules) {
      const shouldRun =
        rule.frequency === "monthly" ||
        (rule.frequency === "yearly" && month % 12 === 0);
      if (!shouldRun) continue;

      const sourceBalance = balances[rule.fromAssetId] ?? 0;
      const requested =
        rule.mode === "fixed"
          ? rule.amount
          : sourceBalance * (rule.amount / 100);
      const amount = Math.max(0, Math.min(requested, sourceBalance));

      balances[rule.fromAssetId] = sourceBalance - amount;
      balances[rule.toAssetId] = (balances[rule.toAssetId] ?? 0) + amount;
      flow.transfers.push({
        ruleId: rule.id,
        fromAssetId: rule.fromAssetId,
        toAssetId: rule.toAssetId,
        amount,
      });
    }

    for (const asset of assetClasses) {
      const monthlyRate = asset.annualReturnRate / 100 / 12;
      balances[asset.id] *= 1 + monthlyRate;
    }

    snapshots.push(
      buildSnapshot(month, balances, assetClasses, groups, exchangeRate, flow),
    );
  }

  return snapshots;
}
```

- [ ] **Step 3: 타입 체크**

Run: `npx tsc --noEmit 2>&1 | grep "6_AssetSimulator/types.ts\|6_AssetSimulator/simulation.ts"`
Expected: 출력 없음(두 파일 자체는 서로 정합적이다). 다른 파일들(`AssetSimulator.tsx` 등)에서 나는 에러는 이 시점에 정상이며 무시한다.

- [ ] **Step 4: 임시 스크립트로 계산 결과 수동 검증**

저장소 루트에 `verify-simulation-v2.ts`를 만든다:

```ts
import { runSimulation } from "./app/(portfolio)/playground/_sections/Works/6_AssetSimulator/simulation";

const today = new Date(2026, 0, 1); // 2026-01

const input = {
  groups: [{ id: "g1", name: "저축", color: "#000" }],
  assetClasses: [
    {
      id: "a1",
      name: "현금",
      groupId: "g1",
      currency: "KRW" as const,
      initialBalance: 1_000_000,
      annualReturnRate: 0,
      isPrimary: true,
    },
    {
      id: "a2",
      name: "달러 예금",
      // groupId 없음 — 미분류로 집계되어야 함
      currency: "USD" as const,
      initialBalance: 1_000,
      annualReturnRate: 0,
      isPrimary: false,
    },
  ],
  fixedIncomes: [
    { id: "i1", name: "월급", amount: 300_000 },
    { id: "i2", name: "부수입", amount: 200_000, groupId: "g1" },
  ],
  fixedExpenses: [{ id: "f1", name: "월세", amount: 300_000 }],
  irregularIncomes: [],
  irregularExpenses: [],
  transferRules: [],
  exchangeRate: 1_350,
};

const snapshots = runSimulation(input, today);

console.log(
  "month0 KRW 자산(a1):",
  snapshots[0].assetBalancesKRW.a1,
  "기대값 1000000",
);
console.log(
  "month0 미분류 합계(달러->KRW):",
  snapshots[0].ungroupedTotalKRW,
  "기대값",
  1_000 * 1_350,
);
console.log(
  "month1 a1 잔액(고정수입 2개 합산 - 지출):",
  snapshots[1].assetBalances.a1,
  "기대값",
  1_000_000 + (300_000 + 200_000) - 300_000,
);
console.log(
  "month1 총자산(KRW, a1+환산된 a2):",
  Math.round(snapshots[1].totalBalance),
  "기대값",
  Math.round(1_000_000 + 200_000 + 1_000 * 1_350),
);
```

Run: `npx --yes tsx verify-simulation-v2.ts`
Expected: 각 줄의 실제 값과 "기대값"이 일치한다(미분류 합산, 고정수입 리스트 합산, KRW 환산이 모두 반영됨을 확인).

- [ ] **Step 5: 임시 스크립트 삭제**

```bash
rm verify-simulation-v2.ts
```

- [ ] **Step 6: Commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/6_AssetSimulator/types.ts" \
        "app/(portfolio)/playground/_sections/Works/6_AssetSimulator/simulation.ts"
git commit -m "feat: 자산 시뮬레이터 v2 데이터 모델·계산 엔진 확장(통화·미분류·고정수입 리스트화)"
```

---

### Task 2: 모달 다크 테마 복원 (WorkModal.tsx 원복)

v1 Task 12에서 추가한 라이트/다크 조건부 테마를 걷어내고, 모든 Work가 다시 기존 다크 테마 하나만 쓰게 되돌린다. Work 콘텐츠 영역(그래프·입력 카드) 자체는 계속 밝은 배경을 쓴다 — 이건 모달 크롬(헤더·설명 패널)만의 이야기다.

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/Work.tsx` (`theme?: "light";` 필드 제거)
- Modify: `app/(portfolio)/playground/_sections/Works/WorkModal.tsx` (전체 교체 — v1 이전 원본으로)
- Modify: `app/(portfolio)/playground/_sections/Works/data.tsx` (id:6 항목의 `theme: "light",` 줄 제거)

**Interfaces:**
- Consumes: 없음(다른 태스크와 독립적으로 진행 가능)
- Produces: 없음(다른 태스크가 이 파일들을 더 이상 건드리지 않음)

- [ ] **Step 1: Work.tsx에서 theme 필드 제거**

`WorkItem` 인터페이스에서 다음 줄을 삭제한다:

```tsx
  theme?: "light";
```

- [ ] **Step 2: WorkModal.tsx 전체 교체**

```tsx
"use client";

import { CalendarRange, ExternalLink, Monitor, Smartphone, Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { WorkItem } from "./Work";

const WORK_MODAL_THEME = "from-[#2a2c32] via-[#3a3d45] to-[#575b66]";

interface WorkModalProps {
  works: WorkItem[];
  selectedIndex: number;
  onNavigate: (index: number) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function WorkModal({
  works,
  selectedIndex,
  onNavigate,
  isOpen,
  onClose,
}: WorkModalProps) {
  const selected = works[selectedIndex];
  const [mobileView, setMobileView] = useState<"description" | "content">(
    "description",
  );

  useEffect(() => {
    if (typeof document === "undefined" || !isOpen) {
      return;
    }

    const { body, documentElement } = document;
    const previousBodyOverflow = body.style.overflow;
    const previousHtmlOverflow = documentElement.style.overflow;

    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";

    return () => {
      body.style.overflow = previousBodyOverflow;
      documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileView("description");
  }, [isOpen, selectedIndex]);

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: isOpen ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0)",
          backdropFilter: isOpen ? "blur(8px)" : "blur(0px)",
          transition: "background-color 0.3s ease, backdrop-filter 0.3s ease",
        }}
      />
      <div
        className={`relative h-full flex items-center justify-center transition-all duration-300
          ${isOpen ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
        onClick={onClose}
      >
        <div
          className="relative flex h-full w-full flex-col overflow-hidden bg-gray-900 md:h-[90vh] md:w-[90vw] md:rounded-xl md:border md:border-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={`bg-linear-to-br ${WORK_MODAL_THEME} shrink-0 px-4 py-4 flex flex-col items-center`}
          >
            <div className="flex gap-1 items-center">
              <button
                onClick={() => onNavigate(selectedIndex - 1)}
                disabled={selectedIndex === 0}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 text-white/70 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all text-lg leading-none"
              >
                ‹
              </button>
              {works.map((_, i) => (
                <button
                  key={i}
                  onClick={() => onNavigate(i)}
                  className="p-1 flex items-center justify-center rounded-full hover:bg-white/20 transition-all disabled:cursor-not-allowed"
                >
                  <span
                    className={`rounded-full size-1.5 block transition-colors ${
                      i === selectedIndex ? "bg-white" : "bg-white/30"
                    }`}
                  />
                </button>
              ))}
              <button
                onClick={() => onNavigate(selectedIndex + 1)}
                disabled={selectedIndex === works.length - 1}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 text-white/70 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all text-lg leading-none"
              >
                ›
              </button>
            </div>
            <div className="flex justify-center items-center gap-2">
              <h4 className="text-white text-center text-2xl font-bold">
                {selected.title}
              </h4>
              {selected.path && (
                <Link
                  href={selected.path}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink
                    className="inline-block opacity-60 hover:opacity-80"
                    size={20}
                  />
                </Link>
              )}
            </div>
          </div>
          <div className="flex shrink-0 gap-2 border-b border-white/10 bg-black/20 px-4 py-3 md:hidden">
            <button
              type="button"
              onClick={() => setMobileView("description")}
              className={`flex-1 rounded-full px-4 py-2 text-sm transition-colors ${
                mobileView === "description"
                  ? "bg-white text-gray-900"
                  : "bg-white/5 text-gray-300"
              }`}
            >
              설명
            </button>
            <button
              type="button"
              onClick={() => setMobileView("content")}
              className={`flex-1 rounded-full px-4 py-2 text-sm transition-colors ${
                mobileView === "content"
                  ? "bg-white text-gray-900"
                  : "bg-white/5 text-gray-300"
              }`}
            >
              결과물
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto text-gray-300 md:flex-row md:divide-x md:divide-gray-800">
            <div
              className={`min-h-[40dvh] h-full shrink-0 border-b border-gray-800 md:min-h-0 md:w-[calc(80vh-64px)] md:border-b-0 ${
                mobileView === "content" ? "block" : "hidden md:block"
              }`}
            >
              {selected.content}
            </div>
            <div
              className={`flex-1 overflow-y-auto px-5 py-4 ${
                mobileView === "description" ? "block" : "hidden md:block"
              }`}
            >
              <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/3 px-4 py-4">
                {selected.period ? (
                  <div className="flex flex-col gap-2 border-b border-white/10 pb-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                      제작 기간
                    </p>
                    <p className="inline-flex items-center gap-2 text-sm text-gray-200">
                      <CalendarRange className="h-4 w-4 text-gray-500" />
                      {selected.period}
                    </p>
                  </div>
                ) : null}

                {selected.platforms?.length ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                      지원 플랫폼
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selected.platforms.map((platform) => (
                        <span
                          key={platform.type}
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
                            platform.specialized
                              ? "border-white/80 bg-white font-medium text-gray-900"
                              : "border-white/10 bg-black/20 text-gray-200"
                          }`}
                        >
                          {platform.specialized ? (
                            <Star className="h-3.5 w-3.5 fill-current text-gray-700" />
                          ) : null}
                          {platform.type === "mobile" ? (
                            <Smartphone
                              className={`h-4 w-4 ${platform.specialized ? "text-gray-700" : "text-gray-500"}`}
                            />
                          ) : (
                            <Monitor
                              className={`h-4 w-4 ${platform.specialized ? "text-gray-700" : "text-gray-500"}`}
                            />
                          )}
                          {platform.type === "mobile" ? "모바일" : "PC"}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="prose prose-invert text-pretty whitespace-pre-wrap">
                {selected.description}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-sm text-white/70 transition-colors hover:bg-black/60 hover:text-white"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: data.tsx에서 id:6 항목의 theme 줄 제거**

`app/(portfolio)/playground/_sections/Works/data.tsx`의 id:6(자산 시뮬레이터) 항목에서 `theme: "light",` 줄을 삭제한다.

- [ ] **Step 4: 타입 체크 및 린트**

Run: `npx tsc --noEmit 2>&1 | grep "Work.tsx\|WorkModal.tsx\|data.tsx" ; npm run lint`
Expected: 이 세 파일 관련 에러 없음, lint 에러 없음(다른 미완성 파일 관련 tsc 에러는 이 시점에 정상).

- [ ] **Step 5: 수동 확인**

Run: `npm run dev`. `/playground`에서 뜨개뜨개 등 기존 Work를 열어 모달이 다크 테마(진한 헤더 그라디언트, 흰 글씨)인지 확인한다. 자산 시뮬레이터 카드도 열어 모달 크롬(헤더·설명 패널·닫기 버튼)이 다크로 보이는지 확인한다(콘텐츠 영역 자체는 아직 밝은 배경일 수 있음 — 이후 태스크에서 카테고리 색상으로 다듬어진다).

- [ ] **Step 6: Commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/Work.tsx" \
        "app/(portfolio)/playground/_sections/Works/WorkModal.tsx" \
        "app/(portfolio)/playground/_sections/Works/data.tsx"
git commit -m "revert: 모달 라이트 테마 오버라이드를 걷어내고 다크 테마로 복원"
```

---

### Task 3: 자산군 섹션 재작성 (통화·인라인 그룹·수정·Enter 제출)

**Files:**
- Create: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/input-sections/GroupPicker.tsx`
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/input-sections/GroupAssetSection.tsx` (전체 교체)

**Interfaces:**
- Consumes: `AssetClass`, `Currency`, `Group`, `NewAssetClassInput` (Task 1)
- Produces: `GroupPickerProps`(`groups`, `value: string`, `onChange(groupId: string): void`, `onCreateGroup(name: string): string`) — Task 4(고정수입 섹션)도 이 `GroupPicker`를 그대로 가져다 쓴다. `GroupAssetSectionProps`에 `onAddGroup(name: string): string`, `onUpdateAssetClass(id, input): void`가 추가된다 — Task 7(InputPanel)과 Task 8(AssetSimulator)이 이 시그니처를 그대로 배선한다.

이 태스크는 **편집(edit) + Enter 제출 + 포커스 이동** 패턴의 기준 구현이다. Task 4~6도 동일한 패턴(행 클릭 시 폼에 값 채우기 → 버튼이 "저장"으로 바뀜 → 폼 컨테이너의 `onKeyDown`으로 Enter 감지 → 필수값 없으면 `ref.current?.focus()`)을 각자 파일에 반복 구현한다.

- [ ] **Step 1: GroupPicker.tsx 작성**

```tsx
"use client";

import { useState } from "react";
import { Group } from "../types";

const NEW_GROUP_VALUE = "__new__";
const NONE_VALUE = "";

type GroupPickerProps = {
  groups: Group[];
  value: string;
  onChange: (groupId: string) => void;
  onCreateGroup: (name: string) => string;
};

export default function GroupPicker({
  groups,
  value,
  onChange,
  onCreateGroup,
}: GroupPickerProps) {
  const [creating, setCreating] = useState(false);
  const [draftName, setDraftName] = useState("");

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === NEW_GROUP_VALUE) {
      setCreating(true);
      setDraftName("");
      return;
    }
    onChange(e.target.value);
  };

  const commitNewGroup = () => {
    const name = draftName.trim();
    if (!name) return;
    const id = onCreateGroup(name);
    setCreating(false);
    setDraftName("");
    onChange(id);
  };

  if (creating) {
    return (
      <div className="flex items-center gap-1">
        <input
          autoFocus
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.stopPropagation();
              commitNewGroup();
            }
            if (e.key === "Escape") {
              e.stopPropagation();
              setCreating(false);
            }
          }}
          placeholder="새 그룹 이름"
          className="w-28 rounded-full border border-white/60 bg-white/80 px-2 py-1 text-xs outline-none"
        />
        <button
          type="button"
          onClick={commitNewGroup}
          className="text-xs text-indigo-600 hover:text-indigo-800"
        >
          만들기
        </button>
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={handleSelectChange}
      className="rounded-full border border-white/60 bg-white/80 px-2 py-1 text-xs"
    >
      <option value={NONE_VALUE}>그룹 없음</option>
      {groups.map((group) => (
        <option key={group.id} value={group.id}>
          {group.name}
        </option>
      ))}
      <option value={NEW_GROUP_VALUE}>+ 새 그룹 만들기</option>
    </select>
  );
}
```

- [ ] **Step 2: GroupAssetSection.tsx 전체 교체**

```tsx
"use client";

import { useRef, useState } from "react";
import { AssetClass, Currency, Group, NewAssetClassInput } from "../types";
import GroupPicker from "./GroupPicker";

type GroupAssetSectionProps = {
  groups: Group[];
  onAddGroup: (name: string) => string;
  assetClasses: AssetClass[];
  onAddAssetClass: (input: NewAssetClassInput) => void;
  onUpdateAssetClass: (id: string, input: NewAssetClassInput) => void;
  onRemoveAssetClass: (id: string) => void;
  onSetPrimaryAsset: (id: string) => void;
};

export default function GroupAssetSection({
  groups,
  onAddGroup,
  assetClasses,
  onAddAssetClass,
  onUpdateAssetClass,
  onRemoveAssetClass,
  onSetPrimaryAsset,
}: GroupAssetSectionProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [groupId, setGroupId] = useState("");
  const [currency, setCurrency] = useState<Currency>("KRW");
  const [balance, setBalance] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [returnRate, setReturnRate] = useState("0");
  const [makePrimary, setMakePrimary] = useState(false);

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
      isPrimary:
        currency === "KRW" && (makePrimary || assetClasses.length === 0),
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
      <h3 className="text-sm font-semibold text-indigo-700">자산군</h3>
      <ul className="mt-2 flex flex-col gap-2">
        {assetClasses.map((asset) => {
          const group = groups.find((g) => g.id === asset.groupId);
          return (
            <li
              key={asset.id}
              onClick={() => startEdit(asset)}
              className="flex cursor-pointer items-center justify-between rounded-xl border border-indigo-100 bg-white/80 px-3 py-2 text-sm hover:border-indigo-300"
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
                {group && (
                  <span
                    className="h-2.5 w-2.5 rounded-full"
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
            placeholder="자산군 이름"
            className="flex-1 rounded-full border border-indigo-200 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-indigo-400"
          />
          <GroupPicker
            groups={groups}
            value={groupId}
            onChange={setGroupId}
            onCreateGroup={onAddGroup}
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
            {editingId ? "저장" : "자산군 추가"}
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

- [ ] **Step 3: 타입 체크**

Run: `npx tsc --noEmit 2>&1 | grep "GroupPicker.tsx\|GroupAssetSection.tsx"`
Expected: 출력 없음. (`InputPanel.tsx`가 아직 이 새 props를 안 넘겨서 나는 에러는 `InputPanel.tsx` 쪽에 표시되며, 이 시점엔 정상이다.)

- [ ] **Step 4: Commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/6_AssetSimulator/input-sections/GroupPicker.tsx" \
        "app/(portfolio)/playground/_sections/Works/6_AssetSimulator/input-sections/GroupAssetSection.tsx"
git commit -m "feat: 자산군 섹션에 통화·인라인 그룹·수정 기능 추가"
```

---

### Task 4: 수입 섹션 재작성 (고정수입 리스트화·그룹 배지·수정·Enter 제출·날짜 버그 수정)

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/input-sections/IncomeSection.tsx` (전체 교체)

**Interfaces:**
- Consumes: `FixedIncome`, `NewFixedIncomeInput`, `IrregularCashflow`, `NewIrregularCashflowInput`, `Group`, `HORIZON_MONTHS`, `formatMonthsFromNow` (Task 1), `monthIndexFromTargetDate` (Task 1), `GroupPicker` (Task 3)
- Produces: `IncomeSectionProps`(`groups`, `onAddGroup`, `fixedIncomes`, `onAddFixedIncome`, `onUpdateFixedIncome`, `onRemoveFixedIncome`, `irregularIncomes`, `onAddIrregularIncome`, `onUpdateIrregularIncome`, `onRemoveIrregularIncome`, `today`) — Task 7·8이 이 시그니처로 배선한다.

이 태스크에서 v1 리뷰가 찾은 Critical 버그(오늘 날짜로 등록한 비정기 수입이 계산에서 누락되는 문제)를 고친다: 날짜 선택기 기본값·`min`을 다음 달로 바꾸고, 1~`HORIZON_MONTHS` 범위를 벗어나면 등록을 막고 안내 문구를 보여준다.

- [ ] **Step 1: IncomeSection.tsx 전체 교체**

```tsx
"use client";

import { useRef, useState } from "react";
import {
  FixedIncome,
  Group,
  HORIZON_MONTHS,
  IrregularCashflow,
  NewFixedIncomeInput,
  NewIrregularCashflowInput,
  formatMonthsFromNow,
} from "../types";
import { monthIndexFromTargetDate } from "../simulation";
import GroupPicker from "./GroupPicker";

type IncomeSectionProps = {
  groups: Group[];
  onAddGroup: (name: string) => string;
  fixedIncomes: FixedIncome[];
  onAddFixedIncome: (input: NewFixedIncomeInput) => void;
  onUpdateFixedIncome: (id: string, input: NewFixedIncomeInput) => void;
  onRemoveFixedIncome: (id: string) => void;
  irregularIncomes: IrregularCashflow[];
  onAddIrregularIncome: (input: NewIrregularCashflowInput) => void;
  onUpdateIrregularIncome: (id: string, input: NewIrregularCashflowInput) => void;
  onRemoveIrregularIncome: (id: string) => void;
  today: Date;
};

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function toMonthInputValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function IncomeSection({
  groups,
  onAddGroup,
  fixedIncomes,
  onAddFixedIncome,
  onUpdateFixedIncome,
  onRemoveFixedIncome,
  irregularIncomes,
  onAddIrregularIncome,
  onUpdateIrregularIncome,
  onRemoveIrregularIncome,
  today,
}: IncomeSectionProps) {
  const nextMonthValue = toMonthInputValue(addMonths(today, 1));

  const [fixedEditingId, setFixedEditingId] = useState<string | null>(null);
  const [fixedName, setFixedName] = useState("");
  const [fixedAmount, setFixedAmount] = useState("");
  const [fixedGroupId, setFixedGroupId] = useState("");
  const fixedNameRef = useRef<HTMLInputElement>(null);
  const fixedAmountRef = useRef<HTMLInputElement>(null);

  const [irregularEditingId, setIrregularEditingId] = useState<string | null>(
    null,
  );
  const [irregularName, setIrregularName] = useState("");
  const [irregularAmount, setIrregularAmount] = useState("");
  const [irregularDate, setIrregularDate] = useState(nextMonthValue);
  const [irregularError, setIrregularError] = useState<string | null>(null);
  const irregularNameRef = useRef<HTMLInputElement>(null);
  const irregularAmountRef = useRef<HTMLInputElement>(null);
  const irregularDateRef = useRef<HTMLInputElement>(null);

  const resetFixedForm = () => {
    setFixedEditingId(null);
    setFixedName("");
    setFixedAmount("");
    setFixedGroupId("");
  };

  const startEditFixed = (item: FixedIncome) => {
    setFixedEditingId(item.id);
    setFixedName(item.name);
    setFixedAmount(String(item.amount));
    setFixedGroupId(item.groupId ?? "");
  };

  const handleSubmitFixed = () => {
    if (!fixedName.trim()) {
      fixedNameRef.current?.focus();
      return;
    }
    if (!fixedAmount || Number(fixedAmount) === 0) {
      fixedAmountRef.current?.focus();
      return;
    }
    const input: NewFixedIncomeInput = {
      name: fixedName.trim(),
      amount: Number(fixedAmount),
      groupId: fixedGroupId || undefined,
    };
    if (fixedEditingId) {
      onUpdateFixedIncome(fixedEditingId, input);
    } else {
      onAddFixedIncome(input);
    }
    resetFixedForm();
  };

  const resetIrregularForm = () => {
    setIrregularEditingId(null);
    setIrregularName("");
    setIrregularAmount("");
    setIrregularDate(nextMonthValue);
    setIrregularError(null);
  };

  const startEditIrregular = (item: IrregularCashflow) => {
    setIrregularEditingId(item.id);
    setIrregularName(item.name);
    setIrregularAmount(String(item.amount));
    setIrregularDate(item.targetDate);
    setIrregularError(null);
  };

  const handleSubmitIrregular = () => {
    if (!irregularName.trim()) {
      irregularNameRef.current?.focus();
      return;
    }
    if (!irregularAmount || Number(irregularAmount) === 0) {
      irregularAmountRef.current?.focus();
      return;
    }
    const monthsFromNow = monthIndexFromTargetDate(irregularDate, today);
    if (monthsFromNow < 1 || monthsFromNow > HORIZON_MONTHS) {
      setIrregularError(
        `1개월 후부터 ${HORIZON_MONTHS}개월 후 사이의 날짜만 선택할 수 있습니다.`,
      );
      irregularDateRef.current?.focus();
      return;
    }
    setIrregularError(null);
    const input: NewIrregularCashflowInput = {
      name: irregularName.trim(),
      amount: Number(irregularAmount),
      targetDate: irregularDate,
    };
    if (irregularEditingId) {
      onUpdateIrregularIncome(irregularEditingId, input);
    } else {
      onAddIrregularIncome(input);
    }
    resetIrregularForm();
  };

  const handleFixedKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmitFixed();
    }
  };

  const handleIrregularKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmitIrregular();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-emerald-200 bg-white/70 p-4 backdrop-blur">
        <h3 className="text-sm font-semibold text-emerald-700">고정수입</h3>
        <ul className="mt-2 flex flex-col gap-2">
          {fixedIncomes.map((item) => {
            const group = groups.find((g) => g.id === item.groupId);
            return (
              <li
                key={item.id}
                onClick={() => startEditFixed(item)}
                className="flex cursor-pointer items-center justify-between rounded-xl border border-emerald-100 bg-white/80 px-3 py-2 text-sm hover:border-emerald-300"
              >
                <span className="flex items-center gap-2">
                  {group && (
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: group.color }}
                    />
                  )}
                  {item.name} · {item.amount.toLocaleString()}원/월
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFixedIncome(item.id);
                  }}
                  className="text-gray-400 hover:text-gray-700"
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
        <div className="mt-3 flex flex-col gap-2" onKeyDown={handleFixedKeyDown}>
          <div className="flex gap-2">
            <input
              ref={fixedNameRef}
              value={fixedName}
              onChange={(e) => setFixedName(e.target.value)}
              placeholder="예: 월급, 부수입"
              className="flex-1 rounded-full border border-emerald-200 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-emerald-400"
            />
            <GroupPicker
              groups={groups}
              value={fixedGroupId}
              onChange={setFixedGroupId}
              onCreateGroup={onAddGroup}
            />
          </div>
          <input
            ref={fixedAmountRef}
            value={fixedAmount}
            onChange={(e) => setFixedAmount(e.target.value)}
            type="number"
            placeholder="금액"
            className="rounded-full border border-emerald-200 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-emerald-400"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSubmitFixed}
              className="self-start rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-600"
            >
              {fixedEditingId ? "저장" : "추가"}
            </button>
            {fixedEditingId && (
              <button
                type="button"
                onClick={resetFixedForm}
                className="self-start rounded-full px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700"
              >
                취소
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-white/70 p-4 backdrop-blur">
        <h3 className="text-sm font-semibold text-emerald-700">비정기 수입</h3>
        <ul className="mt-2 flex flex-col gap-2">
          {irregularIncomes.map((item) => {
            const monthsFromNow = monthIndexFromTargetDate(
              item.targetDate,
              today,
            );
            return (
              <li
                key={item.id}
                onClick={() => startEditIrregular(item)}
                className="flex cursor-pointer items-center justify-between rounded-xl border border-emerald-100 bg-white/80 px-3 py-2 text-sm hover:border-emerald-300"
              >
                <span>
                  {item.name} · {item.amount.toLocaleString()}원 ·{" "}
                  {formatMonthsFromNow(monthsFromNow)}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveIrregularIncome(item.id);
                  }}
                  className="text-gray-400 hover:text-gray-700"
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
        <div
          className="mt-3 flex flex-col gap-2"
          onKeyDown={handleIrregularKeyDown}
        >
          <input
            ref={irregularNameRef}
            value={irregularName}
            onChange={(e) => setIrregularName(e.target.value)}
            placeholder="예: 프리랜서 계약금"
            className="rounded-full border border-emerald-200 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-emerald-400"
          />
          <input
            ref={irregularAmountRef}
            value={irregularAmount}
            onChange={(e) => setIrregularAmount(e.target.value)}
            type="number"
            placeholder="금액"
            className="rounded-full border border-emerald-200 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-emerald-400"
          />
          <div className="flex items-center gap-2">
            <input
              ref={irregularDateRef}
              value={irregularDate}
              onChange={(e) => setIrregularDate(e.target.value)}
              type="month"
              min={nextMonthValue}
              className="rounded-full border border-emerald-200 bg-white/80 px-3 py-1.5 text-sm"
            />
            <span className="text-xs text-gray-500">
              {formatMonthsFromNow(
                monthIndexFromTargetDate(irregularDate, today),
              )}
            </span>
          </div>
          {irregularError && (
            <p className="text-xs text-rose-500">{irregularError}</p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSubmitIrregular}
              className="self-start rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-600"
            >
              {irregularEditingId ? "저장" : "추가"}
            </button>
            {irregularEditingId && (
              <button
                type="button"
                onClick={resetIrregularForm}
                className="self-start rounded-full px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700"
              >
                취소
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit 2>&1 | grep "IncomeSection.tsx"`
Expected: 출력 없음.

- [ ] **Step 3: Commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/6_AssetSimulator/input-sections/IncomeSection.tsx"
git commit -m "feat: 고정수입을 리스트화하고 수입 섹션에 수정 기능·날짜 검증 추가"
```

---

### Task 5: 지출 섹션 재작성 (로즈 색상·수정·Enter 제출·날짜 버그 수정)

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/input-sections/ExpenseSection.tsx` (전체 교체)

**Interfaces:**
- Consumes: `FixedExpense`, `NewFixedExpenseInput`, `IrregularCashflow`, `NewIrregularCashflowInput`, `HORIZON_MONTHS`, `formatMonthsFromNow` (Task 1), `monthIndexFromTargetDate` (Task 1)
- Produces: `ExpenseSectionProps`(`fixedExpenses`, `onAddFixedExpense`, `onUpdateFixedExpense`, `onRemoveFixedExpense`, `irregularExpenses`, `onAddIrregularExpense`, `onUpdateIrregularExpense`, `onRemoveIrregularExpense`, `today`) — Task 7·8이 이 시그니처로 배선한다. 지출은 그룹을 지원하지 않는다(스펙에서 확정된 범위).

Task 4와 동일한 날짜 버그 수정(다음 달 기본값·`min`, 1~`HORIZON_MONTHS` 범위 검증)을 지출 쪽에도 적용한다.

- [ ] **Step 1: ExpenseSection.tsx 전체 교체**

```tsx
"use client";

import { useRef, useState } from "react";
import {
  FixedExpense,
  HORIZON_MONTHS,
  IrregularCashflow,
  NewFixedExpenseInput,
  NewIrregularCashflowInput,
  formatMonthsFromNow,
} from "../types";
import { monthIndexFromTargetDate } from "../simulation";

type ExpenseSectionProps = {
  fixedExpenses: FixedExpense[];
  onAddFixedExpense: (input: NewFixedExpenseInput) => void;
  onUpdateFixedExpense: (id: string, input: NewFixedExpenseInput) => void;
  onRemoveFixedExpense: (id: string) => void;
  irregularExpenses: IrregularCashflow[];
  onAddIrregularExpense: (input: NewIrregularCashflowInput) => void;
  onUpdateIrregularExpense: (id: string, input: NewIrregularCashflowInput) => void;
  onRemoveIrregularExpense: (id: string) => void;
  today: Date;
};

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function toMonthInputValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function ExpenseSection({
  fixedExpenses,
  onAddFixedExpense,
  onUpdateFixedExpense,
  onRemoveFixedExpense,
  irregularExpenses,
  onAddIrregularExpense,
  onUpdateIrregularExpense,
  onRemoveIrregularExpense,
  today,
}: ExpenseSectionProps) {
  const nextMonthValue = toMonthInputValue(addMonths(today, 1));

  const [fixedEditingId, setFixedEditingId] = useState<string | null>(null);
  const [fixedName, setFixedName] = useState("");
  const [fixedAmount, setFixedAmount] = useState("");
  const fixedNameRef = useRef<HTMLInputElement>(null);
  const fixedAmountRef = useRef<HTMLInputElement>(null);

  const [irregularEditingId, setIrregularEditingId] = useState<string | null>(
    null,
  );
  const [irregularName, setIrregularName] = useState("");
  const [irregularAmount, setIrregularAmount] = useState("");
  const [irregularDate, setIrregularDate] = useState(nextMonthValue);
  const [irregularError, setIrregularError] = useState<string | null>(null);
  const irregularNameRef = useRef<HTMLInputElement>(null);
  const irregularAmountRef = useRef<HTMLInputElement>(null);
  const irregularDateRef = useRef<HTMLInputElement>(null);

  const resetFixedForm = () => {
    setFixedEditingId(null);
    setFixedName("");
    setFixedAmount("");
  };

  const startEditFixed = (item: FixedExpense) => {
    setFixedEditingId(item.id);
    setFixedName(item.name);
    setFixedAmount(String(item.amount));
  };

  const handleSubmitFixed = () => {
    if (!fixedName.trim()) {
      fixedNameRef.current?.focus();
      return;
    }
    if (!fixedAmount || Number(fixedAmount) === 0) {
      fixedAmountRef.current?.focus();
      return;
    }
    const input: NewFixedExpenseInput = {
      name: fixedName.trim(),
      amount: Number(fixedAmount),
    };
    if (fixedEditingId) {
      onUpdateFixedExpense(fixedEditingId, input);
    } else {
      onAddFixedExpense(input);
    }
    resetFixedForm();
  };

  const resetIrregularForm = () => {
    setIrregularEditingId(null);
    setIrregularName("");
    setIrregularAmount("");
    setIrregularDate(nextMonthValue);
    setIrregularError(null);
  };

  const startEditIrregular = (item: IrregularCashflow) => {
    setIrregularEditingId(item.id);
    setIrregularName(item.name);
    setIrregularAmount(String(item.amount));
    setIrregularDate(item.targetDate);
    setIrregularError(null);
  };

  const handleSubmitIrregular = () => {
    if (!irregularName.trim()) {
      irregularNameRef.current?.focus();
      return;
    }
    if (!irregularAmount || Number(irregularAmount) === 0) {
      irregularAmountRef.current?.focus();
      return;
    }
    const monthsFromNow = monthIndexFromTargetDate(irregularDate, today);
    if (monthsFromNow < 1 || monthsFromNow > HORIZON_MONTHS) {
      setIrregularError(
        `1개월 후부터 ${HORIZON_MONTHS}개월 후 사이의 날짜만 선택할 수 있습니다.`,
      );
      irregularDateRef.current?.focus();
      return;
    }
    setIrregularError(null);
    const input: NewIrregularCashflowInput = {
      name: irregularName.trim(),
      amount: Number(irregularAmount),
      targetDate: irregularDate,
    };
    if (irregularEditingId) {
      onUpdateIrregularExpense(irregularEditingId, input);
    } else {
      onAddIrregularExpense(input);
    }
    resetIrregularForm();
  };

  const handleFixedKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmitFixed();
    }
  };

  const handleIrregularKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmitIrregular();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-rose-200 bg-white/70 p-4 backdrop-blur">
        <h3 className="text-sm font-semibold text-rose-700">고정지출</h3>
        <ul className="mt-2 flex flex-col gap-2">
          {fixedExpenses.map((item) => (
            <li
              key={item.id}
              onClick={() => startEditFixed(item)}
              className="flex cursor-pointer items-center justify-between rounded-xl border border-rose-100 bg-white/80 px-3 py-2 text-sm hover:border-rose-300"
            >
              <span>
                {item.name} · {item.amount.toLocaleString()}원/월
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveFixedExpense(item.id);
                }}
                className="text-gray-400 hover:text-gray-700"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex gap-2" onKeyDown={handleFixedKeyDown}>
          <input
            ref={fixedNameRef}
            value={fixedName}
            onChange={(e) => setFixedName(e.target.value)}
            placeholder="예: 월세, 구독료"
            className="flex-1 rounded-full border border-rose-200 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-rose-400"
          />
          <input
            ref={fixedAmountRef}
            value={fixedAmount}
            onChange={(e) => setFixedAmount(e.target.value)}
            type="number"
            placeholder="금액"
            className="w-28 rounded-full border border-rose-200 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-rose-400"
          />
          <button
            type="button"
            onClick={handleSubmitFixed}
            className="rounded-full bg-rose-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-rose-600"
          >
            {fixedEditingId ? "저장" : "추가"}
          </button>
          {fixedEditingId && (
            <button
              type="button"
              onClick={resetFixedForm}
              className="rounded-full px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              취소
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-rose-200 bg-white/70 p-4 backdrop-blur">
        <h3 className="text-sm font-semibold text-rose-700">비정기 지출</h3>
        <ul className="mt-2 flex flex-col gap-2">
          {irregularExpenses.map((item) => {
            const monthsFromNow = monthIndexFromTargetDate(
              item.targetDate,
              today,
            );
            return (
              <li
                key={item.id}
                onClick={() => startEditIrregular(item)}
                className="flex cursor-pointer items-center justify-between rounded-xl border border-rose-100 bg-white/80 px-3 py-2 text-sm hover:border-rose-300"
              >
                <span>
                  {item.name} · {item.amount.toLocaleString()}원 ·{" "}
                  {formatMonthsFromNow(monthsFromNow)}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveIrregularExpense(item.id);
                  }}
                  className="text-gray-400 hover:text-gray-700"
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
        <div
          className="mt-3 flex flex-col gap-2"
          onKeyDown={handleIrregularKeyDown}
        >
          <input
            ref={irregularNameRef}
            value={irregularName}
            onChange={(e) => setIrregularName(e.target.value)}
            placeholder="예: 여행, 가전 교체"
            className="rounded-full border border-rose-200 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-rose-400"
          />
          <input
            ref={irregularAmountRef}
            value={irregularAmount}
            onChange={(e) => setIrregularAmount(e.target.value)}
            type="number"
            placeholder="금액"
            className="rounded-full border border-rose-200 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-rose-400"
          />
          <div className="flex items-center gap-2">
            <input
              ref={irregularDateRef}
              value={irregularDate}
              onChange={(e) => setIrregularDate(e.target.value)}
              type="month"
              min={nextMonthValue}
              className="rounded-full border border-rose-200 bg-white/80 px-3 py-1.5 text-sm"
            />
            <span className="text-xs text-gray-500">
              {formatMonthsFromNow(
                monthIndexFromTargetDate(irregularDate, today),
              )}
            </span>
          </div>
          {irregularError && (
            <p className="text-xs text-rose-500">{irregularError}</p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSubmitIrregular}
              className="self-start rounded-full bg-rose-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-rose-600"
            >
              {irregularEditingId ? "저장" : "추가"}
            </button>
            {irregularEditingId && (
              <button
                type="button"
                onClick={resetIrregularForm}
                className="self-start rounded-full px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700"
              >
                취소
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit 2>&1 | grep "ExpenseSection.tsx"`
Expected: 출력 없음.

- [ ] **Step 3: Commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/6_AssetSimulator/input-sections/ExpenseSection.tsx"
git commit -m "feat: 지출 섹션에 로즈 색상·수정 기능·날짜 검증 추가"
```

---

### Task 6: 이체 규칙 섹션 재작성 (앰버 색상·수정·Enter 제출·통화 일치 필터)

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/input-sections/TransferRuleSection.tsx` (전체 교체)

**Interfaces:**
- Consumes: `AssetClass`(currency 포함), `NewTransferRuleInput`, `TransferFrequency`, `TransferMode`, `TransferRule` (Task 1)
- Produces: `TransferRuleSectionProps`(`assetClasses`, `transferRules`, `onAddTransferRule`, `onUpdateTransferRule`, `onRemoveTransferRule`) — Task 7·8이 이 시그니처로 배선한다.

도착 자산군 select는 출발 자산군과 **같은 통화**인 자산만 보여준다. 출발 자산을 바꾸면 도착 선택은 초기화된다.

- [ ] **Step 1: TransferRuleSection.tsx 전체 교체**

```tsx
"use client";

import { useRef, useState } from "react";
import {
  AssetClass,
  NewTransferRuleInput,
  TransferFrequency,
  TransferMode,
  TransferRule,
} from "../types";

type TransferRuleSectionProps = {
  assetClasses: AssetClass[];
  transferRules: TransferRule[];
  onAddTransferRule: (input: NewTransferRuleInput) => void;
  onUpdateTransferRule: (id: string, input: NewTransferRuleInput) => void;
  onRemoveTransferRule: (id: string) => void;
};

export default function TransferRuleSection({
  assetClasses,
  transferRules,
  onAddTransferRule,
  onUpdateTransferRule,
  onRemoveTransferRule,
}: TransferRuleSectionProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fromAssetId, setFromAssetId] = useState("");
  const [toAssetId, setToAssetId] = useState("");
  const [mode, setMode] = useState<TransferMode>("fixed");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<TransferFrequency>("monthly");
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
    setFrequency("monthly");
  };

  const startEdit = (rule: TransferRule) => {
    setEditingId(rule.id);
    setFromAssetId(rule.fromAssetId);
    setToAssetId(rule.toAssetId);
    setMode(rule.mode);
    setAmount(String(rule.amount));
    setFrequency(rule.frequency);
  };

  const handleSubmit = () => {
    if (!effectiveFrom || !effectiveTo || effectiveFrom === effectiveTo) return;
    if (!amount || Number(amount) === 0) {
      amountRef.current?.focus();
      return;
    }
    const input: NewTransferRuleInput = {
      fromAssetId: effectiveFrom,
      toAssetId: effectiveTo,
      mode,
      amount: Number(amount),
      frequency,
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
      <h3 className="text-sm font-semibold text-amber-700">이체 규칙</h3>
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
              · {rule.frequency === "monthly" ? "매월" : "매년"}
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
              <option value="">같은 통화 자산군이 없습니다</option>
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
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as TransferFrequency)}
            className="rounded-full border border-amber-200 bg-white/80 px-3 py-1.5 text-sm"
          >
            <option value="monthly">매월</option>
            <option value="yearly">매년</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={sameCurrencyAssets.length === 0}
            className="self-start rounded-full bg-amber-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {editingId ? "저장" : "이체 규칙 추가"}
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

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit 2>&1 | grep "TransferRuleSection.tsx"`
Expected: 출력 없음.

- [ ] **Step 3: Commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/6_AssetSimulator/input-sections/TransferRuleSection.tsx"
git commit -m "feat: 이체 규칙 섹션에 앰버 색상·수정 기능·통화 일치 필터 추가"
```

---

### Task 7: InputPanel.tsx 재배선

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/InputPanel.tsx` (전체 교체)

**Interfaces:**
- Consumes: Task 3~6이 만든 4개 섹션의 최종 Props 시그니처 그대로.
- Produces: `InputPanelProps` 최종본 — Task 8(AssetSimulator.tsx)이 이 시그니처로 배선한다. v1과 달리 `onRemoveGroup`은 없다(그룹 삭제 UI 없음, 스펙 확정 사항).

- [ ] **Step 1: InputPanel.tsx 전체 교체**

```tsx
"use client";

import {
  AssetClass,
  FixedExpense,
  FixedIncome,
  Group,
  IrregularCashflow,
  NewAssetClassInput,
  NewFixedExpenseInput,
  NewFixedIncomeInput,
  NewIrregularCashflowInput,
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
  assetClasses: AssetClass[];
  onAddAssetClass: (input: NewAssetClassInput) => void;
  onUpdateAssetClass: (id: string, input: NewAssetClassInput) => void;
  onRemoveAssetClass: (id: string) => void;
  onSetPrimaryAsset: (id: string) => void;
  fixedIncomes: FixedIncome[];
  onAddFixedIncome: (input: NewFixedIncomeInput) => void;
  onUpdateFixedIncome: (id: string, input: NewFixedIncomeInput) => void;
  onRemoveFixedIncome: (id: string) => void;
  irregularIncomes: IrregularCashflow[];
  onAddIrregularIncome: (input: NewIrregularCashflowInput) => void;
  onUpdateIrregularIncome: (id: string, input: NewIrregularCashflowInput) => void;
  onRemoveIrregularIncome: (id: string) => void;
  fixedExpenses: FixedExpense[];
  onAddFixedExpense: (input: NewFixedExpenseInput) => void;
  onUpdateFixedExpense: (id: string, input: NewFixedExpenseInput) => void;
  onRemoveFixedExpense: (id: string) => void;
  irregularExpenses: IrregularCashflow[];
  onAddIrregularExpense: (input: NewIrregularCashflowInput) => void;
  onUpdateIrregularExpense: (id: string, input: NewIrregularCashflowInput) => void;
  onRemoveIrregularExpense: (id: string) => void;
  transferRules: TransferRule[];
  onAddTransferRule: (input: NewTransferRuleInput) => void;
  onUpdateTransferRule: (id: string, input: NewTransferRuleInput) => void;
  onRemoveTransferRule: (id: string) => void;
  today: Date;
};

export default function InputPanel(props: InputPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <GroupAssetSection
        groups={props.groups}
        onAddGroup={props.onAddGroup}
        assetClasses={props.assetClasses}
        onAddAssetClass={props.onAddAssetClass}
        onUpdateAssetClass={props.onUpdateAssetClass}
        onRemoveAssetClass={props.onRemoveAssetClass}
        onSetPrimaryAsset={props.onSetPrimaryAsset}
      />
      <IncomeSection
        groups={props.groups}
        onAddGroup={props.onAddGroup}
        fixedIncomes={props.fixedIncomes}
        onAddFixedIncome={props.onAddFixedIncome}
        onUpdateFixedIncome={props.onUpdateFixedIncome}
        onRemoveFixedIncome={props.onRemoveFixedIncome}
        irregularIncomes={props.irregularIncomes}
        onAddIrregularIncome={props.onAddIrregularIncome}
        onUpdateIrregularIncome={props.onUpdateIrregularIncome}
        onRemoveIrregularIncome={props.onRemoveIrregularIncome}
        today={props.today}
      />
      <ExpenseSection
        fixedExpenses={props.fixedExpenses}
        onAddFixedExpense={props.onAddFixedExpense}
        onUpdateFixedExpense={props.onUpdateFixedExpense}
        onRemoveFixedExpense={props.onRemoveFixedExpense}
        irregularExpenses={props.irregularExpenses}
        onAddIrregularExpense={props.onAddIrregularExpense}
        onUpdateIrregularExpense={props.onUpdateIrregularExpense}
        onRemoveIrregularExpense={props.onRemoveIrregularExpense}
        today={props.today}
      />
      <TransferRuleSection
        assetClasses={props.assetClasses}
        transferRules={props.transferRules}
        onAddTransferRule={props.onAddTransferRule}
        onUpdateTransferRule={props.onUpdateTransferRule}
        onRemoveTransferRule={props.onRemoveTransferRule}
      />
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit 2>&1 | grep "InputPanel.tsx"`
Expected: 출력 없음(Task 3~6이 이미 끝나 있으므로 InputPanel.tsx 자체와 그 자식들 사이의 props 불일치는 없어야 한다. `AssetSimulator.tsx`가 아직 이 새 Props를 안 넘겨서 나는 에러는 `AssetSimulator.tsx` 쪽에 표시되며 이 시점엔 정상이다).

- [ ] **Step 3: Commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/6_AssetSimulator/InputPanel.tsx"
git commit -m "feat: InputPanel을 v2 4개 섹션 시그니처로 재배선"
```

---

### Task 8: AssetSimulator.tsx 전체 재배선 (컴파일 체크포인트)

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/useSimulation.ts` (today 파라미터 추가)
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/AssetSimulator.tsx` (전체 교체)

**Interfaces:**
- Consumes: Task 1의 모든 타입, Task 7의 `InputPanelProps`
- Produces: 없음(최상위 컴포넌트). **이 태스크가 끝나면 프로젝트 전체 `npx tsc --noEmit`이 완전히 clean해야 한다.**

차트 4개(`TimelineSlider`/`AssetAreaChart`/`GroupDonutChart`/`FlowDiagram`)의 호출부는 이번 태스크에서 건드리지 않는다 — v1과 동일한 props로 계속 호출한다(각 차트 자체의 라이트 리뷰·미분류 반영·통화 환산은 Task 9~11이 담당). `exchangeRate` 입력 UI와 총자산 표시 위치 이동, 헤더 타이틀은 Task 12(최종 조립)에서 추가한다 — 이 태스크는 상태·삭제 버그 수정에 집중한다.

이 태스크에서 v1 리뷰가 찾은 Important 버그를 고친다: 자산군 삭제 시 그 자산을 참조하는 이체 규칙이 남아있던 문제, 기본 계좌 삭제 시 새 기본 계좌가 자동 지정되지 않던 문제.

- [ ] **Step 1: useSimulation.ts에 today 파라미터 추가**

```ts
import { useMemo } from "react";
import { MonthSnapshot, SimulationInput } from "./types";
import { runSimulation } from "./simulation";

export function useSimulation(
  input: SimulationInput,
  today: Date,
): MonthSnapshot[] {
  return useMemo(() => runSimulation(input, today), [input, today]);
}
```

- [ ] **Step 2: AssetSimulator.tsx 전체 교체**

```tsx
"use client";

import { useMemo, useState } from "react";
import {
  AssetClass,
  FixedExpense,
  FixedIncome,
  Group,
  IrregularCashflow,
  NewAssetClassInput,
  NewFixedExpenseInput,
  NewFixedIncomeInput,
  NewIrregularCashflowInput,
  NewTransferRuleInput,
  SimulationInput,
  TransferRule,
  newId,
  nextGroupColor,
} from "./types";
import { useSimulation } from "./useSimulation";
import InputPanel from "./InputPanel";
import TimelineSlider from "./TimelineSlider";
import AssetAreaChart from "./AssetAreaChart";
import GroupDonutChart from "./GroupDonutChart";
import FlowDiagram from "./FlowDiagram";

export default function AssetSimulator() {
  const today = useMemo(() => new Date(), []);

  const [groups, setGroups] = useState<Group[]>([]);
  const [assetClasses, setAssetClasses] = useState<AssetClass[]>([]);
  const [fixedIncomes, setFixedIncomes] = useState<FixedIncome[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [irregularIncomes, setIrregularIncomes] = useState<
    IrregularCashflow[]
  >([]);
  const [irregularExpenses, setIrregularExpenses] = useState<
    IrregularCashflow[]
  >([]);
  const [transferRules, setTransferRules] = useState<TransferRule[]>([]);
  const [exchangeRate, setExchangeRate] = useState(1350);
  const [selectedMonth, setSelectedMonth] = useState(0);

  const handleAddGroup = (name: string): string => {
    const id = newId();
    setGroups((prev) => [
      ...prev,
      { id, name, color: nextGroupColor(prev.length) },
    ]);
    return id;
  };

  const handleAddAssetClass = (input: NewAssetClassInput) => {
    setAssetClasses((prev) => [
      ...(input.isPrimary
        ? prev.map((a) => ({ ...a, isPrimary: false }))
        : prev),
      { id: newId(), ...input },
    ]);
  };
  const handleUpdateAssetClass = (id: string, input: NewAssetClassInput) => {
    setAssetClasses((prev) =>
      prev.map((a) => {
        if (a.id === id) return { ...a, ...input };
        if (input.isPrimary) return { ...a, isPrimary: false };
        return a;
      }),
    );
  };
  const handleRemoveAssetClass = (id: string) => {
    setAssetClasses((prev) => {
      const removed = prev.find((a) => a.id === id);
      const rest = prev.filter((a) => a.id !== id);
      if (removed?.isPrimary) {
        const nextPrimary = rest.find((a) => a.currency === "KRW");
        if (nextPrimary) {
          return rest.map((a) =>
            a.id === nextPrimary.id ? { ...a, isPrimary: true } : a,
          );
        }
      }
      return rest;
    });
    setTransferRules((prev) =>
      prev.filter((r) => r.fromAssetId !== id && r.toAssetId !== id),
    );
  };
  const handleSetPrimaryAsset = (id: string) => {
    setAssetClasses((prev) =>
      prev.map((a) => ({ ...a, isPrimary: a.id === id })),
    );
  };

  const handleAddFixedIncome = (input: NewFixedIncomeInput) => {
    setFixedIncomes((prev) => [...prev, { id: newId(), ...input }]);
  };
  const handleUpdateFixedIncome = (
    id: string,
    input: NewFixedIncomeInput,
  ) => {
    setFixedIncomes((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...input } : i)),
    );
  };
  const handleRemoveFixedIncome = (id: string) => {
    setFixedIncomes((prev) => prev.filter((i) => i.id !== id));
  };

  const handleAddIrregularIncome = (input: NewIrregularCashflowInput) => {
    setIrregularIncomes((prev) => [...prev, { id: newId(), ...input }]);
  };
  const handleUpdateIrregularIncome = (
    id: string,
    input: NewIrregularCashflowInput,
  ) => {
    setIrregularIncomes((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...input } : i)),
    );
  };
  const handleRemoveIrregularIncome = (id: string) => {
    setIrregularIncomes((prev) => prev.filter((i) => i.id !== id));
  };

  const handleAddFixedExpense = (input: NewFixedExpenseInput) => {
    setFixedExpenses((prev) => [...prev, { id: newId(), ...input }]);
  };
  const handleUpdateFixedExpense = (
    id: string,
    input: NewFixedExpenseInput,
  ) => {
    setFixedExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...input } : e)),
    );
  };
  const handleRemoveFixedExpense = (id: string) => {
    setFixedExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const handleAddIrregularExpense = (input: NewIrregularCashflowInput) => {
    setIrregularExpenses((prev) => [...prev, { id: newId(), ...input }]);
  };
  const handleUpdateIrregularExpense = (
    id: string,
    input: NewIrregularCashflowInput,
  ) => {
    setIrregularExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...input } : e)),
    );
  };
  const handleRemoveIrregularExpense = (id: string) => {
    setIrregularExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const handleAddTransferRule = (input: NewTransferRuleInput) => {
    setTransferRules((prev) => [...prev, { id: newId(), ...input }]);
  };
  const handleUpdateTransferRule = (
    id: string,
    input: NewTransferRuleInput,
  ) => {
    setTransferRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...input } : r)),
    );
  };
  const handleRemoveTransferRule = (id: string) => {
    setTransferRules((prev) => prev.filter((r) => r.id !== id));
  };

  const simulationInput = useMemo<SimulationInput>(
    () => ({
      groups,
      assetClasses,
      fixedIncomes,
      fixedExpenses,
      irregularIncomes,
      irregularExpenses,
      transferRules,
      exchangeRate,
    }),
    [
      groups,
      assetClasses,
      fixedIncomes,
      fixedExpenses,
      irregularIncomes,
      irregularExpenses,
      transferRules,
      exchangeRate,
    ],
  );

  const snapshots = useSimulation(simulationInput, today);
  const selectedSnapshot = snapshots[selectedMonth];
  const primaryAsset = assetClasses.find((a) => a.isPrimary);

  return (
    <div className="h-full w-full overflow-y-auto bg-gradient-to-br from-indigo-100 via-blue-50 to-purple-100 p-4 text-gray-800">
      <div className="grid gap-4 md:grid-cols-[320px_1fr]">
        <InputPanel
          groups={groups}
          onAddGroup={handleAddGroup}
          assetClasses={assetClasses}
          onAddAssetClass={handleAddAssetClass}
          onUpdateAssetClass={handleUpdateAssetClass}
          onRemoveAssetClass={handleRemoveAssetClass}
          onSetPrimaryAsset={handleSetPrimaryAsset}
          fixedIncomes={fixedIncomes}
          onAddFixedIncome={handleAddFixedIncome}
          onUpdateFixedIncome={handleUpdateFixedIncome}
          onRemoveFixedIncome={handleRemoveFixedIncome}
          irregularIncomes={irregularIncomes}
          onAddIrregularIncome={handleAddIrregularIncome}
          onUpdateIrregularIncome={handleUpdateIrregularIncome}
          onRemoveIrregularIncome={handleRemoveIrregularIncome}
          fixedExpenses={fixedExpenses}
          onAddFixedExpense={handleAddFixedExpense}
          onUpdateFixedExpense={handleUpdateFixedExpense}
          onRemoveFixedExpense={handleRemoveFixedExpense}
          irregularExpenses={irregularExpenses}
          onAddIrregularExpense={handleAddIrregularExpense}
          onUpdateIrregularExpense={handleUpdateIrregularExpense}
          onRemoveIrregularExpense={handleRemoveIrregularExpense}
          transferRules={transferRules}
          onAddTransferRule={handleAddTransferRule}
          onUpdateTransferRule={handleUpdateTransferRule}
          onRemoveTransferRule={handleRemoveTransferRule}
          today={today}
        />
        <div className="flex flex-col gap-4">
          <TimelineSlider
            selectedMonth={selectedMonth}
            onChange={setSelectedMonth}
            totalBalance={selectedSnapshot.totalBalance}
            today={today}
          />
          <AssetAreaChart
            snapshots={snapshots}
            groups={groups}
            selectedMonth={selectedMonth}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <GroupDonutChart
              groups={groups}
              assetClasses={assetClasses}
              snapshot={selectedSnapshot}
            />
            <FlowDiagram
              snapshot={selectedSnapshot}
              primaryAsset={primaryAsset}
              assetClasses={assetClasses}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
```

`exchangeRate`/`setExchangeRate`는 이 태스크에서 상태로만 존재하고 아직 UI가 없다 — Step 3에서 미사용 변수 경고가 없는지 확인하고, 있다면(예: `setExchangeRate`가 아직 어디서도 안 쓰여 나는 경고) Task 12에서 실제로 쓰일 것임을 인지하고 넘어간다(Task 12가 이 파일에 환율 입력 UI를 추가하면서 해결된다).

- [ ] **Step 3: 전체 타입 체크 및 린트 (컴파일 체크포인트)**

Run: `npx tsc --noEmit && npm run lint`
Expected: **에러 없음.** Task 1~8이 모두 끝난 지금부터는 프로젝트 전체가 clean해야 한다. 에러가 남아있다면 Task 3~7 중 어딘가 프롭 이름이 어긋난 것이니 찾아서 고친다.

- [ ] **Step 4: 수동 확인**

Run: `npm run dev`, `http://localhost:3000/asset-simulator` 접속.

- 그룹 없이 자산군 하나(KRW, "현금", 100만원)를 추가하면 기본 계좌로 자동 지정되는지 확인한다.
- 그 자산군을 삭제하면(다른 자산군이 없으므로) 흐름도가 다시 "기본 계좌를 지정하면…" 안내로 돌아가는지 확인한다.
- 자산군 2개(둘 다 KRW)를 만들고 첫 번째를 기본 계좌로 지정한 뒤, 첫 번째를 삭제하면 두 번째가 자동으로 기본 계좌가 되는지 확인한다(배지가 옮겨감).
- 자산군 2개를 이체 규칙으로 연결한 뒤 출발 자산군을 삭제하면, 이체 규칙 목록에서 그 규칙이 함께 사라지는지 확인한다.
- 고정수입을 여러 개 추가하고, 그중 하나를 클릭해 수정 폼이 채워지는지, 저장하면 목록이 갱신되는지 확인한다.

- [ ] **Step 5: Commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/6_AssetSimulator/useSimulation.ts" \
        "app/(portfolio)/playground/_sections/Works/6_AssetSimulator/AssetSimulator.tsx"
git commit -m "feat: AssetSimulator 상태를 v2로 재배선하고 삭제 시 이체규칙·기본계좌 버그 수정"
```

---

### Task 9: AssetAreaChart 갱신 (총자산 표시 이동·미분류 밴드·축약 포맷)

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/AssetAreaChart.tsx` (전체 교체)
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/AssetSimulator.tsx:AssetAreaChart 호출부` (`assetClasses` prop 추가)

**Interfaces:**
- Consumes: `AssetClass`, `Group`, `MonthSnapshot`, `UNGROUPED_COLOR`, `UNGROUPED_LABEL`, `formatKRW` (Task 1)
- Produces: `AssetAreaChartProps`(`snapshots`, `groups`, `assetClasses`, `selectedMonth`) — Task 12가 최종 그리드에서 이 시그니처로 호출한다.

v1 최종 리뷰의 Minor 발견(빈 상태 조건이 `groups.length===0`만 봐서, 그룹은 있지만 자산군이 없을 때 안내 문구 대신 빈 그래프가 뜨던 문제)을 여기서 고친다 — `assetClasses.length === 0`을 기준으로 바꾼다.

- [ ] **Step 1: AssetAreaChart.tsx 전체 교체**

```tsx
"use client";

import {
  AssetClass,
  Group,
  MonthSnapshot,
  UNGROUPED_COLOR,
  UNGROUPED_LABEL,
  formatKRW,
} from "./types";

type AssetAreaChartProps = {
  snapshots: MonthSnapshot[];
  groups: Group[];
  assetClasses: AssetClass[];
  selectedMonth: number;
};

const WIDTH = 600;
const HEIGHT = 220;
const PADDING = 12;

export default function AssetAreaChart({
  snapshots,
  groups,
  assetClasses,
  selectedMonth,
}: AssetAreaChartProps) {
  if (assetClasses.length === 0 || snapshots.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-2xl border border-white/40 bg-white/70 text-sm text-gray-400 backdrop-blur">
        자산군을 추가하면 그래프가 나타납니다
      </div>
    );
  }

  const hasUngrouped = assetClasses.some((a) => !a.groupId);
  const bandDefs = [
    ...groups.map((g) => ({ id: g.id, color: g.color })),
    ...(hasUngrouped
      ? [{ id: "__ungrouped__", color: UNGROUPED_COLOR }]
      : []),
  ];

  const maxTotal = Math.max(1, ...snapshots.map((s) => s.totalBalance));
  const stepX = (WIDTH - PADDING * 2) / (snapshots.length - 1);
  const scaleY = (value: number) =>
    HEIGHT - PADDING - (value / maxTotal) * (HEIGHT - PADDING * 2);

  const { bands } = bandDefs.reduce<{
    prevTop: number[];
    bands: { id: string; color: string; points: string }[];
  }>(
    (acc, band) => {
      const bottom = acc.prevTop;
      const top = snapshots.map((snapshot, i) => {
        const value =
          band.id === "__ungrouped__"
            ? snapshot.ungroupedTotalKRW
            : (snapshot.groupTotals[band.id] ?? 0);
        return bottom[i] + value;
      });

      const topPoints = top.map(
        (value, i) => `${PADDING + i * stepX},${scaleY(value)}`,
      );
      const bottomPoints = bottom
        .map((value, i) => `${PADDING + i * stepX},${scaleY(value)}`)
        .reverse();

      return {
        prevTop: top,
        bands: [
          ...acc.bands,
          {
            id: band.id,
            color: band.color,
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
        총자산{" "}
        <span className="text-lg font-semibold text-gray-800">
          {formatKRW(totalBalance)}
        </span>
      </p>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="mt-2 w-full">
        {bands.map((band) => (
          <polygon
            key={band.id}
            points={band.points}
            fill={band.color}
            fillOpacity={0.55}
          />
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
    </div>
  );
}
```

- [ ] **Step 2: AssetSimulator.tsx의 AssetAreaChart 호출부 수정**

`<AssetAreaChart ... />` 호출에 `assetClasses={assetClasses}`를 추가한다:

```tsx
          <AssetAreaChart
            snapshots={snapshots}
            groups={groups}
            assetClasses={assetClasses}
            selectedMonth={selectedMonth}
          />
```

- [ ] **Step 3: 타입 체크 및 린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음(Task 8부터 계속 clean 상태 유지).

- [ ] **Step 4: 수동 확인**

그룹 없이 자산군만 하나 추가하면(미분류) 회색 밴드 하나로 그래프가 그려지는지, 그룹 있는 자산군과 없는 자산군을 섞으면 색상 밴드 + 회색 밴드가 함께 쌓이는지, 카드 상단에 "총자산" 금액이 축약 포맷(`1.1억원`/`3293만원` 등)으로 표시되고 슬라이더를 움직이면 갱신되는지 확인한다.

- [ ] **Step 5: Commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/6_AssetSimulator/AssetAreaChart.tsx" \
        "app/(portfolio)/playground/_sections/Works/6_AssetSimulator/AssetSimulator.tsx"
git commit -m "feat: 영역 그래프에 총자산 표시·미분류 밴드·축약 포맷 추가"
```

---

### Task 10: TimelineSlider 갱신 (총자산 표시 제거·N년 M개월 라벨)

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/TimelineSlider.tsx` (전체 교체)
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/AssetSimulator.tsx:TimelineSlider 호출부` (`totalBalance` prop 제거)

**Interfaces:**
- Consumes: `HORIZON_MONTHS`, `formatMonthsFromNow` (Task 1)
- Produces: `TimelineSliderProps`(`selectedMonth`, `onChange`, `today` — `totalBalance` 제거됨) — Task 12가 최종 호출부에서 이 시그니처를 쓴다.

- [ ] **Step 1: TimelineSlider.tsx 전체 교체**

```tsx
"use client";

import { HORIZON_MONTHS, formatMonthsFromNow } from "./types";

type TimelineSliderProps = {
  selectedMonth: number;
  onChange: (month: number) => void;
  today: Date;
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
}: TimelineSliderProps) {
  return (
    <div className="rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
      <span className="text-sm text-gray-500">
        {selectedMonth === 0
          ? "지금"
          : `${formatMonthsFromNow(selectedMonth)} · ${formatMonthLabel(selectedMonth, today)}`}
      </span>
      <input
        type="range"
        min={0}
        max={HORIZON_MONTHS}
        value={selectedMonth}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 w-full accent-indigo-500"
      />
    </div>
  );
}
```

- [ ] **Step 2: AssetSimulator.tsx의 TimelineSlider 호출부 수정**

`<TimelineSlider ... />`에서 `totalBalance={selectedSnapshot.totalBalance}` 줄을 삭제한다:

```tsx
          <TimelineSlider
            selectedMonth={selectedMonth}
            onChange={setSelectedMonth}
            today={today}
          />
```

- [ ] **Step 3: 타입 체크 및 린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음.

- [ ] **Step 4: 수동 확인**

슬라이더를 13개월 후 근처로 옮기면 라벨이 "1년 1개월 후 · YYYY.MM" 형태로 보이는지, 정확히 12개월 후는 "1년 후"(0개월 생략)로 보이는지, 11개월 이하는 기존처럼 "N개월 후"로 보이는지 확인한다. 카드에 더 이상 금액이 표시되지 않는지 확인한다(Task 9에서 영역 그래프 카드로 옮겨졌다).

- [ ] **Step 5: Commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/6_AssetSimulator/TimelineSlider.tsx" \
        "app/(portfolio)/playground/_sections/Works/6_AssetSimulator/AssetSimulator.tsx"
git commit -m "feat: 타임라인 슬라이더에서 총자산 표시 제거하고 년/월 라벨 지원"
```

---

### Task 11: GroupDonutChart 갱신 (실제 금액 표시·미분류 탭·통화 환산 버그 수정)

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/GroupDonutChart.tsx` (전체 교체)

**Interfaces:**
- Consumes: `AssetClass`, `Group`, `MonthSnapshot`, `UNGROUPED_LABEL`, `formatKRW` (Task 1)
- Produces: `GroupDonutChartProps`(`groups`, `assetClasses`, `snapshot`) — 시그니처는 v1과 동일, `AssetSimulator.tsx` 호출부는 변경 없음.

v1은 그룹 내 비율을 `snapshot.assetBalances`(자산 고유 통화, 미환산)로 계산해 `snapshot.groupTotals`(KRW)와 나누는 통화 불일치 버그가 있었다 — 이번에 `snapshot.assetBalancesKRW`로 고친다. 추가로 조각마다 비율(%)뿐 아니라 `formatKRW` 실금액을 표시하고, 그룹 없는 자산군이 있으면 "미분류" 탭을 추가한다.

- [ ] **Step 1: GroupDonutChart.tsx 전체 교체**

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

const SLICE_COLORS = [
  "#6366f1",
  "#a855f7",
  "#14b8a6",
  "#ec4899",
  "#3b82f6",
  "#f59e0b",
];

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
        그룹을 추가하면 비율을 확인합니다
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
    (acc, asset, i) => {
      const amount = snapshot.assetBalancesKRW[asset.id] ?? 0;
      const ratio = tabTotal > 0 ? amount / tabTotal : 0;
      const dash = ratio * CIRCUMFERENCE;
      const slice: Slice = {
        id: asset.id,
        name: asset.name,
        amount,
        ratio,
        color: SLICE_COLORS[i % SLICE_COLORS.length],
        dashArray: `${dash} ${CIRCUMFERENCE - dash}`,
        dashOffset: -acc.offset,
      };
      return { offset: acc.offset + dash, items: [...acc.items, slice] };
    },
    { offset: 0, items: [] },
  );

  return (
    <div className="rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
      <div className="flex flex-wrap gap-2">
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

- [ ] **Step 2: 타입 체크 및 린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음.

- [ ] **Step 3: 수동 확인**

한 그룹에 KRW 자산군과 USD 자산군을 함께 넣고(환율을 설정한 상태여야 함 — 아직 Task 12 전이라 환율 입력 UI가 없으므로 기본값 1350이 적용된다), 비율이 두 자산의 KRW 환산 금액 기준으로 정확히 나뉘는지 확인한다(달러 잔액을 그대로 원화 총액과 비교하던 v1 버그가 고쳐졌는지). 그룹 없는 자산군을 하나 추가하면 "미분류" 탭이 나타나고, 그 탭에서 실금액이 함께 표시되는지 확인한다.

- [ ] **Step 4: Commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/6_AssetSimulator/GroupDonutChart.tsx"
git commit -m "fix: 도넛 차트 그룹 비율을 KRW 환산 기준으로 계산하고 실금액·미분류 탭 추가"
```

---

### Task 12: 비교 차트 신규 + 최종 조립 (2×2 그리드·환율 입력·헤더·폭 확장·robots.ts)

**Files:**
- Create: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/ComparisonBarChart.tsx`
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/AssetSimulator.tsx` (전체 교체 — 최종본)
- Modify: `app/(services)/asset-simulator/page.tsx` (`max-w-5xl` → `max-w-[1600px]`)
- Modify: `app/robots.ts` (`/asset-simulator` 경로 추가)

**Interfaces:**
- Consumes: `AssetClass`, `Group`, `MonthSnapshot`, `UNGROUPED_COLOR`, `formatKRW`, `formatMonthsFromNow` (Task 1)
- Produces: `ComparisonBarChartProps`(`snapshots`, `groups`, `assetClasses`, `selectedMonth`). 이 태스크로 `AssetSimulator.tsx`는 최종 형태가 되며 이후 태스크는 이 파일을 건드리지 않는다.

이 태스크에서 v1 리뷰가 찾은 Important 버그(`/asset-simulator`가 `robots.ts` 허용 목록에서 빠져 크롤링 안 되던 문제)도 함께 고친다. 누적 막대의 스택 계산도 Task 9·10과 동일한 이유로 `let` 재할당 대신 `reduce`를 쓴다(이 저장소 ESLint의 `react-hooks` 규칙 때문 — 렌더 중 외부 변수 재할당을 금지한다).

- [ ] **Step 1: ComparisonBarChart.tsx 작성**

```tsx
"use client";

import {
  AssetClass,
  Group,
  MonthSnapshot,
  UNGROUPED_COLOR,
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

type Segment = { id: string; color: string; y: number; height: number };

export default function ComparisonBarChart({
  snapshots,
  groups,
  assetClasses,
  selectedMonth,
}: ComparisonBarChartProps) {
  if (assetClasses.length === 0 || snapshots.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-2xl border border-white/40 bg-white/70 text-sm text-gray-400 backdrop-blur">
        자산군을 추가하면 비교 그래프가 나타납니다
      </div>
    );
  }

  const nowSnapshot = snapshots[0];
  const futureSnapshot = snapshots[selectedMonth];
  const hasUngrouped = assetClasses.some((a) => !a.groupId);
  const segmentDefs = [
    ...groups.map((g) => ({ id: g.id, color: g.color })),
    ...(hasUngrouped ? [{ id: "__ungrouped__", color: UNGROUPED_COLOR }] : []),
  ];

  const maxTotal = Math.max(
    1,
    nowSnapshot.totalBalance,
    futureSnapshot.totalBalance,
  );

  const buildSegments = (snapshot: MonthSnapshot): Segment[] => {
    const { segments } = segmentDefs.reduce<{
      cursor: number;
      segments: Segment[];
    }>(
      (acc, def) => {
        const value =
          def.id === "__ungrouped__"
            ? snapshot.ungroupedTotalKRW
            : (snapshot.groupTotals[def.id] ?? 0);
        const height = (value / maxTotal) * MAX_BAR_HEIGHT;
        const y = BASE_Y - acc.cursor - height;
        return {
          cursor: acc.cursor + height,
          segments: [
            ...acc.segments,
            { id: def.id, color: def.color, y, height },
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
            fill={seg.color}
            fillOpacity={0.75}
          />
        ))}
        {futureSegments.map((seg) => (
          <rect
            key={seg.id}
            x={futureX}
            y={seg.y}
            width={BAR_WIDTH}
            height={Math.max(0, seg.height)}
            fill={seg.color}
            fillOpacity={0.75}
          />
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
    </div>
  );
}
```

- [ ] **Step 2: AssetSimulator.tsx 전체 교체**

Task 8의 파일에서 `import` 목록에 `ComparisonBarChart`를 추가하고, `return` 블록을 아래로 교체한다(상태·핸들러·`simulationInput`·`useSimulation` 호출부는 Task 8 그대로 유지):

```tsx
  return (
    <div className="h-full w-full overflow-y-auto bg-gradient-to-br from-indigo-100 via-blue-50 to-purple-100 p-4 text-gray-800">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-gray-800">자산 시뮬레이터</h2>
          <label className="flex items-center gap-2 text-xs text-gray-600">
            환율(1달러 = 원)
            <input
              type="number"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(Number(e.target.value) || 0)}
              className="w-24 rounded-full border border-white/60 bg-white/80 px-2 py-1 text-sm"
            />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-[360px_1fr]">
          <InputPanel
            groups={groups}
            onAddGroup={handleAddGroup}
            assetClasses={assetClasses}
            onAddAssetClass={handleAddAssetClass}
            onUpdateAssetClass={handleUpdateAssetClass}
            onRemoveAssetClass={handleRemoveAssetClass}
            onSetPrimaryAsset={handleSetPrimaryAsset}
            fixedIncomes={fixedIncomes}
            onAddFixedIncome={handleAddFixedIncome}
            onUpdateFixedIncome={handleUpdateFixedIncome}
            onRemoveFixedIncome={handleRemoveFixedIncome}
            irregularIncomes={irregularIncomes}
            onAddIrregularIncome={handleAddIrregularIncome}
            onUpdateIrregularIncome={handleUpdateIrregularIncome}
            onRemoveIrregularIncome={handleRemoveIrregularIncome}
            fixedExpenses={fixedExpenses}
            onAddFixedExpense={handleAddFixedExpense}
            onUpdateFixedExpense={handleUpdateFixedExpense}
            onRemoveFixedExpense={handleRemoveFixedExpense}
            irregularExpenses={irregularExpenses}
            onAddIrregularExpense={handleAddIrregularExpense}
            onUpdateIrregularExpense={handleUpdateIrregularExpense}
            onRemoveIrregularExpense={handleRemoveIrregularExpense}
            transferRules={transferRules}
            onAddTransferRule={handleAddTransferRule}
            onUpdateTransferRule={handleUpdateTransferRule}
            onRemoveTransferRule={handleRemoveTransferRule}
            today={today}
          />
          <div className="flex flex-col gap-4">
            <TimelineSlider
              selectedMonth={selectedMonth}
              onChange={setSelectedMonth}
              today={today}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <AssetAreaChart
                snapshots={snapshots}
                groups={groups}
                assetClasses={assetClasses}
                selectedMonth={selectedMonth}
              />
              <ComparisonBarChart
                snapshots={snapshots}
                groups={groups}
                assetClasses={assetClasses}
                selectedMonth={selectedMonth}
              />
              <GroupDonutChart
                groups={groups}
                assetClasses={assetClasses}
                snapshot={selectedSnapshot}
              />
              <FlowDiagram
                snapshot={selectedSnapshot}
                primaryAsset={primaryAsset}
                assetClasses={assetClasses}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

`import` 목록 맨 아래에 다음 줄을 추가한다:

```tsx
import ComparisonBarChart from "./ComparisonBarChart";
```

- [ ] **Step 3: 서비스 페이지 폭 확장**

`app/(services)/asset-simulator/page.tsx`에서 `max-w-5xl`을 `max-w-[1600px]`로 바꾼다:

```tsx
      <div className="h-full w-full max-w-[1600px]">
```

- [ ] **Step 4: robots.ts에 경로 추가**

`app/robots.ts`의 `allow` 배열에 `"/nemo-nemo-beam",` 다음 줄로 추가한다:

```ts
          "/asset-simulator",
```

- [ ] **Step 5: 전체 타입 체크 및 린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음.

- [ ] **Step 6: 수동 확인**

`/asset-simulator`에서 결과 영역이 2×2 그리드(영역 그래프·비교 막대·도넛·흐름도)로 보이는지, 상단에 "자산 시뮬레이터" 제목과 환율 입력이 보이는지 확인한다. 환율을 바꾸면 USD 자산이 있는 경우 도넛·영역 그래프 총액이 즉시 갱신되는지 확인한다. 비교 막대 차트에서 "지금"과 선택 시점 막대가 그룹별 색상으로 나뉘어 나오고, 슬라이더를 옮기면 오른쪽 막대만 바뀌는지 확인한다. `cat app/robots.ts`로 `/asset-simulator`가 허용 목록에 있는지 확인한다.

- [ ] **Step 7: Commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/6_AssetSimulator/ComparisonBarChart.tsx" \
        "app/(portfolio)/playground/_sections/Works/6_AssetSimulator/AssetSimulator.tsx" \
        "app/(services)/asset-simulator/page.tsx" \
        "app/robots.ts"
git commit -m "feat: 지금 vs 선택 시점 비교 막대 차트 추가하고 2x2 레이아웃·환율 입력·폭 확장으로 최종 조립"
```

---

### Task 13: 전체 골든 패스 수동 검증

**Files:** 없음(코드 변경 없음, 검증만).

**Interfaces:** 없음.

- [ ] **Step 1: 타입 체크·린트 최종 확인**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음.

- [ ] **Step 2: 모달 다크 테마 회귀 확인**

Run: `npm run dev`. `/playground`에서 뜨개뜨개 등 기존 Work 모달을 열어 다크 테마가 정상인지, 자산 시뮬레이터 모달도 이제 다크 크롬(헤더·설명 패널)인지 확인한다.

- [ ] **Step 3: 카테고리 색상 확인**

자산군(인디고) / 고정·비정기 수입(에메랄드) / 고정·비정기 지출(로즈) / 이체 규칙(앰버) 카드 테두리·강조 버튼 색이 서로 다르게 보이는지 확인한다.

- [ ] **Step 4: 통화·환율 골든 패스**

KRW 자산군 하나(기본 계좌)와 USD 자산군 하나를 만든다. 환율을 1400으로 바꾸고 도넛·영역 그래프·비교 막대의 총액이 함께 바뀌는지 확인한다. USD 자산군에는 기본 계좌 라디오·체크박스가 비활성화되어 있는지 확인한다. 이체 규칙 화면에서 KRW→USD로는 이체를 만들 수 없는지(도착 select에 표시 안 됨) 확인한다.

- [ ] **Step 5: 그룹·수정·키보드 UX 골든 패스**

자산군 추가 폼에서 그룹 select로 "+ 새 그룹 만들기"를 선택해 그룹을 즉석 생성하고 바로 선택되는지 확인한다. 고정수입에도 같은 그룹을 지정할 수 있는지 확인한다. 자산군·고정수입·고정지출·비정기수입·비정기지출·이체규칙 6개 리스트 모두에서 행을 클릭하면 폼이 채워지고 "저장"으로 바뀌는지, 저장하면 목록이 갱신되는지 확인한다. 이름을 비운 채 금액 입력창에서 Enter를 누르면 이름 입력창으로 포커스가 이동하는지, 이름과 금액을 채운 뒤 Enter를 누르면 즉시 추가되는지 확인한다.

- [ ] **Step 6: 시각화·포맷 골든 패스**

자산 합계가 1억을 넘도록 큰 값을 입력해 "총자산" 표시가 `1.1억원` 형식으로 축약되는지, 슬라이더를 13개월 이상으로 옮기면 "1년 1개월 후" 형식으로 라벨이 바뀌는지 확인한다. 2×2 그리드의 4개 차트(영역·비교 막대·도넛·흐름도)가 같은 선택 시점 기준으로 일관되게 보이는지 확인한다. 그룹 없는 자산군을 하나 추가해 영역 그래프에 회색 "미분류" 밴드가, 도넛 차트에 "미분류" 탭이 나타나는지 확인한다.

- [ ] **Step 7: v1 리뷰 버그 회귀 확인**

비정기 수입/지출을 등록할 때 날짜 선택기가 이번 달을 고를 수 없게 막는지(다음 달부터 시작), 등록 후 목록에 정확한 "N개월 후" 라벨이 붙는지 확인한다. 자산군 2개를 이체 규칙으로 연결한 뒤 출발 자산군을 삭제하면 이체 규칙도 함께 사라지는지, 기본 계좌를 삭제하면 남은 KRW 자산군 중 하나가 자동으로 기본 계좌가 되는지 확인한다. `curl -s http://localhost:3000/robots.txt | grep asset-simulator`로 크롤링 허용 경로에 포함됐는지 확인한다.

- [ ] **Step 8: 독립 페이지 확인**

`/asset-simulator`(모달이 아닌 독립 페이지)에서도 위 항목들이 동일하게 동작하는지, 페이지 폭이 이전보다 넓어졌는지 확인한다.

이 태스크는 커밋할 코드 변경이 없다. 문제를 발견하면 해당 태스크로 돌아가 수정하고, 그 태스크의 커밋에 이어서(또는 새 커밋으로) 반영한다.

---
