export type Group = {
  id: string;
  name: string;
  color: string;
};

export type AssetClass = {
  id: string;
  name: string;
  groupId: string;
  initialBalance: number;
  annualReturnRate: number;
  isPrimary: boolean;
};

export type FixedExpense = {
  id: string;
  name: string;
  amount: number;
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
  monthlyIncome: number;
  fixedExpenses: FixedExpense[];
  irregularIncomes: IrregularCashflow[];
  irregularExpenses: IrregularCashflow[];
  transferRules: TransferRule[];
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
  groupTotals: Record<string, number>;
  totalBalance: number;
  flow: MonthFlow;
};

export type NewAssetClassInput = {
  name: string;
  groupId: string;
  initialBalance: number;
  annualReturnRate: number;
  isPrimary: boolean;
};

export type NewFixedExpenseInput = { name: string; amount: number };

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

export function nextGroupColor(existingCount: number): string {
  return GROUP_PALETTE[existingCount % GROUP_PALETTE.length];
}

export function newId(): string {
  return crypto.randomUUID();
}
