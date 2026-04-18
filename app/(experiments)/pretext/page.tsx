"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";
import { texts as initialTexts } from "./_sections/example1/data";
import DomList from "./_sections/example1/DOMList";
import DomListNaive from "./_sections/example1/DOMListNaive";
import PretextList from "./_sections/example1/PretextList";
import BenchmarkPanel from "./_sections/example2/BenchmarkPanel";

type Tab = "example1" | "example2";
type Mode = "dom-naive" | "dom" | "pretext";

export default function PretextTest() {
  const [tab, setTab] = useState<Tab>("example1");

  // Example 1 state
  const [mode, setMode] = useState<Mode>("dom");
  const [width, setWidth] = useState<number>(300);
  const [time, setTime] = useState<number | null>(null);
  const [calcTime, setCalcTime] = useState<number | null>(null);
  const [count, setCount] = useState<number>(1000);

  const renderStartRef = useRef<number>(0);
  // eslint-disable-next-line react-hooks/purity
  renderStartRef.current = performance.now();

  const ex1Texts = useMemo(() => initialTexts.slice(0, count), [count]);

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white font-sans">
      {/* Header */}
      <div className="border-b border-white/10 px-8 py-5 flex items-end justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-white">
            Pretext vs DOM
          </h1>
          <p className="text-sm text-white/40 mt-0.5">Interactive Benchmark</p>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-lg overflow-hidden border border-white/10 mb-0.5">
          <button
            onClick={() => setTab("example1")}
            className={`px-4 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              tab === "example1"
                ? "bg-white text-gray-950"
                : "text-white/40 hover:text-white hover:bg-white/5"
            }`}
          >
            Example 1 — Benchmark
          </button>
          <button
            onClick={() => setTab("example2")}
            className={`px-4 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              tab === "example2"
                ? "bg-white text-gray-950"
                : "text-white/40 hover:text-white hover:bg-white/5"
            }`}
          >
            Example 2 — Virtual Scroll
          </button>
        </div>
      </div>

      {/* ── Example 1 ── */}
      {tab === "example1" && (
        <div className="min-h-0 px-8 py-6 flex gap-8">
          <div className="w-64 shrink-0 flex flex-col gap-5">
            {/* Mode */}
            <div className="bg-white/5 rounded-xl p-4 flex flex-col gap-3">
              <span className="text-xs font-medium text-white/40 uppercase tracking-widest">
                Mode
              </span>
              <div className="flex flex-col gap-1.5">
                {(["dom-naive", "dom", "pretext"] as Mode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                      mode === m
                        ? "bg-white text-gray-950"
                        : "text-white/50 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {m === "dom-naive" && "DOM (thrashing)"}
                    {m === "dom" && "DOM (batched)"}
                    {m === "pretext" && "Pretext"}
                  </button>
                ))}
              </div>
            </div>

            {/* Count */}
            <div className="bg-white/5 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-white/40 uppercase tracking-widest">
                  Count
                </span>
                <span className="text-xs font-mono text-white/60">
                  {count}개
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={1000}
                value={count}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setCount(Number(e.target.value))
                }
                className="w-full accent-white"
              />
              <div className="flex justify-between text-xs text-white/20 font-mono">
                <span>1</span>
                <span>1,000</span>
              </div>
            </div>
            {/* Width */}
            <div className="bg-white/5 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-white/40 uppercase tracking-widest">
                  Width
                </span>
                <span className="text-xs font-mono text-white/60">
                  {width}px
                </span>
              </div>
              <input
                type="range"
                min={100}
                max={600}
                value={width}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setWidth(Number(e.target.value))
                }
                className="w-full accent-white"
              />
              <div className="flex justify-between text-xs text-white/20 font-mono">
                <span>100</span>
                <span>600</span>
              </div>
            </div>

            {/* Calc Time */}
            <div className="bg-white/5 rounded-xl p-4 flex flex-col gap-3">
              <span className="text-xs font-medium text-white/40 uppercase tracking-widest">
                Calc Time
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-mono font-semibold text-white">
                  {calcTime !== null ? calcTime.toFixed(2) : "—"}
                </span>
                {calcTime !== null && (
                  <span className="text-sm text-white/40 font-mono">ms</span>
                )}
              </div>
              <div className="pt-2 border-t border-white/10 flex flex-col gap-1.5">
                <span className="text-xs text-white/30">
                  {mode === "pretext" ? "layout() 계산" : "scrollHeight reflow"}
                </span>
                <span
                  className={`text-xs font-mono font-medium ${
                    mode === "pretext"
                      ? "text-green-400/70"
                      : mode === "dom"
                        ? "text-blue-400/70"
                        : "text-orange-400/70"
                  }`}
                >
                  layout 횟수:{" "}
                  {mode === "dom-naive"
                    ? `${count + 1}회`
                    : mode === "dom"
                      ? "2회"
                      : "1회"}
                </span>
              </div>
            </div>

            {/* Render Time */}
            <div className="bg-white/5 rounded-xl p-4 flex flex-col gap-3">
              <span className="text-xs font-medium text-white/40 uppercase tracking-widest">
                Render Time
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-mono font-semibold text-white">
                  {time !== null ? time.toFixed(2) : "—"}
                </span>
                {time !== null && (
                  <span className="text-sm text-white/40 font-mono">ms</span>
                )}
              </div>
              <div className="pt-2 border-t border-white/10">
                <span className="text-xs text-white/30">
                  Calc 포함 전체 paint 완료까지
                  <br />
                  60FPS 기준 16.6ms 이내가 목표
                </span>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="flex-1 min-h-0 bg-white/5 rounded-xl p-5 border border-white/10 overflow-auto">
            <div className="flex items-center gap-2 mb-4">
              <span
                className={`w-2 h-2 rounded-full ${mode === "pretext" ? "bg-green-400" : mode === "dom" ? "bg-blue-400" : "bg-orange-400"}`}
              />
              <span className="text-xs text-white/40 font-medium">
                {mode === "dom-naive"
                  ? "DOM (thrashing)"
                  : mode === "dom"
                    ? "DOM (batched)"
                    : "Pretext"}{" "}
                — {ex1Texts.length} items
              </span>
            </div>
            <div className="overflow-auto min-h-0 max-h-full">
              {mode === "dom-naive" && (
                <DomListNaive
                  texts={ex1Texts}
                  width={width}
                  startTimeRef={renderStartRef}
                  onDone={setTime}
                  onCalcDone={setCalcTime}
                />
              )}
              {mode === "dom" && (
                <DomList
                  texts={ex1Texts}
                  width={width}
                  startTimeRef={renderStartRef}
                  onDone={setTime}
                  onCalcDone={setCalcTime}
                />
              )}
              {mode === "pretext" && (
                <PretextList
                  texts={ex1Texts}
                  width={width}
                  startTimeRef={renderStartRef}
                  onDone={setTime}
                  onCalcDone={setCalcTime}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Example 2 ── */}
      {tab === "example2" && <BenchmarkPanel />}
    </div>
  );
}
