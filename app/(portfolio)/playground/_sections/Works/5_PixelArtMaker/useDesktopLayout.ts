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

export function getIconPosition(id: string, fallbackIndex: number): Position {
  const layout = loadLayout();
  if (layout[id]) return layout[id];
  const perRow = 6;
  const col = fallbackIndex % perRow;
  const row = Math.floor(fallbackIndex / perRow);
  return { x: col * GRID_STEP + 16, y: row * GRID_STEP + 16 };
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
