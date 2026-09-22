import {
  AmountAdjustment,
  AssetClass,
  ExpenseItem,
  IncomeItem,
  MonthSnapshot,
  RepeatUntil,
  Scenario,
  TransferRule,
  newId,
} from "./types";

/** kind/persist 필드를 쓰던 옛 형식(effect 축 도입 전)의 금액 변동. */
type LegacyAmountAdjustment = {
  id: string;
  type: "percent" | "amount";
  direction: "increase" | "decrease";
  value: number;
} & (
  | { kind: "period"; fromDate: string; toDate?: string }
  | {
      kind: "recurring";
      startDate: string;
      frequency: "monthly" | "yearly";
      until: RepeatUntil;
      persist: boolean;
    }
);

function isLegacyAdjustment(
  adj: AmountAdjustment | LegacyAmountAdjustment,
): adj is LegacyAmountAdjustment {
  return "kind" in adj;
}

/** 옛 kind/persist 필드를 지금의 단일 구조로 변환한다. 값 변동은 이제
 * 항상 지속적이고, 단발/반복 구분도 없다(반복 구조 하나로 통일, 횟수
 * 1회 = 옛 단발 변동과 동일). period는 fromDate만 남기고 toDate(원복
 * 기한)는 버린 뒤 횟수 1회로 채운다. recurring은 startDate→fromDate로
 * 이름만 바꾸면 나머지(frequency, until)는 그대로 옮겨 담을 수 있다. */
function migrateAdjustment(
  adj: AmountAdjustment | LegacyAmountAdjustment,
): AmountAdjustment {
  if (!isLegacyAdjustment(adj)) return adj;
  const shared = {
    id: adj.id,
    type: adj.type,
    direction: adj.direction,
    value: adj.value,
  };
  if (adj.kind === "period") {
    return {
      ...shared,
      fromDate: adj.fromDate,
      frequency: "yearly",
      until: { type: "count", count: 1 },
    };
  }
  return {
    ...shared,
    fromDate: adj.startDate,
    frequency: adj.frequency,
    until: adj.until,
  };
}

export function todayStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function downloadTextFile(
  filename: string,
  content: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportScenarioJson(scenario: Scenario): void {
  const json = JSON.stringify(scenario, null, 2);
  downloadTextFile(
    `자산시뮬레이터_${scenario.name}_${todayStamp()}.json`,
    json,
    "application/json",
  );
}

/** 이 필드들이 추가되기 전에 내보낸 시나리오 JSON을 가져올 때, 없는
 * 필드를 기본값으로 채운다. 시나리오 상태는 localStorage에 저장되지
 * 않고 항상 seedScenario()로 새로 시드되므로, 하위호환이 필요한 건
 * 이 JSON import 경로 하나뿐이다. 파싱 후 id를 newId()로 새로 부여해
 * 가져온 시나리오가 기존 시나리오와 충돌하지 않게 한다. */
export function parseScenarioJson(text: string): Scenario | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("name" in parsed) ||
    !("assetClasses" in parsed) ||
    !Array.isArray((parsed as Scenario).assetClasses)
  ) {
    return null;
  }
  const scenario = parsed as Scenario;
  const normalizeAsset = (a: AssetClass): AssetClass =>
    Object.assign({ interestCycle: { mode: "monthly" } }, a);
  // 금액 변동은 이제 항목당 1개만 허용하므로, 옛 시나리오에 여러 개가
  // 있었다면 첫 번째만 남긴다.
  const normalizeAdjustments = <T extends { adjustments?: unknown[] }>(
    item: T,
  ): T & { adjustments: AmountAdjustment[] } => ({
    ...item,
    adjustments: (
      (item.adjustments ?? []) as (AmountAdjustment | LegacyAmountAdjustment)[]
    )
      .map(migrateAdjustment)
      .slice(0, 1),
  });
  return {
    ...scenario,
    id: newId(),
    assetClasses: scenario.assetClasses.map(normalizeAsset),
    incomes: (scenario.incomes ?? []).map((i: IncomeItem) =>
      normalizeAdjustments(i),
    ),
    expenses: (scenario.expenses ?? []).map((e: ExpenseItem) =>
      normalizeAdjustments(e),
    ),
    transferRules: (scenario.transferRules ?? []).map((t: TransferRule) =>
      normalizeAdjustments(t),
    ),
  };
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function exportSnapshotsCsv(
  snapshots: MonthSnapshot[],
  assetClasses: AssetClass[],
  today: Date,
  scenarioName: string,
): void {
  const header = [
    "월",
    "날짜",
    ...assetClasses.map((a) => a.name),
    "총자산",
    "수입",
    "지출",
    "이체총액",
  ];
  const rows = snapshots.map((snapshot) => {
    const date = new Date(
      today.getFullYear(),
      today.getMonth() + snapshot.monthIndex,
      1,
    );
    const dateLabel = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}`;
    const transferTotal = snapshot.flow.transfers.reduce(
      (sum, t) => sum + t.amount,
      0,
    );
    return [
      snapshot.monthIndex,
      dateLabel,
      ...assetClasses.map((a) =>
        Math.round(snapshot.assetBalancesKRW[a.id] ?? 0),
      ),
      Math.round(snapshot.totalBalance),
      Math.round(snapshot.flow.incomeIn),
      Math.round(snapshot.flow.expenseOut),
      Math.round(transferTotal),
    ];
  });
  const csv = [header, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\n");
  // BOM so Excel opens the Korean headers as UTF-8 instead of guessing ANSI.
  downloadTextFile(
    `자산시뮬레이터_월별데이터_${scenarioName}_${todayStamp()}.csv`,
    `﻿${csv}`,
    "text/csv;charset=utf-8",
  );
}
