"use client";

import { Pause, Play } from "lucide-react";
import { useRef, useState } from "react";
import { AudioTrack, AudioTrackType, Background, Character } from "./types";

interface Props {
  characters: Character[];
  backgrounds: Background[];
  audioTracks: AudioTrack[];
  onAddCharacter: (
    name: string,
    images: { label: string; file: File }[],
  ) => void;
  onAddCharacterImage: (charId: string, label: string, file: File) => void;
  onRemoveCharacterImage: (charId: string, imageId: string) => void;
  onRenameCharacter: (charId: string, name: string) => void;
  onRelabelCharacterImage: (
    charId: string,
    imageId: string,
    label: string,
  ) => void;
  onRemoveCharacter: (id: string) => void;
  onAddBackground: (name: string, file: File) => void;
  onRemoveBackground: (id: string) => void;
  onAddAudioTrack: (name: string, type: AudioTrackType, file: File) => void;
  onRemoveAudioTrack: (id: string) => void;
}

type Tab = "characters" | "backgrounds" | "music";

function DropImageArea({
  preview,
  placeholder,
  multiple,
  onFiles,
  className,
}: {
  preview?: string | null;
  placeholder?: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  className?: string;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter((f) =>
      f.type.startsWith("image/"),
    );
    if (files.length) onFiles(files);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/"),
    );
    if (files.length) onFiles(files);
  };

  return (
    <div
      onClick={() => fileRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      className={`flex cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed transition-colors ${
        isDragOver
          ? "border-white/50 bg-white/10"
          : "border-white/20 bg-white/5 hover:bg-white/8"
      } ${className ?? ""}`}
    >
      {preview ? (
        <img
          src={preview}
          alt="preview"
          className="h-full w-full object-contain p-1"
        />
      ) : (
        <div className="flex flex-col items-center gap-1.5 px-4 py-3 text-center">
          <span className="text-xl opacity-40">🖼️</span>
          <span className="text-xs text-gray-500">
            {isDragOver
              ? "여기에 놓기"
              : (placeholder ?? "클릭 또는 드래그&드롭")}
          </span>
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}

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
        className={`rounded border border-white/20 bg-white/10 px-1.5 py-0.5 text-white outline-none ${className ?? ""}`}
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
  onAddImage: (label: string, file: File) => void;
  onRemoveImage: (imageId: string) => void;
  onRename: (name: string) => void;
  onRelabel: (imageId: string, label: string) => void;
  onRemove: () => void;
}) {
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [pendingLabel, setPendingLabel] = useState("");
  const [showPicker, setShowPicker] = useState(false);

  const handlePickFile = (files: File[]) => {
    const f = files[0];
    if (!f) return;
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(f);
    setPendingPreview(URL.createObjectURL(f));
  };

  const handleAdd = () => {
    if (!pendingFile) return;
    onAddImage(pendingLabel.trim(), pendingFile);
    setPendingFile(null);
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingPreview(null);
    setPendingLabel("");
    setShowPicker(false);
  };

  const handleCancel = () => {
    setShowPicker(false);
    setPendingFile(null);
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingPreview(null);
    setPendingLabel("");
  };

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-center justify-between">
        <InlineInput
          value={char.name}
          onCommit={onRename}
          className="text-sm font-medium text-white"
        />
        <button
          onClick={onRemove}
          className="text-xs text-gray-600 transition-colors hover:text-red-400"
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
            <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10">
              {img.imageUrl && (
                <img
                  src={img.imageUrl}
                  alt={img.label}
                  className="h-full w-full object-contain"
                />
              )}
              {char.images.length > 1 && (
                <button
                  onClick={() => onRemoveImage(img.id)}
                  className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/70 text-gray-400 hover:text-red-400"
                >
                  ×
                </button>
              )}
            </div>
            <InlineInput
              value={img.label}
              onCommit={(label) => onRelabel(img.id, label)}
              className="max-w-12 truncate text-center text-xs text-gray-500"
            />
          </div>
        ))}
        {/* Add image button */}
        {!showPicker ? (
          <button
            onClick={() => setShowPicker(true)}
            className="flex h-16 w-12 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-white/20 text-gray-600 hover:border-white/30 hover:text-gray-400"
          >
            <span className="text-lg">+</span>
          </button>
        ) : (
          <div className="flex w-full flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-2">
            <DropImageArea
              preview={pendingPreview}
              onFiles={handlePickFile}
              className="h-20"
            />
            <input
              type="text"
              placeholder="유형"
              value={pendingLabel}
              onChange={(e) => setPendingLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder:text-gray-600 outline-none focus:border-white/30"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={!pendingFile}
                className="flex-1 rounded-lg bg-white/10 py-1.5 text-xs font-medium text-white hover:bg-white/15 disabled:opacity-30"
              >
                추가
              </button>
              <button
                onClick={handleCancel}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-400 hover:bg-white/5"
              >
                취소
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type PendingImage = { id: string; label: string; file: File; preview: string };

function CharacterForm({
  count,
  onAdd,
}: {
  count: number;
  onAdd: (name: string, images: { label: string; file: File }[]) => void;
}) {
  const [name, setName] = useState(() => `캐릭터${count + 1}`);
  const [pending, setPending] = useState<PendingImage[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const addFiles = (files: File[]) => {
    setPending((prev) => [
      ...prev,
      ...files.map((file, index) => ({
        id: Math.random().toString(36).slice(2),
        label: `유형${prev.length + index + 1}`,
        file,
        preview: URL.createObjectURL(file),
      })),
    ]);
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(
      Array.from(e.target.files ?? []).filter((f) =>
        f.type.startsWith("image/"),
      ),
    );
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    addFiles(
      Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/"),
      ),
    );
  };

  const updateLabel = (id: string, label: string) =>
    setPending((prev) => prev.map((p) => (p.id === id ? { ...p, label } : p)));

  const removeImage = (id: string) => {
    setPending((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter((p) => p.id !== id);
    });
  };

  const handleAdd = () => {
    if (!name.trim() || pending.length === 0) return;
    onAdd(
      name.trim(),
      pending.map(({ label, file }) => ({ label, file })),
    );
    pending.forEach((p) => URL.revokeObjectURL(p.preview));
    setName(`캐릭터${count + 2}`);
    setPending([]);
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <input
        type="text"
        placeholder="캐릭터 이름"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-600 outline-none focus:border-white/30"
      />
      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        className={`flex flex-wrap gap-2 rounded-xl p-1.5 transition-colors ${
          isDragOver ? "bg-white/8 ring-1 ring-white/30" : ""
        }`}
      >
        {pending.map((p) => (
          <div key={p.id} className="flex flex-col items-center gap-1">
            <div className="relative">
              <img
                src={p.preview}
                alt=""
                className="h-32 w-14 rounded-lg bg-white/5 object-contain"
              />
              <button
                onClick={() => removeImage(p.id)}
                className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/70 text-xs text-gray-400 hover:text-red-400"
              >
                ×
              </button>
            </div>
            <input
              type="text"
              placeholder="유형"
              value={p.label}
              onChange={(e) => updateLabel(p.id, e.target.value)}
              className="w-12 rounded-md border border-white/10 bg-white/5 px-1 py-1 text-center text-xs text-white placeholder:text-gray-600 outline-none focus:border-white/30"
            />
          </div>
        ))}
        <button
          onClick={() => fileRef.current?.click()}
          className="flex h-32 w-14 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-white/20 text-gray-600 hover:border-white/30 hover:text-gray-400"
        >
          <span className="text-xl leading-none">+</span>
          <span className="text-[10px]">
            {pending.length === 0 ? "이미지" : "추가"}
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFiles}
        />
      </div>
      <p className="text-xs text-gray-600">권장 비율 2:5 · 드래그&드롭 가능</p>

      <button
        onClick={handleAdd}
        disabled={!name.trim() || pending.length === 0}
        className="rounded-lg bg-white/10 py-2 text-sm font-medium text-white hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-30"
      >
        등록
      </button>
    </div>
  );
}

function BackgroundForm({
  count,
  onAdd,
}: {
  count: number;
  onAdd: (name: string, file: File) => void;
}) {
  const [name, setName] = useState(() => `배경${count + 1}`);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const handleFile = (files: File[]) => {
    const f = files[0];
    if (!f) return;
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleAdd = () => {
    if (!name.trim() || !file) return;
    onAdd(name.trim(), file);
    setName(`배경${count + 2}`);
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
        <input
          type="text"
          placeholder="배경 이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-600 outline-none focus:border-white/30 sm:col-start-1 sm:row-start-1"
        />
        {/* Image area — row 2 on desktop, row 2 on mobile (middle) */}
        <DropImageArea
          preview={preview}
          onFiles={handleFile}
          className="aspect-video sm:col-span-2 sm:col-start-1 sm:row-start-2"
        />
        {/* Button — row 1 col 2 on desktop, last on mobile */}
      </div>
      <p className="text-xs text-gray-600">권장 이미지 비율: 16:9</p>
      <button
        onClick={handleAdd}
        disabled={!name.trim() || !file}
        className="order-last rounded-lg bg-white/10 py-2 px-4 text-sm font-medium text-white hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-30 sm:order-none sm:col-start-2 sm:row-start-1 sm:self-stretch"
      >
        등록
      </button>
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
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
      <button
        onClick={toggle}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
      >
        {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
      </button>
      <span className="min-w-0 flex-1 truncate text-xs text-gray-300">
        {track.name}
      </span>
      <button
        onClick={onRemove}
        className="shrink-0 text-xs text-gray-600 hover:text-red-400"
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
        <p className="text-xs font-medium uppercase tracking-widest text-gray-500">
          {label}
        </p>
        <button
          onClick={() => fileRef.current?.click()}
          className="rounded-full border border-white/15 px-3 py-1 text-xs text-gray-400 hover:border-white/30 hover:text-white"
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
      <div className="flex border-b border-white/10">
        {(["characters", "backgrounds", "music"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-xs font-medium transition-colors ${
              tab === t
                ? "border-b-2 border-white text-white"
                : "text-gray-500 hover:text-gray-300"
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
                  onAddImage={(label, file) =>
                    onAddCharacterImage(char.id, label, file)
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
                  className="relative flex flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 p-3"
                >
                  {bg.imageUrl && (
                    <img
                      src={bg.imageUrl}
                      alt={bg.name}
                      className="h-16 w-full object-contain"
                    />
                  )}
                  <span className="text-xs text-gray-300">{bg.name}</span>
                  <button
                    onClick={() => onRemoveBackground(bg.id)}
                    className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-xs text-gray-500 hover:bg-red-900/50 hover:text-red-300"
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
