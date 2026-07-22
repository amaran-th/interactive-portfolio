"use client";

import { useEffect, useState } from "react";
import { PixelArt, listPixelArt } from "../_shared/assetLibrary";
import { BUILTIN_BACKGROUNDS, BUILTIN_CHARACTER_IMAGES } from "../_shared/builtinAssets";
import { pixelArtToDataUrl } from "../_shared/renderPixelArt";

type Tab = "builtin" | "library";

interface Props {
  open: boolean;
  kind: "character" | "background";
  onClose: () => void;
  onSelect: (art: PixelArt) => void;
}

function Thumb({ art, onClick }: { art: PixelArt; onClick: () => void }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    setUrl(pixelArtToDataUrl(art));
  }, [art]);

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 rounded-lg border-2 border-black bg-white p-2 text-left transition-colors hover:bg-black/5"
    >
      <div className="flex h-16 w-full items-center justify-center overflow-hidden rounded-lg border-2 border-black bg-[#d9d9d9]">
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={art.name}
            className="h-full w-full object-contain"
            style={{ imageRendering: "pixelated" }}
          />
        )}
      </div>
      <span className="w-full truncate text-center text-xs text-black">
        {art.name}
      </span>
    </button>
  );
}

export default function ResourcePicker({ open, kind, onClose, onSelect }: Props) {
  // 기본 제공 세트가 비어 있는 동안은 "네모네모빔 리소스" 탭을 먼저 보여준다 —
  // 콘텐츠가 채워지면(builtinAssets.ts) 자연스럽게 "기본 제공"이 기본값이 된다.
  const [tab, setTab] = useState<Tab>(() =>
    (kind === "character" ? BUILTIN_CHARACTER_IMAGES : BUILTIN_BACKGROUNDS)
      .length === 0
      ? "library"
      : "builtin",
  );
  const [libraryArt, setLibraryArt] = useState<PixelArt[]>([]);

  useEffect(() => {
    if (open)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLibraryArt(listPixelArt());
  }, [open]);

  if (!open) return null;

  const builtinArt = kind === "character" ? BUILTIN_CHARACTER_IMAGES : BUILTIN_BACKGROUNDS;
  const items = tab === "builtin" ? builtinArt : libraryArt;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border-2 border-black bg-[#d9d9d9]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex border-b-2 border-black">
          {(["builtin", "library"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-xs font-medium transition-colors ${
                tab === t
                  ? "border-b-2 border-[#264986] text-[#264986]"
                  : "text-gray-700 hover:text-black"
              }`}
            >
              {t === "builtin" ? "기본 제공" : "네모네모빔 리소스"}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-auto p-3">
          {items.length === 0 ? (
            <p className="py-8 text-center text-xs italic text-gray-700">
              {tab === "builtin"
                ? "기본 제공 리소스가 없습니다."
                : "네모네모빔에서 만든 그림이 없습니다. 먼저 그림을 그려서 저장해보세요."}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {items.map((art) => (
                <Thumb key={art.id} art={art} onClick={() => onSelect(art)} />
              ))}
            </div>
          )}
        </div>
        <div className="border-t-2 border-black p-2">
          <button
            onClick={onClose}
            className="w-full rounded-lg px-3 py-2 text-xs text-black hover:bg-black/5"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
