"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

export default function Accordion({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="flex flex-col bg-white shadow-md">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-50"
      >
        {title}
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${open ? "" : "-rotate-90"}`}
        />
      </button>
      {open && <div className="flex flex-col gap-3 p-3 pt-0">{children}</div>}
    </div>
  );
}
