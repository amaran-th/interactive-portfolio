// 텍스트 도구 — 벡터 폰트를 그대로 픽셀 그리드에 넣을 수 없으니, 오프스크린
// 캔버스에 시스템 폰트로 한 번 그린 뒤 알파 채널(0~255)을 그대로 커버리지로
// 돌려준다. 캔버스 2D의 fillText는 기본적으로 가장자리를 안티에일리어싱해서
// 그리므로, 이 alpha 배열 자체가 이미 안티에일리어싱 정보를 담고 있다 — 끄면
// 128을 문턱값 삼아 이진화하고, 켜면 값을 그대로 커버리지 비율로 쓴다. 색은
// 이 값을 소비하는 쪽(호출부)에서 현재 활성 색상으로 칠한다 — 여러 색을
// 섞으면 팔레트가 무한정 늘어나므로 여기서는 색을 다루지 않는다.
// Shift+Enter로 줄바꿈("\n")을 넣을 수 있다 — fillText는 줄바꿈을 스스로
// 처리하지 않으므로, 줄 단위로 나눠 각자 다시 그린다. align은 전체 텍스트
// 상자를 캔버스 위에 앵커하는 것과 별개로, 상자 안에서 짧은 줄을 나머지
// 줄의 폭(width, 가장 긴 줄 기준)에 맞춰 왼쪽/가운데/오른쪽 중 어디에 둘지
// 정한다 — 그래야 여러 줄을 오른쪽·가운데 정렬해도 줄마다 들쭉날쭉해 보이지
// 않는다.
export function rasterizeText(
  text: string,
  fontSizePx: number,
  align: "left" | "center" | "right" = "left",
): { width: number; height: number; alpha: number[] } {
  const lines = text.split("\n");
  const measure = document.createElement("canvas").getContext("2d")!;
  measure.font = `${fontSizePx}px sans-serif`;
  const lineWidths = lines.map((line) => measure.measureText(line).width);
  const width = Math.max(1, Math.ceil(Math.max(...lineWidths)));
  const lineHeight = Math.max(1, Math.ceil(fontSizePx * 1.2));
  const height = lineHeight * lines.length;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  // 캔버스 크기를 바꾸면 컨텍스트 상태가 초기화되므로 폰트를 다시 지정해야 한다.
  ctx.font = `${fontSizePx}px sans-serif`;
  ctx.textBaseline = "top";
  ctx.fillStyle = "#000000";
  lines.forEach((line, i) => {
    const lineWidth = lineWidths[i];
    const x =
      align === "center"
        ? (width - lineWidth) / 2
        : align === "right"
          ? width - lineWidth
          : 0;
    ctx.fillText(line, x, i * lineHeight);
  });

  const data = ctx.getImageData(0, 0, width, height).data;
  const alpha = new Array<number>(width * height);
  for (let i = 0; i < width * height; i++) {
    alpha[i] = data[i * 4 + 3];
  }
  return { width, height, alpha };
}

export type Rotation = 0 | 90 | 180 | 270;

// 텍스트·불러온 이미지 오버레이의 회전은 90도 단위로만 지원한다 — 픽셀아트는
// 임의 각도 회전에 필요한 보간이 가장자리를 뭉개거나 계단 현상을 만들어
// 매체 특성과 맞지 않는다. 90도 단위는 보간 없이 좌표만 재배치하면 되므로
// 픽셀이 전혀 손상되지 않는다.
export function rotateAlphaBuffer(
  alpha: number[],
  width: number,
  height: number,
  rotation: Rotation,
): { width: number; height: number; alpha: number[] } {
  if (rotation === 0) return { width, height, alpha };
  if (rotation === 180) {
    const out = new Array<number>(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        out[(height - 1 - y) * width + (width - 1 - x)] = alpha[y * width + x];
      }
    }
    return { width, height, alpha: out };
  }
  // 90 또는 270 — 가로세로가 서로 바뀐다.
  const outWidth = height;
  const outHeight = width;
  const out = new Array<number>(outWidth * outHeight);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const value = alpha[y * width + x];
      const [nx, ny] =
        rotation === 90 ? [outWidth - 1 - y, x] : [y, outHeight - 1 - x];
      out[ny * outWidth + nx] = value;
    }
  }
  return { width: outWidth, height: outHeight, alpha: out };
}
