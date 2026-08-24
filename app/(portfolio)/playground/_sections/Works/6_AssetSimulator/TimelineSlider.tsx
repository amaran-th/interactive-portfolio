"use client";

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
  for (let month = 12; month <= horizonMonths; month += 12) {
    yearMarks.push(month);
  }

  return (
    <div>
      <span className="text-sm text-gray-500">
        {selectedMonth === 0
          ? "지금"
          : `${formatMonthsFromNow(selectedMonth)} · ${formatMonthLabel(selectedMonth, today)}`}
      </span>
      <div className="mt-3">
        <input
          type="range"
          min={0}
          max={horizonMonths}
          value={selectedMonth}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-indigo-500"
        />
        <div className="relative mt-1 h-4">
          {yearMarks.map((month) => {
            const isMajor = month % 60 === 0;
            const isActive = selectedMonth === month;
            return (
              <button
                key={month}
                type="button"
                onClick={() => onChange(month)}
                aria-label={`${month / 12}년 지점으로 이동`}
                className="group absolute top-1/2 flex h-4 w-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
                style={{ left: `${(month / horizonMonths) * 100}%` }}
              >
                <span
                  className={`rounded-full transition-colors ${
                    isMajor ? "h-2.5 w-2.5" : "h-1.5 w-1.5"
                  } ${
                    isActive
                      ? "bg-indigo-500"
                      : "bg-gray-400 group-hover:bg-indigo-400"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
