"use client";

import { Background, Character, Cut } from "./types";

interface Props {
  characters: Character[];
  backgrounds: Background[];
  cut: Cut;
  compact?: boolean;
  displayedText?: string;
  showNextIndicator?: boolean;
}

export default function VNDisplay({
  characters,
  backgrounds,
  cut,
  compact,
  displayedText,
  showNextIndicator,
}: Props) {
  const bg = backgrounds.find((b) => b.id === cut.backgroundId);
  const visibleChars = characters.filter((c) =>
    cut.visibleCharacterIds.includes(c.id),
  );

  const getCharImage = (charId: string) => {
    const char = characters.find((c) => c.id === charId)!;
    const selectedId = cut.characterImageIds?.[charId];
    return (
      (selectedId ? char.images.find((img) => img.id === selectedId) : null) ??
      char.images[0]
    );
  };
  const isNarrator = cut.speakerIds.includes("narrator");
  const speakerNames = isNarrator
    ? null
    : characters
        .filter((c) => cut.speakerIds.includes(c.id))
        .map((c) => c.name)
        .join(" & ") || null;
  const hasText = cut.text.trim().length > 0;

  return (
    <div className="relative flex w-full aspect-video flex-col overflow-hidden bg-gray-900">
      {/* Background */}
      {bg ? (
        bg.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bg.imageUrl}
            alt={bg.name}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ imageRendering: "pixelated" }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center border border-dashed border-white/10 bg-gray-900">
            <span className="text-xs text-white/20">삭제된 리소스</span>
          </div>
        )
      ) : (
        <div className="absolute inset-0 bg-linear-to-b from-gray-800 to-gray-950" />
      )}

      {/* Characters */}
      <div className="relative flex flex-1 items-end px-2 pb-2">
        {visibleChars.length === 0 && !bg && (
          <span className="mb-8 w-full text-center text-xs text-white/20">
            캐릭터 없음
          </span>
        )}
        {(["left", "right"] as const).map((side) => {
          const sideChars = visibleChars.filter(
            (c) => (cut.characterPositions?.[c.id] ?? "left") === side,
          );
          const overlapML = compact ? "-54%" : "-63%";
          return (
            <div
              key={side}
              className={`flex flex-1 self-stretch items-end ${side === "left" ? "justify-start" : "justify-end"}`}
            >
              {sideChars.map((char, idx) => {
                const isSpeaker = cut.speakerIds.includes(char.id);
                const hasSpeakers = cut.speakerIds.length > 0;
                const dimmed = isNarrator || (hasSpeakers && !isSpeaker);
                const imageUrl = getCharImage(char.id).imageUrl;
                return imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={char.id}
                    src={imageUrl}
                    alt={char.name}
                    className="object-contain transition-opacity duration-300"
                    style={{
                      height: compact ? "75%" : "88%",
                      maxWidth: compact ? "67.5%" : "79%",
                      opacity: dimmed ? 0.35 : 1,
                      marginLeft: idx === 0 ? 0 : overlapML,
                      zIndex: idx,
                      imageRendering: "pixelated",
                    }}
                  />
                ) : (
                  <div
                    key={char.id}
                    className="flex items-center justify-center border border-dashed border-white/10 text-center text-[9px] text-white/20"
                    style={{
                      height: compact ? "75%" : "88%",
                      width: compact ? "40%" : "45%",
                      opacity: dimmed ? 0.35 : 1,
                      marginLeft: idx === 0 ? 0 : overlapML,
                      zIndex: idx,
                    }}
                  >
                    삭제된 리소스
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Text box — absolute, hidden when no speaker */}
      {cut.speakerIds.length > 0 && (
        <div className="absolute bottom-0 inset-x-0 z-10 p-1 sm:px-3 sm:pb-3">
          {speakerNames && (
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-t-lg bg-black/60 px-2 py-1 sm:px-3.5 sm:py-1.5 text-[9px] sm:text-sm font-bold tracking-wide text-white border border-white/20 ring-1 ring-inset ring-white/5 rounded-b-none">
                {speakerNames}
              </span>
            </div>
          )}
          <div
            className={`relative flex h-15 sm:h-24 flex-col justify-start rounded-lg sm:rounded-2xl px-3 py-2 sm:px-5 sm:py-3 backdrop-blur-md ${
              isNarrator
                ? "border border-white/10 bg-gray-900/60"
                : "border border-white/20 bg-black/60 shadow-xl ring-1 ring-inset ring-white/5 rounded-tl-none"
            }`}
          >
            {(() => {
              const raw = displayedText ?? (hasText ? cut.text : "");
              const effect = cut.textEffect ?? "default";
              const content = effect === "whisper" && raw ? `(${raw})` : raw;
              return (
                <p
                  className={`line-clamp-3 ${
                    effect === "whisper"
                      ? "leading-relaxed text-[7px] sm:text-[11px] italic text-gray-400/70"
                      : effect === "shout"
                        ? "leading-tight text-[14px] sm:text-[30px] font-black tracking-wide text-white"
                        : `leading-relaxed text-[9px] sm:text-sm ${isNarrator ? "italic text-gray-400" : "text-white"}`
                  }`}
                >
                  {content || <span className="text-white/20">...</span>}
                </p>
              );
            })()}
            {showNextIndicator && (
              <span className="absolute bottom-1.5 right-3 animate-bounce text-white/40 text-[8px] sm:text-xs">
                ▼
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
