"use client";

import { ArrowLeftRight, Check, ChevronDown, CircleAlert, Copy, NotebookPen, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import CopyToast from "../_shared/CopyToast";
import { useCopyFeedback } from "../_shared/useCopyFeedback";
import {
  type Basis,
  BASIS_LABELS,
  MAX_LIMIT,
  basisValue,
  countText,
  limitFromQuestion,
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
  const [question, setQuestion] = useState("");
  const [memo, setMemo] = useState("");
  const [memoOpen, setMemoOpen] = useState(false);
  const [memoSide, setMemoSide] = useState<"left" | "right">("right");
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
      setQuestion(saved.question);
      setMemo(saved.memo);
      setMemoOpen(saved.memoOpen);
      setMemoSide(saved.memoSide);
      setText(saved.text);
      setLimit(saved.limit);
      setBasis(saved.basis);
      setSpellcheck(saved.spellcheck);
    }
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // 나갈 때 바로 저장하려고 마지막 값을 들고 있는다
  const latest = useRef({ question, memo, memoOpen, memoSide, text, limit, basis, spellcheck });
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
    latest.current = { question, memo, memoOpen, memoSide, text, limit, basis, spellcheck };
    dirty.current = true;
    const t = setTimeout(saveNow, SAVE_DELAY_MS);
    return () => clearTimeout(t);
  }, [hydrated, question, memo, memoOpen, memoSide, text, limit, basis, spellcheck]);

  // 탭을 닫거나 다른 데로 옮겨 갈 때는 기다리지 않고 바로 저장하고,
  // 그래도 저장하지 못했으면 브라우저의 '나가시겠어요?' 확인을 띄운다
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === "hidden") saveNow();
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      const { text: t, question: q, memo: m } = latest.current;
      if (saveNow() || !(t || q || m)) return;
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

  // 문항에 적힌 분량. 지금 제한과 다를 때만 '적용' 버튼을 띄운다
  const suggested = limitFromQuestion(question);
  const showSuggest = suggested !== null && (suggested.limit !== limit || suggested.basis !== basis);

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
    // 넓은 화면에서는 글 쓰는 칸 오른쪽에 메모, 좁은 화면에서는 아래에 메모를 둔다
    <div className="mx-auto flex h-full max-w-6xl flex-col justify-center gap-3 p-3 sm:p-6 lg:flex-row lg:gap-4">
    <div className="flex min-h-0 w-full max-w-4xl flex-1 flex-col gap-3">
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
        <button
          type="button"
          aria-pressed={memoOpen}
          aria-controls="char-memo"
          onClick={() => setMemoOpen((v) => !v)}
          className={`${BUTTON} ${memoOpen ? "border-point/40! text-point!" : ""}`}
        >
          <NotebookPen aria-hidden className="size-3.5" />
          메모
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

      {/* 자기소개서 문항. 붙여 넣은 문항에 분량이 적혀 있으면 그 제한을 바로 적용할 수 있다 */}
      <div className={`flex items-start gap-2 px-3 py-1.5 focus-within:border-ink/30 ${PANEL}`}>
        <label htmlFor="char-question" className="shrink-0 py-1 text-xs leading-6 font-bold text-point">
          문항
        </label>
        <textarea
          id="char-question"
          rows={1}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="자기소개서 문항을 붙여 넣으세요 (예: 지원 동기를 500자 이내로 작성해 주세요)"
          className="max-h-32 min-h-8 flex-1 resize-none bg-transparent py-1 text-sm leading-6 text-ink [field-sizing:content] placeholder:text-ink/35 focus:outline-none"
        />
        {showSuggest && (
          <button
            type="button"
            onClick={() => {
              setLimit(suggested.limit);
              setBasis(suggested.basis);
            }}
            className="mt-0.5 shrink-0 rounded-md bg-point/10 px-2 py-1 text-xs font-bold whitespace-nowrap text-point hover:bg-point/15"
          >
            {BASIS_LABELS[suggested.basis]} {fmt(suggested.limit)}
            {suggested.basis === "bytes-kr" ? "B" : "자"} 제한 적용
          </button>
        )}
        {question && (
          <button
            type="button"
            aria-label="문항 지우기"
            onClick={() => setQuestion("")}
            className="mt-0.5 grid size-6 shrink-0 place-items-center rounded text-ink/40 hover:text-ink"
          >
            <X aria-hidden className="size-3.5" />
          </button>
        )}
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
    </div>

      {/* 메모 — 떠오른 경험·키워드를 적어 두는 곳. 글자 수에는 넣지 않는다 */}
      {memoOpen && (
        <aside
          id="char-memo"
          aria-label="메모"
          className={`flex h-48 shrink-0 flex-col focus-within:border-[#d9c787] lg:h-auto lg:w-72 ${memoSide === "left" ? "lg:order-first" : ""} rounded-lg border border-[#ecdfb4] bg-[#fffbea]`}
        >
          <div className="flex items-center gap-2 border-b border-[#ecdfb4] py-1.5 pr-1.5 pl-3">
            <h2 className="text-xs font-bold text-point">메모</h2>
            {/* 넓은 화면에서만 좌우가 있다. 좁은 화면에서는 늘 글 아래 */}
            <button
              type="button"
              aria-label={memoSide === "right" ? "메모를 왼쪽으로 옮기기" : "메모를 오른쪽으로 옮기기"}
              title={memoSide === "right" ? "왼쪽으로 옮기기" : "오른쪽으로 옮기기"}
              onClick={() => setMemoSide((v) => (v === "right" ? "left" : "right"))}
              className="ml-auto hidden size-6 place-items-center rounded text-ink/40 hover:text-ink lg:grid"
            >
              <ArrowLeftRight aria-hidden className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label="메모 닫기"
              onClick={() => setMemoOpen(false)}
              className="grid size-6 place-items-center rounded text-ink/40 hover:text-ink max-lg:ml-auto"
            >
              <X aria-hidden className="size-3.5" />
            </button>
          </div>
          <textarea
            aria-label="메모 내용"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="글 작성에 필요한 내용을 메모할 수 있는 공간입니다."
            className="min-h-0 flex-1 resize-none bg-transparent p-3 text-sm leading-relaxed text-ink placeholder:text-ink/35 focus:outline-none"
          />
        </aside>
      )}
      <CopyToast message={message} />
    </div>
  );
}
