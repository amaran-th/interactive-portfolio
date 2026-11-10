"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SHOW_MS = 1500;

// 클립보드에 복사하고 "복사됨"·"복사하지 못했어요"를 잠깐 보여 준다.
export function useCopyFeedback() {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = useCallback(async (text: string) => {
    let ok = false;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        ok = true;
      }
    } catch {
      ok = false;
    }
    setMessage(ok ? "복사됨" : "복사하지 못했어요");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), SHOW_MS);
  }, []);

  return { copy, message };
}
