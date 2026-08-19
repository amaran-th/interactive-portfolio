"use client";

import {
  RepeatSchedule,
  RepeatUntil,
  addMonths,
  toMonthInputValue,
} from "../types";
import { monthIndexFromTargetDate } from "../simulation";

type ScheduleEditorProps = {
  value: RepeatSchedule;
  onChange: (schedule: RepeatSchedule) => void;
  today: Date;
};

export default function ScheduleEditor({
  value,
  onChange,
  today,
}: ScheduleEditorProps) {
  const nextMonthValue = toMonthInputValue(addMonths(today, 1));
  const preview = (date: string) =>
    `${monthIndexFromTargetDate(date, today)}개월 후`;

  const toggle = (
    <div className="flex gap-1">
      <button
        type="button"
        onClick={() =>
          onChange({
            mode: "recurring",
            startDate:
              value.mode === "once" ? value.date : nextMonthValue,
            frequency: "monthly",
            until: { type: "indefinite" },
          })
        }
        className={`rounded-full px-3 py-1 text-xs ${
          value.mode === "recurring"
            ? "bg-gray-700 text-white"
            : "bg-white/80 text-gray-500"
        }`}
      >
        반복
      </button>
      <button
        type="button"
        onClick={() =>
          onChange({
            mode: "once",
            date: value.mode === "recurring" ? value.startDate : nextMonthValue,
          })
        }
        className={`rounded-full px-3 py-1 text-xs ${
          value.mode === "once"
            ? "bg-gray-700 text-white"
            : "bg-white/80 text-gray-500"
        }`}
      >
        일시
      </button>
    </div>
  );

  if (value.mode === "once") {
    return (
      <div className="flex flex-col gap-2">
        {toggle}
        <div className="flex items-center gap-2">
          <input
            value={value.date}
            onChange={(e) => onChange({ mode: "once", date: e.target.value })}
            type="month"
            min={nextMonthValue}
            className="rounded-full border border-gray-200 bg-white/80 px-3 py-1.5 text-sm"
          />
          <span className="text-xs text-gray-500">{preview(value.date)}</span>
        </div>
      </div>
    );
  }

  const handleUntilTypeChange = (type: RepeatUntil["type"]) => {
    if (type === "indefinite") {
      onChange({ ...value, until: { type: "indefinite" } });
    } else if (type === "count") {
      onChange({ ...value, until: { type: "count", count: 1 } });
    } else {
      onChange({ ...value, until: { type: "date", date: value.startDate } });
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {toggle}
      <div className="flex items-center gap-2">
        <input
          value={value.startDate}
          onChange={(e) => onChange({ ...value, startDate: e.target.value })}
          type="month"
          min={nextMonthValue}
          className="rounded-full border border-gray-200 bg-white/80 px-3 py-1.5 text-sm"
        />
        <span className="text-xs text-gray-500">
          시작 {preview(value.startDate)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <select
          value={value.frequency}
          onChange={(e) =>
            onChange({
              ...value,
              frequency: e.target.value as "monthly" | "yearly",
            })
          }
          className="rounded-full border border-gray-200 bg-white/80 px-3 py-1.5 text-sm"
        >
          <option value="monthly">매월</option>
          <option value="yearly">매년</option>
        </select>
        <select
          value={value.until.type}
          onChange={(e) =>
            handleUntilTypeChange(e.target.value as RepeatUntil["type"])
          }
          className="rounded-full border border-gray-200 bg-white/80 px-3 py-1.5 text-sm"
        >
          <option value="indefinite">무기한</option>
          <option value="date">특정 날짜까지</option>
          <option value="count">횟수</option>
        </select>
      </div>
      {value.until.type === "date" && (
        <div className="flex items-center gap-2">
          <input
            value={value.until.date}
            onChange={(e) =>
              onChange({
                ...value,
                until: { type: "date", date: e.target.value },
              })
            }
            type="month"
            min={value.startDate}
            className="rounded-full border border-gray-200 bg-white/80 px-3 py-1.5 text-sm"
          />
          <span className="text-xs text-gray-500">
            종료 {preview(value.until.date)}
          </span>
        </div>
      )}
      {value.until.type === "count" && (
        <input
          value={value.until.count}
          onChange={(e) =>
            onChange({
              ...value,
              until: {
                type: "count",
                count: Math.max(1, Number(e.target.value) || 1),
              },
            })
          }
          type="number"
          min={1}
          placeholder="반복 횟수"
          className="w-24 rounded-full border border-gray-200 bg-white/80 px-3 py-1.5 text-sm"
        />
      )}
    </div>
  );
}
