"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// 배경음: "Cosmic Navigation" — Synth-thetic, CC0 (https://opengameart.org/content/cosmic-navigation)
// 작가가 반복용으로 따로 낸 파일(153.6초)을 이 사이트에 그대로 두고 재생한다. 외부 요청 없음.
// <audio loop>는 이음매에서 잠깐 끊기므로 Web Audio 버퍼를 반복시켜 틈 없이 잇는다.
export const BGM = {
  src: "/voyager/bgm-cosmic-navigation.mp3",
  title: "Cosmic Navigation",
  author: "Synth-thetic",
  license: "CC0",
  href: "https://opengameart.org/content/cosmic-navigation",
};
const VOLUME = 0.5;
const FADE_SEC = 1.2;

export function useAmbient() {
  const [playing, setPlaying] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const bufRef = useRef<Promise<AudioBuffer> | null>(null);
  const srcRef = useRef<AudioBufferSourceNode | null>(null);
  // 업데이터 안에서 소리를 켜면 StrictMode에서 두 번 돌므로 ref로 상태를 본다
  const onRef = useRef(false);

  const start = useCallback(async () => {
    const ctx = (ctxRef.current ??= new AudioContext());
    await ctx.resume();
    if (!gainRef.current) {
      gainRef.current = ctx.createGain();
      gainRef.current.connect(ctx.destination);
    }
    bufRef.current ??= fetch(BGM.src)
      .then((r) => r.arrayBuffer())
      .then((b) => ctx.decodeAudioData(b));
    const buf = await bufRef.current;
    if (!onRef.current) return; // 받는 사이에 껐으면 틀지 않는다
    srcRef.current?.stop();
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.connect(gainRef.current);
    const g = gainRef.current.gain;
    g.cancelScheduledValues(ctx.currentTime);
    g.setValueAtTime(0, ctx.currentTime);
    g.linearRampToValueAtTime(VOLUME, ctx.currentTime + FADE_SEC);
    src.start();
    srcRef.current = src;
  }, []);

  const stop = useCallback(() => {
    const ctx = ctxRef.current;
    const src = srcRef.current;
    if (!ctx || !src || !gainRef.current) return;
    const g = gainRef.current.gain;
    g.cancelScheduledValues(ctx.currentTime);
    g.setValueAtTime(g.value, ctx.currentTime);
    g.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
    src.stop(ctx.currentTime + 0.45);
    srcRef.current = null;
  }, []);

  const toggle = useCallback(() => {
    const on = !onRef.current;
    onRef.current = on;
    setPlaying(on);
    if (on)
      start().catch(() => {
        onRef.current = false;
        setPlaying(false);
      });
    else stop();
  }, [start, stop]);

  useEffect(
    () => () => {
      srcRef.current?.stop();
      void ctxRef.current?.close();
    },
    [],
  );

  return { playing, toggle };
}
