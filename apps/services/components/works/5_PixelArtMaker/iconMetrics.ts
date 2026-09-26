// 데스크탑은 배경화면 비율에 맞춰 뷰포트를 채우며 커지는데(Desktop.tsx의
// fittedSize), 아이콘·그리드·글자가 고정 크기로 남아 큰 화면에서 상대적으로
// 작아 보이는 문제가 있었다 — 데스크탑 폭을 기준 폭으로 나눈 비율만큼 이
// 값들을 전부 균일하게 확대한다. 그리드 간격(이 파일의 GRID_STEP)도
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

// 아이콘 격자 한 칸의 기준(배율 1.0) 크기 — px. useDesktopLayout.ts(자유
// 배치 스냅)와 모바일 격자 배치가 공유한다.
export const GRID_STEP = 96;

// 모바일 격자의 고정 열 수 — 실제 폰 홈스크린 관례에 맞춘 값.
export const MOBILE_COLUMNS = 4;

// 컨테이너 실제 폭(화면 px)을 4등분한 칸 하나가 GRID_STEP(기준 좌표계 칸
// 크기)이 되게 하는 배율 — desktop의 getIconScale과 같은 자리(기준 좌표
// × 배율 = 화면 좌표)에서 쓰인다.
export function getMobileIconScale(containerWidth: number): number {
  if (!containerWidth) return 1;
  return containerWidth / (MOBILE_COLUMNS * GRID_STEP);
}

// 모바일 전용 — 아이콘 그래픽(썸네일 캔버스/특수 아이콘 SVG)을 감싸는
// 흰 카드 배경. desktop은 이 클래스를 쓰지 않는다.
export const MOBILE_ICON_CARD =
  "flex items-center justify-center rounded-2xl bg-white shadow-md";

export function getIconScale(desktopWidth: number | undefined): number {
  if (!desktopWidth) return 1;
  const raw = desktopWidth / BASE_DESKTOP_WIDTH;
  return Math.min(MAX_ICON_SCALE, Math.max(MIN_ICON_SCALE, raw));
}
