"use client";

import { ChevronRight } from "lucide-react";
import {
  forwardRef,
  RefObject,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { CURSOR_NORMAL } from "./cursors";
import { HELP } from "./helpTexts";
import HelpTip from "./HelpTip";
import PaletteModal from "./PaletteModal";
import {
  dedupePalette,
  mergeManyColors,
  pixelateImage,
  quantizeMedianCut,
  resamplePixelGrid,
} from "./pixelate";
import { PixelValue } from "./pixelGrid";
import Switch from "./Switch";
import { MAX_CANVAS_SIZE } from "./types";

// 팔레트 밀도 칩의 정거장 — 2의 배수 계열에서 colorCap 미만인 값 + 마지막에
// colorCap(전체)을 붙인다. 사진(colorCap≈256)이면 2·4·8·16·32·전체, 단순한
// 그림이면 그보다 짧아진다. 정거장이 하나뿐이면(색이 아주 적은 그림) 밀도
// 조절이 의미 없어 호출부에서 이 행 자체를 숨긴다.
const DENSITY_BASE = [2, 4, 8, 16, 32];
function densityStops(cap: number): number[] {
  const stops = DENSITY_BASE.filter((n) => n < cap);
  if (stops[stops.length - 1] !== cap) stops.push(cap);
  return stops;
}

// 색 추출·합치기는 내부적으로 인덱스 팔레트를 쓴다 — onConfirm 경계에서만 각
// 픽셀에 실제 hex 색을 직접 넣은 트루컬러로 변환해 넘긴다.
type Preview = {
  width: number;
  height: number;
  palette: string[];
  pixels: number[];
};

function toTrueColor(pixels: number[], palette: string[]): PixelValue[] {
  return pixels.map((idx) => (idx < 0 ? null : (palette[idx] ?? null)));
}

// 미리보기 캔버스가 화면에 표시되는 최대 크기(정사각형 안에 맞춤, 가로세로
// 비율은 유지) — 실제 캔버스 픽셀 수(preview.width/height)와는 별개다.
const PREVIEW_DISPLAY_MAX = 160;

// 색 수 슬라이더의 실용적 상한 — 이 위로는 픽셀아트로서 의미가 옅고 조작감도
// 떨어진다. 사진에 실제 색이 이보다 많아도 여기서 자른다.
const MAX_REPRESENTATIVE_COLORS = 256;

// NewCanvasDialog처럼 확인 버튼을 스크롤 영역 밖(고정 하단 바)에 따로 두는
// 화면에서, 그 바깥 버튼이 이 패널의 "가져오기"를 대신 트리거할 수 있게 하는
// 손잡이. ref로 받는다.
export type ImportPanelHandle = {
  confirm: () => void;
};

type ImportPanelProps = {
  // width/height는 항상 실제 pixels 배열의 해상도(원본 그대로일 수도, 캔버스
  // 규격으로 리샘플됐을 수도 있음)다. canvasWidth/canvasHeight는 최종적으로
  // 담길 캔버스 크기 — 원본이 그 캔버스보다 크면(잘라야 하는 경우) 리샘플로
  // 축소하지 않고 width/height를 원본 그대로 둔 채 canvasWidth/canvasHeight만
  // 더 작게 넘긴다. 소비하는 쪽은 이 둘이 다르면 "리샘플 없이 배치 후 캔버스
  // 밖을 잘라내야 한다"는 뜻으로 받아들여야 한다(Editor.tsx의 pendingImage와
  // 같은 방식).
  onConfirm: (doc: {
    width: number;
    height: number;
    canvasWidth: number;
    canvasHeight: number;
    palette: string[];
    pixels: PixelValue[];
  }) => void;
  // 이미 만들어진 캔버스에 이미지를 불러오는 맥락(편집기 사이드바)이면 넘겨준다
  // — 이미지 import가 기존 캔버스 크기를 바꾸는 건 자연스럽지 않으므로 "캔버스
  // 크기" 설정 자체를 숨기고, 해상도가 이 크기를 넘으면 경고만 보여준다.
  existingCanvasSize?: { width: number; height: number };
  // NewCanvasDialog는 확인 버튼을 자기 하단 고정 바에 "생성"이라는 이름으로
  // 따로 두므로(빈 캔버스 모드와 나란히), 이 패널 안의 "가져오기" 버튼은
  // 감춘다. Editor 사이드바에서는 그대로 보여준다(생략 시 기본 표시).
  hideConfirmButton?: boolean;
  // 확인할 이미지가 준비됐는지(미리보기가 있는지)를 부모에게 알린다 —
  // 바깥 "생성" 버튼의 비활성 상태를 결정할 때 쓴다.
  onReadyChange?: (ready: boolean) => void;
  // 편집창 루트(확대/축소 transform이 걸린 그 요소) — 팔레트 모달의 컬러
  // 편집 팝오버를 이 루트 기준 상대좌표로 앵커링하는 데 쓴다(ContextMenu가
  // 이미 쓰는 방식과 동일, Editor.tsx의 rootRef 참고).
  containerRef?: RefObject<HTMLDivElement | null>;
};

const ImportPanel = forwardRef<ImportPanelHandle, ImportPanelProps>(
  function ImportPanel(
    { onConfirm, existingCanvasSize, hideConfirmButton, onReadyChange, containerRef },
    ref,
  ) {
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [pixelSize, setPixelSize] = useState(32);
  const [antiAlias, setAntiAlias] = useState(false);
  const [maxColors, setMaxColors] = useState(8);
  // 지금 해상도·안티에일리어싱 조합에서 실제로 뽑히는 서로 다른 색 수 — 색 수
  // 슬라이더의 상한. 이 값을 넘겨 요청해도 median cut이 더 나눌 색이 없다.
  const [availableColors, setAvailableColors] = useState(
    MAX_REPRESENTATIVE_COLORS,
  );
  // null = 캔버스 크기를 이미지 해상도와 동일하게 쓴다("이미지와 동일" 스위치
  // 켬). 값이 있으면 그 크기로 배치한다(스위치를 꺼 직접 입력한 상태).
  const [canvasPreset, setCanvasPreset] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [imageEl, setImageEl] = useState<HTMLImageElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [paletteModalOpen, setPaletteModalOpen] = useState(false);
  // 컬러 편집 세션(드래그) 시작 시점의 preview 스냅샷 — "적용" 없이 세션이
  // 끝나면(다른 스와치 선택·모달 닫기 등) 이걸로 되돌린다. 세션 하나만
  // 담으면 되므로(적용하면 그대로 비움) 스택이 아니라 슬롯 하나로 충분하다.
  const recolorSnapshotRef = useRef<Preview | null>(null);
  // 병합 선택 세션(2개 이상 고른 상태) 시작 시점의 스냅샷 — 매번 이 스냅샷
  // 기준으로 다시 계산해 반영한다(누적하지 않는다). 그래야 선택을 더하거나
  // 빼도 "지금 고른 조합으로 합치면"이 정확히 다시 계산된다.
  const mergeSnapshotRef = useRef<Preview | null>(null);

  const runPixelate = useCallback(
    (img: HTMLImageElement, size: number, aa: boolean, colors: number) => {
      // 원본 비율을 유지한 채 긴 변이 size가 되도록 격자 크기를 정한다
      // (정사각형으로 찌그러뜨리지 않는다).
      const iw = img.naturalWidth || 1;
      const ih = img.naturalHeight || 1;
      const w = iw >= ih ? size : Math.max(1, Math.round((size * iw) / ih));
      const h = ih >= iw ? size : Math.max(1, Math.round((size * ih) / iw));
      const raw = pixelateImage(img, w, h, aa);
      setAvailableColors(raw.palette.length);
      const quantized = quantizeMedianCut(raw.palette, raw.pixels, colors);
      setPreview({
        width: raw.width,
        height: raw.height,
        palette: quantized.palette,
        pixels: quantized.pixels,
      });
      setPaletteModalOpen(false);
    },
    [],
  );

  const handleFile = useCallback(
    (file: File) => {
      const img = new Image();
      img.onload = () => {
        setImageEl(img);
        runPixelate(img, pixelSize, antiAlias, maxColors);
      };
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;
      img.src = url;
    },
    [pixelSize, antiAlias, maxColors, runPixelate],
  );

  // 클립보드에 복사된 이미지(스크린샷 등)를 바로 가져온다. Clipboard API
  // 미지원/권한 거부 환경에서는 조용히 무시한다(토스트 UI가 없는 앱이라 새 알림
  // 체계를 따로 만들지 않는다 — 사용자는 파일 선택으로 대신 진행할 수 있다).
  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith("image/"));
        if (!imageType) continue;
        const blob = await item.getType(imageType);
        handleFile(new File([blob], "clipboard-image", { type: imageType }));
        return;
      }
    } catch {
      // 클립보드 접근 실패 — 무시
    }
  }, [handleFile]);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith("image/")) handleFile(file);
    },
    [handleFile],
  );

  const handleOptionChange = useCallback(
    (size: number, aa: boolean, colors: number) => {
      setPixelSize(size);
      setAntiAlias(aa);
      setMaxColors(colors);
      if (imageEl) runPixelate(imageEl, size, aa, colors);
    },
    [imageEl, runPixelate],
  );

  // 병합 선택(2개 이상)이 바뀔 때마다 불린다 — 매번 세션 시작 시점 스냅샷을
  // 기준으로 다시 계산해 반영한다("지금 고른 조합으로 합치면" 미리보기).
  // 이미 반영된 이전 미리보기 위에 누적하면 여러 번 합쳐지므로, 항상
  // 스냅샷에서 새로 계산한다.
  const handlePaletteMergePreview = useCallback(
    (target: number, sources: number[]) => {
      const base = mergeSnapshotRef.current;
      if (!base) return;
      const merged = mergeManyColors(base.palette, base.pixels, target, sources);
      setPreview({ ...base, palette: merged.palette, pixels: merged.pixels });
    },
    [],
  );

  // 병합 미리보기 세션 시작 — 선택이 2개 미만에서 2개 이상으로 바뀌는
  // 첫 순간 한 번 불려 그 시점의 preview를 스냅샷으로 남긴다.
  const handlePaletteMergeStart = useCallback(() => {
    mergeSnapshotRef.current = preview;
  }, [preview]);

  // "n개 합치기" 확정 — 지금 상태(이미 미리보기로 반영돼 있음)를 그대로
  // 확정하고 스냅샷을 비운다.
  const handlePaletteMergeApply = useCallback(() => {
    mergeSnapshotRef.current = null;
  }, []);

  // 확정 없이 세션이 끝나면(선택을 2개 미만으로 줄임·모드 전환·모달 닫기
  // 등) 스냅샷으로 되돌린다.
  const handlePaletteMergeCancel = useCallback(() => {
    if (mergeSnapshotRef.current) {
      setPreview(mergeSnapshotRef.current);
      mergeSnapshotRef.current = null;
    }
  }, []);

  // 팔레트 색 하나만 갈아 끼운다 — 그 색이 쓰인 픽셀이 다시 계산할 것 없이
  // 그대로 새 색으로 바뀐다. 그 결과 다른 색과 완전히 같아지면 자동으로 합친다.
  // 색상환 드래그 중 매 틱마다 불려 그림 전체 미리보기에 바로 반영된다.
  const handlePaletteRecolor = useCallback(
    (index: number, hex: string) => {
      if (!preview) return;
      const nextPalette = preview.palette.map((c, i) =>
        i === index ? hex : c,
      );
      const deduped = dedupePalette(nextPalette, preview.pixels);
      setPreview({
        ...preview,
        palette: deduped.palette,
        pixels: deduped.pixels,
      });
    },
    [preview],
  );

  // 컬러 편집 세션 시작 — 드래그로 바꾸기 전의 상태를 스냅샷으로 남긴다.
  const handlePaletteRecolorStart = useCallback(() => {
    recolorSnapshotRef.current = preview;
  }, [preview]);

  // "적용" — 지금 상태(이미 매 틱마다 반영돼 있음)를 그대로 확정하고
  // 스냅샷을 비운다.
  const handlePaletteRecolorApply = useCallback(() => {
    recolorSnapshotRef.current = null;
  }, []);

  // 적용하지 않고 세션이 끝나면(다른 스와치 선택·모달 닫기 등) 스냅샷으로
  // 되돌린다.
  const handlePaletteRecolorCancel = useCallback(() => {
    if (recolorSnapshotRef.current) {
      setPreview(recolorSnapshotRef.current);
      recolorSnapshotRef.current = null;
    }
  }, []);

  // 슬라이더를 조정할 때마다 preview가 바뀌므로, 실제로 어떤 픽셀아트가 나올지
  // 결과를 직접 그려서 보여준다.
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !preview) return;
    canvas.width = preview.width;
    canvas.height = preview.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, preview.width, preview.height);
    for (let y = 0; y < preview.height; y++) {
      for (let x = 0; x < preview.width; x++) {
        const colorIndex = preview.pixels[y * preview.width + x];
        if (colorIndex < 0) continue;
        ctx.fillStyle = preview.palette[colorIndex] ?? "#ff00ff";
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }, [preview]);

  const handleConfirm = useCallback(() => {
    if (!preview) return;
    if (
      !canvasPreset ||
      (canvasPreset.width === preview.width &&
        canvasPreset.height === preview.height)
    ) {
      onConfirm({
        width: preview.width,
        height: preview.height,
        canvasWidth: preview.width,
        canvasHeight: preview.height,
        palette: preview.palette,
        pixels: toTrueColor(preview.pixels, preview.palette),
      });
      return;
    }
    // 원본이 고른 캔버스보다 크면(적어도 한 축이라도) 리샘플로 축소하지
    // 않는다 — 원본 해상도 그대로 넘겨, 소비하는 쪽이 캔버스 위에 배치한 뒤
    // 위치를 확정하는 순간 캔버스 밖으로 나간 부분만 잘라내게 한다.
    if (
      preview.width > canvasPreset.width ||
      preview.height > canvasPreset.height
    ) {
      onConfirm({
        width: preview.width,
        height: preview.height,
        canvasWidth: canvasPreset.width,
        canvasHeight: canvasPreset.height,
        palette: preview.palette,
        pixels: toTrueColor(preview.pixels, preview.palette),
      });
      return;
    }
    // 캔버스가 원본보다 크면(업스케일) 그 규격을 그대로 채운다.
    const pixels = resamplePixelGrid(
      preview.pixels,
      preview.width,
      preview.height,
      canvasPreset.width,
      canvasPreset.height,
    );
    onConfirm({
      width: canvasPreset.width,
      height: canvasPreset.height,
      canvasWidth: canvasPreset.width,
      canvasHeight: canvasPreset.height,
      palette: preview.palette,
      pixels: toTrueColor(pixels, preview.palette),
    });
  }, [preview, canvasPreset, onConfirm]);

  useImperativeHandle(ref, () => ({ confirm: handleConfirm }), [
    handleConfirm,
  ]);

  // 미리보기가 생기고 사라질 때만 부모에 알린다 — 바깥 "생성" 버튼이 이
  // 값으로 활성/비활성을 정한다.
  useEffect(() => {
    onReadyChange?.(preview !== null);
  }, [preview, onReadyChange]);

  const clampSize = (v: number) =>
    Math.max(1, Math.min(MAX_CANVAS_SIZE, v || 1));
  const effectiveWidth = canvasPreset?.width ?? preview?.width ?? 0;
  const effectiveHeight = canvasPreset?.height ?? preview?.height ?? 0;
  // 미리보기 표시 크기는 픽셀 격자(preview.width/height)가 아니라 원본 이미지
  // 비율로 고정한다. 격자는 해상도를 조정할 때마다 반올림으로 ±1px 흔들려,
  // 그대로 표시 크기에 쓰면 이미지가 미세하게 커졌다 작아졌다 한다.
  const previewBox = (() => {
    const aw = imageEl?.naturalWidth || preview?.width || 1;
    const ah = imageEl?.naturalHeight || preview?.height || 1;
    const s = Math.min(PREVIEW_DISPLAY_MAX / aw, PREVIEW_DISPLAY_MAX / ah);
    return { width: aw * s, height: ah * s };
  })();
  const colorCap = Math.min(MAX_REPRESENTATIVE_COLORS, availableColors);
  const shownMaxColors = Math.min(maxColors, colorCap);

  return (
    <div className="flex flex-col gap-2.5">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`flex flex-col gap-2 p-2 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)] transition-colors ${
          isDragOver ? "bg-violet-50" : "bg-gray-50"
        }`}
      >
        <p className="text-center text-[10px] text-gray-400">
          이미지를 여기로 드래그하거나{" "}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-violet-600 underline underline-offset-2 hover:text-violet-700"
          >
            파일을 선택
          </button>
          하세요
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="hidden"
        />
        <button
          onClick={handlePasteFromClipboard}
          className="bg-gray-100 py-1.5 text-[10px] text-gray-600 hover:bg-gray-200"
        >
          클립보드에서 붙여넣기
        </button>
      </div>

      {preview && (
        <>
          <div className="flex items-center justify-center bg-gray-50 p-2 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]">
            <canvas
              ref={previewCanvasRef}
              style={{
                imageRendering: "pixelated",
                cursor: CURSOR_NORMAL,
                width: previewBox.width,
                height: previewBox.height,
              }}
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-gray-600">
            <span className="shrink-0">해상도</span>
            <input
              type="range"
              min={8}
              max={128}
              value={pixelSize}
              onChange={(e) =>
                handleOptionChange(Number(e.target.value), antiAlias, maxColors)
              }
              className="min-w-0 flex-1"
            />
            <span className="w-14 shrink-0 text-right text-[10px] tabular-nums text-gray-400">
              {preview.width}×{preview.height}
            </span>
          </label>

          {/* 칩(거칠게: 색을 몇 가지로 뽑을지)과 다듬기(미세 조정: 합치기·색
              바꾸기)를 한 "팔레트" 덩어리로 묶는다. 스와치는 여기서 보여주지
              않는다 — "전체"처럼 색이 많이 뽑히면 메인 패널이 스와치로
              뒤덮여 정작 다른 옵션이 묻힌다. 실제 색을 보고 만지는 건 다듬기
              모달(큰 자리·스크롤)에서만 한다. */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <span className="flex items-center gap-1">
                컬러 조합
                <HelpTip text={HELP.importExtractedColors} />
              </span>
              <button
                onClick={() => setPaletteModalOpen(true)}
                className="ml-auto flex items-center gap-0.5 text-[10px] text-violet-600 hover:text-violet-700"
              >
                편집
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            {densityStops(colorCap).length > 1 && (
              <div className="flex flex-wrap gap-1">
                {densityStops(colorCap).map((n) => (
                  <button
                    key={n}
                    onClick={() => handleOptionChange(pixelSize, antiAlias, n)}
                    title={`${n}색`}
                    className={`px-1.5 py-0.5 text-[10px] tabular-nums ${
                      shownMaxColors === n
                        ? "bg-violet-500 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {n === colorCap ? "원본" : n}
                  </button>
                ))}
              </div>
            )}
          </div>

          <label className="flex items-center gap-1.5 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={antiAlias}
              onChange={(e) =>
                handleOptionChange(pixelSize, e.target.checked, maxColors)
              }
            />
            <span className="flex items-center gap-1">
              안티에일리어싱
              <HelpTip text={HELP.importAntialias} />
            </span>
          </label>

          {existingCanvasSize ? (
            (preview.width > existingCanvasSize.width ||
              preview.height > existingCanvasSize.height) && (
              <p className="bg-amber-50 px-2 py-1.5 text-[10px] text-amber-700 shadow-[inset_0_0_0_1px_rgba(217,119,6,0.25)]">
                이미지 해상도({preview.width}×{preview.height})가 캔버스(
                {existingCanvasSize.width}×{existingCanvasSize.height})보다
                큽니다. 불러온 뒤 위치·크기를 조절할 수 있습니다.
              </p>
            )
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 text-xs text-gray-600">
                <span>캔버스 크기</span>
                <label className="flex items-center gap-1.5">
                  <span className="text-[10px] text-gray-500">
                    이미지 해상도와 동일하게
                  </span>
                  <Switch
                    checked={!canvasPreset}
                    onClick={() =>
                      setCanvasPreset(
                        canvasPreset
                          ? null
                          : { width: preview.width, height: preview.height },
                      )
                    }
                  />
                </label>
              </div>
              {canvasPreset && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={1}
                      max={MAX_CANVAS_SIZE}
                      value={effectiveWidth}
                      onChange={(e) =>
                        setCanvasPreset({
                          width: clampSize(Number(e.target.value)),
                          height: effectiveHeight,
                        })
                      }
                      className="w-full bg-gray-100 px-1.5 py-1 text-center text-[10px] text-gray-700"
                    />
                    <span className="text-[10px] text-gray-400">×</span>
                    <input
                      type="number"
                      min={1}
                      max={MAX_CANVAS_SIZE}
                      value={effectiveHeight}
                      onChange={(e) =>
                        setCanvasPreset({
                          width: effectiveWidth,
                          height: clampSize(Number(e.target.value)),
                        })
                      }
                      className="w-full bg-gray-100 px-1.5 py-1 text-center text-[10px] text-gray-700"
                    />
                  </div>
                  {(preview.width > canvasPreset.width ||
                    preview.height > canvasPreset.height) && (
                    <p className="bg-amber-50 px-2 py-1.5 text-[10px] text-amber-700 shadow-[inset_0_0_0_1px_rgba(217,119,6,0.25)]">
                      이미지 해상도({preview.width}×{preview.height})가 캔버스(
                      {canvasPreset.width}×{canvasPreset.height})보다 큽니다.
                      일부가 잘릴 수 있습니다.
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {!hideConfirmButton && (
            <button
              onClick={handleConfirm}
              className="bg-violet-500 py-2 text-xs font-semibold text-white hover:bg-violet-600"
            >
              가져오기
            </button>
          )}

          {paletteModalOpen && (
            <PaletteModal
              palette={preview.palette}
              pixels={preview.pixels}
              width={preview.width}
              height={preview.height}
              containerRef={containerRef}
              onMergePreview={handlePaletteMergePreview}
              onMergeSessionStart={handlePaletteMergeStart}
              onMergeApply={handlePaletteMergeApply}
              onMergeCancel={handlePaletteMergeCancel}
              onRecolor={handlePaletteRecolor}
              onRecolorSessionStart={handlePaletteRecolorStart}
              onRecolorApply={handlePaletteRecolorApply}
              onRecolorCancel={handlePaletteRecolorCancel}
              onClose={() => setPaletteModalOpen(false)}
            />
          )}
        </>
      )}
    </div>
  );
  },
);

export default ImportPanel;
