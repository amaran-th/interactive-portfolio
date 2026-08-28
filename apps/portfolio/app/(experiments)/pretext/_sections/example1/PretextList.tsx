import { layout, prepare } from "@chenglou/pretext";
import { useEffect, useMemo, useRef } from "react";

interface Props {
  texts: string[];
  width: number;
  startTimeRef: React.RefObject<number>;
  onDone: (time: number) => void;
  onCalcDone: (time: number) => void;
}

interface LayoutItem {
  text: string;
  height: number;
  top: number;
  left: number;
}

const GAP = 4;
const COLUMN_GAP = 8;
const PADDING_H = 10;
const PADDING_V = 6;
const BORDER = 1;
const FONT = "13px Arial";
const LINE_HEIGHT = 20;

const itemStyle: React.CSSProperties = {
  position: "absolute",
  fontSize: 13,
  lineHeight: `${LINE_HEIGHT}px`,
  fontFamily: "inherit",
  padding: `${PADDING_V}px ${PADDING_H}px`,
  background: "rgba(255,255,255,0.04)",
  border: `${BORDER}px solid rgba(74,222,128,0.15)`,
  borderRadius: 6,
  color: "rgba(255,255,255,0.7)",
  overflow: "hidden",
  boxSizing: "border-box",
};

export default function PretextList({
  texts,
  width,
  startTimeRef,
  onDone,
  onCalcDone,
}: Props) {
  const calcTimeRef = useRef<number>(0);

  // 1단계: texts가 바뀔 때만 — 폰트 메트릭 계산 (느림)
  const preparedTexts = useMemo(
    () => texts.map((text) => prepare(text, FONT, { whiteSpace: "pre-wrap" })),
    [texts],
  );

  // 2단계: width가 바뀔 때만 — 줄바꿈 계산 (빠름)
  const layoutData: LayoutItem[] = useMemo(() => {
    const contentWidth = width - (PADDING_H + BORDER) * 2;
    const colLefts = [0, width + COLUMN_GAP];
    const colYs = [0, 0];
    // eslint-disable-next-line react-hooks/purity
    const calcStart = performance.now();
    const result = preparedTexts.map((prepared, i) => {
      const col = i % 2;
      const textHeight = layout(prepared, contentWidth, LINE_HEIGHT).height;
      const height = textHeight + PADDING_V * 2;
      const top = colYs[col];
      const left = colLefts[col];
      colYs[col] += height + GAP;
      return { text: texts[i], height, top, left };
    });
    // eslint-disable-next-line react-hooks/purity
    calcTimeRef.current = performance.now() - calcStart;
    return result;
  }, [preparedTexts, width, texts]);

  const totalHeight =
    layoutData.length > 0
      ? Math.max(...layoutData.map((item) => item.top + item.height))
      : 0;

  useEffect(() => {
    const start = startTimeRef.current;
    onCalcDone(calcTimeRef.current);
    requestAnimationFrame(() => onDone(performance.now() - start));
  }, [layoutData, startTimeRef, onDone, onCalcDone]);

  return (
    <div
      style={{
        position: "relative",
        width: width * 2 + COLUMN_GAP,
        height: totalHeight,
      }}
    >
      {layoutData.map((item, i) => (
        <div
          key={i}
          style={{
            ...itemStyle,
            width,
            height: item.height,
            top: item.top,
            left: item.left,
          }}
        >
          {item.text}
        </div>
      ))}
    </div>
  );
}
