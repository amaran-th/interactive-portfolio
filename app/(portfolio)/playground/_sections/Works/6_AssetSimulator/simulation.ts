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

function computeGroupTotals(
  balances: Record<string, number>,
  assetClasses: AssetClass[],
  groups: Group[],
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const group of groups) {
    totals[group.id] = 0;
  }
  for (const asset of assetClasses) {
    totals[asset.groupId] = (totals[asset.groupId] ?? 0) + balances[asset.id];
  }
  return totals;
}

function sumBalances(balances: Record<string, number>): number {
  return Object.values(balances).reduce((sum, value) => sum + value, 0);
}

export function runSimulation(
  input: SimulationInput,
  today: Date = new Date(),
): MonthSnapshot[] {
  const { groups, assetClasses, transferRules } = input;
  const primary = assetClasses.find((asset) => asset.isPrimary);

  const balances: Record<string, number> = {};
  for (const asset of assetClasses) {
    balances[asset.id] = asset.initialBalance;
  }

  const snapshots: MonthSnapshot[] = [
    {
      monthIndex: 0,
      assetBalances: { ...balances },
      groupTotals: computeGroupTotals(balances, assetClasses, groups),
      totalBalance: sumBalances(balances),
      flow: { incomeIn: 0, expenseOut: 0, transfers: [] },
    },
  ];

  for (let month = 1; month <= HORIZON_MONTHS; month++) {
    const flow: MonthSnapshot["flow"] = {
      incomeIn: 0,
      expenseOut: 0,
      transfers: [],
    };

    if (primary) {
      const irregularIncomeThisMonth = input.irregularIncomes
        .filter(
          (item) => monthIndexFromTargetDate(item.targetDate, today) === month,
        )
        .reduce((sum, item) => sum + item.amount, 0);
      const incomeIn = input.monthlyIncome + irregularIncomeThisMonth;
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

    snapshots.push({
      monthIndex: month,
      assetBalances: { ...balances },
      groupTotals: computeGroupTotals(balances, assetClasses, groups),
      totalBalance: sumBalances(balances),
      flow,
    });
  }

  return snapshots;
}
