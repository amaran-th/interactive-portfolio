"use client";

import { useState } from "react";
import RotationLab from "./example1/RotationLab";
import EnvLab from "./example2/EnvLab";

type Tab = "example1" | "example2";

export default function GpuRotationClient() {
  const [tab, setTab] = useState<Tab>("example1");

  return (
    <div className="min-h-screen flex flex-col bg-gray-950 text-white font-sans">
      {/* Header */}
      <div className="border-b border-white/10 px-8 py-5 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-white">
            GPU Rotation — Raster vs Vector
          </h1>
          <p className="text-sm text-white/40 mt-0.5">
            왜 GPU가 빠지면 지도 회전이 사라지는가
          </p>
        </div>

        <div className="flex rounded-lg overflow-hidden border border-white/10 mb-0.5">
          <button
            onClick={() => setTab("example1")}
            className={`px-4 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              tab === "example1"
                ? "bg-white text-gray-950"
                : "text-white/40 hover:text-white hover:bg-white/5"
            }`}
          >
            Example 1 — Rotation
          </button>
          <button
            onClick={() => setTab("example2")}
            className={`px-4 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              tab === "example2"
                ? "bg-white text-gray-950"
                : "text-white/40 hover:text-white hover:bg-white/5"
            }`}
          >
            Example 2 — GPU & Limits
          </button>
        </div>
      </div>

      {tab === "example1" && <RotationLab />}
      {tab === "example2" && <EnvLab />}
    </div>
  );
}
