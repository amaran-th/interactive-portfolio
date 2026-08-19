import {
  AssetClass,
  Goal,
  GOAL_SEARCH_CAP_MONTHS,
  Group,
  MonthSnapshot,
  RepeatSchedule,
  SimulationInput,
  formatMonthsFromNow,
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

export function fires(
  schedule: RepeatSchedule,
  month: number,
  today: Date,
): boolean {
  if (schedule.mode === "once") {
    return monthIndexFromTargetDate(schedule.date, today) === month;
  }
  const start = monthIndexFromTargetDate(schedule.startDate, today);
  const period = schedule.frequency === "monthly" ? 1 : 12;
  if (month < start || (month - start) % period !== 0) return false;
  const occurrence = (month - start) / period + 1;
  if (schedule.until.type === "count") return occurrence <= schedule.until.count;
  if (schedule.until.type === "date") {
    return month <= monthIndexFromTargetDate(schedule.until.date, today);
  }
  return true;
}

export function validateSchedule(
  schedule: RepeatSchedule,
  today: Date,
  horizonMonths: number,
): string | null {
  const rangeMessage = `1개월 후부터 ${formatMonthsFromNow(horizonMonths)} 사이의 날짜만 선택할 수 있습니다.`;

  if (schedule.mode === "once") {
    const m = monthIndexFromTargetDate(schedule.date, today);
    if (!Number.isFinite(m) || m < 1 || m > horizonMonths) return rangeMessage;
    return null;
  }

  const start = monthIndexFromTargetDate(schedule.startDate, today);
  if (!Number.isFinite(start) || start < 1 || start > horizonMonths) {
    return rangeMessage;
  }

  if (schedule.until.type === "date") {
    const until = monthIndexFromTargetDate(schedule.until.date, today);
    if (!Number.isFinite(until) || until < start) {
      return "종료 날짜는 시작 날짜보다 이후여야 합니다.";
    }
  }
  if (schedule.until.type === "count" && schedule.until.count < 1) {
    return "반복 횟수는 1 이상이어야 합니다.";
  }
  return null;
}

function toKRW(
  asset: AssetClass,
  nativeBalance: number,
  exchangeRate: number,
): number {
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
    assetBalancesKRW[asset.id] = toKRW(
      asset,
      balances[asset.id] ?? 0,
      exchangeRate,
    );
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
  today: Date,
  horizonMonths: number,
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

  for (let month = 1; month <= horizonMonths; month++) {
    const flow: MonthSnapshot["flow"] = {
      incomeIn: 0,
      expenseOut: 0,
      transfers: [],
    };

    if (primary) {
      const incomeIn = input.incomes
        .filter((item) => fires(item.schedule, month, today))
        .reduce((sum, item) => sum + item.amount, 0);
      balances[primary.id] += incomeIn;
      flow.incomeIn = incomeIn;

      const expenseOut = input.expenses
        .filter((item) => fires(item.schedule, month, today))
        .reduce((sum, item) => sum + item.amount, 0);
      balances[primary.id] -= expenseOut;
      flow.expenseOut = expenseOut;
    }

    for (const rule of transferRules) {
      if (!fires(rule.schedule, month, today)) continue;

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

function goalMetricValue(goal: Goal, snapshot: MonthSnapshot): number {
  if (goal.metric.type === "total") return snapshot.totalBalance;
  if (goal.metric.type === "asset") {
    return snapshot.assetBalancesKRW[goal.metric.assetId] ?? 0;
  }
  return snapshot.groupTotals[goal.metric.groupId] ?? 0;
}

export function findGoalAchievementMonth(
  input: SimulationInput,
  goal: Goal,
  today: Date,
  searchCapMonths: number = GOAL_SEARCH_CAP_MONTHS,
): number | null {
  const snapshots = runSimulation(input, today, searchCapMonths);
  const found = snapshots.find(
    (s) => goalMetricValue(goal, s) >= goal.targetAmount,
  );
  return found ? found.monthIndex : null;
}
