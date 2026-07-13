// 텍스트 도구 — 벡터 폰트를 그대로 픽셀 그리드에 넣을 수 없으니, 오프스크린
// 캔버스에 시스템 폰트로 한 번 그린 뒤 알파 채널을 켜짐/꺼짐으로 문턱값
// 처리해 실루엣(마스크)만 뽑아낸다. 색은 마스크를 찍는 쪽(호출부)에서 현재
// 활성 색상 하나로 칠한다 — 여러 색을 섞으면 팔레트가 무한정 늘어난다.
export function rasterizeText(text: string, fontSizePx: number): { width: number; height: number; mask: boolean[] } {
  const measure = document.createElement("canvas").getContext("2d")!;
  measure.font = `${fontSizePx}px monospace`;
  const width = Math.max(1, Math.ceil(measure.measureText(text).width));
  const height = Math.max(1, Math.ceil(fontSizePx * 1.2));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  // 캔버스 크기를 바꾸면 컨텍스트 상태가 초기화되므로 폰트를 다시 지정해야 한다.
  ctx.font = `${fontSizePx}px monospace`;
  ctx.textBaseline = "top";
  ctx.fillStyle = "#000000";
  ctx.fillText(text, 0, 0);

  const data = ctx.getImageData(0, 0, width, height).data;
  const mask = new Array<boolean>(width * height);
  for (let i = 0; i < width * height; i++) {
    mask[i] = data[i * 4 + 3] > 128;
  }
  return { width, height, mask };
}
