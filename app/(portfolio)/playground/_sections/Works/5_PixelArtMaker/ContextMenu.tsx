"use client";

import { ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type ContextMenuItem = {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  submenu?: ContextMenuItem[];
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
    <div ref={ref} style={{ left: x, top: y }} className="fixed z-50 w-40 bg-white py-1 shadow-xl">
      {items.map((item) => (
        <div
          key={item.label}
          className="relative"
          onMouseEnter={() => item.submenu && !item.disabled && setOpenSubmenu(item.label)}
          onMouseLeave={() => setOpenSubmenu((cur) => (cur === item.label ? null : cur))}
        >
          <button
            disabled={item.disabled}
            onClick={() => {
              if (item.disabled || item.submenu) return;
              item.onClick?.();
              onClose();
            }}
            className={itemClassName(item)}
          >
            {item.label}
            {item.submenu && <ChevronRight className="h-3 w-3 shrink-0 text-gray-300" />}
          </button>
          {item.submenu && openSubmenu === item.label && (
            <div className="absolute left-full top-0 w-40 overflow-hidden bg-white py-1 shadow-xl">
              {item.submenu.map((sub) => (
                <button
                  key={sub.label}
                  disabled={sub.disabled}
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
