"use client";

import { useEffect, useRef } from "react";

export type ContextMenuItem = { label: string; onClick: () => void };

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
    <div
      ref={ref}
      style={{ left: x, top: y }}
      className="fixed z-50 w-40 overflow-hidden rounded-lg border border-white/10 bg-gray-900 py-1 shadow-xl"
    >
      {items.map((item) => (
        <button
          key={item.label}
          onClick={() => {
            item.onClick();
            onClose();
          }}
          className="block w-full px-3 py-1.5 text-left text-xs text-gray-200 hover:bg-white/10"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
