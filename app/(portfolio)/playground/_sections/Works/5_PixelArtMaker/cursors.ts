import { Tool } from "./types";

// 실제 OS 커서 대신, 이 편집기 전용으로 그린 작은 SVG를 CSS cursor로 쓴다.
// data URI라 이미지 파일을 따로 두지 않고, 모듈 로드 시 한 번만 계산해 재사용한다.
function svgCursor(
  inner: string,
  size: number,
  hotspotX: number,
  hotspotY: number,
  fallback: string,
): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${inner}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${hotspotX} ${hotspotY}, ${fallback}`;
}

// 십자선(펜슬·지우개·채우기·직선/사각형/원·그라데이션·선택·자동 선택 공통) — 어떤
// 배경 위에서도 보이도록 흰 테두리 위에 검정 선을 겹쳐 그리고, 정확한 대상
// 픽셀을 가리키는 중심점을 작은 점으로 표시한다.
const CROSSHAIR_LINES = `
  <g stroke="white" stroke-width="3" stroke-linecap="round">
    <line x1="10" y1="1" x2="10" y2="7"/>
    <line x1="10" y1="13" x2="10" y2="19"/>
    <line x1="1" y1="10" x2="7" y2="10"/>
    <line x1="13" y1="10" x2="19" y2="10"/>
  </g>
  <g stroke="black" stroke-width="1.5" stroke-linecap="round">
    <line x1="10" y1="1" x2="10" y2="7"/>
    <line x1="10" y1="13" x2="10" y2="19"/>
    <line x1="1" y1="10" x2="7" y2="10"/>
    <line x1="13" y1="10" x2="19" y2="10"/>
  </g>
`;

export const CURSOR_NORMAL = svgCursor(
  `<polygon points="2,1 2,17 6.2,13.4 8.6,19 11,18 8.6,12.4 14.5,12.4" fill="black" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>`,
  22,
  2,
  1,
  "default",
);

export const CURSOR_POINTING = svgCursor(
  `<polygon points="2,1 2,17 6.2,13.4 8.6,19 11,18 8.6,12.4 14.5,12.4" fill="black" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>
   <circle cx="17" cy="4" r="3" fill="#8b5cf6" stroke="white" stroke-width="1"/>`,
  22,
  2,
  1,
  "pointer",
);

export const CURSOR_DRAGGING = svgCursor(
  `<rect x="4" y="8" width="12" height="9" rx="3" fill="black" stroke="white" stroke-width="1.5"/>
   <g stroke="white" stroke-width="2" stroke-linecap="round">
     <line x1="7" y1="8" x2="7" y2="5"/>
     <line x1="10" y1="8" x2="10" y2="4"/>
     <line x1="13" y1="8" x2="13" y2="5"/>
   </g>
   <g stroke="black" stroke-width="1" stroke-linecap="round">
     <line x1="7" y1="8" x2="7" y2="5"/>
     <line x1="10" y1="8" x2="10" y2="4"/>
     <line x1="13" y1="8" x2="13" y2="5"/>
   </g>`,
  20,
  10,
  10,
  "grabbing",
);

// 스페이스+드래그로 화면을 옮기기 직전(아직 누르지 않은 상태)의 손모양.
export const CURSOR_GRAB = svgCursor(
  `<rect x="4" y="6" width="12" height="10" rx="3" fill="black" stroke="white" stroke-width="1.5"/>
   <g stroke="white" stroke-width="2" stroke-linecap="round">
     <line x1="6.5" y1="6" x2="6.5" y2="1"/>
     <line x1="10" y1="6" x2="10" y2="0.5"/>
     <line x1="13.5" y1="6" x2="13.5" y2="1"/>
   </g>
   <g stroke="black" stroke-width="1" stroke-linecap="round">
     <line x1="6.5" y1="6" x2="6.5" y2="1"/>
     <line x1="10" y1="6" x2="10" y2="0.5"/>
     <line x1="13.5" y1="6" x2="13.5" y2="1"/>
   </g>`,
  20,
  10,
  10,
  "grab",
);

export const CURSOR_TEXT = svgCursor(
  `<g stroke="white" stroke-width="3" stroke-linecap="round">
     <line x1="8" y1="2" x2="8" y2="18"/>
     <line x1="4" y1="2" x2="12" y2="2"/>
     <line x1="4" y1="18" x2="12" y2="18"/>
   </g>
   <g stroke="black" stroke-width="1.5" stroke-linecap="round">
     <line x1="8" y1="2" x2="8" y2="18"/>
     <line x1="4" y1="2" x2="12" y2="2"/>
     <line x1="4" y1="18" x2="12" y2="18"/>
   </g>`,
  16,
  8,
  10,
  "text",
);

export const CURSOR_CROSSHAIR = svgCursor(
  `${CROSSHAIR_LINES}<circle cx="10" cy="10" r="1.5" fill="black" stroke="white" stroke-width="0.5"/>`,
  20,
  10,
  10,
  "crosshair",
);

export const CURSOR_EYEDROPPER = svgCursor(
  `${CROSSHAIR_LINES}
   <circle cx="10" cy="10" r="4" fill="none" stroke="white" stroke-width="2"/>
   <circle cx="10" cy="10" r="4" fill="none" stroke="black" stroke-width="1"/>`,
  20,
  10,
  10,
  "crosshair",
);

export const CURSOR_MOVE = svgCursor(
  `<g stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="white">
     <path d="M10 1 L13 5 L11 5 L11 15 L13 15 L10 19 L7 15 L9 15 L9 5 L7 5 Z"/>
     <path d="M1 10 L5 7 L5 9 L15 9 L15 7 L19 10 L15 13 L15 11 L5 11 L5 13 Z"/>
   </g>
   <g stroke="black" stroke-width="1" fill="black">
     <path d="M10 1 L13 5 L11 5 L11 15 L13 15 L10 19 L7 15 L9 15 L9 5 L7 5 Z"/>
     <path d="M1 10 L5 7 L5 9 L15 9 L15 7 L19 10 L15 13 L15 11 L5 11 L5 13 Z"/>
   </g>`,
  20,
  10,
  10,
  "move",
);

// 캔버스 위에서 지금 선택된 도구에 따라 커서 모양을 바꾼다 — 대부분의 도구는
// 정확히 한 픽셀을 가리켜야 하므로 십자선을 공유하고, 스포이트·이동만 별도
// 아이콘을 쓴다. 텍스트 도구는 일반 UI의 텍스트 커서를 그대로 재사용한다.
export function cursorForTool(tool: Tool): string {
  if (tool === "eyedropper") return CURSOR_EYEDROPPER;
  if (tool === "move") return CURSOR_MOVE;
  if (tool === "text") return CURSOR_TEXT;
  return CURSOR_CROSSHAIR;
}
