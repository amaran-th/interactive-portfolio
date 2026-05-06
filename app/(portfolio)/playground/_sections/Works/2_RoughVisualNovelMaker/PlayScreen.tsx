"use client";

import { House, Pencil } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AudioTrack, Background, BGM_STOP, Character, Cut } from "./types";
import VNDisplay from "./VNDisplay";

interface Props {
  characters: Character[];
  backgrounds: Background[];
  audioTracks: AudioTrack[];
  cuts: Cut[];
  currentIndex: number;
  onNext: () => void;
  onSelectCut: (index: number) => void;
  onBack: () => void;
  onGoHome: () => void;
}

export default function PlayScreen({
  characters,
  backgrounds,
  audioTracks,
  cuts,
  currentIndex,
  onNext,
  onSelectCut,
  onBack,
  onGoHome,
}: Props) {
  const cut = cuts[currentIndex];
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const currentBgmIdRef = useRef<string | null>(null);

  const completeText = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setDisplayedText(cut.text);
    setIsComplete(true);
  }, [cut.text]);

  // Reset and start typewriter on cut change
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const text = cut.text;

    if (!text || cut.speakerIds.length === 0) {
      setDisplayedText(text);
      setIsComplete(true);
      return;
    }

    setDisplayedText("");
    setIsComplete(false);
    let i = 0;
    timerRef.current = setInterval(() => {
      i++;
      setDisplayedText(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(timerRef.current!);
        setIsComplete(true);
      }
    }, 25);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [currentIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // BGM / SFX on cut change
  useEffect(() => {
    // SFX: play once
    if (cut.sfxId) {
      const track = audioTracks.find((a) => a.id === cut.sfxId);
      if (track?.audioUrl) new Audio(track.audioUrl).play();
    }

    // BGM
    if (cut.bgmId === null) {
      // no change — BGM continues
    } else if (cut.bgmId === BGM_STOP) {
      bgmRef.current?.pause();
      bgmRef.current = null;
      currentBgmIdRef.current = null;
    } else if (cut.bgmId !== currentBgmIdRef.current) {
      bgmRef.current?.pause();
      const track = audioTracks.find((a) => a.id === cut.bgmId);
      if (track?.audioUrl) {
        const audio = new Audio(track.audioUrl);
        audio.loop = true;
        audio.play();
        bgmRef.current = audio;
        currentBgmIdRef.current = cut.bgmId;
      }
    }
  }, [currentIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // Stop BGM on unmount
  useEffect(() => {
    return () => { bgmRef.current?.pause(); };
  }, []);

  const handleAdvance = useCallback(() => {
    if (!isComplete) {
      completeText();
    } else if (currentIndex < cuts.length - 1) {
      onNext();
    }
  }, [isComplete, completeText, currentIndex, cuts.length, onNext]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); handleAdvance(); }
      if (e.key === "Escape") onBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleAdvance, onBack]);

  return (
    <div className="flex h-full w-full flex-col bg-gray-950">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-3">
        <button
          onClick={onGoHome}
          className="flex items-center justify-center rounded-full p-2 text-gray-500 transition-colors hover:bg-white/8 hover:text-white"
        >
          <House className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-sm font-semibold text-white">플레이</h1>
          <p className="text-xs text-gray-500">클릭 또는 스페이스로 진행</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="font-mono text-xs text-white/30">
            {currentIndex + 1} / {cuts.length}
          </span>
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-2 text-xs text-white/60 hover:bg-white/5 hover:text-white"
          >
            <Pencil className="h-3 w-3" />
            편집
          </button>
        </div>
      </div>

      {/* Cut list */}
      <div className="flex shrink-0 items-center gap-1 border-b border-white/10 bg-black/20 px-3 py-2">
        <div className="flex flex-1 items-center gap-1 overflow-x-auto">
          {cuts.map((_, i) => (
            <button
              key={i}
              onClick={() => onSelectCut(i)}
              className={`flex h-7 min-w-7 shrink-0 items-center justify-center rounded-lg px-2 font-mono text-xs transition-all ${
                i === currentIndex
                  ? "bg-white font-bold text-gray-950"
                  : "text-gray-500 hover:bg-white/10 hover:text-white"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* VN area — click to advance */}
      <div className="min-h-0 flex-1 cursor-pointer" onClick={handleAdvance}>
        <VNDisplay
          characters={characters}
          backgrounds={backgrounds}
          cut={cut}
          displayedText={displayedText}
          showNextIndicator={isComplete && cut.speakerIds.length > 0}
        />
      </div>
    </div>
  );
}
