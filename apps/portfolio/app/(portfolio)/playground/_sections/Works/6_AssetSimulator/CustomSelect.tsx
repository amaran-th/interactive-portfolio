"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

type SelectOption = {
  value: string;
  label: string;
};

type SelectOptionGroup = {
  /** Omit to render this group's options without a section header. */
  label?: string;
  options: SelectOption[];
};

type CustomSelectProps = {
  value: string;
  onChange: (value: string) => void;
  /** Flat option list. Ignored when `groups` is provided. */
  options?: SelectOption[];
  /** Renders the dropdown as labeled sections instead of a flat list. */
  groups?: SelectOptionGroup[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  borderClassName?: string;
  /** Smaller, lighter trigger — for a select that's secondary to nearby content. */
  compact?: boolean;
};

export default function CustomSelect({
  value,
  onChange,
  options,
  groups,
  placeholder = "선택",
  disabled = false,
  className = "",
  borderClassName = "border-gray-200",
  compact = false,
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

  const flatOptions = groups
    ? groups.flatMap((group) => group.options)
    : (options ?? []);
  const selected = flatOptions.find((o) => o.value === value);

  const renderOption = (option: SelectOption) => (
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
  );

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
        className={`flex w-full items-center justify-between gap-1 rounded-full text-left ${
          compact
            ? "border border-transparent bg-transparent px-1.5 py-0.5 text-xs text-gray-500 hover:border-gray-200 hover:bg-white/60"
            : `border bg-white/80 px-3 py-1.5 text-sm ${borderClassName}`
        } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
      >
        <span className={`truncate ${selected ? "" : "text-gray-400"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={`shrink-0 text-gray-400 ${compact ? "h-3 w-3" : "h-3.5 w-3.5"}`}
        />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 max-h-64 w-max min-w-full overflow-y-auto rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
          {flatOptions.length === 0 && (
            <p className="px-2 py-1.5 text-xs whitespace-nowrap text-gray-400">
              {placeholder}
            </p>
          )}
          {groups
            ? groups.map(
                (group, i) =>
                  group.options.length > 0 && (
                    <div key={group.label ?? i} className="mb-1 last:mb-0">
                      {group.label && (
                        <p className="px-2 pt-1.5 pb-1 text-[10px] font-semibold tracking-wide text-gray-400 uppercase">
                          {group.label}
                        </p>
                      )}
                      {group.options.map(renderOption)}
                    </div>
                  ),
              )
            : options?.map(renderOption)}
        </div>
      )}
    </div>
  );
}
