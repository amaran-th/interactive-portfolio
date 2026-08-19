"use client";

import { useState } from "react";
import { Group } from "../types";

const NEW_GROUP_VALUE = "__new__";
const NONE_VALUE = "";

type GroupPickerProps = {
  groups: Group[];
  value: string;
  onChange: (groupId: string) => void;
  onCreateGroup: (name: string) => string;
};

export default function GroupPicker({
  groups,
  value,
  onChange,
  onCreateGroup,
}: GroupPickerProps) {
  const [creating, setCreating] = useState(false);
  const [draftName, setDraftName] = useState("");

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === NEW_GROUP_VALUE) {
      setCreating(true);
      setDraftName("");
      return;
    }
    onChange(e.target.value);
  };

  const commitNewGroup = () => {
    const name = draftName.trim();
    if (!name) return;
    const id = onCreateGroup(name);
    setCreating(false);
    setDraftName("");
    onChange(id);
  };

  if (creating) {
    return (
      <div
        className="flex items-center gap-1"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "Escape") {
            e.stopPropagation();
          }
          if (e.key === "Escape") {
            setCreating(false);
          }
        }}
      >
        <input
          autoFocus
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.stopPropagation();
              commitNewGroup();
            }
            if (e.key === "Escape") {
              e.stopPropagation();
              setCreating(false);
            }
          }}
          placeholder="새 그룹 이름"
          className="w-28 rounded-full border border-white/60 bg-white/80 px-2 py-1 text-xs outline-none"
        />
        <button
          type="button"
          onClick={commitNewGroup}
          className="text-xs text-indigo-600 hover:text-indigo-800"
        >
          만들기
        </button>
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={handleSelectChange}
      className="rounded-full border border-white/60 bg-white/80 px-2 py-1 text-xs"
    >
      <option value={NONE_VALUE}>그룹 없음</option>
      {groups.map((group) => (
        <option key={group.id} value={group.id}>
          {group.name}
        </option>
      ))}
      <option value={NEW_GROUP_VALUE}>+ 새 그룹 만들기</option>
    </select>
  );
}
