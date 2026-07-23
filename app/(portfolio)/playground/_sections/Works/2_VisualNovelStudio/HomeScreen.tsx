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
      className="flex items-center gap-4 rounded-2xl border-2 border-dashed border-black bg-[#d9d9d9] px-5 py-5 text-left transition-all hover:bg-black/5"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-black">
        <Plus className="size-4 text-black" />
      </div>
      <div>
        <p className="text-sm font-medium text-black">새 작품</p>
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
    <div className="relative flex items-center gap-4 rounded-2xl border-2 border-black bg-[#d9d9d9] px-5 py-5 transition-all hover:bg-black/5">
      {/* Slot number badge */}
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-black bg-white font-mono text-xs text-black">
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
            className="w-full rounded-lg border-2 border-black bg-white px-2 py-0.5 text-sm font-semibold text-black outline-none"
          />
        ) : (
          <button
            onClick={() => {
              setDraft(slot.title);
              setEditing(true);
            }}
            className="truncate text-left text-sm font-semibold text-black hover:opacity-70"
            title="클릭해서 제목 수정"
          >
            {slot.title}
          </button>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="rounded-full border-2 border-black bg-white px-2 py-0.5 text-xs text-black">
            {slot.cutCount}컷
          </span>
          <span className="rounded-full border-2 border-black bg-white px-2 py-0.5 text-xs text-black">
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
              className="rounded-lg border-2 border-black px-3 py-1.5 text-xs text-black hover:bg-black/5"
            >
              취소
            </button>
            <button
              onClick={onDelete}
              className="rounded-lg border-2 border-black bg-[#ac1717] px-3 py-1.5 text-xs text-white hover:opacity-90"
            >
              삭제
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setConfirmDelete(true)}
              className="rounded-lg border-2 border-black px-2.5 py-1.5 text-xs text-gray-700 transition-colors hover:bg-red-50 hover:text-[#ac1717]"
            >
              삭제
            </button>
            <button
              onClick={onPlay}
              className="rounded-full border-2 border-black px-3 py-1.5 text-xs text-black transition-colors hover:bg-black/5"
            >
              ▶
            </button>
            <button
              onClick={onSelect}
              className="rounded-lg border-2 border-black bg-[#264986] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-90"
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
    <div className="flex h-full flex-col bg-[#818181] text-black">
      {/* Header */}
      <div className="shrink-0 px-6 pt-8 pb-6">
        <h1 className="text-xl font-bold tracking-tight">비주얼 노벨 메이커</h1>
        <p className="mt-1 text-xs text-black/85">작품을 선택하거나 새로 만드세요.</p>
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
