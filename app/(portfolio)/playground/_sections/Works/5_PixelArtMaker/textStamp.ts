// 텍스트 도구 — 벡터 폰트를 그대로 픽셀 그리드에 넣을 수 없으니, 오프스크린
// 캔버스에 시스템 폰트로 한 번 그린 뒤 알파 채널(0~255)을 그대로 커버리지로
// 돌려준다. 캔버스 2D의 fillText는 기본적으로 가장자리를 안티에일리어싱해서
// 그리므로, 이 alpha 배열 자체가 이미 안티에일리어싱 정보를 담고 있다 — 끄면
// 128을 문턱값 삼아 이진화하고, 켜면 값을 그대로 커버리지 비율로 쓴다. 색은
// 이 값을 소비하는 쪽(호출부)에서 현재 활성 색상으로 칠한다 — 여러 색을
// 섞으면 팔레트가 무한정 늘어나므로 여기서는 색을 다루지 않는다.
export function rasterizeText(
  text: string,
  fontSizePx: number,
): { width: number; height: number; alpha: number[] } {
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
  const alpha = new Array<number>(width * height);
  for (let i = 0; i < width * height; i++) {
    alpha[i] = data[i * 4 + 3];
  }
  return { width, height, alpha };
}
