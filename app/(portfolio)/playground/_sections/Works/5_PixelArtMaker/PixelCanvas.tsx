"use client";

import { RefObject, useCallback, useEffect, useRef, useState } from "react";
import {
  bboxGradientAxis,
  buildGradientSteps,
  projectT,
  stepColorAt,
} from "./gradientFill";
import { rgbaToHex } from "./hsv";
import {
  circleFillPoints,
  circleOutlinePoints,
  floodFill,
  getPixel,
  linePoints,
  mirrorPoints,
  rectFillPoints,
  rectOutlinePoints,
  setPixel,
  wandMask,
} from "./pixelGrid";
import { rasterizeText } from "./textStamp";
import { MirrorMode, Point, Tool } from "./types";
import { moveSelection } from "./useSelection";

export type PendingText = {
  x: number;
  y: number;
  text: string;
  fontSize: number;
  colorHex: string;
  antialias: boolean;
  gradientFill: boolean;
};

const CELL_SIZE = 16;

// 도형 그라데이션 채우기가 실제로 색칠할 낱개 픽셀 좌표를 모두 펼친다 —
// plotPoint의 브러시 크기·미러 확장과 정확히 같은 규칙을 쓴다(그래야 그라데이션
// 미리보기가 실제 커밋 결과와 어긋나지 않는다). 중복 좌표는 한 번만 담는다.
function expandPoints(
  shapePoints: Point[],
  width: number,
  height: number,
  mirror: MirrorMode,
  brushSize: number,
): Point[] {
  const half = Math.floor(brushSize / 2);
  const seen = new Map<number, Point>();
  for (const { x, y } of shapePoints) {
    for (let dy = 0; dy < brushSize; dy++) {
      for (let dx = 0; dx < brushSize; dx++) {
        const bx = x - half + dx;
        const by = y - half + dy;
        if (bx < 0 || by < 0 || bx >= width || by >= height) continue;
        for (const p of mirrorPoints(width, height, mirror, bx, by)) {
          const key = p.y * width + p.x;
          if (!seen.has(key)) seen.set(key, p);
        }
      }
    }
  }
  return [...seen.values()];
}

export default function PixelCanvas({
  width,
  height,
  palette,
  pixels,
  tool,
  mirror,
  activeColorIndex,
  selectionMask,
  showGrid,
  brushSize,
  filledShapes,
  onSelectionChange,
  onStrokeEnd,
  onEnsureColor,
  onPickColor,
  onTextToolClick,
  pendingText,
  onPendingTextChange,
  onPendingTextMove,
  onPendingTextToggleAA,
  onPendingTextToggleGradient,
  onPendingTextCommit,
  onPendingTextCancel,
  onGradientToolEnd,
  shapeGradientFill,
  gradientStartHex,
  gradientEndHex,
  gradientSteps,
  gradientAngleDeg,
  onShapeGradientEnd,
  zoom,
  onZoomChange,
  viewportRef,
}: {
  width: number;
  height: number;
  palette: string[];
  pixels: number[];
  tool: Tool;
  mirror: MirrorMode;
  activeColorIndex: number;
  selectionMask: Set<number> | null;
  showGrid: boolean;
  brushSize: number;
  filledShapes: boolean;
  onSelectionChange: (mask: Set<number> | null) => void;
  onStrokeEnd: (next: number[]) => void;
  // 팔레트가 비어 있는 채로 그리기(펜슬·채우기·직선/사각형/원의 단색 경로)를
  // 시작하면 호출된다 — activeColorIndex가 가리킬 실제 색이 있어야 하므로,
  // Editor가 기본 검정 한 칸을 자동으로 추가한다. 팔레트가 이미 있으면
  // Editor 쪽에서 아무 일도 하지 않는다.
  onEnsureColor: () => void;
  onPickColor: (colorIndex: number) => void;
  // 텍스트 도구로 캔버스를 클릭했을 때(그리드 좌표) — pendingText가 없으면 그
  // 자리에 새로 시작하고, 있으면(경계 밖 클릭) Editor가 먼저 커밋한 뒤 새로
  // 시작한다. 실제 래스터화·팔레트 반영은 Editor가 맡는다.
  onTextToolClick: (x: number, y: number) => void;
  // 아직 확정하지 않은 텍스트 — 캔버스 위에 인라인 입력·반투명 미리보기로
  // 보여주고, 그 경계 안을 드래그하면 이동만 한다(모달 없이 캔버스 안에서
  // 이동·크기조절·타이핑이 끝나면 Enter/포커스 아웃/도구 전환 시 커밋).
  pendingText: PendingText | null;
  onPendingTextChange: (text: string, fontSize: number) => void;
  onPendingTextMove: (x: number, y: number) => void;
  onPendingTextToggleAA: () => void;
  onPendingTextToggleGradient: () => void;
  onPendingTextCommit: () => void;
  onPendingTextCancel: () => void;
  // 그라데이션 드래그가 끝났을 때(시작·끝 그리드 좌표) — 팔레트 확장이 필요할 수
  // 있어 실제 채우기는 Editor가 처리한다.
  onGradientToolEnd: (x0: number, y0: number, x1: number, y1: number) => void;
  // 직선·사각형·원을 단색 대신 그라데이션으로 채운다 — 실제 색 계산엔 활성/보조
  // 색상(hex로 미리 풀어서 받음)·단계 수·방향(각도)이 필요하다.
  shapeGradientFill: boolean;
  gradientStartHex: string;
  gradientEndHex: string;
  gradientSteps: number;
  gradientAngleDeg: number;
  // 그라데이션 채우기 도형 드래그가 끝났을 때 — 브러시 크기·미러까지 반영해
  // 이미 펼쳐둔 최종 좌표 목록을 넘긴다. 팔레트 확장이 필요해 실제 색 결정과
  // 커밋은 Editor가 처리한다.
  onShapeGradientEnd: (points: Point[]) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  // 확대 상태에서 스페이스+드래그로 스크롤할 대상 — 이 캔버스를 감싼 overflow-auto
  // 뷰포트 컨테이너의 ref를 Editor가 그대로 내려준다.
  viewportRef: RefObject<HTMLDivElement | null>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // 트랙패드 스크롤/핀치는 짧은 시간 안에 작은 deltaY를 가진 wheel 이벤트를 수십 번
  // 쏟아낸다 — 이벤트 하나당 배율을 한 단계씩 바꾸면 살짝만 스크롤해도 확대가
  // 급격히 튀었다. deltaY를 누적해 일정 값을 넘을 때만 한 단계 바꾸도록 한다.
  const wheelDeltaRef = useRef(0);
  const workingRef = useRef<number[]>(pixels);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const shapeStartRef = useRef<{ x: number; y: number } | null>(null);
  const drawingRef = useRef(false);
  // 확대된 상태에서는 캔버스가 뷰포트보다 커져 화면을 옮겨볼 방법이 필요하다 —
  // 스페이스바를 누른 채 드래그하면(포토샵·Aseprite와 같은 관례) 그리기 대신
  // 뷰포트(부모 컨테이너)를 스크롤한다.
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);
  const panStartRef = useRef<{
    x: number;
    y: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);
  // 그라데이션 도구는 드래그 중 실제 픽셀은 건드리지 않는다(팔레트 확장은 커밋
  // 시점에 Editor가 처리) — 드래그 축만 얇은 선으로 미리 보여준다.
  const gradientPreviewRef = useRef<{
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  } | null>(null);
  // 그라데이션으로 채우는 직선·사각형·원도 같은 이유로 드래그 중에는 실제
  // 픽셀(workingRef)을 건드리지 않는다 — 대신 정확한 그라데이션 색을 각 점마다
  // 미리 계산해 캔버스 오버레이로만 보여주고, 드래그가 끝나면 좌표만 Editor에
  // 넘겨 팔레트 확장을 포함한 실제 커밋을 맡긴다.
  const shapeGradientOverlayRef = useRef<{
    points: Point[];
    colors: string[];
  } | null>(null);
  // pendingText 경계 안을 클릭해 드래그를 시작하면, 클릭 지점과 텍스트 원점 사이의
  // 오프셋을 기억해 마우스를 따라 자연스럽게 이동하도록 한다.
  const textDragRef = useRef<{ offsetX: number; offsetY: number } | null>(null);
  // selectionMask 프롭은 React state를 거쳐 비동기로 갱신되므로, 빠른 연속 pointermove
  // 동안 오래된(stale) 값을 참조해 move 드래그가 잘못된 위치를 지우는 문제(자취 남음)가
  // 있었다. workingRef와 같은 패턴으로 항상 최신 값을 담는 ref를 별도로 둔다.
  const selectionMaskRef = useRef<Set<number> | null>(selectionMask);
  // 텍스트 도구의 인라인 입력을 캔버스 좌표계에 절대 위치시키는 데도 쓰인다.
  const scale = CELL_SIZE * zoom;

  useEffect(() => {
    workingRef.current = pixels;
  }, [pixels]);

  useEffect(() => {
    selectionMaskRef.current = selectionMask;
  }, [selectionMask]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      e.preventDefault();
      setIsSpaceHeld(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      setIsSpaceHeld(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const render = useCallback(
    (data: number[]) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const colorIndex = getPixel(data, width, x, y);
          if (colorIndex < 0) continue;
          ctx.fillStyle = palette[colorIndex] ?? "#ff00ff";
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
      if (showGrid) {
        ctx.strokeStyle = "rgba(0,0,0,0.08)";
        for (let x = 0; x <= width; x++) {
          ctx.beginPath();
          ctx.moveTo(x * scale, 0);
          ctx.lineTo(x * scale, height * scale);
          ctx.stroke();
        }
        for (let y = 0; y <= height; y++) {
          ctx.beginPath();
          ctx.moveTo(0, y * scale);
          ctx.lineTo(width * scale, y * scale);
          ctx.stroke();
        }
      }
      // 선택 영역을 시각적으로 표시한다 — select/wand 도구로 선택해도 화면에
      // 아무 표시가 없어 무엇이 선택됐는지 알 수 없었다(최종 whole-branch 리뷰에서 발견).
      // ref에서 읽어 move 드래그 중 빠른 pointermove 연속 호출에서도 항상 최신 마스크를 그린다.
      const mask = selectionMaskRef.current;
      if (mask && mask.size > 0) {
        ctx.fillStyle = "rgba(139, 92, 246, 0.3)";
        ctx.strokeStyle = "rgba(139, 92, 246, 0.9)";
        ctx.lineWidth = 1;
        mask.forEach((i) => {
          const x = i % width;
          const y = Math.floor(i / width);
          ctx.fillRect(x * scale, y * scale, scale, scale);
          ctx.strokeRect(
            x * scale + 0.5,
            y * scale + 0.5,
            scale - 1,
            scale - 1,
          );
        });
      }

      const gp = gradientPreviewRef.current;
      if (gp) {
        ctx.strokeStyle = "rgba(139, 92, 246, 0.9)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(gp.x0 * scale + scale / 2, gp.y0 * scale + scale / 2);
        ctx.lineTo(gp.x1 * scale + scale / 2, gp.y1 * scale + scale / 2);
        ctx.stroke();
      }

      // 그라데이션으로 채우는 직선·사각형·원 미리보기 — 실제 픽셀은 아직 건드리지
      // 않았으므로(shapeGradientOverlayRef만 갱신) 이 오버레이가 곧 결과 모양이다.
      const sg = shapeGradientOverlayRef.current;
      if (sg) {
        sg.points.forEach((p, i) => {
          ctx.fillStyle = sg.colors[i];
          ctx.fillRect(p.x * scale, p.y * scale, scale, scale);
        });
      }

      // 확정 전 텍스트 — 반투명으로 그려 아직 커밋되지 않았다는 걸 보여주고,
      // 경계를 얇은 사각형으로 표시해 드래그 가능한 영역임을 알려준다. gradientFill이면
      // 칸마다 정확한 그라데이션 색을(팔레트 제약 없이 그대로) 쓰고, antialias면
      // 글자 가장자리의 커버리지 비율만큼 더 옅게 그려 부드러운 느낌을 미리 보여준다.
      if (pendingText && pendingText.text) {
        const {
          width: tw,
          height: th,
          alpha,
        } = rasterizeText(pendingText.text, pendingText.fontSize);
        const stepColors = pendingText.gradientFill
          ? buildGradientSteps(gradientStartHex, gradientEndHex, gradientSteps)
          : null;
        const axis =
          stepColors &&
          bboxGradientAxis(
            [
              { x: pendingText.x, y: pendingText.y },
              { x: pendingText.x + tw, y: pendingText.y + th },
            ],
            gradientAngleDeg,
          );
        for (let ty = 0; ty < th; ty++) {
          for (let tx = 0; tx < tw; tx++) {
            const coverage = alpha[ty * tw + tx] / 255;
            if (coverage === 0) continue;
            const px = pendingText.x + tx;
            const py = pendingText.y + ty;
            if (px < 0 || py < 0 || px >= width || py >= height) continue;
            if (stepColors && axis) {
              const t = projectT(px, py, axis.x0, axis.y0, axis.x1, axis.y1);
              const c = stepColorAt(stepColors, t);
              ctx.fillStyle = rgbaToHex(c[0], c[1], c[2], c[3]);
            } else {
              ctx.fillStyle = pendingText.colorHex;
            }
            ctx.globalAlpha = pendingText.antialias ? 0.7 * coverage : 0.7;
            ctx.fillRect(px * scale, py * scale, scale, scale);
          }
        }
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "rgba(139, 92, 246, 0.9)";
        ctx.lineWidth = 1;
        ctx.strokeRect(
          pendingText.x * scale + 0.5,
          pendingText.y * scale + 0.5,
          tw * scale - 1,
          th * scale - 1,
        );
      }
    },
    [
      width,
      height,
      palette,
      showGrid,
      pendingText,
      scale,
      gradientStartHex,
      gradientEndHex,
      gradientSteps,
      gradientAngleDeg,
    ],
  );

  useEffect(() => {
    render(pixels);
  }, [pixels, selectionMask, render]);

  const toGridPoint = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const x = Math.floor(((e.clientX - rect.left) / rect.width) * width);
      const y = Math.floor(((e.clientY - rect.top) / rect.height) * height);
      if (x < 0 || y < 0 || x >= width || y >= height) return null;
      return { x, y };
    },
    [width, height],
  );

  const plotPoint = useCallback(
    (data: number[], x: number, y: number, colorIndex: number) => {
      let next = data;
      // 브러시 크기만큼 (x,y) 중심의 정사각 블록으로 확장한 뒤 각 칸을 미러링한다.
      // brushSize=1이면 기존과 동일하게 점 하나만 찍는다.
      const half = Math.floor(brushSize / 2);
      for (let dy = 0; dy < brushSize; dy++) {
        for (let dx = 0; dx < brushSize; dx++) {
          const bx = x - half + dx;
          const by = y - half + dy;
          if (bx < 0 || by < 0 || bx >= width || by >= height) continue;
          for (const p of mirrorPoints(width, height, mirror, bx, by)) {
            next = setPixel(next, width, p.x, p.y, colorIndex);
          }
        }
      }
      return next;
    },
    [width, height, mirror, brushSize],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (e.button !== 0) return;

      if (isSpaceHeld) {
        const container = viewportRef.current;
        if (container) {
          panStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            scrollLeft: container.scrollLeft,
            scrollTop: container.scrollTop,
          };
          canvasRef.current?.setPointerCapture(e.pointerId);
        }
        return;
      }

      const point = toGridPoint(e);
      if (!point) return;
      canvasRef.current?.setPointerCapture(e.pointerId);

      if (tool === "eyedropper") {
        const colorIndex = getPixel(
          workingRef.current,
          width,
          point.x,
          point.y,
        );
        if (colorIndex >= 0) onPickColor(colorIndex);
        return;
      }

      if (tool === "text") {
        if (pendingText && pendingText.text) {
          const { width: tw, height: th } = rasterizeText(
            pendingText.text,
            pendingText.fontSize,
          );
          const withinBounds =
            point.x >= pendingText.x &&
            point.x < pendingText.x + tw &&
            point.y >= pendingText.y &&
            point.y < pendingText.y + th;
          if (withinBounds) {
            textDragRef.current = {
              offsetX: point.x - pendingText.x,
              offsetY: point.y - pendingText.y,
            };
            drawingRef.current = true;
            return;
          }
        }
        onEnsureColor();
        onTextToolClick(point.x, point.y);
        return;
      }

      if (tool === "gradient") {
        onEnsureColor();
        drawingRef.current = true;
        shapeStartRef.current = point;
        gradientPreviewRef.current = {
          x0: point.x,
          y0: point.y,
          x1: point.x,
          y1: point.y,
        };
        render(workingRef.current);
        return;
      }

      if (tool === "bucket") {
        onEnsureColor();
        const next = floodFill(
          workingRef.current,
          width,
          height,
          point.x,
          point.y,
          activeColorIndex,
        );
        if (next !== workingRef.current) {
          workingRef.current = next;
          render(next);
          onStrokeEnd(next);
        }
        return;
      }

      if (tool === "wand") {
        const clicked = wandMask(
          workingRef.current,
          width,
          height,
          point.x,
          point.y,
        );
        const current = selectionMaskRef.current;
        // Shift = 기존 선택 영역에 추가, Alt/Option = 기존 선택 영역에서 제외.
        // 두 키 다 없으면 기존과 동일하게 새로 선택한 영역으로 완전히 대체한다.
        if (e.shiftKey && current) {
          onSelectionChange(new Set([...current, ...clicked]));
        } else if (e.altKey && current) {
          const next = new Set(current);
          for (const i of clicked) next.delete(i);
          onSelectionChange(next);
        } else {
          onSelectionChange(clicked);
        }
        return;
      }

      if (tool === "select") {
        shapeStartRef.current = point;
        drawingRef.current = true;
        return;
      }

      if (tool === "move" && selectionMaskRef.current) {
        lastPointRef.current = point;
        drawingRef.current = true;
        return;
      }

      if (tool === "line" || tool === "rect" || tool === "circle") {
        onEnsureColor();
        drawingRef.current = true;
        shapeStartRef.current = point;
        return;
      }

      if (tool === "pencil" || tool === "eraser") {
        if (tool === "pencil") onEnsureColor();
        drawingRef.current = true;
        lastPointRef.current = point;
        const colorIndex = tool === "eraser" ? -1 : activeColorIndex;
        const next = plotPoint(
          workingRef.current,
          point.x,
          point.y,
          colorIndex,
        );
        workingRef.current = next;
        render(next);
      }
    },
    [
      tool,
      width,
      height,
      activeColorIndex,
      isSpaceHeld,
      viewportRef,
      toGridPoint,
      plotPoint,
      render,
      onStrokeEnd,
      onEnsureColor,
      onPickColor,
      onTextToolClick,
      pendingText,
      onSelectionChange,
    ],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (panStartRef.current) {
        const container = viewportRef.current;
        if (container) {
          container.scrollLeft =
            panStartRef.current.scrollLeft -
            (e.clientX - panStartRef.current.x);
          container.scrollTop =
            panStartRef.current.scrollTop - (e.clientY - panStartRef.current.y);
        }
        return;
      }
      if (!drawingRef.current) return;

      if (tool === "text" && textDragRef.current) {
        const point = toGridPoint(e);
        if (!point) return;
        onPendingTextMove(
          point.x - textDragRef.current.offsetX,
          point.y - textDragRef.current.offsetY,
        );
        return;
      }

      if (tool === "gradient" && shapeStartRef.current) {
        const point = toGridPoint(e);
        if (!point) return;
        gradientPreviewRef.current = {
          x0: shapeStartRef.current.x,
          y0: shapeStartRef.current.y,
          x1: point.x,
          y1: point.y,
        };
        render(workingRef.current);
        return;
      }

      if (tool === "select" && shapeStartRef.current) {
        const point = toGridPoint(e);
        if (!point) return;
        const start = shapeStartRef.current;
        const minX = Math.min(start.x, point.x);
        const maxX = Math.max(start.x, point.x);
        const minY = Math.min(start.y, point.y);
        const maxY = Math.max(start.y, point.y);
        const next = new Set<number>();
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) next.add(y * width + x);
        }
        onSelectionChange(next);
        return;
      }

      if (tool === "move" && selectionMaskRef.current && lastPointRef.current) {
        const point = toGridPoint(e);
        if (!point) return;
        const dx = point.x - lastPointRef.current.x;
        const dy = point.y - lastPointRef.current.y;
        if (dx === 0 && dy === 0) return;
        const result = moveSelection(
          workingRef.current,
          width,
          height,
          selectionMaskRef.current,
          dx,
          dy,
        );
        workingRef.current = result.pixels;
        // ref를 먼저 동기 갱신해 바로 다음 pointermove(React state가 아직 반영되기 전)도
        // 항상 최신 마스크를 기준으로 계산하도록 한다.
        selectionMaskRef.current = result.mask;
        onSelectionChange(result.mask);
        lastPointRef.current = point;
        render(result.pixels);
        return;
      }

      if (tool === "line" || tool === "rect" || tool === "circle") {
        const point = toGridPoint(e);
        if (!point || !shapeStartRef.current) return;
        const start = shapeStartRef.current;
        let shapePoints: { x: number; y: number }[];
        if (tool === "line") {
          shapePoints = linePoints(start.x, start.y, point.x, point.y);
        } else if (tool === "rect") {
          shapePoints = filledShapes
            ? rectFillPoints(start.x, start.y, point.x, point.y)
            : rectOutlinePoints(start.x, start.y, point.x, point.y);
        } else {
          const radius = Math.round(
            Math.hypot(point.x - start.x, point.y - start.y),
          );
          shapePoints = filledShapes
            ? circleFillPoints(start.x, start.y, radius)
            : circleOutlinePoints(start.x, start.y, radius);
        }
        if (shapeGradientFill) {
          const expanded = expandPoints(
            shapePoints,
            width,
            height,
            mirror,
            brushSize,
          );
          const stepColors = buildGradientSteps(
            gradientStartHex,
            gradientEndHex,
            gradientSteps,
          );
          const axis = bboxGradientAxis(expanded, gradientAngleDeg);
          const kept: Point[] = [];
          const colors: string[] = [];
          for (const p of expanded) {
            const t = projectT(p.x, p.y, axis.x0, axis.y0, axis.x1, axis.y1);
            const c = stepColorAt(stepColors, t);
            if (c[3] <= 0.02) continue; // 완전히 투명한 구간은 그리지 않는다
            kept.push(p);
            colors.push(rgbaToHex(c[0], c[1], c[2], c[3]));
          }
          shapeGradientOverlayRef.current = { points: kept, colors };
          render(pixels);
          return;
        }

        let next = pixels;
        for (const p of shapePoints) {
          if (p.x < 0 || p.y < 0 || p.x >= width || p.y >= height) continue;
          next = plotPoint(next, p.x, p.y, activeColorIndex);
        }
        workingRef.current = next;
        render(next);
        return;
      }

      if (tool !== "pencil" && tool !== "eraser") return;
      const point = toGridPoint(e);
      if (!point || !lastPointRef.current) return;
      const colorIndex = tool === "eraser" ? -1 : activeColorIndex;
      let next = workingRef.current;
      for (const p of linePoints(
        lastPointRef.current.x,
        lastPointRef.current.y,
        point.x,
        point.y,
      )) {
        next = plotPoint(next, p.x, p.y, colorIndex);
      }
      lastPointRef.current = point;
      workingRef.current = next;
      render(next);
    },
    [
      tool,
      width,
      height,
      activeColorIndex,
      pixels,
      filledShapes,
      mirror,
      brushSize,
      shapeGradientFill,
      gradientStartHex,
      gradientEndHex,
      gradientSteps,
      gradientAngleDeg,
      viewportRef,
      onPendingTextMove,
      toGridPoint,
      plotPoint,
      render,
      onSelectionChange,
    ],
  );

  // 맨 앞에서 drawingRef를 한 번만 검사·소비하도록 통일한다 — pointerup 처리 후 브라우저가
  // 뒤이어 보내는 lostpointercapture(그리고 handlePointerCancel의 재사용)가 같은 제스처를
  // 두 번 커밋하지 않도록 이 함수 자체를 멱등하게 만든다.
  const handlePointerUp = useCallback(() => {
    if (panStartRef.current) {
      panStartRef.current = null;
      return;
    }
    if (!drawingRef.current) return;
    drawingRef.current = false;

    if (tool === "select") {
      shapeStartRef.current = null;
      return;
    }
    if (tool === "text") {
      textDragRef.current = null;
      return;
    }
    if (tool === "gradient") {
      const gp = gradientPreviewRef.current;
      gradientPreviewRef.current = null;
      shapeStartRef.current = null;
      render(workingRef.current);
      if (gp && (gp.x0 !== gp.x1 || gp.y0 !== gp.y1))
        onGradientToolEnd(gp.x0, gp.y0, gp.x1, gp.y1);
      return;
    }
    if (tool === "line" || tool === "rect" || tool === "circle") {
      shapeStartRef.current = null;
      if (shapeGradientFill) {
        const sg = shapeGradientOverlayRef.current;
        shapeGradientOverlayRef.current = null;
        render(pixels);
        if (sg && sg.points.length > 0) onShapeGradientEnd(sg.points);
        return;
      }
      onStrokeEnd(workingRef.current);
      return;
    }
    lastPointRef.current = null;
    onStrokeEnd(workingRef.current);
  }, [
    tool,
    shapeGradientFill,
    pixels,
    onStrokeEnd,
    onGradientToolEnd,
    onShapeGradientEnd,
    render,
  ]);

  // React의 onWheel은 리스너를 passive로 등록해 e.preventDefault()가 조용히
  // 무시된다 — Ctrl/Cmd+스크롤로 캔버스만 확대하려 해도 브라우저의 페이지 확대가
  // 함께 발동했다. addEventListener를 { passive: false }로 직접 붙여야 막힌다.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const WHEEL_ZOOM_THRESHOLD = 50;
    const handler = (e: WheelEvent) => {
      // macOS는 Cmd(metaKey), 다른 플랫폼은 Ctrl(ctrlKey) — 트랙패드 핀치 제스처는
      // 브라우저가 관례적으로 ctrlKey:true인 wheel 이벤트로 보내므로 그대로 잡힌다.
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      wheelDeltaRef.current += e.deltaY;
      if (Math.abs(wheelDeltaRef.current) < WHEEL_ZOOM_THRESHOLD) return;
      const direction = wheelDeltaRef.current < 0 ? 1 : -1;
      wheelDeltaRef.current = 0;
      onZoomChange(Math.min(8, Math.max(1, zoom + direction)));
    };
    canvas.addEventListener("wheel", handler, { passive: false });
    return () => canvas.removeEventListener("wheel", handler);
  }, [zoom, onZoomChange]);

  // 스타일러스 호버 취소, 시스템 제스처 등으로 pointerup 없이 스트로크가 끊길 때 안전하게 커밋한다.
  // handlePointerUp과 도구별 분기가 완전히 같아야 하고, 위쪽의 drawingRef 가드 덕분에 pointerup
  // 이후 뒤늦게 발생하는 lostpointercapture에 대해서도 안전하게(중복 커밋 없이) 재사용할 수 있다.
  const handlePointerCancel = handlePointerUp;

  return (
    <div className="relative inline-block">
      <canvas
        ref={canvasRef}
        className={`touch-none shadow-md ${isSpaceHeld ? "cursor-grab" : "cursor-crosshair"}`}
        style={{ imageRendering: "pixelated" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onLostPointerCapture={handlePointerCancel}
      />
      {pendingText && (
        <div
          className="absolute z-10 flex items-center gap-1 bg-white px-1.5 py-1 shadow-[0_0_0_1px_#8b5cf6]"
          style={{
            left: pendingText.x * scale,
            top: Math.max(0, pendingText.y * scale - 34),
          }}
          // 캔버스의 pointerdown이 이 오버레이 클릭까지 그리기로 잡아채지 않도록 막는다.
          onPointerDown={(e) => e.stopPropagation()}
        >
          <input
            autoFocus
            value={pendingText.text}
            onChange={(e) =>
              onPendingTextChange(e.target.value, pendingText.fontSize)
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") onPendingTextCommit();
              else if (e.key === "Escape") onPendingTextCancel();
            }}
            placeholder="텍스트"
            className="w-20 select-text bg-transparent text-xs text-gray-900 outline-none"
          />
          <button
            onClick={() =>
              onPendingTextChange(
                pendingText.text,
                Math.max(4, pendingText.fontSize - 2),
              )
            }
            title="글자 작게"
            className="flex h-4 w-4 items-center justify-center bg-gray-100 text-[10px] text-gray-600 hover:bg-gray-200"
          >
            −
          </button>
          <span className="w-6 text-center text-[9px] text-gray-500">
            {pendingText.fontSize}
          </span>
          <button
            onClick={() =>
              onPendingTextChange(
                pendingText.text,
                Math.min(64, pendingText.fontSize + 2),
              )
            }
            title="글자 크게"
            className="flex h-4 w-4 items-center justify-center bg-gray-100 text-[10px] text-gray-600 hover:bg-gray-200"
          >
            +
          </button>
          <button
            onClick={onPendingTextToggleAA}
            title="안티에일리어싱"
            className={`flex h-4 w-6 items-center justify-center text-[8px] font-semibold ${
              pendingText.antialias
                ? "bg-violet-500 text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            AA
          </button>
          <button
            onClick={onPendingTextToggleGradient}
            title="그라데이션 채우기"
            className={`flex h-4 w-6 items-center justify-center text-[8px] font-semibold ${
              pendingText.gradientFill
                ? "bg-violet-500 text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            그라
          </button>
          <button
            onClick={onPendingTextCommit}
            title="확정 (Enter)"
            className="flex h-4 w-4 items-center justify-center bg-violet-500 text-[10px] text-white hover:bg-violet-600"
          >
            ✓
          </button>
          <button
            onClick={onPendingTextCancel}
            title="취소 (Esc)"
            className="flex h-4 w-4 items-center justify-center bg-gray-100 text-[10px] text-gray-500 hover:bg-red-50 hover:text-red-500"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
