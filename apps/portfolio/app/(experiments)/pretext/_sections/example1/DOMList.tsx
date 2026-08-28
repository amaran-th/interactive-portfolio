import { useEffect, useRef } from "react";

interface Props {
  texts: string[];
  width: number;
  startTimeRef: React.RefObject<number>;
  onDone: (time: number) => void;
  onCalcDone: (time: number) => void;
}

const GAP = 4;
const COLUMN_GAP = 8;

const itemStyle: React.CSSProperties = {
  position: "absolute",
  fontSize: 13,
  lineHeight: "20px",
  fontFamily: "inherit",
  padding: "6px 10px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 6,
  color: "rgba(255,255,255,0.7)",
  boxSizing: "border-box",
};

export default function DomList({ texts, width, startTimeRef, onDone, onCalcDone }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const start = startTimeRef.current;
    // 1. 쓰기 일괄 처리 → 레이아웃 무효화 1회
    refs.current.forEach((el) => {
      if (el) el.style.height = "auto";
    });
    // 2. 읽기 일괄 처리 → reflow 1회로 모든 높이 측정
    const calcStart = performance.now();
    const heights = refs.current.map((el) => (el ? el.scrollHeight : 0));
    onCalcDone(performance.now() - calcStart);

    // 3. 2열 cumulative top 계산 후 absolute 배치
    const colYs = [0, 0];
    refs.current.forEach((el, i) => {
      if (!el) return;
      const col = i % 2;
      el.style.height = heights[i] + "px";
      el.style.left = col === 0 ? "0px" : width + COLUMN_GAP + "px";
      el.style.top = colYs[col] + "px";
      colYs[col] += heights[i] + GAP;
    });

    if (containerRef.current) {
      containerRef.current.style.height =
        Math.max(0, Math.max(...colYs) - GAP) + "px";
    }

    // 4. paint 완료 후 시간 보고
    requestAnimationFrame(() => onDone(performance.now() - start));
  }, [texts, width, startTimeRef, onDone, onCalcDone]);

  return (
    <div ref={containerRef} style={{ position: "relative", width: width * 2 + COLUMN_GAP }}>
      {texts.map((text, i) => (
        <div
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          style={{ ...itemStyle, width: width }}
        >
          {text}
        </div>
      ))}
    </div>
  );
}
