import { AssetClass, MonthSnapshot, Scenario, newId } from "./types";

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

/** Loosely validates the parsed shape and reassigns a fresh id so an
 * imported scenario never collides with an existing one. */
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
  return { ...(parsed as Scenario), id: newId() };
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
