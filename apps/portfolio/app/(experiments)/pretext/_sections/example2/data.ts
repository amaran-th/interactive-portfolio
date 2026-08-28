"use client";

import { MAX_ITEMS } from "./constants";

const WORDS = [
  "something",
  "happened",
  "unexpectedly",
  "while",
  "processing",
  "request",
  "connection",
  "retry",
  "timeout",
  "cache",
  "miss",
  "warning",
  "latency",
  "increased",
  "background",
  "worker",
  "restarted",
  "queue",
  "drained",
  "segment",
  "rebuilt",
  "token",
  "expired",
  "fallback",
  "triggered",
  "partial",
  "response",
  "captured",
  "observer",
  "reported",
  "layout",
  "correction",
  "before",
  "stabilizing",
];

function seededValue(seed: number) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

const BASE_TEXTS = Array.from({ length: MAX_ITEMS }, (_, index) => {
  // 1–100 단어로 폭넓게 분포 → 높이 편차를 극대화
  const wordCount = 1 + Math.floor(seededValue(index) * 100);
  const words = Array.from({ length: wordCount }, (_, wordIndex) => {
    const value = seededValue(index * 37 + wordIndex * 13);
    return WORDS[Math.floor(value * WORDS.length)];
  });

  return `#${index}\n${words.join(" ")}.`;
});

export function getBenchmarkTexts(count: number) {
  return BASE_TEXTS.slice(0, count);
}
