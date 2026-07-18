import { useCallback, useEffect, useState } from "react";
import { resolvePixelArt } from "../_shared/assetLibrary";
import { pixelArtToDataUrl } from "../_shared/renderPixelArt";
import { deleteBlob, loadBlobUrls, saveBlob } from "./imageStore";
import { AudioTrack, AudioTrackType, Background, Character, Cut } from "./types";

// 5: 캐릭터/배경 이미지가 업로드 파일 대신 pixelArtId 참조로 바뀌면서
// 구버전(4 이하) 슬롯의 이미지 참조와 호환되지 않아 폐기한다.
const STORAGE_VERSION = 5;

const uid = () => Math.random().toString(36).slice(2, 9);
const blankCut = (): Cut => ({
  id: uid(),
  backgroundId: null,
  visibleCharacterIds: [],
  characterPositions: {},
  characterImageIds: {},
  speakerIds: [],
  textEffect: "default",
  text: "",
  bgmId: null,
  sfxId: null,
});

function resolveImageUrl(pixelArtId: string): string {
  const art = resolvePixelArt(pixelArtId);
  return art ? pixelArtToDataUrl(art) : "";
}

type StoredImage = { id: string; label: string; pixelArtId: string };
type StoredCharacter = { id: string; name: string; images: StoredImage[] };
type StoredBackground = { id: string; name: string; pixelArtId: string };
type StoredAudioTrack = { id: string; name: string; type: AudioTrackType };
type StoredState = {
  version: number;
  characters: StoredCharacter[];
  backgrounds: StoredBackground[];
  audioTracks: StoredAudioTrack[];
  cuts: Cut[];
};

function loadMeta(key: string): StoredState | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredState> & { version: number };
    if (parsed.version < STORAGE_VERSION) return null;
    return {
      version: STORAGE_VERSION,
      characters: parsed.characters ?? [],
      backgrounds: parsed.backgrounds ?? [],
      audioTracks: parsed.audioTracks ?? [],
      cuts: parsed.cuts ?? [],
    };
  } catch {
    return null;
  }
}

function saveMeta(
  characters: Character[],
  backgrounds: Background[],
  audioTracks: AudioTrack[],
  cuts: Cut[],
  key: string,
) {
  const meta: StoredState = {
    version: STORAGE_VERSION,
    characters: characters.map((c) => ({
      id: c.id,
      name: c.name,
      images: c.images.map((img) => ({
        id: img.id,
        label: img.label,
        pixelArtId: img.pixelArtId,
      })),
    })),
    backgrounds: backgrounds.map((bg) => ({
      id: bg.id,
      name: bg.name,
      pixelArtId: bg.pixelArtId,
    })),
    audioTracks: audioTracks.map((a) => ({ id: a.id, name: a.name, type: a.type })),
    cuts,
  };
  try {
    localStorage.setItem(key, JSON.stringify(meta));
  } catch {}
}

export function useVNStore(slotId: string) {
  const storageKey = `vn-studio-slot-${slotId}`;
  const [initialMeta] = useState(() => loadMeta(storageKey));

  const [characters, setCharacters] = useState<Character[]>(
    () =>
      initialMeta?.characters.map((c) => ({
        ...c,
        images: c.images.map((img) => ({
          ...img,
          imageUrl: resolveImageUrl(img.pixelArtId),
        })),
      })) ?? [],
  );
  const [backgrounds, setBackgrounds] = useState<Background[]>(
    () =>
      initialMeta?.backgrounds.map((bg) => ({
        ...bg,
        imageUrl: resolveImageUrl(bg.pixelArtId),
      })) ?? [],
  );
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>(
    () => initialMeta?.audioTracks.map((a) => ({ ...a, audioUrl: "" })) ?? [],
  );
  const [cuts, setCuts] = useState<Cut[]>(
    () =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initialMeta?.cuts.map((c: any) => ({
        ...c,
        textEffect: c.textEffect ?? ("default" as const),
        bgmId: c.bgmId ?? null,
        sfxId: c.sfxId ?? null,
      })) ?? [blankCut()],
  );
  const [currentIndex, setCurrentIndex] = useState(0);

  // 오디오만 IndexedDB에서 blob URL을 비동기로 복원한다 — 이미지는 이제
  // pixelArtId를 동기적으로 렌더링하므로 위 useState 초기화에서 이미 끝났다.
  useEffect(() => {
    const audioIds = initialMeta?.audioTracks.map((a) => a.id) ?? [];
    if (audioIds.length === 0) return;
    loadBlobUrls(audioIds).then((urlMap) => {
      setAudioTracks((prev) =>
        prev.map((a) => ({ ...a, audioUrl: urlMap.get(a.id) ?? "" })),
      );
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    saveMeta(characters, backgrounds, audioTracks, cuts, storageKey);
  }, [characters, backgrounds, audioTracks, cuts, storageKey]);

  const addCharacter = useCallback(
    (name: string, images: { label: string; pixelArtId: string }[]) => {
      const newImages = images.map(({ label, pixelArtId }) => ({
        id: uid(),
        label,
        pixelArtId,
        imageUrl: resolveImageUrl(pixelArtId),
      }));
      setCharacters((prev) => [...prev, { id: uid(), name, images: newImages }]);
    },
    [],
  );

  const addCharacterImage = useCallback(
    (charId: string, label: string, pixelArtId: string) => {
      const id = uid();
      const imageUrl = resolveImageUrl(pixelArtId);
      setCharacters((prev) =>
        prev.map((c) =>
          c.id === charId
            ? { ...c, images: [...c.images, { id, label, pixelArtId, imageUrl }] }
            : c,
        ),
      );
    },
    [],
  );

  const removeCharacterImage = useCallback((charId: string, imageId: string) => {
    setCharacters((prev) =>
      prev.map((c) => {
        if (c.id !== charId || c.images.length <= 1) return c;
        return { ...c, images: c.images.filter((i) => i.id !== imageId) };
      }),
    );
    setCuts((prev) =>
      prev.map((cut) => {
        if (cut.characterImageIds[charId] !== imageId) return cut;
        const characterImageIds = { ...cut.characterImageIds };
        delete characterImageIds[charId];
        return { ...cut, characterImageIds };
      }),
    );
  }, []);

  const renameCharacter = useCallback((charId: string, name: string) => {
    setCharacters((prev) =>
      prev.map((c) => (c.id === charId ? { ...c, name } : c)),
    );
  }, []);

  const relabelCharacterImage = useCallback(
    (charId: string, imageId: string, label: string) => {
      setCharacters((prev) =>
        prev.map((c) =>
          c.id === charId
            ? {
                ...c,
                images: c.images.map((img) =>
                  img.id === imageId ? { ...img, label } : img,
                ),
              }
            : c,
        ),
      );
    },
    [],
  );

  const removeCharacter = useCallback((charId: string) => {
    setCharacters((prev) => prev.filter((c) => c.id !== charId));
    setCuts((prev) =>
      prev.map((cut) => {
        const characterPositions = { ...cut.characterPositions };
        const characterImageIds = { ...cut.characterImageIds };
        delete characterPositions[charId];
        delete characterImageIds[charId];
        return {
          ...cut,
          visibleCharacterIds: cut.visibleCharacterIds.filter((id) => id !== charId),
          speakerIds: cut.speakerIds.filter((id) => id !== charId),
          characterPositions,
          characterImageIds,
        };
      }),
    );
  }, []);

  const addBackground = useCallback((name: string, pixelArtId: string) => {
    const id = uid();
    const imageUrl = resolveImageUrl(pixelArtId);
    setBackgrounds((prev) => [...prev, { id, name, pixelArtId, imageUrl }]);
  }, []);

  const removeBackground = useCallback((bgId: string) => {
    setBackgrounds((prev) => prev.filter((b) => b.id !== bgId));
    setCuts((prev) =>
      prev.map((cut) => ({
        ...cut,
        backgroundId: cut.backgroundId === bgId ? null : cut.backgroundId,
      })),
    );
  }, []);

  const addAudioTrack = useCallback(
    async (name: string, type: AudioTrackType, file: File) => {
      const id = uid();
      await saveBlob(id, file);
      const audioUrl = URL.createObjectURL(file);
      setAudioTracks((prev) => [...prev, { id, name, type, audioUrl }]);
    },
    [],
  );

  const removeAudioTrack = useCallback((trackId: string) => {
    setAudioTracks((prev) => {
      const track = prev.find((a) => a.id === trackId);
      if (track?.audioUrl) URL.revokeObjectURL(track.audioUrl);
      deleteBlob(trackId);
      return prev.filter((a) => a.id !== trackId);
    });
  }, []);

  const updateCut = useCallback((index: number, patch: Partial<Cut>) => {
    setCuts((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }, []);

  const addCutAfter = useCallback(
    (index: number) => {
      const source = cuts[index];
      const next: Cut = {
        id: uid(),
        backgroundId: source.backgroundId,
        visibleCharacterIds: [...source.visibleCharacterIds],
        characterPositions: { ...source.characterPositions },
        characterImageIds: { ...source.characterImageIds },
        speakerIds: [...source.speakerIds],
        textEffect: source.textEffect,
        text: "",
        bgmId: null,
        sfxId: null,
      };
      setCuts((prev) => {
        const arr = [...prev];
        arr.splice(index + 1, 0, next);
        return arr;
      });
      setCurrentIndex(index + 1);
    },
    [cuts],
  );

  const duplicateCut = useCallback(
    (index: number) => {
      const copy: Cut = { ...cuts[index], id: uid() };
      setCuts((prev) => {
        const arr = [...prev];
        arr.splice(index + 1, 0, copy);
        return arr;
      });
      setCurrentIndex(index + 1);
    },
    [cuts],
  );

  const reorderCuts = useCallback((from: number, to: number) => {
    if (from === to) return;
    setCuts((prev) => {
      const arr = [...prev];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return arr;
    });
    setCurrentIndex(to);
  }, []);

  const deleteCut = useCallback(
    (index: number) => {
      if (cuts.length <= 1) return;
      setCuts((prev) => prev.filter((_, i) => i !== index));
      setCurrentIndex((i) => Math.min(i, cuts.length - 2));
    },
    [cuts.length],
  );

  return {
    characters,
    backgrounds,
    audioTracks,
    cuts,
    currentIndex,
    setCurrentIndex,
    addCharacter,
    addCharacterImage,
    removeCharacterImage,
    renameCharacter,
    relabelCharacterImage,
    removeCharacter,
    addBackground,
    removeBackground,
    addAudioTrack,
    removeAudioTrack,
    updateCut,
    addCutAfter,
    duplicateCut,
    reorderCuts,
    deleteCut,
  };
}
