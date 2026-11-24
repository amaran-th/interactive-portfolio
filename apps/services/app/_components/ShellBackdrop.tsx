"use client";

import { useEffect, useRef } from "react";

// 계산된 색이 불투명한지. Tailwind v4 색은 rgb()가 아니라 lab()/oklch()로 계산되므로 형식을 가리지 않는다.
const alpha = (s: string) => {
  const v = s.trim();
  return v.endsWith("%") ? parseFloat(v) / 100 : parseFloat(v);
};
const opaque = (c: string) => {
  if (!c || c === "transparent") return false;
  const m = c.match(/\(([^)]+)\)/);
  if (!m) return false;
  const inner = m[1];
  if (inner.includes("/")) return alpha(inner.split("/")[1]) >= 0.99; // lab(… / a), rgb(… / a)
  const parts = inner.split(",");
  return parts.length < 4 || alpha(parts[3]) >= 0.99; // rgba(r, g, b, a)
};

/**
 * 폭이 좁은 도구의 양옆 여백을 도구 자체의 배경색으로 칠한다.
 * <main>에 배경이 없는 페이지에서만, main 가운데를 지나는 요소 가운데
 * main 높이를 거의 다 채우고 배경이 불투명한 가장 바깥 요소(도구의 뿌리 상자)의 색을 따른다.
 * 도구가 화면을 바꾸면(예: 뜨개 선택 화면 → 플레이 화면) 다시 읽는다.
 */
export default function ShellBackdrop() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const main = ref.current?.parentElement?.querySelector("main");
    if (!main || opaque(getComputedStyle(main).backgroundColor)) return;

    let frame = 0;
    const sync = () => {
      frame = 0;
      const box = main.getBoundingClientRect();
      if (box.height === 0) return;
      // 모달이 떠 있으면 그 아래 요소를 집을 수 없으니 지금 색을 그대로 둔다
      if (main.querySelector("dialog[open]")) return;
      const stack = document.elementsFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      // elementsFromPoint는 맨 위(안쪽)부터 주므로 뒤에서부터 찾아야 바깥 상자가 걸린다
      const hit = stack.findLast((el) => {
        if (el === main || !main.contains(el)) return false;
        const r = el.getBoundingClientRect();
        return r.height >= box.height * 0.9 && opaque(getComputedStyle(el).backgroundColor);
      });
      const cs = hit ? getComputedStyle(hit) : null;
      // 작은 무늬를 바둑판으로 깐 배경(도트 등)은 무늬도 이어 깐다. 한 장짜리 그림은 색만 쓴다.
      const tiled = cs && cs.backgroundImage !== "none" && /px/.test(cs.backgroundSize) && cs.backgroundRepeat.startsWith("repeat");
      const next = {
        backgroundColor: cs?.backgroundColor ?? "",
        backgroundImage: tiled ? cs.backgroundImage : "",
        backgroundSize: tiled ? cs.backgroundSize : "",
      };
      // 같은 값을 다시 쓰면 MutationObserver가 또 불리지 않게 바뀔 때만 쓴다
      for (const [k, v] of Object.entries(next) as [keyof typeof next, string][]) {
        if (main.style[k] !== v) main.style[k] = v;
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(sync);
    };

    sync();
    const mo = new MutationObserver(schedule);
    mo.observe(main, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "style"] });
    window.addEventListener("resize", schedule);
    return () => {
      mo.disconnect();
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
      main.style.backgroundColor = "";
      main.style.backgroundImage = "";
      main.style.backgroundSize = "";
    };
  }, []);

  return <span ref={ref} hidden />;
}
