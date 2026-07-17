import { createGrid } from "./pixelGrid";
import {
  encodeStored,
  PackedPixels,
  PixelArt,
  unpackPixels,
} from "../_shared/assetLibrary";

const WALLPAPER_KEY = "pixel-art-desktop-wallpaper";

// 이 Work의 데스크탑 배경화면 전용 문서. 일반 PixelArt 목록(_shared/assetLibrary)과는
// 별도로 저장되며(공유 라이브러리에 섞이지 않음), 항상 하나만 존재하고
// 삭제·이름 변경이 불가능하다 — 지울 수 없으므로 목록이 아니라 단일 문서로 다룬다.
export const WALLPAPER_ID = "__wallpaper__";
export const WALLPAPER_NAME = "배경화면";

// 일반 새 캔버스 프리셋(CANVAS_PRESETS)과는 별도의, 배경에 어울리는 가로로 넓은 규격.
const WALLPAPER_WIDTH = 32;
const WALLPAPER_HEIGHT = 18;

function defaultWallpaper(): PixelArt {
  return {
    id: WALLPAPER_ID,
    name: WALLPAPER_NAME,
    width: WALLPAPER_WIDTH,
    height: WALLPAPER_HEIGHT,
    palette: [],
    pixels: createGrid(WALLPAPER_WIDTH, WALLPAPER_HEIGHT).map((_, i) => {
      // 은은한 두 색 체크 패턴 기본값 — 완전히 빈 화면보다 "배경화면이 존재한다"는
      // 게 눈에 띄고, 사용자가 직접 그려 덮어쓰기도 쉽다.
      const x = i % WALLPAPER_WIDTH;
      const y = Math.floor(i / WALLPAPER_WIDTH);
      return (x + y) % 6 < 3 ? "#f4f4f5" : "#e4e4e7";
    }),
    createdAt: Date.now(),
  };
}

type StoredWallpaperV2 = Omit<PixelArt, "pixels"> & {
  pixels: PackedPixels;
  version: 2;
};
type StoredWallpaperV1 = Omit<PixelArt, "pixels"> & {
  pixels: string | number[];
};

export function getWallpaper(): PixelArt {
  if (typeof window === "undefined") return defaultWallpaper();
  try {
    const raw = localStorage.getItem(WALLPAPER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredWallpaperV2 | StoredWallpaperV1;
      if ("version" in parsed && parsed.version === 2) {
        return { ...parsed, pixels: unpackPixels(parsed.pixels) };
      }
      // 이전(인덱스 팔레트) 포맷 — 인덱스를 palette로 풀어 실제 hex로 바꾸고,
      // 예전 palette는 그대로 즐겨찾기 목록으로 이어받는다.
      const legacy = parsed as StoredWallpaperV1;
      const legacyPixels = legacy.pixels;
      const indices: number[] = Array.isArray(legacyPixels)
        ? legacyPixels
        : Array.from(legacyPixels, (ch) =>
            ch === "." ? -1 : parseInt(ch, 36),
          );
      return {
        ...legacy,
        pixels: indices.map((i) =>
          i < 0 ? null : (legacy.palette[i] ?? null),
        ),
      };
    }
  } catch {}
  const fresh = defaultWallpaper();
  saveWallpaper(fresh);
  return fresh;
}

export function saveWallpaper(art: PixelArt): boolean {
  // id·name은 항상 고정값으로 강제한다 — 편집기에서 실수로라도 바뀌지 않도록.
  const locked: PixelArt = { ...art, id: WALLPAPER_ID, name: WALLPAPER_NAME };
  try {
    localStorage.setItem(WALLPAPER_KEY, JSON.stringify(encodeStored(locked)));
    return true;
  } catch {
    return false;
  }
}

export function resetWallpaper(): void {
  try {
    localStorage.removeItem(WALLPAPER_KEY);
  } catch {}
}
