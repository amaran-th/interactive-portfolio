"use client";

import { ArrowLeftRight, Copy, X } from "lucide-react";
import { Fragment, useMemo, useRef, useState } from "react";
import type React from "react";
import CopyToast from "../_shared/CopyToast";
import { Select } from "../_shared/Dropdown";
import { useCopyFeedback } from "../_shared/useCopyFeedback";
import {
  type ByteDecoder,
  type Encoding,
  type EucKrTable,
  type Radix,
  asciiBytes,
  buildEucKrTable,
  codePoints,
  decodeBytes,
  displayChar,
  eucKrBytes,
  formatBytes,
  formatCodePoint,
  formatUnits16,
  type Span,
  charByteLengths,
  charsToByteRange,
  looksLikeCodePoints,
  parseBytesSpans,
  parseCodePointSpans,
  pickRange,
  textSpans,
  utf16Bytes,
  utf16Units,
  utf8Bytes,
} from "./encoding";

const MAX_ROWS = 2000;
const STICKER =
  "rounded-lg border-2 border-point bg-white shadow-[3px_3px_0_0_var(--color-point)]";

const ENCODINGS: { id: Encoding; label: string }[] = [
  { id: "utf-8", label: "UTF-8" },
  { id: "utf-16be", label: "UTF-16" },
  { id: "euc-kr", label: "EUC-KR" },
  { id: "ascii", label: "ASCII" },
];

const RADIXES: { id: Radix; label: string }[] = [
  { id: 16, label: "16진수" },
  { id: 10, label: "10진수" },
  { id: 2, label: "2진수" },
];

const bytesLabel = (n: number) => `${n.toLocaleString()} ${n === 1 ? "byte" : "bytes"}`;

type EucKr = { table: EucKrTable; decoder: ByteDecoder } | null;

// 서버 렌더에서는 null. 첫 화면은 입력이 비어 표가 없으므로 서버·클라이언트
// 결과가 같고, 클라이언트에서 한 번만 표를 만든다.
function createEucKr(): EucKr {
  if (typeof window === "undefined") return null;
  try {
    const decoder = new TextDecoder("euc-kr", { fatal: true });
    return { decoder, table: buildEucKrTable(decoder) };
  } catch {
    return null;
  }
}

type ViewProps = { radix: Radix; eucKr: EucKr; onCopy: (text: string) => void };

// 인코딩 결과로 고를 수 있는 형식. 유니코드는 바이트 대신 U+AC00 코드포인트로 보여 준다.
type Target = Encoding | "unicode";
const TARGETS: { id: Target; label: string }[] = [
  ...ENCODINGS.map((e) => ({ id: e.id as Target, label: e.label })),
  { id: "unicode", label: "유니코드 (U+)" },
];

// 머리줄의 형식 고르기. 테두리 없이 글자만 보이고, 목록은 공통 드롭다운으로 그린다.
const HEAD_TRIGGER =
  "flex items-center gap-1 rounded-md py-1 pr-1.5 pl-2 text-sm font-bold text-point hover:bg-shade focus:outline-none focus-visible:ring-2 focus-visible:ring-main";

function HeaderSelect<T extends string>(props: {
  label: string;
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <Select
      label={props.label}
      value={props.value}
      options={props.options.map((o) => ({ value: o.id, label: o.label }))}
      onChange={props.onChange}
      triggerClassName={HEAD_TRIGGER}
    />
  );
}

const HeaderLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="py-1 text-sm font-bold text-point">{children}</span>
);

// 파파고 번역기와 같은 배치: 위에 [왼쪽 종류 ⇄ 오른쪽 종류] 줄, 아래에 한 상자를 반으로
// 나눈 왼쪽 입력·오른쪽 결과. 좁은 화면에서는 입력 위, 결과 아래로 쌓는다.
function Translator({
  leftHead,
  rightHead,
  onSwap,
  swapLabel,
  inputLabel,
  input,
  setInput,
  placeholder,
  mono,
  leftFoot,
  outputLabel,
  output,
  outputPlaceholder,
  error,
  rightFoot,
  copyLabel,
  onCopy,
  inputMark = null,
  outputParts,
  outputJoin = " ",
  outputMark = null,
  onInputSelect,
  onOutputSelect,
}: {
  /** 입력에서 칠할 범위 [시작, 끝) — UTF-16 인덱스 */
  inputMark?: Span | null;
  /** 결과를 문자별 조각으로 넘기면 outputMark 범위 [첫, 끝) 조각을 칠한다 */
  outputParts?: string[];
  /** 조각 사이에 넣을 글자(코드는 띄어 쓰고, 복원한 문자는 붙여 쓴다) */
  outputJoin?: string;
  outputMark?: Span | null;
  /** 입력에서 고른 범위. 글자를 치는 동안의 커서 이동은 null(하이라이트 지움)로 알린다 */
  onInputSelect?: (start: number | null, end?: number) => void;
  /** 결과에서 클릭·드래그로 고른 조각 범위 */
  onOutputSelect?: (range: Span | null) => void;
  leftHead: React.ReactNode;
  rightHead: React.ReactNode;
  onSwap: () => void;
  swapLabel: string;
  inputLabel: string;
  input: string;
  setInput: (t: string) => void;
  placeholder: string;
  mono?: boolean;
  leftFoot: React.ReactNode;
  outputLabel: string;
  output: string;
  outputPlaceholder: string;
  error?: string | null;
  rightFoot?: React.ReactNode;
  copyLabel: string;
  onCopy: (text: string) => void;
}) {
  const backRef = useRef<HTMLDivElement>(null);
  // 글자를 치면 커서도 움직여 select가 바로 뒤따라온다. 친 직후의 커서 이동은 하이라이트하지 않는다.
  const typedAtRef = useRef(0);
  const field = `p-5 pr-12 text-xl leading-relaxed whitespace-pre-wrap break-words [scrollbar-gutter:stable] ${mono ? "font-mono" : ""}`;
  return (
    <div className={`shrink-0 overflow-hidden ${STICKER}`}>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center border-b-2 border-point/15">
        <div className="flex justify-center px-2 py-2.5">{leftHead}</div>
        <button
          type="button"
          aria-label={swapLabel}
          title="방향 바꾸기"
          onClick={onSwap}
          className="grid size-9 place-items-center rounded-full text-point hover:bg-shade"
        >
          <ArrowLeftRight aria-hidden className="size-5" />
        </button>
        <div className="flex justify-center px-2 py-2.5">{rightHead}</div>
      </div>

      <div className="grid divide-y-2 divide-point/15 md:grid-cols-2 md:divide-x-2 md:divide-y-0">
        <div className="relative flex h-48 flex-col md:h-60">
          {/* textarea는 일부만 칠할 수 없어, 같은 글을 뒤 층에 투명하게 그리고 고른 문자만 배경을 칠한다 */}
          <div className="relative flex min-h-0 flex-1">
            <div
              ref={backRef}
              aria-hidden
              className={`pointer-events-none absolute inset-0 overflow-hidden text-transparent ${field}`}
            >
              {inputMark ? (
                <>
                  {input.slice(0, inputMark[0])}
                  <mark className="rounded bg-main/30 text-transparent">{input.slice(inputMark[0], inputMark[1])}</mark>
                  {input.slice(inputMark[1])}
                </>
              ) : (
                input
              )}{" "}
            </div>
            <textarea
              aria-label={inputLabel}
              value={input}
              onChange={(e) => {
                typedAtRef.current = performance.now();
                setInput(e.target.value);
              }}
              onSelect={(e) => {
                if (!onInputSelect) return;
                const { selectionStart: start, selectionEnd: end } = e.currentTarget;
                if (start === end && performance.now() - typedAtRef.current < 50) {
                  onInputSelect(null);
                  return;
                }
                onInputSelect(start, end);
              }}
              onScroll={(e) => {
                if (backRef.current) backRef.current.scrollTop = e.currentTarget.scrollTop;
              }}
              placeholder={placeholder}
              className={`relative flex-1 resize-none bg-transparent focus:outline-none ${field}`}
            />
          </div>
          {input && (
            <button
              type="button"
              aria-label="지우기"
              onClick={() => setInput("")}
              className="absolute top-4 right-4 grid size-8 place-items-center rounded-full text-ink/50 hover:bg-shade hover:text-point"
            >
              <X aria-hidden className="size-5" />
            </button>
          )}
          <p className="flex h-11 items-center px-5 text-xs text-ink/50 tabular-nums">{leftFoot}</p>
        </div>

        <section aria-label={outputLabel} className="flex h-48 flex-col bg-shade/40 md:h-60">
          <div aria-live="polite" className="min-h-0 flex-1 overflow-y-auto p-5">
            {output ? (
              <p
                className={`text-xl leading-relaxed break-all whitespace-pre-wrap text-ink ${mono ? "" : "font-mono"} ${onOutputSelect ? "cursor-text" : ""}`}
                onMouseUp={(e) => {
                  if (!onOutputSelect) return;
                  // 드래그로 고르면 걸친 조각 전체, 클릭이면 그 조각 하나
                  const sel = window.getSelection();
                  if (sel && !sel.isCollapsed) {
                    const idx = [...e.currentTarget.querySelectorAll<HTMLElement>("[data-part]")]
                      .filter((n) => sel.containsNode(n, true))
                      .map((n) => Number(n.dataset.part));
                    if (idx.length) {
                      onOutputSelect([Math.min(...idx), Math.max(...idx) + 1]);
                      return;
                    }
                  }
                  const hit = (e.target as HTMLElement).closest<HTMLElement>("[data-part]");
                  onOutputSelect(hit ? [Number(hit.dataset.part), Number(hit.dataset.part) + 1] : null);
                }}
              >
                {outputParts
                  ? outputParts.map((part, i) => {
                      const on = outputMark !== null && i >= outputMark[0] && i < outputMark[1];
                      return (
                        <Fragment key={i}>
                          {i > 0 && outputJoin}
                          {on ? (
                            <mark
                              data-part={i}
                              ref={i === outputMark![0] ? (el) => el?.scrollIntoView({ block: "nearest" }) : undefined}
                              className="rounded bg-main/30 text-ink"
                            >
                              {part}
                            </mark>
                          ) : (
                            <span data-part={i}>{part}</span>
                          )}
                        </Fragment>
                      );
                    })
                  : output}
              </p>
            ) : (
              <p className="text-xl leading-relaxed text-ink/30">{outputPlaceholder}</p>
            )}
            {error && (
              <p role="alert" className="mt-3 text-sm font-bold text-red-600">
                {error}
              </p>
            )}
          </div>
          <div className="flex h-11 items-center gap-2 px-5 pr-3">
            <span className="text-xs text-ink/50 tabular-nums">{rightFoot}</span>
            <button
              type="button"
              aria-label={copyLabel}
              title={copyLabel}
              disabled={!output}
              onClick={() => onCopy(output)}
              className="ml-auto grid size-8 place-items-center rounded-full text-point hover:bg-white disabled:opacity-30"
            >
              <Copy aria-hidden className="size-4" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function Cell({ value, onCopy }: { value: string | null; onCopy: (text: string) => void }) {
  if (value === null) return <td className="px-2 py-1.5 text-ink/40">없음</td>;
  return (
    <td className="px-2 py-1.5">
      <button
        type="button"
        onClick={() => onCopy(value)}
        className="text-left font-mono whitespace-nowrap hover:text-main"
      >
        {value}
      </button>
    </td>
  );
}

function EncodeView({
  radix,
  eucKr,
  onCopy,
  text,
  setText,
  target,
  setTarget,
  onSwap,
}: ViewProps & {
  text: string;
  setText: (t: string) => void;
  target: Target;
  setTarget: (t: Target) => void;
  onSwap: (code: string) => void;
}) {
  const cps = useMemo(() => codePoints(text), [text]);
  const totals = useMemo(() => {
    const collect = (toBytes: (cp: number) => number[] | null) => {
      const bytes: number[] = [];
      let missing = 0;
      for (const cp of cps) {
        const b = toBytes(cp);
        if (b) bytes.push(...b);
        else missing++;
      }
      return { bytes, missing };
    };
    return [
      { id: "utf-8" as Target, label: "UTF-8", ...collect(utf8Bytes) },
      { id: "utf-16be" as Target, label: "UTF-16", ...collect(utf16Bytes) },
      { id: "euc-kr" as Target, label: "EUC-KR", ...collect((cp) => (eucKr ? eucKrBytes(cp, eucKr.table) : null)) },
      { id: "ascii" as Target, label: "ASCII", ...collect(asciiBytes) },
    ];
  }, [cps, eucKr]);
  const rows = cps.slice(0, MAX_ROWS);
  // 고른 문자 범위 [첫, 끝). 입력 선택·결과 클릭·표 행 클릭이 모두 이 값을 바꾼다.
  // 글을 줄여 범위를 벗어나면 고르지 않은 것으로 본다
  const [selRaw, setSel] = useState<Span | null>(null);
  const sel = selRaw && selRaw[1] <= cps.length ? selRaw : null;
  // 문자마다 원문 위치. 코드포인트가 U+FFFF를 넘으면 UTF-16 두 칸을 차지한다
  const spans = useMemo(() => textSpans(text), [text]);
  const inputMark: Span | null = sel ? [spans[sel[0]][0], spans[sel[1] - 1][1]] : null;

  // 오른쪽에 보일 결과. 문자별 조각을 띄어 이어 붙인 것이라, 고른 문자의 조각만 칠할 수 있다
  const picked = totals.find((t) => t.id === target);
  const outputParts = useMemo(() => {
    if (target === "unicode") return cps.map(formatCodePoint);
    if (!picked || picked.missing > 0) return [];
    const toBytes: Record<Encoding, (cp: number) => number[] | null> = {
      "utf-8": utf8Bytes,
      "utf-16be": utf16Bytes,
      "euc-kr": (cp) => (eucKr ? eucKrBytes(cp, eucKr.table) : null),
      ascii: asciiBytes,
    };
    return cps.map((cp) => formatBytes(toBytes[target](cp) ?? [], radix));
  }, [cps, target, picked, eucKr, radix]);
  const output = outputParts.join(" ");
  const error = picked && picked.missing > 0 ? `${picked.label}로 표현할 수 없는 문자가 ${picked.missing}개 있어요` : null;

  return (
    <>
      <Translator
        leftHead={<HeaderLabel>문자</HeaderLabel>}
        rightHead={<HeaderSelect label="인코딩" value={target} options={TARGETS} onChange={setTarget} />}
        onSwap={() => onSwap(output)}
        swapLabel="방향 바꾸기 (디코딩으로)"
        inputLabel="변환할 문자"
        input={text}
        setInput={setText}
        placeholder="문자를 넣어 보세요 (예: 가A😀)"
        leftFoot={`${cps.length.toLocaleString()}자`}
        outputLabel="인코딩 결과"
        output={output}
        outputPlaceholder={target === "unicode" ? "U+AC00" : "EA B0 80"}
        error={error}
        rightFoot={
          output && (target === "unicode" ? `코드포인트 ${cps.length.toLocaleString()}개` : picked && bytesLabel(picked.bytes.length))
        }
        copyLabel="결과 복사"
        onCopy={onCopy}
        inputMark={inputMark}
        outputParts={outputParts}
        outputMark={sel}
        onInputSelect={(start, end) => setSel(start === null ? null : pickRange(spans, start, end ?? start))}
        onOutputSelect={setSel}
      />
      {rows.length > 0 && (
        // 남은 높이를 채우고 표 안에서만 스크롤한다. 머리줄은 위에 붙여 둔다
        <div className="min-h-40 flex-1 overflow-auto rounded-lg border-2 border-point bg-white">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-shade text-left text-xs text-point">
              <tr>
                {["문자", "유니코드", "UTF-8", "UTF-16", "EUC-KR", "ASCII"].map((h) => (
                  <th key={h} className="px-2 py-1.5 font-bold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-point/10">
              {rows.map((cp, i) => {
                const euc = eucKr ? eucKrBytes(cp, eucKr.table) : null;
                const ascii = asciiBytes(cp);
                const isSel = sel !== null && i >= sel[0] && i < sel[1];
                return (
                  <tr
                    key={i}
                    onClick={() => setSel(isSel ? null : [i, i + 1])}
                    className={`cursor-pointer ${isSel ? "bg-main/15" : "hover:bg-shade/60"}`}
                  >
                    <td className={`px-2 py-1.5 text-base ${isSel ? "shadow-[inset_3px_0_0_var(--color-point)]" : ""}`}>
                      <button
                        type="button"
                        aria-pressed={isSel}
                        aria-label={`${i + 1}번째 문자 ${displayChar(cp)} 고르기`}
                        className="min-w-6 text-left"
                      >
                        {displayChar(cp)}
                      </button>
                    </td>
                    <Cell value={formatCodePoint(cp)} onCopy={onCopy} />
                    <Cell value={formatBytes(utf8Bytes(cp), radix)} onCopy={onCopy} />
                    <Cell value={formatUnits16(utf16Units(cp), radix)} onCopy={onCopy} />
                    <Cell value={euc && formatBytes(euc, radix)} onCopy={onCopy} />
                    <Cell value={ascii && formatBytes(ascii, radix)} onCopy={onCopy} />
                  </tr>
                );
              })}
            </tbody>
          </table>
          {cps.length > MAX_ROWS && (
            <p className="border-t border-point/10 px-3 py-2 text-xs text-ink/60">
              표는 앞 {MAX_ROWS.toLocaleString()}자까지만 보여요. 위 결과는 전체를 계산해요.
            </p>
          )}
        </div>
      )}
    </>
  );
}

function DecodeView({
  radix,
  eucKr,
  onCopy,
  input,
  setInput,
  encoding,
  setEncoding,
  onSwap,
}: ViewProps & {
  input: string;
  setInput: (t: string) => void;
  encoding: Encoding;
  setEncoding: (e: Encoding) => void;
  onSwap: (text: string) => void;
}) {
  const asCodePoints = looksLikeCodePoints(input);
  // 복원한 문자마다 그 문자를 만든 입력 범위(charSpans)도 함께 계산한다(하이라이트용)
  const result = useMemo(() => {
    if (!input.trim()) return null;
    if (asCodePoints) {
      const p = parseCodePointSpans(input);
      return { text: p.values.map((v) => String.fromCodePoint(v)).join(""), error: p.error, count: p.values.length, charSpans: p.spans };
    }
    const p = parseBytesSpans(input, radix);
    const d = decodeBytes(p.values, encoding, eucKr?.decoder ?? null);
    const lens = charByteLengths(d.text, encoding);
    const charSpans = lens.map((_, k): Span => {
      const [b0, b1] = charsToByteRange(lens, k, k + 1);
      return [p.spans[b0][0], p.spans[b1 - 1][1]];
    });
    return { text: d.text, error: p.error ?? d.error, count: p.values.length, charSpans };
  }, [input, asCodePoints, radix, encoding, eucKr]);
  const chars = useMemo(() => (result ? Array.from(result.text) : []), [result]);
  const [selRaw, setSel] = useState<Span | null>(null);
  const sel = selRaw && selRaw[1] <= chars.length ? selRaw : null;
  const charSpans = result?.charSpans ?? [];
  const inputMark: Span | null = sel ? [charSpans[sel[0]][0], charSpans[sel[1] - 1][1]] : null;

  return (
    <Translator
      leftHead={
        asCodePoints ? (
          <HeaderLabel>
            유니코드 <span className="font-normal text-ink/50">(자동 감지)</span>
          </HeaderLabel>
        ) : (
          <HeaderSelect
            label="인코딩"
            value={encoding}
            options={ENCODINGS}
            onChange={setEncoding}
          />
        )
      }
      rightHead={<HeaderLabel>문자</HeaderLabel>}
      onSwap={() => onSwap(result?.text ?? "")}
      swapLabel="방향 바꾸기 (인코딩으로)"
      inputLabel="바이트 또는 코드"
      input={input}
      setInput={setInput}
      placeholder="EA B0 80 또는 U+AC00"
      mono
      leftFoot={
        result
          ? asCodePoints
            ? `코드포인트 ${result.count.toLocaleString()}개`
            : bytesLabel(result.count)
          : "인코딩을 고르고 바이트를 넣어요"
      }
      outputLabel="복원한 문자"
      output={result?.text ?? ""}
      outputPlaceholder="문자"
      error={result?.error}
      rightFoot={result?.text ? `${codePoints(result.text).length.toLocaleString()}자` : null}
      copyLabel="문자 복사"
      onCopy={onCopy}
      inputMark={inputMark}
      outputParts={chars}
      outputJoin=""
      outputMark={sel}
      onInputSelect={(start, end) => setSel(start === null ? null : pickRange(charSpans, start, end ?? start))}
      onOutputSelect={setSel}
    />
  );
}

export default function TextEncoding() {
  // 방향은 탭 없이 번역기처럼 가운데 ⇄ 버튼으로만 바꾼다
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  // 두 탭의 입력·형식을 위에서 들고 있어야 ⇄로 넘길 때 내용을 이어 줄 수 있다
  const [encodeText, setEncodeText] = useState("");
  const [target, setTarget] = useState<Target>("utf-8");
  const [decodeInput, setDecodeInput] = useState("");
  const [encoding, setEncoding] = useState<Encoding>("utf-8");
  const [radix, setRadix] = useState<Radix>(16);
  const [eucKr] = useState(createEucKr);
  const { copy, message } = useCopyFeedback();

  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-base font-bold text-point">문자 인코딩 변환기</h1>
        <div className="flex items-center gap-2 text-sm font-bold text-point">
          <span aria-hidden>진법 표기</span>
          <Select
            label="진법 표기"
            value={String(radix)}
            options={RADIXES.map((r) => ({ value: String(r.id), label: r.label }))}
            onChange={(v) => setRadix(Number(v) as Radix)}
            triggerClassName="flex h-8 items-center gap-1 rounded-md border-2 border-point bg-white pr-1.5 pl-2.5 text-sm font-bold text-point hover:bg-shade"
          />
        </div>
      </div>
      {mode === "encode" ? (
        <EncodeView
          radix={radix}
          eucKr={eucKr}
          onCopy={copy}
          text={encodeText}
          setText={setEncodeText}
          target={target}
          setTarget={setTarget}
          onSwap={(code) => {
            if (code) setDecodeInput(code);
            if (target !== "unicode") setEncoding(target);
            setMode("decode");
          }}
        />
      ) : (
        <DecodeView
          radix={radix}
          eucKr={eucKr}
          onCopy={copy}
          input={decodeInput}
          setInput={setDecodeInput}
          encoding={encoding}
          setEncoding={(e) => {
            setEncoding(e);
            setTarget(e);
          }}
          onSwap={(text) => {
            if (text) setEncodeText(text);
            setMode("encode");
          }}
        />
      )}
      <CopyToast message={message} />
    </div>
  );
}
