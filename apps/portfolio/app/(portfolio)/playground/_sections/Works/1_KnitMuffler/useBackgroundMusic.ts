"use client";

import { useEffect, useRef, useState } from "react";

const SRC = "/playground/background.mp3";

export function useBackgroundMusic() {
  const [enabled, setEnabled] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(SRC);
    audio.loop = true;
    audioRef.current = audio;
    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (enabled) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } else {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [enabled]);

  return {
    soundEnabled: enabled,
    toggleSound: () => setEnabled((v) => !v),
  };
}
