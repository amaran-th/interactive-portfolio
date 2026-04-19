"use client";

import { useMemo, useRef, useState } from "react";
import { ITEM_GAP } from "./constants";
import { getBenchmarkTexts } from "./data";
import { findIndexFromScrollTop, usePretextMeasurer } from "./hooks";
import VirtualList from "./VirtualList";
import VirtualListDOM from "./VirtualListDOM";
import VirtualListDOMNaive from "./VirtualListDOMNaive";

type Mode = "dom-naive" | "dom" | "pretext";

const FIXED_ITEM_COUNT = 3000;
const FIXED_ITEM_WIDTH = 300;

export type JumpTarget = { index: number; signal: number } | null;

type JumpResult = {
  requestedIndex: number;
  actualIndex: number;
  delta: number;
  scrollCount: number | null;
} | null;

const MODES: { value: Mode; label: string }[] = [
  { value: "dom-naive", label: "Native" },
  { value: "dom", label: "@tanstack/react-virtual" },
  { value: "pretext", label: "Pretext" },
];

export default function BenchmarkPanel() {
  const [mode, setMode] = useState<Mode>("dom-naive");
  const [jumpInput, setJumpInput] = useState("");
  const [jumpTarget, setJumpTarget] = useState<JumpTarget>(null);
  const [jumpResult, setJumpResult] = useState<JumpResult>(null);

  const expectedScrollTopRef = useRef(0);
  const jumpRequestedIndexRef = useRef(0);

  const texts = useMemo(() => getBenchmarkTexts(FIXED_ITEM_COUNT), []);
  const { heights } = usePretextMeasurer(texts, FIXED_ITEM_WIDTH);

  const updateMode = (nextMode: Mode) => {
    setMode(nextMode);
    setJumpTarget(null);
    setJumpResult(null);
  };

  const handleJump = () => {
    const index = parseInt(jumpInput, 10);
    if (isNaN(index) || index < 0 || index >= texts.length) return;

    const expected =
      heights.slice(0, index).reduce((sum, h) => sum + h, 0) + index * ITEM_GAP;

    expectedScrollTopRef.current = expected;
    jumpRequestedIndexRef.current = index;

    setJumpResult(null);
    setJumpTarget((prev) => ({ index, signal: (prev?.signal ?? 0) + 1 }));
  };

  const handleJumpComplete = (actualScrollTop: number) => {
    const actualIndex = findIndexFromScrollTop(actualScrollTop, heights);
    const requestedIndex = jumpRequestedIndexRef.current;
    setJumpResult({
      requestedIndex,
      actualIndex,
      delta: Math.abs(requestedIndex - actualIndex),
      scrollCount: null,
    });
  };

  const handleScrollCount = (count: number) => {
    setJumpResult((prev) => (prev ? { ...prev, scrollCount: count } : prev));
  };

  const accentColor =
    mode === "pretext"
      ? "text-green-400/80"
      : mode === "dom"
        ? "text-blue-400/80"
        : "text-orange-400/80";

  return (
    <div className="min-h-0 h-screen px-8 py-6 flex gap-8">
      <div className="w-64 shrink-0 flex flex-col gap-5">
        {/* Mode */}
        <div className="bg-white/5 rounded-xl p-4 flex flex-col gap-3">
          <span className="text-xs font-medium text-white/40 uppercase tracking-widest">
            Mode
          </span>
          <div className="flex flex-col gap-1.5">
            {MODES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => updateMode(value)}
                className={`w-full py-2 px-3 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                  mode === value
                    ? "bg-white text-gray-950"
                    : "text-white/50 hover:text-white hover:bg-white/5"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Jump to Index */}
        <div className="bg-white/5 rounded-xl p-4 flex flex-col gap-3">
          <span className="text-xs font-medium text-white/40 uppercase tracking-widest">
            Jump to Index
          </span>
          <div className="flex gap-2">
            <input
              type="number"
              min={0}
              max={texts.length - 1}
              value={jumpInput}
              onChange={(event) => setJumpInput(event.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJump()}
              placeholder={`0 – ${texts.length - 1}`}
              className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 outline-none focus:border-white/30 transition-colors font-mono"
            />
            <button
              onClick={handleJump}
              className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-white/70 hover:text-white transition-colors cursor-pointer"
            >
              Go
            </button>
          </div>

          {jumpResult !== null && (
            <div className="pt-1 flex flex-col gap-2 border-t border-white/10">
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/30">requested</span>
                <span className="text-xs font-mono text-white/60">
                  #{jumpResult.requestedIndex.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/30">landed at</span>
                <span
                  className={`text-xs font-mono font-semibold ${accentColor}`}
                >
                  #{jumpResult.actualIndex.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/30">index delta</span>
                <span
                  className={`text-xs font-mono font-semibold ${accentColor}`}
                >
                  {jumpResult.delta === 0
                    ? "0 ✓"
                    : jumpResult.delta.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/30">scroll events</span>
                <span className="text-xs font-mono text-white/50">
                  {jumpResult.scrollCount === null
                    ? "…"
                    : jumpResult.scrollCount}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {mode === "dom-naive" && (
          <VirtualListDOMNaive
            texts={texts}
            itemWidth={FIXED_ITEM_WIDTH}
            jumpTarget={jumpTarget}
            onJumpComplete={handleJumpComplete}
            onScrollCount={handleScrollCount}
          />
        )}
        {mode === "dom" && (
          <VirtualListDOM
            texts={texts}
            itemWidth={FIXED_ITEM_WIDTH}
            jumpTarget={jumpTarget}
            onJumpComplete={handleJumpComplete}
            onScrollCount={handleScrollCount}
          />
        )}
        {mode === "pretext" && (
          <VirtualList
            texts={texts}
            heights={heights}
            itemWidth={FIXED_ITEM_WIDTH}
            jumpTarget={jumpTarget}
            onJumpComplete={handleJumpComplete}
            onScrollCount={handleScrollCount}
          />
        )}
      </div>
    </div>
  );
}
