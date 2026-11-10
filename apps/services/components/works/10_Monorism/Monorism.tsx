"use client";

import {
  Download,
  Maximize,
  Redo2,
  Undo2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";
import {
  type BulkOp,
  type Change,
  type Stroke,
  type Tool,
  DEFAULT_BASE,
  SIZES,
  beginStroke,
  bulk,
  commit,
  createBoard,
  createHistory,
  deserialize,
  redo,
  serialize,
  strokeApply,
  toggleTool,
  undo,
} from "./board";
import { createChipSound } from "./chipSound";
import { type Point, cellAt, interpolate, nearBoard } from "./layout";
import { PALETTES } from "./palettes";
import { useChipScene } from "./useChipScene";

const STORAGE_KEY = "monorism-board";
const SAVE_DELAY_MS = 500;
const DEFAULT_SIZE = 40;
const STROKE_STAGGER_MS = 12;
const BULK_ROW_STAGGER_MS = 12;
const WHEEL_ZOOM_SPEED = 0.0015;
// 터치: 이만큼 누르고 있으면 빼기/놓기, 그 전에 이만큼 움직이면 뒤집기 긋기
const LONG_PRESS_MS = 450;
const TOUCH_SLOP_PX = 8;

const BULK_BUTTONS: { op: BulkOp; label: string }[] = [
  { op: "flipAll", label: "전체 뒤집기" },
  { op: "fillAll", label: "모두 채우기" },
  { op: "clearAll", label: "모두 빼기" },
];

const BUTTON =
  "flex items-center gap-1 rounded-md border-2 border-point bg-white px-2 py-1 text-xs font-bold text-point hover:bg-shade disabled:opacity-40";

function timestamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

export default function Monorism() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [webglFailed, setWebglFailed] = useState(false);
  const scene = useChipScene(containerRef, () => setWebglFailed(true));
  const [sound] = useState(createChipSound);
  const boardRef = useRef(createBoard(DEFAULT_SIZE, DEFAULT_SIZE));
  const historyRef = useRef(createHistory());
  const strokeRef = useRef<Stroke | null>(null);
  // 긋기를 시작한 포인터. 다른 포인터(손바닥 터치 등)가 그 획을 덮거나 끝내지 못하게 한다.
  const strokePointerRef = useRef<number | null>(null);
  // 오른쪽 버튼·길게 누르기 획은 처음 닿은 칸을 보고 빼기/놓기를 정한다
  const toggleStrokeRef = useRef(false);
  // 터치는 누르자마자 그리지 않고, 탭·긋기·길게 누르기 중 무엇인지 정해질 때까지 기다린다
  const pendingTouchRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);
  const spaceDownRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);
  const panRef = useRef<{ x: number; y: number } | null>(null);
  const touchesRef = useRef(new Map<number, { x: number; y: number }>());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [front, setFront] = useState(PALETTES[0].front);
  const [back, setBack] = useState(PALETTES[0].back);
  const [base, setBase] = useState(DEFAULT_BASE);
  const [muted, setMuted] = useState(false);
  const [sizeMenuOpen, setSizeMenuOpen] = useState(false);
  const sizeMenuRef = useRef<HTMLDivElement>(null);
  const [boardVersion, setBoardVersion] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });

  // 저장된 판을 한 번 불러온다. 서버 렌더와 첫 화면을 맞추려고 effect에서 읽는다.
  useEffect(() => {
    let saved = null;
    try {
      saved = deserialize(localStorage.getItem(STORAGE_KEY));
    } catch {
      saved = null;
    }
    /* eslint-disable react-hooks/set-state-in-effect */
    if (saved) {
      boardRef.current = { w: saved.w, h: saved.h, cells: saved.cells };
      setFront(saved.front);
      setBack(saved.back);
      setBase(saved.base);
      setMuted(saved.muted);
    }
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    scene.current?.setBoard(boardRef.current);
    scene.current?.fit();
  }, [hydrated, boardVersion, scene]);

  useEffect(() => {
    scene.current?.setColors(front, back, base);
  }, [front, back, base, scene]);

  useEffect(() => {
    sound.setMuted(muted);
  }, [muted, sound]);

  useEffect(() => () => sound.dispose(), [sound]);

  // 저장은 타이머·페이지 이탈 시점에 일어나므로 최신 설정을 ref로 읽는다.
  const settingsRef = useRef({ front, back, base, muted, hydrated });
  useEffect(() => {
    settingsRef.current = { front, back, base, muted, hydrated };
  });

  const saveNow = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    const { front: f, back: bk, base: bs, muted: m, hydrated: ready } = settingsRef.current;
    // 저장값을 읽기 전에 쓰면 저장된 판을 기본 판으로 덮어쓴다
    if (!ready) return;
    const b = boardRef.current;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        serialize({ w: b.w, h: b.h, cells: b.cells, front: f, back: bk, base: bs, muted: m }),
      );
    } catch {
      // 저장 공간이 없거나 막혀 있으면 조용히 넘어간다
    }
  }, []);

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(saveNow, SAVE_DELAY_MS);
  }, [saveNow]);

  useEffect(() => {
    if (hydrated) scheduleSave();
  }, [hydrated, front, back, base, muted, scheduleSave]);

  // 기다리던 저장이 있으면 페이지를 떠나거나 가려질 때·언마운트될 때 바로 쓴다.
  useEffect(() => {
    const flush = () => {
      if (saveTimer.current) saveNow();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
      flush();
    };
  }, [saveNow]);

  const refreshHistory = useCallback(() => {
    const h = historyRef.current;
    setHistoryState({ canUndo: h.undo.length > 0, canRedo: h.redo.length > 0 });
  }, []);

  function showChanges(
    changes: Change[],
    kind: Tool,
    delayOf?: (c: Change, i: number) => number,
  ) {
    if (changes.length === 0) return;
    scene.current?.animateChanges(changes, delayOf);
    sound.play(kind);
  }

  function strokeTo(p: Point | null) {
    const stroke = strokeRef.current;
    if (!stroke) return;
    const b = boardRef.current;
    // 포인터가 판 평면을 벗어나거나 판에서 너무 멀어지면 경로를 끊는다 — 돌아왔을 때 사이를 잇지 않는다
    if (!p || !nearBoard(p, b.w, b.h)) {
      lastPointRef.current = null;
      return;
    }
    const points = lastPointRef.current ? interpolate(lastPointRef.current, p) : [p];
    const changed: Change[] = [];
    for (const q of points) {
      const cell = cellAt(q, b.w, b.h);
      if (!cell) continue;
      const index = cell.row * b.w + cell.col;
      if (toggleStrokeRef.current) {
        stroke.tool = toggleTool(b.cells[index]);
        toggleStrokeRef.current = false;
      }
      const change = strokeApply(b, stroke, index);
      if (change) changed.push(change);
    }
    lastPointRef.current = p;
    showChanges(changed, stroke.tool, (_, i) => i * STROKE_STAGGER_MS);
  }

  function endStroke() {
    const stroke = strokeRef.current;
    strokeRef.current = null;
    strokePointerRef.current = null;
    toggleStrokeRef.current = false;
    lastPointRef.current = null;
    if (!stroke || stroke.changes.length === 0) return;
    commit(historyRef.current, stroke.changes);
    refreshHistory();
    scheduleSave();
  }

  function doUndo() {
    // 긋는 중이면 그 획부터 기록에 넣는다 — 안 그러면 획이 되돌린 상태 위에 기록된다
    endStroke();
    const changes = undo(boardRef.current, historyRef.current);
    if (!changes) return;
    showChanges(changes, "flip");
    refreshHistory();
    scheduleSave();
  }

  function doRedo() {
    endStroke();
    const changes = redo(boardRef.current, historyRef.current);
    if (!changes) return;
    showChanges(changes, "flip");
    refreshHistory();
    scheduleSave();
  }

  // 키보드 리스너는 한 번만 달고, 매 렌더의 최신 실행 취소 함수를 ref로 부른다.
  const keyActions = useRef({ doUndo, doRedo });
  useEffect(() => {
    keyActions.current = { doUndo, doRedo };
  });

  function runBulk(op: BulkOp) {
    const b = boardRef.current;
    const changes = bulk(b, op);
    if (changes.length === 0) return;
    commit(historyRef.current, changes);
    sound.unlock();
    showChanges(changes, op === "clearAll" ? "remove" : op === "fillAll" ? "place" : "flip", (c) =>
      Math.floor(c.index / b.w) * BULK_ROW_STAGGER_MS,
    );
    refreshHistory();
    scheduleSave();
  }

  function newBoard(size: number) {
    setSizeMenuOpen(false);
    endStroke();
    boardRef.current = createBoard(size, size);
    historyRef.current = createHistory();
    refreshHistory();
    setBoardVersion((v) => v + 1);
    scheduleSave();
  }

  async function savePng() {
    const blob = await scene.current?.exportPng();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `monorism-${timestamp()}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // 크기 메뉴 바깥을 누르면 닫는다
  useEffect(() => {
    if (!sizeMenuOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!sizeMenuRef.current?.contains(e.target as Node)) setSizeMenuOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [sizeMenuOpen]);

  // 휠·트랙패드 두 손가락 쓸기는 판 이동, 핀치(ctrlKey가 붙어 온다)나 Ctrl/⌘+휠은 확대.
  // 기본 스크롤을 막아야 해서 passive가 아닌 리스너로 단다.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      // deltaMode 1(줄 단위, 일부 마우스)은 픽셀로 바꾼다
      const unit = e.deltaMode === 1 ? 16 : 1;
      if (e.ctrlKey || e.metaKey) {
        scene.current?.zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * unit * WHEEL_ZOOM_SPEED * 4));
      } else {
        scene.current?.panBy(-e.deltaX * unit, -e.deltaY * unit);
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [scene]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA")) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) keyActions.current.doRedo();
        else keyActions.current.doUndo();
        return;
      }
      if (e.key === "Escape") setSizeMenuOpen(false);
      if (e.code === "Space") {
        e.preventDefault();
        spaceDownRef.current = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") spaceDownRef.current = false;
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  function startStroke(pointerId: number, kind: "flip" | "toggle", clientX: number, clientY: number) {
    sound.unlock();
    strokeRef.current = beginStroke("flip");
    strokePointerRef.current = pointerId;
    toggleStrokeRef.current = kind === "toggle";
    lastPointRef.current = null;
    strokeTo(scene.current?.boardPoint(clientX, clientY) ?? null);
  }

  function cancelPendingTouch() {
    if (pendingTouchRef.current) clearTimeout(pendingTouchRef.current.timer);
    pendingTouchRef.current = null;
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === "touch") {
      touchesRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      // 두 번째 손가락이 닿으면 긋기를 끝내고 확대·이동으로 넘어간다
      if (touchesRef.current.size >= 2) {
        cancelPendingTouch();
        endStroke();
        return;
      }
    }
    // 이미 다른 포인터로 긋는 중이면(펜을 쓰는데 손바닥이 닿는 경우 등) 새 포인터는 무시한다
    if (strokeRef.current || pendingTouchRef.current) return;
    // 가운데 버튼, 또는 Space를 누른 채 끌면 판을 옮긴다
    if (e.button === 1 || (e.button === 0 && spaceDownRef.current)) {
      e.preventDefault();
      panRef.current = { x: e.clientX, y: e.clientY };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }
    if (e.button !== 0 && e.button !== 2) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    if (e.pointerType === "touch") {
      const { pointerId, clientX, clientY } = e;
      sound.unlock();
      pendingTouchRef.current = {
        pointerId,
        x: clientX,
        y: clientY,
        timer: setTimeout(() => {
          pendingTouchRef.current = null;
          startStroke(pointerId, "toggle", clientX, clientY);
        }, LONG_PRESS_MS),
      };
      return;
    }
    startStroke(e.pointerId, e.button === 2 ? "toggle" : "flip", e.clientX, e.clientY);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const touches = touchesRef.current;
    if (e.pointerType === "touch" && touches.has(e.pointerId)) {
      if (touches.size >= 2) {
        const [a0, b0] = [...touches.values()];
        touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const [a1, b1] = [...touches.values()];
        const d0 = Math.hypot(a0.x - b0.x, a0.y - b0.y);
        const d1 = Math.hypot(a1.x - b1.x, a1.y - b1.y);
        const mx0 = (a0.x + b0.x) / 2;
        const my0 = (a0.y + b0.y) / 2;
        const mx1 = (a1.x + b1.x) / 2;
        const my1 = (a1.y + b1.y) / 2;
        scene.current?.panBy(mx1 - mx0, my1 - my0);
        if (d0 > 0) scene.current?.zoomAt(mx1, my1, d1 / d0);
        return;
      }
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
    const pending = pendingTouchRef.current;
    if (pending && pending.pointerId === e.pointerId) {
      // 길게 누르기 전에 움직이면 뒤집기 긋기로 시작한다
      if (Math.hypot(e.clientX - pending.x, e.clientY - pending.y) < TOUCH_SLOP_PX) return;
      cancelPendingTouch();
      startStroke(e.pointerId, "flip", pending.x, pending.y);
    }
    if (panRef.current) {
      scene.current?.panBy(e.clientX - panRef.current.x, e.clientY - panRef.current.y);
      panRef.current = { x: e.clientX, y: e.clientY };
      return;
    }
    if (strokeRef.current && e.pointerId === strokePointerRef.current)
      strokeTo(scene.current?.boardPoint(e.clientX, e.clientY) ?? null);
  }

  function onPointerEnd(e: React.PointerEvent<HTMLDivElement>) {
    touchesRef.current.delete(e.pointerId);
    panRef.current = null;
    const pending = pendingTouchRef.current;
    if (pending && pending.pointerId === e.pointerId) {
      // 길게 누르기 전에 뗀 탭은 칩 하나 뒤집기
      cancelPendingTouch();
      if (e.type === "pointerup") {
        startStroke(e.pointerId, "flip", pending.x, pending.y);
        endStroke();
      }
      return;
    }
    if (e.pointerId === strokePointerRef.current) endStroke();
  }

  return (
    <div className="flex h-full flex-col">
      <div
        role="toolbar"
        aria-label="모노리즘 도구"
        className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b-2 border-point bg-white px-3 py-2"
      >
        <p className="text-xs text-ink/70">
          <span className="font-bold text-point">클릭</span> 뒤집기 ·{" "}
          <span className="font-bold text-point">우클릭</span> 빼기/놓기 ·{" "}
          <span className="font-bold text-point">Space+드래그</span> 이동
        </p>

        <div className="flex gap-1">
          <button
            type="button"
            title="실행 취소 (Ctrl/⌘+Z)"
            aria-label="실행 취소"
            disabled={!historyState.canUndo}
            onClick={doUndo}
            className={BUTTON}
          >
            <Undo2 aria-hidden className="size-4" />
          </button>
          <button
            type="button"
            title="다시 실행 (Ctrl/⌘+Shift+Z)"
            aria-label="다시 실행"
            disabled={!historyState.canRedo}
            onClick={doRedo}
            className={BUTTON}
          >
            <Redo2 aria-hidden className="size-4" />
          </button>
        </div>

        <div className="flex gap-1">
          {BULK_BUTTONS.map(({ op, label }) => (
            <button key={op} type="button" onClick={() => runBulk(op)} className={BUTTON}>
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          {PALETTES.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-label={p.label}
              title={p.label}
              aria-pressed={front === p.front && back === p.back}
              onClick={() => {
                setFront(p.front);
                setBack(p.back);
              }}
              className="size-6 rounded-full border-2 border-point aria-pressed:ring-2 aria-pressed:ring-main aria-pressed:ring-offset-1"
              style={{ background: `linear-gradient(135deg, ${p.front} 50%, ${p.back} 50%)` }}
            />
          ))}
          <input
            type="color"
            aria-label="앞면 색"
            value={front}
            onChange={(e) => setFront(e.target.value)}
            className="h-6 w-7 cursor-pointer rounded border-2 border-point"
          />
          <input
            type="color"
            aria-label="뒷면 색"
            value={back}
            onChange={(e) => setBack(e.target.value)}
            className="h-6 w-7 cursor-pointer rounded border-2 border-point"
          />
          <label className="ml-1 flex items-center gap-1 text-xs font-bold text-point">
            판
            <input
              type="color"
              aria-label="판 색"
              value={base}
              onChange={(e) => setBase(e.target.value)}
              className="h-6 w-7 cursor-pointer rounded border-2 border-point"
            />
          </label>
        </div>

        <div ref={sizeMenuRef} className="relative">
          <button
            type="button"
            aria-expanded={sizeMenuOpen}
            aria-haspopup="menu"
            onClick={() => setSizeMenuOpen((o) => !o)}
            className={BUTTON}
          >
            새 판
          </button>
          {sizeMenuOpen && (
            <div
              role="menu"
              aria-label="새 판 크기"
              className="absolute top-full left-0 z-20 mt-1 flex w-max flex-col gap-1 rounded-lg border-2 border-point bg-white p-2 shadow-[3px_3px_0_0_var(--color-point)]"
            >
              <p className="text-[11px] text-ink/70">크기를 고르면 지금 판은 지워져요</p>
              {SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  role="menuitem"
                  onClick={() => newBoard(size)}
                  className="rounded-md px-2 py-1 text-left text-xs font-bold text-point hover:bg-shade"
                >
                  {size}×{size}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="ml-auto flex gap-1">
          <button
            type="button"
            title="화면 맞춤"
            aria-label="화면 맞춤"
            onClick={() => scene.current?.fit()}
            className={BUTTON}
          >
            <Maximize aria-hidden className="size-4" />
          </button>
          <button
            type="button"
            title={muted ? "소리 켜기" : "소리 끄기"}
            aria-label={muted ? "소리 켜기" : "소리 끄기"}
            onClick={() => setMuted((m) => !m)}
            className={BUTTON}
          >
            {muted ? <VolumeX aria-hidden className="size-4" /> : <Volume2 aria-hidden className="size-4" />}
          </button>
          <button type="button" onClick={savePng} className={BUTTON}>
            <Download aria-hidden className="size-4" />
            PNG로 저장
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        aria-label="모노리즘 판"
        role="application"
        className="relative min-h-0 flex-1 touch-none select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onContextMenu={(e) => e.preventDefault()}
      >
        {webglFailed && (
          <p
            role="alert"
            className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm font-bold text-point"
          >
            이 브라우저에서는 3D 화면을 그릴 수 없어요. 브라우저 설정에서 WebGL(하드웨어
            가속)을 켜거나 다른 브라우저로 열어 주세요.
          </p>
        )}
      </div>
    </div>
  );
}
