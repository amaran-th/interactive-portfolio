"use client";

import { ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type ContextMenuItem = {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  submenu?: ContextMenuItem[];
  // 라벨만으로는 뜻이 분명하지 않은 항목(예: "JSON 불러오기"가 정확히 무엇을
  // 하는지)을 위한 툴팁 — 마우스를 올리면 브라우저 기본 title 툴팁으로 보여준다.
  title?: string;
};

function itemClassName(item: ContextMenuItem) {
  return `flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs ${
    item.disabled
      ? "cursor-not-allowed text-gray-300"
      : item.danger
        ? "text-red-500 hover:bg-red-50"
        : "text-gray-700 hover:bg-violet-50"
  }`;
}

export default function ContextMenu({
  x,
  y,
  items,
  onClose,
}: {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{ left: x, top: y }}
      className="fixed z-50 w-40 bg-white py-1 shadow-xl"
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="relative"
          onMouseEnter={() =>
            item.submenu && !item.disabled && setOpenSubmenu(item.label)
          }
          onMouseLeave={() =>
            setOpenSubmenu((cur) => (cur === item.label ? null : cur))
          }
        >
          <button
            disabled={item.disabled}
            title={item.title}
            onClick={() => {
              if (item.disabled || item.submenu) return;
              item.onClick?.();
              onClose();
            }}
            className={itemClassName(item)}
          >
            {item.label}
            {item.submenu && (
              <ChevronRight className="h-3 w-3 shrink-0 text-gray-300" />
            )}
          </button>
          {item.submenu && openSubmenu === item.label && (
            <div className="absolute left-full top-0 w-40 overflow-hidden bg-white py-1 shadow-xl">
              {item.submenu.map((sub) => (
                <button
                  key={sub.label}
                  disabled={sub.disabled}
                  title={sub.title}
                  onClick={() => {
                    if (sub.disabled) return;
                    sub.onClick?.();
                    onClose();
                  }}
                  className={itemClassName(sub)}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
