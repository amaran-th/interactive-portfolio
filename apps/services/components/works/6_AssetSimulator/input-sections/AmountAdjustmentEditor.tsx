"use client";

import { Plus, X } from "lucide-react";
import {
  AmountAdjustment,
  RepeatUntil,
  addMonths,
  newId,
  toMonthInputValue,
} from "../types";
import { monthIndexFromTargetDate } from "../simulation";
import CustomSelect from "../CustomSelect";
import { FREQUENCY_OPTIONS, UNTIL_TYPE_OPTIONS } from "./ScheduleEditor";

const TYPE_OPTIONS = [
  { value: "percent", label: "비율" },
  { value: "amount", label: "금액" },
];

const DIRECTION_OPTIONS = [
  { value: "increase", label: "인상" },
  { value: "decrease", label: "인하" },
];

const PERSIST_OPTIONS = [
  { value: "true", label: "계속 유지" },
  { value: "false", label: "그 달만" },
];

const KIND_OPTIONS = [
  { value: "period", label: "구간 변경" },
  { value: "recurring", label: "반복 변경" },
];

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
  const preview = (date: string) =>
    `${monthIndexFromTargetDate(date, today)}개월 후`;

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
        kind: "period",
        id: newId(),
        fromDate: nextMonthValue,
        type: "percent",
        direction: "increase",
        value: 10,
      },
    ]);
  };

  const changeKind = (id: string, kind: "period" | "recurring") => {
    onChange(
      value.map((adj): AmountAdjustment => {
        if (adj.id !== id || adj.kind === kind) return adj;
        const shared = {
          id: adj.id,
          type: adj.type,
          direction: adj.direction,
          value: adj.value,
        };
        if (kind === "period") {
          return { kind: "period", ...shared, fromDate: nextMonthValue };
        }
        return {
          kind: "recurring",
          ...shared,
          startDate: nextMonthValue,
          frequency: "yearly",
          until: { type: "indefinite" },
          persist: true,
        };
      }),
    );
  };

  const handleRecurringUntilTypeChange = (
    adj: Extract<AmountAdjustment, { kind: "recurring" }>,
    type: RepeatUntil["type"],
  ) => {
    if (type === "indefinite") {
      update(adj.id, { until: { type: "indefinite" } });
    } else if (type === "count") {
      update(adj.id, { until: { type: "count", count: 1 } });
    } else {
      update(adj.id, { until: { type: "date", date: adj.startDate } });
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
                <CustomSelect
                  value={adj.kind}
                  onChange={(v) =>
                    changeKind(adj.id, v as "period" | "recurring")
                  }
                  options={KIND_OPTIONS}
                  compact
                  className="w-28 shrink-0"
                />
                <button
                  type="button"
                  onClick={() => remove(adj.id)}
                  className="text-gray-400 hover:text-gray-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {adj.kind === "period" ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <input
                    value={adj.fromDate}
                    onChange={(e) =>
                      update(adj.id, { fromDate: e.target.value })
                    }
                    type="month"
                    min={nextMonthValue}
                    className="rounded-full border border-gray-200 bg-white px-2 py-1 text-xs"
                  />
                  <span className="text-[11px] text-gray-400">
                    {preview(adj.fromDate)} ~
                  </span>
                  <input
                    value={adj.toDate ?? ""}
                    onChange={(e) =>
                      update(adj.id, { toDate: e.target.value || undefined })
                    }
                    type="month"
                    min={adj.fromDate}
                    placeholder="계속"
                    className="rounded-full border border-gray-200 bg-white px-2 py-1 text-xs"
                  />
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <input
                      value={adj.startDate}
                      onChange={(e) =>
                        update(adj.id, { startDate: e.target.value })
                      }
                      type="month"
                      min={nextMonthValue}
                      className="rounded-full border border-gray-200 bg-white px-2 py-1 text-xs"
                    />
                    <span className="text-[11px] text-gray-400">
                      {preview(adj.startDate)}
                    </span>
                    <CustomSelect
                      value={adj.frequency}
                      onChange={(v) =>
                        update(adj.id, {
                          frequency: v as "monthly" | "yearly",
                        })
                      }
                      options={FREQUENCY_OPTIONS}
                      compact
                      className="w-20 shrink-0"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-gray-400">반복 종료</span>
                    <CustomSelect
                      value={adj.until.type}
                      onChange={(v) =>
                        handleRecurringUntilTypeChange(
                          adj,
                          v as RepeatUntil["type"],
                        )
                      }
                      options={UNTIL_TYPE_OPTIONS}
                      compact
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
                        min={adj.startDate}
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
                    <span className="text-[11px] text-gray-400">적용 방식</span>
                    <CustomSelect
                      value={String(adj.persist)}
                      onChange={(v) => update(adj.id, { persist: v === "true" })}
                      options={PERSIST_OPTIONS}
                      compact
                      className="w-24 shrink-0"
                    />
                  </div>
                </>
              )}

              <div className="flex flex-wrap items-center gap-1.5">
                <CustomSelect
                  value={adj.type}
                  onChange={(v) =>
                    update(adj.id, { type: v as "percent" | "amount" })
                  }
                  options={TYPE_OPTIONS}
                  compact
                  className="w-16 shrink-0"
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
                  className="w-16 shrink-0"
                />
                <input
                  value={adj.value}
                  onChange={(e) =>
                    update(adj.id, { value: Number(e.target.value) || 0 })
                  }
                  type="number"
                  className="w-20 rounded-full border border-gray-200 bg-white px-2 py-1 text-xs"
                />
                <span className="text-[11px] text-gray-400">
                  {adj.type === "percent" ? "%" : "원"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={addAdjustment}
        className="inline-flex items-center gap-1 self-start rounded-full border border-gray-200 px-2.5 py-1 text-xs text-gray-500 hover:border-gray-300 hover:bg-gray-50"
      >
        <Plus className="h-3 w-3" /> 변동 추가
      </button>
    </div>
  );
}
