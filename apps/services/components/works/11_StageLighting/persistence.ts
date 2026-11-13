"use client";

// 공연 자동 저장. 변경 1초 뒤 idle 시간에 직렬화하고, 탭을 닫거나 숨길 때는 바로 저장한다.
import { useEffect, useRef } from "react";
import type { Quality } from "./quality";
import { type Show, defaultShow, deserialize, serialize } from "./show";
import type { Store } from "./store";

export const SHOW_KEY = "stage-lighting-show";
export const QUALITY_KEY = "stage-lighting-quality";
const DEBOUNCE_MS = 1000;

export function loadShow(): { show: Show; notice: string | null } {
  let text: string | null;
  try {
    text = localStorage.getItem(SHOW_KEY);
  } catch {
    return { show: defaultShow(), notice: "이 브라우저에서는 저장을 쓸 수 없어요." };
  }
  if (text === null) return { show: defaultShow(), notice: null };
  const show = deserialize(text);
  if (show) return { show, notice: null };
  return {
    show: defaultShow(),
    notice: "저장된 무대를 읽지 못해 기본 무대로 시작했어요. 무언가 고치면 새로 저장돼요.",
  };
}

export function loadQuality(): Quality {
  try {
    const q = localStorage.getItem(QUALITY_KEY);
    return q === "high" || q === "low" || q === "auto" ? q : "auto";
  } catch {
    return "auto";
  }
}

export function saveQuality(q: Quality): void {
  try {
    localStorage.setItem(QUALITY_KEY, q);
  } catch {
    // 저장하지 못해도 이번 세션 동작에는 지장이 없다.
  }
}

/** store가 바뀔 때만 저장한다. 불러온 직후에는 쓰지 않아 깨진 저장본을 바로 덮지 않는다. */
export function useAutoSave(store: Store, onError: (msg: string) => void): void {
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  });

  useEffect(() => {
    let pending = false;
    let timer = 0;
    let idle = 0;
    let usedIdle = false;

    const write = () => {
      if (!pending) return;
      pending = false;
      try {
        localStorage.setItem(SHOW_KEY, serialize(store.get()));
      } catch {
        onErrorRef.current("저장 공간이 부족해 저장하지 못했어요.");
      }
    };
    const cancelIdle = () => {
      if (!idle) return;
      if (usedIdle) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      idle = 0;
    };
    const schedule = () => {
      pending = true;
      window.clearTimeout(timer);
      cancelIdle();
      timer = window.setTimeout(() => {
        usedIdle = typeof window.requestIdleCallback === "function";
        idle = usedIdle
          ? window.requestIdleCallback(write, { timeout: DEBOUNCE_MS })
          : window.setTimeout(write, 0);
      }, DEBOUNCE_MS);
    };
    const flush = () => {
      window.clearTimeout(timer);
      cancelIdle();
      write();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };

    const unsubscribe = store.subscribe(schedule);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      flush();
      unsubscribe();
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [store]);
}
