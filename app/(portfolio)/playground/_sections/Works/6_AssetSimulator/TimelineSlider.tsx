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
      <div className="relative mt-3 pb-2">
        <input
          type="range"
          min={0}
          max={horizonMonths}
          value={selectedMonth}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-indigo-500"
        />
        <div className="pointer-events-none absolute inset-x-0 top-full">
          {yearMarks.map((month) => (
            <div
              key={month}
              className={`absolute top-0 w-px ${
                month % 60 === 0 ? "h-2 bg-gray-400" : "h-1.5 bg-gray-300"
              }`}
              style={{ left: `${(month / horizonMonths) * 100}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
