const LIBRARY_KEY = "playground-asset-library";

export type PixelArt = {
  id: string;
  name: string;
  width: number;
  height: number;
  palette: string[]; // hex 색상
  pixels: number[]; // length = width*height, palette 인덱스, -1 = 투명
  createdAt: number;
};

export type BeatTrack = {
  wave: "square" | "triangle" | "noise";
  steps: (string | null)[];
};

export type BeatPattern = {
  id: string;
  name: string;
  type: "bgm" | "sfx";
  bpm: number;
  tracks: BeatTrack[];
  createdAt: number;
};

type AssetLibrary = {
  pixelArt: PixelArt[];
  beatPatterns: BeatPattern[];
};

export function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

function loadLibrary(): AssetLibrary {
  if (typeof window === "undefined") return { pixelArt: [], beatPatterns: [] };
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    if (!raw) return { pixelArt: [], beatPatterns: [] };
    const parsed = JSON.parse(raw) as Partial<AssetLibrary>;
    return {
      pixelArt: parsed.pixelArt ?? [],
      beatPatterns: parsed.beatPatterns ?? [],
    };
  } catch {
    return { pixelArt: [], beatPatterns: [] };
  }
}

function saveLibrary(lib: AssetLibrary) {
  try {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(lib));
  } catch {}
}

export function listPixelArt(): PixelArt[] {
  return loadLibrary().pixelArt;
}

export function getPixelArt(id: string): PixelArt | undefined {
  return loadLibrary().pixelArt.find((p) => p.id === id);
}

export function savePixelArt(art: PixelArt): void {
  const lib = loadLibrary();
  const idx = lib.pixelArt.findIndex((p) => p.id === art.id);
  if (idx >= 0) lib.pixelArt[idx] = art;
  else lib.pixelArt.push(art);
  saveLibrary(lib);
}

export function renamePixelArt(id: string, name: string): void {
  const lib = loadLibrary();
  const item = lib.pixelArt.find((p) => p.id === id);
  if (!item) return;
  item.name = name;
  saveLibrary(lib);
}

export function deletePixelArt(ids: string[]): void {
  const lib = loadLibrary();
  lib.pixelArt = lib.pixelArt.filter((p) => !ids.includes(p.id));
  saveLibrary(lib);
}

export function duplicatePixelArt(id: string): PixelArt | undefined {
  const lib = loadLibrary();
  const item = lib.pixelArt.find((p) => p.id === id);
  if (!item) return undefined;
  const copy: PixelArt = {
    ...item,
    id: uid(),
    name: `${item.name} 사본`,
    pixels: item.pixels.slice(),
    palette: item.palette.slice(),
    createdAt: Date.now(),
  };
  lib.pixelArt.push(copy);
  saveLibrary(lib);
  return copy;
}
