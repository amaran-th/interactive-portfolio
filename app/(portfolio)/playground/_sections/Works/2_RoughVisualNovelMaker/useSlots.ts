import { useCallback, useEffect, useState } from "react";

const SLOTS_KEY = "rough-vn-slots";

export type SlotMeta = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  cutCount: number;
  characterCount: number;
};

const uid = () => Math.random().toString(36).slice(2, 9);

function load(): SlotMeta[] {
  try {
    const raw = localStorage.getItem(SLOTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function useSlots() {
  const [slots, setSlots] = useState<SlotMeta[]>(() => load());

  useEffect(() => {
    localStorage.setItem(SLOTS_KEY, JSON.stringify(slots));
  }, [slots]);

  const createSlot = useCallback((): SlotMeta => {
    const slot: SlotMeta = {
      id: uid(),
      title: "제목 없음",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      cutCount: 1,
      characterCount: 0,
    };
    setSlots((prev) => [...prev, slot]);
    return slot;
  }, []);

  const deleteSlot = useCallback((slotId: string) => {
    localStorage.removeItem(`rough-vn-slot-${slotId}`);
    setSlots((prev) => prev.filter((s) => s.id !== slotId));
  }, []);

  const updateSlotMeta = useCallback((slotId: string, patch: Partial<SlotMeta>) => {
    setSlots((prev) =>
      prev.map((s) =>
        s.id === slotId ? { ...s, ...patch, updatedAt: Date.now() } : s,
      ),
    );
  }, []);

  return { slots, createSlot, deleteSlot, updateSlotMeta };
}
