// 이미지 입력에 쓰는 순수 판단 함수. useImageInput과 색상 스포이트가 쓴다.
// node:test가 그대로 실행하도록 다른 모듈을 import하지 않는다.

// 글자를 넣는 input 종류. 슬라이더·파일·체크박스 등에 포커스가 있어도
// 이미지 붙여넣기는 받아야 하므로 이 목록에 없는 input은 글자 입력칸이 아니다.
const TEXT_INPUT_TYPES = new Set(["", "text", "search", "url", "email", "tel", "password", "number"]);

type PasteTarget = { tagName: string; type?: string; isContentEditable?: boolean } | null;

export function isTextEntryTarget(t: PasteTarget): boolean {
  if (!t) return false;
  if (t.isContentEditable) return true;
  if (t.tagName === "TEXTAREA") return true;
  if (t.tagName === "INPUT") return TEXT_INPUT_TYPES.has((t.type ?? "").toLowerCase());
  return false;
}

// 클립보드에 이미지 파일 없이 주소만 온 경우(웹 페이지·메신저에서 복사하면 HTML의
// <img src>만 오기도 한다) 그 주소를 찾는다. data:image 주소나 이미지 확장자로 끝나는
// http(s) 주소만 받는다.
export function imageSrcFromClipboardText(html: string, plain: string): string | null {
  const m = /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i.exec(html);
  const fromHtml = m?.[1].replace(/&amp;/g, "&");
  if (fromHtml && /^(data:image\/|https?:)/i.test(fromHtml)) return fromHtml;
  const t = plain.trim();
  if (/^data:image\/[\w.+-]+;base64,/i.test(t)) return t;
  if (/^https?:\/\/\S+\.(png|jpe?g|gif|webp|avif|bmp|svg)(\?\S*)?$/i.test(t)) return t;
  return null;
}

// 브라우저 캔버스 한도(iOS Safari는 약 16.7M 픽셀)를 넘지 않도록, 비율을
// 지킨 채 긴 변과 넓이를 상한 안으로 줄인 크기. 이미 작으면 그대로 둔다.
export function fitWithin(
  width: number,
  height: number,
  maxSide = 4096,
  maxArea = 16_000_000,
): { width: number; height: number } {
  const scale = Math.min(
    1,
    maxSide / Math.max(width, height),
    Math.sqrt(maxArea / (width * height)),
  );
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
