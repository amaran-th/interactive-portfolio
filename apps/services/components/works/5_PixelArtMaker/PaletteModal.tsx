"use client";

import { GripHorizontal, X } from "lucide-react";
import { RefObject, useEffect, useRef, useState } from "react";
import ColorPicker from "./ColorPicker";
import { FLOATING_PANEL } from "./panelStyles";

// 컨테이너 가장자리에서 최소한 이만큼 띄운다.
const POPOVER_VIEWPORT_MARGIN = 8;
// 스와치와 팝오버 사이 간격.
const POPOVER_GAP = 6;
// 팝오버 크기 — 실측 대신 고정값을 쓴다. 너비는 아래 className(w-52)과 맞춰
// 두고, 높이는 내용(hex 표시+ColorPicker+적용 버튼)의 대략치다.
const POPOVER_WIDTH = 208;
const POPOVER_HEIGHT = 260;

// 편집창 루트에 확대/축소 transform이 걸려 있어(ContextMenu·Editor.tsx의
// rootRef 주석 참고) position:fixed 요소의 좌표 기준점이 뷰포트가 아니라 그
// 루트가 된다. 그래서 뷰포트 절대좌표가 아니라 root(containerRef) 기준
// 상대좌표로 계산해야 하고, 클램프도 뷰포트가 아니라 root의 렌더된 크기
// 기준으로 해야 팝오버가 편집창(네모네모빔) 컨테이너 밖으로 안 나간다.
// root를 못 구하면(예: 다른 맥락에서 재사용) 뷰포트를 기준으로 대체한다.
function clampPopoverPosition(
  top: number,
  left: number,
  root: DOMRect | null,
): { top: number; left: number } {
  const rootWidth = root?.width ?? window.innerWidth;
  const rootHeight = root?.height ?? window.innerHeight;
  return {
    top: Math.max(
      POPOVER_VIEWPORT_MARGIN,
      Math.min(top, rootHeight - POPOVER_HEIGHT - POPOVER_VIEWPORT_MARGIN),
    ),
    left: Math.max(
      POPOVER_VIEWPORT_MARGIN,
      Math.min(left, rootWidth - POPOVER_WIDTH - POPOVER_VIEWPORT_MARGIN),
    ),
  };
}

// 처음 열 때만 쓰는 기본 위치 — 그 스와치 바로 아래(자리가 없으면 위)에
// 둔다. 연 다음부터는 사용자가 드래그로 옮기지 않는 한 이 위치가 그대로
// 유지된다(다른 스와치를 선택해도 안 따라간다 — handleSwatch 참고).
function computeDefaultPopoverPosition(
  anchor: DOMRect,
  root: DOMRect | null,
): { top: number; left: number } {
  const rootLeft = root?.left ?? 0;
  const rootTop = root?.top ?? 0;
  const rootHeight = root?.height ?? window.innerHeight;

  let top = anchor.bottom - rootTop + POPOVER_GAP;
  if (top + POPOVER_HEIGHT > rootHeight - POPOVER_VIEWPORT_MARGIN) {
    top = anchor.top - rootTop - POPOVER_HEIGHT - POPOVER_GAP;
  }
  return clampPopoverPosition(top, anchor.left - rootLeft, root);
}

// 불러온 이미지의 팔레트를 다듬는 전용 모달 — 병합 모드(스와치 여러 개를 한
// 번에 기준색으로 합치기)와 색 바꾸기(스와치 하나 선택 → 색상환)를 넉넉한
// 자리에서 한다. preview는 부모(ImportPanel)가 들고, 여기서는 콜백으로만
// 조작한다.
//
// 병합·색 바꾸기 둘 다 조작하는 동안(병합 선택 2개 이상·색상환 드래그) 매번
// 그림 전체 미리보기에 바로 반영되지만, "n개 합치기"/"적용"을 누르지 않고
// 세션이 끝나면(선택을 줄임·다른 스와치 선택·모드 전환·모달 닫기 등) 부모가
// 세션 시작 시점 스냅샷으로 되돌린다 — 즉 둘 다 명시적으로 확정하기 전에는
// 최종 상태로 남지 않는다.
//
// NewCanvasDialog·ConfirmDialog 등 이 편집기의 다른 모달과 마찬가지로
// document.body에 포털하지 않는다 — 편집창 루트에 걸린 확대/축소 transform
// 바깥으로 나가면 위치가 편집창 경계를 벗어나고, 크기·폰트도 그 transform이
// 적용 안 된 실제 1:1 크기로 보여 나머지 UI와 어긋난다.
export default function PaletteModal({
  palette,
  pixels,
  width,
  height,
  containerRef,
  onMergePreview,
  onMergeSessionStart,
  onMergeApply,
  onMergeCancel,
  onRecolor,
  onRecolorSessionStart,
  onRecolorApply,
  onRecolorCancel,
  onClose,
}: {
  palette: string[];
  pixels: number[];
  width: number;
  height: number;
  // 편집창 루트(확대/축소 transform이 걸린 요소) — 컬러 편집 팝오버의
  // 기본 위치·드래그 클램프를 이 루트 기준 상대좌표로 계산하는 데 쓴다.
  // 생략하면 뷰포트를 기준으로 대체한다(clampPopoverPosition 주석 참고).
  containerRef?: RefObject<HTMLDivElement | null>;
  // 병합 선택(2개 이상)이 바뀔 때마다 불린다 — 부모가 세션 시작 시점
  // 스냅샷 기준으로 다시 계산해 반영한다("합치면 이렇게 됩니다" 미리보기).
  // 기준색(target)으로 sources 전부를 접는다(sources.length === 1이면
  // 둘만 합침).
  onMergePreview: (target: number, sources: number[]) => void;
  // 병합 선택이 2개 미만→이상으로 바뀌는 첫 순간 한 번 불린다 — 부모가 그
  // 시점의 preview를 스냅샷으로 담아 둔다.
  onMergeSessionStart: () => void;
  // "n개 합치기" 확정 — 부모가 스냅샷을 비운다(이미 미리보기로 반영된
  // 상태를 그대로 확정).
  onMergeApply: () => void;
  // 확정 없이 세션이 끝났을 때(선택을 2개 미만으로 줄임·모드 전환·모달
  // 닫기 등) — 부모가 스냅샷으로 되돌린다.
  onMergeCancel: () => void;
  onRecolor: (index: number, hex: string) => void;
  // 색상환 드래그의 첫 변경 직전에 한 번 불린다 — 부모가 그 순간의 preview를
  // 스냅샷으로 담아 둔다(드래그 틱마다 담지 않도록).
  onRecolorSessionStart: () => void;
  // "적용" 클릭 — 부모가 들고 있던 스냅샷을 비운다(이미 매 틱마다 반영된
  // 상태를 그대로 확정).
  onRecolorApply: () => void;
  // 적용 없이 세션이 끝났을 때(다른 스와치 선택·모달 닫기 등) — 부모가
  // 스냅샷으로 되돌린다.
  onRecolorCancel: () => void;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // 인덱스별 스와치 버튼 DOM — 팝오버를 처음 열 때 그 버튼 위치를 재는 데
  // 쓴다(그 이후로는 스와치를 안 따라가므로 계속 추적할 필요는 없다).
  const swatchRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const popoverRef = useRef<HTMLDivElement>(null);
  // 드래그 진행 중 상태 — 드래그 시작 시점의 포인터 좌표와 팝오버 위치를
  // 담아 둔다. 드래그 중이 아니면 null.
  const dragStateRef = useRef<{
    startX: number;
    startY: number;
    startTop: number;
    startLeft: number;
  } | null>(null);
  // 병합 모드 on/off — 켜지면 스와치 클릭이 재색상 선택 대신 다중 선택으로
  // 동작한다.
  const [mergeMode, setMergeMode] = useState(false);
  // 병합 모드에서 고른 스와치 인덱스들. 0번째가 항상 "기준색"(병합 후
  // 살아남는 색)이고, 나머지는 기준색으로 접힐 소스다.
  const [mergeSelection, setMergeSelection] = useState<number[]>([]);
  // 병합 미리보기 세션이 시작된 시점(선택 2개 이상)의 팔레트 — 이 세션
  // 동안은 스와치 그리드를 이 스냅샷으로 그린다. 부모의 실제 preview는
  // 매번 새로 계산된 병합 결과로 이미 바뀌어 있어서(그림 전체 미리보기),
  // 그걸 그대로 그리드에 쓰면 병합될 때마다 스와치가 줄어들어 인덱스가
  // 어긋난다 — 계속 고를 수 있도록 그리드만 원본으로 고정해 둔다.
  const [mergeSnapshotPalette, setMergeSnapshotPalette] = useState<
    string[] | null
  >(null);
  // 병합 선택이 2개 이상이 된 뒤 아직 확정/취소되지 않았는지 — true인 채로
  // 선택이 2개 미만으로 줄거나 모드가 꺼지거나 모달이 닫히면 취소로 본다.
  const mergeSessionPushedRef = useRef(false);
  // 재색상 대상으로 고른 스와치(병합 모드가 꺼져 있을 때만 의미가 있다) —
  // 고르는 즉시 아래에 색상환 패널이 펼쳐진다(별도 토글 없음).
  const [selected, setSelected] = useState<number | null>(null);
  // 이번 선택에서 실제로 드래그가 일어나 세션이 시작됐는지 — true인 채로
  // 선택이 바뀌거나(다른 스와치·모달 닫기) 언마운트되면 "적용 안 하고 끝남"
  // 으로 보고 취소 콜백을 부른다. "적용"을 누르면 미리 false로 내려 취소가
  // 뒤따라 불리지 않게 한다.
  const sessionPushedRef = useRef(false);
  // 팝오버 위치 — 처음 열 때 스와치 근처로 기본값을 잡고, 그 뒤로는
  // 드래그로만 바뀐다(스와치를 바꿔도 이 값은 그대로 유지된다).
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(
    null,
  );

  // 팔레트가 줄면(병합·중복 정리) 선택 인덱스가 무효 — 렌더 중 직전 길이와
  // 비교해 초기화한다(이펙트 안 setState는 캐스케이딩 렌더 경고 대상). 드래그
  // 중 우연히 다른 색과 완전히 같아져 자동 병합된 경우도 포함되는데, 이때는
  // selected가 바뀌므로 아래 취소 이펙트가 그대로 스냅샷 되돌리기를 맡는다.
  // 병합 미리보기 세션 중에는 palette가 우리가 건 미리보기 자체 때문에
  // 매번 줄어드는 게 정상이라(mergeSnapshotPalette가 그리드를 고정해
  // 준다), 그 경우엔 mergeSelection을 건드리지 않는다 — 안 그러면 2개
  // 이상 고르자마자 선택이 도로 비워진다.
  const [prevLen, setPrevLen] = useState(palette.length);
  if (palette.length !== prevLen) {
    setPrevLen(palette.length);
    if (palette.length < prevLen) {
      setSelected(null);
      // ref는 렌더 중 못 읽으므로, 세션 여부는 state인 mergeSnapshotPalette로
      // 판단한다(둘은 항상 같이 켜지고 같이 꺼진다).
      if (mergeSnapshotPalette === null) {
        setMergeSelection([]);
      }
    }
  }

  const scale = Math.min(200 / width, 200 / height);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    c.width = width;
    c.height = height;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = pixels[y * width + x];
        if (idx < 0) continue;
        ctx.fillStyle = palette[idx] ?? "#ff00ff";
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }, [palette, pixels, width, height]);

  // 병합 미리보기 세션이 진행 중인 채로 모달 자체가 닫히면(X·배경 클릭 등,
  // toggleMergeMode를 거치지 않는 경로) 취소로 되돌린다. 선택을 2개 미만
  // 으로 줄이거나 모드를 끄는 경우는 각각 handleSwatch·toggleMergeMode가
  // 이미 처리하므로, 여기서는 순수하게 언마운트만 본다.
  useEffect(() => {
    return () => {
      if (mergeSessionPushedRef.current) {
        mergeSessionPushedRef.current = false;
        onMergeCancel();
      }
    };
  }, [onMergeCancel]);

  // 재색상 세션 경계: 선택이 바뀌면(다른 스와치 클릭·병합 모드 전환·모달
  // 닫기 등) 끝난다. 세션이 실제로 시작됐는데(드래그가 한 번이라도 있었는데)
  // "적용"을 거치지 않고 끝났다면 부모에게 취소를 알려 스냅샷으로 되돌리게
  // 한다 — "적용"은 미리 플래그를 내려 이 클린업이 다시 취소를 부르지 않게
  // 막는다.
  useEffect(() => {
    return () => {
      if (sessionPushedRef.current) {
        sessionPushedRef.current = false;
        onRecolorCancel();
      }
    };
  }, [selected, onRecolorCancel]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // 팝오버가 열려 있으면 그것부터 닫는다 — 모달 전체를 닫는 건 그다음.
      if (selected !== null) setSelected(null);
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, onClose]);

  // 팝오버·앵커 스와치 바깥을 누르면 드롭다운답게 닫는다(적용 안 했으면
  // 위 취소 이펙트가 되돌린다).
  useEffect(() => {
    if (mergeMode || selected === null) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (swatchRefs.current.get(selected)?.contains(target)) return;
      setSelected(null);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [selected, mergeMode]);

  // 병합 모드 토글 — 켤 때든 끌 때든 선택 상태를 비우고, 켜는 순간 열려 있던
  // 재색상 선택이 있으면 닫는다(두 모드는 상호 배타적이다). 병합 미리보기가
  // 진행 중이었다면(선택 2개 이상) 확정하지 않고 끄는 거니 취소로 되돌린다.
  const toggleMergeMode = () => {
    if (mergeSessionPushedRef.current) {
      mergeSessionPushedRef.current = false;
      setMergeSnapshotPalette(null);
      onMergeCancel();
    }
    setMergeMode((v) => !v);
    setMergeSelection([]);
    setSelected(null);
  };

  // 병합 모드에서 스와치를 클릭했을 때의 3단계 순환:
  // 1) 선택 안 됨 → 선택 목록 끝에 추가(목록이 비어 있었다면 이 색이 곧 기준색)
  // 2) 선택됨(기준색 아님) → 맨 앞으로 옮겨 새 기준색으로 승격
  // 3) 선택됨(기준색) → 선택에서 제거(남은 게 있으면 그중 가장 먼저 선택된
  //    색이 자동으로 새 기준색이 된다 — 배열 0번째가 항상 기준색이므로 별도
  //    처리가 필요 없다)
  //
  // 선택이 2개 이상이 되면(또는 그대로 2개 이상이면) 매번 "지금 조합으로
  // 합치면" 미리보기를 다시 계산해 반영한다. 2개 미만으로 줄면 진행 중이던
  // 미리보기 세션을 취소해 원래대로 되돌린다.
  const handleSwatch = (i: number) => {
    if (mergeMode) {
      const pos = mergeSelection.indexOf(i);
      const next =
        pos === -1
          ? [...mergeSelection, i]
          : pos === 0
            ? mergeSelection.filter((v) => v !== i)
            : [i, ...mergeSelection.filter((v) => v !== i)];
      setMergeSelection(next);
      if (next.length >= 2) {
        if (!mergeSessionPushedRef.current) {
          mergeSessionPushedRef.current = true;
          setMergeSnapshotPalette(palette);
          onMergeSessionStart();
        }
        onMergePreview(next[0], next.slice(1));
      } else if (mergeSessionPushedRef.current) {
        mergeSessionPushedRef.current = false;
        setMergeSnapshotPalette(null);
        onMergeCancel();
      }
      return;
    }
    const opening = selected !== i;
    setSelected((cur) => (cur === i ? null : i));
    // 이 모달 세션에서 팝오버를 처음 여는 거라면 그 스와치 근처로 기본
    // 위치를 잡는다 — 이미 위치가 있으면(직전에 다른 스와치를 다뤘거나
    // 드래그해 옮겨 뒀으면) 건드리지 않는다(스와치를 바꿔도 안 따라간다).
    if (opening && popoverPos === null) {
      const el = swatchRefs.current.get(i);
      if (el) {
        const root = containerRef?.current?.getBoundingClientRect() ?? null;
        setPopoverPos(computeDefaultPopoverPosition(el.getBoundingClientRect(), root));
      }
    }
  };

  // 팝오버 드래그 이동 — 헤더(hex 표시 줄)를 잡고 끌면 그 델타만큼
  // 위치를 옮긴다. 컨테이너 밖으로는 못 나가게 매 틱마다 다시 클램프한다.
  const handleDragStart = (e: React.PointerEvent) => {
    if (!popoverPos) return;
    e.preventDefault();
    dragStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startTop: popoverPos.top,
      startLeft: popoverPos.left,
    };
    const root = containerRef?.current?.getBoundingClientRect() ?? null;
    const onMove = (ev: PointerEvent) => {
      const drag = dragStateRef.current;
      if (!drag) return;
      setPopoverPos(
        clampPopoverPosition(
          drag.startTop + (ev.clientY - drag.startY),
          drag.startLeft + (ev.clientX - drag.startX),
          root,
        ),
      );
    };
    const onUp = () => {
      dragStateRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // 이미 미리보기로 반영돼 있는 상태를 그대로 확정한다 — 다시 계산해
  // 반영할 필요 없이 스냅샷만 비운다.
  const handleMergeConfirm = () => {
    if (mergeSelection.length < 2) return;
    onMergeApply();
    mergeSessionPushedRef.current = false;
    setMergeSnapshotPalette(null);
    setMergeSelection([]);
  };

  const handleRecolorChange = (hex: string) => {
    if (selected === null) return;
    if (!sessionPushedRef.current) {
      onRecolorSessionStart();
      sessionPushedRef.current = true;
    }
    onRecolor(selected, hex);
  };

  // "적용" — 먼저 플래그를 내려 클린업 이펙트가 취소를 부르지 않게 막고,
  // 선택을 비워 패널을 닫는다.
  const handleApply = () => {
    sessionPushedRef.current = false;
    onRecolorApply();
    setSelected(null);
  };

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`flex max-h-full w-80 flex-col gap-3 overflow-hidden p-3 ${FLOATING_PANEL}`}
      >
        <div className="flex shrink-0 items-center justify-between">
          <span className="text-xs font-semibold text-gray-700">
            컬러 조합 편집
          </span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex shrink-0 items-center justify-center bg-gray-50 p-2 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]">
          <canvas
            ref={canvasRef}
            style={{
              imageRendering: "pixelated",
              width: width * scale,
              height: height * scale,
            }}
          />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <p className="flex-1 text-[10px] text-gray-400">
            {mergeMode
              ? "병합할 색상을 클릭해 선택 · 다시 클릭하면 기준색 지정"
              : "컬러를 클릭하면 대상 컬러를 다른 색상으로 교체할 수 있습니다"
                }
          </p>
          <button
            onClick={toggleMergeMode}
            title="여러 색상을 한 번에 병합"
            aria-pressed={mergeMode}
            className={`shrink-0 px-1.5 py-0.5 text-[10px] ${
              mergeMode
                ? "bg-emerald-500 text-white hover:bg-emerald-600"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            병합 모드
          </button>
        </div>

        {/* 스크롤 컨테이너에 여백(p-1)을 둬서 가장자리 스와치의 선택 링
            (ring-2, 테두리 바깥쪽으로 그려짐)이 스크롤 클리핑에 잘리지
            않게 한다. */}
        <div className="min-h-0 flex-1 overflow-y-auto p-1">
          <div className="flex flex-wrap gap-1.5">
            {/* 병합 미리보기 세션 중엔 그리드를 스냅샷(원본)으로 고정해
                계속 고를 수 있게 한다 — 위 canvas는 palette prop을 그대로
                써서 "지금 조합으로 합치면"이 실시간으로 반영된 결과를
                보여준다. */}
            {(mergeSnapshotPalette ?? palette).map((color, i) => {
              const mergePos = mergeMode ? mergeSelection.indexOf(i) : -1;
              const isAnchor = mergePos === 0;
              const isMergeSelected = mergePos !== -1;
              return (
                <button
                  key={i}
                  ref={(el) => {
                    if (el) swatchRefs.current.set(i, el);
                    else swatchRefs.current.delete(i);
                  }}
                  onClick={() => handleSwatch(i)}
                  title={color}
                  className={`relative h-7 w-7 ${
                    isAnchor
                      ? "ring-2 ring-emerald-500"
                      : isMergeSelected
                        ? "ring-2 ring-emerald-300"
                        : !mergeMode && selected === i
                          ? "ring-2 ring-violet-500"
                          : "ring-1 ring-black/10"
                  }`}
                  style={{ backgroundColor: color }}
                >
                  {isAnchor && (
                    <span className="absolute -left-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {mergeMode && (
          <div className="shrink-0">
            {mergeSelection.length >= 2 ? (
              <button
                onClick={handleMergeConfirm}
                className="w-full bg-emerald-500 py-1 text-[10px] font-semibold text-white hover:bg-emerald-600"
              >
                선택한 색상 {mergeSelection.length}개 병합
              </button>
            ) : (
              <p className="py-1 text-center text-[10px] text-gray-400">
                병합할 색상을 2개 이상 클릭하세요
              </p>
            )}
          </div>
        )}

        <button
          onClick={onClose}
          className="shrink-0 bg-violet-500 py-1.5 text-xs font-semibold text-white hover:bg-violet-600"
        >
          완료
        </button>
      </div>

      {/* 컬러 편집 드롭다운 — 모달 카드 바깥(overflow-hidden 밖)에 두고
          position:fixed로 띄운다. 편집창 루트가 transform 컨텍스트라 이
          fixed 좌표는 뷰포트가 아니라 그 루트 기준이다(clamp/기본위치 함수
          참고). 처음 열 때만 스와치 근처에 자동으로 자리잡고, 그 뒤로는
          드래그로만 움직인다 — 미리보기를 가릴 때 사용자가 직접 옮길 수
          있도록, 스와치를 바꿔도 위치를 따라가지 않는다. */}
      {!mergeMode && selected !== null && palette[selected] && (
        <div
          ref={popoverRef}
          className={`fixed z-10 flex w-52 flex-col gap-2 p-2.5 ${FLOATING_PANEL}`}
          style={{
            top: popoverPos?.top ?? -9999,
            left: popoverPos?.left ?? -9999,
            visibility: popoverPos ? "visible" : "hidden",
          }}
        >
          <div
            onPointerDown={handleDragStart}
            title="드래그해서 옮기기"
            className="flex touch-none select-none items-center gap-2 text-[11px] text-gray-600"
            style={{ cursor: "move" }}
          >
            <GripHorizontal className="h-3.5 w-3.5 shrink-0 text-gray-300" />
            <span
              className="h-4 w-4 shrink-0 ring-1 ring-black/10"
              style={{ backgroundColor: palette[selected] }}
            />
            <span className="tabular-nums">{palette[selected]}</span>
          </div>
          <ColorPicker value={palette[selected]} onChange={handleRecolorChange} />
          <button
            onClick={handleApply}
            className="w-full bg-violet-500 py-1 text-[10px] font-semibold text-white hover:bg-violet-600"
          >
            적용
          </button>
        </div>
      )}
    </div>
  );
}
