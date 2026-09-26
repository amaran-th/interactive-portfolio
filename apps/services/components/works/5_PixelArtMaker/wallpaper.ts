import {
  encodeStored,
  isQuotaExceededError,
  PackedPixels,
  PixelArt,
  PixelLayer,
  SaveResult,
  unpackPixels,
} from "../_shared/assetLibrary";

const WALLPAPER_KEY = "pixel-art-desktop-wallpaper";

// 이 Work의 데스크탑 배경화면 전용 문서. 일반 PixelArt 목록(_shared/assetLibrary)과는
// 별도로 저장되며(공유 라이브러리에 섞이지 않음), 항상 하나만 존재하고
// 삭제·이름 변경이 불가능하다 — 지울 수 없으므로 목록이 아니라 단일 문서로 다룬다.
export const WALLPAPER_ID = "__wallpaper__";
export const WALLPAPER_NAME = "배경화면";
export const WALLPAPER_ID_MOBILE = "__wallpaper_mobile__";

// 일반 새 캔버스 프리셋(CANVAS_PRESETS)과는 별도의, 배경에 어울리는 가로로 넓은 규격.
const WALLPAPER_WIDTH = 32;
const WALLPAPER_HEIGHT = 18;

// 모바일용 배경화면 규격 — 세로(9:16에 가까운 비율)로, 데스크톱용과 완전히
// 별개의 파일이다.
const WALLPAPER_MOBILE_WIDTH = 18;
const WALLPAPER_MOBILE_HEIGHT = 32;

// 사용자가 직접 그려 준비한 기본 배경화면 픽셀 데이터(32×18, 576개) — 아래
// 절차적 체크 패턴 대신 이 그림이 최초 배경화면으로 쓰인다.
const WALLPAPER_PIXELS: (string | null)[] = [
      "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff",
      "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff",
      "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff",
      "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff",
      "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff",
      "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff",
      "#cbedff", "#ffffff", "#cbedff", "#cbedff", "#547fc0", "#547fc0", "#547fc0", "#cbedff",
      "#cbedff", "#547fc0", "#cbedff", "#cbedff", "#ffffff", "#cbedff", "#cbedff", "#cbedff",
      "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#ffffff", "#ffffff", "#cbedff",
      "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff",
      "#ffffff", "#cbedff", "#ffffff", "#cbedff", "#547fc0", "#547fc0", "#547fc0", "#547fc0",
      "#547fc0", "#547fc0", "#cbedff", "#ffffff", "#cbedff", "#ffffff", "#cbedff", "#cbedff",
      "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#ffffff", "#cbedff", "#cbedff", "#ffffff",
      "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#ffffff",
      "#cbedff", "#cbedff", "#cbedff", "#ffffff", "#cbedff", "#cbedff", "#cbedff", "#cbedff",
      "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#ffffff", "#cbedff", "#cbedff", "#cbedff",
      "#cbedff", "#cbedff", "#cbedff", "#ffffff", "#cbedff", "#cbedff", "#cbedff", "#ffffff",
      "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#ffffff", "#cbedff",
      "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#ffffff", "#cbedff", "#cbedff", "#cbedff",
      "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff",
      "#cbedff", "#cbedff", "#cbedff", "#ffffff", "#cbedff", "#cbedff", "#ffffff", "#cbedff",
      "#cbedff", "#ffffff", "#ffffff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#ffffff",
      "#cbedff", "#cbedff", "#cbedff", "#ffffff", "#cbedff", "#cbedff", "#cbedff", "#cbedff",
      "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff",
      "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#ffffff", "#ffffff", "#cbedff", "#cbedff",
      "#ffffff", "#cbedff", "#ffffff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff",
      "#ffffff", "#cbedff", "#ffffff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff",
      "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff",
      "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff",
      "#ffffff", "#ffffff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff",
      "#cbedff", "#ffffff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff",
      "#ffb0e5", "#ffb0e5", "#ffb0e5", "#ffb0e5", "#ffb0e5", "#ffb0e5", "#cbedff", "#cbedff",
      "#cbedff", "#547fc0", "#cbedff", "#547fc0", "#547fc0", "#cbedff", "#cbedff", "#cbedff",
      "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff",
      "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#ffb0e5",
      "#ffb0e5", "#ffb0e5", "#ffb0e5", "#ffb0e5", "#ffb0e5", "#ffb0e5", "#ffb0e5", "#cbedff",
      "#cbedff", "#547fc0", "#547fc0", "#547fc0", "#547fc0", "#cbedff", "#cbedff", "#cbedff",
      "#cbedff", "#cbedff", "#cbedff", "#ffffff", "#ffffff", "#cbedff", "#cbedff", "#cbedff",
      "#cbedff", "#cbedff", "#cbedff", "#ffffff", "#cbedff", "#cbedff", "#cbedff", "#ffb0e5",
      "#000000", "#ffb0e5", "#ffb0e5", "#000000", "#ffb0e5", "#ffb0e5", "#ffb0e5", "#cbedff",
      "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff",
      "#cbedff", "#cbedff", "#cbedff", "#ffffff", "#cbedff", "#ffffff", "#cbedff", "#cbedff",
      "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#c72b94", "#ffb0e5",
      "#ffb0e5", "#ffb0e5", "#ffb0e5", "#ffb0e5", "#ffb0e5", "#ffb0e5", "#ffb0e5", "#cbedff",
      "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#547fc0", "#547fc0", "#cbedff",
      "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#ffffff", "#cbedff", "#cbedff", "#cbedff",
      "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#c72b94", "#ffb0e5",
      "#ffb0e5", "#ffb0e5", "#ffb0e5", "#ffb0e5", "#ffb0e5", "#ffb0e5", "#ffb0e5", "#cbedff",
      "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff",
      "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff",
      "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#ffb0e5",
      "#ffb0e5", "#ffb0e5", "#ffb0e5", "#ffb0e5", "#ffb0e5", "#ffb0e5", "#ffb0e5", "#cbedff",
      "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#cbedff", "#f9d0b6",
      "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6",
      "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6",
      "#ffb0e5", "#f9d0b6", "#ffb0e5", "#cbedff", "#ffb0e5", "#ffb0e5", "#cbedff", "#cbedff",
      "#cbedff", "#cbedff", "#cbedff", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6",
      "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6",
      "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#ffb0e5",
      "#f9d0b6", "#f9d0b6", "#ffb0e5", "#f9d0b6", "#ffb0e5", "#f9d0b6", "#ffb0e5", "#f9d0b6",
      "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6",
      "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6",
      "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#ffb0e5", "#f9d0b6",
      "#f9d0b6", "#ffb0e5", "#f9d0b6", "#f9d0b6", "#ffb0e5", "#f9d0b6", "#f9d0b6", "#ffb0e5",
      "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6",
      "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6",
      "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6",
      "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6",
      "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6",
      "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6",
      "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6",
      "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6", "#f9d0b6",
];

function defaultWallpaper(): PixelArt {
  return {
    id: WALLPAPER_ID,
    name: WALLPAPER_NAME,
    width: WALLPAPER_WIDTH,
    height: WALLPAPER_HEIGHT,
    palette: [],
    pixels: WALLPAPER_PIXELS,
    createdAt: Date.now(),
  };
}

function defaultMobileWallpaper(): PixelArt {
  return {
    id: WALLPAPER_ID_MOBILE,
    name: WALLPAPER_NAME,
    width: WALLPAPER_MOBILE_WIDTH,
    height: WALLPAPER_MOBILE_HEIGHT,
    palette: [],
    pixels: new Array<string | null>(
      WALLPAPER_MOBILE_WIDTH * WALLPAPER_MOBILE_HEIGHT,
    ).fill("#cbedff"),
    createdAt: Date.now(),
  };
}

type StoredWallpaperV3 = Omit<PixelArt, "pixels" | "layers"> & {
  pixels: PackedPixels;
  layers?: (Omit<PixelLayer, "pixels"> & { pixels: PackedPixels })[];
  version: 3;
};
type StoredWallpaperV2 = Omit<PixelArt, "pixels"> & {
  pixels: PackedPixels;
  version: 2;
};
type StoredWallpaperV1 = Omit<PixelArt, "pixels"> & {
  pixels: string | number[];
};

function getWallpaperFor(
  key: string,
  id: string,
  buildDefault: () => PixelArt,
): PixelArt {
  if (typeof window === "undefined") return buildDefault();
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as
        | StoredWallpaperV3
        | StoredWallpaperV2
        | StoredWallpaperV1;
      if ("version" in parsed && parsed.version === 3) {
        return {
          ...parsed,
          pixels: unpackPixels(parsed.pixels),
          layers: parsed.layers?.map((l) => ({
            ...l,
            pixels: unpackPixels(l.pixels),
          })),
        };
      }
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
  const fresh = buildDefault();
  saveWallpaperFor(key, id, fresh);
  return fresh;
}

function saveWallpaperFor(key: string, id: string, art: PixelArt): SaveResult {
  const locked: PixelArt = { ...art, id, name: WALLPAPER_NAME };
  try {
    localStorage.setItem(key, JSON.stringify(encodeStored(locked)));
    return "ok";
  } catch (e) {
    return isQuotaExceededError(e) ? "quota" : "error";
  }
}

function resetWallpaperFor(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {}
}

export function getWallpaper(): PixelArt {
  return getWallpaperFor(WALLPAPER_KEY, WALLPAPER_ID, defaultWallpaper);
}

export function saveWallpaper(art: PixelArt): SaveResult {
  return saveWallpaperFor(WALLPAPER_KEY, WALLPAPER_ID, art);
}

export function resetWallpaper(): void {
  resetWallpaperFor(WALLPAPER_KEY);
}

const WALLPAPER_MOBILE_KEY = "pixel-art-desktop-wallpaper-mobile";

export function getMobileWallpaper(): PixelArt {
  return getWallpaperFor(
    WALLPAPER_MOBILE_KEY,
    WALLPAPER_ID_MOBILE,
    defaultMobileWallpaper,
  );
}

export function saveMobileWallpaper(art: PixelArt): SaveResult {
  return saveWallpaperFor(WALLPAPER_MOBILE_KEY, WALLPAPER_ID_MOBILE, art);
}

export function resetMobileWallpaper(): void {
  resetWallpaperFor(WALLPAPER_MOBILE_KEY);
}
