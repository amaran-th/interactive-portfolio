"use client";

// 큐 페이드 재생. rAF마다 보간한 상태를 씬에 직접 쓰고(React·store를 거치지 않음),
// 끝나거나 멈출 때만 store의 live에 한 번 반영한다.
import { type RefObject, useEffect, useRef, useState } from "react";
import { aimChanged, fadeProgress, lerpLook } from "./cues";
import { type Cue, type LookState, recallCue, setLive, sortedCues } from "./show";
import type { Store } from "./store";
import type { SceneApi } from "./useStageScene";

export type Playback = {
  go(): void;
  back(): void;
  stop(): void;
  jump(cueId: string): void;
  playing: boolean;
  currentCueId: string | null;
};

type Run = { raf: number; last: LookState };

export function useCuePlayback(
  store: Store,
  sceneRef: RefObject<SceneApi | null>,
  progressRef: RefObject<HTMLDivElement | null>,
): Playback {
  const [playing, setPlaying] = useState(false);
  const [currentCueId, setCurrentCueId] = useState<string | null>(null);
  const runRef = useRef<Run | null>(null);
  const currentRef = useRef<string | null>(null);

  const setProgress = (t: number) => {
    const el = progressRef.current;
    if (el) el.style.transform = `scaleX(${t})`;
  };

  const setCurrent = (id: string | null) => {
    currentRef.current = id;
    setCurrentCueId(id);
  };

  function stop() {
    const run = runRef.current;
    if (!run) return;
    cancelAnimationFrame(run.raf);
    runRef.current = null;
    store.set(setLive(store.get(), run.last));
    setProgress(0);
    setPlaying(false);
  }

  function fadeTo(cue: Cue) {
    stop();
    const show = store.get();
    const from = show.live;
    const to = cue.look;
    const fixtures = show.fixtures;
    const shadows = aimChanged(from, to, fixtures);
    const start = performance.now();
    const run: Run = { raf: 0, last: from };
    runRef.current = run;
    setCurrent(cue.id);
    setPlaying(true);
    const step = (now: number) => {
      if (runRef.current !== run) return;
      const t = fadeProgress(now - start, cue.fadeSec);
      run.last = lerpLook(from, to, t, fixtures);
      sceneRef.current?.applyLook(run.last, shadows);
      setProgress(t);
      if (t >= 1) {
        runRef.current = null;
        store.set(setLive(store.get(), to));
        setProgress(0);
        setPlaying(false);
        return;
      }
      run.raf = requestAnimationFrame(step);
    };
    run.raf = requestAnimationFrame(step);
  }

  function neighbor(offset: 1 | -1): Cue | undefined {
    const cues = sortedCues(store.get());
    const i = cues.findIndex((c) => c.id === currentRef.current);
    if (i < 0) return offset === 1 ? cues[0] : undefined;
    return cues[i + offset];
  }

  function go() {
    const next = neighbor(1);
    if (next) fadeTo(next);
  }

  function jump(cueId: string) {
    stop();
    const show = store.get();
    if (!show.cues.some((c) => c.id === cueId)) return;
    store.set(recallCue(show, cueId));
    setCurrent(cueId);
  }

  function back() {
    const prev = neighbor(-1);
    if (prev) jump(prev.id);
  }

  // 현재 큐가 지워지면 표시를 비운다.
  useEffect(
    () =>
      store.subscribe(() => {
        const id = currentRef.current;
        if (id && !store.get().cues.some((c) => c.id === id)) setCurrent(null);
      }),
    [store],
  );

  useEffect(() => () => cancelAnimationFrame(runRef.current?.raf ?? 0), []);

  return { go, back, stop, jump, playing, currentCueId };
}
