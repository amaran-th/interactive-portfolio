import PixelIcon from "./PixelIcon";
import r from "./retro.module.css";
import { Goal, ReceiptStyle } from "./types";
import { computeReceipt, formatWon, GOALS_YEAR } from "./utils";

/**
 * 상·하단 계단식 톱니 clip-path. 톱니 하나를 STEPS칸 계단으로 올렸다 내려
 * 사선 대신 도트로 깎인 절취선을 만든다.
 */
function buildPixelTornClipPath(teeth: number, step: number): string {
  const STEPS = 3;
  const w = 100 / teeth;
  const dx = w / (STEPS * 2);
  const edge = (top: boolean) => {
    const y = (level: number) =>
      top ? `${level * step}px` : `calc(100% - ${level * step}px)`;
    const pts: string[] = [];
    for (let t = 0; t < teeth; t++) {
      let x = t * w;
      for (let s = STEPS; s > 0; s--) {
        pts.push(`${x.toFixed(3)}% ${y(s)}`);
        x += dx;
        pts.push(`${x.toFixed(3)}% ${y(s)}`);
      }
      for (let s = 0; s < STEPS; s++) {
        pts.push(`${x.toFixed(3)}% ${y(s)}`);
        x += dx;
        pts.push(`${x.toFixed(3)}% ${y(s)}`);
      }
    }
    pts.push(`100% ${y(STEPS)}`);
    return pts;
  };
  return `polygon(${[...edge(true), ...edge(false).reverse()].join(", ")})`;
}

type Theme = {
  paper: string;
  ink: string;
  muted: string;
  line: string;
  accent: string;
  gauge: string;
  track: string;
};

/** 옛 휴대용 게임기 액정처럼 올리브 녹색 5단계만 쓴다 (밝음 → 어두움) */
const SHADE = ["#eef2d9", "#c9d2a6", "#8f9a6c", "#4e5838", "#1d2414"];

/** 기본: 밝은 액정 위에 어두운 도트 */
const CLASSIC: Theme = {
  paper: SHADE[0],
  ink: SHADE[4],
  muted: SHADE[2],
  line: SHADE[4],
  accent: SHADE[4],
  gauge: SHADE[4],
  track: SHADE[1],
};

/** 다크: 반전 — 어두운 바탕에 밝은 도트 */
const DARK: Theme = {
  paper: SHADE[4],
  ink: SHADE[0],
  muted: SHADE[2],
  line: SHADE[3],
  accent: SHADE[1],
  gauge: SHADE[1],
  track: SHADE[3],
};

const GAUGE_SEGMENTS = 16;
const TORN_CLIP = buildPixelTornClipPath(22, 2);

function Divider({ t }: { t: Theme }) {
  return <div className={`my-4 ${r.dash}`} style={{ color: t.line }} />;
}

interface ReceiptPaperProps {
  goals: Goal[];
  style: ReceiptStyle;
  settledAt: string;
  title?: string;
  /** 종이 요소에 덧붙일 클래스 (너비 등) */
  className?: string;
}

/** 도트 영수증 본체 (프린터/애니메이션 없이 순수 렌더) */
export default function ReceiptPaper({
  goals,
  style,
  settledAt,
  title,
  className = "",
}: ReceiptPaperProps) {
  const { lines, subtotal, totalPaid } = computeReceipt(goals);
  const t = style === "dark" ? DARK : CLASSIC;
  const ratio = subtotal > 0 ? totalPaid / subtotal : 0;
  const filled = Math.round(ratio * GAUGE_SEGMENTS);
  const percent = Math.round(ratio * 100);

  return (
    // 그림자는 바깥 요소에 — 같은 요소에 두면 clip-path에 잘린다
    <div style={{ filter: "drop-shadow(4px 4px 0 rgba(29,36,20,0.35))" }}>
      <div
        style={{
          clipPath: TORN_CLIP,
          background: t.paper,
          color: t.ink,
        }}
        className={`w-full px-6 pt-9 pb-10 text-[12px] leading-[1.75] ${className}`}
      >
        {/* 헤더 */}
        <div className="flex flex-col items-center text-center">
          <p className="flex items-center gap-2 font-bold">
            <PixelIcon name="star" size={8} fill={t.accent} />
            {title ?? `${GOALS_YEAR} MID-YEAR RECAP`}
            <PixelIcon name="star" size={8} fill={t.accent} />
          </p>
          <p style={{ color: t.muted }}>{settledAt}</p>
        </div>

        <Divider t={t} />

        {/* 목표(품목)별 내역 */}
        {lines.length === 0 ? (
          <p className="py-3 text-center" style={{ color: t.muted }}>
            등록된 목표가 없어요
          </p>
        ) : (
          <ul className="flex flex-col gap-5">
            {lines.map(({ goal, items, paid, checked, total }) => (
              <li key={goal.id}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="flex min-w-0 flex-1 font-bold">
                    <span className="flex w-5 shrink-0 self-start pt-1.75">
                      <PixelIcon name="arrow" size={8} fill={t.accent} />
                    </span>
                    <span className="min-w-0 wrap-break-word">
                      {goal.title.trim() || "(제목 없음)"}
                    </span>
                  </span>
                  <span className="shrink-0" style={{ color: t.muted }}>
                    ({checked}/{total})
                  </span>
                </div>

                {total === 0 ? (
                  <p className="mt-1 pl-1" style={{ color: t.muted }}>
                    하위 항목이 없어요
                  </p>
                ) : (
                  <ul className="mt-1 flex flex-col">
                    {items.map(({ item, paid: itemPaid }) => {
                      const isCheck = item.kind === "check";
                      const dim = isCheck && !item.checked;
                      const color = dim ? t.muted : t.ink;
                      return (
                        <li
                          key={item.id}
                          className="flex items-baseline"
                          style={{ color }}
                        >
                          <span className="flex w-5 shrink-0 self-start pt-1.75">
                            <PixelIcon
                              name={
                                isCheck
                                  ? item.checked
                                    ? "check"
                                    : "box"
                                  : "up"
                              }
                              size={8}
                              fill={color}
                            />
                          </span>
                          {/* 말줄임 대신 줄바꿈 (flex-1이 아니라 min-w-0이라 리더가 남음) */}
                          <span className="min-w-0 wrap-break-word">
                            {item.label.trim() || "(내용 없음)"}
                            {!isCheck && (
                              <span className="ml-1" style={{ color: t.muted }}>
                                ({item.current}/{item.target})
                              </span>
                            )}
                          </span>
                          <span
                            className={r.leader}
                            style={{ color: t.line }}
                          />
                          <span className="shrink-0 tabular-nums">
                            {formatWon(itemPaid)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {/* 목표 소계 */}
                <div className="mt-1 flex items-baseline">
                  <span className="shrink-0 pl-5" style={{ color: t.muted }}>
                    소계
                  </span>
                  <span className={r.leader} style={{ color: t.line }} />
                  <span className="shrink-0 font-bold tabular-nums">
                    {formatWon(paid)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}

        <Divider t={t} />

        {/* 합계 */}
        <div className="flex flex-col gap-1 tabular-nums">
          <div
            className="flex items-center justify-between"
            style={{ color: t.muted }}
          >
            <span>SUBTOTAL</span>
            <span>{formatWon(subtotal)}</span>
          </div>
          <div
            className="mt-1 flex items-center justify-between pt-2 font-bold"
            style={{ boxShadow: `inset 0 2px 0 0 ${t.line}` }}
          >
            <span>TOTAL PAID</span>
            <span style={{ color: t.accent }}>{formatWon(totalPaid)}</span>
          </div>

          {/* 게이지: 체력바처럼 칸이 하나씩 찬다 */}
          <div className="mt-2 flex items-center gap-2">
            <span className="shrink-0 font-bold" style={{ color: t.muted }}>
              EXP
            </span>
            <div
              className="flex flex-1 gap-0.5 p-0.5"
              style={{ boxShadow: `0 0 0 2px ${t.line}` }}
            >
              {Array.from({ length: GAUGE_SEGMENTS }, (_, i) => (
                <span
                  key={i}
                  className="h-2.5 flex-1"
                  style={{ background: i < filled ? t.gauge : t.track }}
                />
              ))}
            </div>
            <span className="w-9 shrink-0 text-right font-bold">
              {percent}%
            </span>
          </div>
        </div>

        <Divider t={t} />

        <p
          className="flex items-center justify-center gap-2 tracking-[0.3em]"
          style={{ color: t.muted }}
        >
          THANK YOU
          <PixelIcon name="heart" size={8} fill={t.accent} />
        </p>
      </div>
    </div>
  );
}
