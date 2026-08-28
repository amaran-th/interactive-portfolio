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
            <p className="text-xs text-black/85">캐릭터와 배경 이미지를 등록하세요.</p>
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
