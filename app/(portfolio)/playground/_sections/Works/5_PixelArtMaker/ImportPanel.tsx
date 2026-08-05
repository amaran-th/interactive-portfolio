"use client";

import { RefObject, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ColorPicker from "./ColorPicker";
import { CURSOR_CROSSHAIR, CURSOR_NORMAL, CURSOR_POINTING } from "./cursors";
import Magnifier, { MAGNIFIER_RADIUS, MagnifierGrid } from "./Magnifier";
import { PixelValue } from "./pixelGrid";
import {
  dedupePalette,
  mergeColors,
  pixelateImage,
  quantizeColors,
  reducePaletteFast,
  resamplePixelGrid,
} from "./pixelate";
import { CANVAS_PRESET_GROUPS, MAX_CANVAS_SIZE } from "./types";

// 색상 추출·병합 알고리즘은 내부적으로 계속 인덱스 팔레트를 쓴다(대표색
// 개수 기준 병합은 인덱스 단위가 자연스럽다) — onConfirm 경계에서만 각 픽셀에
// 실제 hex 색을 직접 넣은 트루컬러로 변환해 넘긴다.
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

// 대표 색상 개수의 실용적 상한 — quantizeColors의 정밀 병합이 느려지는 지점을
// 고려한 값일 뿐, 그 아래로는 자유롭게 정할 수 있다(슬라이더 + 직접 입력 모두).
const MAX_REPRESENTATIVE_COLORS = 256;

export default function ImportPanel({
  onConfirm,
  existingCanvasSize,
  containerRef,
}: {
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
  // 크기" 설정 자체를 숨기고, 대신 해상도가 이 크기를 넘으면 경고만 보여준다
  // (그 상태로도 가져오기는 그대로 할 수 있다 — 불러온 뒤 pendingImage로 뜬
  // 상태에서 위치·크기를 다시 조절하면 된다).
  existingCanvasSize?: { width: number; height: number };
  // 색상 편집 팝오버를 이 안쪽으로만 당겨 넣는다 — 브라우저 뷰포트가 아니라
  // 편집기 창(letterbox로 뷰포트보다 작을 수 있음) 기준으로 클램프해야 창
  // 바깥(검은 배경 위)으로 삐져나가지 않는다.
  containerRef?: RefObject<HTMLDivElement | null>;
}) {
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [pixelSize, setPixelSize] = useState(32);
  const [antiAlias, setAntiAlias] = useState(false);
  const [maxColors, setMaxColors] = useState(8);
  // null = 픽셀 해상도(pixelSize)를 그대로 최종 캔버스 크기로 쓴다. 값이 있으면
  // 그 규격으로 확대/축소해 배치한다 — "변환할 대상 비트 규격"(pixelSize)과
  // "실제 캔버스 크기"를 독립적으로 고를 수 있게 하는 게 이 상태의 목적이다.
  const [canvasPreset, setCanvasPreset] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [imageEl, setImageEl] = useState<HTMLImageElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  // 스와치를 클릭해 그 대표색을 색상환 팝오버로 바로 수정 중일 때의 인덱스 —
  // 값을 바꾸면 그 색을 쓰는 모든 픽셀이 즉시 함께 바뀐다(팔레트 인덱스 참조
  // 방식이라 픽셀 배열은 건드릴 필요 없이 palette[i]만 바꾸면 된다).
  const [armedColorIndex, setArmedColorIndex] = useState<number | null>(null);
  // 팝오버를 실제로 그릴 화면 좌표(뷰포트 기준, position:fixed) — 이 패널은
  // overflow-auto/overflow-y-auto인 조상(사이드바·NewCanvasDialog 본문) 안에
  // 놓이는데, 팝오버를 그 조상 내부에 absolute로 두면 조상의 스크롤 영역
  // 밖으로 나가는 부분이 잘리거나 다른 요소에 가려졌다. document.body에
  // 포털로 그려서 그 문제를 피한다.
  const [popoverPos, setPopoverPos] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const swatchContainerRef = useRef<HTMLDivElement>(null);
  // 드래그로 스와치를 다른 스와치 위에 놓으면 병합한다 — 지금 드래그가
  // 올라가 있는 대상만 별도로 표시해 놓을 위치를 알려준다.
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  // 색상 병합(드래그 병합·동일색 자동 병합)만 되돌릴 수 있게 하는 로컬
  // 되돌리기 스택 — 슬라이더로 다시 추출하면(runPixelate) 이전 상태와는
  // 아예 다른 팔레트가 되므로 함께 비운다.
  const [previewHistory, setPreviewHistory] = useState<Preview[]>([]);
  // 스포이트 버튼을 누르면 브라우저 화면 전체를 집는 네이티브 API 대신, 편집기
  // 캔버스의 스포이트 도구와 같은 방식으로 동작한다 — 이 상태가 켜진 동안
  // 미리보기 캔버스를 클릭하면 그 픽셀의 정확한 저장값을 그대로 읽어온다.
  const [eyedropperActive, setEyedropperActive] = useState(false);
  // 스포이트가 켜져 있는 동안 커서를 따라다니는 확대경 위치 — 미리보기의
  // 네이티브 픽셀 좌표(그리드 좌표)와 화면 좌표(확대경을 띄울 위치)를 함께
  // 든다. 메인 캔버스·레퍼런스 창의 스포이트 확대경과 같은 컴포넌트를 쓴다.
  const [hover, setHover] = useState<{
    x: number;
    y: number;
    screenX: number;
    screenY: number;
  } | null>(null);

  const runPixelate = useCallback(
    (img: HTMLImageElement, size: number, aa: boolean, colors: number) => {
      const raw = pixelateImage(img, size, size, aa);
      // 사진처럼 원본 색이 아주 다양한 이미지는 quantizeColors의 정밀한(느린) 병합에
      // 넘기기 전에 먼저 빠르게 후보 수를 줄여야 브라우저가 멈추지 않는다.
      const capped = reducePaletteFast(raw.palette, raw.pixels, 256);
      const quantized = quantizeColors(capped.palette, capped.pixels, colors);
      setPreview({
        width: raw.width,
        height: raw.height,
        palette: quantized.palette,
        pixels: quantized.pixels,
      });
      setArmedColorIndex(null);
      setPreviewHistory([]);
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

  // 클립보드에 복사된 이미지(스크린샷, 다른 앱에서 복사한 그림 등)를 바로 가져온다.
  // Clipboard API 미지원/권한 거부 환경에서는 조용히 무시한다(이 프로젝트의 기존
  // localStorage 저장 실패 처리와 같은 관례 — 토스트 UI가 없는 이 앱에서 새 알림
  // 체계를 따로 만들지 않는다).
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
      // 클립보드 접근 실패 — 무시(사용자가 파일 선택으로 대신 진행할 수 있음)
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

  // 스와치를 다른 스와치 위로 드래그해서 놓으면 병합한다 — 놓인 자리(target)의
  // 색이 남고, 끌어온 스와치(source)는 사라진다. 명시적인 병합 행위라 항상
  // 되돌리기 스택에 남긴다.
  const handleMergeDrag = useCallback(
    (sourceIndex: number, targetIndex: number) => {
      if (!preview || sourceIndex === targetIndex) return;
      setPreviewHistory((h) => [...h, preview]);
      const merged = mergeColors(
        preview.palette,
        preview.pixels,
        targetIndex,
        sourceIndex,
      );
      setPreview({
        ...preview,
        palette: merged.palette,
        pixels: merged.pixels,
      });
      setArmedColorIndex(null);
    },
    [preview],
  );

  // 스와치 하나의 색만 바꾼다 — palette[index]만 갈아 끼우므로 그 색을 쓰던
  // 모든 픽셀이 다시 계산할 필요 없이 그대로 새 색을 반영한다(즉각 일괄 변환).
  // 그 결과 다른 스와치와 완전히 같은 색이 되면 자동으로 합친다 — 이 자동
  // 병합이 실제로 일어났을 때만(단순 재색상과 구분해) 되돌리기 스택에 남긴다.
  // 그렇지 않으면 드래그로 색상환을 조정할 때마다(onChange가 연속으로 호출됨)
  // 거의 같은 상태가 스택에 쌓여 되돌리기 한 번이 사실상 무의미해진다.
  const handlePaletteColorChange = useCallback(
    (index: number, hex: string) => {
      if (!preview) return;
      const nextPalette = preview.palette.map((c, i) =>
        i === index ? hex : c,
      );
      const deduped = dedupePalette(nextPalette, preview.pixels);
      if (deduped.palette.length < nextPalette.length) {
        setPreviewHistory((h) => [...h, preview]);
        setArmedColorIndex(null);
      }
      setPreview({
        ...preview,
        palette: deduped.palette,
        pixels: deduped.pixels,
      });
    },
    [preview],
  );

  const handleUndo = useCallback(() => {
    if (previewHistory.length === 0) return;
    setPreview(previewHistory[previewHistory.length - 1]);
    setPreviewHistory((h) => h.slice(0, -1));
  }, [previewHistory]);

  // Ctrl/Cmd+Z를 이 패널이 먼저 가로챈다 — 되돌릴 색상 병합이 있으면 그것만
  // 되돌리고 이벤트를 여기서 멈춘다(stopPropagation). 로컬에 되돌릴 게 없으면
  // 그대로 흘려보내 앱 전체의 실행취소(메인 캔버스)가 대신 처리하게 둔다.
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.code === "KeyZ" &&
        !e.shiftKey &&
        previewHistory.length > 0
      ) {
        e.preventDefault();
        e.stopPropagation();
        handleUndo();
      }
    },
    [previewHistory, handleUndo],
  );

  // 스포이트 버튼은 편집기 캔버스의 스포이트 도구와 똑같이 동작한다 — 클릭하면
  // "다음에 미리보기 캔버스를 클릭하면 그 자리 색을 집는다" 모드를 켤 뿐,
  // 그 자체로 바로 색을 바꾸지는 않는다.
  const handleEyedropper = useCallback(() => {
    if (armedColorIndex === null) return;
    setEyedropperActive((v) => !v);
  }, [armedColorIndex]);

  // 미리보기 캔버스를 클릭했을 때 — eyedropperActive가 켜져 있으면 그 자리의
  // 픽셀 값을 그대로 읽어 지금 팔레트 편집 중인 스와치에 적용한다. preview.pixels는
  // 팔레트 인덱스를 담고 있으므로, 화면 클릭 좌표를 preview.width/height 기준
  // 격자 좌표로 환산한 뒤 그 인덱스가 가리키는 실제 hex를 palette에서 찾는다.
  const handlePreviewCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!eyedropperActive || armedColorIndex === null || !preview) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = Math.floor(
        ((e.clientX - rect.left) / rect.width) * preview.width,
      );
      const y = Math.floor(
        ((e.clientY - rect.top) / rect.height) * preview.height,
      );
      setEyedropperActive(false);
      setHover(null);
      if (x < 0 || y < 0 || x >= preview.width || y >= preview.height) return;
      const colorIndex = preview.pixels[y * preview.width + x];
      const hex = colorIndex >= 0 ? preview.palette[colorIndex] : undefined;
      if (hex) handlePaletteColorChange(armedColorIndex, hex);
    },
    [eyedropperActive, armedColorIndex, preview, handlePaletteColorChange],
  );

  // 스포이트가 켜진 동안 커서를 따라다니는 확대경 — 미리보기 위를 움직일
  // 때마다 지금 커서가 가리키는 네이티브 좌표를 다시 잰다.
  const handlePreviewCanvasMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!eyedropperActive || !preview) {
        if (hover) setHover(null);
        return;
      }
      const rect = e.currentTarget.getBoundingClientRect();
      const x = Math.floor(
        ((e.clientX - rect.left) / rect.width) * preview.width,
      );
      const y = Math.floor(
        ((e.clientY - rect.top) / rect.height) * preview.height,
      );
      setHover(
        x >= 0 && y >= 0 && x < preview.width && y < preview.height
          ? { x, y, screenX: e.clientX, screenY: e.clientY }
          : null,
      );
    },
    [eyedropperActive, preview, hover],
  );

  // 팝오버가 화면 밖으로 나가지 않게 한다 — 스와치 바로 아래에 처음 계산한
  // 위치가 경계를 넘으면, 실제로 그려진 뒤 크기를 재서 안쪽으로 당겨 넣는다.
  // 브라우저 뷰포트(window.innerWidth/Height) 기준이 아니라 이 편집기 창
  // 자체(containerRef, letterbox로 뷰포트보다 작을 수 있다) 기준으로 당겨야,
  // 편집기 창보다 큰 뷰포트에서 팝오버가 창 바깥(검은 배경 위)으로 삐져나가지
  // 않는다. React state가 아니라 DOM에 직접 쓴다 — 이건 화면에 실제로 그려진
  // 크기를 봐야만 알 수 있는 순수한 표시 보정이라(리렌더로 다시 계산할 "값"이
  // 아니다) state에 담아 컴포넌트를 다시 그리게 할 필요가 없다.
  useEffect(() => {
    if (armedColorIndex === null || !popoverPos) return;
    const el = popoverRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const bounds = containerRef?.current?.getBoundingClientRect();
    const minX = (bounds?.left ?? 0) + 8;
    const minY = (bounds?.top ?? 0) + 8;
    const maxX = (bounds?.right ?? window.innerWidth) - 8;
    const maxY = (bounds?.bottom ?? window.innerHeight) - 8;
    let left = popoverPos.left;
    let top = popoverPos.top;
    const overflowRight = rect.right - maxX;
    if (overflowRight > 0) left -= overflowRight;
    if (left < minX) left = minX;
    const overflowBottom = rect.bottom - maxY;
    if (overflowBottom > 0) top -= overflowBottom;
    if (top < minY) top = minY;
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  }, [armedColorIndex, popoverPos, containerRef]);

  // 팝오버 바깥을 클릭하면 닫는다 — 스와치 버튼 자체는 제외한다(그렇지 않으면
  // 같은 스와치를 다시 눌러 닫으려 할 때 mousedown이 먼저 닫아버리고 뒤이은
  // click이 다시 열어, 토글이 아니라 계속 열려 있는 것처럼 보인다). 미리보기
  // 캔버스도 제외한다 — 스포이트로 그 위를 클릭할 때 mousedown이 먼저
  // armedColorIndex를 지워버리면, 뒤이어 발생하는 click(색을 실제로 적용하는
  // handlePreviewCanvasClick)이 이미 null이 된 인덱스를 보고 아무 일도
  // 하지 않게 된다.
  useEffect(() => {
    if (armedColorIndex === null) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (swatchContainerRef.current?.contains(target)) return;
      if (previewCanvasRef.current?.contains(target)) return;
      setArmedColorIndex(null);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [armedColorIndex]);

  // 슬라이더를 조정할 때마다 preview가 바뀌므로, 실제로 어떤 픽셀아트가 나올지
  // 색상 스와치만으로는 알 수 없다는 피드백을 받아 결과를 직접 그려서 보여준다.
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
    // 캔버스가 원본보다 크면(업스케일) 그 규격을 그대로 채운다 — 잘릴 부분이
    // 없으므로 리샘플이 자연스럽다.
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

  const clampSize = (v: number) =>
    Math.max(1, Math.min(MAX_CANVAS_SIZE, v || 1));
  const effectiveWidth = canvasPreset?.width ?? preview?.width ?? 0;
  const effectiveHeight = canvasPreset?.height ?? preview?.height ?? 0;

  return (
    // 이 패널만의 세로 여백(gap-3)을 직접 갖는다 — Accordion(Editor.tsx)
    // 안에서는 원래 Accordion이 주는 gap으로 충분했지만, NewCanvasDialog는
    // 이 패널을 gap 없는 컨테이너에 바로 얹어 옵션 사이 여백이 거의 없어
    // 보였다. 어디에 놓이든 항상 같은 간격을 스스로 보장한다. 이 div가 이 패널
    // 안 어디에 포커스가 있든(스와치 버튼·헥스 입력칸 등) Ctrl/Cmd+Z를 먼저
    // 가로챌 수 있게 해준다.
    <div className="flex flex-col gap-3" onKeyDown={handleKeyDown}>
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
          이미지를 여기로 드래그하거나 파일을 선택하세요
        </p>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="text-xs text-gray-600"
          style={{ cursor: CURSOR_POINTING }}
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
              onClick={handlePreviewCanvasClick}
              onPointerMove={handlePreviewCanvasMove}
              onPointerLeave={() => setHover(null)}
              title={
                eyedropperActive ? "클릭해서 이 자리의 색 뽑기" : undefined
              }
              style={{
                imageRendering: "pixelated",
                cursor: eyedropperActive ? CURSOR_CROSSHAIR : CURSOR_NORMAL,
                width:
                  preview.width *
                  Math.min(
                    PREVIEW_DISPLAY_MAX / preview.width,
                    PREVIEW_DISPLAY_MAX / preview.height,
                  ),
                height:
                  preview.height *
                  Math.min(
                    PREVIEW_DISPLAY_MAX / preview.width,
                    PREVIEW_DISPLAY_MAX / preview.height,
                  ),
              }}
            />
          </div>
          {eyedropperActive &&
            hover &&
            (() => {
              const grid: MagnifierGrid = [];
              for (let dy = -MAGNIFIER_RADIUS; dy <= MAGNIFIER_RADIUS; dy++) {
                const row: (string | null)[] = [];
                for (let dx = -MAGNIFIER_RADIUS; dx <= MAGNIFIER_RADIUS; dx++) {
                  const gx = hover.x + dx;
                  const gy = hover.y + dy;
                  if (gx < 0 || gy < 0 || gx >= preview.width || gy >= preview.height) {
                    row.push(null);
                    continue;
                  }
                  const idx = preview.pixels[gy * preview.width + gx];
                  row.push(idx >= 0 ? (preview.palette[idx] ?? null) : null);
                }
                grid.push(row);
              }
              const centerIdx = preview.pixels[hover.y * preview.width + hover.x];
              return (
                <Magnifier
                  screenX={hover.screenX}
                  screenY={hover.screenY}
                  grid={grid}
                  centerHex={
                    centerIdx >= 0 ? (preview.palette[centerIdx] ?? null) : null
                  }
                />
              );
            })()}
          {/* 라벨 옆에 슬라이더+숫자칸까지 한 줄에 우겨넣으면(justify-between)
              사이드바 폭이 좁아 라벨 텍스트가 글자 단위로 줄바꿈될 만큼
              찌그러졌다 — 라벨을 위, 슬라이더를 아래 줄로 내려 각자 필요한
              폭을 그대로 쓰게 한다. */}
          <label className="flex flex-col gap-1 text-xs text-gray-600">
            <span>픽셀 해상도(비트 규격)</span>
            <span className="flex items-center gap-1.5">
              <input
                type="range"
                min={8}
                max={128}
                value={pixelSize}
                onChange={(e) =>
                  handleOptionChange(
                    Number(e.target.value),
                    antiAlias,
                    maxColors,
                  )
                }
                className="flex-1"
              />
              <input
                type="number"
                min={1}
                max={512}
                value={pixelSize}
                onChange={(e) =>
                  handleOptionChange(
                    Math.max(1, Number(e.target.value) || 1),
                    antiAlias,
                    maxColors,
                  )
                }
                className="w-12 shrink-0 bg-gray-100 px-1 py-0.5 text-right text-[10px] tabular-nums text-gray-600"
              />
            </span>
          </label>
          <label className="flex items-center justify-between text-xs text-gray-600">
            안티에일리어싱
            <input
              type="checkbox"
              checked={antiAlias}
              onChange={(e) =>
                handleOptionChange(pixelSize, e.target.checked, maxColors)
              }
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-600">
            <span>대표 색상 개수</span>
            <span className="flex items-center gap-1.5">
              <input
                type="range"
                min={1}
                max={MAX_REPRESENTATIVE_COLORS}
                value={maxColors}
                onChange={(e) =>
                  handleOptionChange(
                    pixelSize,
                    antiAlias,
                    Number(e.target.value),
                  )
                }
                className="flex-1"
              />
              <input
                type="number"
                min={1}
                max={MAX_REPRESENTATIVE_COLORS}
                value={maxColors}
                onChange={(e) =>
                  handleOptionChange(
                    pixelSize,
                    antiAlias,
                    Math.max(1, Number(e.target.value) || 1),
                  )
                }
                className="w-12 shrink-0 bg-gray-100 px-1 py-0.5 text-right text-[10px] tabular-nums text-gray-600"
              />
            </span>
          </label>

          {existingCanvasSize ? (
            (preview.width > existingCanvasSize.width ||
              preview.height > existingCanvasSize.height) && (
              <p className="bg-amber-50 px-2 py-1.5 text-[10px] text-amber-700 shadow-[inset_0_0_0_1px_rgba(217,119,6,0.25)]">
                해상도({preview.width}×{preview.height})가 현재 캔버스 크기(
                {existingCanvasSize.width}×{existingCanvasSize.height})보다
                큽니다. 이 상태로도 가져올 수 있고, 불러온 뒤 위치·크기를 다시
                조절할 수 있습니다.
              </p>
            )
          ) : (
            <div>
              <p className="mb-1 text-xs text-gray-600">캔버스 크기</p>
              <button
                onClick={() => setCanvasPreset(null)}
                className={`mb-1.5 w-full px-1.5 py-1 text-[10px] ${
                  !canvasPreset
                    ? "bg-violet-50 text-violet-700 shadow-[0_0_0_1.5px_#8b5cf6]"
                    : "bg-gray-50 text-gray-600 hover:bg-violet-50"
                }`}
              >
                픽셀 해상도와 동일
              </button>
              {CANVAS_PRESET_GROUPS.map(({ group, presets }) => (
                <div key={group} className="mb-1.5">
                  <p className="mb-0.5 text-[9px] font-semibold text-gray-400">
                    {group}
                  </p>
                  <div className="grid grid-cols-3 gap-1">
                    {presets.map((p) => (
                      <button
                        key={p.label}
                        onClick={() =>
                          setCanvasPreset({ width: p.width, height: p.height })
                        }
                        className={`px-1.5 py-1 text-[10px] ${
                          canvasPreset?.width === p.width &&
                          canvasPreset?.height === p.height
                            ? "bg-violet-50 text-violet-700 shadow-[0_0_0_1.5px_#8b5cf6]"
                            : "bg-gray-50 text-gray-600 hover:bg-violet-50"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
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
              {/* 고른 캔버스 크기가 실제 픽셀화 해상도보다 작으면 축소(리샘플)하지
                  않는다 — 원본 해상도 그대로 캔버스 위에 올려두고, 위치를
                  옮긴 뒤 확정하면 캔버스 밖으로 나간 부분만 잘려나간다. */}
              {canvasPreset &&
                (preview.width > canvasPreset.width ||
                  preview.height > canvasPreset.height) && (
                  <p className="mt-1.5 bg-amber-50 px-2 py-1.5 text-[10px] text-amber-700 shadow-[inset_0_0_0_1px_rgba(217,119,6,0.25)]">
                    해상도({preview.width}×{preview.height})가 고른 캔버스 크기(
                    {canvasPreset.width}×{canvasPreset.height})보다 큽니다.
                    축소되지 않고 원본 해상도 그대로 캔버스 위에 올라가며,
                    위치를 정한 뒤 확정하면 캔버스 밖 영역만 잘려나갑니다.
                  </p>
                )}
            </div>
          )}

          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-xs text-gray-600">
                추출된 색상 — 클릭해 재색상, 다른 색상 위로 드래그하면 병합
              </p>
              <button
                onClick={handleUndo}
                disabled={previewHistory.length === 0}
                title="색상 병합 되돌리기 (Ctrl/Cmd+Z)"
                className="shrink-0 bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600 hover:bg-gray-200 disabled:opacity-30"
              >
                실행취소
              </button>
            </div>
            <div ref={swatchContainerRef} className="flex flex-wrap gap-1.5">
              {preview.palette.map((color, i) => (
                <button
                  key={i}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", String(i));
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragOverIndex !== i) setDragOverIndex(i);
                  }}
                  onDragLeave={() =>
                    setDragOverIndex((cur) => (cur === i ? null : cur))
                  }
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverIndex(null);
                    const sourceIndex = Number(
                      e.dataTransfer.getData("text/plain"),
                    );
                    if (!Number.isNaN(sourceIndex))
                      handleMergeDrag(sourceIndex, i);
                  }}
                  onClick={(e) => {
                    setArmedColorIndex((cur) => (cur === i ? null : i));
                    const rect = e.currentTarget.getBoundingClientRect();
                    setPopoverPos({ left: rect.left, top: rect.bottom + 4 });
                  }}
                  title={`${color} — 클릭: 색상 변환 · 드래그해서 다른 색상 위에 놓으면 병합`}
                  className={`h-5 w-5 ${
                    dragOverIndex === i
                      ? "ring-2 ring-violet-500"
                      : armedColorIndex === i
                        ? "ring-2 ring-violet-400"
                        : "ring-1 ring-black/10"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            {armedColorIndex !== null &&
              preview.palette[armedColorIndex] &&
              popoverPos &&
              typeof document !== "undefined" &&
              createPortal(
                // overflow-auto/overflow-y-auto인 조상(사이드바·NewCanvasDialog
                // 본문) 안에 absolute로 두면 그 조상의 스크롤 영역 밖으로 나가는
                // 부분이 잘리거나 다른 요소에 가려졌다 — document.body에 곧바로
                // 포털로 그리고 화면 좌표(position:fixed)로 위치를 잡아 어떤
                // 조상의 overflow에도 영향받지 않게 한다.
                <div
                  ref={popoverRef}
                  className="fixed z-50 w-max bg-white p-2 shadow-xl"
                  style={{
                    left: popoverPos.left,
                    top: popoverPos.top,
                    cursor: CURSOR_NORMAL,
                  }}
                >
                  <ColorPicker
                    value={preview.palette[armedColorIndex]}
                    onChange={(hex) =>
                      handlePaletteColorChange(armedColorIndex, hex)
                    }
                    eyedropperActive={eyedropperActive}
                    onEyedropperClick={handleEyedropper}
                  />
                </div>,
                document.body,
              )}
          </div>

          <button
            onClick={handleConfirm}
            className="bg-violet-500 py-2 text-xs font-semibold text-white hover:bg-violet-600"
          >
            가져오기
          </button>
        </>
      )}
    </div>
  );
}
