"use client";

import { WorkItem } from "./Work";

interface WorkModalProps {
  works: WorkItem[];
  selectedIndex: number;
  onNavigate: (index: number) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function WorkModal({
  works,
  selectedIndex,
  onNavigate,
  isOpen,
  onClose,
}: WorkModalProps) {
  const selected = works[selectedIndex];

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: isOpen ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0)",
          backdropFilter: isOpen ? "blur(8px)" : "blur(0px)",
          transition: "background-color 0.3s ease, backdrop-filter 0.3s ease",
        }}
      />
      <div
        className={`relative h-full flex items-center justify-center transition-all duration-300
          ${isOpen ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
        onClick={onClose}
      >
        <div
          className="relative w-[80vw] h-[80vh] bg-gray-900 border border-white/10 rounded-xl overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={`bg-linear-to-br ${selected.color} px-4 py-4 shrink-0 flex flex-col items-center`}
          >
            <div className="flex gap-1 items-center">
              <button
                onClick={() => onNavigate(selectedIndex - 1)}
                disabled={selectedIndex === 0}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 text-white/70 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all text-lg leading-none"
              >
                ‹
              </button>
              {works.map((_, i) => (
                <button
                  key={i}
                  onClick={() => onNavigate(i)}
                  className="p-1 flex items-center justify-center rounded-full hover:bg-white/20 transition-all disabled:cursor-not-allowed"
                >
                  <span
                    className={`rounded-full size-1.5 block transition-colors ${
                      i === selectedIndex ? "bg-white" : "bg-white/30"
                    }`}
                  />
                </button>
              ))}
              <button
                onClick={() => onNavigate(selectedIndex + 1)}
                disabled={selectedIndex === works.length - 1}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 text-white/70 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all text-lg leading-none"
              >
                ›
              </button>
            </div>
            <h4 className="text-white text-center text-2xl font-bold">
              {selected.title}
            </h4>
          </div>
          <div className="flex-1 flex divide-gray-800 divide-x overflow-y-auto text-gray-300">
            <div className="w-[calc(80vh-64px)]">{selected.content}</div>
            <div className="px-10 py-8 flex-1 text-pretty prose prose-invert">
              {selected.description}
            </div>
          </div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/30 hover:bg-black/60 text-white/70 hover:text-white flex items-center justify-center transition-colors text-sm"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
