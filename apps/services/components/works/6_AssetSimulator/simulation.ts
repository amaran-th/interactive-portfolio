import {
  AmountAdjustment,
  AssetClass,
  Goal,
  GOAL_SEARCH_CAP_MONTHS,
  Group,
  MonthSnapshot,
  RepeatSchedule,
  RepeatUntil,
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

/** startDate부터 시작해 month(포함)까지 이 반복 일정이 총 몇 번 발생했는지 센다.
 * fires()는 "정확히 이 달에 발생하는가"만 보지만, 이건 "누적 발생 횟수"가
 * 필요한 persist:true 금액 변동에 쓴다. */
export function occurrences(
  startDate: string,
  frequency: "monthly" | "yearly",
  until: RepeatUntil,
  month: number,
  today: Date,
): number {
  const start = monthIndexFromTargetDate(startDate, today);
  if (month < start) return 0;
  const period = frequency === "monthly" ? 1 : 12;
  let count = Math.floor((month - start) / period) + 1;
  if (until.type === "count") {
    count = Math.min(count, until.count);
  }
  if (until.type === "date") {
    const untilMonth = monthIndexFromTargetDate(until.date, today);
    if (untilMonth < start) return 0;
    const untilMaxOccurrence = Math.floor((untilMonth - start) / period) + 1;
    count = Math.min(count, untilMaxOccurrence);
  }
  return Math.max(0, count);
}

/** 기간(period)/정기(recurring) 금액 변동을 시작일 오름차순으로 baseAmount에
 * 순서대로 적용한 최종 금액을 계산한다. */
export function effectiveAmount(
  baseAmount: number,
  adjustments: AmountAdjustment[],
  month: number,
  today: Date,
): number {
  const steps: {
    sortKey: number;
    type: "percent" | "amount";
    direction: "increase" | "decrease";
    value: number;
  }[] = [];

  for (const adj of adjustments) {
    if (adj.kind === "period") {
      const from = monthIndexFromTargetDate(adj.fromDate, today);
      const to = adj.toDate
        ? monthIndexFromTargetDate(adj.toDate, today)
        : Infinity;
      if (month >= from && month <= to) {
        steps.push({
          sortKey: from,
          type: adj.type,
          direction: adj.direction,
          value: adj.value,
        });
      }
    } else {
      const start = monthIndexFromTargetDate(adj.startDate, today);
      const count = occurrences(
        adj.startDate,
        adj.frequency,
        adj.until,
        month,
        today,
      );
      if (adj.persist) {
        for (let i = 0; i < count; i++) {
          steps.push({
            sortKey: start,
            type: adj.type,
            direction: adj.direction,
            value: adj.value,
          });
        }
      } else if (
        count > 0 &&
        fires(
          {
            mode: "recurring",
            startDate: adj.startDate,
            frequency: adj.frequency,
            until: adj.until,
          },
          month,
          today,
        )
      ) {
        steps.push({
          sortKey: start,
          type: adj.type,
          direction: adj.direction,
          value: adj.value,
        });
      }
    }
  }

  steps.sort((a, b) => a.sortKey - b.sortKey);

  let amount = baseAmount;
  for (const step of steps) {
    const sign = step.direction === "increase" ? 1 : -1;
    amount =
      step.type === "percent"
        ? amount * (1 + (sign * step.value) / 100)
        : amount + sign * step.value;
  }
  return Math.max(0, amount);
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

export function validateAdjustments(
  adjustments: AmountAdjustment[],
  today: Date,
  horizonMonths: number,
): string | null {
  const rangeMessage = `1개월 후부터 ${formatMonthsFromNow(horizonMonths)} 사이의 날짜만 선택할 수 있습니다.`;

  for (const adj of adjustments) {
    if (!Number.isFinite(adj.value) || adj.value <= 0) {
      return "금액 변동 값은 0보다 커야 합니다.";
    }
    if (adj.kind === "period") {
      const from = monthIndexFromTargetDate(adj.fromDate, today);
      // 하한(1개월 후)은 검사하지 않는다 — 이미 저장된 항목을 나중에 수정할
      // 때, 시간이 흘러 시작월이 오늘 기준 과거가 된 경우까지 막으면 그
      // 필드를 손대지 않았는데도 저장이 막히는 문제가 생긴다. 과거 시작월
      // 자체는 계산 로직상 아무 문제가 없다.
      if (!Number.isFinite(from) || from > horizonMonths) {
        return rangeMessage;
      }
      if (adj.toDate) {
        const to = monthIndexFromTargetDate(adj.toDate, today);
        if (!Number.isFinite(to) || to < from) {
          return "금액 변동 종료 날짜는 시작 날짜보다 이후여야 합니다.";
        }
      }
    } else {
      const start = monthIndexFromTargetDate(adj.startDate, today);
      if (!Number.isFinite(start) || start > horizonMonths) {
        return rangeMessage;
      }
      if (adj.until.type === "date") {
        const until = monthIndexFromTargetDate(adj.until.date, today);
        if (!Number.isFinite(until) || until < start) {
          return "금액 변동 반복 종료 날짜는 시작 날짜보다 이후여야 합니다.";
        }
      }
      if (adj.until.type === "count" && adj.until.count < 1) {
        return "금액 변동 반복 횟수는 1 이상이어야 합니다.";
      }
    }
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
      failedTransfers: [],
      failedExpenses: [],
    }),
  ];

  for (let month = 1; month <= horizonMonths; month++) {
    const flow: MonthSnapshot["flow"] = {
      incomeIn: 0,
      expenseOut: 0,
      transfers: [],
      failedTransfers: [],
      failedExpenses: [],
    };

    if (primary) {
      const incomeIn = input.incomes
        .filter((item) => fires(item.schedule, month, today))
        .reduce(
          (sum, item) =>
            sum + effectiveAmount(item.amount, item.adjustments, month, today),
          0,
        );
      balances[primary.id] += incomeIn;
      flow.incomeIn = incomeIn;

      // 지출도 이체와 마찬가지로, 잔액이 부족하면 마이너스로 밀어붙이는
      // 대신 그 지출 항목만 이번 달에 중단시킨다.
      let expenseOut = 0;
      for (const item of input.expenses) {
        if (!fires(item.schedule, month, today)) continue;
        const amount = effectiveAmount(
          item.amount,
          item.adjustments,
          month,
          today,
        );
        if (balances[primary.id] < amount) {
          flow.failedExpenses.push({
            itemId: item.id,
            name: item.name,
            amount,
          });
          continue;
        }
        balances[primary.id] -= amount;
        expenseOut += amount;
      }
      flow.expenseOut = expenseOut;
    }

    for (const rule of transferRules) {
      if (!fires(rule.schedule, month, today)) continue;

      const sourceBalance = balances[rule.fromAssetId] ?? 0;
      const destBalance = balances[rule.toAssetId] ?? 0;
      const requested =
        rule.mode === "fixed"
          ? effectiveAmount(rule.amount, rule.adjustments, month, today)
          : sourceBalance * (rule.amount / 100);

      // 잔액이 부족하면 있는 만큼만 옮기는 대신 이체 자체를 건너뛴다 —
      // 일부만 빠져나가는 건 사용자가 설정한 이체 금액과 다른 결과라
      // 잔액 부족 상황을 그대로 드러내는 편이 낫다.
      if (sourceBalance <= 0 || requested > sourceBalance) {
        if (requested > 0) {
          flow.failedTransfers.push({
            ruleId: rule.id,
            fromAssetId: rule.fromAssetId,
            toAssetId: rule.toAssetId,
            amount: requested,
          });
        }
        continue;
      }

      let amount = requested;
      // 목적지가 부채(음수 잔액)면 남은 빚 이상 갚아 흑자로 넘어가지 않도록 clamp.
      if (destBalance < 0) {
        amount = Math.min(amount, -destBalance);
      }

      balances[rule.fromAssetId] = sourceBalance - amount;
      balances[rule.toAssetId] = destBalance + amount;
      flow.transfers.push({
        ruleId: rule.id,
        fromAssetId: rule.fromAssetId,
        toAssetId: rule.toAssetId,
        amount,
      });
    }

    for (const asset of assetClasses) {
      const cycle = asset.interestCycle;
      if (cycle.mode === "monthly") {
        const monthlyRate = asset.annualReturnRate / 100 / 12;
        balances[asset.id] *= 1 + monthlyRate;
      } else {
        const simulatedMonth = ((today.getMonth() + month) % 12) + 1;
        if (simulatedMonth === cycle.month) {
          balances[asset.id] *= 1 + asset.annualReturnRate / 100;
        }
      }
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
