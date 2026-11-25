import type { CSSProperties } from "react";

/**
 * 조명 연습실은 어두운 극장에서 쓰는 도구라 늘 다크 테마다. 사이트 공통 색 토큰을 이 화면 안에서만 덮어쓴다.
 * point는 무대 조명 같은 앰버로, 어두운 바탕 위 글자·테두리로 읽히고 그 위 글자(on-point)는 어둡게 둔다.
 */
export const DARK_THEME = {
  "--color-point": "#f5b54a",
  "--color-on-point": "#1a1205",
  "--color-main": "#b97a1c",
  "--color-shade": "#2a2f3a",
  "--color-ink": "#e3e7ee",
  "--color-surface": "#171a21",
  colorScheme: "dark",
} as CSSProperties;

export const BUTTON =
  "flex items-center gap-1 rounded-md border border-white/15 bg-surface px-2 py-1 text-xs font-bold text-ink hover:bg-shade disabled:opacity-40";
export const SEGMENT =
  "rounded-md border border-white/15 bg-surface px-2 py-1 text-xs font-bold text-ink hover:bg-shade aria-pressed:bg-point aria-pressed:text-on-point disabled:opacity-40";
export const LABEL = "text-[11px] font-bold text-ink/60";
/** 색 고르기 칸. 브라우저 기본 견본의 안쪽 여백·테두리를 없애 사각형 안 사각형으로 보이지 않게 한다. */
export const COLOR_INPUT =
  "h-6 w-10 shrink-0 cursor-pointer appearance-none overflow-hidden rounded-md border border-white/15 bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-[5px] [&::-moz-color-swatch]:border-none [&::-moz-color-swatch]:rounded-[5px]";
/** 속성 패널 라벨 칸: 라벨은 늘 필드와 같은 줄 왼쪽에 같은 폭으로 놓는다. */
export const FIELD_LABEL = `${LABEL} w-14 shrink-0 leading-tight`;
export const PANEL_TITLE = "text-xs font-bold text-ink";
/** 하나만 고르는 모드 묶음(시점·품질): 테두리 하나 안에 붙은 칸들 */
export const SEG_GROUP = "flex overflow-hidden rounded-md border border-white/15 bg-surface";
export const SEG_ITEM =
  "border-l border-white/15 px-2.5 py-1 text-xs font-bold text-ink first:border-l-0 hover:bg-shade aria-pressed:bg-point aria-pressed:text-on-point";
