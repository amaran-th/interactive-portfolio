"use client";

// 플롯 시점에서 조명기 위에 채널 번호를 띄운다. 카메라가 움직이거나 공연이 바뀔 때 rAF 한 번으로 다시 잰다.
import { type RefObject, useEffect, useState } from "react";
import type { Store } from "./store";
import type { SceneApi, ScreenPoint } from "./useStageScene";

type Props = { store: Store; sceneRef: RefObject<SceneApi | null>; selectedId: string | null };

export default function PlotLabels({ store, sceneRef, selectedId }: Props) {
  const [points, setPoints] = useState<ScreenPoint[]>([]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    let raf = 0;
    const measure = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        setPoints(scene.fixtureScreenPoints());
      });
    };
    measure();
    const offCamera = scene.onCamera(measure);
    const offStore = store.subscribe(measure);
    return () => {
      cancelAnimationFrame(raf);
      offCamera();
      offStore();
    };
  }, [sceneRef, store]);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {points.map((p) => (
        <span
          key={p.id}
          style={{ left: p.x, top: p.y, borderColor: p.color }}
          className={`absolute flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[3px] bg-point text-[10px] font-bold tabular-nums text-white ${
            p.id === selectedId ? "ring-2 ring-[#ffd23f]" : ""
          }`}
        >
          {p.channel}
        </span>
      ))}
    </div>
  );
}
