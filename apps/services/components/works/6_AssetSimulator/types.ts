export type Currency = "KRW" | "USD";

export type Group = {
  id: string;
  name: string;
  color: string;
};

/** Income/expense category — organizational only, unlike asset Group it
 * has no color (color has no real use for income/expense items). */
export type Category = {
  id: string;
  name: string;
};

export type AssetClass = {
  id: string;
  name: string;
  groupId?: string;
  currency: Currency;
  initialBalance: number;
  annualReturnRate: number;
  isPrimary: boolean;
  color: string;
};

export type RepeatUntil =
  | { type: "indefinite" }
  | { type: "date"; date: string }
  | { type: "count"; count: number };

export type RepeatSchedule =
  | { mode: "once"; date: string }
  | {
      mode: "recurring";
      startDate: string;
      frequency: "monthly" | "yearly";
      until: RepeatUntil;
    };

export type IncomeItem = {
  id: string;
  name: string;
  amount: number;
  categoryId?: string;
  schedule: RepeatSchedule;
};

export type ExpenseItem = {
  id: string;
  name: string;
  amount: number;
  categoryId?: string;
  schedule: RepeatSchedule;
};

export type TransferMode = "fixed" | "percentOfSource";

export type TransferRule = {
  id: string;
  fromAssetId: string;
  toAssetId: string;
  mode: TransferMode;
  amount: number;
  schedule: RepeatSchedule;
};

export type GoalMetric =
  | { type: "total" }
  | { type: "asset"; assetId: string }
  | { type: "group"; groupId: string };

export type Goal = {
  metric: GoalMetric;
  targetAmount: number;
};

export type Scenario = {
  id: string;
  name: string;
  groups: Group[];
  categories: Category[];
  assetClasses: AssetClass[];
  incomes: IncomeItem[];
  expenses: ExpenseItem[];
  transferRules: TransferRule[];
  exchangeRate: number;
  goal: Goal | null;
  inflationEnabled: boolean;
  inflationRate: number;
};

export type SimulationInput = {
  groups: Group[];
  assetClasses: AssetClass[];
  incomes: IncomeItem[];
  expenses: ExpenseItem[];
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
  /** Transfers that couldn't run because the source asset didn't have
   * enough balance to cover the requested amount. */
  failedTransfers: {
    ruleId: string;
    fromAssetId: string;
    toAssetId: string;
    amount: number;
  }[];
  /** Expenses that couldn't run because the primary asset didn't have
   * enough balance to cover them. */
  failedExpenses: { itemId: string; name: string; amount: number }[];
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
  color: string;
};

export type NewIncomeItemInput = {
  name: string;
  amount: number;
  categoryId?: string;
  schedule: RepeatSchedule;
};

export type NewExpenseItemInput = {
  name: string;
  amount: number;
  categoryId?: string;
  schedule: RepeatSchedule;
};

export type NewTransferRuleInput = {
  fromAssetId: string;
  toAssetId: string;
  mode: TransferMode;
  amount: number;
  schedule: RepeatSchedule;
};

export const HORIZON_PRESET_YEARS = [5, 10, 20, 30] as const;
export const DEFAULT_HORIZON_YEARS = 5;
export const GOAL_SEARCH_CAP_MONTHS = 6000;

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

export const UNGROUPED_COLOR = "#9ca3af";

/**
 * Groups and ungrouped assets each show as their own distinct color, so a
 * newly created one should draw from a single shared sequence — otherwise a
 * group and an ungrouped asset created independently can land on the same
 * palette slot and become visually indistinguishable.
 */
export function nextVisibleColor(
  groups: Group[],
  assetClasses: AssetClass[],
): string {
  const usedCount =
    groups.length + assetClasses.filter((a) => !a.groupId).length;
  return GROUP_PALETTE[usedCount % GROUP_PALETTE.length];
}

/**
 * Colors currently shown somewhere (every group's color, plus every
 * ungrouped asset's own color) — used to disable already-taken swatches in
 * color pickers so a newly picked color can't collide with one already in
 * use. Pass the item being edited's own id lists pre-filtered out so its
 * current color doesn't get disabled.
 */
export function usedColors(
  groups: Group[],
  assetClasses: AssetClass[],
): Set<string> {
  const colors = new Set<string>();
  for (const g of groups) colors.add(g.color);
  for (const a of assetClasses) {
    if (!a.groupId) colors.add(a.color);
  }
  return colors;
}

/**
 * A grouped asset has no color of its own — it shares its group's color.
 * An asset with no group is, by itself, a single-member group, so it keeps
 * its own color.
 */
export function assetColor(asset: AssetClass, groups: Group[]): string {
  const group = groups.find((g) => g.id === asset.groupId);
  return group ? group.color : asset.color;
}

export function newId(): string {
  return crypto.randomUUID();
}

export function toRealValue(
  nominal: number,
  months: number,
  annualRatePercent: number,
): number {
  return nominal / Math.pow(1 + annualRatePercent / 100, months / 12);
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

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function toMonthInputValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
