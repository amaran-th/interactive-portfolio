# 비주얼 노벨 스튜디오 라이트모드 리디자인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 비주얼 노벨 스튜디오(Work #2)를 다크 테마에서 "잉크 매뉴스크립트" 라이트 톤으로 순수 비주얼 리스킨한다. 기능 로직은 전혀 바꾸지 않는다.

**Architecture:** 색상/테두리/모서리 클래스만 일괄 치환하는 8개 태스크. 픽셀아트 메이커·VN 스튜디오 둘 다 쓰게 된 Mona 도트 폰트 로더를 `5_PixelArtMaker/fonts.ts` → `_shared/fonts.ts`로 옮기는 것을 제외하면 모든 태스크가 `2_VisualNovelStudio/` 안의 파일 하나씩만 건드린다.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4. 테스트 스위트 없음(프로젝트 컨벤션) — 각 태스크는 `npm run lint && npx tsc --noEmit -p .` + 브라우저 수동 검증으로 마무리한다.

## Global Constraints

전부 순수 비주얼 리스킨이다 — 어떤 태스크도 상태·이벤트 핸들러·prop 시그니처·비즈니스 로직을 바꾸지 않는다. `className` 문자열과 (VisualNovelStudio.tsx 한정) 폰트 래퍼만 바뀐다.

### 색상 시스템 — 잉크 매뉴스크립트 (`docs/superpowers/specs/2026-07-19-vn-studio-light-mode-design.md`)

| 항목 | 값 |
|---|---|
| 페이지/셸 배경 | `bg-[#f7f6f3]` |
| 카드/패널 배경 | `bg-white` |
| 포인트 컬러(딥 인디고) | `#2f3a8f` |
| 기본 텍스트 | `text-gray-900` |

### 그레이 스케일 치환 표 (다크→라이트, `text-gray-N ↔ text-gray-(1000-N)` 반전)

기존 코드의 모든 `text-gray-N`/`text-white` 클래스는 아래 표대로 **기계적으로** 치환한다. 표에 없는 조합은 없다 — 이 파일들에 쓰인 값은 전부 아래 6가지뿐이다.

| 기존 | 신규 |
|---|---|
| `text-white` | `text-gray-900` |
| `text-gray-300` | `text-gray-700` |
| `text-gray-400` | `text-gray-600` |
| `text-gray-500` | `text-gray-500` (변경 없음) |
| `text-gray-600` | `text-gray-400` |
| `text-gray-700` | `text-gray-400` |

`text-white/N`(투명도 붙은 흰색, 주로 `VNDisplay.tsx`의 스테이지 오버레이 텍스트) 처리는 각 파일 지침에 개별 명시한다(대사박스 예외 구간은 그대로 둠).

### 배경/테두리 치환 표

| 기존 | 신규 | 비고 |
|---|---|---|
| `bg-white/3`, `bg-white/5`, `bg-white/6`, `bg-white/8`(카드·패널 배경) | `bg-white` | 옆에 `border` 클래스가 없으면 `border border-gray-200`을 추가한다 |
| `hover:bg-white/5`, `hover:bg-white/6`, `hover:bg-white/8` | `hover:bg-gray-50` | |
| `border-white/10`, `border-white/15` | `border-gray-200` | |
| `border-white/20` | `border-gray-300` | |
| `hover:border-white/30` | `hover:border-gray-400` | |
| `ring-white/5` | (제거) | 라이트 카드에는 불필요 |
| `border-black/10`(이미 흰 배경 위에 있던 요소 — `EditorScreen.tsx`의 캐릭터 이미지 드롭다운/포지션 토글) | 변경 없음 | 이미 라이트 서피스용으로 설계돼 있었다 |
| `bg-black/20`(패널 배경 용도 — 컷 목록 바, `ResourcePicker.tsx`의 썸네일 배경) | `bg-gray-100` | 대사박스 예외 아님 |
| `bg-black/60`, `bg-gray-900/60`, `bg-black/70`(대사박스·모달 스크림) | **변경 없음** | 아래 "예외" 참고 |

### 강조/활성 상태 — 2단계 인디고 패턴

| 역할 | 기존 패턴(예) | 신규 |
|---|---|---|
| 강한 강조(최상위 CTA, 선택된 탭/컷 번호) | `bg-white ... text-gray-950` | `bg-[#2f3a8f] ... text-white` (hover는 `hover:opacity-90` 추가) |
| 중간 강조(선택된 필터 칩) | `bg-white/20 [font-medium] text-white` | `bg-[#2f3a8f]/10 [font-medium] text-[#2f3a8f]` |
| 비선택 칩(아웃라인) | `border border-white/15 text-gray-400 hover:border-white/30 hover:text-white` | `border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-900` |

이미 의미를 가진 색(발화자 칩의 `bg-blue-500`/`bg-amber-500`, 대사박스)은 이 패턴 대상이 아니다 — 아래 각 태스크에서 "변경 없음"으로 명시한 것만 예외.

### 위험/삭제 색상

| 기존 | 신규 |
|---|---|
| 옅은 텍스트형 삭제 버튼(`text-gray-600 hover:text-red-400` 등) | `text-gray-400 hover:text-red-600` |
| 확정 삭제 버튼(`bg-red-900/60 text-red-300 hover:bg-red-800/60`) | `bg-red-500 text-white hover:bg-red-600` |
| 상시 노출 삭제 버튼(`text-red-800 hover:bg-red-900/30 hover:text-red-400`) | `text-red-300 hover:bg-red-50 hover:text-red-600` |

### 모서리 — 전부 각짐

**모든 `rounded-*` 클래스를 제거한다.** `rounded-full`로 된 알약형 선택 칩·컷 번호 탭·원형 아이콘 배지도 예외 없이 각진 사각으로 바뀐다(사용자 확인 완료 — 픽셀아트 메이커와 달리 이 Work는 칩 기반 UI가 많아 시각적 변화가 크다는 점을 사전에 확인받았다). **유일한 예외는 대사박스 구간**(아래 참고) — `VNDisplay.tsx`의 발화자 이름표·대사 텍스트 박스가 쓰는 `rounded-t-lg`/`rounded-b-none`/`rounded-lg`/`sm:rounded-2xl`/`rounded-tl-none`은 그대로 둔다.

### 대사박스 예외

`VNDisplay.tsx`의 발화자 이름표(`bg-black/60` 계열)와 대사 텍스트 박스(`bg-gray-900/60`/`bg-black/60`, `border-white/*`, `ring-white/5`, 모서리 클래스, 텍스트 이펙트별 색상)는 **아무것도 바꾸지 않는다.** 사용자가 그린 임의 색 배경/캐릭터 위에 겹치는 요소라 가독성을 위해 지금의 반투명 어두운 스타일을 유지하기로 확정했다. 스테이지 바탕(배경 없을 때의 그라디언트, "캐릭터 없음"/"삭제된 리소스" 플레이스홀더)은 이 예외에 포함되지 않는다 — 라이트 톤으로 바뀐다.

### 폰트

`Mona12`/`Mona12-Bold` 도트 폰트(`next/font/local`)를 VN 스튜디오에도 적용한다. 로더 파일을 `5_PixelArtMaker/fonts.ts` → `_shared/fonts.ts`로 옮긴다(Task 1). `_shared/`와 `5_PixelArtMaker/`는 `Works/` 아래 같은 깊이이므로 `next/font/local`의 `src` 상대 경로(`../../../../../../public/fonts/Mona12.ttf`, `../` 6개)는 **바뀌지 않는다.**

---

## File Map

| 파일 | 변화 |
| --- | --- |
| `Works/_shared/fonts.ts` | **신규** — `5_PixelArtMaker/fonts.ts`에서 이동(내용 동일) |
| `Works/5_PixelArtMaker/fonts.ts` | **삭제** |
| `Works/5_PixelArtMaker/PixelArtMaker.tsx` | 수정 — `./fonts` → `../_shared/fonts` import 경로만 변경 |
| `Works/2_VisualNovelStudio/HomeScreen.tsx` | 라이트 톤 리스킨 |
| `Works/2_VisualNovelStudio/VisualNovelStudio.tsx` | 라이트 톤 리스킨 + Mona 폰트 래퍼 |
| `Works/2_VisualNovelStudio/AssetUploader.tsx` | 라이트 톤 리스킨 |
| `Works/2_VisualNovelStudio/ResourcePicker.tsx` | 라이트 톤 리스킨(모달 스크림 제외) |
| `Works/2_VisualNovelStudio/EditorScreen.tsx` | 라이트 톤 리스킨 |
| `Works/2_VisualNovelStudio/VNDisplay.tsx` | 라이트 톤 리스킨(대사박스 예외) |
| `Works/2_VisualNovelStudio/PlayScreen.tsx` | 라이트 톤 리스킨 |

---

## Task 1: Mona 폰트 로더를 `_shared/`로 이동

**Files:**
- Create: `app/(portfolio)/playground/_sections/Works/_shared/fonts.ts`
- Delete: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/fonts.ts`
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/PixelArtMaker.tsx`

**Interfaces:**
- Produces: `monaFont`(named export, `_shared/fonts.ts`에서) — Task 3(`VisualNovelStudio.tsx`)이 이 경로에서 import한다

- [ ] **Step 1: `_shared/fonts.ts` 작성**

```typescript
import localFont from "next/font/local";

export const monaFont = localFont({
  src: [
    {
      path: "../../../../../../public/fonts/Mona12.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../../../../../public/fonts/Mona12-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  display: "swap",
});
```

- [ ] **Step 2: 기존 `5_PixelArtMaker/fonts.ts` 삭제**

```bash
rm "app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/fonts.ts"
```

- [ ] **Step 3: `PixelArtMaker.tsx`의 import 경로 수정**

`PixelArtMaker.tsx`에서 다음 줄을 찾는다:

```typescript
import { monaFont } from "./fonts";
```

아래로 교체한다:

```typescript
import { monaFont } from "../_shared/fonts";
```

(파일의 나머지 부분은 전혀 건드리지 않는다 — 이 한 줄만 바뀐다.)

- [ ] **Step 4: lint + 타입 확인**

Run: `npm run lint && npx tsc --noEmit -p .`
Expected: 오류 없음

- [ ] **Step 5: 픽셀아트 메이커 회귀 확인**

Run: `npm run dev`

1. `http://localhost:3000/nemo-nemo-beam` 접속 — 데스크탑 아이콘 라벨·컨텍스트 메뉴 등에 도트 폰트가 그대로 적용돼 있는지 확인(폰트가 깨지거나 기본 폰트로 폴백되지 않아야 함)
2. 편집기를 열어봐도 정상 동작하는지 확인(폰트 로딩 실패로 인한 콘솔 에러가 없는지)

- [ ] **Step 6: commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/_shared/fonts.ts" "app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/fonts.ts" "app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/PixelArtMaker.tsx"
git commit -m "refactor: Mona 도트 폰트 로더를 공유 위치로 이동"
```

---

## Task 2: `HomeScreen.tsx` 라이트 톤

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
      className="flex items-center gap-4 border-2 border-dashed border-gray-300 bg-white px-5 py-5 text-left transition-all hover:border-gray-400 hover:bg-gray-50"
    >
      <div className="flex size-10 shrink-0 items-center justify-center border border-dashed border-gray-300">
        <Plus className="size-4 text-gray-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">새 작품</p>
        <p className="mt-0.5 text-xs text-gray-400">슬롯 {index + 1}</p>
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
    <div className="relative flex items-center gap-4 border-2 border-gray-200 bg-white px-5 py-5 transition-all hover:border-gray-300 hover:bg-gray-50">
      {/* Slot number badge */}
      <div className="flex size-10 shrink-0 items-center justify-center bg-gray-100 font-mono text-xs text-gray-400">
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
            className="w-full border border-gray-300 bg-gray-50 px-2 py-0.5 text-sm font-semibold text-gray-900 outline-none"
          />
        ) : (
          <button
            onClick={() => {
              setDraft(slot.title);
              setEditing(true);
            }}
            className="truncate text-left text-sm font-semibold text-gray-900 hover:opacity-70"
            title="클릭해서 제목 수정"
          >
            {slot.title}
          </button>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
            {slot.cutCount}컷
          </span>
          <span className="bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
            {slot.characterCount}캐릭터
          </span>
          <span className="text-xs text-gray-400">{relativeTime(slot.updatedAt)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-2">
        {confirmDelete ? (
          <>
            <button
              onClick={() => setConfirmDelete(false)}
              className="border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              onClick={onDelete}
              className="bg-red-500 px-3 py-1.5 text-xs text-white hover:bg-red-600"
            >
              삭제
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setConfirmDelete(true)}
              className="border border-gray-200 px-2.5 py-1.5 text-xs text-gray-400 transition-colors hover:border-red-300 hover:text-red-600"
            >
              삭제
            </button>
            <button
              onClick={onPlay}
              className="border border-gray-200 px-3 py-1.5 text-xs text-gray-700 transition-colors hover:border-gray-400 hover:text-gray-900"
            >
              ▶
            </button>
            <button
              onClick={onSelect}
              className="bg-[#2f3a8f] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-90"
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
    <div className="flex h-full flex-col bg-[#f7f6f3] text-gray-900">
      {/* Header */}
      <div className="shrink-0 px-6 pt-8 pb-6">
        <h1 className="text-xl font-bold tracking-tight">비주얼 노벨 메이커</h1>
        <p className="mt-1 text-xs text-gray-500">작품을 선택하거나 새로 만드세요.</p>
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
git commit -m "feat: VN 스튜디오 홈 화면 라이트 톤 리스킨"
```

---

## Task 3: `VisualNovelStudio.tsx` 라이트 톤 + Mona 폰트 적용

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/2_VisualNovelStudio/VisualNovelStudio.tsx`

**Interfaces:**
- Consumes: `monaFont`(Task 1의 `_shared/fonts.ts`)
- 변경 없음(그 외 props/로직)

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
      <div className="flex h-full flex-col bg-[#f7f6f3] text-gray-900">
        <div className="shrink-0 flex items-center gap-3 border-b border-gray-200 px-4 py-3">
          <button
            onClick={handleBack}
            className="flex items-center justify-center p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            <House className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-sm font-semibold text-gray-900">리소스 편집</h1>
            <p className="text-xs text-gray-500">캐릭터와 배경 이미지를 등록하세요.</p>
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

        <div className="shrink-0 border-t border-gray-200 p-4 flex gap-2">
          <button
            onClick={() => setPhase("editor")}
            className="flex-1 bg-[#2f3a8f] py-3 text-sm font-semibold text-white transition-colors hover:opacity-90"
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

(변경 요지: 최상위 반환값을 `${monaFont.className} h-full`을 가진 `<div>`로 감싸고 그 안에서 `!activeSlot` 분기를 렌더링하도록 바꿨다 — 기존에는 `if (!activeSlot) return <HomeScreen .../>`처럼 조건부로 완전히 다른 트리를 바로 반환해 폰트 클래스를 적용할 공통 루트가 없었다. `h-full`을 반드시 같이 줘야 한다 — 안 그러면 `HomeScreen`/`VNMakerWithSlot` 내부의 `h-full` 체인이 끊긴다.)

- [ ] **Step 2: lint + 타입 확인**

Run: `npm run lint && npx tsc --noEmit -p .`
Expected: 오류 없음

- [ ] **Step 3: commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/2_VisualNovelStudio/VisualNovelStudio.tsx"
git commit -m "feat: VN 스튜디오 셸 라이트 톤 + Mona 폰트 적용"
```

---

## Task 4: `AssetUploader.tsx` 라이트 톤

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
        className={`border border-gray-300 bg-gray-50 px-1.5 py-0.5 text-gray-900 outline-none ${className ?? ""}`}
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
    <div className="flex flex-col gap-2 border border-gray-200 bg-white p-3">
      <div className="flex items-center justify-between">
        <InlineInput
          value={char.name}
          onCommit={onRename}
          className="text-sm font-medium text-gray-900"
        />
        <button
          onClick={onRemove}
          className="text-xs text-gray-400 transition-colors hover:text-red-600"
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
            <div className="relative h-16 w-12 shrink-0 overflow-hidden border border-gray-200">
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
                  className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center bg-black/70 text-gray-400 hover:text-red-400"
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
        <button
          onClick={() => setPickerOpen(true)}
          className="flex h-16 w-12 shrink-0 flex-col items-center justify-center gap-1 border border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-600"
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
    <div className="flex flex-col gap-3 border border-gray-200 bg-white p-4">
      <input
        type="text"
        placeholder="캐릭터 이름"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-400"
      />
      <div className="flex flex-wrap gap-2 p-1.5">
        {pending.map((p) => (
          <div key={p.id} className="flex flex-col items-center gap-1">
            <div className="relative">
              <img
                src={p.previewUrl}
                alt=""
                className="h-32 w-14 bg-gray-100 object-contain"
                style={{ imageRendering: "pixelated" }}
              />
              <button
                onClick={() => removeImage(p.id)}
                className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center bg-black/70 text-xs text-gray-400 hover:text-red-400"
              >
                ×
              </button>
            </div>
            <input
              type="text"
              placeholder="유형"
              value={p.label}
              onChange={(e) => updateLabel(p.id, e.target.value)}
              className="w-12 border border-gray-200 bg-white px-1 py-1 text-center text-xs text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-400"
            />
          </div>
        ))}
        <button
          onClick={() => setPickerOpen(true)}
          className="flex h-32 w-14 shrink-0 flex-col items-center justify-center gap-1 border border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-600"
        >
          <span className="text-xl leading-none">+</span>
          <span className="text-[10px]">
            {pending.length === 0 ? "이미지" : "추가"}
          </span>
        </button>
      </div>
      <p className="text-xs text-gray-400">권장 비율 2:5</p>

      <button
        onClick={handleAdd}
        disabled={!name.trim() || pending.length === 0}
        className="bg-[#2f3a8f]/10 py-2 text-sm font-medium text-[#2f3a8f] hover:bg-[#2f3a8f]/15 disabled:cursor-not-allowed disabled:opacity-40"
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
    <div className="flex flex-col gap-3 border border-gray-200 bg-white p-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
        <input
          type="text"
          placeholder="배경 이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-400 sm:col-start-1 sm:row-start-1"
        />
        <button
          onClick={() => setPickerOpen(true)}
          className="flex aspect-video cursor-pointer items-center justify-center overflow-hidden border border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 sm:col-span-2 sm:col-start-1 sm:row-start-2"
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
              <span className="text-xs text-gray-500">클릭해서 리소스 선택</span>
            </div>
          )}
        </button>
      </div>
      <p className="text-xs text-gray-400">권장 이미지 비율: 16:9</p>
      <button
        onClick={handleAdd}
        disabled={!name.trim() || !picked}
        className="order-last bg-[#2f3a8f]/10 py-2 px-4 text-sm font-medium text-[#2f3a8f] hover:bg-[#2f3a8f]/15 disabled:cursor-not-allowed disabled:opacity-40 sm:order-none sm:col-start-2 sm:row-start-1 sm:self-stretch"
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
    <div className="flex items-center gap-3 border border-gray-200 bg-white px-3 py-2.5">
      <button
        onClick={toggle}
        className="flex h-7 w-7 shrink-0 items-center justify-center bg-gray-100 text-gray-700 hover:bg-gray-200"
      >
        {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
      </button>
      <span className="min-w-0 flex-1 truncate text-xs text-gray-700">
        {track.name}
      </span>
      <button
        onClick={onRemove}
        className="shrink-0 text-xs text-gray-400 hover:text-red-600"
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
          className="border border-gray-200 px-3 py-1 text-xs text-gray-500 hover:border-gray-400 hover:text-gray-900"
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
        <p className="text-xs italic text-gray-400">없음</p>
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
      <div className="flex border-b border-gray-200">
        {(["characters", "backgrounds", "music"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-xs font-medium transition-colors ${
              tab === t
                ? "border-b-2 border-[#2f3a8f] text-[#2f3a8f]"
                : "text-gray-500 hover:text-gray-700"
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
                  className="relative flex flex-col items-center gap-1.5 border border-gray-200 bg-white p-3"
                >
                  {bg.imageUrl && (
                    <img
                      src={bg.imageUrl}
                      alt={bg.name}
                      className="h-16 w-full object-contain"
                      style={{ imageRendering: "pixelated" }}
                    />
                  )}
                  <span className="text-xs text-gray-700">{bg.name}</span>
                  <button
                    onClick={() => onRemoveBackground(bg.id)}
                    className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center bg-gray-100 text-xs text-gray-500 hover:bg-red-50 hover:text-red-600"
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

- [ ] **Step 2: lint + 타입 확인**

Run: `npm run lint && npx tsc --noEmit -p .`
Expected: 오류 없음

- [ ] **Step 3: commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/2_VisualNovelStudio/AssetUploader.tsx"
git commit -m "feat: VN 스튜디오 리소스 편집 화면 라이트 톤 리스킨"
```

---

## Task 5: `ResourcePicker.tsx` 라이트 톤

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
      className="flex flex-col items-center gap-1.5 border border-gray-200 bg-white p-2 text-left transition-colors hover:border-gray-400 hover:bg-gray-50"
    >
      <div className="flex h-16 w-full items-center justify-center overflow-hidden bg-gray-100">
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
      <span className="w-full truncate text-center text-xs text-gray-700">
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
        className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden border border-gray-200 bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex border-b border-gray-200">
          {(["builtin", "library"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-xs font-medium transition-colors ${
                tab === t
                  ? "border-b-2 border-[#2f3a8f] text-[#2f3a8f]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "builtin" ? "기본 제공" : "네모네모빔 리소스"}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-auto p-3">
          {items.length === 0 ? (
            <p className="py-8 text-center text-xs italic text-gray-400">
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
        <div className="border-t border-gray-200 p-2">
          <button
            onClick={onClose}
            className="w-full px-3 py-2 text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-900"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
```

(모달 배경 스크림 `bg-black/70`은 라이트 패널이 얹히는 반투명 어둡게-깔기 용도라 변경하지 않는다 — 패널 자체(`bg-white`, 탭, 썸네일, 버튼)만 라이트로 바뀐다.)

- [ ] **Step 2: lint + 타입 확인**

Run: `npm run lint && npx tsc --noEmit -p .`
Expected: 오류 없음

- [ ] **Step 3: commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/2_VisualNovelStudio/ResourcePicker.tsx"
git commit -m "feat: 리소스 선택 모달 라이트 톤 리스킨"
```

---

## Task 6: `EditorScreen.tsx` 라이트 톤

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/2_VisualNovelStudio/EditorScreen.tsx`

**Interfaces:**
- 변경 없음(props/로직 그대로, 스타일만 교체)

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
    <div className="flex h-full flex-col bg-[#f7f6f3] text-gray-900">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-gray-200 px-4 py-3">
        <button
          onClick={onGoHome}
          className="flex items-center justify-center p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900"
        >
          <House className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-gray-900">편집</span>
        <span className="text-xs text-gray-400">{cuts.length}컷</span>
        <div className="ml-auto flex gap-1.5">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            <Images className="h-3.5 w-3.5" />
            리소스 편집
          </button>
          <button
            onClick={onPlay}
            className="flex items-center gap-1.5 bg-[#2f3a8f] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
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
      <div className="flex shrink-0 items-center gap-1 border-b border-gray-200 bg-gray-100 px-3 py-2">
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
              className={`flex h-7 min-w-7 shrink-0 cursor-grab items-center justify-center px-2 font-mono text-xs transition-all active:cursor-grabbing ${
                i === currentIndex
                  ? "bg-[#2f3a8f] font-bold text-white"
                  : dragOver === i
                    ? "scale-110 bg-[#2f3a8f]/10 text-[#2f3a8f]"
                    : "text-gray-500 hover:bg-gray-200 hover:text-gray-900"
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => onAddCutAfter(currentIndex)}
            className="flex h-7 w-7 shrink-0 items-center justify-center text-gray-400 hover:bg-gray-200 hover:text-gray-900"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex shrink-0 items-center gap-1 border-l border-gray-300 pl-2">
          <button
            onClick={() => onDuplicateCut(currentIndex)}
            className="flex h-7 w-7 items-center justify-center text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-900"
            title="컷 복제"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          {cuts.length > 1 && (
            <button
              onClick={() => onDeleteCut(currentIndex)}
              className="flex h-7 w-7 items-center justify-center text-red-300 transition-colors hover:bg-red-50 hover:text-red-600"
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
              className={`px-3 py-1.5 text-xs transition-colors ${
                cut.backgroundId === null
                  ? "bg-[#2f3a8f]/10 font-medium text-[#2f3a8f]"
                  : "border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-900"
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
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${
                  cut.backgroundId === bg.id
                    ? "bg-[#2f3a8f]/10 font-medium text-[#2f3a8f]"
                    : "border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-900"
                }`}
              >
                {bg.imageUrl && (
                  <img
                    src={bg.imageUrl}
                    alt={bg.name}
                    className="h-4 w-4 object-cover"
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
            <p className="text-xs italic text-gray-400">등록된 캐릭터 없음</p>
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
                    className={`flex items-center overflow-hidden border transition-colors ${
                      active ? "border-transparent" : "border-gray-200"
                    }`}
                  >
                    <button
                      onClick={() => toggleCharacter(char.id)}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                        active ? "bg-[#2f3a8f] text-white" : "text-gray-500 hover:text-gray-900"
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
                          <option key={img.id} value={img.id} className="bg-white text-gray-900">
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
                className={`px-3 py-1.5 text-xs transition-colors ${
                  cut.speakerIds.includes(char.id)
                    ? "bg-blue-500 font-medium text-white"
                    : "border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-900"
                }`}
              >
                {char.name}
              </button>
            ))}
            <button
              onClick={toggleNarrator}
              className={`px-3 py-1.5 text-xs transition-colors ${
                cut.speakerIds.includes("narrator")
                  ? "bg-amber-500 font-medium text-white"
                  : "border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-900"
              }`}
            >
              나레이션
            </button>
            <button
              onClick={() => onUpdateCut(currentIndex, { speakerIds: [] })}
              className={`px-3 py-1.5 text-xs transition-colors ${
                cut.speakerIds.length === 0
                  ? "bg-[#2f3a8f]/10 font-medium text-[#2f3a8f]"
                  : "border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-900"
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
                    className={`px-2.5 py-1 text-xs transition-colors ${
                      (cut.textEffect ?? "default") === effect
                        ? "bg-[#2f3a8f]/10 text-[#2f3a8f]"
                        : "border border-gray-200 text-gray-500 hover:text-gray-900"
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
            className="w-full resize-none border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-400"
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
                  <p className="text-xs text-gray-400">배경음악</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: null, label: "계속" },
                      { id: BGM_STOP, label: "정지" },
                      ...bgmTracks.map((t) => ({ id: t.id, label: t.name })),
                    ].map(({ id, label }) => (
                      <button
                        key={id ?? "_continue"}
                        onClick={() => onUpdateCut(currentIndex, { bgmId: id })}
                        className={`px-3 py-1.5 text-xs transition-colors ${
                          cut.bgmId === id
                            ? "bg-[#2f3a8f]/10 font-medium text-[#2f3a8f]"
                            : "border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-900"
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
                  <p className="text-xs text-gray-400">효과음</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: null, label: "없음" },
                      ...sfxTracks.map((t) => ({ id: t.id, label: t.name })),
                    ].map(({ id, label }) => (
                      <button
                        key={id ?? "_none"}
                        onClick={() => onUpdateCut(currentIndex, { sfxId: id })}
                        className={`px-3 py-1.5 text-xs transition-colors ${
                          cut.sfxId === id
                            ? "bg-[#2f3a8f]/10 font-medium text-[#2f3a8f]"
                            : "border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-900"
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
            className="flex h-9 w-9 items-center justify-center border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900 disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="flex-1 text-center font-mono text-xs text-gray-500">
            {currentIndex + 1} / {cuts.length}
          </span>
          {currentIndex < cuts.length - 1 ? (
            <button
              onClick={() => onSelectCut(currentIndex + 1)}
              className="flex h-9 w-9 items-center justify-center border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => onAddCutAfter(currentIndex)}
              className="flex h-9 w-9 items-center justify-center border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900"
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

(캐릭터 이미지 드롭다운·포지션 토글의 `border-black/10 bg-white ...`는 이미 원래부터 흰 배경 서피스로 설계돼 있어 변경하지 않는다 — 대상 표에 명시된 예외.)

- [ ] **Step 2: lint + 타입 확인**

Run: `npm run lint && npx tsc --noEmit -p .`
Expected: 오류 없음

- [ ] **Step 3: commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/2_VisualNovelStudio/EditorScreen.tsx"
git commit -m "feat: 컷 편집기 라이트 톤 리스킨"
```

---

## Task 7: `VNDisplay.tsx` 라이트 톤 (대사박스 예외)

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/2_VisualNovelStudio/VNDisplay.tsx`

**Interfaces:**
- 변경 없음(props/로직 그대로, 스타일만 교체)

- [ ] **Step 1: `VNDisplay.tsx` 전체 교체**

```tsx
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
    <div className="relative flex w-full aspect-video flex-col overflow-hidden bg-white">
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
          <div className="absolute inset-0 flex items-center justify-center border border-dashed border-gray-300 bg-gray-100">
            <span className="text-xs text-gray-400">삭제된 리소스</span>
          </div>
        )
      ) : (
        <div className="absolute inset-0 bg-linear-to-b from-gray-100 to-gray-200" />
      )}

      {/* Characters */}
      <div className="relative flex flex-1 items-end px-2 pb-2">
        {visibleChars.length === 0 && !bg && (
          <span className="mb-8 w-full text-center text-xs text-gray-400">
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
                    className="flex items-center justify-center border border-dashed border-gray-300 text-center text-[9px] text-gray-400"
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

      {/* Text box — absolute, hidden when no speaker. 대사박스는 예외:
          사용자가 그린 임의 색 배경/캐릭터 위에 겹치므로 라이트 톤을 따르지
          않고 지금의 반투명 어두운 스타일을 그대로 유지한다. */}
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
```

(주석에 명시했듯, "Text box" 블록 전체 — 발화자 이름표 span, 대사 박스 div, 텍스트 이펙트별 색상, `▼` 인디케이터 — 는 기존 코드와 **한 글자도 다르지 않다.** 그 위 배경·캐릭터·플레이스홀더 부분만 라이트 톤으로 바뀌었다.)

- [ ] **Step 2: lint + 타입 확인**

Run: `npm run lint && npx tsc --noEmit -p .`
Expected: 오류 없음

- [ ] **Step 3: commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/2_VisualNovelStudio/VNDisplay.tsx"
git commit -m "feat: VN 스테이지 라이트 톤 리스킨(대사박스는 예외)"
```

---

## Task 8: `PlayScreen.tsx` 라이트 톤 + 전체 브라우저 검증

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/2_VisualNovelStudio/PlayScreen.tsx`

**Interfaces:**
- 변경 없음(props/로직 그대로, 스타일만 교체)

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
    <div className="flex h-full w-full flex-col bg-[#f7f6f3]">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-gray-200 px-4 py-3">
        <button
          onClick={onGoHome}
          className="flex items-center justify-center p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900"
        >
          <House className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-sm font-semibold text-gray-900">플레이</h1>
          <p className="text-xs text-gray-500">클릭 또는 스페이스로 진행</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="font-mono text-xs text-gray-300">
            {currentIndex + 1} / {cuts.length}
          </span>
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 border border-gray-200 px-3 py-2 text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-900"
          >
            <Pencil className="h-3 w-3" />
            편집
          </button>
        </div>
      </div>

      {/* Cut list */}
      <div className="flex shrink-0 items-center gap-1 border-b border-gray-200 bg-gray-100 px-3 py-2">
        <div className="flex flex-1 items-center gap-1 overflow-x-auto">
          {cuts.map((_, i) => (
            <button
              key={i}
              onClick={() => onSelectCut(i)}
              className={`flex h-7 min-w-7 shrink-0 items-center justify-center px-2 font-mono text-xs transition-all ${
                i === currentIndex
                  ? "bg-[#2f3a8f] font-bold text-white"
                  : "text-gray-500 hover:bg-gray-200 hover:text-gray-900"
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

1. `http://localhost:3000/visual-novel-studio` 접속 — 홈 화면(슬롯 목록)이 종이 그레이 배경 + 흰 카드로 보이는지, Mona 도트 폰트가 적용됐는지 확인
2. 새 작품 생성 → 리소스 편집 화면(`AssetUploader`) 라이트 톤 확인 — 캐릭터/배경/사운드 탭 전환, 리소스 선택 모달(`ResourcePicker`) 열기(기본 제공/네모네모빔 탭, 흰 패널 위에 검은 스크림) 확인
3. 캐릭터·배경 등록 후 "편집 계속하기" → 컷 편집기(`EditorScreen`) 라이트 톤 확인 — 배경/캐릭터/발화자 칩, 컷 번호 탭, 대사 입력창 전부 각진 사각(둥근 모서리 없음)인지 확인
4. 컷 편집기 상단 미리보기(`VNDisplay`, compact)에서 배경·캐릭터는 밝게, **대사박스(발화자 이름표 + 텍스트 박스)는 여전히 반투명 어두운 스타일**인지 확인 — 이 부분만 다크로 남아있어야 정상
5. "플레이" 진입 → 전체 화면(`PlayScreen`)에서도 헤더·컷 목록은 라이트, 스테이지는 라이트, 대사박스만 다크인지 재확인
6. 브라우저 창을 좁혀 모바일 폭에서도 레이아웃이 깨지지 않는지 간단히 확인
7. `/nemo-nemo-beam`(픽셀아트 메이커)로 돌아가 Task 1에서 옮긴 폰트가 여전히 정상 로드되는지 최종 재확인(다른 태스크들이 그 사이 폰트 경로를 건드리지 않았는지)

- [ ] **Step 4: commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/2_VisualNovelStudio/PlayScreen.tsx"
git commit -m "feat: VN 플레이 화면 라이트 톤 리스킨"
```

---

## 범위 밖

- 스펙 문서(`2026-07-19-vn-studio-light-mode-design.md`)에 이미 명시된 대로, 이 리디자인은 VN 스튜디오 하나에 국한된다.
- 정확한 색상 미세 조정(예: 특정 회색 톤이 실제로 보면 너무 연하거나 진할 경우)은 브라우저 검증 중 발견되면 각 태스크의 리뷰 루프에서 조정한다.
