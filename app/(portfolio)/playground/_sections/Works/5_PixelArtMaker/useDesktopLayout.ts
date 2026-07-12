const LAYOUT_KEY = "pixel-art-desktop-layout";
const GRID_STEP = 96;

type Position = { x: number; y: number };

function loadLayout(): Record<string, Position> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLayout(layout: Record<string, Position>) {
  try {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
  } catch {}
}

// containerWidth를 넘기면 실제 데스크탑 폭에 맞춰 한 줄에 들어갈 열 수를 계산한다
// — 배경화면 비율에 맞춰 데스크탑이 레터박스로 좁아질 수 있는데, 고정 6열 기준으로
// 배치하면 좁아진 실제 폭을 넘어서는 아이콘들이 전부 같은 클램프 위치로 밀려나
// 서로 겹쳐 보이는 문제가 있었다.
export function getIconPosition(id: string, fallbackIndex: number, containerWidth?: number): Position {
  const layout = loadLayout();
  if (layout[id]) return layout[id];
  const perRow = containerWidth ? Math.max(1, Math.floor(containerWidth / GRID_STEP)) : 6;
  // 왼쪽 위 첫 칸(col 0, row 0)은 "편집기" 아이콘의 고정 코너 자리와 겹치므로
  // 한 칸 건너뛰고 시작한다.
  const shiftedIndex = fallbackIndex + 1;
  const col = shiftedIndex % perRow;
  const row = Math.floor(shiftedIndex / perRow);
  return { x: col * GRID_STEP + 16, y: row * GRID_STEP + 16 };
}

// 휴지통/포맷처럼 그리드 기본값이 아니라 CSS 코너 배치(bottom-4 right-4 등)를
// 기본값으로 쓰는 특수 아이콘용 — 저장된 위치가 없으면 null을 그대로 돌려준다.
export function getStoredPosition(id: string): Position | null {
  return loadLayout()[id] ?? null;
}

export function setIconPosition(id: string, x: number, y: number): void {
  const layout = loadLayout();
  const snappedX = Math.round(x / GRID_STEP) * GRID_STEP;
  const snappedY = Math.round(y / GRID_STEP) * GRID_STEP;
  layout[id] = { x: snappedX, y: snappedY };
  saveLayout(layout);
}

export function removeIconPositions(ids: string[]): void {
  const layout = loadLayout();
  for (const id of ids) delete layout[id];
  saveLayout(layout);
}

// 휴지통/포맷 등 특수 아이콘도 이제 같은 저장소(LAYOUT_KEY)를 공유하므로
// 하나만 지우면 전체(일반 아이콘 + 특수 아이콘) 배치가 초기화된다.
export function resetDesktopLayout(): void {
  try {
    localStorage.removeItem(LAYOUT_KEY);
  } catch {}
}
