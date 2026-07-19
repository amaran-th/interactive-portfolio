"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { SlotMeta } from "./useSlots";

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "방금 전";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}분 전`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}시간 전`;
  return `${Math.floor(diff / 86_400_000)}일 전`;
}

function EmptySlotCard({
  index,
  onStart,
}: {
  index: number;
  onStart: () => void;
}) {
  return (
    <button
      onClick={onStart}
      className="flex items-center gap-4 border-2 border-dashed border-gray-300 bg-white px-5 py-5 text-left transition-all hover:border-gray-400 hover:bg-gray-50"
    >
      <div className="flex size-10 shrink-0 items-center justify-center border border-dashed border-gray-300">
        <Plus className="size-4 text-gray-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">새 작품</p>
        <p className="mt-0.5 text-xs text-gray-400">슬롯 {index + 1}</p>
      </div>
    </button>
  );
}

function FilledSlotCard({
  slot,
  index,
  onSelect,
  onPlay,
  onRename,
  onDelete,
}: {
  slot: SlotMeta;
  index: number;
  onSelect: () => void;
  onPlay: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(slot.title);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const commitRename = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== slot.title) onRename(trimmed);
    else setDraft(slot.title);
  };

  return (
    <div className="relative flex items-center gap-4 border-2 border-gray-200 bg-white px-5 py-5 transition-all hover:border-gray-300 hover:bg-gray-50">
      {/* Slot number badge */}
      <div className="flex size-10 shrink-0 items-center justify-center bg-gray-100 font-mono text-xs text-gray-400">
        {String(index + 1).padStart(2, "0")}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setDraft(slot.title);
                setEditing(false);
              }
            }}
            className="w-full border border-gray-300 bg-gray-50 px-2 py-0.5 text-sm font-semibold text-gray-900 outline-none"
          />
        ) : (
          <button
            onClick={() => {
              setDraft(slot.title);
              setEditing(true);
            }}
            className="truncate text-left text-sm font-semibold text-gray-900 hover:opacity-70"
            title="클릭해서 제목 수정"
          >
            {slot.title}
          </button>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
            {slot.cutCount}컷
          </span>
          <span className="bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
            {slot.characterCount}캐릭터
          </span>
          <span className="text-xs text-gray-400">{relativeTime(slot.updatedAt)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-2">
        {confirmDelete ? (
          <>
            <button
              onClick={() => setConfirmDelete(false)}
              className="border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              onClick={onDelete}
              className="bg-red-500 px-3 py-1.5 text-xs text-white hover:bg-red-600"
            >
              삭제
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setConfirmDelete(true)}
              className="border border-gray-200 px-2.5 py-1.5 text-xs text-gray-400 transition-colors hover:border-red-300 hover:text-red-600"
            >
              삭제
            </button>
            <button
              onClick={onPlay}
              className="border border-gray-200 px-3 py-1.5 text-xs text-gray-700 transition-colors hover:border-gray-400 hover:text-gray-900"
            >
              ▶
            </button>
            <button
              onClick={onSelect}
              className="bg-[#2f3a8f] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-90"
            >
              편집 →
            </button>
          </>
        )}
      </div>
    </div>
  );
}

interface Props {
  slots: SlotMeta[];
  maxSlots?: number;
  onNewSlot: () => void;
  onSelectSlot: (slot: SlotMeta) => void;
  onPlaySlot: (slot: SlotMeta) => void;
  onRenameSlot: (id: string, title: string) => void;
  onDeleteSlot: (id: string) => void;
}

export default function HomeScreen({
  slots,
  maxSlots = 3,
  onNewSlot,
  onSelectSlot,
  onPlaySlot,
  onRenameSlot,
  onDeleteSlot,
}: Props) {
  return (
    <div className="flex h-full flex-col bg-[#f7f6f3] text-gray-900">
      {/* Header */}
      <div className="shrink-0 px-6 pt-8 pb-6">
        <h1 className="text-xl font-bold tracking-tight">비주얼 노벨 메이커</h1>
        <p className="mt-1 text-xs text-gray-500">작품을 선택하거나 새로 만드세요.</p>
      </div>

      {/* Slot list */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        <div className="flex flex-col gap-3">
          {Array.from({ length: maxSlots }, (_, i) => {
            const slot = slots[i] ?? null;
            if (slot) {
              return (
                <FilledSlotCard
                  key={slot.id}
                  slot={slot}
                  index={i}
                  onSelect={() => onSelectSlot(slot)}
                  onPlay={() => onPlaySlot(slot)}
                  onRename={(title) => onRenameSlot(slot.id, title)}
                  onDelete={() => onDeleteSlot(slot.id)}
                />
              );
            }
            return (
              <EmptySlotCard
                key={i}
                index={i}
                onStart={onNewSlot}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
