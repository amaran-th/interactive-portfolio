"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatMonthsFromNow } from "./types";

type TimelineSliderProps = {
  selectedMonth: number;
  onChange: (month: number) => void;
  today: Date;
  horizonMonths: number;
};

function formatMonthLabel(monthIndex: number, today: Date): string {
  const date = new Date(
    today.getFullYear(),
    today.getMonth() + monthIndex,
    1,
  );
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function TimelineSlider({
  selectedMonth,
  onChange,
  today,
  horizonMonths,
}: TimelineSliderProps) {
  const yearMarks: number[] = [];
  for (let month = 0; month <= horizonMonths; month += 12) {
    yearMarks.push(month);
  }
  const progressPct =
    horizonMonths > 0 ? (selectedMonth / horizonMonths) * 100 : 0;

  const step = (delta: number) => {
    onChange(Math.max(0, Math.min(horizonMonths, selectedMonth + delta)));
  };

  return (
    <div>
      <span className="text-sm text-gray-500">
        {selectedMonth === 0
          ? "지금"
          : `${formatMonthsFromNow(selectedMonth)} · ${formatMonthLabel(selectedMonth, today)}`}
      </span>
      <div className="mt-4 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={selectedMonth <= 0}
          aria-label="한 달 전으로"
          className="shrink-0 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="relative h-5 flex-1">
          <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-gray-200" />
          <div
            className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-indigo-400"
            style={{ width: `${progressPct}%` }}
          />
          {yearMarks.map((month) => {
            const isMajor = month % 60 === 0;
            const isPast = month <= selectedMonth;
            return (
              <span
                key={month}
                aria-hidden="true"
                className={`pointer-events-none absolute top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-white transition-all ${
                  isMajor ? "h-3 w-3" : "h-2 w-2"
                } ${isPast ? "border-indigo-500" : "border-gray-300"}`}
                style={{ left: `${(month / horizonMonths) * 100}%` }}
              />
            );
          })}
          <div
            className="pointer-events-none absolute top-1/2 z-20 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-indigo-600 shadow"
            style={{ left: `${progressPct}%` }}
          />
          <input
            type="range"
            min={0}
            max={horizonMonths}
            value={selectedMonth}
            onChange={(e) => onChange(Number(e.target.value))}
            className="absolute inset-0 z-30 h-full w-full cursor-pointer opacity-0"
          />
        </div>
        <button
          type="button"
          onClick={() => step(1)}
          disabled={selectedMonth >= horizonMonths}
          aria-label="한 달 후로"
          className="shrink-0 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
