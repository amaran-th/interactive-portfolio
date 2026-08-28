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
    <div className="flex h-full flex-col bg-[#818181] text-black">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-2 border-b-2 border-black px-4 py-3">
        <button
          onClick={onGoHome}
          className="flex items-center justify-center rounded-full p-2 text-black transition-colors hover:bg-black/5"
        >
          <House className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-black">편집</span>
        <span className="text-xs text-black/85">{cuts.length}컷</span>
        <div className="ml-auto flex gap-1.5">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-full border-2 border-black px-3 py-1.5 text-xs text-black transition-colors hover:bg-black/5"
          >
            <Images className="h-3.5 w-3.5" />
            리소스 편집
          </button>
          <button
            onClick={onPlay}
            className="flex items-center gap-1.5 rounded-full border-2 border-black bg-[#264986] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
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
      <div className="flex shrink-0 items-center gap-1 border-b-2 border-black bg-[#d9d9d9] px-3 py-2">
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
              className={`flex h-7 min-w-7 shrink-0 cursor-grab items-center justify-center rounded-full border-2 px-2 font-mono text-xs transition-all active:cursor-grabbing ${
                i === currentIndex
                  ? "border-black bg-[#264986] font-bold text-white"
                  : dragOver === i
                    ? "scale-110 border-black bg-[#264986]/15 text-[#264986]"
                    : "border-transparent text-gray-700 hover:bg-black/5"
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => onAddCutAfter(currentIndex)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-black hover:bg-black/5"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex shrink-0 items-center gap-1 border-l-2 border-black pl-2">
          <button
            onClick={() => onDuplicateCut(currentIndex)}
            className="flex h-7 w-7 items-center justify-center rounded-full text-black transition-colors hover:bg-black/5"
            title="컷 복제"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          {cuts.length > 1 && (
            <button
              onClick={() => onDeleteCut(currentIndex)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-red-50 hover:text-[#ac1717]"
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
          <p className="text-xs font-medium uppercase tracking-widest text-black">
            배경
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onUpdateCut(currentIndex, { backgroundId: null })}
              className={`rounded-full border-2 px-3 py-1.5 text-xs transition-colors ${
                cut.backgroundId === null
                  ? "border-black bg-[#264986]/15 font-medium text-[#264986]"
                  : "border-black text-black/85 hover:bg-black/5"
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
                className={`flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs transition-colors ${
                  cut.backgroundId === bg.id
                    ? "border-black bg-[#264986]/15 font-medium text-[#264986]"
                    : "border-black text-black/85 hover:bg-black/5"
                }`}
              >
                {bg.imageUrl && (
                  <img
                    src={bg.imageUrl}
                    alt={bg.name}
                    className="h-4 w-4 rounded-full object-cover"
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
          <p className="text-xs font-medium uppercase tracking-widest text-black">
            등장 캐릭터
          </p>
          {characters.length === 0 ? (
            <p className="text-xs italic text-black/85">등록된 캐릭터 없음</p>
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
                    className="flex items-center overflow-hidden rounded-full border-2 border-black transition-colors"
                  >
                    <button
                      onClick={() => toggleCharacter(char.id)}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                        active ? "bg-[#264986] text-white" : "text-black/85 hover:bg-black/5"
                      }`}
                    >
                      {char.name}
                    </button>
                    {active && char.images.length > 1 && (
                      <select
                        value={selectedImageId}
                        onChange={(e) => selectImage(char.id, e.target.value)}
                        className="border-l-2 border-black bg-[#d9d9d9] py-1.5 pr-2 pl-2 text-xs text-black outline-none"
                      >
                        {char.images.map((img) => (
                          <option key={img.id} value={img.id} className="bg-white text-black">
                            {img.label || "—"}
                          </option>
                        ))}
                      </select>
                    )}
                    {active && (
                      <button
                        onClick={() => togglePosition(char.id)}
                        className="border-l-2 border-black bg-[#d9d9d9] px-2.5 py-1.5 text-xs text-black hover:bg-black/10"
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
          <p className="text-xs font-medium uppercase tracking-widest text-black">
            발화자
          </p>
          <div className="flex flex-wrap gap-2">
            {visibleChars.map((char) => (
              <button
                key={char.id}
                onClick={() => toggleSpeaker(char.id)}
                className={`rounded-full border-2 px-3 py-1.5 text-xs transition-colors ${
                  cut.speakerIds.includes(char.id)
                    ? "border-black bg-blue-500 font-medium text-white"
                    : "border-black text-black/85 hover:bg-black/5"
                }`}
              >
                {char.name}
              </button>
            ))}
            <button
              onClick={toggleNarrator}
              className={`rounded-full border-2 px-3 py-1.5 text-xs transition-colors ${
                cut.speakerIds.includes("narrator")
                  ? "border-black bg-amber-500 font-medium text-white"
                  : "border-black text-black/85 hover:bg-black/5"
              }`}
            >
              나레이션
            </button>
            <button
              onClick={() => onUpdateCut(currentIndex, { speakerIds: [] })}
              className={`rounded-full border-2 px-3 py-1.5 text-xs transition-colors ${
                cut.speakerIds.length === 0
                  ? "border-black bg-[#264986]/15 font-medium text-[#264986]"
                  : "border-black text-black/85 hover:bg-black/5"
              }`}
            >
              없음
            </button>
          </div>
        </section>

        {/* Dialogue */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-widest text-black">
              {cut.speakerIds.includes("narrator") ? "나레이션" : "대사"}
            </p>
            {cut.speakerIds.length > 0 && (
              <div className="flex gap-1">
                {(["default", "whisper", "shout"] as const).map((effect) => (
                  <button
                    key={effect}
                    onClick={() => onUpdateCut(currentIndex, { textEffect: effect })}
                    className={`rounded-full border-2 px-2.5 py-1 text-xs transition-colors ${
                      (cut.textEffect ?? "default") === effect
                        ? "border-black bg-[#264986]/15 text-[#264986]"
                        : "border-black text-black/85 hover:bg-black/5"
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
            className="w-full resize-none rounded-lg border-2 border-black bg-[#d9d9d9] px-3 py-2.5 text-sm text-black placeholder:text-gray-600 outline-none"
          />
        </section>

        {/* Music */}
        {audioTracks.length > 0 && (() => {
          const bgmTracks = audioTracks.filter((a) => a.type === "bgm");
          const sfxTracks = audioTracks.filter((a) => a.type === "sfx");
          return (
            <section className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-widest text-black">음악</p>
              {bgmTracks.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-black/85">배경음악</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: null, label: "계속" },
                      { id: BGM_STOP, label: "정지" },
                      ...bgmTracks.map((t) => ({ id: t.id, label: t.name })),
                    ].map(({ id, label }) => (
                      <button
                        key={id ?? "_continue"}
                        onClick={() => onUpdateCut(currentIndex, { bgmId: id })}
                        className={`rounded-full border-2 px-3 py-1.5 text-xs transition-colors ${
                          cut.bgmId === id
                            ? "border-black bg-[#264986]/15 font-medium text-[#264986]"
                            : "border-black text-black/85 hover:bg-black/5"
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
                  <p className="text-xs text-black/85">효과음</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: null, label: "없음" },
                      ...sfxTracks.map((t) => ({ id: t.id, label: t.name })),
                    ].map(({ id, label }) => (
                      <button
                        key={id ?? "_none"}
                        onClick={() => onUpdateCut(currentIndex, { sfxId: id })}
                        className={`rounded-full border-2 px-3 py-1.5 text-xs transition-colors ${
                          cut.sfxId === id
                            ? "border-black bg-[#264986]/15 font-medium text-[#264986]"
                            : "border-black text-black/85 hover:bg-black/5"
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
            className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-black text-black transition-colors hover:bg-black/5 disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="flex-1 text-center font-mono text-xs text-black">
            {currentIndex + 1} / {cuts.length}
          </span>
          {currentIndex < cuts.length - 1 ? (
            <button
              onClick={() => onSelectCut(currentIndex + 1)}
              className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-black text-black transition-colors hover:bg-black/5"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => onAddCutAfter(currentIndex)}
              className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-black text-black transition-colors hover:bg-black/5"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
