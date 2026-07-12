"use client";

import { useEffect, useRef } from "react";

export type ContextMenuItem = { label: string; onClick: () => void; disabled?: boolean };

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

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div ref={ref} style={{ left: x, top: y }} className="fixed z-50 w-40 overflow-hidden bg-white py-1 shadow-xl">
      {items.map((item) => (
        <button
          key={item.label}
          disabled={item.disabled}
          onClick={() => {
            if (item.disabled) return;
            item.onClick();
            onClose();
          }}
          className={`block w-full px-3 py-1.5 text-left text-xs ${
            item.disabled ? "cursor-not-allowed text-gray-300" : "text-gray-700 hover:bg-violet-50"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
