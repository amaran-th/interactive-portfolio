"use client";

import { useState } from "react";
import { Scenario } from "./types";

type ScenarioTabsProps = {
  scenarios: Scenario[];
  activeScenarioId: string;
  onSelect: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onCreate: () => void;
};

export default function ScenarioTabs({
  scenarios,
  activeScenarioId,
  onSelect,
  onRename,
  onDelete,
  onDuplicate,
  onCreate,
}: ScenarioTabsProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

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
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <ul className="flex flex-wrap items-center gap-1">
        {scenarios.map((scenario) => {
          const active = scenario.id === activeScenarioId;
          return (
            <li
              key={scenario.id}
              className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs ${
                active ? "bg-indigo-500 text-white" : "bg-white/80 text-gray-600"
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
                className={
                  active
                    ? "text-white/70 hover:text-white"
                    : "text-gray-400 hover:text-gray-700"
                }
                aria-label="시나리오 이름 수정"
              >
                ✎
              </button>
              <button
                type="button"
                onClick={() => onDelete(scenario.id)}
                disabled={scenarios.length <= 1}
                className={
                  scenarios.length <= 1
                    ? "cursor-not-allowed text-white/30"
                    : active
                      ? "text-white/70 hover:text-white"
                      : "text-gray-400 hover:text-rose-500"
                }
                aria-label="시나리오 삭제"
              >
                ✕
              </button>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={() => onDuplicate(activeScenarioId)}
        className="rounded-full bg-white/80 px-3 py-1 text-xs text-gray-600 hover:bg-white"
      >
        현재 탭 복제
      </button>
      <button
        type="button"
        onClick={onCreate}
        className="rounded-full bg-white/80 px-3 py-1 text-xs text-indigo-600 hover:bg-white"
      >
        + 새 시나리오
      </button>
    </div>
  );
}
