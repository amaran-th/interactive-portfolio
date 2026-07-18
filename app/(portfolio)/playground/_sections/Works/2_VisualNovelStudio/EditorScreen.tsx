"use client";

import {
  ChevronLeft,
  ChevronRight,
  Copy,
  House,
  Images,
  Play,
  Plus,
  Trash2,
} from "lucide-react";
import { useRef, useState } from "react";
import { AudioTrack, Background, Character, Cut, BGM_STOP } from "./types";
import VNDisplay from "./VNDisplay";

interface Props {
  characters: Character[];
  backgrounds: Background[];
  audioTracks: AudioTrack[];
  cuts: Cut[];
  currentIndex: number;
  onSelectCut: (index: number) => void;
  onUpdateCut: (index: number, patch: Partial<Cut>) => void;
  onAddCutAfter: (index: number) => void;
  onDuplicateCut: (index: number) => void;
  onReorderCuts: (from: number, to: number) => void;
  onDeleteCut: (index: number) => void;
  onPlay: () => void;
  onBack: () => void;
  onGoHome: () => void;
}

export default function EditorScreen({
  characters,
  backgrounds,
  audioTracks,
  cuts,
  currentIndex,
  onSelectCut,
  onUpdateCut,
  onAddCutAfter,
  onDuplicateCut,
  onReorderCuts,
  onDeleteCut,
  onPlay,
  onBack,
  onGoHome,
}: Props) {
  const [dragOver, setDragOver] = useState<number | null>(null);
  const dragFromRef = useRef<number | null>(null);

  const cut = cuts[currentIndex];
  const visibleChars = characters.filter((c) =>
    cut.visibleCharacterIds.includes(c.id),
  );

  const toggleCharacter = (charId: string) => {
    const isVisible = cut.visibleCharacterIds.includes(charId);
    const next = isVisible
      ? cut.visibleCharacterIds.filter((id) => id !== charId)
      : [...cut.visibleCharacterIds, charId];
    const speakerIds = isVisible
      ? cut.speakerIds.filter((id) => id !== charId)
      : cut.speakerIds;
    const characterPositions = { ...cut.characterPositions };
    const characterImageIds = { ...cut.characterImageIds };
    if (!isVisible) {
      characterPositions[charId] = "left";
    } else {
      delete characterPositions[charId];
      delete characterImageIds[charId];
    }
    onUpdateCut(currentIndex, {
      visibleCharacterIds: next,
      speakerIds,
      characterPositions,
      characterImageIds,
    });
  };

  const toggleSpeaker = (id: string) => {
    const active = cut.speakerIds.includes(id);
    const speakerIds = active
      ? cut.speakerIds.filter((s) => s !== id)
      : [...cut.speakerIds.filter((s) => s !== "narrator"), id];
    onUpdateCut(currentIndex, { speakerIds });
  };

  const toggleNarrator = () => {
    const active = cut.speakerIds.includes("narrator");
    onUpdateCut(currentIndex, {
      speakerIds: active ? [] : ["narrator"],
    });
  };

  const togglePosition = (charId: string) => {
    const characterPositions = {
      ...cut.characterPositions,
      [charId]: (cut.characterPositions?.[charId] === "right"
        ? "left"
        : "right") as "left" | "right",
    };
    onUpdateCut(currentIndex, { characterPositions });
  };

  const selectImage = (charId: string, imageId: string) => {
    const characterImageIds = { ...cut.characterImageIds, [charId]: imageId };
    onUpdateCut(currentIndex, { characterImageIds });
  };

  return (
    <div className="flex h-full flex-col bg-gray-950 text-white">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-4 py-3">
        <button
          onClick={onGoHome}
          className="flex items-center justify-center rounded-full p-2 text-gray-500 transition-colors hover:bg-white/8 hover:text-white"
        >
          <House className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-white">편집</span>
        <span className="text-xs text-gray-600">{cuts.length}컷</span>
        <div className="ml-auto flex gap-1.5">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Images className="h-3.5 w-3.5" />
            리소스 편집
          </button>
          <button
            onClick={onPlay}
            className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-gray-950 hover:bg-gray-100"
          >
            <Play className="h-3 w-3" />
            플레이
          </button>
        </div>
      </div>

      {/* VN Preview */}
      <div className="w-full shrink-0">
        <VNDisplay
          characters={characters}
          backgrounds={backgrounds}
          cut={cut}
          compact
        />
      </div>

      {/* Cut list */}
      <div className="flex shrink-0 items-center gap-1 border-b border-white/10 bg-black/20 px-3 py-2">
        <div className="flex flex-1 items-center gap-1 overflow-x-auto">
          {cuts.map((_, i) => (
            <button
              key={i}
              draggable
              onDragStart={() => {
                dragFromRef.current = i;
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(i);
              }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => {
                if (dragFromRef.current !== null)
                  onReorderCuts(dragFromRef.current, i);
                setDragOver(null);
                dragFromRef.current = null;
              }}
              onDragEnd={() => {
                setDragOver(null);
                dragFromRef.current = null;
              }}
              onClick={() => onSelectCut(i)}
              className={`flex h-7 min-w-7 shrink-0 cursor-grab items-center justify-center rounded-lg px-2 font-mono text-xs transition-all active:cursor-grabbing ${
                i === currentIndex
                  ? "bg-white font-bold text-gray-950"
                  : dragOver === i
                    ? "scale-110 bg-white/20 text-white"
                    : "text-gray-500 hover:bg-white/10 hover:text-white"
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => onAddCutAfter(currentIndex)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-600 hover:bg-white/10 hover:text-white"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex shrink-0 items-center gap-1 border-l border-white/10 pl-2">
          <button
            onClick={() => onDuplicateCut(currentIndex)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-white/10 hover:text-white"
            title="컷 복제"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          {cuts.length > 1 && (
            <button
              onClick={() => onDeleteCut(currentIndex)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-red-800 transition-colors hover:bg-red-900/30 hover:text-red-400"
              title="컷 삭제"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Cut editor */}
      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        {/* Background */}
        <section className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-widest text-gray-500">
            배경
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onUpdateCut(currentIndex, { backgroundId: null })}
              className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                cut.backgroundId === null
                  ? "bg-white/20 font-medium text-white"
                  : "border border-white/15 text-gray-400 hover:border-white/30 hover:text-white"
              }`}
            >
              없음
            </button>
            {backgrounds.map((bg) => (
              <button
                key={bg.id}
                onClick={() =>
                  onUpdateCut(currentIndex, { backgroundId: bg.id })
                }
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors ${
                  cut.backgroundId === bg.id
                    ? "bg-white/20 font-medium text-white"
                    : "border border-white/15 text-gray-400 hover:border-white/30 hover:text-white"
                }`}
              >
                {bg.imageUrl && (
                  <img
                    src={bg.imageUrl}
                    alt={bg.name}
                    className="h-4 w-4 rounded object-cover"
                    style={{ imageRendering: "pixelated" }}
                  />
                )}
                {bg.name}
              </button>
            ))}
          </div>
        </section>

        {/* Characters on screen */}
        <section className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-widest text-gray-500">
            등장 캐릭터
          </p>
          {characters.length === 0 ? (
            <p className="text-xs italic text-gray-600">등록된 캐릭터 없음</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {characters.map((char) => {
                const active = cut.visibleCharacterIds.includes(char.id);
                const pos = cut.characterPositions?.[char.id] ?? "left";
                const selectedImageId =
                  cut.characterImageIds?.[char.id] ?? char.images[0]?.id;
                return (
                  <div
                    key={char.id}
                    className={`flex items-center overflow-hidden rounded-full border transition-colors ${
                      active ? "border-transparent" : "border-white/15"
                    }`}
                  >
                    <button
                      onClick={() => toggleCharacter(char.id)}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                        active ? "bg-white text-gray-950" : "text-gray-400 hover:text-white"
                      }`}
                    >
                      {char.name}
                    </button>
                    {active && char.images.length > 1 && (
                      <select
                        value={selectedImageId}
                        onChange={(e) => selectImage(char.id, e.target.value)}
                        className="border-l border-black/10 bg-white py-1.5 pr-2 pl-2 text-xs text-gray-600 outline-none"
                      >
                        {char.images.map((img) => (
                          <option key={img.id} value={img.id} className="bg-gray-900 text-white">
                            {img.label || "—"}
                          </option>
                        ))}
                      </select>
                    )}
                    {active && (
                      <button
                        onClick={() => togglePosition(char.id)}
                        className="border-l border-black/10 bg-white px-2.5 py-1.5 text-xs text-gray-500 hover:bg-gray-100"
                      >
                        {pos === "left" ? "←" : "→"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Speaker */}
        <section className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-widest text-gray-500">
            발화자
          </p>
          <div className="flex flex-wrap gap-2">
            {visibleChars.map((char) => (
              <button
                key={char.id}
                onClick={() => toggleSpeaker(char.id)}
                className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                  cut.speakerIds.includes(char.id)
                    ? "bg-blue-500 font-medium text-white"
                    : "border border-white/15 text-gray-400 hover:border-white/30 hover:text-white"
                }`}
              >
                {char.name}
              </button>
            ))}
            <button
              onClick={toggleNarrator}
              className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                cut.speakerIds.includes("narrator")
                  ? "bg-amber-500 font-medium text-white"
                  : "border border-white/15 text-gray-400 hover:border-white/30 hover:text-white"
              }`}
            >
              나레이션
            </button>
            <button
              onClick={() => onUpdateCut(currentIndex, { speakerIds: [] })}
              className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                cut.speakerIds.length === 0
                  ? "bg-white/20 font-medium text-white"
                  : "border border-white/15 text-gray-400 hover:border-white/30 hover:text-white"
              }`}
            >
              없음
            </button>
          </div>
        </section>

        {/* Dialogue */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-widest text-gray-500">
              {cut.speakerIds.includes("narrator") ? "나레이션" : "대사"}
            </p>
            {cut.speakerIds.length > 0 && (
              <div className="flex gap-1">
                {(["default", "whisper", "shout"] as const).map((effect) => (
                  <button
                    key={effect}
                    onClick={() => onUpdateCut(currentIndex, { textEffect: effect })}
                    className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                      (cut.textEffect ?? "default") === effect
                        ? "bg-white/20 text-white"
                        : "border border-white/15 text-gray-500 hover:text-white"
                    }`}
                  >
                    {effect === "default" ? "기본" : effect === "whisper" ? "중얼거림" : "소리치기"}
                  </button>
                ))}
              </div>
            )}
          </div>
          <textarea
            value={cut.text}
            onChange={(e) =>
              onUpdateCut(currentIndex, { text: e.target.value })
            }
            placeholder={
              cut.speakerIds.includes("narrator")
                ? "나레이션 텍스트를 입력하세요..."
                : "대사를 입력하세요..."
            }
            rows={3}
            className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-gray-600 outline-none focus:border-white/30"
          />
        </section>

        {/* Music */}
        {audioTracks.length > 0 && (() => {
          const bgmTracks = audioTracks.filter((a) => a.type === "bgm");
          const sfxTracks = audioTracks.filter((a) => a.type === "sfx");
          return (
            <section className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-widest text-gray-500">음악</p>
              {bgmTracks.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-gray-600">배경음악</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: null, label: "계속" },
                      { id: BGM_STOP, label: "정지" },
                      ...bgmTracks.map((t) => ({ id: t.id, label: t.name })),
                    ].map(({ id, label }) => (
                      <button
                        key={id ?? "_continue"}
                        onClick={() => onUpdateCut(currentIndex, { bgmId: id })}
                        className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                          cut.bgmId === id
                            ? "bg-white/20 font-medium text-white"
                            : "border border-white/15 text-gray-400 hover:border-white/30 hover:text-white"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {sfxTracks.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-gray-600">효과음</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: null, label: "없음" },
                      ...sfxTracks.map((t) => ({ id: t.id, label: t.name })),
                    ].map(({ id, label }) => (
                      <button
                        key={id ?? "_none"}
                        onClick={() => onUpdateCut(currentIndex, { sfxId: id })}
                        className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                          cut.sfxId === id
                            ? "bg-white/20 font-medium text-white"
                            : "border border-white/15 text-gray-400 hover:border-white/30 hover:text-white"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          );
        })()}

        {/* Cut navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelectCut(currentIndex - 1)}
            disabled={currentIndex === 0}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-gray-400 transition-colors hover:bg-white/5 hover:text-white disabled:pointer-events-none disabled:opacity-25"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="flex-1 text-center font-mono text-xs text-gray-500">
            {currentIndex + 1} / {cuts.length}
          </span>
          {currentIndex < cuts.length - 1 ? (
            <button
              onClick={() => onSelectCut(currentIndex + 1)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => onAddCutAfter(currentIndex)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
