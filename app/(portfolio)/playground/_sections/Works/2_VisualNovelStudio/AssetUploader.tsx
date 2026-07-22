"use client";

import { Pause, Play } from "lucide-react";
import { useRef, useState } from "react";
import { PixelArt } from "../_shared/assetLibrary";
import { pixelArtToDataUrl } from "../_shared/renderPixelArt";
import ResourcePicker from "./ResourcePicker";
import { AudioTrack, AudioTrackType, Background, Character } from "./types";

interface Props {
  characters: Character[];
  backgrounds: Background[];
  audioTracks: AudioTrack[];
  onAddCharacter: (
    name: string,
    images: { label: string; pixelArtId: string }[],
  ) => void;
  onAddCharacterImage: (charId: string, label: string, pixelArtId: string) => void;
  onRemoveCharacterImage: (charId: string, imageId: string) => void;
  onRenameCharacter: (charId: string, name: string) => void;
  onRelabelCharacterImage: (
    charId: string,
    imageId: string,
    label: string,
  ) => void;
  onRemoveCharacter: (id: string) => void;
  onAddBackground: (name: string, pixelArtId: string) => void;
  onRemoveBackground: (id: string) => void;
  onAddAudioTrack: (name: string, type: AudioTrackType, file: File) => void;
  onRemoveAudioTrack: (id: string) => void;
}

type Tab = "characters" | "backgrounds" | "music";

function InlineInput({
  value,
  onCommit,
  className,
}: {
  value: string;
  onCommit: (v: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onCommit(trimmed);
    else setDraft(value);
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className={`rounded-lg border-2 border-black bg-white px-1.5 py-0.5 text-black outline-none ${className ?? ""}`}
      />
    );
  }

  return (
    <button
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      className={`text-left hover:opacity-70 ${className ?? ""}`}
      title="클릭해서 수정"
    >
      {value || "—"}
    </button>
  );
}

function CharacterCard({
  char,
  onAddImage,
  onRemoveImage,
  onRename,
  onRelabel,
  onRemove,
}: {
  char: Character;
  onAddImage: (label: string, pixelArtId: string) => void;
  onRemoveImage: (imageId: string) => void;
  onRename: (name: string) => void;
  onRelabel: (imageId: string, label: string) => void;
  onRemove: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2 rounded-2xl border-2 border-black bg-[#d9d9d9] p-3">
      <div className="flex items-center justify-between">
        <InlineInput
          value={char.name}
          onCommit={onRename}
          className="text-sm font-medium text-black"
        />
        <button
          onClick={onRemove}
          className="text-xs text-gray-700 transition-colors hover:text-[#ac1717]"
        >
          삭제
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {char.images.map((img) => (
          <div
            key={img.id}
            className="relative flex flex-col items-center gap-1"
          >
            <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg border-2 border-black">
              {img.imageUrl && (
                <img
                  src={img.imageUrl}
                  alt={img.label}
                  className="h-full w-full object-contain"
                  style={{ imageRendering: "pixelated" }}
                />
              )}
              {char.images.length > 1 && (
                <button
                  onClick={() => onRemoveImage(img.id)}
                  className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/70 text-gray-300 hover:text-red-400"
                >
                  ×
                </button>
              )}
            </div>
            <InlineInput
              value={img.label}
              onCommit={(label) => onRelabel(img.id, label)}
              className="max-w-12 truncate text-center text-xs text-gray-700"
            />
          </div>
        ))}
        <button
          onClick={() => setPickerOpen(true)}
          className="flex h-16 w-12 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-black text-black hover:bg-black/5"
        >
          <span className="text-lg">+</span>
        </button>
      </div>
      <ResourcePicker
        open={pickerOpen}
        kind="character"
        onClose={() => setPickerOpen(false)}
        onSelect={(art) => {
          onAddImage(art.name || "표정", art.id);
          setPickerOpen(false);
        }}
      />
    </div>
  );
}

type PendingImage = {
  id: string;
  label: string;
  pixelArtId: string;
  previewUrl: string;
};

function CharacterForm({
  count,
  onAdd,
}: {
  count: number;
  onAdd: (name: string, images: { label: string; pixelArtId: string }[]) => void;
}) {
  const [name, setName] = useState(() => `캐릭터${count + 1}`);
  const [pending, setPending] = useState<PendingImage[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const handlePick = (art: PixelArt) => {
    setPending((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2),
        label: art.name || `유형${prev.length + 1}`,
        pixelArtId: art.id,
        previewUrl: pixelArtToDataUrl(art),
      },
    ]);
    setPickerOpen(false);
  };

  const updateLabel = (id: string, label: string) =>
    setPending((prev) => prev.map((p) => (p.id === id ? { ...p, label } : p)));

  const removeImage = (id: string) =>
    setPending((prev) => prev.filter((p) => p.id !== id));

  const handleAdd = () => {
    if (!name.trim() || pending.length === 0) return;
    onAdd(
      name.trim(),
      pending.map(({ label, pixelArtId }) => ({ label, pixelArtId })),
    );
    setName(`캐릭터${count + 2}`);
    setPending([]);
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border-2 border-black bg-[#d9d9d9] p-4">
      <input
        type="text"
        placeholder="캐릭터 이름"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded-lg border-2 border-black bg-white px-3 py-2 text-sm text-black placeholder:text-gray-500 outline-none"
      />
      <div className="flex flex-wrap gap-2 p-1.5">
        {pending.map((p) => (
          <div key={p.id} className="flex flex-col items-center gap-1">
            <div className="relative">
              <img
                src={p.previewUrl}
                alt=""
                className="h-32 w-14 rounded-lg border-2 border-black bg-white object-contain"
                style={{ imageRendering: "pixelated" }}
              />
              <button
                onClick={() => removeImage(p.id)}
                className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/70 text-xs text-gray-300 hover:text-red-400"
              >
                ×
              </button>
            </div>
            <input
              type="text"
              placeholder="유형"
              value={p.label}
              onChange={(e) => updateLabel(p.id, e.target.value)}
              className="w-12 rounded-lg border-2 border-black bg-white px-1 py-1 text-center text-xs text-black placeholder:text-gray-500 outline-none"
            />
          </div>
        ))}
        <button
          onClick={() => setPickerOpen(true)}
          className="flex h-32 w-14 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-black text-black hover:bg-black/5"
        >
          <span className="text-xl leading-none">+</span>
          <span className="text-[10px]">
            {pending.length === 0 ? "이미지" : "추가"}
          </span>
        </button>
      </div>
      <p className="text-xs text-gray-700">권장 비율 2:5</p>

      <button
        onClick={handleAdd}
        disabled={!name.trim() || pending.length === 0}
        className="rounded-lg border-2 border-black bg-[#264986]/15 py-2 text-sm font-medium text-[#264986] hover:bg-[#264986]/25 disabled:cursor-not-allowed disabled:opacity-40"
      >
        등록
      </button>
      <ResourcePicker
        open={pickerOpen}
        kind="character"
        onClose={() => setPickerOpen(false)}
        onSelect={handlePick}
      />
    </div>
  );
}

function BackgroundForm({
  count,
  onAdd,
}: {
  count: number;
  onAdd: (name: string, pixelArtId: string) => void;
}) {
  const [name, setName] = useState(() => `배경${count + 1}`);
  const [picked, setPicked] = useState<{ art: PixelArt; previewUrl: string } | null>(
    null,
  );
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleAdd = () => {
    if (!name.trim() || !picked) return;
    onAdd(name.trim(), picked.art.id);
    setName(`배경${count + 2}`);
    setPicked(null);
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border-2 border-black bg-[#d9d9d9] p-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
        <input
          type="text"
          placeholder="배경 이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="rounded-lg border-2 border-black bg-white px-3 py-2 text-sm text-black placeholder:text-gray-500 outline-none sm:col-start-1 sm:row-start-1"
        />
        <button
          onClick={() => setPickerOpen(true)}
          className="flex aspect-video cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-black bg-white hover:bg-black/5 sm:col-span-2 sm:col-start-1 sm:row-start-2"
        >
          {picked ? (
            <img
              src={picked.previewUrl}
              alt=""
              className="h-full w-full object-contain p-1"
              style={{ imageRendering: "pixelated" }}
            />
          ) : (
            <div className="flex flex-col items-center gap-1.5 px-4 py-3 text-center">
              <span className="text-xl opacity-40">🖼️</span>
              <span className="text-xs text-gray-700">클릭해서 리소스 선택</span>
            </div>
          )}
        </button>
      </div>
      <p className="text-xs text-gray-700">권장 이미지 비율: 16:9</p>
      <button
        onClick={handleAdd}
        disabled={!name.trim() || !picked}
        className="order-last rounded-lg border-2 border-black bg-[#264986]/15 py-2 px-4 text-sm font-medium text-[#264986] hover:bg-[#264986]/25 disabled:cursor-not-allowed disabled:opacity-40 sm:order-none sm:col-start-2 sm:row-start-1 sm:self-stretch"
      >
        등록
      </button>
      <ResourcePicker
        open={pickerOpen}
        kind="background"
        onClose={() => setPickerOpen(false)}
        onSelect={(art) => {
          setPicked({ art, previewUrl: pixelArtToDataUrl(art) });
          setPickerOpen(false);
        }}
      />
    </div>
  );
}

function AudioTrackItem({
  track,
  onRemove,
}: {
  track: AudioTrack;
  onRemove: () => void;
}) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggle = () => {
    if (!track.audioUrl) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(track.audioUrl);
      audioRef.current.onended = () => setPlaying(false);
    }
    if (playing) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-2xl border-2 border-black bg-[#d9d9d9] px-3 py-2.5">
      <button
        onClick={toggle}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-black bg-white text-black hover:bg-black/5"
      >
        {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
      </button>
      <span className="min-w-0 flex-1 truncate text-xs text-black">
        {track.name}
      </span>
      <button
        onClick={onRemove}
        className="shrink-0 text-xs text-gray-700 hover:text-[#ac1717]"
      >
        삭제
      </button>
    </div>
  );
}

function AudioSection({
  type,
  label,
  tracks,
  count,
  onAdd,
  onRemove,
}: {
  type: AudioTrackType;
  label: string;
  tracks: AudioTrack[];
  count: number;
  onAdd: (name: string, type: AudioTrackType, file: File) => void;
  onRemove: (id: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const name = file.name.replace(/\.[^.]+$/, "") || `${label}${count + 1}`;
    onAdd(name, type, file);
    e.target.value = "";
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-widest text-black">
          {label}
        </p>
        <button
          onClick={() => fileRef.current?.click()}
          className="rounded-full border-2 border-black px-3 py-1 text-xs text-black hover:bg-black/5"
        >
          + 추가
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleFile}
        />
      </div>
      {tracks.length === 0 ? (
        <p className="text-xs italic text-gray-700">없음</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {tracks.map((t) => (
            <AudioTrackItem
              key={t.id}
              track={t}
              onRemove={() => onRemove(t.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const TAB_LABELS: Record<Tab, string> = {
  characters: "캐릭터",
  backgrounds: "배경",
  music: "사운드",
};

export default function AssetUploader({
  characters,
  backgrounds,
  audioTracks,
  onAddCharacter,
  onAddCharacterImage,
  onRemoveCharacterImage,
  onRenameCharacter,
  onRelabelCharacterImage,
  onRemoveCharacter,
  onAddBackground,
  onRemoveBackground,
  onAddAudioTrack,
  onRemoveAudioTrack,
}: Props) {
  const [tab, setTab] = useState<Tab>("characters");

  const bgm = audioTracks.filter((a) => a.type === "bgm");
  const sfx = audioTracks.filter((a) => a.type === "sfx");

  return (
    <div className="flex h-full flex-col">
      <div className="flex border-b-2 border-black">
        {(["characters", "backgrounds", "music"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-xs font-medium transition-colors ${
              tab === t
                ? "border-b-2 border-[#264986] text-[#264986]"
                : "text-gray-700 hover:text-black"
            }`}
          >
            {TAB_LABELS[t]}
            {t === "characters" &&
              characters.length > 0 &&
              ` (${characters.length})`}
            {t === "backgrounds" &&
              backgrounds.length > 0 &&
              ` (${backgrounds.length})`}
            {t === "music" &&
              audioTracks.length > 0 &&
              ` (${audioTracks.length})`}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-4 p-4 min-h-0 flex flex-col">
        {tab === "characters" && (
          <>
            <CharacterForm count={characters.length} onAdd={onAddCharacter} />
            <div className="overflow-auto min-h-0 flex flex-col gap-2">
              {characters.map((char) => (
                <CharacterCard
                  key={char.id}
                  char={char}
                  onAddImage={(label, pixelArtId) =>
                    onAddCharacterImage(char.id, label, pixelArtId)
                  }
                  onRemoveImage={(imageId) =>
                    onRemoveCharacterImage(char.id, imageId)
                  }
                  onRename={(name) => onRenameCharacter(char.id, name)}
                  onRelabel={(imageId, label) =>
                    onRelabelCharacterImage(char.id, imageId, label)
                  }
                  onRemove={() => onRemoveCharacter(char.id)}
                />
              ))}
            </div>
          </>
        )}
        {tab === "backgrounds" && (
          <>
            <BackgroundForm
              count={backgrounds.length}
              onAdd={onAddBackground}
            />
            <div className="overflow-auto min-h-0 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {backgrounds.map((bg) => (
                <div
                  key={bg.id}
                  className="relative flex flex-col items-center gap-1.5 rounded-2xl border-2 border-black bg-[#d9d9d9] p-3"
                >
                  {bg.imageUrl && (
                    <img
                      src={bg.imageUrl}
                      alt={bg.name}
                      className="h-16 w-full object-contain"
                      style={{ imageRendering: "pixelated" }}
                    />
                  )}
                  <span className="text-xs text-black">{bg.name}</span>
                  <button
                    onClick={() => onRemoveBackground(bg.id)}
                    className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full border-2 border-black bg-white text-xs text-gray-700 hover:bg-red-50 hover:text-[#ac1717]"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
        {tab === "music" && (
          <div className="overflow-auto min-h-0 flex flex-col gap-6">
            <AudioSection
              type="bgm"
              label="배경음악"
              tracks={bgm}
              count={bgm.length}
              onAdd={onAddAudioTrack}
              onRemove={onRemoveAudioTrack}
            />
            <AudioSection
              type="sfx"
              label="효과음"
              tracks={sfx}
              count={sfx.length}
              onAdd={onAddAudioTrack}
              onRemove={onRemoveAudioTrack}
            />
          </div>
        )}
      </div>
    </div>
  );
}
