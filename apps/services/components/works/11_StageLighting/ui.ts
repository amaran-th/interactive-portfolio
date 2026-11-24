import type { CSSProperties } from "react";

/**
 * 조명 연습실은 어두운 극장에서 쓰는 도구라 늘 다크 테마다. 사이트 공통 색 토큰을 이 화면 안에서만 덮어쓴다.
 * point는 어두운 바탕 위 글자·테두리로 읽히는 밝은 파랑이고, 그 위 글자(on-point)는 어둡게 둔다.
 */
export const DARK_THEME = {
  "--color-point": "#8ab4f8",
  "--color-on-point": "#0b1220",
  "--color-main": "#4f7fd0",
  "--color-shade": "#25314a",
  "--color-ink": "#e3e7ee",
  "--color-surface": "#171a21",
  colorScheme: "dark",
} as CSSProperties;

export const BUTTON =
  "flex items-center gap-1 rounded-md border-2 border-point bg-surface px-2 py-1 text-xs font-bold text-point hover:bg-shade disabled:opacity-40";
export const SEGMENT =
  "rounded-md border-2 border-point bg-surface px-2 py-1 text-xs font-bold text-point hover:bg-shade aria-pressed:bg-point aria-pressed:text-on-point disabled:opacity-40";
export const LABEL = "text-[11px] font-bold text-point";
export const PANEL_TITLE = "text-xs font-bold text-point";
/** 하나만 고르는 모드 묶음(시점·품질): 테두리 하나 안에 붙은 칸들 */
export const SEG_GROUP = "flex overflow-hidden rounded-md border-2 border-point bg-surface";
export const SEG_ITEM =
  "border-l-2 border-point px-2.5 py-1 text-xs font-bold text-point first:border-l-0 hover:bg-shade aria-pressed:bg-point aria-pressed:text-on-point";
