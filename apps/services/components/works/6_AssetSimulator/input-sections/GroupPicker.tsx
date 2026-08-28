"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { AssetClass, GROUP_PALETTE, Group, usedColors } from "../types";

const NONE_VALUE = "";

type GroupPickerProps = {
  groups: Group[];
  assetClasses: AssetClass[];
  value: string;
  onChange: (groupId: string) => void;
  onCreateGroup: (name: string, color: string) => string;
  onUpdateGroup: (id: string, input: { name: string; color: string }) => void;
  onRemoveGroup: (id: string) => void;
  /** Suggested color for the next new group, pre-selected but overridable. */
  defaultColor: string;
};

export default function GroupPicker({
  groups,
  assetClasses,
  value,
  onChange,
  onCreateGroup,
  onUpdateGroup,
  onRemoveGroup,
  defaultColor,
}: GroupPickerProps) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftColor, setDraftColor] = useState(defaultColor);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [colorPickerId, setColorPickerId] = useState<string | null>(null);
  const [newGroupColorPickerOpen, setNewGroupColorPickerOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selectedGroup = groups.find((g) => g.id === value);

  const closePanel = () => {
    setOpen(false);
    setCreating(false);
    setDraftName("");
    setRenamingId(null);
    setColorPickerId(null);
    setNewGroupColorPickerOpen(false);
  };

  const startCreating = () => {
    setDraftColor(defaultColor);
    setCreating(true);
  };

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        closePanel();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const commitNewGroup = () => {
    const name = draftName.trim();
    if (!name) return;
    const id = onCreateGroup(name, draftColor);
    onChange(id);
    closePanel();
  };

  const startRename = (group: Group) => {
    setRenamingId(group.id);
    setRenameDraft(group.name);
    setColorPickerId(null);
  };

  const commitRename = (group: Group) => {
    const name = renameDraft.trim();
    if (name) {
      onUpdateGroup(group.id, { name, color: group.color });
    }
    setRenamingId(null);
  };

  return (
    <div
      ref={rootRef}
      className="relative"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === "Escape") {
          e.stopPropagation();
        }
        if (e.key === "Escape" && !renamingId && !creating) {
          closePanel();
        }
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1 rounded-full border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 shadow-sm hover:border-gray-400"
      >
        {selectedGroup ? selectedGroup.name : "그룹 없음"}
        <ChevronDown className="h-3 w-3 text-gray-400" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
          <button
            type="button"
            onClick={() => {
              onChange(NONE_VALUE);
              closePanel();
            }}
            className="w-full rounded-lg px-2 py-1 text-left text-xs text-gray-600 hover:bg-gray-100"
          >
            그룹 없음
          </button>
          <ul className="mt-1 flex flex-col gap-0.5">
            {groups.map((group) => (
              <li key={group.id} className="flex flex-col gap-1">
                <div className="flex items-center gap-1 rounded-lg px-1 py-0.5 hover:bg-gray-100">
                  <button
                    type="button"
                    onClick={() =>
                      setColorPickerId((prev) =>
                        prev === group.id ? null : group.id,
                      )
                    }
                    className="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/10"
                    style={{ backgroundColor: group.color }}
                    aria-label="그룹 색상 변경"
                  />
                  {renamingId === group.id ? (
                    <input
                      autoFocus
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      onBlur={() => commitRename(group)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          commitRename(group);
                        }
                        if (e.key === "Escape") {
                          setRenamingId(null);
                        }
                      }}
                      className="min-w-0 flex-1 rounded border border-indigo-300 px-1 text-xs outline-none"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        onChange(group.id);
                        closePanel();
                      }}
                      className="min-w-0 flex-1 truncate text-left text-xs text-gray-700"
                    >
                      {group.name}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => startRename(group)}
                    className="shrink-0 text-xs text-gray-400 hover:text-gray-700"
                    aria-label="그룹 이름 수정"
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (value === group.id) {
                        onChange(NONE_VALUE);
                      }
                      onRemoveGroup(group.id);
                    }}
                    className="shrink-0 text-xs text-gray-400 hover:text-rose-500"
                    aria-label="그룹 삭제"
                  >
                    ✕
                  </button>
                </div>
                {colorPickerId === group.id && (
                  <div className="flex flex-wrap gap-1 px-1 pb-1">
                    {GROUP_PALETTE.map((color) => {
                      const taken =
                        color !== group.color &&
                        usedColors(
                          groups.filter((g) => g.id !== group.id),
                          assetClasses,
                        ).has(color);
                      return (
                        <button
                          key={color}
                          type="button"
                          disabled={taken}
                          onClick={() => {
                            onUpdateGroup(group.id, {
                              name: group.name,
                              color,
                            });
                            setColorPickerId(null);
                          }}
                          className="h-4 w-4 rounded-full ring-1 ring-black/10 disabled:cursor-not-allowed disabled:opacity-25"
                          style={{ backgroundColor: color }}
                          aria-label={
                            taken
                              ? `색상 ${color}는 이미 사용 중`
                              : `색상 ${color}로 변경`
                          }
                        />
                      );
                    })}
                  </div>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-1 border-t border-gray-100 pt-1">
            {creating ? (
              <div className="flex items-center gap-1">
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setNewGroupColorPickerOpen((prev) => !prev)}
                    className="h-5 w-5 rounded-full ring-1 ring-black/10"
                    style={{ backgroundColor: draftColor }}
                    aria-label="그룹 색상 선택"
                  />
                  {newGroupColorPickerOpen && (
                    <div className="absolute top-full left-0 z-20 mt-1 flex w-32 flex-wrap gap-1 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
                      {GROUP_PALETTE.map((color) => {
                        const taken =
                          color !== draftColor &&
                          usedColors(groups, assetClasses).has(color);
                        return (
                          <button
                            key={color}
                            type="button"
                            disabled={taken}
                            onClick={() => {
                              setDraftColor(color);
                              setNewGroupColorPickerOpen(false);
                            }}
                            className={`h-4 w-4 rounded-full ring-1 disabled:cursor-not-allowed disabled:opacity-25 ${
                              draftColor === color
                                ? "ring-2 ring-indigo-500"
                                : "ring-black/10"
                            }`}
                            style={{ backgroundColor: color }}
                            aria-label={
                              taken
                                ? `색상 ${color}는 이미 사용 중`
                                : `색상 ${color}로 설정`
                            }
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
                <input
                  autoFocus
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitNewGroup();
                    }
                    if (e.key === "Escape") {
                      setCreating(false);
                      setDraftName("");
                    }
                  }}
                  placeholder="새 그룹 이름"
                  className="min-w-0 flex-1 rounded border border-indigo-300 px-1 text-xs outline-none"
                />
                <button
                  type="button"
                  onClick={commitNewGroup}
                  className="shrink-0 text-xs text-indigo-600 hover:text-indigo-800"
                >
                  만들기
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={startCreating}
                className="w-full rounded-lg px-2 py-1 text-left text-xs text-indigo-600 hover:bg-indigo-50"
              >
                + 새 그룹 만들기
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
