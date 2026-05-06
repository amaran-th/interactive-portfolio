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
      className="flex items-center gap-4 rounded-2xl border-2 border-dashed border-white/15 bg-white/3 px-5 py-5 text-left transition-all hover:border-white/30 hover:bg-white/6"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-dashed border-white/20">
        <Plus className="size-4 text-gray-600" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">새 작품</p>
        <p className="mt-0.5 text-xs text-gray-700">슬롯 {index + 1}</p>
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
    <div className="relative flex items-center gap-4 rounded-2xl border-2 border-white/10 bg-white/5 px-5 py-5 transition-all hover:border-white/20 hover:bg-white/8">
      {/* Slot number badge */}
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/8 font-mono text-xs text-gray-600">
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
            className="w-full rounded border border-white/20 bg-white/10 px-2 py-0.5 text-sm font-semibold text-white outline-none"
          />
        ) : (
          <button
            onClick={() => {
              setDraft(slot.title);
              setEditing(true);
            }}
            className="truncate text-left text-sm font-semibold text-white hover:opacity-70"
            title="클릭해서 제목 수정"
          >
            {slot.title}
          </button>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-white/6 px-2 py-0.5 text-xs text-gray-500">
            {slot.cutCount}컷
          </span>
          <span className="rounded-full bg-white/6 px-2 py-0.5 text-xs text-gray-500">
            {slot.characterCount}캐릭터
          </span>
          <span className="text-xs text-gray-700">{relativeTime(slot.updatedAt)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-2">
        {confirmDelete ? (
          <>
            <button
              onClick={() => setConfirmDelete(false)}
              className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-gray-400 hover:bg-white/5"
            >
              취소
            </button>
            <button
              onClick={onDelete}
              className="rounded-full bg-red-900/60 px-3 py-1.5 text-xs text-red-300 hover:bg-red-800/60"
            >
              삭제
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setConfirmDelete(true)}
              className="rounded-full border border-white/10 px-2.5 py-1.5 text-xs text-gray-600 transition-colors hover:border-red-900/50 hover:text-red-400"
            >
              삭제
            </button>
            <button
              onClick={onPlay}
              className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:border-white/30 hover:text-white"
            >
              ▶
            </button>
            <button
              onClick={onSelect}
              className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-gray-950 transition-colors hover:bg-gray-100"
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
    <div className="flex h-full flex-col bg-gray-950 text-white">
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
