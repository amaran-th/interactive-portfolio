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
  border: "1px solid rgba(255,165,0,0.2)", // 오렌지 테두리로 구분
  borderRadius: 6,
  color: "rgba(255,255,255,0.7)",
  boxSizing: "border-box",
};

export default function DomListNaive({ texts, width, startTimeRef, onDone, onCalcDone }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const start = startTimeRef.current;

    // 쓰기 + 읽기를 아이템마다 교대로 → N번 reflow (layout thrashing)
    const calcStart = performance.now();
    const heights = refs.current.map((el) => {
      if (!el) return 0;
      el.style.height = "auto";    // write: 레이아웃 무효화
      return el.scrollHeight;       // read: 강제 reflow 발생
    });
    onCalcDone(performance.now() - calcStart);

    // 2열 배치
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

    requestAnimationFrame(() => onDone(performance.now() - start));
  }, [texts, width, startTimeRef, onDone, onCalcDone]);

  return (
    <div ref={containerRef} style={{ position: "relative", width: width * 2 + COLUMN_GAP }}>
      {texts.map((text, i) => (
        <div
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          style={{ ...itemStyle, width }}
        >
          {text}
        </div>
      ))}
    </div>
  );
}
