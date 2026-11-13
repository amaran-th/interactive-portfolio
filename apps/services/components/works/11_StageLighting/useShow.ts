"use client";

import { useSyncExternalStore } from "react";
import type { Show } from "./show";
import type { Store } from "./store";

/** store에서 필요한 조각만 구독한다. 선택자는 참조가 안정적인 값을 돌려줘야 한다. */
export function useShow<T>(store: Store, select: (s: Show) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => select(store.get()),
    () => select(store.get()),
  );
}

export function useHistory(store: Store): { canUndo: boolean; canRedo: boolean } {
  const canUndo = useSyncExternalStore(store.subscribe, store.canUndo, store.canUndo);
  const canRedo = useSyncExternalStore(store.subscribe, store.canRedo, store.canRedo);
  return { canUndo, canRedo };
}
