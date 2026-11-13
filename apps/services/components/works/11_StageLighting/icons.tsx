// 무대 요소 아이콘(24×24, currentColor 선). 추가 메뉴·요소 목록·속성 머리줄에서 쓴다.
import type { FixtureKind, Gender, PropKind } from "./show";

type P = { className?: string };

function Svg({ className = "size-4", children }: P & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {children}
    </svg>
  );
}

const PROP_PATHS: Record<PropKind, React.ReactNode> = {
  chair: (
    <>
      <path d="M7 3v18" />
      <path d="M7 12h10v9" />
      <path d="M7 3h3" />
      <path d="M7 16h10" />
    </>
  ),
  table: (
    <>
      <path d="M3 8h18" />
      <path d="M5 8v12M19 8v12" />
      <path d="M5 12h14" />
    </>
  ),
  stairs: <path d="M3 20h6v-5h5v-5h5V5h2" />,
  platform: (
    <>
      <path d="M3 10l4-3h14l-4 3z" />
      <path d="M3 10v6h14v-6M17 16l4-3V7" />
    </>
  ),
  pillar: (
    <>
      <path d="M6 3h12M6 21h12" />
      <path d="M8 3v18M16 3v18M12 6v12" />
    </>
  ),
  box: (
    <>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
      <path d="M4 7.5l8 4.5 8-4.5M12 12v9" />
    </>
  ),
  doorframe: (
    <>
      <path d="M5 21V3h14v18" />
      <path d="M3 21h18" />
      <path d="M9 21V7h6v14" />
    </>
  ),
};

export function PropIcon({ kind, className }: P & { kind: PropKind }) {
  return <Svg className={className}>{PROP_PATHS[kind]}</Svg>;
}

export function PersonIcon({ gender, className }: P & { gender: Gender }) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="5" r="2.5" />
      {gender === "female" ? (
        <>
          <path d="M12 8.5l-4.5 8h9z" />
          <path d="M10 16.5V21M14 16.5V21" />
        </>
      ) : (
        <>
          <path d="M8 9h8v7H8z" />
          <path d="M10 16v5M14 16v5" />
        </>
      )}
    </Svg>
  );
}

const FIXTURE_PATHS: Record<FixtureKind, React.ReactNode> = {
  // 긴 몸통 + 렌즈
  profile: (
    <>
      <path d="M3 9h11v6H3z" />
      <path d="M14 8l4-2v12l-4-2" />
      <path d="M8 15v4M5 19h6" />
    </>
  ),
  // 짧은 몸통 + 계단 렌즈
  fresnel: (
    <>
      <path d="M4 7h9v10H4z" />
      <path d="M13 7h3v10h-3M16 9h2v6h-2" />
      <path d="M8 17v3" />
    </>
  ),
  // 원통 캔
  par: (
    <>
      <ellipse cx="17" cy="12" rx="2.5" ry="6" />
      <path d="M17 6H6a2.5 6 0 0 0 0 12h11" />
      <path d="M8 18v3" />
    </>
  ),
  // 삼각대 위 긴 스팟
  follow: (
    <>
      <path d="M4 6h13v5H4z" />
      <path d="M17 5.5l3-1.5v9l-3-1.5" />
      <path d="M10 11l-4 10M10 11l4 10M10 11v10" />
    </>
  ),
  // 캔 + LED 점
  ledpar: (
    <>
      <path d="M4 6h12v12H4z" />
      <path d="M16 6l4 2v8l-4 2" />
      <circle cx="8" cy="10" r=".6" fill="currentColor" />
      <circle cx="12" cy="10" r=".6" fill="currentColor" />
      <circle cx="8" cy="14" r=".6" fill="currentColor" />
      <circle cx="12" cy="14" r=".6" fill="currentColor" />
    </>
  ),
  // 넓은 막대형 투광기
  cyc: (
    <>
      <path d="M3 8h18v6H3z" />
      <path d="M6 14l-2 4M18 14l2 4M12 14v6" />
      <path d="M7 11h10" />
    </>
  ),
};

export function FixtureIcon({ kind, className }: P & { kind: FixtureKind }) {
  return <Svg className={className}>{FIXTURE_PATHS[kind]}</Svg>;
}

export function StageIcon({ className }: P) {
  return (
    <Svg className={className}>
      <path d="M2 17h20" />
      <path d="M4 17v3M20 17v3" />
      <path d="M4 4h16" />
      <path d="M4 4c0 5 2 9 5 9M20 4c0 5-2 9-5 9" />
    </Svg>
  );
}
