export type Tool =
  | "pencil"
  | "eraser"
  | "bucket"
  | "eyedropper"
  | "line"
  | "rect"
  | "circle"
  | "select"
  | "lasso"
  | "move"
  | "wand"
  | "text"
  | "gradient";

// select·wand·lasso 도구가 새로 고른 영역을 기존 선택과 어떻게 합칠지 — Shift/Alt를
// 누르고 있는 동안만 추가/제외되던 것을, 버튼으로도 같은 동작을 켜 둘 수
// 있게 한다(누르고 있을 필요 없이 토글).
export type SelectMode = "new" | "add" | "subtract";

// 선택 영역을 만들거나(select·lasso·wand) 그 선택 내용을 다루는(move) 도구
// 묶음 — 이 안에서 도구를 바꾸는 동안은 선택 영역이 계속 의미가 있으므로
// 유지하고, 이 묶음을 벗어나는 순간(다른 그리기 도구로 바뀌거나 처음부터
// 이 묶음 밖의 도구를 고르면) 더 이상 쓸모가 없어진 선택을 자동으로 지운다.
export const SELECT_TOOL_CATEGORY: Tool[] = ["select", "lasso", "move", "wand"];

export type CanvasPreset = { label: string; width: number; height: number };

// 비주얼 노벨 스튜디오(2_VisualNovelStudio)에서 그대로 쓰기 좋도록, 일반
// 정사각형 프리셋 외에 그 화면 비율에 맞춘 규격도 묶어 둔다 — 배경은
// VNDisplay의 장면 프레임 비율(16:9, `aspect-video`)에 맞추고, 캐릭터는
// 세로로 긴 서 있는 인물 실루엣에 흔한 2:5 비율로 여러 크기를 제공한다.
export const CANVAS_PRESET_GROUPS: { group: string; presets: CanvasPreset[] }[] =
  [
    {
      group: "일반",
      presets: [
        { label: "16 × 16", width: 16, height: 16 },
        { label: "32 × 32", width: 32, height: 32 },
        { label: "64 × 64", width: 64, height: 64 },
        { label: "128 × 128", width: 128, height: 128 },
        { label: "256 × 256", width: 256, height: 256 },
        { label: "512 × 512", width: 512, height: 512 },
      ],
    },
    {
      group: "배경 (16:9)",
      presets: [
        { label: "160 × 90", width: 160, height: 90 },
        { label: "256 × 144", width: 256, height: 144 },
        { label: "320 × 180", width: 320, height: 180 },
        { label: "480 × 270", width: 480, height: 270 },
      ],
    },
    {
      group: "캐릭터 (2:5)",
      presets: [
        { label: "64 × 160", width: 64, height: 160 },
        { label: "96 × 240", width: 96, height: 240 },
        { label: "128 × 320", width: 128, height: 320 },
        { label: "160 × 400", width: 160, height: 400 },
      ],
    },
  ];

// 그룹 구분이 필요 없는 곳(기본값 등)에서 쓰는 평탄화된 목록.
export const CANVAS_PRESETS: CanvasPreset[] = CANVAS_PRESET_GROUPS.flatMap(
  (g) => g.presets,
);

// 새 캔버스·캔버스 크기 수정 모두에서 쓰는 한 변의 최댓값.
export const MAX_CANVAS_SIZE = 512;

export const MAX_PALETTE_COLORS = 12;

// 레이어 스냅숏 하나가 레이어 수만큼의 평면 배열을 담으므로(실행취소 스택
// 50개 기준), 레이어 수에 상한을 둬 메모리 사용량을 억제한다.
export const MAX_LAYERS = 20;

// 프레임 모드에서 지속시간을 지정하지 않은 프레임(레이어)의 기본 재생 시간.
export const DEFAULT_FRAME_DURATION_MS = 100;
export const MIN_FRAME_DURATION_MS = 20; // 50fps 상한
export const MAX_FRAME_DURATION_MS = 5000; // 5초 하한(더 느리게는 의미 없음)

// 프레임 모드 + 어니언 스킨에서 이전/다음 프레임을 겹쳐 보여줄 때 쓰는 고정 투명도.
export const ONION_SKIN_OPACITY = 0.25;

// 트레이싱 모드에서 캔버스 배경에 깔아두는 참고 이미지. 캔버스 네이티브
// 픽셀 좌표계(그리드 단위)에 위치·크기·회전각을 가지므로, 캔버스를 확대·
// 스크롤하면 PixelCanvas의 기존 scale 변환을 그대로 타고 함께 움직인다.
// 세션 메모리에만 존재한다 — 저장(JSON/자동저장)에 포함되지 않는다.
export type TracingImage = {
  id: string;
  image: HTMLImageElement;
  x: number;
  y: number;
  width: number;
  height: number;
  rotationDeg: number; // 자유각, 0~360
  opacity: number; // 0~1
};

export const DEFAULT_TRACING_OPACITY = 0.5;
// 그리드 단위 — 너무 작아지면 손잡이로 조작할 수 없게 되는 것을 막는다.
export const MIN_TRACING_SIZE = 8;

export type ReferenceMode = "lookup" | "tracing"; // 참고 모드 / 트레이싱 모드

// 레퍼런스 창 하나가 다루는 통합 데이터 — 참고 모드로 보다가 트레이싱 모드로
// 전환해도 같은 이미지·id를 유지한다. 세션 메모리 전용, 저장 안 됨(TracingImage와
// 동일한 정책).
export type ReferenceItem = {
  id: string;
  image: HTMLImageElement | null; // 아직 안 불러왔으면 null
  mode: ReferenceMode;
  // 트레이싱 모드에 처음 들어갈 때 한 번만 채워지고, 이후 참고 모드로 돌아가도
  // 유지된다(모드를 오가도 캔버스 위 위치·크기·회전·투명도를 기억하기 위함).
  // TracingImage와 필드가 같지만 id/image가 빠진 부분집합이라 별도 타입으로 뺀다.
  tracingGeometry: Omit<TracingImage, "id" | "image"> | null;
};

export const DEFAULT_REFERENCE_MODE: ReferenceMode = "lookup";

export type Point = { x: number; y: number };

// 배율 1은 더 이상 "셀당 고정 16px"가 아니라 "캔버스 전체가 화면에 꽉 차게
// 보이는 크기"(화면 맞춤)를 뜻한다 — PixelCanvas가 뷰포트·캔버스 크기로 그
// 기준 배율을 직접 계산한다. 이 배열은 그 기준값에 곱하는 상대 배수일 뿐이라,
// 1 밑으로도(화면 맞춤보다 더 축소) 자유롭게 내려갈 수 있다.
export const ZOOM_STEPS = [0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8];

export function nextZoomStep(current: number, direction: 1 | -1): number {
  if (direction > 0) {
    const next = ZOOM_STEPS.find((z) => z > current + 1e-6);
    return next ?? ZOOM_STEPS[ZOOM_STEPS.length - 1];
  }
  const prev = [...ZOOM_STEPS].reverse().find((z) => z < current - 1e-6);
  return prev ?? ZOOM_STEPS[0];
}

// 편집기 작업 영역(캔버스가 놓인 주변 여백)의 기본 배경색 — 캔버스 자체가
// 아니라 그 바깥 뷰포트를 칠한다. 항상 불투명 단색이다(투명·체크무늬 없음).
export const DEFAULT_CANVAS_BG_COLOR = "#9ca3af";

// 편집기(rootRef 기준 너비)가 이 폭보다 좁아지면 DrawToolbar의 도형·텍스트·
// 그라데이션 도구, 이미지 불러오기/내보내기 사이드바가 모두 같은 기준으로
// 접힌 UI(더보기/아이콘 트리거)로 바뀐다 — Editor.tsx가 한 번만 측정해
// 여러 하위 컴포넌트에 내려주는 값이라 기준이 서로 어긋나지 않는다.
export const NARROW_BREAKPOINT = 820;
