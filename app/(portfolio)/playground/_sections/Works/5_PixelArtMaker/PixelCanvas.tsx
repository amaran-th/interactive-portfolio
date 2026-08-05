"use client";

import { AlignCenter, AlignLeft, AlignRight, RotateCw } from "lucide-react";
import { RefObject, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CURSOR_DRAGGING,
  CURSOR_EW_RESIZE,
  CURSOR_GRAB,
  CURSOR_MOVE,
  CURSOR_NWSE_RESIZE,
  cursorForTool,
} from "./cursors";
import GradientDial from "./GradientDial";
import { mixHex } from "./hsv";
import Magnifier, { MAGNIFIER_RADIUS, MagnifierGrid } from "./Magnifier";
import {
  bboxGradientAxis,
  buildGradientSteps,
  projectT,
  rgbaToPixelValue,
  stepColorAt,
} from "./gradientFill";
import {
  expandPoints,
  floodFill,
  getPixel,
  lassoMask,
  linePoints,
  PixelValue,
  resamplePixelValues,
  rotatePixelValuesBy,
  setPixel,
  shapeToolPoints,
  wandMask,
  wandMaskGlobal,
} from "./pixelGrid";
import { rasterizeText, Rotation, rotateAlphaBuffer } from "./textStamp";
import { nextZoomStep, Point, SelectMode, Tool } from "./types";

export type TextAlign = "left" | "center" | "right";

export type PendingText = {
  // 정렬 기준점(앵커) — 왼쪽 정렬이면 글자가 시작하는 자리, 가운데/오른쪽
  // 정렬이면 그 정렬 기준으로 텍스트가 늘어나는 고정점이다. 실제로 화면에
  // 그려지는 왼쪽 위 좌표(drawX)는 이 값과 폭·정렬로 textDrawX가 계산한다 —
  // 타이핑 중 글자 폭이 바뀌어도 앵커는 그대로 고정된다.
  x: number;
  y: number;
  text: string;
  fontSize: number;
  colorHex: string;
  antialias: boolean;
  gradientFill: boolean;
  align: TextAlign;
  // 90도 단위 회전만 지원한다 — 임의 각도는 픽셀아트에 필요한 보간이
  // 가장자리를 뭉개거나 계단 현상을 만든다.
  rotation: Rotation;
};

// 정렬 기준점(anchorX)과 지금 텍스트 폭으로 실제 왼쪽 위 x좌표를 구한다 —
// 미리보기(PixelCanvas)와 확정(Editor의 commitPendingText)이 항상 같은
// 계산을 쓰도록 한 곳에 모아 둔다.
export function textDrawX(
  anchorX: number,
  textWidth: number,
  align: TextAlign,
): number {
  if (align === "center") return anchorX - Math.floor(textWidth / 2);
  if (align === "right") return anchorX - textWidth;
  return anchorX;
}

// 이미 그려진 캔버스에 이미지를 불러오면, 텍스트처럼 바로 픽셀에 굽지 않고
// 위치·크기를 조절할 수 있는 상태로 띄운다 — srcWidth/srcHeight는 원본
// 해상도(불러온 그대로), width/height는 지금 배치된 목표 크기(드래그로 조절
// 가능)다. pixels는 항상 원본 해상도 기준이라, 크기가 바뀔 때마다
// resamplePixelValues로 다시 맞춰 미리보기·확정에 쓴다. rotation도 같은 이유로
// 원본 기준 각도를 저장하고, 미리보기·확정 시점에 매번 적용한다.
export type PendingImage = {
  x: number;
  y: number;
  width: number;
  height: number;
  srcWidth: number;
  srcHeight: number;
  pixels: PixelValue[];
  rotation: Rotation;
};

// 직선·사각형·원도 텍스트·이미지처럼 드래그가 끝나도 바로 픽셀에 굽지 않고
// 위치·크기를 계속 조절할 수 있는 상태로 띄운다 — 두 정의점(x0,y0)-(x1,y1)만
// 있으면 채움/그라데이션 여부·브러시 크기 등 나머지는 항상 최신 도구 설정을
// 그대로 읽어와 미리보기·확정에 쓴다(설정을 스냅샷으로 얼려두지 않는다) —
// 그래야 확정 전에 채우기·그라데이션 방향을 이리저리 바꿔가며 미리 볼 수 있다.
export type PendingShape = {
  tool: "line" | "rect" | "circle";
  x0: number;
  y0: number;
  x1: number;
  y1: number;
};

// 스포이트처럼 "잠깐 켜서 한 번 쓰는" 특수 도구 — 우클릭하면 브라우저 기본
// 컨텍스트 메뉴 대신 기본 도구(선택)로 되돌아간다.
const SPECIAL_TOOLS: Tool[] = ["eyedropper"];

// scale이 정수가 아니면(뷰포트에 맞춘 배율은 대부분 소수) x*scale, (x+1)*scale이
// 정수 픽셀 경계에 딱 떨어지지 않아, 이웃한 칸의 fillRect 가장자리가 서로 어긋나며
// 안티에일리어싱된 실선이 생겼다 — 그리드를 꺼도 격자무늬처럼 보이던 원인. 각
// 변을 미리 반올림해 이웃 칸끼리 경계가 정확히 맞닿게 한다.
function cellRect(x: number, y: number, scale: number) {
  const left = Math.round(x * scale);
  const top = Math.round(y * scale);
  return {
    left,
    top,
    width: Math.round((x + 1) * scale) - left,
    height: Math.round((y + 1) * scale) - top,
  };
}

export default function PixelCanvas({
  width,
  height,
  pixels,
  tool,
  onToolChange,
  activeColorHex,
  selectionMask,
  selectMode,
  showGrid,
  showCrosshair,
  brushSize,
  filledShapes,
  onSelectionChange,
  onStrokeEnd,
  onPickColor,
  onTextToolClick,
  pendingText,
  onPendingTextChange,
  onPendingTextMove,
  onPendingTextToggleAA,
  onPendingTextToggleGradient,
  onPendingTextSetAlign,
  onPendingTextRotate,
  onPendingTextCommit,
  onPendingTextCancel,
  onGradientToolEnd,
  shapeGradientFill,
  gradientStartHex,
  gradientEndHex,
  gradientSteps,
  gradientAngleDeg,
  onGradientStepsChange,
  onGradientAngleChange,
  zoom,
  onZoomChange,
  viewportRef,
  wandGlobal,
  pendingImage,
  onPendingImageMove,
  onPendingImageResize,
  onPendingImageRotate,
  onPendingImageCommit,
  onPendingImageCancel,
  pendingShape,
  onShapeDragEnd,
  onPendingShapeUpdate,
  onPendingShapeCommit,
  onPendingShapeCancel,
  bottomToolbarPortalTarget,
}: {
  width: number;
  height: number;
  pixels: PixelValue[];
  tool: Tool;
  // 스포이트처럼 "잠깐 켜서 한 번 쓰는" 특수 도구는 우클릭하면 곧바로 기본
  // 도구(선택)로 돌아간다 — 우클릭 자체는 그리기 동작과 무관하므로
  // handlePointerDown이 아니라 별도의 contextmenu 핸들러에서 처리한다.
  onToolChange: (tool: Tool) => void;
  activeColorHex: string;
  selectionMask: Set<number> | null;
  // Shift/Alt를 누르고 있지 않아도 버튼으로 "추가"/"제외" 모드를 켜 둘 수
  // 있게 한다 — 실제 판정은 각 드래그 핸들러에서 이 값과 e.shiftKey/e.altKey를
  // OR로 합쳐서 쓴다(둘 중 하나만 참이어도 추가/제외로 취급).
  selectMode: SelectMode;
  showGrid: boolean;
  showCrosshair: boolean;
  brushSize: number;
  filledShapes: boolean;
  onSelectionChange: (mask: Set<number> | null) => void;
  // moveOriginalMask는 이동 도구로 커밋할 때만 채워진다(이동을 시작하기 전
  // 선택 영역) — 되돌리기가 픽셀과 함께 선택 영역도 이동 전 자리로 되돌릴
  // 수 있도록 Editor에 넘겨준다. 다른 조작(그리기 등)은 생략해 선택 영역과
  // 무관함을 나타낸다.
  onStrokeEnd: (
    next: PixelValue[],
    moveOriginalMask?: Set<number> | null,
  ) => void;
  onPickColor: (color: string) => void;
  // 텍스트 도구로 캔버스를 클릭했을 때(그리드 좌표) — pendingText가 없으면 그
  // 자리에 새로 시작하고, 있으면(경계 밖 클릭) Editor가 먼저 커밋한 뒤 새로
  // 시작한다.
  onTextToolClick: (x: number, y: number) => void;
  // 아직 확정하지 않은 텍스트 — 캔버스 위에 인라인 입력·반투명 미리보기로
  // 보여주고, 그 경계 안을 드래그하면 이동만 한다(모달 없이 캔버스 안에서
  // 이동·크기조절·타이핑이 끝나면 Enter/포커스 아웃/도구 전환 시 커밋).
  pendingText: PendingText | null;
  onPendingTextChange: (text: string, fontSize: number) => void;
  onPendingTextMove: (x: number, y: number) => void;
  onPendingTextToggleAA: () => void;
  onPendingTextToggleGradient: () => void;
  onPendingTextSetAlign: (align: TextAlign) => void;
  onPendingTextRotate: () => void;
  onPendingTextCommit: () => void;
  onPendingTextCancel: () => void;
  // 그라데이션 드래그가 끝났을 때(시작·끝 그리드 좌표).
  onGradientToolEnd: (x0: number, y0: number, x1: number, y1: number) => void;
  // 직선·사각형·원을 단색 대신 그라데이션으로 채운다.
  shapeGradientFill: boolean;
  gradientStartHex: string;
  gradientEndHex: string;
  gradientSteps: number;
  gradientAngleDeg: number;
  // 텍스트 도구의 그라데이션 채우기도 같은 전역 단계·각도를 쓴다 — 하단 중앙
  // 툴바에서 도형 도구와 동일한 컨트롤(GradientDial)로 직접 조절할 수 있게
  // Editor의 setter를 그대로 받는다.
  onGradientStepsChange: (steps: number) => void;
  onGradientAngleChange: (deg: number) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  // 확대 상태에서 스페이스+드래그로 스크롤할 대상 — 이 캔버스를 감싼 overflow-auto
  // 뷰포트 컨테이너의 ref를 Editor가 그대로 내려준다.
  viewportRef: RefObject<HTMLDivElement | null>;
  // true면 마법봉이 이어진 영역이 아니라 캔버스 전체에서 같은 색을 모두 선택한다.
  wandGlobal: boolean;
  // 이미 그려진 캔버스에 이미지를 불러왔을 때 — 텍스트처럼 위치·크기를 조절한
  // 뒤 확정해야 실제 픽셀에 반영된다(합성 방식이라 밑에 있던 그림은 지워지지
  // 않는다).
  pendingImage: PendingImage | null;
  onPendingImageMove: (x: number, y: number) => void;
  onPendingImageResize: (width: number, height: number) => void;
  onPendingImageRotate: () => void;
  onPendingImageCommit: () => void;
  onPendingImageCancel: () => void;
  // 직선·사각형·원 드래그가 끝나면(0 크기가 아닐 때만) 확정 전 상태로 띄운다 —
  // 이미 다른 pendingShape가 떠 있었다면 그것부터 커밋한 뒤 새로 시작한다.
  pendingShape: PendingShape | null;
  onShapeDragEnd: (
    tool: "line" | "rect" | "circle",
    x0: number,
    y0: number,
    x1: number,
    y1: number,
  ) => void;
  onPendingShapeUpdate: (next: PendingShape) => void;
  onPendingShapeCommit: () => void;
  onPendingShapeCancel: () => void;
  // 텍스트 편집 툴바도 그리기/선택 하위 옵션과 같은 자리(캔버스 하단 중앙)에
  // 뜨게 한다 — DrawToolbar가 쓰는 것과 같은 포털 타겟을 그대로 받는다.
  bottomToolbarPortalTarget: HTMLDivElement | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // 트랙패드 스크롤/핀치는 짧은 시간 안에 작은 deltaY를 가진 wheel 이벤트를 수십 번
  // 쏟아낸다 — 이벤트 하나당 배율을 한 단계씩 바꾸면 살짝만 스크롤해도 확대가
  // 급격히 튀었다. deltaY를 누적해 일정 값을 넘을 때만 한 단계 바꾸도록 한다.
  const wheelDeltaRef = useRef(0);
  const workingRef = useRef<PixelValue[]>(pixels);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const shapeStartRef = useRef<{ x: number; y: number } | null>(null);
  // 사각형 선택 드래그를 시작하기 직전의 선택 영역 — Shift(추가)/Alt(제외)
  // 드래그가 매 프레임 새로 계산한 사각형을 이 스냅샷과 합치거나 뺀다.
  const selectBaseMaskRef = useRef<Set<number> | null>(null);
  // 올가미 드래그 중 지나온 경로(그리드 좌표) — 손을 뗀 시점에 이 경로 자체를
  // 다각형으로 보고 내부를 선택 영역으로 채운다. 드래그 중에는 미리보기로
  // 이 경로를 선으로 그려 보여준다.
  const lassoPointsRef = useRef<Point[]>([]);
  // 마스크는 손을 뗀 시점에 한 번만 계산되므로, 드래그 시작 시점의 Shift/Alt와
  // selectMode를 그대로 기억해뒀다가 그때 합칠지/뺄지를 정한다.
  const lassoModeRef = useRef<SelectMode>("new");
  const drawingRef = useRef(false);
  // 선택 영역 이동 중에는 매 pointermove마다 조금씩 옮기지 않는다 — 옛 구현은
  // 그렇게 해서 (1) 이동 경로에 있던(선택 밖) 픽셀이 덮여 사라지고, (2) 캔버스
  // 밖으로 나간 칸은 마스크에서 아예 빠져 다시 안으로 들여와도 복원되지
  // 않았다. 대신 드래그를 시작할 때 선택 내용을 "들어올려"(원래 자리를 null로
  // 비운 바탕과, 각 칸의 원래 좌표·색을 따로) 한 번만 기록해두고, 매
  // pointermove마다 시작점 기준 누적 이동량으로 이 바탕 위에 항상 새로
  // 그린다 — 그래서 어디를 지나가도 원래 있던 내용이 사라지지 않고, 경계
  // 밖으로 나갔던 칸도 다시 들어오면 그대로 복원된다.
  const moveBaseRef = useRef<PixelValue[] | null>(null);
  const moveContentRef = useRef<
    { x: number; y: number; color: PixelValue }[] | null
  >(null);
  const moveStartPointRef = useRef<{ x: number; y: number } | null>(null);
  // 이동을 시작하기 직전(옮기기 전) 선택 영역 — 커밋 시 onStrokeEnd에 함께
  // 실어 보내면, 되돌리기가 픽셀뿐 아니라 선택 영역도 이동 전 자리로 같이
  // 되돌릴 수 있다(안 그러면 픽셀만 원래대로 돌아가고 선택 영역은 옮겨진
  // 자리에 그대로 남아 어긋나 보였다).
  const moveOriginalMaskRef = useRef<Set<number> | null>(null);
  // 확대된 상태에서는 캔버스가 뷰포트보다 커져 화면을 옮겨볼 방법이 필요하다 —
  // 스페이스바를 누른 채 드래그하면(포토샵·Aseprite와 같은 관례) 그리기 대신
  // 뷰포트(부모 컨테이너)를 스크롤한다.
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);
  // 실제로 화면을 옮기는 중인지(스페이스만 누른 상태와 구분) — 커서를
  // "쥐기 전(grab)"과 "쥐고 있는 중(grabbing)"으로 다르게 보여주는 데만 쓴다.
  const [isPanning, setIsPanning] = useState(false);
  // 스포이트 도구일 때만 커서를 따라다니는 확대경 — 그리드 좌표(색을 샘플링할
  // 위치)와 화면 좌표(확대경 자체를 띄울 위치)를 함께 들고 있는다.
  const [eyedropperHover, setEyedropperHover] = useState<{
    x: number;
    y: number;
    screenX: number;
    screenY: number;
  } | null>(null);
  const panStartRef = useRef<{
    x: number;
    y: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);
  // 그라데이션 도구는 드래그 중 실제 픽셀은 건드리지 않는다(실제 채우기는 커밋
  // 시점에 Editor가 처리) — 드래그 축만 얇은 선으로 미리 보여준다.
  const gradientPreviewRef = useRef<{
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  } | null>(null);
  // 직선·사각형·원도 텍스트·이미지처럼 드래그 중에는 실제 픽셀(workingRef)을
  // 건드리지 않는다 — 정의 중인 두 점만 여기 담아두고, 손을 떼면 이 값 그대로
  // pendingShape(props)가 되어 커밋 전까지 계속 조절할 수 있다. 렌더링은 이
  // 드래그 중 draft와 pendingShape 둘 중 있는 쪽을 그대로 미리보기로 쓴다.
  const shapeDraftRef = useRef<PendingShape | null>(null);
  // pendingShape 몸통(이동) 드래그 — 클릭 지점과 두 정의점 사이 오프셋을
  // 유지한 채 둘 다 같은 양만큼 옮긴다.
  const shapeMoveRef = useRef<{
    startPointerX: number;
    startPointerY: number;
    startX0: number;
    startY0: number;
    startX1: number;
    startY1: number;
  } | null>(null);
  // pendingShape 손잡이(크기 조절) 드래그 — 어느 정의점(0=x0y0, 1=x1y1)을
  // 옮기는 중인지만 있으면 된다(그 점을 그대로 포인터 좌표로 옮긴다).
  const shapeHandleRef = useRef<0 | 1 | null>(null);
  // pendingText 경계 안을 클릭해 드래그를 시작하면, 클릭 지점과 텍스트 원점 사이의
  // 오프셋을 기억해 마우스를 따라 자연스럽게 이동하도록 한다.
  const textDragRef = useRef<{ offsetX: number; offsetY: number } | null>(null);
  // pendingImage 이동 드래그 — 클릭 지점과 이미지 원점 사이 오프셋(그리드 단위).
  const imageDragRef = useRef<{ offsetX: number; offsetY: number } | null>(
    null,
  );
  // pendingImage 크기 조절 드래그 — 시작 시점의 포인터 좌표와 그때의 width/height.
  const imageResizeRef = useRef<{
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);
  // selectionMask 프롭은 React state를 거쳐 비동기로 갱신되므로, 빠른 연속 pointermove
  // 동안 오래된(stale) 값을 참조해 move 드래그가 잘못된 위치를 지우는 문제(자취 남음)가
  // 있었다. workingRef와 같은 패턴으로 항상 최신 값을 담는 ref를 별도로 둔다.
  const selectionMaskRef = useRef<Set<number> | null>(selectionMask);
  // 배율 1이 "화면에 캔버스 전체가 꽉 차게 보이는 크기"가 되도록, 뷰포트
  // 컨테이너의 실제 크기를 재서 셀 하나당 몇 px이어야 딱 맞는지 계산해둔다.
  // 캔버스 크기·뷰포트 크기가 바뀔 때마다(사이드바 접힘, 창 크기 조절 등)
  // ResizeObserver로 다시 계산한다.
  const [fitScale, setFitScale] = useState(16);
  useEffect(() => {
    const container = viewportRef.current;
    if (!container) return;
    const update = () => {
      const availW = container.clientWidth;
      const availH = container.clientHeight;
      if (availW === 0 || availH === 0) return;
      setFitScale(Math.min(availW / width, availH / height));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(container);
    return () => ro.disconnect();
  }, [viewportRef, width, height]);
  // 텍스트 도구의 인라인 입력을 캔버스 좌표계에 절대 위치시키는 데도 쓰인다.
  const scale = fitScale * zoom;

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
    (data: PixelValue[]) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const color = getPixel(data, width, x, y);
          if (color === null) continue;
          // PixelValue는 완전 불투명이면 6자리(#rrggbb), 알파가 있으면
          // 8자리(#rrggbbaa) hex다 — Canvas2D의 fillStyle이 8자리 hex를
          // 그대로 지원하므로, 굳이 미리 섞지 않고 그대로 그리면 캔버스가
          // 그 뒤(=canvasBgColor로 칠해진 실제 배경)와 알아서 정확히 합성한다.
          // 예전엔 체크무늬 배경이 비쳐 보이는 문제를 피하려 흰색과 미리 섞어
          // 그렸는데, 체크무늬 자체를 없앤 지금은 어떤 배경색을 고르든 그
          // 색과 합성돼야 하므로(흰색 고정 X) 그 코드가 오히려 틀렸다.
          ctx.fillStyle = color;
          const r = cellRect(x, y, scale);
          ctx.fillRect(r.left, r.top, r.width, r.height);
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
      // 캔버스 중앙을 지나는 고정 십자선 — 구도를 좌우/상하 대칭으로 잡을 때
      // 쓰는 보조선이다. canvasBgColor를 자유롭게 바꿀 수 있어 고정 회색으로는
      // 어두운 배경에서 안 보이는 문제가 있었다 — difference 블렌드로 그리면
      // 밑바탕 색을 반전시켜서 배경이 무슨 색이든 항상 대비가 생긴다. 0.5를
      // 더해 반픽셀 경계에 걸치게 하면 1px 선이 안티에일리어싱 없이 또렷하다.
      if (showCrosshair) {
        const cx = Math.round(canvas.width / 2) + 0.5;
        const cy = Math.round(canvas.height / 2) + 0.5;
        ctx.save();
        ctx.globalCompositeOperation = "difference";
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx, 0);
        ctx.lineTo(cx, canvas.height);
        ctx.moveTo(0, cy);
        ctx.lineTo(canvas.width, cy);
        ctx.stroke();
        ctx.restore();
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
          const r = cellRect(x, y, scale);
          ctx.fillRect(r.left, r.top, r.width, r.height);
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

      // 올가미 드래그 중인 경로 — 아직 확정 전이라 지나온 자취를 선으로만
      // 보여준다(마지막 점과 시작점을 이어 닫힌 도형이 될 모양을 미리 보여준다).
      const lassoPath = lassoPointsRef.current;
      if (lassoPath.length > 1) {
        ctx.strokeStyle = "rgba(139, 92, 246, 0.9)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(
          lassoPath[0].x * scale + scale / 2,
          lassoPath[0].y * scale + scale / 2,
        );
        for (let i = 1; i < lassoPath.length; i++) {
          ctx.lineTo(
            lassoPath[i].x * scale + scale / 2,
            lassoPath[i].y * scale + scale / 2,
          );
        }
        ctx.closePath();
        ctx.stroke();
      }

      // 확정 전(또는 지금 막 정의하는 중인) 직선·사각형·원 — 실제 픽셀은 아직
      // 건드리지 않는다. 채움·그라데이션 여부는 스냅샷이 아니라 지금 이 순간의
      // filledShapes/shapeGradientFill을 그대로 읽어, 확정 전에 토글을 바꾸면
      // 미리보기도 바로 따라 바뀐다(그라데이션 방향도 마찬가지).
      const shapePreview = pendingShape ?? shapeDraftRef.current;
      if (shapePreview) {
        const shapePoints = shapeToolPoints(
          shapePreview.tool,
          shapePreview.x0,
          shapePreview.y0,
          shapePreview.x1,
          shapePreview.y1,
          filledShapes,
        );
        const expanded = expandPoints(shapePoints, width, height, brushSize);
        ctx.globalAlpha = 0.75;
        if (shapeGradientFill) {
          const stepColors = buildGradientSteps(
            gradientStartHex,
            gradientEndHex,
            gradientSteps,
          );
          const axis = bboxGradientAxis(expanded, gradientAngleDeg);
          for (const p of expanded) {
            const t = projectT(p.x, p.y, axis.x0, axis.y0, axis.x1, axis.y1);
            const hex = rgbaToPixelValue(stepColorAt(stepColors, t));
            if (hex === null) continue;
            ctx.fillStyle = hex;
            const r = cellRect(p.x, p.y, scale);
            ctx.fillRect(r.left, r.top, r.width, r.height);
          }
        } else {
          ctx.fillStyle = activeColorHex;
          for (const p of expanded) {
            const r = cellRect(p.x, p.y, scale);
            ctx.fillRect(r.left, r.top, r.width, r.height);
          }
        }
        ctx.globalAlpha = 1;

        const radius = Math.round(
          Math.hypot(
            shapePreview.x1 - shapePreview.x0,
            shapePreview.y1 - shapePreview.y0,
          ),
        );
        const boxMinX =
          shapePreview.tool === "circle"
            ? shapePreview.x0 - radius
            : Math.min(shapePreview.x0, shapePreview.x1);
        const boxMinY =
          shapePreview.tool === "circle"
            ? shapePreview.y0 - radius
            : Math.min(shapePreview.y0, shapePreview.y1);
        const boxMaxX =
          shapePreview.tool === "circle"
            ? shapePreview.x0 + radius
            : Math.max(shapePreview.x0, shapePreview.x1);
        const boxMaxY =
          shapePreview.tool === "circle"
            ? shapePreview.y0 + radius
            : Math.max(shapePreview.y0, shapePreview.y1);
        ctx.strokeStyle = "rgba(139, 92, 246, 0.9)";
        ctx.lineWidth = 1;
        ctx.strokeRect(
          boxMinX * scale + 0.5,
          boxMinY * scale + 0.5,
          (boxMaxX - boxMinX + 1) * scale - 1,
          (boxMaxY - boxMinY + 1) * scale - 1,
        );
      }

      // 확정 전 텍스트 — 반투명으로 그려 아직 커밋되지 않았다는 걸 보여주고,
      // 경계를 얇은 사각형으로 표시해 드래그 가능한 영역임을 알려준다. gradientFill이면
      // 칸마다 정확한 그라데이션 색을 쓰고, antialias면 글자 가장자리의 커버리지
      // 비율만큼 더 옅게 그려 부드러운 느낌을 미리 보여준다.
      if (pendingText && pendingText.text) {
        const raw = rasterizeText(
          pendingText.text,
          pendingText.fontSize,
          pendingText.align,
        );
        const {
          width: tw,
          height: th,
          alpha,
        } = rotateAlphaBuffer(
          raw.alpha,
          raw.width,
          raw.height,
          pendingText.rotation,
        );
        const drawX = textDrawX(pendingText.x, tw, pendingText.align);
        const stepColors = pendingText.gradientFill
          ? buildGradientSteps(gradientStartHex, gradientEndHex, gradientSteps)
          : null;
        const axis =
          stepColors &&
          bboxGradientAxis(
            [
              { x: drawX, y: pendingText.y },
              { x: drawX + tw, y: pendingText.y + th },
            ],
            gradientAngleDeg,
          );
        // 확정(commitPendingText)과 정확히 같은 규칙으로 그린다 — 안티에일리어싱을
        // 껐을 때는 절반 이상 덮인 칸만 완전 불투명으로, 켰을 때는 실제 밑바탕
        // 색과 커버리지 비율로 섞은 색을 "미리보기 흐림" 없이 그대로 그려야
        // 확정 후 픽셀과 미리보기가 어긋나지 않는다.
        for (let ty = 0; ty < th; ty++) {
          for (let tx = 0; tx < tw; tx++) {
            const coverage = alpha[ty * tw + tx] / 255;
            if (coverage === 0) continue;
            if (!pendingText.antialias && coverage <= 0.5) continue;
            const px = drawX + tx;
            const py = pendingText.y + ty;
            if (px < 0 || py < 0 || px >= width || py >= height) continue;
            let fgHex: string;
            if (stepColors && axis) {
              const t = projectT(px, py, axis.x0, axis.y0, axis.x1, axis.y1);
              const hex = rgbaToPixelValue(stepColorAt(stepColors, t));
              if (hex === null) continue;
              fgHex = hex;
            } else {
              fgHex = pendingText.colorHex;
            }
            if (pendingText.antialias) {
              const bgHex = getPixel(data, width, px, py) ?? "#ffffff";
              ctx.fillStyle = mixHex(bgHex, fgHex, coverage);
            } else {
              ctx.fillStyle = fgHex;
            }
            const r = cellRect(px, py, scale);
            ctx.fillRect(r.left, r.top, r.width, r.height);
          }
        }
        ctx.strokeStyle = "rgba(139, 92, 246, 0.9)";
        ctx.lineWidth = 1;
        ctx.strokeRect(
          drawX * scale + 0.5,
          pendingText.y * scale + 0.5,
          tw * scale - 1,
          th * scale - 1,
        );
      }

      // 확정 전 이미지 — 지금 배치·크기로 원본을 리샘플링해 반투명하게 미리
      // 보여준다. 아직 실제 픽셀에는 없는 내용이라 커밋 전까지는 언제든 취소해도
      // 밑그림에 영향이 없다.
      if (pendingImage) {
        const rotated = rotatePixelValuesBy(
          pendingImage.pixels,
          pendingImage.srcWidth,
          pendingImage.srcHeight,
          pendingImage.rotation,
        );
        const resampled = resamplePixelValues(
          rotated.pixels,
          rotated.width,
          rotated.height,
          pendingImage.width,
          pendingImage.height,
        );
        ctx.globalAlpha = 0.75;
        for (let ty = 0; ty < pendingImage.height; ty++) {
          for (let tx = 0; tx < pendingImage.width; tx++) {
            const color = resampled[ty * pendingImage.width + tx];
            if (color === null) continue;
            const px = pendingImage.x + tx;
            const py = pendingImage.y + ty;
            if (px < 0 || py < 0 || px >= width || py >= height) continue;
            ctx.fillStyle = color;
            const r = cellRect(px, py, scale);
            ctx.fillRect(r.left, r.top, r.width, r.height);
          }
        }
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "rgba(139, 92, 246, 0.9)";
        ctx.lineWidth = 1;
        ctx.strokeRect(
          pendingImage.x * scale + 0.5,
          pendingImage.y * scale + 0.5,
          pendingImage.width * scale - 1,
          pendingImage.height * scale - 1,
        );
      }
    },
    [
      width,
      height,
      showGrid,
      showCrosshair,
      pendingText,
      pendingImage,
      pendingShape,
      filledShapes,
      shapeGradientFill,
      brushSize,
      activeColorHex,
      scale,
      gradientStartHex,
      gradientEndHex,
      gradientSteps,
      gradientAngleDeg,
    ],
  );

  // pixels가 아니라 workingRef.current를 그린다 — 선택 영역을 옮기는 동안처럼
  // 아직 history에 커밋하지 않아 pixels prop은 그대로인데 selectionMask만
  // 계속 바뀌는 경우, 이 effect가 옛 pixels로 다시 그려 방금 그린 미리보기를
  // 덮어써 깜빡이는 문제가 있었다. workingRef.current는 그런 상황에서도 항상
  // 최신 상태를 담고 있다(그 밖의 경우엔 pixels와 같은 값으로 동기화돼 있다).
  useEffect(() => {
    render(workingRef.current);
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

  // toGridPoint와 달리 캔버스 밖으로 나간 좌표도 거부하지 않고 그대로 돌려준다
  // — 선택 영역을 옮기는 동안 포인터가 캔버스 경계를 살짝 넘어가도 이동량
  // 계산이 멈추지 않게 하려는 용도다(실제 칸 배치는 나중에 각자 범위를 검사).
  // clientX/Y만 쓰므로 캔버스뿐 아니라 pendingImage 오버레이(div)의 pointer
  // 이벤트에서도 그대로 재사용할 수 있게 특정 엘리먼트 타입에 매이지 않는다.
  const toRawGridPoint = useCallback(
    (e: { clientX: number; clientY: number }) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const x = Math.floor(((e.clientX - rect.left) / rect.width) * width);
      const y = Math.floor(((e.clientY - rect.top) / rect.height) * height);
      return { x, y };
    },
    [width, height],
  );

  const plotPoint = useCallback(
    (data: PixelValue[], x: number, y: number, color: PixelValue) => {
      let next = data;
      // 브러시 크기만큼 (x,y) 중심의 정사각 블록으로 확장해 찍는다. brushSize=1이면
      // 기존과 동일하게 점 하나만 찍는다.
      const half = Math.floor(brushSize / 2);
      for (let dy = 0; dy < brushSize; dy++) {
        for (let dx = 0; dx < brushSize; dx++) {
          const bx = x - half + dx;
          const by = y - half + dy;
          if (bx < 0 || by < 0 || bx >= width || by >= height) continue;
          next = setPixel(next, width, bx, by, color);
        }
      }
      return next;
    },
    [width, height, brushSize],
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
          setIsPanning(true);
        }
        return;
      }

      const point = toGridPoint(e);
      if (!point) return;
      canvasRef.current?.setPointerCapture(e.pointerId);

      if (tool === "eyedropper") {
        const color = getPixel(workingRef.current, width, point.x, point.y);
        if (color !== null) onPickColor(color);
        return;
      }

      if (tool === "text") {
        if (pendingText && pendingText.text) {
          const raw = rasterizeText(
          pendingText.text,
          pendingText.fontSize,
          pendingText.align,
        );
          // 회전이 90/270이면 실제로 보이는 경계 상자의 가로세로가 바뀐다 —
          // 알파 버퍼 전체를 돌릴 필요 없이 치수만 맞바꾸면 된다.
          const tw =
            pendingText.rotation === 90 || pendingText.rotation === 270
              ? raw.height
              : raw.width;
          const th =
            pendingText.rotation === 90 || pendingText.rotation === 270
              ? raw.width
              : raw.height;
          const drawX = textDrawX(pendingText.x, tw, pendingText.align);
          const withinBounds =
            point.x >= drawX &&
            point.x < drawX + tw &&
            point.y >= pendingText.y &&
            point.y < pendingText.y + th;
          if (withinBounds) {
            // 오프셋은 화면에 보이는 상자(drawX)가 아니라 정렬 기준점(x) 기준으로
            // 잡는다 — 그래야 이동 중 onPendingTextMove가 그대로 새 기준점을
            // 돌려주기만 하면 되고, 정렬에 따라 달라지는 drawX 계산은 신경 쓸
            // 필요가 없다.
            textDragRef.current = {
              offsetX: point.x - pendingText.x,
              offsetY: point.y - pendingText.y,
            };
            drawingRef.current = true;
            return;
          }
        }
        // 캔버스는 포커스를 받을 수 있는 요소가 아니라, preventDefault 없이
        // 두면 이 mousedown의 기본 동작이 "포커스 없음"으로 처리돼 방금
        // 새로 띄운 텍스트 입력의 autoFocus를 도로 빼앗아 갔다.
        e.preventDefault();
        onTextToolClick(point.x, point.y);
        return;
      }

      if (tool === "gradient") {
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
        const next = floodFill(
          workingRef.current,
          width,
          height,
          point.x,
          point.y,
          activeColorHex,
        );
        if (next !== workingRef.current) {
          workingRef.current = next;
          render(next);
          onStrokeEnd(next);
        }
        return;
      }

      if (tool === "wand") {
        // wandGlobal이면 이어져 있는지와 무관하게 캔버스 전체에서 같은 색을
        // 모두 고른다 — 화면 곳곳에 흩어 칠한 같은 색을 한 번에 선택해 일괄
        // 색상 수정 같은 작업에 쓰기 위함이다.
        const clicked = wandGlobal
          ? wandMaskGlobal(workingRef.current, width, point.x, point.y)
          : wandMask(workingRef.current, width, height, point.x, point.y);
        const current = selectionMaskRef.current;
        // Shift(또는 "추가" 모드 버튼) = 기존 선택 영역에 추가, Alt/Option(또는
        // "제외" 모드 버튼) = 기존 선택 영역에서 제외. 둘 다 아니면 기존과
        // 동일하게 새로 선택한 영역으로 완전히 대체한다.
        if ((e.shiftKey || selectMode === "add") && current) {
          onSelectionChange(new Set([...current, ...clicked]));
        } else if ((e.altKey || selectMode === "subtract") && current) {
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
        // 드래그를 시작하기 직전의 선택 영역을 스냅샷으로 남겨둔다 — Shift(추가)/
        // Alt(제외) 드래그는 매 프레임 사각형을 처음부터 다시 계산하면서 이
        // 스냅샷과 합치거나 빼는 식으로 동작해야, 드래그 도중 사각형이 줄어들 때
        // 이미 추가/제외된 부분이 사라지지 않는다.
        selectBaseMaskRef.current = selectionMaskRef.current;
        drawingRef.current = true;
        return;
      }

      if (tool === "lasso") {
        lassoPointsRef.current = [point];
        selectBaseMaskRef.current = selectionMaskRef.current;
        lassoModeRef.current = e.shiftKey
          ? "add"
          : e.altKey
            ? "subtract"
            : selectMode;
        drawingRef.current = true;
        return;
      }

      if (tool === "move" && selectionMaskRef.current) {
        // 선택 내용을 "들어올린다" — 원래 좌표·색을 따로 기록하고, 바탕에서는
        // 그 자리를 비운다. 드래그 내내 이 스냅샷만 기준으로 다시 그리므로
        // 지나가는 길에 있던 다른 픽셀이 사라지지 않는다.
        const mask = selectionMaskRef.current;
        const base = workingRef.current.slice();
        const content: { x: number; y: number; color: PixelValue }[] = [];
        mask.forEach((i) => {
          const x = i % width;
          const y = Math.floor(i / width);
          content.push({
            x,
            y,
            color: getPixel(workingRef.current, width, x, y),
          });
          base[i] = null;
        });
        moveOriginalMaskRef.current = mask;
        moveBaseRef.current = base;
        moveContentRef.current = content;
        moveStartPointRef.current = point;
        drawingRef.current = true;
        return;
      }

      if (tool === "line" || tool === "rect" || tool === "circle") {
        // 이미 확정 전 도형이 떠 있는 채로 새로 드래그를 시작하면(텍스트 도구와
        // 같은 관례) 그것부터 먼저 굽고 새로 시작한다.
        if (pendingShape) onPendingShapeCommit();
        drawingRef.current = true;
        shapeStartRef.current = point;
        return;
      }

      if (tool === "pencil" || tool === "eraser") {
        drawingRef.current = true;
        lastPointRef.current = point;
        const color = tool === "eraser" ? null : activeColorHex;
        const next = plotPoint(workingRef.current, point.x, point.y, color);
        workingRef.current = next;
        render(next);
      }
    },
    [
      tool,
      width,
      height,
      activeColorHex,
      isSpaceHeld,
      viewportRef,
      toGridPoint,
      plotPoint,
      render,
      onStrokeEnd,
      onPickColor,
      onTextToolClick,
      pendingText,
      onSelectionChange,
      wandGlobal,
      selectMode,
      pendingShape,
      onPendingShapeCommit,
    ],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (tool === "eyedropper") {
        const point = toGridPoint(e);
        setEyedropperHover(
          point
            ? { x: point.x, y: point.y, screenX: e.clientX, screenY: e.clientY }
            : null,
        );
      }
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
        const rect = new Set<number>();
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) rect.add(y * width + x);
        }
        // Shift(또는 "추가" 모드 버튼) = 드래그 시작 전 선택 영역에 추가,
        // Alt/Option(또는 "제외" 모드 버튼) = 그 영역에서 제외. 매번 사각형을
        // 처음부터 새로 계산해 base와 합치므로, 드래그 중 사각형이 줄어들어도
        // 이미 추가/제외된 부분은 그대로 유지된다.
        const base = selectBaseMaskRef.current;
        if ((e.shiftKey || selectMode === "add") && base) {
          onSelectionChange(new Set([...base, ...rect]));
        } else if ((e.altKey || selectMode === "subtract") && base) {
          const next = new Set(base);
          for (const i of rect) next.delete(i);
          onSelectionChange(next);
        } else {
          onSelectionChange(rect);
        }
        return;
      }

      if (tool === "lasso" && lassoPointsRef.current.length > 0) {
        const point = toRawGridPoint(e);
        if (!point) return;
        const last = lassoPointsRef.current[lassoPointsRef.current.length - 1];
        // 같은 칸에 머무르는 동안은 점을 추가하지 않는다 — 배열이 불필요하게
        // 커지는 것도 막고, 다각형 판정에 의미 없는 중복 꼭짓점도 줄인다.
        if (last.x !== point.x || last.y !== point.y) {
          lassoPointsRef.current = [...lassoPointsRef.current, point];
        }
        render(workingRef.current);
        return;
      }

      if (
        tool === "move" &&
        moveBaseRef.current &&
        moveContentRef.current &&
        moveStartPointRef.current
      ) {
        // toGridPoint가 아니라 toRawGridPoint를 쓴다 — 포인터가 캔버스 밖으로
        // 살짝 나가도 이동량 계산이 멈추지 않고 계속 그 방향을 따라가게 한다.
        const point = toRawGridPoint(e);
        if (!point) return;
        const dx = point.x - moveStartPointRef.current.x;
        const dy = point.y - moveStartPointRef.current.y;
        let next = moveBaseRef.current.slice();
        const nextMask = new Set<number>();
        for (const c of moveContentRef.current) {
          const nx = c.x + dx;
          const ny = c.y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          next = setPixel(next, width, nx, ny, c.color);
          nextMask.add(ny * width + nx);
        }
        workingRef.current = next;
        // ref를 먼저 동기 갱신해 바로 다음 pointermove(React state가 아직 반영되기 전)도
        // 항상 최신 마스크를 기준으로 계산하도록 한다.
        selectionMaskRef.current = nextMask;
        onSelectionChange(nextMask);
        render(next);
        return;
      }

      if (tool === "line" || tool === "rect" || tool === "circle") {
        const point = toGridPoint(e);
        if (!point || !shapeStartRef.current) return;
        const start = shapeStartRef.current;
        // 실제 픽셀(workingRef)은 건드리지 않는다 — draft만 갱신하고, 손을 떼면
        // 이 값 그대로 pendingShape가 되어 확정 전까지 계속 조절할 수 있다.
        shapeDraftRef.current = {
          tool,
          x0: start.x,
          y0: start.y,
          x1: point.x,
          y1: point.y,
        };
        render(pixels);
        return;
      }

      if (tool !== "pencil" && tool !== "eraser") return;
      const point = toGridPoint(e);
      if (!point || !lastPointRef.current) return;
      const color = tool === "eraser" ? null : activeColorHex;
      let next = workingRef.current;
      for (const p of linePoints(
        lastPointRef.current.x,
        lastPointRef.current.y,
        point.x,
        point.y,
      )) {
        next = plotPoint(next, p.x, p.y, color);
      }
      lastPointRef.current = point;
      workingRef.current = next;
      render(next);
    },
    [
      tool,
      width,
      height,
      activeColorHex,
      pixels,
      viewportRef,
      onPendingTextMove,
      toGridPoint,
      toRawGridPoint,
      plotPoint,
      render,
      onSelectionChange,
      selectMode,
    ],
  );

  // 맨 앞에서 drawingRef를 한 번만 검사·소비하도록 통일한다 — pointerup 처리 후 브라우저가
  // 뒤이어 보내는 lostpointercapture(그리고 handlePointerCancel의 재사용)가 같은 제스처를
  // 두 번 커밋하지 않도록 이 함수 자체를 멱등하게 만든다.
  const handlePointerUp = useCallback(() => {
    if (panStartRef.current) {
      panStartRef.current = null;
      setIsPanning(false);
      return;
    }
    if (!drawingRef.current) return;
    drawingRef.current = false;

    if (tool === "select") {
      shapeStartRef.current = null;
      selectBaseMaskRef.current = null;
      return;
    }
    if (tool === "lasso") {
      const points = lassoPointsRef.current;
      const base = selectBaseMaskRef.current;
      const drawn = lassoMask(width, height, points);
      lassoPointsRef.current = [];
      selectBaseMaskRef.current = null;
      if (lassoModeRef.current === "add" && base) {
        onSelectionChange(new Set([...base, ...drawn]));
      } else if (lassoModeRef.current === "subtract" && base) {
        const next = new Set(base);
        for (const i of drawn) next.delete(i);
        onSelectionChange(next);
      } else {
        onSelectionChange(drawn);
      }
      render(workingRef.current);
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
      const draft = shapeDraftRef.current;
      shapeDraftRef.current = null;
      // 실제로 드래그해 크기가 있을 때만 확정 전 상태로 띄운다 — 그냥 클릭만
      // 하고 뗀 경우(0 크기)는 예전처럼 아무 것도 남기지 않는다.
      if (draft && (draft.x0 !== draft.x1 || draft.y0 !== draft.y1)) {
        onShapeDragEnd(draft.tool, draft.x0, draft.y0, draft.x1, draft.y1);
      } else {
        render(pixels);
      }
      return;
    }
    if (tool === "move") {
      const originalMask = moveOriginalMaskRef.current;
      moveBaseRef.current = null;
      moveContentRef.current = null;
      moveStartPointRef.current = null;
      moveOriginalMaskRef.current = null;
      onStrokeEnd(workingRef.current, originalMask);
      return;
    }
    lastPointRef.current = null;
    onStrokeEnd(workingRef.current);
  }, [
    tool,
    width,
    height,
    pixels,
    onStrokeEnd,
    onGradientToolEnd,
    onShapeDragEnd,
    onSelectionChange,
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
      onZoomChange(nextZoomStep(zoom, direction));
    };
    canvas.addEventListener("wheel", handler, { passive: false });
    return () => canvas.removeEventListener("wheel", handler);
  }, [zoom, onZoomChange]);

  // 스타일러스 호버 취소, 시스템 제스처 등으로 pointerup 없이 스트로크가 끊길 때 안전하게 커밋한다.
  // handlePointerUp과 도구별 분기가 완전히 같아야 하고, 위쪽의 drawingRef 가드 덕분에 pointerup
  // 이후 뒤늦게 발생하는 lostpointercapture에 대해서도 안전하게(중복 커밋 없이) 재사용할 수 있다.
  const handlePointerCancel = handlePointerUp;

  // pendingImage 오버레이는 캔버스의 도구별 pointer 처리와 완전히 분리된 독립
  // 요소다 — 텍스트와 달리 크기 조절 손잡이까지 있어 별도 상태(ref)로 다룬다.
  const handleImageBodyDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!pendingImage) return;
      const point = toRawGridPoint(e);
      if (!point) return;
      imageDragRef.current = {
        offsetX: point.x - pendingImage.x,
        offsetY: point.y - pendingImage.y,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [pendingImage, toRawGridPoint],
  );

  const handleImageBodyMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!imageDragRef.current) return;
      const point = toRawGridPoint(e);
      if (!point) return;
      onPendingImageMove(
        point.x - imageDragRef.current.offsetX,
        point.y - imageDragRef.current.offsetY,
      );
    },
    [toRawGridPoint, onPendingImageMove],
  );

  const handleImageDragEnd = useCallback(() => {
    imageDragRef.current = null;
    imageResizeRef.current = null;
  }, []);

  const handleImageResizeDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      if (!pendingImage) return;
      imageResizeRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startWidth: pendingImage.width,
        startHeight: pendingImage.height,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [pendingImage],
  );

  const handleImageResizeMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!imageResizeRef.current) return;
      const dx = (e.clientX - imageResizeRef.current.startX) / scale;
      const dy = (e.clientY - imageResizeRef.current.startY) / scale;
      const nextWidth = Math.max(
        1,
        Math.round(imageResizeRef.current.startWidth + dx),
      );
      const nextHeight = Math.max(
        1,
        Math.round(imageResizeRef.current.startHeight + dy),
      );
      onPendingImageResize(nextWidth, nextHeight);
    },
    [scale, onPendingImageResize],
  );

  // pendingShape 오버레이도 pendingImage와 같은 방식(독립된 DOM 요소 + 자체
  // pointer capture)으로 다룬다 — 몸통을 드래그하면 두 정의점을 함께 옮기고,
  // 손잡이(0=x0y0, 1=x1y1) 하나를 드래그하면 그 점만 포인터 위치로 옮긴다
  // (원은 0번이 중심, 1번이 반지름을 정하는 테두리 점이라 같은 손잡이가
  // 도형별로 다른 의미를 갖지만 조작 방식은 동일하다).
  const handleShapeBodyDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!pendingShape) return;
      const point = toRawGridPoint(e);
      if (!point) return;
      shapeMoveRef.current = {
        startPointerX: point.x,
        startPointerY: point.y,
        startX0: pendingShape.x0,
        startY0: pendingShape.y0,
        startX1: pendingShape.x1,
        startY1: pendingShape.y1,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [pendingShape, toRawGridPoint],
  );

  const handleShapeBodyMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = shapeMoveRef.current;
      if (!drag || !pendingShape) return;
      const point = toRawGridPoint(e);
      if (!point) return;
      const dx = point.x - drag.startPointerX;
      const dy = point.y - drag.startPointerY;
      onPendingShapeUpdate({
        tool: pendingShape.tool,
        x0: drag.startX0 + dx,
        y0: drag.startY0 + dy,
        x1: drag.startX1 + dx,
        y1: drag.startY1 + dy,
      });
    },
    [pendingShape, toRawGridPoint, onPendingShapeUpdate],
  );

  const handleShapeDragEnd = useCallback(() => {
    shapeMoveRef.current = null;
    shapeHandleRef.current = null;
  }, []);

  const handleShapeHandle0Down = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      shapeHandleRef.current = 0;
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [],
  );

  const handleShapeHandle1Down = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      shapeHandleRef.current = 1;
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [],
  );

  const handleShapeHandle0Move = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (shapeHandleRef.current !== 0 || !pendingShape) return;
      const point = toRawGridPoint(e);
      if (!point) return;
      onPendingShapeUpdate({ ...pendingShape, x0: point.x, y0: point.y });
    },
    [pendingShape, toRawGridPoint, onPendingShapeUpdate],
  );

  const handleShapeHandle1Move = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (shapeHandleRef.current !== 1 || !pendingShape) return;
      const point = toRawGridPoint(e);
      if (!point) return;
      onPendingShapeUpdate({ ...pendingShape, x1: point.x, y1: point.y });
    },
    [pendingShape, toRawGridPoint, onPendingShapeUpdate],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!SPECIAL_TOOLS.includes(tool)) return;
      e.preventDefault();
      onToolChange("select");
    },
    [tool, onToolChange],
  );

  return (
    <div className="relative inline-block">
      <canvas
        ref={canvasRef}
        className="touch-none shadow-md"
        style={{
          imageRendering: "pixelated",
          cursor: isSpaceHeld
            ? isPanning
              ? CURSOR_DRAGGING
              : CURSOR_GRAB
            : cursorForTool(tool),
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onLostPointerCapture={handlePointerCancel}
        onPointerLeave={() => {
          if (tool === "eyedropper") setEyedropperHover(null);
        }}
        onContextMenu={handleContextMenu}
      />
      {tool === "eyedropper" &&
        eyedropperHover &&
        (() => {
          const grid: MagnifierGrid = [];
          for (let dy = -MAGNIFIER_RADIUS; dy <= MAGNIFIER_RADIUS; dy++) {
            const row: (string | null)[] = [];
            for (let dx = -MAGNIFIER_RADIUS; dx <= MAGNIFIER_RADIUS; dx++) {
              const gx = eyedropperHover.x + dx;
              const gy = eyedropperHover.y + dy;
              row.push(
                gx < 0 || gy < 0 || gx >= width || gy >= height
                  ? null
                  : getPixel(pixels, width, gx, gy),
              );
            }
            grid.push(row);
          }
          return (
            <Magnifier
              screenX={eyedropperHover.screenX}
              screenY={eyedropperHover.screenY}
              grid={grid}
              centerHex={getPixel(
                pixels,
                width,
                eyedropperHover.x,
                eyedropperHover.y,
              )}
            />
          );
        })()}
      {pendingText &&
        bottomToolbarPortalTarget &&
        createPortal(
          <div
            className="pointer-events-auto flex flex-wrap items-end justify-center gap-3"
            // 캔버스의 pointerdown이 이 오버레이 클릭까지 그리기로 잡아채지
            // 않도록 막는다.
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 bg-white p-2 shadow-xl">
              <textarea
                // autoFocus만으로는 캔버스의 mousedown 기본 동작(포커스 가능한 요소가
                // 아니므로 브라우저가 방금 옮겨준 포커스를 도로 빼앗아 간다)에 밀려
                // 종종 초점을 놓쳤다 — 마운트 시점에 다음 프레임으로 미뤄 명시적으로
                // 다시 포커스를 준다(handlePointerDown의 preventDefault와 함께 이중 안전장치).
                ref={(el) => {
                  if (el) requestAnimationFrame(() => el.focus());
                }}
                value={pendingText.text}
                onChange={(e) =>
                  onPendingTextChange(e.target.value, pendingText.fontSize)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    // Shift 없는 엔터는 확정 — 줄바꿈이 먼저 들어가지 않도록 막는다.
                    e.preventDefault();
                    onPendingTextCommit();
                  } else if (e.key === "Escape") onPendingTextCancel();
                }}
                placeholder="텍스트"
                rows={pendingText.text.split("\n").length}
                wrap="off"
                className="w-24 resize-none overflow-auto select-text bg-transparent font-sans text-xs text-gray-900 outline-none"
              />
              <div className="flex gap-1">
                <button
                  onClick={() =>
                    onPendingTextChange(
                      pendingText.text,
                      Math.max(4, pendingText.fontSize - 2),
                    )
                  }
                  title="글자 작게"
                  className="flex h-7 w-7 items-center justify-center bg-gray-100 text-xs text-gray-600 hover:bg-gray-200"
                >
                  −
                </button>
                <span className="flex w-6 items-center justify-center text-[10px] text-gray-500">
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
                  className="flex h-7 w-7 items-center justify-center bg-gray-100 text-xs text-gray-600 hover:bg-gray-200"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-white p-2 shadow-xl">
              <button
                onClick={onPendingTextToggleAA}
                title="안티에일리어싱"
                className={`flex h-7 items-center justify-center px-2 text-[10px] font-semibold ${
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
                className={`flex h-7 items-center justify-center px-2 text-[10px] font-semibold ${
                  pendingText.gradientFill
                    ? "bg-violet-500 text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                그라데이션
              </button>
              {pendingText.gradientFill && (
                <div className="flex items-center gap-2 pl-1">
                  <label className="flex items-center gap-1 text-[10px] text-gray-600">
                    <span>단계</span>
                    <input
                      type="range"
                      min={2}
                      max={32}
                      value={gradientSteps}
                      onChange={(e) =>
                        onGradientStepsChange(Number(e.target.value))
                      }
                    />
                    <span className="w-5 text-right tabular-nums text-gray-400">
                      {gradientSteps}
                    </span>
                  </label>
                  <div
                    className="flex items-center gap-1.5 text-[10px] text-gray-600"
                    title="텍스트 그라데이션 채우기가 칠해지는 방향"
                  >
                    <span>방향</span>
                    <GradientDial
                      angleDeg={gradientAngleDeg}
                      onAngleChange={onGradientAngleChange}
                    />
                    <span className="w-7 text-right tabular-nums text-gray-400">
                      {gradientAngleDeg}°
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 bg-white p-2 shadow-xl">
              <div
                className="flex gap-1"
                title="정렬 — 타이핑 중 폭이 바뀌어도 고정점이 유지된다"
              >
                <button
                  onClick={() => onPendingTextSetAlign("left")}
                  title="왼쪽 정렬"
                  className={`flex h-7 w-7 items-center justify-center ${
                    pendingText.align === "left"
                      ? "bg-violet-500 text-white"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  <AlignLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onPendingTextSetAlign("center")}
                  title="가운데 정렬"
                  className={`flex h-7 w-7 items-center justify-center ${
                    pendingText.align === "center"
                      ? "bg-violet-500 text-white"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  <AlignCenter className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onPendingTextSetAlign("right")}
                  title="오른쪽 정렬"
                  className={`flex h-7 w-7 items-center justify-center ${
                    pendingText.align === "right"
                      ? "bg-violet-500 text-white"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  <AlignRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <button
                onClick={onPendingTextRotate}
                title="90도 회전"
                className="flex h-7 w-7 items-center justify-center bg-gray-100 text-gray-500 hover:bg-gray-200"
              >
                <RotateCw className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-1 bg-white p-2 shadow-xl">
              <button
                onClick={onPendingTextCommit}
                title="확정 (Enter)"
                className="flex h-7 w-7 items-center justify-center bg-violet-500 text-xs text-white hover:bg-violet-600"
              >
                ✓
              </button>
              <button
                onClick={onPendingTextCancel}
                title="취소 (Esc)"
                className="flex h-7 w-7 items-center justify-center bg-gray-100 text-xs text-gray-500 hover:bg-red-50 hover:text-red-500"
              >
                ✕
              </button>
            </div>
          </div>,
          bottomToolbarPortalTarget,
        )}
      {pendingImage && (
        <>
          {/* 이동 — 이미지 영역 전체가 드래그 대상. 캔버스보다 위에 있어 이 영역
              안에서는 지금 도구(펜슬 등)가 아니라 이동만 동작한다. */}
          <div
            className="absolute z-10 touch-none border-2 border-dashed border-violet-500"
            style={{
              left: pendingImage.x * scale,
              top: pendingImage.y * scale,
              width: pendingImage.width * scale,
              height: pendingImage.height * scale,
              cursor: CURSOR_DRAGGING,
            }}
            onPointerDown={handleImageBodyDown}
            onPointerMove={handleImageBodyMove}
            onPointerUp={handleImageDragEnd}
            onPointerCancel={handleImageDragEnd}
          >
            {/* 크기 조절 — 우하단 모서리를 드래그하면 왼쪽 위를 기준으로 늘고 준다. */}
            <div
              className="absolute -right-1.5 -bottom-1.5 h-4 w-4 touch-none rounded-full bg-violet-500 shadow-[0_0_0_2px_#ffffff]"
              style={{ cursor: CURSOR_NWSE_RESIZE }}
              onPointerDown={handleImageResizeDown}
              onPointerMove={handleImageResizeMove}
              onPointerUp={handleImageDragEnd}
              onPointerCancel={handleImageDragEnd}
            />
          </div>
          <div
            className="absolute z-10 flex items-center gap-1 bg-white px-1.5 py-1 shadow-[0_0_0_1px_#8b5cf6]"
            style={{
              left: pendingImage.x * scale,
              top: Math.max(0, pendingImage.y * scale - 34),
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <span className="text-[10px] text-gray-500">
              {pendingImage.width} × {pendingImage.height}
            </span>
            <button
              onClick={onPendingImageRotate}
              title="90도 회전"
              className="flex h-4 w-4 items-center justify-center bg-gray-100 text-[10px] text-gray-500 hover:bg-gray-200"
            >
              <RotateCw className="h-3 w-3" />
            </button>
            <button
              onClick={onPendingImageCommit}
              title="확정"
              className="flex h-4 w-4 items-center justify-center bg-violet-500 text-[10px] text-white hover:bg-violet-600"
            >
              ✓
            </button>
            <button
              onClick={onPendingImageCancel}
              title="취소"
              className="flex h-4 w-4 items-center justify-center bg-gray-100 text-[10px] text-gray-500 hover:bg-red-50 hover:text-red-500"
            >
              ✕
            </button>
          </div>
        </>
      )}
      {pendingShape &&
        (() => {
          const radius = Math.round(
            Math.hypot(
              pendingShape.x1 - pendingShape.x0,
              pendingShape.y1 - pendingShape.y0,
            ),
          );
          const boxMinX =
            pendingShape.tool === "circle"
              ? pendingShape.x0 - radius
              : Math.min(pendingShape.x0, pendingShape.x1);
          const boxMinY =
            pendingShape.tool === "circle"
              ? pendingShape.y0 - radius
              : Math.min(pendingShape.y0, pendingShape.y1);
          const boxMaxX =
            pendingShape.tool === "circle"
              ? pendingShape.x0 + radius
              : Math.max(pendingShape.x0, pendingShape.x1);
          const boxMaxY =
            pendingShape.tool === "circle"
              ? pendingShape.y0 + radius
              : Math.max(pendingShape.y0, pendingShape.y1);
          return (
            <>
              {/* 몸통 — 도형 경계 안쪽 전체가 이동 드래그 대상이다. 실제 색은
                  캔버스 쪽 렌더링(반투명 미리보기)이 이미 그리므로 이 div
                  자체는 투명하게 두고 손잡이 두 개만 자식으로 얹는다. */}
              <div
                className="absolute z-10 touch-none"
                style={{
                  left: boxMinX * scale,
                  top: boxMinY * scale,
                  width: (boxMaxX - boxMinX + 1) * scale,
                  height: (boxMaxY - boxMinY + 1) * scale,
                  cursor: CURSOR_DRAGGING,
                }}
                onPointerDown={handleShapeBodyDown}
                onPointerMove={handleShapeBodyMove}
                onPointerUp={handleShapeDragEnd}
                onPointerCancel={handleShapeDragEnd}
              />
              {/* 손잡이 — 0번은 (x0,y0), 1번은 (x1,y1). 원은 0번이 중심, 1번이
                  반지름을 정하는 테두리 위 점이다. */}
              <div
                className="absolute z-20 h-3.5 w-3.5 touch-none rounded-full bg-violet-500 shadow-[0_0_0_2px_#ffffff]"
                style={{
                  left: pendingShape.x0 * scale + scale / 2 - 7,
                  top: pendingShape.y0 * scale + scale / 2 - 7,
                  cursor: CURSOR_MOVE,
                }}
                onPointerDown={handleShapeHandle0Down}
                onPointerMove={handleShapeHandle0Move}
                onPointerUp={handleShapeDragEnd}
                onPointerCancel={handleShapeDragEnd}
              />
              <div
                className="absolute z-20 h-3.5 w-3.5 touch-none rounded-full bg-violet-500 shadow-[0_0_0_2px_#ffffff]"
                style={{
                  left: pendingShape.x1 * scale + scale / 2 - 7,
                  top: pendingShape.y1 * scale + scale / 2 - 7,
                  cursor:
                    pendingShape.tool === "circle"
                      ? CURSOR_EW_RESIZE
                      : CURSOR_NWSE_RESIZE,
                }}
                onPointerDown={handleShapeHandle1Down}
                onPointerMove={handleShapeHandle1Move}
                onPointerUp={handleShapeDragEnd}
                onPointerCancel={handleShapeDragEnd}
              />
              <div
                className="absolute z-10 flex items-center gap-1 bg-white px-1.5 py-1 shadow-[0_0_0_1px_#8b5cf6]"
                style={{
                  left: boxMinX * scale,
                  top: Math.max(0, boxMinY * scale - 34),
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <button
                  onClick={onPendingShapeCommit}
                  title="확정 (Enter)"
                  className="flex h-4 w-4 items-center justify-center bg-violet-500 text-[10px] text-white hover:bg-violet-600"
                >
                  ✓
                </button>
                <button
                  onClick={onPendingShapeCancel}
                  title="취소 (Esc)"
                  className="flex h-4 w-4 items-center justify-center bg-gray-100 text-[10px] text-gray-500 hover:bg-red-50 hover:text-red-500"
                >
                  ✕
                </button>
              </div>
            </>
          );
        })()}
    </div>
  );
}
