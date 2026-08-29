"use client";

import {
  ChevronDown,
  Copy,
  GitCompare,
  Pencil,
  Plus,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Scenario } from "./types";

type ScenarioTabsProps = {
  scenarios: Scenario[];
  activeScenarioId: string;
  onSelect: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onCreate: () => void;
  showComparison: boolean;
  onToggleComparison: () => void;
};

export default function ScenarioTabs({
  scenarios,
  activeScenarioId,
  onSelect,
  onRename,
  onDelete,
  onDuplicate,
  onCreate,
  showComparison,
  onToggleComparison,
}: ScenarioTabsProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileRootRef = useRef<HTMLDivElement>(null);
  const activeScenario = scenarios.find((s) => s.id === activeScenarioId);

  useEffect(() => {
    if (!mobileOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        mobileRootRef.current &&
        !mobileRootRef.current.contains(e.target as Node)
      ) {
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mobileOpen]);

  const startRename = (scenario: Scenario) => {
    setRenamingId(scenario.id);
    setRenameDraft(scenario.name);
  };

  const commitRename = (id: string) => {
    const name = renameDraft.trim();
    if (name) {
      onRename(id, name);
    }
    setRenamingId(null);
  };

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <div ref={mobileRootRef} className="relative min-w-32 @min-[500px]:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="flex w-full items-center justify-between gap-1 rounded-full border border-gray-200 bg-white/80 px-3 py-1.5 text-sm text-gray-700"
        >
          <span className="truncate">{activeScenario?.name}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-400" />
        </button>
        {mobileOpen && (
          <div className="absolute left-0 top-full z-20 mt-1 w-48 rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
            {scenarios.map((scenario) => (
              <button
                key={scenario.id}
                type="button"
                onClick={() => {
                  onSelect(scenario.id);
                  setMobileOpen(false);
                }}
                className={`block w-full truncate rounded-lg px-2 py-1.5 text-left text-sm hover:bg-gray-100 ${
                  scenario.id === activeScenarioId
                    ? "bg-gray-100 font-medium"
                    : ""
                }`}
              >
                {scenario.name}
              </button>
            ))}
            <div className="my-1 border-t border-gray-100" />
            <button
              type="button"
              onClick={() => {
                onDuplicate(activeScenarioId);
                setMobileOpen(false);
              }}
              className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm text-gray-600 hover:bg-gray-100"
            >
              <Copy className="h-3.5 w-3.5" /> 현재 탭 복제
            </button>
            <button
              type="button"
              onClick={() => {
                onCreate();
                setMobileOpen(false);
              }}
              className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm text-indigo-600 hover:bg-gray-100"
            >
              <Plus className="h-3.5 w-3.5" /> 새 시나리오
            </button>
          </div>
        )}
      </div>
      <ul className="hidden flex-wrap items-center gap-1.5 @min-[500px]:flex">
        {scenarios.map((scenario) => {
          const active = scenario.id === activeScenarioId;
          return (
            <li
              key={scenario.id}
              className={`flex h-7 items-center gap-0.5 rounded-full pl-3 pr-1.5 text-xs ${
                active
                  ? "bg-indigo-500 text-white"
                  : "bg-white/80 text-gray-600"
              }`}
            >
              {renamingId === scenario.id ? (
                <input
                  autoFocus
                  value={renameDraft}
                  onChange={(e) => setRenameDraft(e.target.value)}
                  onBlur={() => commitRename(scenario.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitRename(scenario.id);
                    }
                    if (e.key === "Escape") {
                      setRenamingId(null);
                    }
                  }}
                  className="w-24 min-w-0 rounded border border-indigo-300 px-1 text-xs text-gray-800 outline-none"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => onSelect(scenario.id)}
                  className="max-w-[120px] truncate"
                >
                  {scenario.name}
                </button>
              )}
              <button
                type="button"
                onClick={() => startRename(scenario)}
                className={`rounded-full p-1 ${
                  active
                    ? "text-white/70 hover:bg-white/20 hover:text-white"
                    : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                }`}
                aria-label="시나리오 이름 수정"
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(scenario.id)}
                disabled={scenarios.length <= 1}
                className={`rounded-full p-1 ${
                  scenarios.length <= 1
                    ? "cursor-not-allowed text-white/30"
                    : active
                      ? "text-white/70 hover:bg-white/20 hover:text-white"
                      : "text-gray-400 hover:bg-rose-50 hover:text-rose-500"
                }`}
                aria-label="시나리오 삭제"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={() => onDuplicate(activeScenarioId)}
        className="hidden h-7 items-center gap-1 rounded-full bg-white/80 px-3 text-xs text-gray-600 hover:bg-white @min-[500px]:inline-flex"
      >
        <Copy className="h-3.5 w-3.5" /> 현재 탭 복제
      </button>
      <button
        type="button"
        onClick={onCreate}
        className="hidden h-7 items-center rounded-full bg-white/80 px-3 text-xs text-indigo-600 hover:bg-white @min-[500px]:inline-flex"
      >
        + 새 시나리오
      </button>
      <button
        type="button"
        onClick={onToggleComparison}
        className={`ml-auto inline-flex h-7 items-center gap-1 rounded-full px-3 text-xs ${
          showComparison
            ? "bg-indigo-500 text-white"
            : "bg-white/80 text-gray-600 hover:bg-white"
        }`}
      >
        <GitCompare className="h-3.5 w-3.5" /> 시나리오 비교
      </button>
    </div>
  );
}
