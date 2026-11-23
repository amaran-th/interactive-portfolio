"use client";

import { useEffect, useState } from "react";

// 카드 글자를 빠르게 타이핑해 보여 준다. 칸 크기가 흔들리지 않게 전체 글자를 투명하게 깔고 그 위에 찍는다.
// 화면 읽기 프로그램에는 처음부터 전체 글자를 준다. 움직임 줄이기 설정이면 바로 다 보여 준다.

export const MS_PER_CHAR = 14;

/** delay: 앞 글자 수만큼 기다린다. delayMs: 그 위에 더 기다릴 시간(사진이 켜지는 동안 등) */
export default function Typewriter({
  text,
  run,
  delay = 0,
  delayMs = 0,
  msPerChar = MS_PER_CHAR,
}: {
  text: string;
  run: boolean;
  delay?: number;
  delayMs?: number;
  /** 한 글자에 걸리는 시간. 기본은 빠른 타이핑 */
  msPerChar?: number;
}) {
  const [n, setN] = useState(run ? 0 : text.length);

  useEffect(() => {
    if (!run) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = requestAnimationFrame(() => setN(text.length));
      return () => cancelAnimationFrame(id);
    }
    let raf = 0;
    const t0 = performance.now() + delay * msPerChar + delayMs;
    const tick = (t: number) => {
      const k = Math.max(0, Math.min(text.length, Math.floor((t - t0) / msPerChar)));
      setN(k);
      if (k < text.length) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, text, delay, delayMs, msPerChar]);

  if (n >= text.length) return <>{text}</>;
  return (
    // block으로 감싸야 겹친 글자가 원래 글자와 같은 폭에서 줄을 바꾼다
    <span className="relative block">
      <span className="invisible" aria-hidden>
        {text}
      </span>
      <span className="absolute inset-0 block" aria-hidden>
        {text.slice(0, n)}
        {n > 0 && <span className="opacity-70">▌</span>}
      </span>
      <span className="sr-only">{text}</span>
    </span>
  );
}
