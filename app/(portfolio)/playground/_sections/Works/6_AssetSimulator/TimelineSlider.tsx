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
  for (let month = 0; month <= horizonMonths; month += 12) {
    yearMarks.push(month);
  }
  const progressPct =
    horizonMonths > 0 ? (selectedMonth / horizonMonths) * 100 : 0;

  const snapToYearMark = (raw: number): number => {
    const nearestMark = yearMarks.reduce((closest, mark) =>
      Math.abs(mark - raw) < Math.abs(closest - raw) ? mark : closest,
    );
    const snapDistance = Math.max(1, Math.round(horizonMonths / 120));
    return Math.abs(nearestMark - raw) <= snapDistance ? nearestMark : raw;
  };

  return (
    <div>
      <span className="text-sm text-gray-500">
        {selectedMonth === 0
          ? "지금"
          : `${formatMonthsFromNow(selectedMonth)} · ${formatMonthLabel(selectedMonth, today)}`}
      </span>
      <div className="relative mt-4 h-5">
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
          onChange={(e) => onChange(snapToYearMark(Number(e.target.value)))}
          className="absolute inset-0 z-30 h-full w-full cursor-pointer opacity-0"
        />
      </div>
    </div>
  );
}
