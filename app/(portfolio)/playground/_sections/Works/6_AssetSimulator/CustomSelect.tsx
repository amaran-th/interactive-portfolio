"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

type SelectOption = {
  value: string;
  label: string;
};

type CustomSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  borderClassName?: string;
};

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "선택",
  disabled = false,
  className = "",
  borderClassName = "border-gray-200",
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div
      ref={rootRef}
      className={`relative ${className}`}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between gap-1.5 rounded-full border bg-white/80 px-3 py-1.5 text-left text-sm ${borderClassName} ${
          disabled ? "cursor-not-allowed opacity-50" : ""
        }`}
      >
        <span className={`truncate ${selected ? "" : "text-gray-400"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-400" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 max-h-48 w-max min-w-full overflow-y-auto rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
          {options.length === 0 && (
            <p className="px-2 py-1.5 text-xs whitespace-nowrap text-gray-400">
              {placeholder}
            </p>
          )}
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`block w-full rounded-lg px-2 py-1.5 text-left text-sm whitespace-nowrap hover:bg-gray-100 ${
                option.value === value ? "bg-gray-100 font-medium" : ""
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
