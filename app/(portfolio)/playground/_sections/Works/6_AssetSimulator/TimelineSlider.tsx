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
  return (
    <div>
      <span className="text-sm text-gray-500">
        {selectedMonth === 0
          ? "지금"
          : `${formatMonthsFromNow(selectedMonth)} · ${formatMonthLabel(selectedMonth, today)}`}
      </span>
      <input
        type="range"
        min={0}
        max={horizonMonths}
        value={selectedMonth}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 w-full accent-indigo-500"
      />
    </div>
  );
}
