const POINT = "#0c3675";
const MAIN = "#79a2e0";
const SUB = "#a8cce3";
const SHADOW = "#d9f0ff";

/** 긴 이름은 가운데에 가장 가까운 띄어쓰기에서 두 줄로 나눈다. */
function splitTitle(title: string): string[] {
  if (title.length <= 7) return [title];
  const mid = title.length / 2;
  let best = -1;
  for (let i = 0; i < title.length; i++) {
    if (
      title[i] === " " &&
      (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))
    )
      best = i;
  }
  return best < 0 ? [title] : [title.slice(0, best), title.slice(best + 1)];
}

/**
 * 썸네일 이미지가 없는 서비스에 공통으로 쓰는 기본 썸네일(1:1). 어떤 서비스든
 * 어울리도록 특정 내용을 그리지 않고, 사이트 색(하늘색 팔레트)으로 브라우저
 * 창을 그린 뒤 그 안에 서비스 이름을 넣는다.
 */
export default function ServiceThumbFallback({ title }: { title: string }) {
  const lines = splitTitle(title);
  const longest = Math.max(...lines.map((l) => l.length));
  const fontSize = longest > 7 ? 15 : 18;
  const lineHeight = fontSize * 1.3;
  const textTop = 112 - ((lines.length - 1) * lineHeight) / 2;

  return (
    <svg
      viewBox="0 0 200 200"
      className="absolute inset-0 size-full"
      role="img"
      aria-label={title}
    >
      <rect width="200" height="200" fill={SHADOW} />
      {/* 배경 점무늬 */}
      {Array.from({ length: 7 }, (_, row) =>
        Array.from({ length: 7 }, (_, col) => (
          <circle
            key={`${row}-${col}`}
            cx={12 + col * 30 + (row % 2) * 15}
            cy={12 + row * 30}
            r="2.2"
            fill={SUB}
          />
        )),
      )}
      {/* 창 그림자 */}
      <rect x="32" y="46" width="144" height="120" rx="10" fill={POINT} />
      {/* 창 */}
      <rect
        x="26"
        y="40"
        width="144"
        height="120"
        rx="10"
        fill="#ffffff"
        stroke={POINT}
        strokeWidth="3.5"
      />
      <path
        d="M26 50 a10 10 0 0 1 10 -10 h124 a10 10 0 0 1 10 10 v12 h-144 Z"
        fill={MAIN}
        stroke={POINT}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {[40, 53, 66].map((cx) => (
        <circle
          key={cx}
          cx={cx}
          cy="51"
          r="3.8"
          fill="#ffffff"
          stroke={POINT}
          strokeWidth="2"
        />
      ))}
      <text
        textAnchor="middle"
        fill={POINT}
        fontSize={fontSize}
        fontWeight="700"
        fontFamily="var(--font-pretendard), sans-serif"
      >
        {lines.map((line, i) => (
          <tspan
            key={line}
            x="98"
            y={textTop + i * lineHeight}
            dominantBaseline="middle"
          >
            {line}
          </tspan>
        ))}
      </text>
      {/* 반짝이 */}
      {[
        [152, 140, 7],
        [44, 144, 5],
      ].map(([x, y, r]) => (
        <path
          key={`${x}-${y}`}
          d={`M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r} Z`}
          fill={MAIN}
        />
      ))}
    </svg>
  );
}
