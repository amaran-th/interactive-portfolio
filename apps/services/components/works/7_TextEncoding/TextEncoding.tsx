"use client";

import { useMemo, useState } from "react";
import CopyToast from "../_shared/CopyToast";
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
  looksLikeCodePoints,
  parseBytes,
  parseCodePoints,
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

function EncodeView({ radix, eucKr, onCopy }: ViewProps) {
  const [text, setText] = useState("");
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
      { label: "UTF-8", ...collect(utf8Bytes) },
      { label: "UTF-16", ...collect(utf16Bytes) },
      { label: "EUC-KR", ...collect((cp) => (eucKr ? eucKrBytes(cp, eucKr.table) : null)) },
      { label: "ASCII", ...collect(asciiBytes) },
    ];
  }, [cps, eucKr]);
  const rows = cps.slice(0, MAX_ROWS);

  return (
    <>
      <textarea
        aria-label="변환할 글자"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="글자를 넣어 보세요 (예: 가A😀)"
        rows={3}
        className={`w-full resize-y p-3 text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-main ${STICKER}`}
      />
      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border-2 border-point bg-white">
          <table className="w-full text-sm">
            <thead className="bg-shade text-left text-xs text-point">
              <tr>
                {["글자", "유니코드", "UTF-8", "UTF-16", "EUC-KR", "ASCII"].map((h) => (
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
                return (
                  <tr key={i}>
                    <td className="px-2 py-1.5 text-base">{displayChar(cp)}</td>
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
              표는 앞 {MAX_ROWS.toLocaleString()}자까지만 보여요. 아래 바이트열은 전체를
              계산해요.
            </p>
          )}
        </div>
      )}
      {cps.length > 0 && (
        <dl className="flex flex-col gap-2">
          {totals.map((t) => (
            <div key={t.label} className="rounded-lg border-2 border-point/20 bg-white p-3">
              <dt className="text-xs font-bold text-point">
                {t.label}
                {t.missing === 0 && ` · ${t.bytes.length}바이트`}
              </dt>
              <dd className="mt-1 text-sm">
                {t.missing > 0 ? (
                  <span className="text-ink/60">
                    표현할 수 없는 글자가 {t.missing}개 있어요
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onCopy(formatBytes(t.bytes, radix))}
                    className="text-left font-mono break-all hover:text-main"
                  >
                    {formatBytes(t.bytes, radix)}
                  </button>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </>
  );
}

function DecodeView({ radix, eucKr, onCopy }: ViewProps) {
  const [input, setInput] = useState("");
  const [encoding, setEncoding] = useState<Encoding>("utf-8");
  const asCodePoints = looksLikeCodePoints(input);
  const result = useMemo(() => {
    if (!input.trim()) return null;
    if (asCodePoints) {
      const p = parseCodePoints(input);
      return { text: p.values.map((v) => String.fromCodePoint(v)).join(""), error: p.error };
    }
    const p = parseBytes(input, radix);
    const d = decodeBytes(p.values, encoding, eucKr?.decoder ?? null);
    return { text: d.text, error: p.error ?? d.error };
  }, [input, asCodePoints, radix, encoding, eucKr]);

  return (
    <>
      <textarea
        aria-label="바이트 또는 코드"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="EA B0 80 또는 U+AC00"
        rows={3}
        className={`w-full resize-y p-3 font-mono text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-main ${STICKER}`}
      />
      <fieldset className="flex flex-wrap items-center gap-2 text-sm" disabled={asCodePoints}>
        <legend className="sr-only">인코딩</legend>
        {ENCODINGS.map((e) => (
          <label
            key={e.id}
            className={`cursor-pointer rounded-full border-2 border-point px-3 py-1 font-bold ${
              encoding === e.id ? "bg-point text-white" : "bg-white text-point"
            } ${asCodePoints ? "opacity-40" : ""}`}
          >
            <input
              type="radio"
              name="encoding"
              value={e.id}
              checked={encoding === e.id}
              onChange={() => setEncoding(e.id)}
              className="sr-only"
            />
            {e.label}
          </label>
        ))}
        {asCodePoints && (
          <span className="text-xs text-ink/60">코드포인트 형식이라 인코딩 없이 읽어요</span>
        )}
      </fieldset>
      {result && (
        <div className="rounded-lg border-2 border-point bg-white p-4">
          <p
            aria-label="복원한 글자"
            className="min-h-8 text-2xl break-all whitespace-pre-wrap text-ink"
          >
            {result.text}
          </p>
          {result.error && (
            <p role="alert" className="mt-2 text-sm font-bold text-red-600">
              {result.error}
            </p>
          )}
          {result.text && (
            <button
              type="button"
              onClick={() => onCopy(result.text)}
              className="mt-3 rounded-md border-2 border-point px-3 py-1 text-sm font-bold text-point hover:bg-shade"
            >
              글자 복사
            </button>
          )}
        </div>
      )}
    </>
  );
}

export default function TextEncoding() {
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [radix, setRadix] = useState<Radix>(16);
  const [eucKr] = useState(createEucKr);
  const { copy, message } = useCopyFeedback();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="변환 방향"
          className="flex gap-1 rounded-lg border-2 border-point bg-white p-1"
        >
          {(
            [
              ["encode", "글자 → 코드"],
              ["decode", "코드 → 글자"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mode === id}
              onClick={() => setMode(id)}
              className={`rounded-md px-3 py-1.5 text-sm font-bold ${
                mode === id ? "bg-point text-white" : "text-point hover:bg-shade"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm font-bold text-point">
          진법
          <select
            value={radix}
            onChange={(e) => setRadix(Number(e.target.value) as Radix)}
            className="rounded-md border-2 border-point bg-white px-2 py-1"
          >
            {RADIXES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {mode === "encode" ? (
        <EncodeView radix={radix} eucKr={eucKr} onCopy={copy} />
      ) : (
        <DecodeView radix={radix} eucKr={eucKr} onCopy={copy} />
      )}
      <CopyToast message={message} />
    </div>
  );
}
