"use client";

import { Plus, X } from "lucide-react";
import {
  AmountAdjustment,
  RepeatUntil,
  addMonths,
  formatYearMonth,
  newId,
  toMonthInputValue,
} from "../types";
import CustomSelect from "../CustomSelect";
import { FREQUENCY_OPTIONS, UNTIL_TYPE_OPTIONS } from "./ScheduleEditor";

const TYPE_OPTIONS = [
  { value: "percent", label: "%" },
  { value: "amount", label: "원" },
];

const DIRECTION_OPTIONS = [
  { value: "increase", label: "인상" },
  { value: "decrease", label: "인하" },
];

function describeAdjustment(adj: AmountAdjustment): string {
  const valueText = `${adj.value.toLocaleString()}${adj.type === "percent" ? "%" : "원"}`;
  const directionText = adj.direction === "increase" ? "인상" : "인하";
  const from = formatYearMonth(adj.fromDate);

  // 횟수 1회는 "반복 없이 한 번 바뀌고 계속 유지"와 수학적으로 같으므로
  // 주기 등 반복 관련 문구 없이 단발 변동처럼 설명한다.
  if (adj.until.type === "count" && adj.until.count === 1) {
    return `${from}부터 ${valueText} ${directionText} 적용, 계속 유지`;
  }

  const freqText = adj.frequency === "monthly" ? "매월" : "매년";
  const untilText =
    adj.until.type === "date"
      ? `${formatYearMonth(adj.until.date)}까지`
      : adj.until.type === "count"
        ? `최대 ${adj.until.count}회`
        : "무기한";

  return `${from}부터 ${untilText} ${freqText} 반복, 회차마다 ${valueText}씩 ${directionText}되며 계속 유지`;
}

type AmountAdjustmentEditorProps = {
  value: AmountAdjustment[];
  onChange: (adjustments: AmountAdjustment[]) => void;
  today: Date;
};

export default function AmountAdjustmentEditor({
  value,
  onChange,
  today,
}: AmountAdjustmentEditorProps) {
  const nextMonthValue = toMonthInputValue(addMonths(today, 1));

  const update = (id: string, patch: Partial<AmountAdjustment>) => {
    onChange(
      value.map((adj) =>
        adj.id === id ? ({ ...adj, ...patch } as AmountAdjustment) : adj,
      ),
    );
  };

  const remove = (id: string) => {
    onChange(value.filter((adj) => adj.id !== id));
  };

  const addAdjustment = () => {
    onChange([
      ...value,
      {
        id: newId(),
        fromDate: nextMonthValue,
        type: "percent",
        direction: "increase",
        value: 10,
        frequency: "yearly",
        until: { type: "indefinite" },
      },
    ]);
  };

  const handleUntilTypeChange = (
    adj: AmountAdjustment,
    type: RepeatUntil["type"],
  ) => {
    if (type === "indefinite") {
      update(adj.id, { until: { type: "indefinite" } });
    } else if (type === "count") {
      update(adj.id, { until: { type: "count", count: 1 } });
    } else {
      update(adj.id, { until: { type: "date", date: adj.fromDate } });
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <ul className="flex flex-col gap-2">
          {value.map((adj) => (
            <li
              key={adj.id}
              className="flex flex-col gap-1.5 rounded-xl border border-gray-200 bg-white/80 p-2"
            >
              <div className="flex items-center justify-between">
                <input
                  value={adj.fromDate}
                  onChange={(e) => update(adj.id, { fromDate: e.target.value })}
                  type="month"
                  min={nextMonthValue}
                  className="rounded-full border border-gray-200 bg-white px-2 py-1 text-xs"
                />
                <button
                  type="button"
                  onClick={() => remove(adj.id)}
                  className="text-gray-400 hover:text-gray-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <CustomSelect
                  value={adj.frequency}
                  onChange={(v) =>
                    update(adj.id, {
                      frequency: v as "monthly" | "yearly",
                    })
                  }
                  options={FREQUENCY_OPTIONS}
                  compact
                  bordered
                  className="w-20 shrink-0"
                />
                <CustomSelect
                  value={adj.until.type}
                  onChange={(v) =>
                    handleUntilTypeChange(adj, v as RepeatUntil["type"])
                  }
                  options={UNTIL_TYPE_OPTIONS}
                  compact
                  bordered
                  className="w-28 shrink-0"
                />
                {adj.until.type === "date" && (
                  <input
                    value={adj.until.date}
                    onChange={(e) =>
                      update(adj.id, {
                        until: { type: "date", date: e.target.value },
                      })
                    }
                    type="month"
                    min={adj.fromDate}
                    className="rounded-full border border-gray-200 bg-white px-2 py-1 text-xs"
                  />
                )}
                {adj.until.type === "count" && (
                  <input
                    value={adj.until.count}
                    onChange={(e) =>
                      update(adj.id, {
                        until: {
                          type: "count",
                          count: Math.max(1, Number(e.target.value) || 1),
                        },
                      })
                    }
                    type="number"
                    min={1}
                    className="w-16 rounded-full border border-gray-200 bg-white px-2 py-1 text-xs"
                  />
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <input
                  value={adj.value}
                  onChange={(e) =>
                    update(adj.id, { value: Number(e.target.value) || 0 })
                  }
                  type="number"
                  className="w-16 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs"
                />
                <CustomSelect
                  value={adj.type}
                  onChange={(v) =>
                    update(adj.id, { type: v as "percent" | "amount" })
                  }
                  options={TYPE_OPTIONS}
                  compact
                  bordered
                  className="w-14 shrink-0"
                />
                <CustomSelect
                  value={adj.direction}
                  onChange={(v) =>
                    update(adj.id, {
                      direction: v as "increase" | "decrease",
                    })
                  }
                  options={DIRECTION_OPTIONS}
                  compact
                  bordered
                  className="w-16 shrink-0"
                />
              </div>

              <p className="text-[11px] text-gray-400">
                {describeAdjustment(adj)}
              </p>
            </li>
          ))}
        </ul>
      )}
      {value.length === 0 && (
        <button
          type="button"
          onClick={addAdjustment}
          className="inline-flex items-center gap-1 self-start rounded-full border border-gray-200 px-2.5 py-1 text-xs text-gray-500 hover:border-gray-300 hover:bg-gray-50"
        >
          <Plus className="h-3 w-3" /> 변동 추가
        </button>
      )}
    </div>
  );
}
