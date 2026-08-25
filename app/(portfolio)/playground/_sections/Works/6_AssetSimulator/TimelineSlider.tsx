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
            <button
              key={month}
              type="button"
              onClick={() => onChange(month)}
              aria-label={month === 0 ? "지금으로 이동" : `${month / 12}년 지점으로 이동`}
              className="group absolute top-1/2 z-20 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center"
              style={{ left: `${(month / horizonMonths) * 100}%` }}
            >
              <span
                className={`rounded-full border-2 bg-white transition-all group-hover:scale-125 group-hover:border-indigo-500 ${
                  isMajor ? "h-3 w-3" : "h-2 w-2"
                } ${isPast ? "border-indigo-500" : "border-gray-300"}`}
              />
            </button>
          );
        })}
        <div
          className="pointer-events-none absolute top-1/2 z-30 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-indigo-600 shadow"
          style={{ left: `${progressPct}%` }}
        />
        <input
          type="range"
          min={0}
          max={horizonMonths}
          value={selectedMonth}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        />
      </div>
    </div>
  );
}
