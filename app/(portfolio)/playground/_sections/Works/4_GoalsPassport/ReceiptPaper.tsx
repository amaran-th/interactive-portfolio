import { Goal, PassportStyle } from "./types";
import { computeReceipt, formatWon, GOALS_YEAR } from "./utils";

/** 상·하단 톱니 절취선용 clip-path (감열지 느낌) */
function buildTornClipPath(teeth: number, toothHeight: number): string {
  const pts: string[] = [];
  for (let i = 0; i <= teeth; i++) {
    const x = ((i / teeth) * 100).toFixed(2);
    pts.push(`${x}% ${i % 2 === 0 ? `${toothHeight}px` : "0px"}`);
  }
  for (let i = teeth; i >= 0; i--) {
    const x = ((i / teeth) * 100).toFixed(2);
    pts.push(`${x}% ${i % 2 === 0 ? `calc(100% - ${toothHeight}px)` : "100%"}`);
  }
  return `polygon(${pts.join(", ")})`;
}

type Theme = {
  paper: string;
  ink: string;
  muted: string;
  dashed: string;
  dotted: string;
  gaugeInk: string;
  gaugeTrack: string;
  strong: string;
};

const CLASSIC: Theme = {
  paper: "bg-[#fffdf7]",
  ink: "text-neutral-800",
  muted: "text-neutral-400",
  dashed: "border-neutral-400",
  dotted: "border-neutral-300",
  gaugeInk: "text-neutral-800",
  gaugeTrack: "text-neutral-300",
  strong: "text-neutral-900",
};

const DARK: Theme = {
  paper: "bg-[#2b2622]",
  ink: "text-[#e8e0d2]",
  muted: "text-[#8a8175]",
  dashed: "border-[#5a5148]",
  dotted: "border-[#4a4239]",
  gaugeInk: "text-[#e8b04a]",
  gaugeTrack: "text-[#4a4239]",
  strong: "text-[#f3c869]",
};

const GAUGE_SEGMENTS = 18;

function Divider({ t }: { t: Theme }) {
  return <div className={`my-4 border-t border-dashed ${t.dashed}`} />;
}

interface ReceiptPaperProps {
  goals: Goal[];
  style: PassportStyle;
  settledAt: string;
  title?: string;
  /** 종이 요소에 덧붙일 클래스 (너비 등) */
  className?: string;
}

/** 감열지 영수증 본체 (프린터/애니메이션 없이 순수 렌더 — 인쇄 화면과 갤러리에서 공용) */
export default function ReceiptPaper({
  goals,
  style,
  settledAt,
  title,
  className = "",
}: ReceiptPaperProps) {
  const { lines, subtotal, totalPaid } = computeReceipt(goals);
  const t = style === "dark" ? DARK : CLASSIC;
  const tornClip = buildTornClipPath(30, 8);
  const ratio = subtotal > 0 ? totalPaid / subtotal : 0;
  const filled = Math.round(ratio * GAUGE_SEGMENTS);

  return (
    <div
      style={{
        clipPath: tornClip,
        filter: "drop-shadow(0 8px 16px rgba(90,70,40,0.28))",
      }}
      className={`w-full px-6 py-7 font-mono text-[13px] leading-relaxed ${t.paper} ${t.ink} ${className}`}
    >
      {/* 헤더 */}
      <div className="text-center">
        <p className="text-[15px] font-bold tracking-wide">
          {title ?? `${GOALS_YEAR} 중간 결산`}
        </p>
        <p className={`mt-1 text-[11px] ${t.muted}`}>{settledAt}</p>
      </div>

      <Divider t={t} />

      {/* 목표(품목)별 내역 */}
      {lines.length === 0 ? (
        <p className={`py-3 text-center text-[12px] ${t.muted}`}>
          등록된 목표가 없어요
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {lines.map(({ goal, items, paid, checked, total }) => (
            <li key={goal.id}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 flex-1 wrap-break-word font-bold">
                  {goal.title.trim() || "(제목 없음)"}
                </span>
                <span className={`shrink-0 text-[11px] ${t.muted}`}>
                  ({checked}/{total})
                </span>
              </div>

              {total === 0 ? (
                <p className={`mt-1 pl-1 text-[11px] ${t.muted}`}>
                  하위 항목이 없어요
                </p>
              ) : (
                <ul className="mt-1 flex flex-col gap-0.5 text-[12px]">
                  {items.map(({ item, paid: itemPaid }) => {
                    const isCheck = item.kind === "check";
                    const marker = isCheck ? (item.checked ? "✓" : "○") : "📈";
                    const dim = isCheck && !item.checked;
                    return (
                      <li key={item.id} className="flex items-baseline gap-1">
                        <span
                          className={`w-5 shrink-0 text-center ${dim ? t.muted : ""}`}
                        >
                          {marker}
                        </span>
                        {/* 말줄임 대신 줄바꿈 (flex-1이 아니라 min-w-0이라 리더가 남음) */}
                        <span
                          className={`min-w-0 wrap-break-word ${dim ? t.muted : ""}`}
                        >
                          {item.label.trim() || "(내용 없음)"}
                          {!isCheck && (
                            <span className={`ml-1 ${t.muted}`}>
                              ({item.current}/{item.target})
                            </span>
                          )}
                        </span>
                        <span
                          className={`mx-1 flex-1 -translate-y-0.75 border-b border-dotted ${t.dotted}`}
                        />
                        <span
                          className={`shrink-0 tabular-nums ${dim ? t.muted : ""}`}
                        >
                          {formatWon(itemPaid)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* 목표 소계 */}
              <div className="mt-1 flex items-baseline gap-1 text-[12px]">
                <span className={`shrink-0 pl-1 ${t.muted}`}>소계</span>
                <span
                  className={`mx-1 flex-1 -translate-y-0.75 border-b border-dotted ${t.dotted}`}
                />
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
        <div className={`flex items-center justify-between ${t.muted}`}>
          <span>SUBTOTAL</span>
          <span>{formatWon(subtotal)}</span>
        </div>
        <div
          className={`mt-1 flex items-center justify-between border-t ${t.dashed} pt-2 text-[15px] font-bold ${t.strong}`}
        >
          <span>TOTAL PAID</span>
          <span>{formatWon(totalPaid)}</span>
        </div>
        <div className="mt-1 text-center tracking-[-1px]">
          <span className={t.gaugeInk}>{"█".repeat(filled)}</span>
          <span className={t.gaugeTrack}>
            {"░".repeat(GAUGE_SEGMENTS - filled)}
          </span>
        </div>
      </div>

      <Divider t={t} />

      <p className={`text-center text-[11px] tracking-[0.3em] ${t.muted}`}>
        THANK YOU ♡
      </p>
    </div>
  );
}
