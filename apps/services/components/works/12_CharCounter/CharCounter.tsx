"use client";

import { Check, ChevronDown, CircleAlert, Copy, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import CopyToast from "../_shared/CopyToast";
import { useCopyFeedback } from "../_shared/useCopyFeedback";
import {
  type Basis,
  BASIS_LABELS,
  MAX_LIMIT,
  basisValue,
  countText,
  overflowStart,
  parseSaved,
} from "./count";
import { NumberCombo, Select } from "../_shared/Dropdown";

const STORAGE_KEY = "char-counter";
// 치는 동안은 저장하지 않고, 손을 멈춘 뒤 잠시 기다렸다 저장한다. 나갈 때는 기다리지 않고 바로 저장한다
const SAVE_DELAY_MS = 2000;
const CLEAR_CONFIRM_MS = 3000;
const PANEL = "rounded-lg border border-ink/10 bg-white";
const BUTTON =
  "flex items-center gap-1 rounded-md border border-ink/15 bg-white px-2.5 py-1 text-xs text-ink/70 hover:bg-ink/[0.03] hover:text-ink disabled:opacity-40";
// 겹쳐 그리는 두 층이 글자 위치까지 똑같도록 같은 상자 규칙을 쓴다
const FIELD =
  "absolute inset-0 h-full w-full whitespace-pre-wrap break-words p-4 text-base leading-relaxed [scrollbar-gutter:stable]";
const LIMIT_PRESETS = [300, 500, 800, 1000, 1500];

const fmt = (n: number) => n.toLocaleString("ko-KR");

type StatProps = {
  label: string;
  value: number;
  unit: string;
  /** 제한 기준인 값이면 "/제한"을 붙이고 강조한다. 넘으면 붉게 칠한다 */
  goal?: number | null;
  active?: boolean;
};

// 가장 먼저 보는 숫자. 크게 쓰고, 제한 기준인 값은 포인트 색으로 칠한다.
function BigStat({ label, value, unit, goal, active }: StatProps) {
  const over = goal != null && value > goal;
  const color = over ? "text-[#c0392b]" : active ? "text-point" : "text-ink";
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-ink/50">{label}</p>
      <p className="whitespace-nowrap tabular-nums">
        <span className={`text-xl font-bold ${color}`}>{fmt(value)}</span>
        {goal != null && <span className="text-xs text-ink/40"> / {fmt(goal)}</span>}
        <span className="ml-0.5 text-xs text-ink/50">{unit}</span>
      </p>
    </div>
  );
}

function SmallStat({ label, value, unit }: StatProps) {
  return (
    <span className="whitespace-nowrap text-ink/50 tabular-nums">
      {label} <b className="font-semibold text-ink">{fmt(value)}</b>
      {unit}
    </span>
  );
}

export default function CharCounter() {
  const [text, setText] = useState("");
  const [limit, setLimit] = useState<number | null>(null);
  const [basis, setBasis] = useState<Basis>("with-spaces");
  const [spellcheck, setSpellcheck] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [selection, setSelection] = useState<[number, number]>([0, 0]);
  const [confirmClear, setConfirmClear] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "failed">("saved");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const { copy, message } = useCopyFeedback();

  // 저장된 글을 한 번 불러온다. 서버 렌더와 첫 화면을 맞추려고 effect에서 읽는다.
  useEffect(() => {
    let saved = null;
    try {
      saved = parseSaved(localStorage.getItem(STORAGE_KEY));
    } catch {
      saved = null;
    }
    /* eslint-disable react-hooks/set-state-in-effect */
    if (saved) {
      setText(saved.text);
      setLimit(saved.limit);
      setBasis(saved.basis);
      setSpellcheck(saved.spellcheck);
    }
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // 나갈 때 바로 저장하려고 마지막 값을 들고 있는다
  const latest = useRef({ text, limit, basis, spellcheck });
  const dirty = useRef(false);

  function saveNow(): boolean {
    if (!dirty.current) return true;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(latest.current));
      dirty.current = false;
      setSaveState("saved");
      return true;
    } catch {
      // 저장 공간이 꽉 찼거나 막혀 있다 — 나갈 때 경고한다
      setSaveState("failed");
      return false;
    }
  }

  // 입력이 멈추면 잠시 뒤 저장한다
  useEffect(() => {
    if (!hydrated) return;
    latest.current = { text, limit, basis, spellcheck };
    dirty.current = true;
    const t = setTimeout(saveNow, SAVE_DELAY_MS);
    return () => clearTimeout(t);
  }, [hydrated, text, limit, basis, spellcheck]);

  // 탭을 닫거나 다른 데로 옮겨 갈 때는 기다리지 않고 바로 저장하고,
  // 그래도 저장하지 못했으면 브라우저의 '나가시겠어요?' 확인을 띄운다
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === "hidden") saveNow();
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveNow() || !latest.current.text) return;
      e.preventDefault();
      e.returnValue = "";
    };
    document.addEventListener("visibilitychange", flush);
    window.addEventListener("pagehide", saveNow);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", flush);
      window.removeEventListener("pagehide", saveNow);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, []);

  useEffect(() => {
    if (!confirmClear) return;
    const t = setTimeout(() => setConfirmClear(false), CLEAR_CONFIRM_MS);
    return () => clearTimeout(t);
  }, [confirmClear]);

  const counts = useMemo(() => countText(text), [text]);
  const [selStart, selEnd] = selection;
  const selected = selEnd > selStart ? text.slice(selStart, selEnd) : "";
  const selCounts = useMemo(() => (selected ? countText(selected) : null), [selected]);

  const current = basisValue(counts, basis);
  const over = limit !== null && current > limit;
  const bytesGoal = limit !== null && basis === "bytes-kr";
  const ratio = limit ? Math.min(current / limit, 1) : 0;
  const cut = useMemo(
    () => (limit !== null && over ? overflowStart(text, limit, basis) : null),
    [text, limit, basis, over],
  );

  function readSelection() {
    const el = textareaRef.current;
    if (el) setSelection([el.selectionStart, el.selectionEnd]);
  }

  function clear() {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    setText("");
    setSelection([0, 0]);
    setConfirmClear(false);
    textareaRef.current?.focus();
  }

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col gap-3 p-3 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-base font-bold text-point">글자수 세기</h1>
        {/* 저장 상태. 폭을 잡아 둬 글자가 바뀌어도 옆 버튼이 밀리지 않는다 */}
        <p
          role="status"
          className={`mr-auto flex min-w-24 items-center gap-1 text-xs ${
            saveState === "failed" ? "text-[#c0392b]" : "text-ink/40"
          }`}
        >
          {saveState === "failed" ? (
            <>
              <CircleAlert aria-hidden className="size-3.5" />
              저장하지 못했어요
            </>
          ) : (
            <>
              <Check aria-hidden className="size-3.5" />
              자동 저장됨
            </>
          )}
        </p>
        <button
          type="button"
          role="switch"
          aria-checked={spellcheck}
          onClick={() => {
            setSpellcheck((v) => !v);
            // 밑줄은 입력칸에 포커스가 있을 때 다시 그려진다
            textareaRef.current?.focus();
          }}
          className="group flex items-center gap-2 px-1 text-xs text-ink/70"
        >
          맞춤법 검사
          <span className="relative h-4 w-7 rounded-full bg-ink/15 transition-colors group-aria-checked:bg-point">
            <span className="absolute top-0.5 left-0.5 size-3 rounded-full bg-white shadow-sm transition-transform group-aria-checked:translate-x-3" />
          </span>
        </button>
        <button type="button" onClick={() => copy(text)} disabled={!text} className={BUTTON}>
          <Copy aria-hidden className="size-3.5" />
          전체 복사
        </button>
        <button
          type="button"
          onClick={clear}
          disabled={!text}
          className={`${BUTTON} ${confirmClear ? "border-[#b54545]/40! text-[#b54545]!" : ""}`}
        >
          <Trash2 aria-hidden className="size-3.5" />
          {confirmClear ? "한 번 더 누르면 지워요" : "지우기"}
        </button>
      </div>

      {/* 제한을 넘긴 부분은 textarea 뒤에 같은 글을 겹쳐 그려 배경만 칠한다 */}
      <div className={`relative min-h-48 flex-1 overflow-hidden focus-within:border-ink/30 ${PANEL}`}>
        <div ref={backdropRef} aria-hidden className={`${FIELD} pointer-events-none overflow-hidden text-transparent`}>
          {cut === null ? (
            text
          ) : (
            <>
              {text.slice(0, cut)}
              <mark className="rounded-sm bg-[#f6d6d6] text-transparent">{text.slice(cut)}</mark>
            </>
          )}
          {/* 끝 줄바꿈도 textarea처럼 한 줄을 차지하게 한다 */}
          {" "}
        </div>
        <textarea
          ref={textareaRef}
          aria-label="글자를 셀 글"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            readSelection();
          }}
          onSelect={readSelection}
          onScroll={(e) => {
            if (backdropRef.current) backdropRef.current.scrollTop = e.currentTarget.scrollTop;
          }}
          placeholder="여기에 글을 쓰거나 붙여 넣으면 바로 글자 수를 세요."
          spellCheck={spellcheck}
          lang="ko"
          className={`${FIELD} resize-none overflow-y-auto bg-transparent text-ink focus:outline-none`}
        />
        {/* 제한 막대는 입력칸 아랫변에 겹쳐 그려, 제한을 정하고 지워도 배치가 그대로다 */}
        {limit !== null && (
          <div
            role="progressbar"
            aria-label="제한 대비"
            aria-valuemin={0}
            aria-valuemax={limit}
            aria-valuenow={Math.min(current, limit)}
            className="absolute inset-x-0 bottom-0 h-1 bg-ink/[0.06]"
          >
            <div
              className={`h-full ${over ? "bg-[#c0392b]" : "bg-point"}`}
              style={{ width: `${ratio * 100}%` }}
            />
          </div>
        )}
        {/* 드래그로 고른 부분의 길이는 입력칸 위에 작은 표로 띄운다 */}
        <p
          aria-live="polite"
          className={`pointer-events-none absolute right-5 bottom-3 rounded-full bg-point px-3 py-1 text-xs text-white tabular-nums shadow-sm ${selCounts ? "" : "hidden"}`}
        >
          {selCounts &&
            `선택 ${fmt(selCounts.withSpaces)}자 · 공백 제외 ${fmt(selCounts.noSpaces)}자`}
        </p>
      </div>

      {/* 카드 없이 입력칸 아래에 바로 둔다: 왼쪽은 글자 수, 오른쪽은 제한 */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 px-1">
        <div className="flex items-end gap-5">
          <BigStat
            label="공백 포함"
            value={counts.withSpaces}
            unit="자"
            goal={basis === "with-spaces" ? limit : null}
            active={basis === "with-spaces"}
          />
          {/* 둘째 칸은 늘 하나 — 바이트를 제한 기준으로 고르면 바이트로 바꾼다 */}
          {bytesGoal ? (
            <BigStat label="바이트(한글 2)" value={counts.bytesKr} unit="B" goal={limit} active />
          ) : (
            <BigStat
              label="공백 제외"
              value={counts.noSpaces}
              unit="자"
              goal={basis === "no-spaces" ? limit : null}
              active={basis === "no-spaces"}
            />
          )}
          <button
            type="button"
            aria-expanded={showMore}
            aria-controls="char-more"
            onClick={() => setShowMore((v) => !v)}
            className="mb-1 flex shrink-0 items-center gap-0.5 text-xs text-ink/50 hover:text-ink"
          >
            {showMore ? "접기" : "자세히"}
            <ChevronDown aria-hidden className={`size-3.5 ${showMore ? "rotate-180" : ""}`} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="char-limit" className="text-xs text-ink/60">
            제한
          </label>
          <Select
            placement="up"
            label="제한 기준"
            value={basis}
            onChange={setBasis}
            options={(Object.keys(BASIS_LABELS) as Basis[]).map((b) => ({ value: b, label: BASIS_LABELS[b] }))}
          />
          <NumberCombo
            id="char-limit"
            value={limit}
            presets={LIMIT_PRESETS}
            unit={basis === "bytes-kr" ? "B" : "자"}
            placeholder="직접 입력"
            format={fmt}
            onChange={(n) => setLimit(n === null ? null : Math.min(n, MAX_LIMIT))}
          />
        </div>
      </div>
      {showMore && (
        <div id="char-more" className="-mt-1 flex flex-wrap gap-x-4 gap-y-0.5 px-1 text-xs">
          {bytesGoal ? (
            <SmallStat label="공백 제외" value={counts.noSpaces} unit="자" />
          ) : (
            <SmallStat label="바이트(한글 2)" value={counts.bytesKr} unit="B" />
          )}
          <SmallStat label="UTF-8" value={counts.bytesUtf8} unit="B" />
          <SmallStat label="단어" value={counts.words} unit="개" />
          <SmallStat label="줄" value={counts.lines} unit="줄" />
          <SmallStat label="문단" value={counts.paragraphs} unit="개" />
        </div>
      )}
      <CopyToast message={message} />
    </div>
  );
}
