"use client";

import {
  Download,
  ImagePlus,
  Layers as LayersIcon,
  Minus,
  Plus,
  Save,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BlendMode,
  getPixelArt,
  listPixelArt,
  PixelArt,
  PixelLayer,
  savePixelArt,
  uid,
} from "../_shared/assetLibrary";
import Accordion from "./Accordion";
import ColorWheel from "./ColorWheel";
import ConfirmDialog from "./ConfirmDialog";
import ContextMenu, { ContextMenuItem } from "./ContextMenu";
import { CURSOR_NORMAL, CURSOR_POINTING, CURSOR_TEXT } from "./cursors";
import { AlertModal, PromptModal } from "./Dialogs";
import DrawToolbar from "./DrawToolbar";
import ExportPanel from "./ExportPanel";
import {
  exportAsGIF,
  exportAsJPG,
  exportAsJSON,
  exportAsPNG,
  exportAsSpriteSheet,
  exportAsSVG,
} from "./exportPixelArt";
import FileThumbnail from "./FileThumbnail";
import {
  applyGradient,
  bboxGradientAxis,
  buildGradientSteps,
  projectT,
  rgbaToPixelValue,
  stepColorAt,
} from "./gradientFill";
import { mixHex } from "./hsv";
import ImportPanel from "./ImportPanel";
import LayerPanel from "./LayerPanel";
import FrameFilmstrip from "./FrameFilmstrip";
import NewCanvasDialog from "./NewCanvasDialog";
import ReferenceWindow from "./ReferenceWindow";
import PixelCanvas, {
  PendingImage,
  PendingShape,
  TextAlign,
  textDrawX,
} from "./PixelCanvas";
import {
  applyAdjustments,
  compositeLayerRange,
  compositeLayers,
  compositeOnto,
  createGrid,
  createLayer,
  expandPoints,
  flipHorizontal,
  flipVertical,
  getPixel,
  PixelValue,
  resamplePixelValues,
  resizeGrid,
  rotate90,
  rotatePixelValuesBy,
  setPixel,
  shapeToolPoints,
  shiftPixels,
  unionBoundingBox,
} from "./pixelGrid";
import { isMacPlatform } from "./platform";
import ResizeCanvasDialog from "./ResizeCanvasDialog";
import { rasterizeText, rotateAlphaBuffer, Rotation } from "./textStamp";
import {
  CANVAS_PRESETS,
  DEFAULT_CANVAS_BG_COLOR,
  DEFAULT_FRAME_DURATION_MS,
  MAX_CANVAS_SIZE,
  MAX_LAYERS,
  NARROW_BREAKPOINT,
  nextZoomStep,
  ONION_SKIN_OPACITY,
  SELECT_TOOL_CATEGORY,
  SelectMode,
  Tool,
  ZOOM_STEPS,
} from "./types";
import { CanvasSize, useCanvasHistory } from "./useCanvasHistory";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";
import { Clip, useSelection } from "./useSelection";
import {
  getWallpaper,
  saveWallpaper,
  WALLPAPER_ID,
  WALLPAPER_NAME,
} from "./wallpaper";

// 클립스튜디오처럼 여러 파일을 탭으로 동시에 열어둘 수 있다. 활성 탭의 실제
// 편집 상태(doc/history/이름/hasMetaEdits/pixelsDirty)만 살아있는 hook 상태로
// 유지하고, 비활성 탭은 이 스냅샷 형태로만 보관한다(전환 시 되돌리기 스택은
// 초기화되지만 그림 내용은 그대로 보존된다).
type Tab = { doc: PixelArt; hasMetaEdits: boolean; pixelsDirty: boolean };

// 투명도·보정(밝기·대비·채도·색온도·틴트) 슬라이더의 드래그 코얼레싱이
// "지금 이어지는 드래그가 어느 레이어의 어느 값인지" 구분하는 데 쓰는 필드.
type DragCoalesceField =
  | "opacity"
  | "brightness"
  | "contrast"
  | "saturation"
  | "temperature"
  | "tint";

// 편집을 멈추고 이 시간(ms)이 지나면 자동 저장한다.
const AUTOSAVE_DELAY_MS = 3 * 60 * 1000;

const DEFAULT_ACTIVE_COLOR = "#000000";

// 클립보드(선택 영역을 복사한 결과)를 pendingImage가 다루는 사각형 격자로
// 편다 — 복사 당시 선택되지 않았던 칸은 투명(null)으로 채운다.
function clipToGrid(clip: Clip): PixelValue[] {
  const grid: PixelValue[] = new Array(clip.w * clip.h).fill(null);
  for (const cell of clip.cells) {
    grid[cell.dy * clip.w + cell.dx] = cell.color;
  }
  return grid;
}

// exportAsJSON이 그대로 내보낸 PixelArt 구조를 되읽는다 — 형태가 어긋나거나
// (특히 손으로 고친 파일) 캔버스 크기가 이 앱의 상한을 넘으면 거부한다.
// 픽셀 값 하나하나가 문자열이 아니면(손상된 값) 조용히 투명으로 대체한다 —
// 파일 전체를 거부하기보다는 그 칸만 비워두는 편이 사용자에게 낫다.
function parsePixelArtJSON(raw: unknown): {
  name: string;
  width: number;
  height: number;
  palette: string[];
  pixels: PixelValue[];
  layers?: PixelLayer[];
  activeLayerId?: string;
  layerMode?: "layers" | "frames";
} | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  if (typeof d.width !== "number" || typeof d.height !== "number") return null;
  if (
    !Number.isInteger(d.width) ||
    !Number.isInteger(d.height) ||
    d.width < 1 ||
    d.height < 1 ||
    d.width > MAX_CANVAS_SIZE ||
    d.height > MAX_CANVAS_SIZE
  ) {
    return null;
  }
  if (!Array.isArray(d.pixels) || d.pixels.length !== d.width * d.height) {
    return null;
  }
  const cellCount = d.width * d.height;
  const rawLayers = Array.isArray(d.layers) ? d.layers : [];
  const parsedLayers: PixelLayer[] = rawLayers
    .filter((l): l is Record<string, unknown> => {
      if (!l || typeof l !== "object") return false;
      const layer = l as Record<string, unknown>;
      return (
        typeof layer.id === "string" &&
        Array.isArray(layer.pixels) &&
        layer.pixels.length === cellCount
      );
    })
    .map((l) => ({
      id: l.id as string,
      name: typeof l.name === "string" && l.name.trim() ? l.name : "레이어",
      pixels: (l.pixels as unknown[]).map((p) => (typeof p === "string" ? p : null)),
      visible: typeof l.visible === "boolean" ? l.visible : true,
      opacity:
        typeof l.opacity === "number" && l.opacity >= 0 && l.opacity <= 1
          ? l.opacity
          : 1,
      locked: typeof l.locked === "boolean" ? l.locked : false,
      frameDurationMs:
        typeof l.frameDurationMs === "number" && l.frameDurationMs > 0
          ? l.frameDurationMs
          : undefined,
    }))
    // 손으로 고쳤거나 다른 곳에서 만든 파일이 MAX_LAYERS를 넘는 레이어를
    // 담고 있을 수 있다 — 파일 전체를 거부하지 않고 앞쪽(아래) 레이어부터
    // MAX_LAYERS개만 남기고 조용히 잘라낸다(이 파일의 기존 관대한 보정
    // 스타일과 동일).
    .slice(0, MAX_LAYERS);
  return {
    name: typeof d.name === "string" && d.name.trim() ? d.name : "제목 없음",
    width: d.width,
    height: d.height,
    palette: Array.isArray(d.palette)
      ? d.palette.filter((c): c is string => typeof c === "string")
      : [],
    pixels: d.pixels.map((p) => (typeof p === "string" ? p : null)),
    layers: parsedLayers.length > 0 ? parsedLayers : undefined,
    activeLayerId:
      typeof d.activeLayerId === "string" ? d.activeLayerId : undefined,
    layerMode:
      d.layerMode === "layers" || d.layerMode === "frames"
        ? d.layerMode
        : undefined,
  };
}

function blankDoc(width: number, height: number): PixelArt {
  return {
    id: uid(),
    name: "제목 없음",
    width,
    height,
    // 즐겨찾기 색 목록 — 미리 채워두지 않고 빈 채로 시작해, 색상환에서
    // 직접 고른 색만 여기에 쌓이게 한다.
    palette: [],
    pixels: createGrid(width, height),
    createdAt: Date.now(),
  };
}

function resolveInitialDoc(docId: string | null): {
  doc: PixelArt;
  found: boolean;
} {
  if (docId === WALLPAPER_ID) return { doc: getWallpaper(), found: true };
  if (docId) {
    const existing = getPixelArt(docId);
    if (existing) return { doc: existing, found: true };
  }
  return {
    doc: blankDoc(CANVAS_PRESETS[0].width, CANVAS_PRESETS[0].height),
    found: false,
  };
}

// 문서를 열 때 레이어 스택을 확정한다 — layers가 있으면(V3 이후 저장분)
// 그대로 쓰고, 없으면(V2 이하 구파일이거나 JSON에서 레이어 없이 불러온 경우)
// pixels를 감싼 단일 레이어로 그 자리에서 만든다(자동 마이그레이션, 저장하기
// 전까지는 원본에 반영되지 않는다).
function layersFromDoc(doc: PixelArt): {
  layers: PixelLayer[];
  activeLayerId: string;
} {
  if (doc.layers && doc.layers.length > 0) {
    const activeLayerId =
      doc.activeLayerId && doc.layers.some((l) => l.id === doc.activeLayerId)
        ? doc.activeLayerId
        : doc.layers[doc.layers.length - 1].id;
    return { layers: doc.layers, activeLayerId };
  }
  const layer: PixelLayer = {
    id: uid(),
    name: "레이어 1",
    pixels: doc.pixels,
    visible: true,
    opacity: 1,
    locked: false,
  };
  return { layers: [layer], activeLayerId: layer.id };
}

// layers는 아래→위(=필름스트립 왼쪽→오른쪽) 순서. currentId 다음으로
// "보이는" 레이어를 찾는다 — 끝에 닿았을 때 loop면 처음(보이는 첫 레이어)
// 으로, 아니면 null(재생 정지 신호)을 돌려준다. 어니언 스킨의 "다음 보이는
// 프레임"에도 loop=false로 재사용한다.
function nextVisibleFrame(
  layers: PixelLayer[],
  currentId: string,
  loop: boolean,
): PixelLayer | null {
  const currentIndex = layers.findIndex((l) => l.id === currentId);
  for (let i = currentIndex + 1; i < layers.length; i++) {
    if (layers[i].visible) return layers[i];
  }
  if (!loop) return null;
  for (let i = 0; i <= currentIndex; i++) {
    if (layers[i].visible) return layers[i];
  }
  return null;
}

// 어니언 스킨의 "이전 보이는 프레임" — 재생과 달리 순환하지 않는다(이전
// 프레임이 없으면 그냥 안 보여준다).
function prevVisibleFrame(
  layers: PixelLayer[],
  currentId: string,
): PixelLayer | null {
  const currentIndex = layers.findIndex((l) => l.id === currentId);
  for (let i = currentIndex - 1; i >= 0; i--) {
    if (layers[i].visible) return layers[i];
  }
  return null;
}

export default function Editor({
  docId,
  startMode = "empty",
  onDirtyChange,
  onExit,
  closing,
}: {
  docId: string | null;
  // newCanvas: 편집창을 열자마자 새 캔버스 크기 선택 모달을 띄운다(데스크탑의
  // "새로 만들기" 바로가기). empty: 탭 없이 빈 화면으로 연다("편집기" 아이콘).
  // docId가 있으면(기존 파일을 직접 연 경우) 둘 다 무시되고 그 파일이 탭 하나로 열린다.
  startMode?: "newCanvas" | "empty";
  onDirtyChange: (dirty: boolean) => void;
  onExit: () => void;
  closing: boolean;
}) {
  const [initial] = useState(() => resolveInitialDoc(docId));
  const [tabs, setTabs] = useState<Tab[]>(() =>
    initial.found
      ? [{ doc: initial.doc, hasMetaEdits: false, pixelsDirty: false }]
      : [],
  );
  const [activeTabIndex, setActiveTabIndex] = useState(() =>
    initial.found ? 0 : -1,
  );
  const [doc, setDoc] = useState<PixelArt>(initial.doc);
  const [name, setName] = useState(initial.doc.name);
  // 픽셀은 트루컬러다 — activeColorHex가 "지금 그릴 색"을 직접 들고 있고,
  // 그린 픽셀은 이 값을 그대로 복사해 저장한다(참조가 아니다). 그래서
  // 즐겨찾기(doc.palette) 목록을 고치거나 지워도 이미 칠한 픽셀은 절대
  // 바뀌지 않는다 — 보통의 그림판/에디터가 팔레트를 다루는 방식과 같다.
  const [activeColorHex, setActiveColorHex] = useState(DEFAULT_ACTIVE_COLOR);
  // 그라데이션 끝 색 — MS페인트의 보조 색상과 같은 개념. null이면 투명.
  const [secondaryColorHex, setSecondaryColorHex] = useState<string | null>(
    null,
  );
  const [hasMetaEdits, setHasMetaEdits] = useState(false);
  // 그림(픽셀) 자체가 마지막 저장 이후 바뀌었는지 — history.canUndo와 별개로
  // 둔다. 예전에는 저장할 때마다 history.reset()으로 되돌리기 스택을 통째로
  // 비워 "저장 안 된 변경 없음" 상태를 만들었는데, 자동저장이 몇 초마다 조용히
  // 실행취소 이력을 날려버려 방금 그린 것도 되돌릴 수 없는 문제가 있었다.
  const [pixelsDirty, setPixelsDirty] = useState(false);
  // 자동저장이 막 끝났다는 안내 문구 — 다음 편집이 시작되면(pixelsDirty나
  // hasMetaEdits가 다시 true가 되면) 자동으로 사라진다.
  const [showSavedNotice, setShowSavedNotice] = useState(false);
  const [tool, setTool] = useState<Tool>("pencil");
  // 편집기 세션 안에서 열고 닫는 일회성 레퍼런스 창 — 캔버스(탭)별이 아니라
  // 편집기 자체에서 열리고, 여러 개를 동시에 띄울 수 있다. zIndex는 창을
  // 클릭할 때마다 올려 마지막으로 만지작거린 창이 항상 맨 앞에 오게 하고,
  // spawnIndex는 새 창이 열릴 때 한 번만 정해 기본 위치를 계단식으로 살짝씩
  // 어긋나게 배치하는 데 쓴다(포커스가 바뀌어도 이 값 자체는 바뀌지 않는다).
  const [referenceWindows, setReferenceWindows] = useState<
    { id: string; zIndex: number; spawnIndex: number }[]
  >([]);
  // 60부터 시작 — 캔버스 하단 중앙 보조 툴바(z-30)보다 항상 앞에 오도록 한다.
  const referenceZRef = useRef(60);
  const referenceSpawnRef = useRef(0);
  const openReferenceWindow = useCallback(() => {
    referenceZRef.current += 1;
    const spawnIndex = referenceSpawnRef.current;
    referenceSpawnRef.current += 1;
    setReferenceWindows((ws) => [
      ...ws,
      { id: uid(), zIndex: referenceZRef.current, spawnIndex },
    ]);
  }, []);
  const closeReferenceWindow = useCallback((id: string) => {
    setReferenceWindows((ws) => ws.filter((w) => w.id !== id));
  }, []);
  const bringReferenceWindowToFront = useCallback((id: string) => {
    referenceZRef.current += 1;
    const z = referenceZRef.current;
    setReferenceWindows((ws) =>
      ws.map((w) => (w.id === id ? { ...w, zIndex: z } : w)),
    );
  }, []);
  const [showGrid, setShowGrid] = useState(true);
  const [showCrosshair, setShowCrosshair] = useState(false);
  const [brushSize, setBrushSize] = useState(1);
  const [filledShapes, setFilledShapes] = useState(false);
  // 텍스트 도구로 캔버스를 클릭하면 그 그리드 좌표에서 시작한다 — 아직 픽셀에
  // 굽지 않은 상태로 캔버스 위에 인라인 입력·미리보기를 띄운다(모달 없음).
  // antialias: 글자 가장자리를 배경과 섞어 부드럽게 굽는다. gradientFill: 활성/
  // 보조 색상 그라데이션으로 글자를 채운다(둘 다 켜면 함께 적용된다).
  const [pendingText, setPendingText] = useState<{
    x: number;
    y: number;
    text: string;
    fontSize: number;
    antialias: boolean;
    gradientFill: boolean;
    align: TextAlign;
    rotation: Rotation;
  } | null>(null);
  // 이미 그려진 캔버스에 이미지를 불러왔을 때도 텍스트처럼 바로 굽지 않고
  // 위치·크기를 조절한 뒤 확정해야 실제 픽셀에 반영된다.
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  // 직선·사각형·원도 같은 이유로 드래그가 끝나도 바로 굽지 않는다 — 채우기·
  // 그라데이션 설정과 위치·크기를 계속 조절하다가 확정해야 실제 픽셀에 반영된다.
  const [pendingShape, setPendingShape] = useState<PendingShape | null>(null);
  // 그라데이션 도구·도형 그라데이션 채우기·텍스트 그라데이션 채우기가 공유하는
  // 설정 — 단계 수와 방향(각도). 그라데이션 도구 자체는 드래그로 축을 직접
  // 정하므로 angleDeg의 영향을 받지 않고, 드래그 제스처가 없는 도형·텍스트
  // 채우기에서만 이 각도로 축을 계산한다.
  const [gradientSteps, setGradientSteps] = useState(8);
  const [gradientAngleDeg, setGradientAngleDeg] = useState(0);
  // 직선·사각형·원을 그릴 때 단색 대신 그라데이션으로 채운다.
  const [shapeGradientFill, setShapeGradientFill] = useState(false);
  // PixelCanvas가 Ctrl+스크롤로 자체 관리하는 확대 배율 — 뷰포트 좌측 하단에
  // 표시만 하기 위해 값을 그대로 올려받는다. 1은 고정 크기가 아니라 "화면에
  // 캔버스 전체가 꽉 차게 보이는 배율"이라 탭마다(캔버스 크기가 다르므로)
  // 새로 열 때 1로 되돌려 항상 화면 맞춤으로 시작하게 한다.
  const [canvasZoom, setCanvasZoom] = useState(1);
  // 편집기 작업 영역(캔버스가 놓인 주변 여백)의 배경색 — 캔버스 자체가 아니라
  // 그 바깥을 칠한다. 탭이나 저장 데이터와는 무관한 순수 보기 설정이며, 항상
  // 불투명 단색이다.
  const [canvasBgColor, setCanvasBgColor] = useState(DEFAULT_CANVAS_BG_COLOR);
  // 마법봉이 이어진 영역만 고를지, 캔버스 전체에서 같은 색을 모두 고를지.
  const [wandGlobal, setWandGlobal] = useState(false);
  // select·wand 도구가 고르는 영역을 기존 선택과 어떻게 합칠지 — Shift/Alt를
  // 누르고 있는 대신 버튼으로 켜 둘 수 있다.
  const [selectMode, setSelectMode] = useState<SelectMode>("new");
  const [menuAnchor, setMenuAnchor] = useState<{
    x: number;
    y: number;
    items: ContextMenuItem[];
  } | null>(null);
  // 편집창 루트에 transform(scale)이 걸려 있어 position:fixed인 ContextMenu의
  // 좌표 기준점이 뷰포트가 아니라 이 루트가 된다 — 메뉴 좌표를 뷰포트 기준이
  // 아니라 이 루트 기준 상대좌표로 계산해야 편집창이 letterbox로 작아지거나
  // 가운데 정렬돼도 메뉴가 버튼 바로 아래에 정확히 뜬다.
  const rootRef = useRef<HTMLDivElement>(null);
  // 편집기 너비가 NARROW_BREAKPOINT보다 좁아지면 DrawToolbar의 도형·텍스트·
  // 그라데이션 도구뿐 아니라 이미지 불러오기/내보내기 사이드바도 같은 기준
  // 으로 접힌 UI(아이콘 트리거 + 플로팅 팝업)로 바뀐다. 여기서 한 번만
  // 측정해 두 컴포넌트에 함께 내려줘야 기준이 서로 어긋나지 않는다.
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const update = () => setNarrow(el.clientWidth < NARROW_BREAKPOINT);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // narrow일 때 이미지 불러오기/내보내기 사이드바가 아이콘 두 개로 줄어들고,
  // 그 중 하나를 누르면 이 상태에 맞는 패널이 플로팅 팝업으로 뜬다.
  const [openFloatingPanel, setOpenFloatingPanel] = useState<
    "layers" | "import" | "export" | null
  >(null);
  // 확대 상태에서 스페이스+드래그로 스크롤할 대상 — PixelCanvas에 그대로 내려준다.
  const canvasViewportRef = useRef<HTMLDivElement>(null);
  // 그리기/선택 도구의 하위 옵션(브러시 크기·채우기·그라데이션·선택 모드 등)을
  // DrawToolbar가 포털로 그려 넣을 자리 — 캔버스 하단 중앙에 둬서 좌우
  // 사이드바(색상환·내보내기)를 가리지 않게 한다. 콜백 ref로 상태에 담아야
  // 마운트된 실제 DOM 노드가 준비된 다음 렌더에서 DrawToolbar에 전달된다.
  const [secondaryToolbarPortal, setSecondaryToolbarPortal] =
    useState<HTMLDivElement | null>(null);
  // "JSON 불러오기" 메뉴 항목은 화면에 보이지 않는 이 input을 대신 클릭시켜
  // 파일 선택 창을 띄운다.
  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const [resizingCanvas, setResizingCanvas] = useState(false);
  const [showNewCanvasDialog, setShowNewCanvasDialog] = useState(
    !initial.found && startMode === "newCanvas",
  );
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  // 단축키 도움말은 실행 중인 기기와 무관하게 Windows/Mac 표기를 직접 전환해
  // 볼 수 있다 — 예전엔 isMacPlatform()으로 감지한 한쪽만 보여줘서, 예를 들어
  // Windows에서 Mac 표기를(또는 그 반대) 확인할 방법이 없었다.
  const [helpPlatform, setHelpPlatform] = useState<"mac" | "windows">(() =>
    isMacPlatform() ? "mac" : "windows",
  );
  const [pendingCloseTabIndex, setPendingCloseTabIndex] = useState<
    number | null
  >(null);
  const [pendingExit, setPendingExit] = useState(false);
  // window.alert/prompt 대신 이 편집기 스타일에 맞는 모달을 쓴다.
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [saveAsPromptOpen, setSaveAsPromptOpen] = useState(false);
  // localStorage 용량 초과 등으로 저장이 실패해도 이 앱은 토스트 UI가 없어
  // 조용히 묻히기 쉽다 — 제목표시줄에 잠깐 빨간 문구로 알려준다.
  const [saveError, setSaveError] = useState(false);
  const saveErrorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const flagSaveError = useCallback(() => {
    setSaveError(true);
    if (saveErrorTimeoutRef.current) clearTimeout(saveErrorTimeoutRef.current);
    saveErrorTimeoutRef.current = setTimeout(() => setSaveError(false), 4000);
  }, []);
  useEffect(() => {
    return () => {
      if (saveErrorTimeoutRef.current)
        clearTimeout(saveErrorTimeoutRef.current);
    };
  }, []);
  const isWallpaper = doc.id === WALLPAPER_ID;
  // 편집창이 데스크탑 위에 떠오르며 열리는 애니메이션 — 마운트 직후 한 프레임 뒤에
  // true로 바뀌면서 transition이 자연스럽게 재생된다(처음부터 true면 트랜지션 없이
  // 바로 켜진 상태로 나타난다).
  const [mounted, setMounted] = useState(false);

  // 같은 layers 배열을 레이어로 볼지 프레임으로 볼지 — doc에 실려 저장되므로
  // palette/name처럼 setDoc으로 갱신한다(실행취소 대상이 아니다, 도구를
  // 바꾸는 것과 같은 성격).
  const layerMode = doc.layerMode ?? "layers";
  const [isPlaying, setIsPlaying] = useState(false);
  const [loopPlayback, setLoopPlayback] = useState(true);
  const [onionSkin, setOnionSkin] = useState(true);

  const initialLayerState = layersFromDoc(initial.doc);
  const history = useCanvasHistory(
    initialLayerState.layers,
    initialLayerState.activeLayerId,
    { width: initial.doc.width, height: initial.doc.height },
  );
  const selection = useSelection();

  // 스포이트·마법봉·페인트통의 판정 범위이자 "정렬" 버튼의 대상 레이어 —
  // 활성 레이어(그리기 대상)와는 완전히 독립된 세션 전용 상태다. 저장 포맷에는
  // 반영하지 않고, 문서를 열 때마다(loadTab이 history.reset을 부르는 시점)
  // 그 시점의 활성 레이어 하나로 다시 초기화한다.
  const [layerScope, setLayerScope] = useState<Set<string>>(
    () => new Set([initialLayerState.activeLayerId]),
  );

  // 저장·내보내기·탭 스냅숏 등 레이어를 모르는 모든 곳은 이 값(모든 레이어를
  // 합성한 최종 결과)만 쓴다 — PixelCanvas에 넘기는 history.present(활성
  // 레이어)와는 다른 값이다.
  const compositePixels = useMemo(
    () => compositeLayers(history.presentLayers, doc.width, doc.height),
    [history.presentLayers, doc.width, doc.height],
  );
  const activeLayerIndex = history.presentLayers.findIndex(
    (l) => l.id === history.activeLayerId,
  );
  const activeLayer =
    history.presentLayers[activeLayerIndex] ??
    history.presentLayers[history.presentLayers.length - 1];
  const belowComposite = useMemo(() => {
    if (layerMode === "frames") {
      if (!onionSkin) return null;
      const prev = prevVisibleFrame(history.presentLayers, history.activeLayerId);
      if (!prev) return null;
      // 어니언 스킨 유령 이미지는 항상 흐린 미리보기일 뿐이다 — 이전
      // 프레임 자신에 블렌드 모드·보정이 걸려 있어도 무시하고 일반
      // 겹치기로만 보여준다(프레임 모드에서는 블렌드·보정을 편집 화면에
      // 반영하지 않기로 했다).
      return compositeLayers(
        [
          {
            ...prev,
            blendMode: "normal",
            brightness: undefined,
            contrast: undefined,
            saturation: undefined,
            temperature: undefined,
            tint: undefined,
            opacity: ONION_SKIN_OPACITY,
          },
        ],
        doc.width,
        doc.height,
      );
    }
    return compositeLayerRange(
      history.presentLayers,
      0,
      activeLayerIndex - 1,
      doc.width,
      doc.height,
    );
  }, [
    layerMode,
    onionSkin,
    history.presentLayers,
    history.activeLayerId,
    activeLayerIndex,
    doc.width,
    doc.height,
  ]);
  const aboveLayers = useMemo((): PixelLayer[] | null => {
    if (layerMode === "frames") {
      if (!onionSkin) return null;
      const next = nextVisibleFrame(history.presentLayers, history.activeLayerId, false);
      if (!next) return null;
      // 어니언 스킨 유령 이미지는 항상 흐린 미리보기일 뿐이다 — 다음
      // 프레임 자신에 블렌드 모드·보정이 걸려 있어도 무시하고 일반
      // 겹치기로만 보여준다(프레임 모드에서는 블렌드·보정을 편집 화면에
      // 반영하지 않기로 했다).
      return [
        {
          ...next,
          blendMode: "normal",
          brightness: undefined,
          contrast: undefined,
          saturation: undefined,
          temperature: undefined,
          tint: undefined,
          opacity: ONION_SKIN_OPACITY,
        },
      ];
    }
    // PixelCanvas가 각 레이어 자신의 블렌드 모드·보정을 반영하며 실제
    // 화면(visibleBase) 위에 순서대로 얹을 수 있도록, 미리 평탄화하지 않고
    // 레이어 배열 그대로 넘긴다 — 빈 캔버스 위에서 미리 평탄화하면 위
    // 레이어의 블렌드 모드가 진짜 배경을 못 보고 계산돼 화면에서 사라진다.
    const slice = history.presentLayers.slice(
      activeLayerIndex + 1,
      history.presentLayers.length,
    );
    return slice.length > 0 ? slice : null;
  }, [
    layerMode,
    onionSkin,
    history.presentLayers,
    history.activeLayerId,
    activeLayerIndex,
  ]);

  // 스포이트·마법봉·페인트통 판정 전용 합성 — 화면 렌더링용 belowComposite/
  // aboveLayers와 별개로, layerScope로 한 번 더 필터링한다. 프레임 모드는
  // scope 개념이 없어 기존 값을 그대로 통과시킨다.
  const scopeBelowComposite = useMemo(() => {
    if (layerMode === "frames") return belowComposite;
    const scoped = history.presentLayers
      .slice(0, activeLayerIndex)
      .filter((l) => layerScope.has(l.id));
    return compositeLayers(scoped, doc.width, doc.height);
  }, [
    layerMode,
    belowComposite,
    history.presentLayers,
    activeLayerIndex,
    layerScope,
    doc.width,
    doc.height,
  ]);

  const scopeAboveLayers = useMemo((): PixelLayer[] | null => {
    if (layerMode === "frames") return aboveLayers;
    const slice = history.presentLayers
      .slice(activeLayerIndex + 1)
      .filter((l) => layerScope.has(l.id));
    return slice.length > 0 ? slice : null;
  }, [layerMode, aboveLayers, history.presentLayers, activeLayerIndex, layerScope]);

  const activeLayerInScope =
    layerMode === "frames" ? true : layerScope.has(history.activeLayerId);

  // 선택을 만들거나 다루는 도구 묶음(select·lasso·move·wand) 밖으로 나가면
  // 더 이상 쓸모가 없어진 선택 영역을 자동으로 지운다 — 그 묶음 안에서
  // 도구만 바꾸는 동안은(예: select로 고르고 move로 옮기기) 그대로 둔다.
  useEffect(() => {
    if (!SELECT_TOOL_CATEGORY.includes(tool)) selection.setMask(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool]);

  // history.push는 되돌리기 스택에 새 항목을 추가할 뿐 "저장 여부"는 모른다 —
  // 실제로 그림이 바뀔 때마다 이 래퍼로 pixelsDirty도 함께 표시해, 저장(수동·
  // 자동 모두)이 되돌리기 이력을 지우지 않고도 "저장 안 된 변경"을 정확히
  // 추적하게 한다. size를 넘기면(회전·캔버스 크기 수정) 그 조작도 되돌릴 수
  // 있다 — 생략하면 지금 크기를 그대로 유지한다.
  //
  // moveOriginalMask는 history의 undo/redo 스택과 정확히 같은 리듬으로(호출
  // 할 때마다 하나씩) 함께 움직이는 별도 스택에 쌓인다 — 이동 도구 커밋만
  // 실제 값(이동 전 선택 영역)을 넣고, 그 외 모든 조작(그리기 등)은
  // undefined를 넣어 "이 되돌리기 단계는 선택 영역을 건드리지 않는다"는
  // 뜻으로 삼는다. 그러지 않고 모든 조작에 선택 영역을 엮으면, 그리기 이후
  // 새로 고른 선택이 그 그리기를 되돌릴 때 엉뚱하게 예전 선택으로 되돌아가
  // 버린다.
  const moveSelectionUndoRef = useRef<(Set<number> | null | undefined)[]>([]);
  const moveSelectionRedoRef = useRef<(Set<number> | null | undefined)[]>([]);
  // 투명도·보정 슬라이더를 드래그하는 동안 "지금 이어지는 드래그가 어느
  // 레이어의 어느 값인지" 기억한다 — handleLayerOpacityChange·
  // handleLayerAdjustmentChange가 같은 레이어의 같은 값에서 연속으로
  // 불리면(레이어 id와 필드가 둘 다 같으면) 실행취소 스택에 새로 쌓지 않고
  // 값만 갱신하고, 다른 레이어·다른 값이거나 첫 틱이면 정상적으로 되돌리기
  // 경계를 만든다. 아래 세 pushXxx 함수는 호출될 때마다 이 값을 비워, 드래그
  // 중간에 다른 조작이 끼어들면 다음 드래그가 항상 새 경계에서 시작하게 한다.
  const dragCoalesceRef = useRef<{
    layerId: string;
    field: DragCoalesceField;
  } | null>(null);

  const pushHistory = useCallback(
    (
      next: PixelValue[],
      size?: CanvasSize,
      moveOriginalMask?: Set<number> | null,
    ) => {
      // 활성 레이어가 잠겨 있으면 그 레이어 픽셀만 바꾸는 모든 편집(그리기·
      // 채우기·이미지/텍스트/도형 커밋 등)이 이 래퍼 하나를 거치므로, 여기
      // 한 곳에서 막으면 모든 호출부가 함께 보호된다. 레이어 구조 변경·
      // 캔버스 전체 변형(pushHistoryAllLayers/pushLayerOp)은 활성 레이어의
      // 잠금과 무관하게 계속 동작해야 하므로 이 가드를 넣지 않는다.
      //
      // 재생 중(isPlaying)에도 같은 이유로 막는다 — PixelCanvas는 포인터
      // 기반 그리기 도구를 activeLayerLocked(=locked||isPlaying)로 막지만,
      // 선택은 재생 중에도 의도적으로 허용되므로 Alt+Backspace(채우기)·
      // 붙여넣기·텍스트/이미지/도형 커밋처럼 선택을 거쳐 픽셀을 쓰는 Editor
      // 레벨 핸들러들은 그 게이트를 거치지 않는다. 이 핸들러들도 전부 이
      // 래퍼 하나로 모이므로, 여기서 한 번 더 막으면 재생 중인 프레임이
      // 몰래 덮어써지는 일이 없다.
      if (activeLayer.locked || isPlaying) return;
      history.push(next, size);
      moveSelectionUndoRef.current.push(moveOriginalMask);
      if (moveSelectionUndoRef.current.length > 50) {
        moveSelectionUndoRef.current.shift();
      }
      moveSelectionRedoRef.current = [];
      setPixelsDirty(true);
      dragCoalesceRef.current = null;
    },
    [history, activeLayer, isPlaying],
  );

  // 캔버스 전체 변형(리사이즈·반전·회전)처럼 모든 레이어의 픽셀이 한꺼번에
  // 바뀌는 조작 전용 — pushHistory(활성 레이어만 교체)와 달리 레이어 배열
  // 전체를 새로 받는다. moveSelectionUndoRef 관리는 pushHistory와 동일하게
  // "이 되돌리기 단계는 선택 영역을 건드리지 않는다"(undefined)로 채운다.
  const pushHistoryAllLayers = useCallback(
    (nextLayers: PixelLayer[], nextSize?: CanvasSize) => {
      history.pushLayers(nextLayers, history.activeLayerId, nextSize);
      moveSelectionUndoRef.current.push(undefined);
      if (moveSelectionUndoRef.current.length > 50) {
        moveSelectionUndoRef.current.shift();
      }
      moveSelectionRedoRef.current = [];
      setPixelsDirty(true);
      dragCoalesceRef.current = null;
    },
    [history],
  );

  // 레이어 구조 변경(추가·삭제·순서변경·병합·복제·보이기·투명도·잠금·이름)
  // 전용 — pushHistoryAllLayers와 동작은 같지만 호출부 의도를 이름으로 구분한다.
  // 투명도·보정 드래그의 "첫 틱"도 이 함수로 정상적인 되돌리기 경계를 만든다 —
  // handleLayerOpacityChange·handleLayerAdjustmentChange가 그 직후
  // dragCoalesceRef를 다시 채워 넣으므로, 여기서 비운 값이 그대로 유지되는 건
  // 투명도·보정이 아닌 다른 레이어 조작(추가·삭제·병합 등)일 때뿐이다.
  const pushLayerOp = useCallback(
    (nextLayers: PixelLayer[], nextActiveLayerId: string) => {
      history.pushLayers(nextLayers, nextActiveLayerId);
      moveSelectionUndoRef.current.push(undefined);
      if (moveSelectionUndoRef.current.length > 50) {
        moveSelectionUndoRef.current.shift();
      }
      moveSelectionRedoRef.current = [];
      setPixelsDirty(true);
      dragCoalesceRef.current = null;
    },
    [history],
  );

  const handleLayerModeChange = useCallback((mode: "layers" | "frames") => {
    // 모드를 바꾸는 순간 재생 중이었다면 멈춘다 — 레이어 모드로 돌아가면
    // "재생"이라는 개념 자체가 없다.
    setIsPlaying(false);
    setDoc((d) => ({ ...d, layerMode: mode }));
    setHasMetaEdits(true);
  }, []);

  const handleTogglePlay = useCallback(() => setIsPlaying((p) => !p), []);
  const handleToggleLoop = useCallback(() => setLoopPlayback((l) => !l), []);
  const handleToggleOnionSkin = useCallback(() => setOnionSkin((o) => !o), []);

  // 재생 루프(requestAnimationFrame) 안에서 항상 최신 값을 읽기 위한 ref들 —
  // history.presentLayers/activeLayerId는 재생 중 프레임이 바뀔 때마다
  // 바뀌므로, 이 값들을 useEffect 의존성에 직접 넣으면 프레임이 바뀔 때마다
  // 루프가 처음부터 재시작돼(경과 시간 누적이 매번 끊겨) 재생이 멈춘 것처럼
  // 보이거나 불규칙해진다. 대신 ref로만 최신값을 따라가고, useEffect
  // 자체는 isPlaying이 바뀔 때만(재생 시작/정지) 재시작한다.
  const playbackLayersRef = useRef(history.presentLayers);
  const playbackActiveIdRef = useRef(history.activeLayerId);
  const playbackLoopRef = useRef(loopPlayback);
  useEffect(() => {
    playbackLayersRef.current = history.presentLayers;
  }, [history.presentLayers]);
  useEffect(() => {
    playbackActiveIdRef.current = history.activeLayerId;
  }, [history.activeLayerId]);
  useEffect(() => {
    playbackLoopRef.current = loopPlayback;
  }, [loopPlayback]);

  useEffect(() => {
    if (!isPlaying) return;
    let rafId: number;
    let lastTime = performance.now();
    let elapsed = 0;
    const tick = (now: number) => {
      const delta = now - lastTime;
      lastTime = now;
      elapsed += delta;
      const currentId = playbackActiveIdRef.current;
      const currentLayer = playbackLayersRef.current.find(
        (l) => l.id === currentId,
      );
      const duration = currentLayer?.frameDurationMs ?? DEFAULT_FRAME_DURATION_MS;
      if (elapsed >= duration) {
        elapsed = 0;
        const next = nextVisibleFrame(
          playbackLayersRef.current,
          currentId,
          playbackLoopRef.current,
        );
        if (next) {
          history.setActiveLayerId(next.id);
        } else {
          setIsPlaying(false);
          return;
        }
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
    // history 객체 자체는 매 렌더 새로 만들어지므로 의존성에 넣지 않는다 —
    // history.setActiveLayerId는 useCanvasHistory 안에서 deps: []인
    // useCallback이라 참조가 안정적이다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, history.setActiveLayerId]);

  // 실행취소/다시실행 — 픽셀은 history가 그대로 되돌리고, 그 단계가 이동
  // 도구 커밋이었다면(moveSelectionUndoRef에 실제 Set|null이 쌓여 있다면)
  // 선택 영역도 그 시점 자리로 함께 되돌린다.
  const handleUndo = useCallback(() => {
    if (!history.canUndo) return;
    const maskEntry = moveSelectionUndoRef.current.pop();
    moveSelectionRedoRef.current.push(
      maskEntry === undefined ? undefined : selection.mask,
    );
    history.undo();
    if (maskEntry !== undefined) selection.setMask(maskEntry);
  }, [history, selection]);

  const handleRedo = useCallback(() => {
    if (!history.canRedo) return;
    const maskEntry = moveSelectionRedoRef.current.pop();
    moveSelectionUndoRef.current.push(
      maskEntry === undefined ? undefined : selection.mask,
    );
    history.redo();
    if (maskEntry !== undefined) selection.setMask(maskEntry);
  }, [history, selection]);

  // 되돌리기 스택의 "지금 크기"가 곧 진실이다 — 회전·크기 수정을 되돌리거나
  // 다시 실행하면 doc.width/height도 자동으로 따라가야, 픽셀 배열 길이와
  // 캔버스 크기가 어긋나 그림이 깨지는 일이 없다.
  useEffect(() => {
    setDoc((d) =>
      d.width === history.presentSize.width &&
      d.height === history.presentSize.height
        ? d
        : {
            ...d,
            width: history.presentSize.width,
            height: history.presentSize.height,
          },
    );
  }, [history.presentSize]);

  // 픽셀이든 메타(팔레트·이름·크기 등)든 새 편집이 시작되면(pixelsDirty나
  // hasMetaEdits가 true가 되면) "자동 저장됨" 안내를 지운다 — setHasMetaEdits를
  // 부르는 모든 곳을 일일이 따라다니지 않고 한 곳에서 처리한다.
  useEffect(() => {
    if (pixelsDirty || hasMetaEdits) setShowSavedNotice(false);
  }, [pixelsDirty, hasMetaEdits]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // 열린 모든 탭 중 하나라도 저장되지 않은 변경이 있으면 창을 닫을 때 경고한다.
  // 활성 탭은 라이브 상태(pixelsDirty/hasMetaEdits)로, 비활성 탭은 마지막으로
  // 스냅샷에 저장해 둔 값으로 판단한다.
  useEffect(() => {
    const anyDirty = tabs.some((t, i) =>
      i === activeTabIndex
        ? pixelsDirty || hasMetaEdits
        : t.pixelsDirty || t.hasMetaEdits,
    );
    onDirtyChange(anyDirty);
  }, [tabs, activeTabIndex, pixelsDirty, hasMetaEdits, onDirtyChange]);

  // 다른 탭으로 전환하거나 탭을 닫기 전에, 지금 활성 탭의 라이브 편집 상태를
  // tabs 배열의 스냅샷으로 반영한다 — 안 그러면 방금까지 그리던 내용을 잃는다.
  // 되돌리기 스택(history)까지는 스냅샷에 담지 않으므로 이후 그 탭으로 돌아오면
  // 되돌리기 이력은 비어 있다(그림 내용 자체는 그대로 보존).
  const syncActiveTabSnapshot = useCallback(
    (list: Tab[]): Tab[] => {
      if (activeTabIndex < 0) return list;
      return list.map((t, i) =>
        i === activeTabIndex
          ? {
              doc: {
                ...doc,
                name,
                pixels: compositePixels,
                layers: history.presentLayers,
                activeLayerId: history.activeLayerId,
              },
              hasMetaEdits,
              pixelsDirty,
            }
          : t,
      );
    },
    [
      activeTabIndex,
      doc,
      name,
      compositePixels,
      history.presentLayers,
      history.activeLayerId,
      hasMetaEdits,
      pixelsDirty,
    ],
  );

  const loadTab = useCallback(
    (tab: Tab, index: number) => {
      setDoc(tab.doc);
      setName(tab.doc.name);
      const { layers, activeLayerId } = layersFromDoc(tab.doc);
      history.reset(layers, activeLayerId, {
        width: tab.doc.width,
        height: tab.doc.height,
      });
      setLayerScope(new Set([activeLayerId]));
      setActiveColorHex(DEFAULT_ACTIVE_COLOR);
      setSecondaryColorHex(null);
      setHasMetaEdits(tab.hasMetaEdits);
      setPixelsDirty(tab.pixelsDirty);
      setShowSavedNotice(false);
      setActiveTabIndex(index);
      // 배율 1 = 화면 맞춤이므로, 탭마다(캔버스 크기가 다를 수 있으니) 항상
      // 화면 맞춤으로 새로 시작한다.
      setCanvasZoom(1);
      // 다른 탭으로 넘어가면 재생 중이던 애니메이션은 의미가 없다.
      setIsPlaying(false);
    },
    [history],
  );

  const switchToTab = useCallback(
    (index: number) => {
      if (index === activeTabIndex || index < 0 || index >= tabs.length) return;
      const synced = syncActiveTabSnapshot(tabs);
      setTabs(synced);
      loadTab(synced[index], index);
    },
    [activeTabIndex, tabs, syncActiveTabSnapshot, loadTab],
  );

  const openNewTab = useCallback(
    (newDoc: PixelArt) => {
      const synced = syncActiveTabSnapshot(tabs);
      const newIndex = synced.length;
      const freshTab: Tab = {
        doc: newDoc,
        hasMetaEdits: false,
        pixelsDirty: false,
      };
      setTabs([...synced, freshTab]);
      loadTab(freshTab, newIndex);
    },
    [tabs, syncActiveTabSnapshot, loadTab],
  );

  // JSON 내보내기(exportAsJSON)의 반대편 — 그 파일을 다시 읽어 새 탭으로 연다.
  // 내보낸 파일을 그대로 되읽는 것뿐이라 이미지 불러오기처럼 다시 양자화할
  // 필요가 없다. id/createdAt은 새로 발급한다 — 디스크의 파일과 라이브러리의
  // 항목은 별개이므로, 원본 id를 그대로 쓰면 나중에 저장할 때 우연히 같은
  // id를 가진 다른 작품을 덮어쓸 위험이 있다.
  const handleImportJSONFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        let parsed: ReturnType<typeof parsePixelArtJSON> = null;
        try {
          parsed = parsePixelArtJSON(JSON.parse(String(reader.result)));
        } catch {
          parsed = null;
        }
        if (!parsed) {
          setAlertMessage(
            "올바른 픽셀아트 JSON 파일이 아닙니다(내보내기 > JSON으로 만든 파일인지 확인하세요).",
          );
          return;
        }
        openNewTab({
          id: uid(),
          name: parsed.name,
          width: parsed.width,
          height: parsed.height,
          palette: parsed.palette,
          pixels: parsed.pixels,
          layers: parsed.layers,
          activeLayerId: parsed.activeLayerId,
          layerMode: parsed.layerMode,
          createdAt: Date.now(),
        });
      };
      reader.readAsText(file);
    },
    [openNewTab],
  );

  const closeTab = useCallback(
    (index: number) => {
      const remaining = tabs.filter((_, i) => i !== index);
      setTabs(remaining);
      if (index === activeTabIndex) {
        if (remaining.length === 0) {
          setActiveTabIndex(-1);
        } else {
          const nextIndex = Math.min(index, remaining.length - 1);
          loadTab(remaining[nextIndex], nextIndex);
        }
      } else if (index < activeTabIndex) {
        setActiveTabIndex((i) => i - 1);
      }
    },
    [tabs, activeTabIndex, loadTab],
  );

  const handleCreate = useCallback(
    (width: number, height: number, newName: string) => {
      const fresh = { ...blankDoc(width, height), name: newName };
      openNewTab(fresh);
      setShowNewCanvasDialog(false);
    },
    [openNewTab],
  );

  // 이미 열려 있는 탭이면 새로 추가하지 않고 그 탭으로 전환한다.
  const handleOpenExisting = useCallback(
    (art: PixelArt) => {
      const existingIndex = tabs.findIndex((t) => t.doc.id === art.id);
      if (existingIndex >= 0) {
        if (existingIndex !== activeTabIndex) switchToTab(existingIndex);
      } else {
        openNewTab(art);
      }
      setShowOpenDialog(false);
    },
    [tabs, activeTabIndex, switchToTab, openNewTab],
  );

  const handleStrokeEnd = useCallback(
    (next: PixelValue[], moveOriginalMask?: Set<number> | null) => {
      pushHistory(next, undefined, moveOriginalMask);
    },
    [pushHistory],
  );

  // 실행취소로 되돌릴 수 있으므로(다른 파괴적 동작들과 같은 관례) 별도 확인 없이
  // 바로 전체를 투명하게 지운다.
  const handleClearCanvas = useCallback(() => {
    pushHistory(createGrid(doc.width, doc.height));
  }, [pushHistory, doc.width, doc.height]);

  // 선택 영역(사각형 선택·마법봉으로 고른 픽셀들)을 활성 색상으로 한 번에
  // 칠한다 — 마법봉의 "전역 동일색 선택"과 함께 쓰면, 화면 곳곳에 흩어 칠한
  // 특정 색을 한 번에 다른 색으로 바꾸는 "색상 일괄 수정"으로 쓸 수 있다.
  // setPixel이 이미 알파 합성을 하므로 반투명 활성 색상도 자연스럽게 섞인다.
  const handleFillSelection = useCallback(() => {
    if (!selection.mask || selection.mask.size === 0) return;
    let next = history.present;
    selection.mask.forEach((i) => {
      const x = i % doc.width;
      const y = Math.floor(i / doc.width);
      next = setPixel(next, doc.width, x, y, activeColorHex);
    });
    pushHistory(next);
  }, [selection.mask, history.present, doc.width, activeColorHex, pushHistory]);

  // 확정 전 텍스트를 실제 픽셀에 굽는다(래스터화 → 커버리지 기반으로 색 결정).
  // gradientFill이면 각 칸의 색을 캔버스 좌표 기준 그라데이션에서 가져오고,
  // 아니면 활성 색상 하나를 쓴다. antialias면 그 색을 커버리지 비율만큼 배경과
  // 섞어 하나의 불투명 색으로 만든다. 픽셀은 트루컬러라 팔레트를 신경 쓸
  // 필요 없이 계산된 색을 그대로 적어 넣으면 된다.
  const commitPendingText = useCallback(
    (p: {
      x: number;
      y: number;
      text: string;
      fontSize: number;
      antialias: boolean;
      gradientFill: boolean;
      align: TextAlign;
      rotation: Rotation;
    }) => {
      if (!p.text.trim()) return;
      const raw = rasterizeText(p.text, p.fontSize, p.align);
      const {
        width: tw,
        height: th,
        alpha,
      } = rotateAlphaBuffer(raw.alpha, raw.width, raw.height, p.rotation);
      const drawX = textDrawX(p.x, tw, p.align);
      const next = history.present.slice();
      const flatHex = activeColorHex;
      const stepColors = p.gradientFill
        ? buildGradientSteps(
            activeColorHex,
            secondaryColorHex ?? "#00000000",
            gradientSteps,
          )
        : null;
      const axis =
        stepColors &&
        bboxGradientAxis(
          [
            { x: drawX, y: p.y },
            { x: drawX + tw, y: p.y + th },
          ],
          gradientAngleDeg,
        );
      for (let ty = 0; ty < th; ty++) {
        for (let tx = 0; tx < tw; tx++) {
          const coverage = alpha[ty * tw + tx] / 255;
          if (coverage === 0) continue;
          if (!p.antialias && coverage <= 0.5) continue;
          const px = drawX + tx;
          const py = p.y + ty;
          if (px < 0 || py < 0 || px >= doc.width || py >= doc.height) continue;
          const idx = py * doc.width + px;
          let fgHex = flatHex;
          if (stepColors && axis) {
            const t = projectT(px, py, axis.x0, axis.y0, axis.x1, axis.y1);
            const hex = rgbaToPixelValue(stepColorAt(stepColors, t));
            if (hex === null) continue; // 완전히 투명한 그라데이션 구간은 건너뛴다
            fgHex = hex;
          }
          if (p.antialias) {
            const bgHex = next[idx] ?? "#ffffff";
            next[idx] = mixHex(bgHex, fgHex, coverage);
          } else {
            next[idx] = fgHex;
          }
        }
      }
      pushHistory(next);
    },
    [
      doc.width,
      doc.height,
      activeColorHex,
      secondaryColorHex,
      gradientSteps,
      gradientAngleDeg,
      history.present,
      pushHistory,
    ],
  );

  // 텍스트 도구로 클릭한 자리에 인라인 입력을 띄운다 — 이미 확정 전 텍스트가
  // 떠 있었다면(경계 밖 클릭) 먼저 굽고 새 자리에서 다시 시작한다.
  const handleTextToolClick = useCallback(
    (x: number, y: number) => {
      setPendingText((p) => {
        if (p) commitPendingText(p);
        return {
          x,
          y,
          text: "",
          fontSize: 8,
          antialias: false,
          gradientFill: false,
          align: "left",
          rotation: 0,
        };
      });
    },
    [commitPendingText],
  );

  const handlePendingTextChange = useCallback(
    (text: string, fontSize: number) => {
      setPendingText((p) => (p ? { ...p, text, fontSize } : p));
    },
    [],
  );

  const handlePendingTextMove = useCallback((x: number, y: number) => {
    setPendingText((p) => (p ? { ...p, x, y } : p));
  }, []);

  const handlePendingTextToggleAA = useCallback(() => {
    setPendingText((p) => (p ? { ...p, antialias: !p.antialias } : p));
  }, []);

  const handlePendingTextToggleGradient = useCallback(() => {
    setPendingText((p) => (p ? { ...p, gradientFill: !p.gradientFill } : p));
  }, []);

  // 정렬 기준점(x)은 정렬 모드에 따라 텍스트가 그려지는 실제 위치(drawX)를
  // 다르게 만든다(textDrawX 참고) — 그래서 정렬 버튼을 눌렀을 때 x를 그대로
  // 두면, 지금 화면에 보이는 텍스트가 정렬이 바뀐 만큼 옆으로 튀어 보였다.
  // 바뀌기 전 drawX를 그대로 유지하도록 새 정렬 기준의 x를 역산해, 정렬
  // 버튼은 "지금 위치는 그대로 두고 이후 늘어나는 방향만" 바꾸게 한다.
  const handlePendingTextSetAlign = useCallback((align: TextAlign) => {
    setPendingText((p) => {
      if (!p) return p;
      const raw = rasterizeText(p.text, p.fontSize, p.align);
      const tw = p.rotation === 90 || p.rotation === 270 ? raw.height : raw.width;
      const currentDrawX = textDrawX(p.x, tw, p.align);
      const nextX =
        align === "center"
          ? currentDrawX + Math.floor(tw / 2)
          : align === "right"
            ? currentDrawX + tw
            : currentDrawX;
      return { ...p, x: nextX, align };
    });
  }, []);

  const handlePendingTextRotate = useCallback(() => {
    setPendingText((p) =>
      p ? { ...p, rotation: ((p.rotation + 90) % 360) as Rotation } : p,
    );
  }, []);

  const handlePendingTextCommit = useCallback(() => {
    setPendingText((p) => {
      if (p) commitPendingText(p);
      return null;
    });
  }, [commitPendingText]);

  const handlePendingTextCancel = useCallback(() => {
    setPendingText(null);
  }, []);

  // 텍스트 도구를 벗어나면(다른 도구로 전환) 뜬 채로 남아있던 텍스트를 잃지
  // 않도록 자동으로 굽는다 — 빈 텍스트면 commitPendingText가 그냥 무시한다.
  useEffect(() => {
    if (tool !== "text" && pendingText) {
      commitPendingText(pendingText);
      setPendingText(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool]);

  const handlePendingImageMove = useCallback((x: number, y: number) => {
    setPendingImage((p) => (p ? { ...p, x, y } : p));
  }, []);

  const handlePendingImageResize = useCallback(
    (width: number, height: number) => {
      setPendingImage((p) => (p ? { ...p, width, height } : p));
    },
    [],
  );

  const handlePendingImageRotate = useCallback(() => {
    setPendingImage((p) =>
      p ? { ...p, rotation: ((p.rotation + 90) % 360) as Rotation } : p,
    );
  }, []);

  // 지금 배치·크기·회전으로 원본을 리샘플링해 실제 픽셀에 합성한다 — setPixel이
  // 이미 알파 합성을 하므로 이미지의 반투명 가장자리도 밑그림과 자연스럽게
  // 섞이고, 밑에 있던 내용을 지우지 않는다(선택 영역 밖으로 나간 부분은
  // 그냥 건너뛴다).
  const handlePendingImageCommit = useCallback(() => {
    setPendingImage((p) => {
      if (!p) return null;
      const rotated = rotatePixelValuesBy(
        p.pixels,
        p.srcWidth,
        p.srcHeight,
        p.rotation,
      );
      const resampled = resamplePixelValues(
        rotated.pixels,
        rotated.width,
        rotated.height,
        p.width,
        p.height,
      );
      let next = history.present;
      for (let ty = 0; ty < p.height; ty++) {
        for (let tx = 0; tx < p.width; tx++) {
          const color = resampled[ty * p.width + tx];
          if (color === null) continue;
          const px = p.x + tx;
          const py = p.y + ty;
          if (px < 0 || py < 0 || px >= doc.width || py >= doc.height) continue;
          next = setPixel(next, doc.width, px, py, color);
        }
      }
      pushHistory(next);
      return null;
    });
  }, [history.present, doc.width, doc.height, pushHistory]);

  const handlePendingImageCancel = useCallback(() => {
    setPendingImage(null);
  }, []);

  // 붙여넣기도 이미지 불러오기와 똑같이 pendingImage로 띄운다 — 예전에는
  // 클립보드 내용을 (0,0) 기준으로 바로 픽셀에 합성해버려, 위치를 조정할 수도
  // 없고 무엇이 방금 붙여넣어졌는지도 알 수 없었다. 텍스트·이미지 요소처럼
  // 위치를 옮기고 확정해야 실제 픽셀에 반영되며, 그 자체가 곧 "지금 선택된
  // 요소"를 시각적으로 보여주므로 기존 선택 영역은 비워 혼동을 없앤다.
  const handlePaste = useCallback(() => {
    if (!selection.clipboard) return;
    if (pendingImage) handlePendingImageCommit();
    const clip = selection.clipboard;
    setPendingImage({
      x: Math.floor((doc.width - clip.w) / 2),
      y: Math.floor((doc.height - clip.h) / 2),
      width: clip.w,
      height: clip.h,
      srcWidth: clip.w,
      srcHeight: clip.h,
      pixels: clipToGrid(clip),
      rotation: 0,
    });
    selection.setMask(null);
  }, [
    selection,
    pendingImage,
    handlePendingImageCommit,
    doc.width,
    doc.height,
  ]);

  // 그라데이션 드래그가 끝나면 시작(활성 색상)~끝(보조 색상) 사이를 밴딩해
  // 채운다. 픽셀은 트루컬러라 팔레트 확장 없이 계산된 색을 그대로 커밋한다.
  const handleGradientToolEnd = useCallback(
    (x0: number, y0: number, x1: number, y1: number) => {
      const result = applyGradient(
        history.present,
        doc.width,
        doc.height,
        x0,
        y0,
        x1,
        y1,
        activeColorHex,
        secondaryColorHex ?? "#00000000",
        gradientSteps,
      );
      pushHistory(result);
    },
    [
      activeColorHex,
      secondaryColorHex,
      gradientSteps,
      history.present,
      pushHistory,
      doc.width,
      doc.height,
    ],
  );

  // 직선·사각형·원 드래그가 끝나면(0 크기가 아닐 때만 PixelCanvas가 호출)
  // 확정 전 상태로 띄운다 — 이미 다른 pendingShape가 있었다면 PixelCanvas가
  // pointerdown 시점에 먼저 커밋을 요청하므로 여기서는 그냥 새로 시작한다.
  const handleShapeDragEnd = useCallback(
    (
      tool: "line" | "rect" | "circle",
      x0: number,
      y0: number,
      x1: number,
      y1: number,
    ) => {
      setPendingShape({ tool, x0, y0, x1, y1 });
    },
    [],
  );

  const handlePendingShapeUpdate = useCallback((next: PendingShape) => {
    setPendingShape(next);
  }, []);

  // 지금 확정 전 도형을 실제 픽셀에 굽는다 — 채움·그라데이션 여부·그라데이션
  // 방향·브러시 크기는 스냅샷이 아니라 지금 이 순간의 값을 쓴다(확정 전에
  // 이리저리 바꿔본 그대로 반영되어야 한다).
  const handlePendingShapeCommit = useCallback(() => {
    setPendingShape((p) => {
      if (!p) return null;
      const shapePoints = shapeToolPoints(
        p.tool,
        p.x0,
        p.y0,
        p.x1,
        p.y1,
        filledShapes,
      );
      const expanded = expandPoints(
        shapePoints,
        doc.width,
        doc.height,
        brushSize,
      );
      if (shapeGradientFill) {
        const stepColors = buildGradientSteps(
          activeColorHex,
          secondaryColorHex ?? "#00000000",
          gradientSteps,
        );
        const axis = bboxGradientAxis(expanded, gradientAngleDeg);
        const next = history.present.slice();
        for (const pt of expanded) {
          if (pt.x < 0 || pt.y < 0 || pt.x >= doc.width || pt.y >= doc.height)
            continue;
          const t = projectT(pt.x, pt.y, axis.x0, axis.y0, axis.x1, axis.y1);
          next[pt.y * doc.width + pt.x] = rgbaToPixelValue(
            stepColorAt(stepColors, t),
          );
        }
        pushHistory(next);
      } else {
        let next = history.present;
        for (const pt of expanded) {
          if (pt.x < 0 || pt.y < 0 || pt.x >= doc.width || pt.y >= doc.height)
            continue;
          next = setPixel(next, doc.width, pt.x, pt.y, activeColorHex);
        }
        pushHistory(next);
      }
      return null;
    });
  }, [
    doc.width,
    doc.height,
    filledShapes,
    brushSize,
    shapeGradientFill,
    activeColorHex,
    secondaryColorHex,
    gradientSteps,
    gradientAngleDeg,
    history.present,
    pushHistory,
  ]);

  const handlePendingShapeCancel = useCallback(() => {
    setPendingShape(null);
  }, []);

  // 도형 도구를 벗어나면(다른 도구로 전환) 뜬 채로 남아있던 도형을 잃지 않도록
  // 자동으로 굽는다 — 텍스트 도구의 같은 관례와 동일하다.
  useEffect(() => {
    if (pendingShape && tool !== pendingShape.tool) {
      handlePendingShapeCommit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool]);

  const handleSave = useCallback(() => {
    if (activeTabIndex < 0) return;
    // 배경화면은 이름이 고정("배경화면")이고 일반 픽셀아트 목록이 아닌
    // 별도 저장소(wallpaper.ts)에 저장된다.
    const toSave: PixelArt = {
      ...doc,
      name: isWallpaper ? WALLPAPER_NAME : name,
      pixels: compositePixels,
      layers: history.presentLayers,
      activeLayerId: history.activeLayerId,
    };
    const ok = isWallpaper ? saveWallpaper(toSave) : savePixelArt(toSave);
    if (!ok) {
      flagSaveError();
      return;
    }
    setDoc(toSave);
    // 되돌리기 스택은 그대로 둔다 — 저장은 "지금 그림을 디스크에 반영했다"는
    // 뜻일 뿐, 그 전까지의 편집을 실행취소할 수 없게 만들 이유는 없다. 예전에는
    // 여기서 history.reset()을 불러 저장할 때마다 되돌리기 이력을 통째로
    // 비웠는데, 자동저장이 몇 초마다 조용히 이 일을 해버려 방금 그린 것도
    // 되돌릴 수 없는 문제가 있었다.
    setHasMetaEdits(false);
    setPixelsDirty(false);
  }, [
    activeTabIndex,
    doc,
    name,
    compositePixels,
    history.presentLayers,
    history.activeLayerId,
    isWallpaper,
    flagSaveError,
  ]);

  // 자동저장이 막 끝났을 때만 안내 문구를 띄운다 — 수동 저장(버튼·Ctrl+S)은
  // 사용자가 직접 저장을 눌렀다는 걸 이미 알고 있으므로 따로 알리지 않는다.
  const handleAutosave = useCallback(() => {
    handleSave();
    setShowSavedNotice(true);
  }, [handleSave]);

  // 자동 저장 — 편집을 멈춘 지 AUTOSAVE_DELAY_MS가 지나면 handleAutosave를
  // 호출한다. 매 획마다 저장하면 낭비이므로 편집이 있을 때만 타이머를 다시
  // 건다(디바운스). 완전히 빈 새 캔버스는 pixelsDirty도 hasMetaEdits도 false라
  // 애초에 대상이 아니다.
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (activeTabIndex < 0) return;
    const dirty = pixelsDirty || hasMetaEdits;
    if (!dirty) return;
    autosaveTimeoutRef.current = setTimeout(handleAutosave, AUTOSAVE_DELAY_MS);
    return () => {
      if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
    };
  }, [activeTabIndex, pixelsDirty, hasMetaEdits, handleAutosave]);

  // 다른 이름으로 저장 — 원본(배경화면이라도)은 건드리지 않고 새 id로 일반
  // 픽셀아트 목록에 별도 항목을 만든 뒤, 이후 편집은 그 새 사본을 대상으로 한다.
  const handleSaveAs = useCallback(() => {
    if (activeTabIndex < 0) return;
    setSaveAsPromptOpen(true);
  }, [activeTabIndex]);

  const handleConfirmSaveAs = useCallback(
    (newName: string) => {
      setSaveAsPromptOpen(false);
      const toSave: PixelArt = {
        ...doc,
        id: uid(),
        name: newName,
        pixels: compositePixels,
        layers: history.presentLayers,
        activeLayerId: history.activeLayerId,
        createdAt: Date.now(),
      };
      const ok = savePixelArt(toSave);
      if (!ok) {
        flagSaveError();
        return;
      }
      setDoc(toSave);
      setName(newName);
      setHasMetaEdits(false);
      setPixelsDirty(false);
      setTabs((prev) =>
        prev.map((t, i) =>
          i === activeTabIndex
            ? { doc: toSave, hasMetaEdits: false, pixelsDirty: false }
            : t,
        ),
      );
    },
    [
      activeTabIndex,
      doc,
      compositePixels,
      history.presentLayers,
      history.activeLayerId,
      flagSaveError,
    ],
  );

  // 캔버스 크기 수정 — 그림을 다시 늘리거나 줄이지 않고 경계만 바꾼다(왼쪽 위
  // 기준으로 자르거나 투명하게 늘림). 팔레트·이름 등 다른 속성은 그대로 둔다.
  // 되돌리기 스택에 크기 정보도 함께 실어(pushHistory의 size 인자) 이 조작도
  // 되돌릴 수 있게 한다 — doc.width/height는 history.presentSize를 따라가는
  // effect가 알아서 맞춰준다.
  const handleResizeCanvas = useCallback(
    (newWidth: number, newHeight: number) => {
      const nextLayers = history.presentLayers.map((l) => ({
        ...l,
        pixels: resizeGrid(l.pixels, doc.width, doc.height, newWidth, newHeight),
      }));
      pushHistoryAllLayers(nextLayers, { width: newWidth, height: newHeight });
      setResizingCanvas(false);
      setHasMetaEdits(true);
    },
    [doc.width, doc.height, history.presentLayers, pushHistoryAllLayers],
  );

  // 상하/좌우 반전과 90도 회전 모두 pushHistoryAllLayers로 되돌리기 스택에
  // 올린다 — 회전은 크기 자체가 바뀌므로(정사각형이 아닌 캔버스) size 인자를
  // 함께 넘겨, 되돌리기/다시 실행 때 그 시점의 크기로 정확히 복원되게 한다.
  const handleFlipHorizontal = useCallback(() => {
    const nextLayers = history.presentLayers.map((l) => ({
      ...l,
      pixels: flipHorizontal(l.pixels, doc.width, doc.height),
    }));
    pushHistoryAllLayers(nextLayers);
  }, [history.presentLayers, doc.width, doc.height, pushHistoryAllLayers]);

  const handleFlipVertical = useCallback(() => {
    const nextLayers = history.presentLayers.map((l) => ({
      ...l,
      pixels: flipVertical(l.pixels, doc.width, doc.height),
    }));
    pushHistoryAllLayers(nextLayers);
  }, [history.presentLayers, doc.width, doc.height, pushHistoryAllLayers]);

  const handleRotate90 = useCallback(
    (direction: 1 | -1) => {
      let newWidth = doc.height;
      let newHeight = doc.width;
      const nextLayers = history.presentLayers.map((l) => {
        const rotated = rotate90(l.pixels, doc.width, doc.height, direction);
        newWidth = rotated.width;
        newHeight = rotated.height;
        return { ...l, pixels: rotated.pixels };
      });
      pushHistoryAllLayers(nextLayers, { width: newWidth, height: newHeight });
      setHasMetaEdits(true);
    },
    [history.presentLayers, doc.width, doc.height, pushHistoryAllLayers],
  );

  // 활성 탭은 라이브 상태(pixelsDirty/hasMetaEdits)로, 비활성 탭은 마지막
  // 전환 시점에 스냅샷에 저장해 둔 값으로 저장되지 않은 변경이 있는지 본다.
  const isTabDirty = useCallback(
    (index: number) =>
      index === activeTabIndex
        ? pixelsDirty || hasMetaEdits
        : tabs[index]?.pixelsDirty || tabs[index]?.hasMetaEdits || false,
    [activeTabIndex, pixelsDirty, hasMetaEdits, tabs],
  );

  // 탭을 직접 닫을 때(X 클릭)는 즉시 닫지 않고, 저장되지 않은 변경이 있으면
  // 클립스튜디오처럼 저장/저장 안 함/취소를 먼저 묻는다.
  const requestCloseTab = useCallback(
    (index: number) => {
      if (isTabDirty(index)) setPendingCloseTabIndex(index);
      else closeTab(index);
    },
    [isTabDirty, closeTab],
  );

  // 비활성 탭은 doc/history가 스냅샷으로만 존재하므로, 활성 탭의 handleSave와
  // 별도로 스냅샷을 직접 저장하는 경로가 필요하다.
  const saveTabSnapshot = useCallback(
    (tab: Tab) => {
      const isWp = tab.doc.id === WALLPAPER_ID;
      const toSave: PixelArt = isWp
        ? { ...tab.doc, name: WALLPAPER_NAME }
        : tab.doc;
      const ok = isWp ? saveWallpaper(toSave) : savePixelArt(toSave);
      if (!ok) flagSaveError();
    },
    [flagSaveError],
  );

  const handleCloseSave = useCallback(() => {
    if (pendingCloseTabIndex === null) return;
    const index = pendingCloseTabIndex;
    if (index === activeTabIndex) handleSave();
    else saveTabSnapshot(tabs[index]);
    setPendingCloseTabIndex(null);
    closeTab(index);
  }, [
    pendingCloseTabIndex,
    activeTabIndex,
    tabs,
    saveTabSnapshot,
    closeTab,
    handleSave,
  ]);

  const handleCloseDiscard = useCallback(() => {
    if (pendingCloseTabIndex === null) return;
    const index = pendingCloseTabIndex;
    setPendingCloseTabIndex(null);
    closeTab(index);
  }, [pendingCloseTabIndex, closeTab]);

  // 제목표시줄의 닫기(X) — 열린 탭 중 하나라도 저장되지 않은 변경이 있으면
  // 편집창 전체를 닫기 전에 한 번 더 확인한다(브라우저 beforeunload 경고와는
  // 별개로, 이 앱 안에서 편집창만 닫는 경우를 잡아준다).
  const handleExitClick = useCallback(() => {
    const anyDirty = tabs.some((_, i) => isTabDirty(i));
    if (anyDirty) setPendingExit(true);
    else onExit();
  }, [tabs, isTabDirty, onExit]);

  useKeyboardShortcuts({
    onToolChange: setTool,
    onUndo: handleUndo,
    onRedo: handleRedo,
    onCopy: () => selection.copy(history.present, doc.width),
    onPaste: handlePaste,
    onSave: handleSave,
    onSaveAs: handleSaveAs,
    onClearSelection: () => selection.setMask(null),
    onSetBrushSize: setBrushSize,
    onRotate: handleRotate90,
    onFlipHorizontal: handleFlipHorizontal,
    onFlipVertical: handleFlipVertical,
    onToggleGrid: () => setShowGrid((g) => !g),
    onToggleCrosshair: () => setShowCrosshair((c) => !c),
    onZoomIn: () => setCanvasZoom((z) => nextZoomStep(z, 1)),
    onZoomOut: () => setCanvasZoom((z) => nextZoomStep(z, -1)),
    onFillSelection: handleFillSelection,
    hasPendingImage: !!pendingImage,
    onCommitPendingImage: handlePendingImageCommit,
    onCancelPendingImage: handlePendingImageCancel,
    hasPendingShape: !!pendingShape,
    onCommitPendingShape: handlePendingShapeCommit,
    onCancelPendingShape: handlePendingShapeCancel,
  });

  // "+" 버튼으로 지금 활성 색상을 즐겨찾기에 명시적으로 추가한다.
  const handleAddFavorite = useCallback((hex: string) => {
    setDoc((d) => ({ ...d, palette: [...d.palette, hex] }));
    setHasMetaEdits(true);
  }, []);

  const handleRemoveFavorite = useCallback((index: number) => {
    setDoc((d) => ({
      ...d,
      palette: d.palette.filter((_, i) => i !== index),
    }));
    setHasMetaEdits(true);
  }, []);

  // 팔레트 세트를 "불러오면" 기존 즐겨찾기에 더하는 게 아니라 세트 색으로
  // 통째로 바꾼다 — 세트를 즐겨찾기와 뒤섞인 채로 계속 추가만 하다 보면 어느
  // 세트를 쓰고 있는지 알 수 없어지므로, 세트를 고르는 행동은 항상 "지금
  // 즐겨찾기를 이 세트로 교체"를 뜻하게 한다.
  const handleReplaceFavorites = useCallback((colors: string[]) => {
    setDoc((d) => ({ ...d, palette: colors.slice() }));
    setHasMetaEdits(true);
  }, []);

  // 즐겨찾기 스와치를 선택한 뒤 색상환을 조작하면 그 스와치의 저장값 자체를
  // 바꾼다 — 이미 칠한 픽셀은 값을 직접 복사해 저장하므로 이 편집이 그림에
  // 영향을 주지 않는다.
  const handleEditFavorite = useCallback((index: number, hex: string) => {
    setDoc((d) => ({
      ...d,
      palette: d.palette.map((c, i) => (i === index ? hex : c)),
    }));
    setHasMetaEdits(true);
  }, []);

  const handlePickColor = useCallback((hex: string) => {
    setActiveColorHex(hex);
  }, []);

  const handleSelectLayer = useCallback(
    (id: string) => {
      // 다른 레이어로 활성을 바꾸면 지금까지 진행 중이던 드래그 코얼레싱은
      // 더 이상 의미가 없다 — 다음 드래그는 항상 새 되돌리기 경계에서 시작해야 한다.
      dragCoalesceRef.current = null;
      history.setActiveLayerId(id);
    },
    [history],
  );

  const handleAddLayer = useCallback(() => {
    if (history.presentLayers.length >= MAX_LAYERS) return;
    const newLayer = createLayer(
      uid(),
      `레이어 ${history.presentLayers.length + 1}`,
      doc.width,
      doc.height,
    );
    const insertAt = activeLayerIndex + 1;
    const nextLayers = [
      ...history.presentLayers.slice(0, insertAt),
      newLayer,
      ...history.presentLayers.slice(insertAt),
    ];
    pushLayerOp(nextLayers, newLayer.id);
  }, [history.presentLayers, activeLayerIndex, doc.width, doc.height, pushLayerOp]);

  const handleDuplicateLayer = useCallback(
    (id: string) => {
      if (history.presentLayers.length >= MAX_LAYERS) return;
      const index = history.presentLayers.findIndex((l) => l.id === id);
      if (index < 0) return;
      const source = history.presentLayers[index];
      const copy: PixelLayer = {
        ...source,
        id: uid(),
        name: `${source.name} 사본`,
        pixels: source.pixels.slice(),
      };
      const nextLayers = [
        ...history.presentLayers.slice(0, index + 1),
        copy,
        ...history.presentLayers.slice(index + 1),
      ];
      pushLayerOp(nextLayers, copy.id);
    },
    [history.presentLayers, pushLayerOp],
  );

  const handleDeleteLayer = useCallback(
    (id: string) => {
      if (history.presentLayers.length <= 1) return;
      const index = history.presentLayers.findIndex((l) => l.id === id);
      if (index < 0) return;
      const nextLayers = history.presentLayers.filter((l) => l.id !== id);
      const nextActiveIndex = Math.min(index, nextLayers.length - 1);
      pushLayerOp(nextLayers, nextLayers[nextActiveIndex].id);
    },
    [history.presentLayers, pushLayerOp],
  );

  // 병합 대상(id)의 내용을 바로 아래 레이어 위에 합성해 그 아래 레이어에
  // 반영하고, 병합된(위) 레이어는 배열에서 없앤다 — 아래 레이어의 투명도는
  // 그대로 둔다(내용만 받는다).
  const handleMergeDown = useCallback(
    (id: string) => {
      const index = history.presentLayers.findIndex((l) => l.id === id);
      if (index <= 0) return;
      const layer = history.presentLayers[index];
      const below = history.presentLayers[index - 1];
      // below 자신의 보정을 먼저 픽셀에 구워넣은 뒤에 위 레이어를 얹어야
      // 병합 결과가 병합 전 화면과 같아진다 — 그러지 않으면 병합된 레이어가
      // below의 보정 필드를 그대로 물려받아, 이미 위 레이어와 섞인 최종
      // 픽셀에 below의 보정이 렌더링 시점에 다시(이중으로) 걸려버린다.
      const belowBaked = below.pixels.map((p) => applyAdjustments(p, below));
      const merged: PixelLayer = {
        ...below,
        pixels: compositeOnto(
          belowBaked,
          layer.pixels,
          layer.opacity,
          layer.blendMode ?? "normal",
          layer,
        ),
        brightness: undefined,
        contrast: undefined,
        saturation: undefined,
        temperature: undefined,
        tint: undefined,
      };
      const nextLayers = [
        ...history.presentLayers.slice(0, index - 1),
        merged,
        ...history.presentLayers.slice(index + 1),
      ];
      pushLayerOp(nextLayers, merged.id);
    },
    [history.presentLayers, pushLayerOp],
  );

  const handleMoveLayer = useCallback(
    (id: string, direction: 1 | -1) => {
      const index = history.presentLayers.findIndex((l) => l.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= history.presentLayers.length) {
        return;
      }
      const nextLayers = history.presentLayers.slice();
      [nextLayers[index], nextLayers[target]] = [
        nextLayers[target],
        nextLayers[index],
      ];
      pushLayerOp(nextLayers, id);
    },
    [history.presentLayers, pushLayerOp],
  );

  const handleRenameLayer = useCallback(
    (id: string, layerName: string) => {
      const nextLayers = history.presentLayers.map((l) =>
        l.id === id ? { ...l, name: layerName } : l,
      );
      pushLayerOp(nextLayers, history.activeLayerId);
    },
    [history.presentLayers, history.activeLayerId, pushLayerOp],
  );

  const handleToggleLayerVisible = useCallback(
    (id: string) => {
      const nextLayers = history.presentLayers.map((l) =>
        l.id === id ? { ...l, visible: !l.visible } : l,
      );
      pushLayerOp(nextLayers, history.activeLayerId);
    },
    [history.presentLayers, history.activeLayerId, pushLayerOp],
  );

  const handleToggleLayerLocked = useCallback(
    (id: string) => {
      const nextLayers = history.presentLayers.map((l) =>
        l.id === id ? { ...l, locked: !l.locked } : l,
      );
      pushLayerOp(nextLayers, history.activeLayerId);
    },
    [history.presentLayers, history.activeLayerId, pushLayerOp],
  );

  const handleLayerOpacityChange = useCallback(
    (id: string, opacity: number) => {
      const nextLayers = history.presentLayers.map((l) =>
        l.id === id ? { ...l, opacity } : l,
      );
      if (
        dragCoalesceRef.current?.layerId === id &&
        dragCoalesceRef.current.field === "opacity"
      ) {
        history.replacePresentLayers(nextLayers, history.activeLayerId);
      } else {
        // pushLayerOp가 내부에서 dragCoalesceRef를 비우므로, 이 드래그의
        // 시작임을 기록하는 아래 줄은 반드시 pushLayerOp 호출 다음에 온다.
        pushLayerOp(nextLayers, history.activeLayerId);
        dragCoalesceRef.current = { layerId: id, field: "opacity" };
      }
    },
    [history, pushLayerOp],
  );

  const handleOpacityDragEnd = useCallback(() => {
    dragCoalesceRef.current = null;
  }, []);

  const handleLayerBlendModeChange = useCallback(
    (id: string, blendMode: BlendMode) => {
      const nextLayers = history.presentLayers.map((l) =>
        l.id === id ? { ...l, blendMode } : l,
      );
      pushLayerOp(nextLayers, history.activeLayerId);
    },
    [history.presentLayers, history.activeLayerId, pushLayerOp],
  );

  // range 입력 다섯 개(밝기·대비·채도·색온도·틴트)가 공유하는 핸들러 —
  // handleLayerOpacityChange와 동일한 코얼레싱 패턴이지만, 레이어 id뿐
  // 아니라 어느 필드인지까지 같아야 "이어지는 드래그"로 취급한다.
  const handleLayerAdjustmentChange = useCallback(
    (
      id: string,
      field: "brightness" | "contrast" | "saturation" | "temperature" | "tint",
      value: number,
    ) => {
      const nextLayers = history.presentLayers.map((l) =>
        l.id === id ? { ...l, [field]: value } : l,
      );
      if (
        dragCoalesceRef.current?.layerId === id &&
        dragCoalesceRef.current.field === field
      ) {
        history.replacePresentLayers(nextLayers, history.activeLayerId);
      } else {
        pushLayerOp(nextLayers, history.activeLayerId);
        dragCoalesceRef.current = { layerId: id, field };
      }
    },
    [history, pushLayerOp],
  );

  const handleAdjustmentDragEnd = useCallback(() => {
    dragCoalesceRef.current = null;
  }, []);

  const handleResetAdjustments = useCallback(
    (id: string) => {
      const nextLayers = history.presentLayers.map((l) =>
        l.id === id
          ? {
              ...l,
              brightness: undefined,
              contrast: undefined,
              saturation: undefined,
              temperature: undefined,
              tint: undefined,
            }
          : l,
      );
      pushLayerOp(nextLayers, history.activeLayerId);
    },
    [history.presentLayers, history.activeLayerId, pushLayerOp],
  );

  const handleFlattenLayers = useCallback(() => {
    if (history.presentLayers.length <= 1) return;
    const flat: PixelLayer = {
      id: uid(),
      name: "레이어 1",
      pixels: compositeLayers(history.presentLayers, doc.width, doc.height),
      visible: true,
      opacity: 1,
      locked: false,
    };
    pushLayerOp([flat], flat.id);
  }, [history.presentLayers, doc.width, doc.height, pushLayerOp]);

  // 체크된 레이어(layerScope)를 켜고 끈다 — 활성 레이어(그리기 대상)와는
  // 무관한 독립 상태라 pushLayerOp(실행취소)를 거치지 않는다.
  const handleToggleLayerScope = useCallback((id: string) => {
    setLayerScope((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // 체크된 레이어들의 불투명 영역을 하나로 묶어 그 경계 상자가 캔버스
  // 중앙에 오도록, 체크된 레이어들만 같은 만큼(서로 상대 위치 유지) 이동시킨다.
  // 체크 안 된 레이어는 건드리지 않는다. handleFlattenLayers와 같은 패턴으로
  // pushLayerOp 한 번에 실행취소 스택에 올라간다.
  const handleAlignLayers = useCallback(() => {
    const targets = history.presentLayers.filter((l) => layerScope.has(l.id));
    if (targets.length === 0) return;
    const box = unionBoundingBox(
      targets.map((l) => l.pixels),
      doc.width,
      doc.height,
    );
    if (!box) return;
    const contentW = box.maxX - box.minX + 1;
    const contentH = box.maxY - box.minY + 1;
    const dx = Math.floor((doc.width - contentW) / 2) - box.minX;
    const dy = Math.floor((doc.height - contentH) / 2) - box.minY;
    if (dx === 0 && dy === 0) return;
    const nextLayers = history.presentLayers.map((l) =>
      layerScope.has(l.id)
        ? { ...l, pixels: shiftPixels(l.pixels, doc.width, doc.height, dx, dy) }
        : l,
    );
    pushLayerOp(nextLayers, history.activeLayerId);
  }, [history.presentLayers, history.activeLayerId, layerScope, doc.width, doc.height, pushLayerOp]);

  const handleFrameDurationChange = useCallback(
    (id: string, ms: number) => {
      const nextLayers = history.presentLayers.map((l) =>
        l.id === id ? { ...l, frameDurationMs: ms } : l,
      );
      pushLayerOp(nextLayers, history.activeLayerId);
    },
    [history.presentLayers, history.activeLayerId, pushLayerOp],
  );

  // 진짜 PC 프로그램의 창처럼 제목표시줄(이름+닫기)과 그 아래 파일/편집 메뉴 바를
  // 분리한다 — 저장·내보내기·실행취소 같은 동작은 더 이상 제목표시줄에 흩어진
  // 버튼이 아니라 메뉴 항목으로 모은다. ContextMenu를 버튼 아래쪽에 앵커해 재사용한다.
  const openFileMenu = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const rootRect = rootRef.current?.getBoundingClientRect();
      const noActiveTab = activeTabIndex < 0;
      // 내보내기는 항상 저장(handleSave)과 같은 "지금 이 순간의" 라이브
      // 값을 써야 한다 — doc.layers/activeLayerId는 저장할 때나 탭을 불러올
      // 때만 갱신되고, 편집 중에는 갱신되지 않는다(자동저장은 3분 주기).
      // 이 객체 하나를 만들어 내보내기 4종 + ExportPanel이 모두 재사용한다.
      const exportDoc: PixelArt = {
        ...doc,
        pixels: compositePixels,
        layers: history.presentLayers,
        activeLayerId: history.activeLayerId,
      };
      const exportSubmenu: ContextMenuItem[] = [
        { label: "PNG", onClick: () => exportAsPNG(exportDoc) },
        { label: "SVG", onClick: () => exportAsSVG(exportDoc) },
        {
          label: "JSON",
          title:
            "다른 기기에서도 그림을 그대로 이어 그리고 싶을 때 씁니다 — 저장된 이 파일을 그 기기의 파일 > JSON 불러오기로 열면 됩니다.",
          onClick: () => exportAsJSON(exportDoc),
        },
        { label: "JPG (손실 압축)", onClick: () => exportAsJPG(exportDoc) },
      ];
      if (layerMode === "frames") {
        exportSubmenu.push(
          {
            label: "GIF",
            title: "보이는 프레임을 순서대로 재생하는 GIF로 내보냅니다.",
            onClick: () => {
              void exportAsGIF(exportDoc);
            },
          },
          {
            label: "스프라이트 시트",
            title: "보이는 프레임을 가로로 이어붙인 PNG 한 장으로 내보냅니다.",
            onClick: () => exportAsSpriteSheet(exportDoc),
          },
        );
      }
      setMenuAnchor({
        x: rect.left - (rootRect?.left ?? 0),
        y: rect.bottom - (rootRect?.top ?? 0),
        items: [
          { label: "새로 만들기", onClick: () => setShowNewCanvasDialog(true) },
          { label: "열기", onClick: () => setShowOpenDialog(true) },
          {
            label: "JSON 불러오기",
            title:
              "다른 기기에서 이 편집기로 만든 작품을 내보내기 > JSON으로 저장해뒀다면, 그 파일을 여기서 다시 불러올 수 있습니다.",
            onClick: () => jsonFileInputRef.current?.click(),
          },
          { label: "저장", onClick: handleSave, disabled: noActiveTab },
          {
            label: "다른 이름으로 저장",
            onClick: handleSaveAs,
            disabled: noActiveTab,
          },
          {
            label: "내보내기",
            disabled: noActiveTab,
            submenu: exportSubmenu,
          },
        ],
      });
    },
    [
      doc,
      compositePixels,
      history.presentLayers,
      history.activeLayerId,
      handleSave,
      handleSaveAs,
      activeTabIndex,
      layerMode,
    ],
  );

  const openEditMenu = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const rootRect = rootRef.current?.getBoundingClientRect();
      const noActiveTab = activeTabIndex < 0;
      setMenuAnchor({
        x: rect.left - (rootRect?.left ?? 0),
        y: rect.bottom - (rootRect?.top ?? 0),
        items: [
          {
            label: "실행취소",
            onClick: handleUndo,
            disabled: noActiveTab || !history.canUndo,
          },
          {
            label: "다시실행",
            onClick: handleRedo,
            disabled: noActiveTab || !history.canRedo,
          },
          {
            label: "복사",
            onClick: () => selection.copy(history.present, doc.width),
            disabled: noActiveTab,
          },
          {
            label: "캔버스 크기 수정",
            onClick: () => setResizingCanvas(true),
            disabled: noActiveTab,
          },
          {
            label: "붙여넣기",
            onClick: handlePaste,
            disabled: noActiveTab || !selection.clipboard,
          },
        ],
      });
    },
    [doc, history, selection, activeTabIndex, handlePaste, handleUndo, handleRedo],
  );

  const helpMod = helpPlatform === "mac" ? "⌘" : "Ctrl+";

  return (
    <div
      ref={rootRef}
      className={`pam-editor relative flex h-full w-full select-none flex-col overflow-hidden bg-white text-gray-900 transition-all duration-200 ease-out ${
        mounted && !closing ? "scale-100 opacity-100" : "scale-95 opacity-0"
      }`}
      // 입력칸(파일명, 헥스 코드, 픽셀 크기 등)에 값을 넣고 나서 클릭만으로
      // 캔버스로 넘어가면(캔버스는 포커스를 받는 요소가 아니다) 포커스가
      // 그 입력칸에 그대로 남아 있었다 — useKeyboardShortcuts가 "지금
      // 포커스된 요소가 입력칸이면 무시"하는 가드를 갖고 있어서, 실제로는
      // 캔버스를 만지고 있는데도 도구 단축키가 조용히 먹히지 않는 문제로
      // 이어졌다. 입력칸이 아닌 곳을 누르는 순간 남아 있는 포커스를 직접
      // 풀어준다(capture 단계라 다른 요소의 onClick보다 먼저 실행된다).
      onPointerDownCapture={(e) => {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
          return;
        }
        const active = document.activeElement;
        if (
          active instanceof HTMLElement &&
          (active.tagName === "INPUT" || active.tagName === "TEXTAREA")
        ) {
          active.blur();
        }
      }}
    >
      {/* 실제 OS 커서 대신 이 편집기 전용 커스텀 커서를 쓴다 — 기본은 일반
          화살표, 버튼은 포인팅, 텍스트 입력칸은 텍스트 커서. 캔버스 자체의
          도구별 커서는 PixelCanvas가 인라인 style로 직접 지정한다(이 규칙보다
          더 구체적인 선택자라 우선한다). */}
      <style>{`
        .pam-editor { cursor: ${CURSOR_NORMAL}; }
        .pam-editor button:not(:disabled) { cursor: ${CURSOR_POINTING}; }
        .pam-editor input[type="text"],
        .pam-editor input:not([type]),
        .pam-editor input[type="number"],
        .pam-editor textarea { cursor: ${CURSOR_TEXT}; }
        /* input[type=file]은 브라우저 UA 스타일시트가 cursor:default를 직접
           박아둬서 상속만으로는 안 먹는다 — 요소 자체와, 실제 클릭 대상인
           "파일 선택" 버튼 pseudo-element(표준/webkit 별칭 둘 다) 모두에
           명시적으로 지정해야 한다. */
        .pam-editor input[type="file"] { cursor: ${CURSOR_POINTING}; }
        .pam-editor input[type="file"]::file-selector-button,
        .pam-editor input[type="file"]::-webkit-file-upload-button {
          cursor: ${CURSOR_POINTING};
        }
        /* range·checkbox·select도 file input과 같은 이유로 UA 스타일시트가
           cursor:default를 직접 박아둔다 — range는 트랙 자체와 실제로 잡고
           끄는 thumb이 서로 다른 pseudo-element라 둘 다 지정해야 한다. */
        .pam-editor input[type="range"],
        .pam-editor input[type="checkbox"],
        .pam-editor select { cursor: ${CURSOR_POINTING}; }
        .pam-editor input[type="range"]::-webkit-slider-thumb,
        .pam-editor input[type="range"]::-webkit-slider-runnable-track,
        .pam-editor input[type="range"]::-moz-range-thumb,
        .pam-editor input[type="range"]::-moz-range-track {
          cursor: ${CURSOR_POINTING};
        }
        /* 비활성(:disabled) 폼 요소는 브라우저가 cursor CSS를 아예 무시하고
           항상 기본 화살표를 그린다 — pointer-events를 꺼서 호버 자체를
           부모로 흘려보내야 부모의 커스텀 커서가 그대로 보인다. button 외에
           input·select 등 다른 폼 요소가 나중에 disabled로 추가돼도 이
           규칙 하나로 그대로 커버된다. */
        .pam-editor :disabled { pointer-events: none; cursor: ${CURSOR_NORMAL}; }
      `}</style>
      {/* 제목표시줄 — 메뉴 바·캔버스 영역의 무채색 배경과 구분되도록 바이올렛 톤을 준다. */}
      <div className="flex items-center gap-2 bg-violet-100 px-3 py-2">
        {activeTabIndex >= 0 ? (
          <input
            value={isWallpaper ? WALLPAPER_NAME : name}
            readOnly={isWallpaper}
            onChange={(e) => {
              if (isWallpaper) return;
              setName(e.target.value);
              setHasMetaEdits(true);
            }}
            className="flex-1 select-text bg-transparent text-sm font-semibold text-gray-900 outline-none"
            style={isWallpaper ? { cursor: CURSOR_NORMAL } : undefined}
          />
        ) : (
          <span className="flex-1 text-sm font-semibold text-gray-400">
            편집기
          </span>
        )}
        {saveError && (
          <span className="text-[10px] font-semibold text-red-500">
            저장 실패
          </span>
        )}
        {!saveError && showSavedNotice && (
          <span className="text-[10px] font-semibold text-green-600">
            자동 저장됨
          </span>
        )}
        {activeTabIndex >= 0 && (
          <button
            onClick={handleSave}
            title="저장"
            className="flex h-6 w-6 items-center justify-center bg-violet-500 text-white hover:bg-violet-600"
          >
            <Save className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={handleExitClick}
          title="닫기"
          className="flex h-6 w-6 items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* "JSON 불러오기" 메뉴 항목이 대신 클릭시키는, 화면에 보이지 않는
          파일 선택창 — 같은 파일을 다시 골라도 onChange가 또 fire되도록
          매번 값을 비운다. */}
      <input
        ref={jsonFileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImportJSONFile(file);
          e.target.value = "";
        }}
      />

      {/* 메뉴 바 */}
      <div className="flex items-center gap-0.5 bg-white px-2 py-1 shadow-sm">
        <button
          onClick={openFileMenu}
          className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
        >
          파일
        </button>
        <button
          onClick={openEditMenu}
          className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
        >
          편집
        </button>
        <button
          onClick={() => setShowHelpDialog(true)}
          className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
        >
          도움말
        </button>
        <button
          onClick={openReferenceWindow}
          title="참고 이미지 창을 새로 엽니다. 여러 개를 동시에 띄울 수 있습니다(저장되지 않음)"
          className={`px-2 py-1 text-xs ${
            referenceWindows.length > 0
              ? "bg-violet-50 text-violet-700"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          레퍼런스
        </button>
      </div>

      {/* 탭 바 — 클립스튜디오처럼 여러 파일을 동시에 열어두고 전환한다 */}
      {tabs.length > 0 && (
        <div className="flex items-center gap-0.5 overflow-x-auto bg-gray-50 px-2 py-1 shadow-sm">
          {tabs.map((tab, i) => (
            <div
              key={tab.doc.id}
              onClick={() => switchToTab(i)}
              className={`group flex shrink-0 items-center gap-1.5 px-2.5 py-1 text-xs ${
                i === activeTabIndex
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
              style={{ cursor: CURSOR_POINTING }}
            >
              <span className="max-w-[100px] truncate">
                {i === activeTabIndex ? name : tab.doc.name}
              </span>
              {/* 클립스튜디오처럼: 저장되지 않은 변경이 있으면 닫기(X) 대신 원형
                  점을 보여주고, 탭에 마우스를 올렸을 때만 X로 바뀌어 닫을 수 있다. */}
              {isTabDirty(i) ? (
                <span className="relative flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-gray-500 group-hover:hidden"
                    title="저장되지 않은 변경 사항"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      requestCloseTab(i);
                    }}
                    className="hidden h-3.5 w-3.5 items-center justify-center text-gray-400 hover:text-gray-900 group-hover:flex"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    requestCloseTab(i);
                  }}
                  className="flex h-3.5 w-3.5 shrink-0 items-center justify-center text-gray-400 hover:text-gray-900"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {menuAnchor && (
        <ContextMenu
          x={menuAnchor.x}
          y={menuAnchor.y}
          items={menuAnchor.items}
          onClose={() => setMenuAnchor(null)}
        />
      )}

      {activeTabIndex >= 0 ? (
        <>
          <DrawToolbar
            tool={tool}
            onToolChange={setTool}
            brushSize={brushSize}
            onBrushSizeChange={setBrushSize}
            filledShapes={filledShapes}
            onToggleFilledShapes={() => setFilledShapes((f) => !f)}
            shapeGradientFill={shapeGradientFill}
            onToggleShapeGradientFill={() => setShapeGradientFill((g) => !g)}
            gradientSteps={gradientSteps}
            onGradientStepsChange={setGradientSteps}
            gradientAngleDeg={gradientAngleDeg}
            onGradientAngleChange={setGradientAngleDeg}
            wandGlobal={wandGlobal}
            onToggleWandGlobal={() => setWandGlobal((g) => !g)}
            hasSelection={!!selection.mask && selection.mask.size > 0}
            onFillSelection={handleFillSelection}
            canvasBgColor={canvasBgColor}
            selectMode={selectMode}
            onSelectModeChange={setSelectMode}
            onClearSelection={() => selection.setMask(null)}
            canUndo={history.canUndo}
            canRedo={history.canRedo}
            onUndo={handleUndo}
            onRedo={handleRedo}
            showGrid={showGrid}
            onToggleGrid={() => setShowGrid((g) => !g)}
            showCrosshair={showCrosshair}
            onToggleCrosshair={() => setShowCrosshair((c) => !c)}
            onClearCanvas={handleClearCanvas}
            onFlipHorizontal={handleFlipHorizontal}
            onFlipVertical={handleFlipVertical}
            onRotate90={handleRotate90}
            secondaryPortalTarget={secondaryToolbarPortal}
            narrow={narrow}
          />
          {/* 이 줄(사이드바 두 개 + 캔버스)에는 자체 스크롤을 두지 않는다 —
              overflow-auto가 있으면 사이드바 내용이 조금만 길어져도 캔버스까지
              포함한 줄 전체가 세로로 밀려 스크롤됐다(캔버스는 확대·화면맞춤을
              위한 자기 자신의 스크롤 뷰포트를 이미 갖고 있어 이중으로 스크롤이
              생기는 셈이었다). 대신 각 사이드바가 필요할 때만 자기 안에서만
              스크롤되게 한다. */}
          <div
            className={`flex flex-1 overflow-hidden ${narrow ? "gap-2 p-2" : "gap-4 p-4"}`}
            style={{ backgroundColor: canvasBgColor }}
          >
            <div
              className={`flex w-56 shrink-0 flex-col overflow-y-auto ${narrow ? "gap-2" : "gap-3"}`}
            >
              <ColorWheel
                favorites={doc.palette}
                activeColorHex={activeColorHex}
                secondaryColorHex={secondaryColorHex}
                onChangeActiveColor={setActiveColorHex}
                onChangeSecondaryColor={setSecondaryColorHex}
                onAddFavorite={handleAddFavorite}
                onRemoveFavorite={handleRemoveFavorite}
                onEditFavorite={handleEditFavorite}
                onReplaceFavorites={handleReplaceFavorites}
                tool={tool}
                onToolChange={setTool}
                canvasBgColor={canvasBgColor}
                onChangeCanvasBgColor={setCanvasBgColor}
              />
            </div>
            <div className="relative flex flex-1 flex-col overflow-hidden">
              <div className="relative flex flex-1 overflow-hidden">
                <div
                  ref={canvasViewportRef}
                  // items-center/justify-center로 캔버스가 뷰포트보다 작을 때는
                  // 잘 가운데 놓이지만, 확대해 캔버스가 뷰포트보다 커지면 일반
                  // center 정렬은 넘치는 영역을 "시작 쪽"(왼쪽·위쪽)에서 스크롤로도
                  // 닿을 수 없게 잘라버린다(스크롤 위치는 0인데 실제로는 이미
                  // 가운데 어딘가를 보여주는 flex의 알려진 동작) — 그래서 확대
                  // 직후 캔버스 왼쪽·위쪽이 보이지 않았다. safe center는 내용이
                  // 넘칠 때만 자동으로 시작 정렬로 바뀌어 스크롤로 전체 영역에
                  // 닿을 수 있게 한다(들어갈 때는 그대로 가운데 정렬 유지).
                  className="flex flex-1 overflow-auto [align-items:safe_center] [justify-content:safe_center]"
                >
                  <PixelCanvas
                    width={doc.width}
                    height={doc.height}
                    pixels={history.present}
                    belowComposite={belowComposite}
                    aboveLayers={aboveLayers}
                    activeLayerOpacity={
                      activeLayer.visible ? activeLayer.opacity : 0
                    }
                    activeLayerLocked={activeLayer.locked || isPlaying}
                    activeLayerBlendMode={
                      layerMode === "frames"
                        ? "normal"
                        : (activeLayer.blendMode ?? "normal")
                    }
                    activeLayerAdjustments={
                      layerMode === "frames" ? {} : activeLayer
                    }
                    scopeBelowComposite={scopeBelowComposite}
                    scopeAboveLayers={scopeAboveLayers}
                    activeLayerInScope={activeLayerInScope}
                    tool={tool}
                    onToolChange={setTool}
                    activeColorHex={activeColorHex}
                    selectionMask={selection.mask}
                    selectMode={selectMode}
                    showGrid={showGrid}
                    showCrosshair={showCrosshair}
                    brushSize={brushSize}
                    filledShapes={filledShapes}
                    onSelectionChange={selection.setMask}
                    onStrokeEnd={handleStrokeEnd}
                    onPickColor={handlePickColor}
                    onTextToolClick={handleTextToolClick}
                    pendingText={
                      pendingText
                        ? { ...pendingText, colorHex: activeColorHex }
                        : null
                    }
                    onPendingTextChange={handlePendingTextChange}
                    onPendingTextMove={handlePendingTextMove}
                    onPendingTextToggleAA={handlePendingTextToggleAA}
                    onPendingTextToggleGradient={handlePendingTextToggleGradient}
                    onPendingTextSetAlign={handlePendingTextSetAlign}
                    onPendingTextRotate={handlePendingTextRotate}
                    onPendingTextCommit={handlePendingTextCommit}
                    onPendingTextCancel={handlePendingTextCancel}
                    onGradientToolEnd={handleGradientToolEnd}
                    shapeGradientFill={shapeGradientFill}
                    gradientStartHex={activeColorHex}
                    gradientEndHex={secondaryColorHex ?? "#00000000"}
                    gradientSteps={gradientSteps}
                    gradientAngleDeg={gradientAngleDeg}
                    onGradientStepsChange={setGradientSteps}
                    onGradientAngleChange={setGradientAngleDeg}
                    zoom={canvasZoom}
                    onZoomChange={setCanvasZoom}
                    viewportRef={canvasViewportRef}
                    wandGlobal={wandGlobal}
                    pendingImage={pendingImage}
                    onPendingImageMove={handlePendingImageMove}
                    onPendingImageResize={handlePendingImageResize}
                    onPendingImageRotate={handlePendingImageRotate}
                    onPendingImageCommit={handlePendingImageCommit}
                    onPendingImageCancel={handlePendingImageCancel}
                    pendingShape={pendingShape}
                    onShapeDragEnd={handleShapeDragEnd}
                    onPendingShapeUpdate={handlePendingShapeUpdate}
                    onPendingShapeCommit={handlePendingShapeCommit}
                    onPendingShapeCancel={handlePendingShapeCancel}
                    bottomToolbarPortalTarget={secondaryToolbarPortal}
                  />
                </div>
                {/* 캔버스를 스크롤하는 safe-center flex 컨테이너 밖(이 바깥 relative
                    래퍼)에 둔다 — 그 안에 있으면 확대되어 스크롤이 생길 때
                    align-items/justify-content:safe 조합에 따라 컨트롤 위치
                    계산이 흔들릴 수 있다. 여기서는 뷰포트 자체에 고정돼 확대·
                    스크롤과 무관하게 항상 같은 자리에 떠 있다. */}
                <div className="absolute bottom-2 left-2 flex items-center gap-0.5">
                  <button
                    onClick={() => setCanvasZoom((z) => nextZoomStep(z, -1))}
                    disabled={canvasZoom <= ZOOM_STEPS[0]}
                    title="축소"
                    className="flex h-5 w-5 items-center justify-center bg-black/70 text-white hover:bg-black/90 disabled:opacity-30"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <div className="bg-black/70 px-2 py-1 text-[10px] font-semibold text-white">
                    {canvasZoom}x
                  </div>
                  <button
                    onClick={() => setCanvasZoom((z) => nextZoomStep(z, 1))}
                    disabled={canvasZoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]}
                    title="확대"
                    className="flex h-5 w-5 items-center justify-center bg-black/70 text-white hover:bg-black/90 disabled:opacity-30"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                {/* DrawToolbar가 그리기/선택 도구의 하위 옵션을 포털로 그려 넣는
                    자리 — 캔버스 하단 중앙에 둬서 좌우 사이드바를 가리지 않는다.
                    전체 너비를 차지하는 빈 상자라 내용이 없는 양옆(배율 컨트롤
                    쪽 포함)까지 클릭을 가로챘다 — pointer-events-none으로 이
                    상자 자체는 클릭을 그대로 통과시키고, 실제로 그려 넣는
                    내용(DrawToolbar·PixelCanvas 쪽)에서만 pointer-events-auto로
                    되돌린다. */}
                <div
                  ref={setSecondaryToolbarPortal}
                  className="pointer-events-none absolute inset-x-0 bottom-2 z-30 flex justify-center px-3"
                />
              </div>
              {layerMode === "frames" && (
                <FrameFilmstrip
                  layers={history.presentLayers}
                  activeLayerId={history.activeLayerId}
                  width={doc.width}
                  height={doc.height}
                  isPlaying={isPlaying}
                  onSelect={handleSelectLayer}
                  onAdd={handleAddLayer}
                  onDuplicate={handleDuplicateLayer}
                  onDelete={handleDeleteLayer}
                  onMoveLeft={(id) => handleMoveLayer(id, -1)}
                  onMoveRight={(id) => handleMoveLayer(id, 1)}
                  onToggleVisible={handleToggleLayerVisible}
                  onDurationChange={handleFrameDurationChange}
                />
              )}
            </div>
            {(() => {
              // key={doc.id} — 탭마다 독립된 상태를 갖게 강제로 리마운트한다.
              // 키가 없으면 이 패널 하나가 모든 탭이 활성화될 때마다 재사용돼,
              // 한 탭에서 조정한 미리보기·픽셀 해상도·색상 수 등의 설정이
              // 다른 탭으로 전환해도 그대로 남아 있었다.
              const importPanel = (
                <ImportPanel
                  key={doc.id}
                  existingCanvasSize={{ width: doc.width, height: doc.height }}
                  containerRef={rootRef}
                  onConfirm={(imported) => {
                    // 지금 열려 있던(이미 그려뒀을 수 있는) 캔버스를 바로 덮어쓰지
                    // 않는다 — 텍스트 도구처럼 위치·크기를 조절할 수 있는 상태로
                    // 띄워두고, 확정해야만 실제 픽셀에 합성된다. 화면 가운데에서
                    // 시작한다(캔버스보다 크면 일부만 보여도 그대로 둔다).
                    setPendingImage({
                      x: Math.floor((doc.width - imported.width) / 2),
                      y: Math.floor((doc.height - imported.height) / 2),
                      width: imported.width,
                      height: imported.height,
                      srcWidth: imported.width,
                      srcHeight: imported.height,
                      pixels: imported.pixels,
                      rotation: 0,
                    });
                  }}
                />
              );
              // 파일 메뉴의 내보내기와 마찬가지로 라이브 레이어 값을 실어
              // 보낸다(Critical-1) — 그렇지 않으면 저장한 적 없는 새 캔버스나
              // 방금 그린 내용이 JSON 내보내기에서 조용히 빠질 수 있다.
              const exportPanel = (
                <ExportPanel
                  doc={{
                    ...doc,
                    pixels: compositePixels,
                    layers: history.presentLayers,
                    activeLayerId: history.activeLayerId,
                  }}
                />
              );

              if (!narrow) {
                return (
                  <div className="flex w-60 shrink-0 flex-col gap-3">
                    <LayerPanel
                      layers={history.presentLayers}
                      activeLayerId={history.activeLayerId}
                      width={doc.width}
                      height={doc.height}
                      onSelect={handleSelectLayer}
                      onAdd={handleAddLayer}
                      onDuplicate={handleDuplicateLayer}
                      onDelete={handleDeleteLayer}
                      onMergeDown={handleMergeDown}
                      onMoveUp={(id) => handleMoveLayer(id, 1)}
                      onMoveDown={(id) => handleMoveLayer(id, -1)}
                      onRename={handleRenameLayer}
                      onToggleVisible={handleToggleLayerVisible}
                      onToggleLocked={handleToggleLayerLocked}
                      onOpacityChange={handleLayerOpacityChange}
                      onOpacityDragEnd={handleOpacityDragEnd}
                      onBlendModeChange={handleLayerBlendModeChange}
                      onAdjustmentChange={handleLayerAdjustmentChange}
                      onAdjustmentDragEnd={handleAdjustmentDragEnd}
                      onResetAdjustments={handleResetAdjustments}
                      onFlatten={handleFlattenLayers}
                      layerScope={layerScope}
                      onToggleScope={handleToggleLayerScope}
                      onAlign={handleAlignLayers}
                      layerMode={layerMode}
                      onLayerModeChange={handleLayerModeChange}
                      isPlaying={isPlaying}
                      onTogglePlay={handleTogglePlay}
                      loopPlayback={loopPlayback}
                      onToggleLoop={handleToggleLoop}
                      onionSkin={onionSkin}
                      onToggleOnionSkin={handleToggleOnionSkin}
                    />
                    <Accordion title="이미지 불러오기" defaultOpen={false}>
                      {importPanel}
                    </Accordion>
                    <Accordion title="내보내기" defaultOpen={false}>
                      {exportPanel}
                    </Accordion>
                  </div>
                );
              }

              // 편집기가 좁아지면 w-60짜리 사이드바가 캔버스 자리를 너무 많이
              // 차지해 보여, 아이콘 세 개짜리 얇은 열로 줄이고 실제 내용은
              // 누른 아이콘 쪽에서만 캔버스 위로 뜨는 플로팅 팝업으로 보여준다.
              const panelTitle =
                openFloatingPanel === "layers"
                  ? "레이어"
                  : openFloatingPanel === "import"
                    ? "이미지 불러오기"
                    : "내보내기";
              const layerPanel = (
                <LayerPanel
                  layers={history.presentLayers}
                  activeLayerId={history.activeLayerId}
                  width={doc.width}
                  height={doc.height}
                  onSelect={handleSelectLayer}
                  onAdd={handleAddLayer}
                  onDuplicate={handleDuplicateLayer}
                  onDelete={handleDeleteLayer}
                  onMergeDown={handleMergeDown}
                  onMoveUp={(id) => handleMoveLayer(id, 1)}
                  onMoveDown={(id) => handleMoveLayer(id, -1)}
                  onRename={handleRenameLayer}
                  onToggleVisible={handleToggleLayerVisible}
                  onToggleLocked={handleToggleLayerLocked}
                  onOpacityChange={handleLayerOpacityChange}
                  onOpacityDragEnd={handleOpacityDragEnd}
                  onBlendModeChange={handleLayerBlendModeChange}
                  onAdjustmentChange={handleLayerAdjustmentChange}
                  onAdjustmentDragEnd={handleAdjustmentDragEnd}
                  onResetAdjustments={handleResetAdjustments}
                  onFlatten={handleFlattenLayers}
                  layerScope={layerScope}
                  onToggleScope={handleToggleLayerScope}
                  onAlign={handleAlignLayers}
                  layerMode={layerMode}
                  onLayerModeChange={handleLayerModeChange}
                  isPlaying={isPlaying}
                  onTogglePlay={handleTogglePlay}
                  loopPlayback={loopPlayback}
                  onToggleLoop={handleToggleLoop}
                  onionSkin={onionSkin}
                  onToggleOnionSkin={handleToggleOnionSkin}
                />
              );
              return (
                <div className="relative flex w-10 shrink-0 flex-col items-center gap-2">
                  <button
                    onClick={() =>
                      setOpenFloatingPanel((p) =>
                        p === "layers" ? null : "layers",
                      )
                    }
                    title="레이어"
                    className={`flex h-8 w-8 items-center justify-center transition-colors ${
                      openFloatingPanel === "layers"
                        ? "bg-violet-500 text-white"
                        : "bg-white text-gray-500 shadow-md hover:bg-gray-50"
                    }`}
                  >
                    <LayersIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() =>
                      setOpenFloatingPanel((p) =>
                        p === "import" ? null : "import",
                      )
                    }
                    title="이미지 불러오기"
                    className={`flex h-8 w-8 items-center justify-center transition-colors ${
                      openFloatingPanel === "import"
                        ? "bg-violet-500 text-white"
                        : "bg-white text-gray-500 shadow-md hover:bg-gray-50"
                    }`}
                  >
                    <ImagePlus className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() =>
                      setOpenFloatingPanel((p) =>
                        p === "export" ? null : "export",
                      )
                    }
                    title="내보내기"
                    className={`flex h-8 w-8 items-center justify-center transition-colors ${
                      openFloatingPanel === "export"
                        ? "bg-violet-500 text-white"
                        : "bg-white text-gray-500 shadow-md hover:bg-gray-50"
                    }`}
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  {openFloatingPanel && (
                    <div className="absolute top-0 right-full z-40 mr-2 flex max-h-full w-72 flex-col bg-white shadow-xl">
                      <div className="flex shrink-0 items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500">
                        {panelTitle}
                        <button
                          onClick={() => setOpenFloatingPanel(null)}
                          title="닫기"
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="flex min-h-0 flex-col gap-3 overflow-y-auto p-3 pt-0">
                        {openFloatingPanel === "layers"
                          ? layerPanel
                          : openFloatingPanel === "import"
                            ? importPanel
                            : exportPanel}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-1 text-center">
          <p className="text-sm text-gray-400">열린 파일이 없습니다</p>
          <p className="text-xs text-gray-300">
            <button
              onClick={() => setShowNewCanvasDialog(true)}
              className="text-violet-400 underline underline-offset-2 hover:text-violet-500"
            >
              새로 만들기
            </button>
            {" 또는 "}
            <button
              onClick={() => setShowOpenDialog(true)}
              className="text-violet-400 underline underline-offset-2 hover:text-violet-500"
            >
              열기
            </button>
            를 선택하세요
          </p>
        </div>
      )}

      {showNewCanvasDialog && (
        <NewCanvasDialog
          onSelect={handleCreate}
          onImportImage={(imported) => {
            const needsCrop =
              imported.canvasWidth !== imported.width ||
              imported.canvasHeight !== imported.height;
            if (!needsCrop) {
              openNewTab({
                id: uid(),
                name: imported.name,
                width: imported.width,
                height: imported.height,
                palette: imported.palette,
                pixels: imported.pixels,
                createdAt: Date.now(),
              });
            } else {
              // 원본 해상도가 고른 캔버스보다 커서 리샘플 없이 넘어온 경우 —
              // 캔버스는 목표 크기로 비워 열고, 원본 해상도 그대로 pendingImage로
              // 띄워 위치를 잡게 한다. 확정(handlePendingImageCommit)하는 순간
              // 캔버스 밖으로 나간 부분만 잘려나가고 안쪽은 리샘플 없이 그대로
              // 반영된다 — 기존 캔버스에 다시 불러오기와 같은 방식이다.
              openNewTab({
                id: uid(),
                name: imported.name,
                width: imported.canvasWidth,
                height: imported.canvasHeight,
                palette: imported.palette,
                pixels: new Array<PixelValue>(
                  imported.canvasWidth * imported.canvasHeight,
                ).fill(null),
                createdAt: Date.now(),
              });
              setPendingImage({
                x: Math.floor((imported.canvasWidth - imported.width) / 2),
                y: Math.floor((imported.canvasHeight - imported.height) / 2),
                width: imported.width,
                height: imported.height,
                srcWidth: imported.width,
                srcHeight: imported.height,
                pixels: imported.pixels,
                rotation: 0,
              });
            }
            setShowNewCanvasDialog(false);
          }}
          onCancel={() => setShowNewCanvasDialog(false)}
          containerRef={rootRef}
        />
      )}

      {showOpenDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="flex max-h-96 w-80 flex-col bg-white p-4 shadow-xl">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">열기</h2>
            {listPixelArt().length === 0 ? (
              <p className="text-xs text-gray-400">저장된 작품이 없습니다.</p>
            ) : (
              <div className="flex flex-col gap-1 overflow-auto">
                {listPixelArt().map((art) => (
                  <button
                    key={art.id}
                    onClick={() => handleOpenExisting(art)}
                    className="flex items-center gap-2 bg-gray-50 px-2 py-2 text-left text-sm text-gray-700 hover:bg-violet-50"
                  >
                    <FileThumbnail
                      width={art.width}
                      height={art.height}
                      pixels={art.pixels}
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {art.name}{" "}
                      <span className="text-gray-400">
                        ({art.width}×{art.height})
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setShowOpenDialog(false)}
              className="mt-3 w-full py-2 text-xs text-gray-400 hover:text-gray-900"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {showHelpDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          {/* 헤더와 하단 액션(닫기)은 고정하고, 그 사이 본문(단축키 목록)만
              스크롤한다 — 모달 전체가 overflow-y-auto면 내용이 길어질 때
              헤더는 물론 닫기 버튼까지 스크롤해야 보이게 된다(NewCanvasDialog와
              같은 구조). */}
          <div className="flex max-h-[80%] w-80 flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between p-4 pb-3">
              <h2 className="text-sm font-semibold text-gray-900">단축키</h2>
              {/* 실행 중인 기기와 무관하게 Windows/Mac 표기를 직접 전환해 볼 수
                  있다 — 지금 이 기기가 어느 쪽이든 다른 쪽 표기도 바로 확인할
                  수 있게 한다. */}
              <div className="flex text-[10px]">
                <button
                  onClick={() => setHelpPlatform("windows")}
                  className={`px-2 py-1 ${
                    helpPlatform === "windows"
                      ? "bg-violet-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Windows
                </button>
                <button
                  onClick={() => setHelpPlatform("mac")}
                  className={`px-2 py-1 ${
                    helpPlatform === "mac"
                      ? "bg-violet-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Mac
                </button>
              </div>
            </div>
            <div className="overflow-y-auto px-4 pb-3">
              <div className="flex flex-col gap-3 text-xs text-gray-600">
                {[
                  {
                    label: "도구",
                    note: "조합 없이 키 하나만 누르면 된다(다른 프로그램 실행 중이 아니라 이 편집창에 포커스가 있을 때)",
                    rows: [
                      ["B / E / G", "펜슬 / 지우개 / 채우기"],
                      ["U / R / O", "직선 / 사각형 / 원"],
                      ["T / D", "텍스트 / 그라데이션"],
                      ["M / L / V / W", "선택 / 올가미 / 이동 / 자동 선택"],
                      ["I", "스포이트"],
                    ],
                  },
                  {
                    label: "그리기",
                    rows: [
                      ["1 / 2 / 3 / 4", "브러시 크기"],
                      ["[ / ]", "90도 반시계 / 시계 회전"],
                      ["Shift+H / Shift+V", "좌우 / 상하 반전"],
                    ],
                  },
                  {
                    label: "보기",
                    rows: [
                      ["Shift+G", "격자 표시 전환"],
                      ["+ / -", "확대 / 축소"],
                    ],
                  },
                  {
                    label: "선택",
                    rows: [
                      ["Shift+드래그", "선택 영역에 추가"],
                      ["Alt+드래그", "선택 영역에서 제외"],
                      [`Alt+Backspace`, "선택 영역을 활성 색상으로 채우기"],
                      [
                        "Esc",
                        "선택 해제(불러온 이미지가 떠 있으면 그것부터 취소)",
                      ],
                    ],
                  },
                  {
                    label: "편집",
                    rows: [
                      [`${helpMod}Z`, "실행취소"],
                      [`${helpMod}Y / ${helpMod}Shift+Z`, "다시실행"],
                      [`${helpMod}C / ${helpMod}V`, "복사 / 붙여넣기"],
                      [`${helpMod}S`, "저장"],
                      [`${helpMod}Shift+S`, "다른 이름으로 저장"],
                      ["Enter", "불러온 이미지 확정(떠 있을 때만)"],
                    ],
                  },
                ].map((group) => (
                  <div key={group.label} className="flex flex-col gap-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                      {group.label}
                    </p>
                    {group.note && (
                      <p className="text-[10px] text-gray-400">{group.note}</p>
                    )}
                    {group.rows.map(([key, desc]) => (
                      <div key={key} className="flex items-baseline gap-2">
                        <span className="w-28 shrink-0 font-mono text-[11px] text-gray-900">
                          {key}
                        </span>
                        <span className="min-w-0">{desc}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 pt-0">
              <button
                onClick={() => setShowHelpDialog(false)}
                className="w-full py-2 text-xs text-gray-400 hover:text-gray-900"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {resizingCanvas && (
        <ResizeCanvasDialog
          width={doc.width}
          height={doc.height}
          // 배경화면은 데스크탑 전체를 채우는 용도라(WallpaperBackground의
          // object-cover), 가로세로 비율이 크게 바뀌면 화면에 보이는 부분이
          // 의도와 달라진다 — 해상도는 바꿀 수 있게 허용하되 비율만 고정한다.
          lockAspectRatio={isWallpaper}
          onConfirm={handleResizeCanvas}
          onCancel={() => setResizingCanvas(false)}
        />
      )}

      {/* 탭을 닫을 때 저장되지 않은 변경이 있으면 저장/저장 안 함/취소를 묻는다
          (클립스튜디오처럼). ConfirmDialog는 버튼이 2개뿐이라 여기서는 직접 만든다. */}
      {pendingCloseTabIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-72 bg-white p-4 shadow-xl">
            <p className="mb-4 text-sm text-gray-900">
              &ldquo;
              {pendingCloseTabIndex === activeTabIndex
                ? name
                : tabs[pendingCloseTabIndex]?.doc.name}
              &rdquo;에 저장되지 않은 변경 사항이 있습니다. 저장할까요?
            </p>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={handleCloseSave}
                className="bg-violet-500 py-2 text-xs font-semibold text-white hover:bg-violet-600"
              >
                저장
              </button>
              <button
                onClick={handleCloseDiscard}
                className="bg-gray-100 py-2 text-xs text-gray-700 hover:bg-gray-200"
              >
                저장 안 함
              </button>
              <button
                onClick={() => setPendingCloseTabIndex(null)}
                className="py-2 text-xs text-gray-400 hover:text-gray-900"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 편집창 전체를 닫을 때도(제목표시줄 X) 열린 탭 중 저장되지 않은 게 있으면
          한 번 더 확인한다. */}
      {pendingExit && (
        <ConfirmDialog
          message="저장되지 않은 변경 사항이 있습니다. 닫으시겠습니까?"
          onConfirm={() => {
            setPendingExit(false);
            onExit();
          }}
          onCancel={() => setPendingExit(false)}
        />
      )}

      <AlertModal
        open={alertMessage !== null}
        message={alertMessage ?? ""}
        onClose={() => setAlertMessage(null)}
      />

      <PromptModal
        open={saveAsPromptOpen}
        title="다른 이름으로 저장"
        defaultValue={isWallpaper ? WALLPAPER_NAME : name}
        onConfirm={handleConfirmSaveAs}
        onCancel={() => setSaveAsPromptOpen(false)}
      />

      {referenceWindows.map((w) => (
        <ReferenceWindow
          key={w.id}
          boundsRef={rootRef}
          eyedropperActive={tool === "eyedropper"}
          onPickColor={handlePickColor}
          onClose={() => closeReferenceWindow(w.id)}
          zIndex={w.zIndex}
          spawnIndex={w.spawnIndex}
          onFocus={() => bringReferenceWindowToFront(w.id)}
        />
      ))}
    </div>
  );
}

// getPixel은 다른 태스크(Import 미리보기)에서 재사용하기 위해 re-export
export { getPixel };
