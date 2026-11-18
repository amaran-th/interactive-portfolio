// 문자 인코딩 계산. 화면(TextEncoding.tsx)과 node:test가 같이 쓴다.
// node:test가 그대로 실행하도록 다른 모듈을 import하지 않는다.

export type Encoding = "utf-8" | "utf-16be" | "euc-kr" | "ascii";
export type Radix = 16 | 10 | 2;
export type EucKrTable = Map<number, [number, number]>;
export type ByteDecoder = { decode(input: Uint8Array): string };
export type ParseResult = { values: number[]; error: string | null };
export type DecodeResult = { text: string; error: string | null };

const hex = (n: number, width = 2) =>
  n.toString(16).toUpperCase().padStart(width, "0");

const isHighSurrogate = (u: number) => u >= 0xd800 && u <= 0xdbff;
const isLowSurrogate = (u: number) => u >= 0xdc00 && u <= 0xdfff;
const isSurrogate = (u: number) => u >= 0xd800 && u <= 0xdfff;

export function codePoints(text: string): number[] {
  return Array.from(text, (c) => c.codePointAt(0)!);
}

export function utf8Bytes(cp: number): number[] {
  if (cp < 0x80) return [cp];
  if (cp < 0x800) return [0xc0 | (cp >> 6), 0x80 | (cp & 0x3f)];
  if (cp < 0x10000)
    return [0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f)];
  return [
    0xf0 | (cp >> 18),
    0x80 | ((cp >> 12) & 0x3f),
    0x80 | ((cp >> 6) & 0x3f),
    0x80 | (cp & 0x3f),
  ];
}

export function utf16Units(cp: number): number[] {
  if (cp < 0x10000) return [cp];
  const v = cp - 0x10000;
  return [0xd800 | (v >> 10), 0xdc00 | (v & 0x3ff)];
}

// 빅 엔디언
export function utf16Bytes(cp: number): number[] {
  return utf16Units(cp).flatMap((u) => [u >> 8, u & 0xff]);
}

export function asciiBytes(cp: number): number[] | null {
  return cp < 0x80 ? [cp] : null;
}

// 브라우저는 EUC-KR 인코딩을 지원하지 않아서, 디코더로 KS X 1001 영역
// (A1~FE × A1~FE)을 한 번 훑어 역방향 표를 만든다. 브라우저의 euc-kr
// 디코더는 실제로 CP949라 확장 영역도 풀지만, 이 표에는 넣지 않는다.
export function buildEucKrTable(decoder: ByteDecoder): EucKrTable {
  const table: EucKrTable = new Map();
  const buf = new Uint8Array(2);
  for (let b1 = 0xa1; b1 <= 0xfe; b1++) {
    for (let b2 = 0xa1; b2 <= 0xfe; b2++) {
      buf[0] = b1;
      buf[1] = b2;
      let s: string;
      try {
        s = decoder.decode(buf);
      } catch {
        continue;
      }
      const cps = codePoints(s);
      if (cps.length !== 1 || cps[0] === 0xfffd) continue;
      if (!table.has(cps[0])) table.set(cps[0], [b1, b2]);
    }
  }
  return table;
}

export function eucKrBytes(cp: number, table: EucKrTable): number[] | null {
  if (cp < 0x80) return [cp];
  const pair = table.get(cp);
  return pair ? [...pair] : null;
}

export function formatCodePoint(cp: number): string {
  return `U+${hex(cp, 4)}`;
}

// 표의 글자 칸에 보여 줄 모양. 보이지 않는 문자는 기호나 코드로 바꾼다.
export function displayChar(cp: number): string {
  if (cp === 0x20) return "␣";
  if (cp === 0x0a) return "↵";
  if (cp < 0x20 || (cp >= 0x7f && cp < 0xa0)) return formatCodePoint(cp);
  return String.fromCodePoint(cp);
}

function formatNumber(n: number, radix: Radix, bits: 8 | 16): string {
  if (radix === 10) return String(n);
  if (radix === 2) return n.toString(2).padStart(bits, "0");
  return hex(n, bits / 4);
}

export function formatBytes(bytes: number[], radix: Radix): string {
  return bytes.map((b) => formatNumber(b, radix, 8)).join(" ");
}

export function formatUnits16(units: number[], radix: Radix): string {
  return units.map((u) => formatNumber(u, radix, 16)).join(" ");
}

const DIGITS: Record<Radix, RegExp> = {
  16: /^[0-9a-f]+$/i,
  10: /^[0-9]+$/,
  2: /^[01]+$/,
};
const RADIX_NAME: Record<Radix, string> = { 16: "16진수", 10: "10진수", 2: "2진수" };

export type Span = [number, number];
export type SpannedResult = ParseResult & { spans: Span[] };

// 바이트열 입력을 읽는다. 16진수는 0x·\x 접두사를 지우고, 붙여 쓴 값
// (EAB080)은 2자리씩, 2진수는 8자리씩 자른다. 구분자는 공백·쉼표.
// spans[i]는 i번째 바이트가 입력에서 차지하는 [시작, 끝) 위치(하이라이트용).
export function parseBytesSpans(input: string, radix: Radix = 16): SpannedResult {
  // 접두사를 같은 길이의 공백으로 바꿔 원래 위치를 그대로 둔다
  let s = input;
  if (radix === 16) s = s.replace(/\\x|0x/gi, "  ");
  if (radix === 2) s = s.replace(/0b/gi, "  ");
  const width = radix === 16 ? 2 : radix === 2 ? 8 : 0;
  const values: number[] = [];
  const spans: Span[] = [];
  let i = 0;
  for (const m of s.matchAll(/[^\s,]+/g)) {
    const tok = m[0];
    const at = m.index;
    const where = `${i + 1}번째 값 ${tok}`;
    i++;
    if (!DIGITS[radix].test(tok))
      return { values, spans, error: `${where}: ${RADIX_NAME[radix]}가 아니에요` };
    const chunks: Span[] = [];
    if (width && tok.length > width) {
      if (tok.length % width !== 0)
        return { values, spans, error: `${where}: 자리 수가 ${width}의 배수가 아니에요` };
      for (let k = 0; k < tok.length; k += width) chunks.push([at + k, at + k + width]);
    } else {
      chunks.push([at, at + tok.length]);
    }
    for (const c of chunks) {
      const v = parseInt(input.slice(c[0], c[1]), radix);
      if (v > 255) return { values, spans, error: `${where}: 한 바이트(0~255)를 넘어요` };
      values.push(v);
      spans.push(c);
    }
  }
  return { values, spans, error: null };
}

export function parseBytes(input: string, radix: Radix = 16): ParseResult {
  const { values, error } = parseBytesSpans(input, radix);
  return { values, error };
}

export function looksLikeCodePoints(input: string): boolean {
  return /U\+|\\u|&#/i.test(input);
}

const CP_TOKEN =
  /U\+([0-9a-f]{1,6})|\\u\{([0-9a-f]{1,6})\}|\\u([0-9a-f]{4})|&#x([0-9a-f]{1,6});?|&#([0-9]{1,7});?/gi;

// 😀처럼 나뉜 서로게이트 쌍을 코드포인트 하나로 합친다. 위치도 두 토큰을 합친 범위가 된다.
function combineSurrogates(units: number[], unitSpans: Span[]): SpannedResult {
  const values: number[] = [];
  const spans: Span[] = [];
  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    if (isHighSurrogate(u) && i + 1 < units.length && isLowSurrogate(units[i + 1])) {
      values.push(0x10000 + ((u - 0xd800) << 10) + (units[i + 1] - 0xdc00));
      spans.push([unitSpans[i][0], unitSpans[i + 1][1]]);
      i++;
      continue;
    }
    if (isSurrogate(u))
      return { values, spans, error: `${i + 1}번째 코드 ${formatCodePoint(u)}: 짝이 없는 서로게이트예요` };
    values.push(u);
    spans.push(unitSpans[i]);
  }
  return { values, spans, error: null };
}

export function parseCodePointSpans(input: string): SpannedResult {
  const units: number[] = [];
  const unitSpans: Span[] = [];
  let last = 0;
  const fail = (error: string): SpannedResult => ({ ...combineSurrogates(units, unitSpans), error });
  for (const m of input.matchAll(CP_TOKEN)) {
    const gap = input.slice(last, m.index).replace(/[\s,]+/g, "");
    if (gap) return fail(`${gap}: 코드로 읽지 못했어요`);
    const v =
      m[5] !== undefined ? parseInt(m[5], 10) : parseInt(m[1] ?? m[2] ?? m[3] ?? m[4], 16);
    if (v > 0x10ffff)
      return fail(`${units.length + 1}번째 코드 ${m[0]}: 유니코드 범위(U+10FFFF)를 넘어요`);
    units.push(v);
    unitSpans.push([m.index, m.index + m[0].length]);
    last = m.index + m[0].length;
  }
  const tail = input.slice(last).replace(/[\s,]+/g, "");
  if (tail) return fail(`${tail}: 코드로 읽지 못했어요`);
  return combineSurrogates(units, unitSpans);
}

export function parseCodePoints(input: string): ParseResult {
  const { values, error } = parseCodePointSpans(input);
  return { values, error };
}

// ── 하이라이트용 대응 계산 ──

// 복원한 문자 하나가 쓴 바이트 수. 해독기는 정규형만 받으므로 다시 인코딩한 길이와 같다.
export function charByteLengths(text: string, encoding: Encoding): number[] {
  return codePoints(text).map((cp) => {
    if (encoding === "utf-8") return utf8Bytes(cp).length;
    if (encoding === "utf-16be") return utf16Units(cp).length * 2;
    if (encoding === "ascii") return 1;
    return cp < 0x80 ? 1 : 2;
  });
}

// 코드포인트마다 원문(UTF-16 인덱스)에서의 [시작, 끝)
export function textSpans(text: string): Span[] {
  const out: Span[] = [];
  let at = 0;
  for (const cp of codePoints(text)) {
    const len = cp > 0xffff ? 2 : 1;
    out.push([at, at + len]);
    at += len;
  }
  return out;
}

// 선택 [start, end)와 겹치는 항목의 [첫, 끝) 번호. 커서만 있으면(start = end) 그 자리를 포함하는 항목.
export function pickRange(spans: Span[], start: number, end: number): Span | null {
  let a = -1;
  let b = -1;
  for (let i = 0; i < spans.length; i++) {
    const [s, e] = spans[i];
    const hit = start === end ? s <= start && start <= e : s < end && e > start;
    if (!hit) continue;
    if (a < 0) a = i;
    b = i + 1;
    if (start === end) break;
  }
  return a < 0 ? null : [a, b];
}

// 바이트 [b0, b1)를 포함하는 문자 번호 범위. lens는 문자별 바이트 수.
export function byteRangeToChars(lens: number[], b0: number, b1: number): Span | null {
  let at = 0;
  let a = -1;
  let b = -1;
  for (let i = 0; i < lens.length; i++) {
    const s = at;
    const e = at + lens[i];
    at = e;
    if (s < b1 && e > b0) {
      if (a < 0) a = i;
      b = i + 1;
    }
  }
  return a < 0 ? null : [a, b];
}

// 문자 [c0, c1)이 쓴 바이트 범위
export function charsToByteRange(lens: number[], c0: number, c1: number): Span {
  let start = 0;
  for (let i = 0; i < c0; i++) start += lens[i];
  let end = start;
  for (let i = c0; i < c1; i++) end += lens[i];
  return [start, end];
}

function decodeAscii(bytes: number[]): DecodeResult {
  let text = "";
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] > 0x7f)
      return { text, error: `${i + 1}번째 바이트 ${hex(bytes[i])}: ASCII 범위(00~7F)를 넘어요` };
    text += String.fromCharCode(bytes[i]);
  }
  return { text, error: null };
}

const UTF8_MIN = [0, 0x80, 0x800, 0x10000];

function decodeUtf8(bytes: number[]): DecodeResult {
  let text = "";
  let i = 0;
  while (i < bytes.length) {
    const b = bytes[i];
    if (b < 0x80) {
      text += String.fromCharCode(b);
      i++;
      continue;
    }
    let need: number;
    let cp: number;
    if (b >= 0xc0 && b <= 0xdf) {
      need = 1;
      cp = b & 0x1f;
    } else if (b >= 0xe0 && b <= 0xef) {
      need = 2;
      cp = b & 0x0f;
    } else if (b >= 0xf0 && b <= 0xf7) {
      need = 3;
      cp = b & 0x07;
    } else {
      return { text, error: `${i + 1}번째 바이트 ${hex(b)}: UTF-8 글자의 첫 바이트가 될 수 없어요` };
    }
    if (i + need >= bytes.length)
      return { text, error: `${i + 1}번째 바이트 ${hex(b)}: 뒤에 바이트 ${need}개가 더 필요해요` };
    for (let k = 1; k <= need; k++) {
      const c = bytes[i + k];
      if ((c & 0xc0) !== 0x80)
        return { text, error: `${i + k + 1}번째 바이트 ${hex(c)}: 이어지는 바이트(80~BF)여야 해요` };
      cp = (cp << 6) | (c & 0x3f);
    }
    if (cp < UTF8_MIN[need] || cp > 0x10ffff || isSurrogate(cp))
      return { text, error: `${i + 1}번째 바이트부터: 올바르지 않은 UTF-8 글자예요` };
    text += String.fromCodePoint(cp);
    i += need + 1;
  }
  return { text, error: null };
}

function decodeUtf16(bytes: number[]): DecodeResult {
  let text = "";
  const units = Math.floor(bytes.length / 2);
  const unitAt = (k: number) => (bytes[2 * k] << 8) | bytes[2 * k + 1];
  for (let k = 0; k < units; k++) {
    const u = unitAt(k);
    if (isHighSurrogate(u) && k + 1 < units && isLowSurrogate(unitAt(k + 1))) {
      text += String.fromCodePoint(0x10000 + ((u - 0xd800) << 10) + (unitAt(k + 1) - 0xdc00));
      k++;
      continue;
    }
    if (isSurrogate(u))
      return { text, error: `${2 * k + 1}번째 바이트부터: 짝이 없는 서로게이트 ${hex(u, 4)}예요` };
    text += String.fromCharCode(u);
  }
  if (bytes.length % 2)
    return { text, error: "바이트 수가 홀수예요. UTF-16은 2바이트씩 읽어요" };
  return { text, error: null };
}

function decodeEucKr(bytes: number[], decoder: ByteDecoder | null): DecodeResult {
  if (!decoder) return { text: "", error: "이 브라우저는 EUC-KR 해독을 지원하지 않아요" };
  let text = "";
  let i = 0;
  while (i < bytes.length) {
    const b = bytes[i];
    if (b < 0x80) {
      text += String.fromCharCode(b);
      i++;
      continue;
    }
    if (i + 1 >= bytes.length)
      return { text, error: `${i + 1}번째 바이트 ${hex(b)}: 뒤에 바이트 1개가 더 필요해요` };
    const pairError = {
      text,
      error: `${i + 1}번째 바이트부터: EUC-KR에 없는 조합(${hex(b)} ${hex(bytes[i + 1])})이에요`,
    };
    let ch: string;
    try {
      ch = decoder.decode(new Uint8Array([b, bytes[i + 1]]));
    } catch {
      return pairError;
    }
    if (ch.includes("�")) return pairError;
    text += ch;
    i += 2;
  }
  return { text, error: null };
}

export function decodeBytes(
  bytes: number[],
  encoding: Encoding,
  eucKr: ByteDecoder | null = null,
): DecodeResult {
  switch (encoding) {
    case "ascii":
      return decodeAscii(bytes);
    case "utf-8":
      return decodeUtf8(bytes);
    case "utf-16be":
      return decodeUtf16(bytes);
    case "euc-kr":
      return decodeEucKr(bytes, eucKr);
  }
}
