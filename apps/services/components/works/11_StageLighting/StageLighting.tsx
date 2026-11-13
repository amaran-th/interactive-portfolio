"use client";

import { useRef, useState } from "react";
import { defaultShow } from "./show";
import { createStore } from "./store";
import { useStageScene } from "./useStageScene";

export default function StageLighting() {
  const [store] = useState(() => createStore(defaultShow()));
  const viewRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  useStageScene(viewRef, store, setError);
  return (
    <div className="relative h-full w-full">
      <div ref={viewRef} className="absolute inset-0" />
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
