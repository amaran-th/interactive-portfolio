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
  groupId?: string;
  schedule: RepeatSchedule;
};

export type ExpenseItem = {
  id: string;
  name: string;
  amount: number;
  groupId?: string;
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

export type NewIncomeItemInput = {
  name: string;
  amount: number;
  groupId?: string;
  schedule: RepeatSchedule;
};

export type NewExpenseItemInput = {
  name: string;
  amount: number;
  groupId?: string;
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
export const DEFAULT_HORIZON_YEARS = 10;
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

export const UNGROUPED_LABEL = "미분류";
export const UNGROUPED_COLOR = "#9ca3af";

export function nextGroupColor(existingCount: number): string {
  return GROUP_PALETTE[existingCount % GROUP_PALETTE.length];
}

export function nextAssetColor(existingCount: number): string {
  return GROUP_PALETTE[existingCount % GROUP_PALETTE.length];
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
