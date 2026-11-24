"use client";

// 편집 화면을 감싸는 휴대용 게임기 본체.
// 십자키로 액정 속 커서를 옮기고 A로 고르고(버튼은 누르고 입력칸은 입력 시작) B로 입력을 끝낸다.
// SELECT는 영수증 스타일, START는 인쇄. 키보드 방향키·Esc도 같은 동작을 한다.
import { type ReactNode, useEffect, useRef, useState } from "react";
import PixelIcon from "./PixelIcon";
import r from "./retro.module.css";

type Dir = "up" | "down" | "left" | "right";

interface HandheldProps {
  children: ReactNode;
  select: { label: string; onPress: () => void };
  start: { label: string; onPress: () => void; disabled?: boolean };
  /** 십자키를 화면이 먼저 받는다(예: 집은 목표 옮기기). true면 커서는 그대로 둔다 */
  onDir?: (dir: Dir) => boolean;
  /** 같은 줄 끝에서 왼쪽·오른쪽을 더 누르면 불린다(예: 캐러셀 넘기기). true면 그 뒤
   *  data-pad-home="left|right" 요소로 커서를 옮긴다 */
  onEdge?: (dir: "left" | "right") => boolean;
  /** 게임기 뒤에 깔려 위로 비스듬히 삐져나온 종이 설명서. 누르면 모달로 펼친다 */
  manual?: ReactNode;
  /** B를 화면이 먼저 받는다(예: 집은 목표 놓기) */
  onCancel?: () => boolean;
  /** A(Enter)를 화면이 먼저 받는다(예: 집은 목표 놓기). true면 커서 칸을 누르지 않는다 */
  onConfirm?: () => boolean;
}

const FOCUSABLE =
  "button, input, textarea, select, [tabindex]:not([tabindex='-1'])";
const CURSOR = "data-pad-cursor";
const KEY_DIR: Record<string, Dir | undefined> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  // 글자 대신 자판 위치(e.code)로 본다 — 한글 입력 상태에서는 W가 'ㅈ'으로 들어온다
  KeyW: "up",
  KeyS: "down",
  KeyA: "left",
  KeyD: "right",
};

const isField = (
  el: EventTarget | null,
): el is HTMLInputElement | HTMLTextAreaElement =>
  el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;

/** 액정 안에서 커서가 설 수 있는 요소: 보이고, 켜져 있고, 끌기 손잡이가 아닌 것 */
function targets(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) =>
      !el.hasAttribute("data-pad-skip") &&
      !(el as HTMLButtonElement).disabled &&
      el.getClientRects().length > 0,
  );
}

/** 지금 칸에서 dir 쪽으로 가장 가까운 칸. 위·아래는 다음 줄, 왼쪽·오른쪽은 같은 줄(없으면 문서 순서 앞·뒤). */
function nearest(
  list: HTMLElement[],
  cur: HTMLElement,
  dir: Dir,
): HTMLElement | null {
  const c = cur.getBoundingClientRect();
  let best: HTMLElement | null = null;
  let bestScore = Infinity;
  for (const el of list) {
    if (el === cur) continue;
    const e = el.getBoundingClientRect();
    let main: number;
    let side: number;
    if (dir === "up" || dir === "down") {
      main = dir === "down" ? e.top - c.bottom : c.top - e.bottom;
      // 가로로 겹치면 0, 떨어진 만큼 벌점
      side = Math.max(0, e.left - c.right, c.left - e.right);
    } else {
      const sameRow = Math.min(c.bottom, e.bottom) - Math.max(c.top, e.top) > 0;
      if (!sameRow) continue;
      main = dir === "right" ? e.left - c.right : c.left - e.right;
      side = Math.abs((e.top + e.bottom) / 2 - (c.top + c.bottom) / 2);
    }
    if (main < -2) continue;
    const score = main + side * 3;
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }
  return best;
}

function Round({
  letter,
  label,
  keyHint,
  onPress,
}: {
  letter: string;
  label: string;
  keyHint: string;
  onPress: () => void;
}) {
  return (
    <div className="flex w-16 flex-col items-center gap-1">
      <button
        type="button"
        onPointerDown={(e) => e.preventDefault()}
        onClick={onPress}
        aria-label={`${letter} 버튼: ${label}`}
        className={r.round}
      >
        {letter}
      </button>
      <span className={`text-center ${r.printed}`}>
        {label}
        <br />
        <span className="opacity-60">{keyHint}</span>
      </span>
    </div>
  );
}

function Pill({
  name,
  label,
  keyHint,
  onPress,
  disabled,
}: {
  name: string;
  label: string;
  keyHint: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onPointerDown={(e) => e.preventDefault()}
        onClick={onPress}
        disabled={disabled}
        aria-label={`${name} 버튼: ${label}`}
        className={r.pill}
      />
      <span className={`text-center ${r.printed}`}>
        {name} <span className="opacity-70">{label}</span>
        <br />
        <span className="opacity-60">{keyHint}</span>
      </span>
    </div>
  );
}

export default function Handheld({
  children,
  select,
  start,
  onDir,
  onEdge,
  manual,
  onCancel,
  onConfirm,
}: HandheldProps) {
  const lcdRef = useRef<HTMLDivElement>(null);
  const manualRef = useRef<HTMLDialogElement>(null);
  // 설명서가 펼쳐진 동안은 게임기 뒤에 깔린 종이를 감춘다(종이는 한 장이니까)
  const [manualOpen, setManualOpen] = useState(false);
  // 닫을 때도 펼칠 때를 거꾸로 돌려 게임기 뒤로 들어가게 한 뒤 실제로 닫는다
  const closeManual = () => {
    const d = manualRef.current;
    if (!d?.open || d.hasAttribute("data-closing")) return;
    const done = () => {
      d.removeAttribute("data-closing");
      d.close();
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return done();
    d.setAttribute("data-closing", "");
    d.addEventListener("animationend", done, { once: true });
  };
  const cursorRef = useRef<HTMLElement | null>(null);
  // 마우스로 직접 누르면 커서 테두리를 감추고, 십자키·방향키를 쓰면 다시 보인다
  const padModeRef = useRef(false);

  const paint = (el: HTMLElement | null) => {
    cursorRef.current?.removeAttribute(CURSOR);
    cursorRef.current = el;
    if (el && padModeRef.current) el.setAttribute(CURSOR, "");
  };

  /** 커서가 없거나 사라진 요소면 첫 칸으로 */
  const current = (): HTMLElement | null => {
    const root = lcdRef.current;
    if (!root) return null;
    const cur = cursorRef.current;
    if (cur && root.contains(cur) && targets(root).includes(cur)) return cur;
    return targets(root)[0] ?? null;
  };

  const move = (dir: Dir) => {
    const root = lcdRef.current;
    if (!root) return;
    // 입력 중이면 입력을 끝내고 옮긴다
    if (
      isField(document.activeElement) &&
      root.contains(document.activeElement)
    )
      document.activeElement.blur();
    padModeRef.current = true;
    // 화면이 먼저 받으면(집은 목표 옮기기) 커서는 그 손잡이에 둔 채 보이게만 한다
    if (onDir?.(dir)) {
      const held = cursorRef.current;
      requestAnimationFrame(() => held?.scrollIntoView({ block: "nearest" }));
      return;
    }
    const cur = current();
    const wasShown =
      cur && cur === cursorRef.current && cur.hasAttribute(CURSOR);
    // 처음 누를 땐 옮기지 않고 커서만 보인다
    let next = !cur || !wasShown ? cur : nearest(targets(root), cur, dir);
    if (!next && cur && (dir === "left" || dir === "right")) {
      if (onEdge?.(dir)) {
        // 화면이 바뀐 뒤 그쪽 넘김 단추에 커서를 둔다
        requestAnimationFrame(() => {
          const home = root.querySelector<HTMLElement>(
            `[data-pad-home="${dir}"]`,
          );
          paint(home ?? current());
          home?.focus({ preventScroll: true });
        });
        return;
      }
      // 줄 끝이면 문서 순서로 앞·뒤 칸
      const list = targets(root);
      next = list[list.indexOf(cur) + (dir === "right" ? 1 : -1)] ?? null;
    }
    next = next ?? cur;
    paint(next);
    next?.scrollIntoView({ block: "nearest" });
    // 버튼은 실제 포커스도 옮겨 Enter·Space가 그대로 먹게 한다(입력칸은 A로 들어가야 입력이 시작된다).
    // 입력칸으로 옮길 땐 앞 버튼에 남은 포커스를 풀어, Enter가 그 버튼을 누르지 않고 A로 가게 한다.
    if (next && !isField(next)) next.focus({ preventScroll: true });
    else if (
      document.activeElement instanceof HTMLElement &&
      root.contains(document.activeElement)
    )
      document.activeElement.blur();
  };

  const pressA = () => {
    if (onConfirm?.()) return;
    const cur = current();
    if (!cur) return;
    padModeRef.current = true;
    paint(cur);
    if (isField(cur)) {
      cur.focus();
      if (cur.type !== "number")
        cur.setSelectionRange(cur.value.length, cur.value.length);
    } else {
      cur.click();
    }
  };

  const pressB = () => {
    if (onCancel?.()) return;
    const el = document.activeElement;
    if (!isField(el) || !lcdRef.current?.contains(el)) return;
    padModeRef.current = true;
    el.blur();
    paint(el);
  };

  // 키보드 처리기는 한 번만 붙이므로, 렌더마다 바뀌는 처리기는 ref로 넘긴다
  const confirm = () => onConfirm?.() ?? false;
  const live = useRef({ move, pressA, pressB, confirm, select, start });
  useEffect(() => {
    live.current = { move, pressA, pressB, confirm, select, start };
  });

  useEffect(() => {
    const root = lcdRef.current;
    if (!root) return;
    // 액정을 직접 누르거나 Tab으로 옮겨도 커서가 따라온다
    const onFocusIn = (e: FocusEvent) => {
      if (
        e.target instanceof HTMLElement &&
        !e.target.hasAttribute("data-pad-skip")
      )
        paint(e.target);
    };
    const onPointerDown = () => {
      padModeRef.current = false;
      cursorRef.current?.removeAttribute(CURSOR);
    };
    // 키보드만으로도 조작한다: 방향키·WASD = 십자키, Enter = A, Esc = B, Q = SELECT, E = START
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      // 사용 안내 같은 대화상자가 열려 있으면 건드리지 않는다
      if (document.querySelector("dialog[open]")) return;
      const active = document.activeElement;
      if (isField(active)) {
        // 액정 속 입력칸에서는 Enter·Esc로 입력을 끝낸다(글자 입력·방향키는 그대로)
        if (
          root.contains(active) &&
          (e.key === "Escape" || e.key === "Enter")
        ) {
          e.preventDefault();
          live.current.pressB();
        }
        return;
      }
      const dir = KEY_DIR[e.key] ?? KEY_DIR[e.code];
      if (dir) {
        e.preventDefault();
        live.current.move(dir);
        return;
      }
      if (e.code === "KeyQ" || e.code === "KeyE") {
        e.preventDefault();
        const b = e.code === "KeyQ" ? live.current.select : live.current.start;
        if (!("disabled" in b && b.disabled)) b.onPress();
        return;
      }
      if (e.key === "Escape") {
        // 입력 중이 아닐 때 Esc는 집은 목표를 놓는다
        live.current.pressB();
        return;
      }
      if (e.key === "Enter") {
        // 화면이 먼저 받으면(집은 목표 놓기) 포커스가 어디에 있든 그것만 한다
        if (live.current.confirm()) {
          e.preventDefault();
          return;
        }
        // 포커스가 버튼·링크에 있으면 브라우저가 그것을 누른다. 커서가 입력칸이라 포커스가 비어 있을 때만 A로 받는다.
        if (active && active !== document.body) return;
        e.preventDefault();
        live.current.pressA();
      }
    };
    root.addEventListener("focusin", onFocusIn);
    root.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      root.removeEventListener("focusin", onFocusIn);
      root.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const arm = (dir: Dir, label: string, cls: string) => (
    <button
      type="button"
      className={`${r.dpadArm} ${cls}`}
      aria-label={`십자키 ${label}`}
      onPointerDown={(e) => e.preventDefault()}
      onClick={() => move(dir)}
    />
  );

  return (
    <div className="flex h-full w-full justify-center px-3 pt-2 pb-3 sm:pb-4">
      <div className="flex h-full w-full max-w-[520px] flex-col">
        {manual && (
          <>
            {/* 게임기 뒤에 깔려 윗변 위로 비스듬히 삐져나온 설명서 종이 */}
            <div className="relative h-9 shrink-0">
              <button
                type="button"
                onClick={() => {
                  manualRef.current?.showModal();
                  setManualOpen(true);
                }}
                aria-haspopup="dialog"
                className={`${r.peek} ${manualOpen ? "invisible" : ""}`}
              >
                <span className="flex items-center gap-2 font-bold">
                  <PixelIcon name="book" size={16} fill="#2b2a24" />
                  사용법 &amp; 주의사항
                </span>
              </button>
            </div>
            <dialog
              ref={manualRef}
              aria-label="사용 설명서"
              className={r.manualDialog}
              onClose={() => setManualOpen(false)}
              // '알겠어요'(method="dialog" 폼)와 Esc도 바로 닫지 않고 애니메이션을 거친다
              onSubmit={(e) => {
                e.preventDefault();
                closeManual();
              }}
              onCancel={(e) => {
                e.preventDefault();
                closeManual();
              }}
              onClick={(e) => {
                // 종이 바깥(배경)을 누르면 닫는다
                if (e.target === e.currentTarget) closeManual();
              }}
            >
              {manual}
            </dialog>
          </>
        )}
        <div
          className={`relative z-10 flex min-h-0 w-full flex-1 flex-col ${r.shellWrap}`}
        >
          <div
            className={`flex min-h-0 flex-1 flex-col px-4 pt-2 pb-3 sm:px-6 ${r.shell}`}
          >
            {/* 윗면 홈과 전원 표시 */}
            <div className="mb-2 flex items-center justify-between">
              <span className={r.printed}>◀ OFF · ON ▶</span>
              <span className={r.ridges} aria-hidden />
            </div>

            {/* 액정 테두리 */}
            <div
              className={`flex min-h-0 flex-1 flex-col px-3 pt-2 pb-3 sm:px-5 ${r.bezel}`}
            >
              <div className="mb-1.5 flex items-center gap-2 text-[12px] text-[#b8b4c8]">
                <span className={`size-2 ${r.led}`} aria-hidden />
                <span>BATTERY</span>
                <span className="ml-auto font-bold tracking-[0.15em]">
                  GOAL RECEIPT
                </span>
              </div>
              <div
                ref={lcdRef}
                className={`relative flex min-h-0 flex-1 flex-col ${r.lcd}`}
              >
                {children}
                <span className={r.lcdGrid} aria-hidden />
              </div>
            </div>

            {/* 조작부 */}
            <div className="mt-4 grid grid-cols-[auto_1fr_auto] items-center gap-x-2">
              <div className={r.dpad}>
                {arm("up", "위", r.dpadUp)}
                {arm("left", "왼쪽", r.dpadLeft)}
                <span className={r.dpadCenter} aria-hidden />
                {arm("right", "오른쪽", r.dpadRight)}
                {arm("down", "아래", r.dpadDown)}
              </div>
              <span />
              <div className="flex items-start gap-1 sm:gap-2">
                <div className="mt-6">
                  <Round
                    letter="B"
                    label="취소"
                    keyHint="Esc"
                    onPress={pressB}
                  />
                </div>
                <Round
                  letter="A"
                  label="선택"
                  keyHint="Enter"
                  onPress={pressA}
                />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-end">
              <span />
              <div className="flex gap-5">
                <Pill name="SELECT" keyHint="Q" {...select} />
                <Pill name="START" keyHint="E" {...start} />
              </div>
              <span className={`justify-self-end ${r.grille}`} aria-hidden />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
