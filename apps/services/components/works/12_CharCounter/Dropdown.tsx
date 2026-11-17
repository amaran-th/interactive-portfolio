"use client";

import { Check, ChevronDown, X } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useEffect, useId, useRef, useState } from "react";

// 글자수 세기의 목표 칸에 쓰는 드롭다운. 화면 아래쪽에 놓이므로 목록은 위로 연다.

type Option<T> = { value: T; label: ReactNode };

const TRIGGER =
  "flex h-8 items-center rounded-md border border-ink/15 bg-white text-sm text-ink hover:border-ink/30 focus-within:border-point";

function useDropdown(count: number, selectedIndex: number) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  // 바깥을 누르면 닫는다
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  function show() {
    setActive(Math.max(selectedIndex, 0));
    setOpen(true);
  }

  // 위·아래 화살표로 고르고 Enter로 정한다. 처리했으면 true.
  function onKey(e: KeyboardEvent, pick: (i: number) => void) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return show(), true;
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (i + step + count) % count);
      return true;
    }
    if (e.key === "Enter" && open) {
      e.preventDefault();
      pick(active);
      setOpen(false);
      return true;
    }
    if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
      return true;
    }
    return false;
  }

  return { open, setOpen, show, active, setActive, rootRef, onKey };
}

function OptionList<T>({
  id,
  options,
  selected,
  active,
  onHover,
  onPick,
}: {
  id: string;
  options: Option<T>[];
  selected: T | null;
  active: number;
  onHover: (i: number) => void;
  onPick: (v: T) => void;
}) {
  return (
    <ul
      id={id}
      role="listbox"
      className="absolute bottom-full left-0 z-20 mb-1.5 min-w-full overflow-hidden rounded-lg border border-ink/10 bg-white py-1 shadow-[0_8px_24px_-6px_rgba(12,54,117,0.25)]"
    >
      {options.map((o, i) => {
        const isSelected = o.value === selected;
        return (
          <li
            key={String(o.value)}
            id={`${id}-${i}`}
            role="option"
            aria-selected={isSelected}
            // 포커스를 입력칸·버튼에 둔 채 고르도록 기본 동작을 막는다
            onPointerDown={(e) => e.preventDefault()}
            onPointerEnter={() => onHover(i)}
            onClick={() => onPick(o.value)}
            className={`flex cursor-pointer items-center justify-between gap-4 px-3 py-1.5 text-sm whitespace-nowrap tabular-nums ${
              i === active ? "bg-point/[0.07]" : ""
            } ${isSelected ? "font-semibold text-point" : "text-ink/80"}`}
          >
            {o.label}
            <Check aria-hidden className={`size-3.5 ${isSelected ? "" : "invisible"}`} />
          </li>
        );
      })}
    </ul>
  );
}

/** 버튼을 누르면 목록이 열리는 선택 칸 */
export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
}) {
  const listId = useId();
  const selectedIndex = options.findIndex((o) => o.value === value);
  const { open, setOpen, show, active, setActive, rootRef, onKey } = useDropdown(options.length, selectedIndex);
  const current = options[selectedIndex];

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={(e) => onKey(e, (i) => onChange(options[i].value))}
        className={`${TRIGGER} gap-1 pr-1.5 pl-2.5`}
      >
        {current?.label}
        <ChevronDown aria-hidden className={`size-4 text-ink/40 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <OptionList
          id={listId}
          options={options}
          selected={value}
          active={active}
          onHover={setActive}
          onPick={(v) => {
            onChange(v);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

/** 숫자를 직접 적거나 목록에서 고르는 칸. 값이 있으면 × 로 비운다. */
export function NumberCombo({
  id,
  value,
  presets,
  unit,
  placeholder,
  onChange,
  format,
}: {
  id: string;
  value: number | null;
  presets: number[];
  unit: string;
  placeholder: string;
  onChange: (v: number | null) => void;
  format: (n: number) => string;
}) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const { open, setOpen, show, active, setActive, rootRef, onKey } = useDropdown(presets.length, value === null ? -1 : presets.indexOf(value));

  return (
    <div ref={rootRef} className="relative shrink-0">
      <div className={`${TRIGGER} w-32 pr-0.5`}>
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          inputMode="numeric"
          autoComplete="off"
          aria-autocomplete="none"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-activedescendant={open ? `${listId}-${active}` : undefined}
          value={value === null ? "" : format(value)}
          onChange={(e) => {
            const n = Number(e.target.value.replace(/[^\d]/g, ""));
            onChange(n > 0 ? n : null);
          }}
          onKeyDown={(e) => onKey(e, (i) => onChange(presets[i]))}
          placeholder={placeholder}
          className="w-full min-w-0 bg-transparent pl-2.5 tabular-nums placeholder:text-xs placeholder:text-ink/40 focus:outline-none"
        />
        {value !== null && <span className="mr-0.5 text-xs text-ink/50">{unit}</span>}
        {/* 비우기 버튼은 값이 없어도 자리를 지켜 칸 폭이 흔들리지 않게 한다 */}
        <button
          type="button"
          aria-label="목표 지우기"
          disabled={value === null}
          onClick={() => {
            onChange(null);
            inputRef.current?.focus();
          }}
          className="grid size-6 shrink-0 place-items-center rounded text-ink/40 hover:text-ink disabled:invisible"
        >
          <X aria-hidden className="size-3.5" />
        </button>
        <button
          type="button"
          tabIndex={-1}
          aria-label="자주 쓰는 목표 보기"
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => {
            if (open) setOpen(false);
            else show();
            inputRef.current?.focus();
          }}
          className="grid size-6 shrink-0 place-items-center rounded text-ink/40 hover:text-ink"
        >
          <ChevronDown aria-hidden className={`size-4 ${open ? "rotate-180" : ""}`} />
        </button>
      </div>
      {open && (
        <OptionList
          id={listId}
          options={presets.map((n) => ({ value: n, label: `${format(n)}${unit}` }))}
          selected={value}
          active={active}
          onHover={setActive}
          onPick={(v) => {
            onChange(v);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}
