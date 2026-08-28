// 캔버스 크기를 고를 때 "이 해상도로 그리면 이 정도 디테일이 나온다"를 감으로
// 보여주기 위한 참조 이미지 — 고정 해상도 래스터를 확대(리샘플링)하는 대신,
// 사과 모양을 연속 좌표계의 도형(원·타원)으로 정의해 실제 골라둔 width×height
// 해상도로 직접 채운다. 그래서 저해상도를 고르면 칸이 굵고 각져 보이고,
// 고해상도를 고를수록 곡선이 매끈해지며 하이라이트 같은 잔 디테일도 드러난다 —
// 어떤 크기를 골라도 항상 중심이 잡힌 같은 모양이다.
export function getApplePixelColor(
  x: number,
  y: number,
  width: number,
  height: number,
): string | null {
  // 캔버스 중심이 원점(0,0)에 오도록, 절반 크기를 1로 정규화한다.
  const nx = ((x + 0.5) / width) * 2 - 1;
  const ny = ((y + 0.5) / height) * 2 - 1;

  // 사과 몸통 — 중심을 살짝 아래로 내려 꼭지·잎이 들어갈 자리를 위에 남긴다.
  const bodyCy = 0.12;
  const bodyRx = 0.62;
  const bodyRy = 0.58;
  const bdx = nx;
  const bdy = ny - bodyCy;
  const inBody = (bdx * bdx) / (bodyRx * bodyRx) + (bdy * bdy) / (bodyRy * bodyRy) <= 1;

  // 몸통 위쪽 가운데를 살짝 눌러, 사과 특유의 갈라진 홈을 만든다.
  const ndx = nx;
  const ndy = ny - (bodyCy - bodyRy + 0.06);
  const inNotch =
    ndy < 0 && (ndx * ndx) / (0.34 * 0.34) + (ndy * ndy) / (0.22 * 0.22) <= 1;

  // 몸통 왼쪽 위의 하이라이트 — 저해상도에서는 거의 안 보이다가 해상도가
  // 올라갈수록 또렷한 얼룩으로 드러나 "디테일이 늘어난다"는 느낌을 준다.
  const hdx = nx - -0.24;
  const hdy = ny - (bodyCy - 0.18);
  const inHighlight =
    (hdx * hdx) / (0.16 * 0.16) + (hdy * hdy) / (0.22 * 0.22) <= 1;

  // 꼭지(줄기) — 가운데에서 위로 뻗은 얇은 세로 막대.
  const inStem = Math.abs(nx) < 0.05 && ny > -0.66 && ny < -0.28;

  // 잎 — 꼭지 오른쪽 위에 붙은 작은 타원.
  const ldx = nx - 0.22;
  const ldy = ny - -0.5;
  const inLeaf = (ldx * ldx) / (0.22 * 0.22) + (ldy * ldy) / (0.11 * 0.11) <= 1;

  if (inStem) return "#78350f";
  if (inLeaf) return "#22c55e";
  if (inBody && !inNotch) return inHighlight ? "#f87171" : "#dc2626";
  return null;
}
