// 글자수 세기 계산. node:test가 그대로 실행하도록 다른 모듈을 import하지 않는다.

export type Basis = "with-spaces" | "no-spaces" | "bytes-kr";

export type Counts = {
  /** 공백·줄바꿈까지 센 글자 수 */
  withSpaces: number;
  /** 공백·탭·줄바꿈을 뺀 글자 수 */
  noSpaces: number;
  words: number;
  lines: number;
  paragraphs: number;
  /** UTF-8로 저장했을 때 바이트 수 */
  bytesUtf8: number;
  /** 한글 등 ASCII 밖 글자 2바이트, ASCII 1바이트 */
  bytesKr: number;
};

let segmenter: Intl.Segmenter | null = null;

// 글자 단위(자소가 합쳐진 이모지·결합 문자도 한 글자)와 원문에서의 위치.
// Segmenter가 없으면 코드포인트로 센다.
function segments(text: string): { segment: string; index: number }[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    segmenter ??= new Intl.Segmenter("ko", { granularity: "grapheme" });
    return Array.from(segmenter.segment(text), ({ segment, index }) => ({ segment, index }));
  }
  let index = 0;
  return Array.from(text, (segment) => {
    const s = { segment, index };
    index += segment.length;
    return s;
  });
}

const graphemes = (text: string) => segments(text).map((s) => s.segment);

const SPACE = /^\s+$/u;

export function countText(input: string): Counts {
  const text = input.replace(/\r\n?/g, "\n");
  const breaks = text.match(/\n/g)?.length ?? 0;

  let withSpaces = 0;
  let noSpaces = 0;
  for (const g of graphemes(text)) {
    withSpaces++;
    if (!SPACE.test(g)) noSpaces++;
  }

  let bytesKr = 0;
  for (const ch of text) bytesKr += ch.codePointAt(0)! <= 0x7f ? 1 : 2;

  const trimmed = text.trim();
  return {
    withSpaces,
    noSpaces,
    words: trimmed ? trimmed.split(/\s+/u).length : 0,
    lines: text ? breaks + 1 : 0,
    paragraphs: text.split(/\n\s*\n/u).filter((p) => p.trim()).length,
    bytesUtf8: new TextEncoder().encode(text).length,
    bytesKr,
  };
}

export function basisValue(c: Counts, basis: Basis): number {
  return basis === "with-spaces" ? c.withSpaces : basis === "no-spaces" ? c.noSpaces : c.bytesKr;
}

/**
 * 기준(basis)으로 셌을 때 limit을 처음 넘기는 글자의 위치(UTF-16 인덱스).
 * 넘지 않으면 null. 원문(줄바꿈이 \r\n이어도)의 인덱스를 돌려준다.
 */
export function overflowStart(text: string, limit: number, basis: Basis): number | null {
  let used = 0;
  for (const { segment, index } of segments(text)) {
    const isBreak = /^[\r\n]+$/.test(segment);
    let cost: number;
    if (basis === "no-spaces") cost = SPACE.test(segment) ? 0 : 1;
    else if (basis === "with-spaces" || isBreak) cost = 1;
    else {
      cost = 0;
      for (const ch of segment) cost += ch.codePointAt(0)! <= 0x7f ? 1 : 2;
    }
    used += cost;
    if (used > limit) return index;
  }
  return null;
}

export const BASIS_LABELS: Record<Basis, string> = {
  "with-spaces": "공백 포함",
  "no-spaces": "공백 제외",
  "bytes-kr": "바이트(한글 2)",
};

export type Saved = {
  /** 자기소개서 문항. 글자 수에는 넣지 않는다 */
  question: string;
  /** 옆 메모장. 글자 수에는 넣지 않는다 */
  memo: string;
  memoOpen: boolean;
  /** 넓은 화면에서 메모를 둘 쪽 */
  memoSide: "left" | "right";
  text: string;
  limit: number | null;
  basis: Basis;
  spellcheck: boolean;
};

const BASES: Basis[] = ["with-spaces", "no-spaces", "bytes-kr"];
export const MAX_LIMIT = 1_000_000;

// 형식이 틀리면 null — 빈 상태로 시작한다.
export function parseSaved(json: string | null): Saved | null {
  if (!json) return null;
  try {
    const d = JSON.parse(json);
    if (typeof d?.text !== "string") return null;
    if (!BASES.includes(d.basis)) return null;
    const limit =
      d.limit === null
        ? null
        : Number.isInteger(d.limit) && d.limit > 0 && d.limit <= MAX_LIMIT
          ? d.limit
          : undefined;
    if (limit === undefined) return null;
    // 맞춤법 검사 설정은 나중에 생겨, 없으면 꺼 둔다. 예전에 저장한 crlf 값은 버린다.
    // 문항 칸은 나중에 생겨, 없으면 빈 문항으로 읽는다.
    return {
      question: typeof d.question === "string" ? d.question : "",
      memo: typeof d.memo === "string" ? d.memo : "",
      memoOpen: d.memoOpen === true,
      memoSide: d.memoSide === "left" ? "left" : "right",
      text: d.text,
      limit,
      basis: d.basis,
      spellcheck: d.spellcheck === true,
    };
  } catch {
    return null;
  }
}

// 문항에 적힌 분량("500자 이내", "1,000자", "1500 byte")을 찾는다. 처음 나온 것 하나만 본다.
// byte·바이트는 한글 2바이트 기준으로, 'N자'는 공백 포함으로 읽는다(공백 제외라고 적혀 있으면 공백 제외).
export function limitFromQuestion(question: string): { limit: number; basis: Basis } | null {
  const m = /(\d{1,3}(?:,\d{3})+|\d+)\s*(자|byte|bytes|바이트)/i.exec(question);
  if (!m) return null;
  const limit = Number(m[1].replace(/,/g, ""));
  if (!Number.isInteger(limit) || limit <= 0 || limit > MAX_LIMIT) return null;
  if (m[2] !== "자") return { limit, basis: "bytes-kr" };
  return { limit, basis: /공백\s*(제외|미포함|빼고)/.test(question) ? "no-spaces" : "with-spaces" };
}
