// 데스크탑은 배경화면 비율에 맞춰 뷰포트를 채우며 커지는데(Desktop.tsx의
// fittedSize), 아이콘·그리드·글자가 고정 크기로 남아 큰 화면에서 상대적으로
// 작아 보이는 문제가 있었다 — 데스크탑 폭을 기준 폭으로 나눈 비율만큼 이
// 값들을 전부 균일하게 확대한다. 그리드 간격(useDesktopLayout의 GRID_STEP)도
// 같은 배율로 커지므로 아이콘이 옆 칸을 침범하지 않는다.

// 이 폭 이하에서는 배율 1.0 — 일반 노트북 뷰포트에서는 지금과 똑같이 보인다.
export const BASE_DESKTOP_WIDTH = 1280;
export const MIN_ICON_SCALE = 1;
export const MAX_ICON_SCALE = 1.6;

// 아이콘의 기준(배율 1.0) 크기 — px. DesktopIcon과 Desktop의 특수 아이콘이
// 공유한다. GRID_STEP(96)과의 비율이 유지되도록 배율만 곱해 쓴다.
export const ICON_BOX = 80;
export const ICON_PADDING = 8;
export const ICON_GAP = 4;
export const ICON_LABEL_PX = 10;
export const ICON_CANVAS_PX = 48;
export const ICON_CORNER_MARGIN = 16;

export function getIconScale(desktopWidth: number | undefined): number {
  if (!desktopWidth) return 1;
  const raw = desktopWidth / BASE_DESKTOP_WIDTH;
  return Math.min(MAX_ICON_SCALE, Math.max(MIN_ICON_SCALE, raw));
}
