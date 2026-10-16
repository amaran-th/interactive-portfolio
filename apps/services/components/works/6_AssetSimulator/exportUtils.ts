import {
  AmountAdjustment,
  AssetClass,
  ExpenseItem,
  IncomeItem,
  MonthSnapshot,
  Scenario,
  TransferRule,
  newId,
} from "./types";

/** 예전 형식의 금액 변동. direction(인상/인하), frequency(매월/매년),
 * until(종료 조건)을 가졌고, 그보다 더 옛 형식은 kind/persist 필드와
 * startDate를 썼다. */
type LegacyAmountAdjustment = {
  id: string;
  type: "percent" | "amount";
  value: number;
  direction?: "increase" | "decrease";
  fromDate?: string;
  startDate?: string;
};

/** 금액 변동은 이제 "fromDate부터 매년 무기한 인상" 하나만 표현한다.
 * 옛 형식의 인하 변동은 표현할 수 없으므로 버리고, 나머지는 시작월·
 * 단위·값만 남긴다(주기·종료 조건은 무시). */
function migrateAdjustment(
  adj: LegacyAmountAdjustment,
): AmountAdjustment | null {
  if (adj.direction === "decrease") return null;
  const fromDate = adj.fromDate ?? adj.startDate;
  if (!fromDate) return null;
  return { id: adj.id, type: adj.type, value: adj.value, fromDate };
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
  // 달러 자산 기능을 없애면서 쓰지 않게 된 환율·통화 필드는 버린다.
  const scenario = { ...(parsed as Scenario & { exchangeRate?: number }) };
  delete scenario.exchangeRate;
  const normalizeAsset = (a: AssetClass & { currency?: string }): AssetClass => {
    const asset = Object.assign({ interestCycle: { mode: "monthly" } }, a);
    delete asset.currency;
    return asset;
  };
  // 금액 변동은 이제 항목당 1개만 허용하므로, 옛 시나리오에 여러 개가
  // 있었다면 첫 번째만 남긴다.
  const normalizeAdjustments = <T extends { adjustments?: unknown[] }>(
    item: T,
  ): T & { adjustments: AmountAdjustment[] } => ({
    ...item,
    adjustments: ((item.adjustments ?? []) as LegacyAmountAdjustment[])
      .map(migrateAdjustment)
      .filter((adj): adj is AmountAdjustment => adj !== null)
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
        Math.round(snapshot.assetBalances[a.id] ?? 0),
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
