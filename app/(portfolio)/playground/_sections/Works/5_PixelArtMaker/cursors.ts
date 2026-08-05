import { Tool } from "./types";

const CURSOR_BASE_PATH = "/playground/nemo-nemo-beam/cursor";

// public/playground/nemo-nemo-beam/cursor 아래 커서 아이콘을 CSS cursor 값으로
// 변환한다. 원본 파일은 32x32 디자인을 선명하게 보이려고 64x64(2x)로 내보낸
// 것이라 image-set()으로 2x 자산임을 명시해야 브라우저가 32x32로 그린다 —
// 그냥 url()만 쓰면 64px 그대로 렌더링돼 커서가 두 배로 커 보인다. 핫스팟도
// 이 32x32 논리 좌표 기준이다.
function imageCursor(
  file: string,
  hotspotX: number,
  hotspotY: number,
  fallback: string,
): string {
  return `image-set(url("${CURSOR_BASE_PATH}/${file}") 2x) ${hotspotX} ${hotspotY}, ${fallback}`;
}

export const CURSOR_NORMAL = imageCursor("default.png", 8, 5, "default");
export const CURSOR_POINTING = imageCursor("pointer.png", 13.5, 5, "pointer");
export const CURSOR_MOVE = imageCursor("move.png", 16, 15, "move");
export const CURSOR_TEXT = imageCursor("text.png", 16, 15, "text");
export const CURSOR_CROSSHAIR = imageCursor(
  "crosshair.png",
  16,
  15,
  "crosshair",
);
// 스포이트 전용 아이콘은 없으므로 십자선 커서를 그대로 재사용한다.
export const CURSOR_EYEDROPPER = CURSOR_CROSSHAIR;
export const CURSOR_NWSE_RESIZE = imageCursor(
  "nwse-resize.png",
  15.5,
  15.5,
  "nwse-resize",
);
export const CURSOR_NESW_RESIZE = imageCursor(
  "nesw-resize.png",
  15.5,
  15.5,
  "nesw-resize",
);
export const CURSOR_NS_RESIZE = imageCursor(
  "ns-resize.png",
  15.5,
  15.5,
  "ns-resize",
);
export const CURSOR_EW_RESIZE = imageCursor(
  "ew-resize.png",
  15.5,
  15.5,
  "ew-resize",
);

// 실제 OS 커서 대신, 이 편집기 전용으로 그린 작은 SVG를 CSS cursor로 쓴다.
// grab/grabbing은 이미지 리소스가 없어 기존 방식을 그대로 유지한다.
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

// 캔버스 위에서 지금 선택된 도구에 따라 커서 모양을 바꾼다 — 대부분의 도구는
// 정확히 한 픽셀을 가리켜야 하므로 십자선을 공유하고, 스포이트·이동만 별도
// 아이콘을 쓴다. 텍스트 도구는 일반 UI의 텍스트 커서를 그대로 재사용한다.
export function cursorForTool(tool: Tool): string {
  if (tool === "eyedropper") return CURSOR_EYEDROPPER;
  if (tool === "move") return CURSOR_MOVE;
  if (tool === "text") return CURSOR_TEXT;
  return CURSOR_CROSSHAIR;
}
