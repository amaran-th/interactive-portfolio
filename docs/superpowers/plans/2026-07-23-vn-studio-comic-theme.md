# 비주얼 노벨 스튜디오 만화·낙서 테마 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 비주얼 노벨 스튜디오(Work #2)의 편집 UI(홈 화면, 리소스 편집, 컷 편집기 컨트롤, 플레이 화면 헤더)를 실제 미리보기 이미지/파비콘이 보여주는 만화·낙서(웹툰) 스타일로 리스킨한다. `VNDisplay.tsx`(VN 스테이지)는 이번 작업에서 전혀 건드리지 않는다.

**Architecture:** 6개 태스크, 전부 순수 `className` 치환. 새 폰트 로딩이나 구조 변경은 없다(폰트는 Mona12 유지, 이전 라이트모드 플랜에서 이미 적용됨).

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4. 테스트 스위트 없음 — 각 태스크는 `npm run lint && npx tsc --noEmit -p .` + 브라우저 수동 검증으로 마무리한다.

## Global Constraints

전부 순수 비주얼 리스킨이다 — 상태·이벤트 핸들러·prop 시그니처·비즈니스 로직을 바꾸지 않는다. `VNDisplay.tsx`는 이 계획의 어떤 태스크에서도 열지 않는다(스펙: `docs/superpowers/specs/2026-07-23-vn-studio-comic-theme-design.md`).

### 색상 팔레트 (이미지에서 직접 추출)

| 역할 | 값 |
|---|---|
| 페이지 배경 | `bg-[#818181]` |
| 카드/패널 배경 | `bg-[#d9d9d9]` |
| 아웃라인 | `border-black`, 두께 항상 2px(`border-2`) |
| 강조색(선택/활성) | `#264986` |
| 위험/삭제 | `#ac1717` |

### 텍스트 규칙

| 위치 | 색 |
|---|---|
| 카드(`#d9d9d9`/`bg-white`) 위 본문 | `text-black` |
| 카드 위 보조/설명 텍스트 | `text-gray-700` |
| 페이지 배경(`#818181`) 위 제목(굵게) | `font-bold text-black` |
| 페이지 배경 위 보조 텍스트 | `text-black/70` |

### 모서리 — "둥긂 환영" (직전 잉크 매뉴스크립트 테마와 반대)

| 요소 종류 | 라운딩 |
|---|---|
| 카드/패널/모달 패널 | `rounded-2xl` |
| 버튼(사각형), 입력창, 텍스트에어리어 | `rounded-lg` |
| 칩, 원형 아이콘 버튼, 배지 | `rounded-full` |

### 테두리

모든 카드·버튼·입력창·칩에 `border-2 border-black`을 준다 — **솔리드 색(인디고/빨강) 버튼도 예외 없이 검정 테두리를 두른다**(스티커/말풍선처럼 아웃라인이 도는 느낌). 점선 테두리는 `border-2 border-dashed border-black`.

### 강조 2단계 패턴

| 역할 | 패턴 |
|---|---|
| 강한 강조(CTA, 선택된 탭/컷 번호/활성 캐릭터) | `bg-[#264986] text-white border-2 border-black` |
| 중간 강조(선택된 칩) | `bg-[#264986]/15 text-[#264986] border-2 border-black` |
| 비선택 칩(아웃라인) | `border-2 border-black text-gray-700 hover:bg-black/5` |
| 확정 삭제 버튼 | `bg-[#ac1717] text-white border-2 border-black hover:opacity-90` |
| 상시 노출 삭제(아이콘/텍스트) | `text-gray-700 hover:bg-red-50 hover:text-[#ac1717]` |
| 중립 hover(카드/흰 배경 위) | `hover:bg-black/5` |

발화자 칩의 `bg-blue-500`(캐릭터)·`bg-amber-500`(나레이션), 픽셀아트 썸네일 위의 `bg-black/70` 삭제 배지, `ResourcePicker`의 모달 스크림(`bg-black/70`)은 이전 테마들에서도 계속 유지돼 온 것 — 이번에도 손대지 않는다.

---

## File Map

| 파일 | 변화 |
| --- | --- |
| `HomeScreen.tsx` | 만화 테마 리스킨 |
| `VisualNovelStudio.tsx` | 셸 배경 + 리소스 편집 화면 자체 UI 리스킨 |
| `AssetUploader.tsx` | 탭 바, 캐릭터/배경/사운드 폼과 카드 리스킨 |
| `ResourcePicker.tsx` | 모달 패널 리스킨(스크림 제외) |
| `EditorScreen.tsx` | 헤더·컷 목록·선택 칩·입력창 리스킨(`<VNDisplay>` 호출부 미변경) |
| `PlayScreen.tsx` | 헤더·컷 목록 리스킨(`<VNDisplay>` 호출부 미변경) |

`VNDisplay.tsx`는 이 표에 없다 — 어떤 태스크도 이 파일을 열지 않는다.

---

## Task 1: `HomeScreen.tsx` 만화 테마

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/2_VisualNovelStudio/HomeScreen.tsx`

**Interfaces:**
- 변경 없음(props/로직 그대로, 스타일만 교체)

- [ ] **Step 1: `HomeScreen.tsx` 전체 교체**

```tsx
"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { SlotMeta } from "./useSlots";

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "방금 전";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}분 전`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}시간 전`;
  return `${Math.floor(diff / 86_400_000)}일 전`;
}

function EmptySlotCard({
  index,
  onStart,
}: {
  index: number;
  onStart: () => void;
}) {
  return (
    <button
      onClick={onStart}
      className="flex items-center gap-4 rounded-2xl border-2 border-dashed border-black bg-[#d9d9d9] px-5 py-5 text-left transition-all hover:bg-black/5"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-black">
        <Plus className="size-4 text-black" />
      </div>
      <div>
        <p className="text-sm font-medium text-black">새 작품</p>
        <p className="mt-0.5 text-xs text-gray-700">슬롯 {index + 1}</p>
      </div>
    </button>
  );
}

function FilledSlotCard({
  slot,
  index,
  onSelect,
  onPlay,
  onRename,
  onDelete,
}: {
  slot: SlotMeta;
  index: number;
  onSelect: () => void;
  onPlay: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(slot.title);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const commitRename = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== slot.title) onRename(trimmed);
    else setDraft(slot.title);
  };

  return (
    <div className="relative flex items-center gap-4 rounded-2xl border-2 border-black bg-[#d9d9d9] px-5 py-5 transition-all hover:bg-black/5">
      {/* Slot number badge */}
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-black bg-white font-mono text-xs text-black">
        {String(index + 1).padStart(2, "0")}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setDraft(slot.title);
                setEditing(false);
              }
            }}
            className="w-full rounded-lg border-2 border-black bg-white px-2 py-0.5 text-sm font-semibold text-black outline-none"
          />
        ) : (
          <button
            onClick={() => {
              setDraft(slot.title);
              setEditing(true);
            }}
            className="truncate text-left text-sm font-semibold text-black hover:opacity-70"
            title="클릭해서 제목 수정"
          >
            {slot.title}
          </button>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="rounded-full border-2 border-black bg-white px-2 py-0.5 text-xs text-black">
            {slot.cutCount}컷
          </span>
          <span className="rounded-full border-2 border-black bg-white px-2 py-0.5 text-xs text-black">
            {slot.characterCount}캐릭터
          </span>
          <span className="text-xs text-gray-700">{relativeTime(slot.updatedAt)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-2">
        {confirmDelete ? (
          <>
            <button
              onClick={() => setConfirmDelete(false)}
              className="rounded-lg border-2 border-black px-3 py-1.5 text-xs text-black hover:bg-black/5"
            >
              취소
            </button>
            <button
              onClick={onDelete}
              className="rounded-lg border-2 border-black bg-[#ac1717] px-3 py-1.5 text-xs text-white hover:opacity-90"
            >
              삭제
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setConfirmDelete(true)}
              className="rounded-lg border-2 border-black px-2.5 py-1.5 text-xs text-gray-700 transition-colors hover:bg-red-50 hover:text-[#ac1717]"
            >
              삭제
            </button>
            <button
              onClick={onPlay}
              className="rounded-full border-2 border-black px-3 py-1.5 text-xs text-black transition-colors hover:bg-black/5"
            >
              ▶
            </button>
            <button
              onClick={onSelect}
              className="rounded-lg border-2 border-black bg-[#264986] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-90"
            >
              편집 →
            </button>
          </>
        )}
      </div>
    </div>
  );
}

interface Props {
  slots: SlotMeta[];
  maxSlots?: number;
  onNewSlot: () => void;
  onSelectSlot: (slot: SlotMeta) => void;
  onPlaySlot: (slot: SlotMeta) => void;
  onRenameSlot: (id: string, title: string) => void;
  onDeleteSlot: (id: string) => void;
}

export default function HomeScreen({
  slots,
  maxSlots = 3,
  onNewSlot,
  onSelectSlot,
  onPlaySlot,
  onRenameSlot,
  onDeleteSlot,
}: Props) {
  return (
    <div className="flex h-full flex-col bg-[#818181] text-black">
      {/* Header */}
      <div className="shrink-0 px-6 pt-8 pb-6">
        <h1 className="text-xl font-bold tracking-tight">비주얼 노벨 메이커</h1>
        <p className="mt-1 text-xs text-black/70">작품을 선택하거나 새로 만드세요.</p>
      </div>

      {/* Slot list */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        <div className="flex flex-col gap-3">
          {Array.from({ length: maxSlots }, (_, i) => {
            const slot = slots[i] ?? null;
            if (slot) {
              return (
                <FilledSlotCard
                  key={slot.id}
                  slot={slot}
                  index={i}
                  onSelect={() => onSelectSlot(slot)}
                  onPlay={() => onPlaySlot(slot)}
                  onRename={(title) => onRenameSlot(slot.id, title)}
                  onDelete={() => onDeleteSlot(slot.id)}
                />
              );
            }
            return (
              <EmptySlotCard
                key={i}
                index={i}
                onStart={onNewSlot}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: lint + 타입 확인**

Run: `npm run lint && npx tsc --noEmit -p .`
Expected: 오류 없음

- [ ] **Step 3: commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/2_VisualNovelStudio/HomeScreen.tsx"
git commit -m "feat: VN 스튜디오 홈 화면 만화 테마 리스킨"
```

---

## Task 2: `VisualNovelStudio.tsx` 만화 테마

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/2_VisualNovelStudio/VisualNovelStudio.tsx`

**Interfaces:**
- 변경 없음(props/로직/폰트 래퍼 구조 그대로 — 이번엔 색상 클래스만 교체)

- [ ] **Step 1: `VisualNovelStudio.tsx` 전체 교체**

```tsx
"use client";

import { House } from "lucide-react";
import { useCallback, useState } from "react";
import { monaFont } from "../_shared/fonts";
import { useUnsavedChangesWarning } from "../_shared/useUnsavedChangesWarning";
import AssetUploader from "./AssetUploader";
import EditorScreen from "./EditorScreen";
import HomeScreen from "./HomeScreen";
import PlayScreen from "./PlayScreen";
import { SlotMeta, useSlots } from "./useSlots";
import { useVNStore } from "./useVNStore";

type SlotPhase = "setup" | "editor" | "play";

function VNMakerWithSlot({
  slotId,
  initialPhase = "setup",
  onBack,
}: {
  slotId: string;
  initialPhase?: SlotPhase;
  onBack: (cutCount: number, characterCount: number) => void;
}) {
  const [phase, setPhase] = useState<SlotPhase>(initialPhase);
  const store = useVNStore(slotId);

  const handleNext = useCallback(() => {
    store.setCurrentIndex((i) => Math.min(i + 1, store.cuts.length - 1));
  }, [store]);

  const hasWork =
    store.cuts.length > 1 ||
    store.cuts.some((c) => c.text || c.visibleCharacterIds.length > 0 || c.backgroundId) ||
    store.characters.length > 0 ||
    store.backgrounds.length > 0 ||
    store.audioTracks.length > 0;

  useUnsavedChangesWarning(hasWork);

  const handleBack = useCallback(() => {
    onBack(store.cuts.length, store.characters.length);
  }, [onBack, store.cuts.length, store.characters.length]);

  if (phase === "play") {
    return (
      <PlayScreen
        characters={store.characters}
        backgrounds={store.backgrounds}
        audioTracks={store.audioTracks}
        cuts={store.cuts}
        currentIndex={store.currentIndex}
        onNext={handleNext}
        onSelectCut={store.setCurrentIndex}
        onBack={() => setPhase("editor")}
        onGoHome={handleBack}
      />
    );
  }

  if (phase === "setup") {
    return (
      <div className="flex h-full flex-col bg-[#818181] text-black">
        <div className="shrink-0 flex items-center gap-3 border-b-2 border-black px-4 py-3">
          <button
            onClick={handleBack}
            className="flex items-center justify-center rounded-full p-2 text-black transition-colors hover:bg-black/5"
          >
            <House className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-sm font-semibold text-black">리소스 편집</h1>
            <p className="text-xs text-black/70">캐릭터와 배경 이미지를 등록하세요.</p>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          <AssetUploader
            characters={store.characters}
            backgrounds={store.backgrounds}
            audioTracks={store.audioTracks}
            onAddCharacter={store.addCharacter}
            onAddCharacterImage={store.addCharacterImage}
            onRemoveCharacterImage={store.removeCharacterImage}
            onRenameCharacter={store.renameCharacter}
            onRelabelCharacterImage={store.relabelCharacterImage}
            onRemoveCharacter={store.removeCharacter}
            onAddBackground={store.addBackground}
            onRemoveBackground={store.removeBackground}
            onAddAudioTrack={store.addAudioTrack}
            onRemoveAudioTrack={store.removeAudioTrack}
          />
        </div>

        <div className="shrink-0 border-t-2 border-black p-4 flex gap-2">
          <button
            onClick={() => setPhase("editor")}
            className="flex-1 rounded-lg border-2 border-black bg-[#264986] py-3 text-sm font-semibold text-white transition-colors hover:opacity-90"
          >
            {hasWork ? "편집 계속하기" : "편집 시작"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <EditorScreen
      characters={store.characters}
      backgrounds={store.backgrounds}
      audioTracks={store.audioTracks}
      cuts={store.cuts}
      currentIndex={store.currentIndex}
      onSelectCut={store.setCurrentIndex}
      onUpdateCut={store.updateCut}
      onAddCutAfter={store.addCutAfter}
      onDuplicateCut={store.duplicateCut}
      onReorderCuts={store.reorderCuts}
      onDeleteCut={store.deleteCut}
      onPlay={() => {
        store.setCurrentIndex(0);
        setPhase("play");
      }}
      onBack={() => setPhase("setup")}
      onGoHome={handleBack}
    />
  );
}

export default function VisualNovelStudio() {
  const { slots, createSlot, deleteSlot, updateSlotMeta } = useSlots();
  const [activeSlot, setActiveSlot] = useState<SlotMeta | null>(null);
  const [initialPhase, setInitialPhase] = useState<SlotPhase>("setup");

  const handleNewSlot = useCallback(() => {
    const slot = createSlot();
    setActiveSlot(slot);
  }, [createSlot]);

  const handleBack = useCallback(
    (cutCount: number, characterCount: number) => {
      if (activeSlot) {
        updateSlotMeta(activeSlot.id, { cutCount, characterCount });
      }
      setActiveSlot(null);
    },
    [activeSlot, updateSlotMeta],
  );

  const MAX_SLOTS = 3;

  return (
    <div className={`${monaFont.className} h-full`}>
      {!activeSlot ? (
        <HomeScreen
          slots={slots}
          maxSlots={MAX_SLOTS}
          onNewSlot={handleNewSlot}
          onSelectSlot={(slot) => { setInitialPhase("setup"); setActiveSlot(slot); }}
          onPlaySlot={(slot) => { setInitialPhase("play"); setActiveSlot(slot); }}
          onRenameSlot={(id, title) => updateSlotMeta(id, { title })}
          onDeleteSlot={deleteSlot}
        />
      ) : (
        <VNMakerWithSlot
          key={activeSlot.id}
          slotId={activeSlot.id}
          initialPhase={initialPhase}
          onBack={handleBack}
        />
      )}
    </div>
  );
}
```

(변경 요지: `bg-[#f7f6f3] text-gray-900` → `bg-[#818181] text-black`, 홈 버튼 `rounded-full` + `hover:bg-black/5` 추가, 헤더 구분선 `border-gray-200` → `border-black`(2px), 하단 CTA 버튼 `bg-[#2f3a8f]` → `border-2 border-black bg-[#264986]`. 폰트 래퍼(`monaFont.className`)와 `h-full` 구조, import, 로직은 전혀 바뀌지 않는다.)

- [ ] **Step 2: lint + 타입 확인**

Run: `npm run lint && npx tsc --noEmit -p .`
Expected: 오류 없음

- [ ] **Step 3: commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/2_VisualNovelStudio/VisualNovelStudio.tsx"
git commit -m "feat: VN 스튜디오 셸 만화 테마 리스킨"
```

---

## Task 3: `AssetUploader.tsx` 만화 테마

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/2_VisualNovelStudio/AssetUploader.tsx`

**Interfaces:**
- 변경 없음(props/로직 그대로, 스타일만 교체)

- [ ] **Step 1: `AssetUploader.tsx` 전체 교체**

```tsx
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
```

(픽셀아트 썸네일 위의 `bg-black/70` 삭제 배지는 두 곳(`CharacterCard`, `CharacterForm`) 모두 그대로 둔다 — 임의 색 픽셀아트 위에서 항상 잘 보여야 하는 오버레이라 테마와 무관하게 어둡게 유지하는 게 지난 두 리스킨 때부터의 원칙이다. 배지 안 아이콘 색만 `text-gray-400`→`text-gray-300`으로 살짝 밝혀 새 팔레트의 중립 그레이 계단과 맞췄다.)

- [ ] **Step 2: lint + 타입 확인**

Run: `npm run lint && npx tsc --noEmit -p .`
Expected: 오류 없음

- [ ] **Step 3: commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/2_VisualNovelStudio/AssetUploader.tsx"
git commit -m "feat: VN 스튜디오 리소스 편집 화면 만화 테마 리스킨"
```

---

## Task 4: `ResourcePicker.tsx` 만화 테마

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/2_VisualNovelStudio/ResourcePicker.tsx`

**Interfaces:**
- 변경 없음(props/로직 그대로, 스타일만 교체)

- [ ] **Step 1: `ResourcePicker.tsx` 전체 교체**

```tsx
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
      <div className="flex h-16 w-full items-center justify-center overflow-hidden rounded border-2 border-black bg-[#d9d9d9]">
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
```

(모달 배경 스크림 `bg-black/70`은 세 차례 리스킨 내내 한 번도 바뀐 적 없는 표준 모달 관례 — 이번에도 유지.)

- [ ] **Step 2: lint + 타입 확인**

Run: `npm run lint && npx tsc --noEmit -p .`
Expected: 오류 없음

- [ ] **Step 3: commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/2_VisualNovelStudio/ResourcePicker.tsx"
git commit -m "feat: 리소스 선택 모달 만화 테마 리스킨"
```

---

## Task 5: `EditorScreen.tsx` 만화 테마

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/2_VisualNovelStudio/EditorScreen.tsx`

**Interfaces:**
- 변경 없음(props/로직 그대로, 스타일만 교체). `<VNDisplay>` 호출부는 지금 그대로 유지 — 그 컴포넌트 자체는 이 태스크에서도 열지 않는다.

- [ ] **Step 1: `EditorScreen.tsx` 전체 교체**

```tsx
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
        <span className="text-xs text-black/70">{cuts.length}컷</span>
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
                  : "border-black text-gray-700 hover:bg-black/5"
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
                    : "border-black text-gray-700 hover:bg-black/5"
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
            <p className="text-xs italic text-gray-700">등록된 캐릭터 없음</p>
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
                        active ? "bg-[#264986] text-white" : "text-gray-700 hover:bg-black/5"
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
                    : "border-black text-gray-700 hover:bg-black/5"
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
                  : "border-black text-gray-700 hover:bg-black/5"
              }`}
            >
              나레이션
            </button>
            <button
              onClick={() => onUpdateCut(currentIndex, { speakerIds: [] })}
              className={`rounded-full border-2 px-3 py-1.5 text-xs transition-colors ${
                cut.speakerIds.length === 0
                  ? "border-black bg-[#264986]/15 font-medium text-[#264986]"
                  : "border-black text-gray-700 hover:bg-black/5"
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
                        : "border-black text-gray-700 hover:bg-black/5"
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
                  <p className="text-xs text-gray-700">배경음악</p>
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
                            : "border-black text-gray-700 hover:bg-black/5"
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
                  <p className="text-xs text-gray-700">효과음</p>
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
                            : "border-black text-gray-700 hover:bg-black/5"
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
```

(`<VNDisplay ... />` 호출부(제어 props)는 한 글자도 바뀌지 않았다 — 그 컴포넌트 자체 파일은 이 태스크에서 열지 않는다. 캐릭터 이름 드롭다운/포지션 토글은 `bg-white` → `bg-[#d9d9d9]`로 카드 배경과 통일하고 테두리를 `border-black`(2px)으로 올렸다 — 이전 두 테마에서는 "이미 라이트 서피스라 변경 없음" 예외였지만, 이번 테마는 카드 배경 자체가 `#d9d9d9`이므로 이 서피스도 같은 색으로 맞추는 게 일관적이다.)

- [ ] **Step 2: lint + 타입 확인**

Run: `npm run lint && npx tsc --noEmit -p .`
Expected: 오류 없음

- [ ] **Step 3: commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/2_VisualNovelStudio/EditorScreen.tsx"
git commit -m "feat: 컷 편집기 만화 테마 리스킨"
```

---

## Task 6: `PlayScreen.tsx` 만화 테마 + 전체 브라우저 검증

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/2_VisualNovelStudio/PlayScreen.tsx`

**Interfaces:**
- 변경 없음(props/로직 그대로, 스타일만 교체). `<VNDisplay>` 호출부는 미변경.

- [ ] **Step 1: `PlayScreen.tsx` 전체 교체**

```tsx
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
    <div className="flex h-full w-full flex-col bg-[#818181]">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b-2 border-black px-4 py-3">
        <button
          onClick={onGoHome}
          className="flex items-center justify-center rounded-full p-2 text-black transition-colors hover:bg-black/5"
        >
          <House className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-sm font-semibold text-black">플레이</h1>
          <p className="text-xs text-black/70">클릭 또는 스페이스로 진행</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="font-mono text-xs text-black/70">
            {currentIndex + 1} / {cuts.length}
          </span>
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-full border-2 border-black px-3 py-2 text-xs text-black hover:bg-black/5"
          >
            <Pencil className="h-3 w-3" />
            편집
          </button>
        </div>
      </div>

      {/* Cut list */}
      <div className="flex shrink-0 items-center gap-1 border-b-2 border-black bg-[#d9d9d9] px-3 py-2">
        <div className="flex flex-1 items-center gap-1 overflow-x-auto">
          {cuts.map((_, i) => (
            <button
              key={i}
              onClick={() => onSelectCut(i)}
              className={`flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full border-2 px-2 font-mono text-xs transition-all ${
                i === currentIndex
                  ? "border-black bg-[#264986] font-bold text-white"
                  : "border-transparent text-gray-700 hover:bg-black/5"
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
```

- [ ] **Step 2: lint + 타입 확인**

Run: `npm run lint && npx tsc --noEmit -p .`
Expected: 오류 없음

- [ ] **Step 3: 전체 화면 브라우저 검증**

Run: `npm run dev`

1. `http://localhost:3000/visual-novel-studio` 접속 — 홈 화면이 진회색(`#818181`) 배경 + 회백(`#d9d9d9`) 카드 + 두꺼운 검정 테두리로 보이는지, 슬롯 카드가 둥근 모서리(`rounded-2xl`)인지 확인
2. 새 작품 생성 → 리소스 편집 화면(`AssetUploader`) — 탭 밑줄이 `#264986`인지, 카드/폼이 회백+검정 테두리인지, "등록" 버튼이 옅은 파랑 배경인지 확인
3. 리소스 선택 모달(`ResourcePicker`) 열기 — 어두운 스크림 위에 회백 패널(둥근 모서리)이 뜨는지 확인
4. 캐릭터·배경 등록 후 "편집 계속하기" → 컷 편집기(`EditorScreen`) — 배경/캐릭터/발화자/텍스트이펙트 칩이 전부 `rounded-full`(알약형)인지, 컷 번호 탭이 원형인지 확인
5. 컷 편집기 상단 미리보기(`VNDisplay`, compact) — **이 컴포넌트는 이번 계획에서 전혀 바뀌지 않았으므로, 지금까지의 잉크 매뉴스크립트 스타일(흰 배경, 대사박스만 어두운 반투명) 그대로인지 확인** — 주변 편집 UI(진회색+회백+검정 테두리)와 스테이지(흰 배경)가 의도적으로 다른 톤임을 확인
6. "플레이" 진입 → 전체 화면(`PlayScreen`)에서도 헤더·컷 목록은 만화 톤, 스테이지는 그대로 잉크 매뉴스크립트 톤인지 재확인
7. `/nemo-nemo-beam`(픽셀아트 메이커)로 돌아가 완전히 무관하게 동작하는지(이번 계획은 이 파일들을 전혀 건드리지 않았으므로 당연히 그래야 함) 확인

- [ ] **Step 4: commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/2_VisualNovelStudio/PlayScreen.tsx"
git commit -m "feat: VN 플레이 화면 만화 테마 리스킨"
```

---

## 범위 밖

- `VNDisplay.tsx`(VN 스테이지) 재디자인 — 스펙에서 명시적으로 범위 밖.
- 손그림 wobbly 테두리 효과 — 사용자가 보류, 직선 테두리로 확정.
- 정확한 색상 미세 조정은 브라우저 검증 중 발견되면 각 태스크의 리뷰 루프에서 조정한다.
