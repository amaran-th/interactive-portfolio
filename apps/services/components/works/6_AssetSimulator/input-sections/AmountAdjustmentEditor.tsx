"use client";

import { Plus, X } from "lucide-react";
import {
  AmountAdjustment,
  addMonths,
  newId,
  toMonthInputValue,
} from "../types";
import CustomSelect from "../CustomSelect";

const TYPE_OPTIONS = [
  { value: "percent", label: "%" },
  { value: "amount", label: "원" },
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
        value: 3,
      },
    ]);
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
                <div className="flex items-center gap-1.5">
                  <input
                    value={adj.fromDate}
                    onChange={(e) =>
                      update(adj.id, { fromDate: e.target.value })
                    }
                    type="month"
                    min={nextMonthValue}
                    className="rounded-full border border-gray-200 bg-white px-2 py-1 text-xs"
                  />
                  <span className="text-xs text-gray-500">부터</span>
                </div>
                <button
                  type="button"
                  onClick={() => remove(adj.id)}
                  className="text-gray-400 hover:text-gray-700"
                  aria-label="인상 삭제"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-gray-500">매년</span>
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
                <span className="text-xs text-gray-500">씩 인상</span>
              </div>
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
          <Plus className="h-3 w-3" /> 연간 인상률 추가
        </button>
      )}
    </div>
  );
}
