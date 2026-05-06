import { useCallback, useEffect, useRef, useState } from "react";
import { deleteBlob, deleteBlobs, loadBlobUrls, saveBlob } from "./imageStore";
import { AudioTrack, AudioTrackType, Background, Character, Cut } from "./types";

const STORAGE_VERSION = 4;

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

type StoredImage = { id: string; label: string };
type StoredCharacter = { id: string; name: string; images: StoredImage[] };
type StoredBackground = { id: string; name: string };
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
    if (parsed.version < 3) return null;
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
      images: c.images.map((img) => ({ id: img.id, label: img.label })),
    })),
    backgrounds: backgrounds.map((bg) => ({ id: bg.id, name: bg.name })),
    audioTracks: audioTracks.map((a) => ({ id: a.id, name: a.name, type: a.type })),
    cuts,
  };
  try {
    localStorage.setItem(key, JSON.stringify(meta));
  } catch {}
}

export function useVNStore(slotId: string) {
  const storageKey = `rough-vn-slot-${slotId}`;
  const initialMeta = useRef(loadMeta(storageKey));

  const [characters, setCharacters] = useState<Character[]>(
    () =>
      initialMeta.current?.characters.map((c) => ({
        ...c,
        images: c.images.map((img) => ({ ...img, imageUrl: "" })),
      })) ?? [],
  );
  const [backgrounds, setBackgrounds] = useState<Background[]>(
    () => initialMeta.current?.backgrounds.map((bg) => ({ ...bg, imageUrl: "" })) ?? [],
  );
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>(
    () => initialMeta.current?.audioTracks.map((a) => ({ ...a, audioUrl: "" })) ?? [],
  );
  const [cuts, setCuts] = useState<Cut[]>(
    () =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initialMeta.current?.cuts.map((c: any) => ({
        ...c,
        textEffect: c.textEffect ?? ("default" as const),
        bgmId: c.bgmId ?? null,
        sfxId: c.sfxId ?? null,
      })) ?? [blankCut()],
  );
  const [currentIndex, setCurrentIndex] = useState(0);

  // Restore blob URLs from IDB on mount
  useEffect(() => {
    const meta = initialMeta.current;
    const imageIds = [
      ...(meta?.characters.flatMap((c) => c.images.map((img) => img.id)) ?? []),
      ...(meta?.backgrounds.map((bg) => bg.id) ?? []),
    ];
    const audioIds = meta?.audioTracks.map((a) => a.id) ?? [];

    const imagePromise =
      imageIds.length > 0
        ? loadBlobUrls(imageIds).then((urlMap) => {
            setCharacters((prev) =>
              prev.map((c) => ({
                ...c,
                images: c.images.map((img) => ({
                  ...img,
                  imageUrl: urlMap.get(img.id) ?? "",
                })),
              })),
            );
            setBackgrounds((prev) =>
              prev.map((bg) => ({ ...bg, imageUrl: urlMap.get(bg.id) ?? "" })),
            );
          })
        : Promise.resolve();

    const audioPromise =
      audioIds.length > 0
        ? loadBlobUrls(audioIds).then((urlMap) => {
            setAudioTracks((prev) =>
              prev.map((a) => ({ ...a, audioUrl: urlMap.get(a.id) ?? "" })),
            );
          })
        : Promise.resolve();

    Promise.all([imagePromise, audioPromise]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    saveMeta(characters, backgrounds, audioTracks, cuts, storageKey);
  }, [characters, backgrounds, audioTracks, cuts, storageKey]);

  const addCharacter = useCallback(
    async (name: string, images: { label: string; file: File }[]) => {
      const newImages = await Promise.all(
        images.map(async ({ label, file }) => {
          const id = uid();
          await saveBlob(id, file);
          return { id, label, imageUrl: URL.createObjectURL(file) };
        }),
      );
      setCharacters((prev) => [...prev, { id: uid(), name, images: newImages }]);
    },
    [],
  );

  const addCharacterImage = useCallback(
    async (charId: string, label: string, file: File) => {
      const id = uid();
      await saveBlob(id, file);
      const imageUrl = URL.createObjectURL(file);
      setCharacters((prev) =>
        prev.map((c) =>
          c.id === charId
            ? { ...c, images: [...c.images, { id, label, imageUrl }] }
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
        const img = c.images.find((i) => i.id === imageId);
        if (img?.imageUrl) URL.revokeObjectURL(img.imageUrl);
        deleteBlob(imageId);
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
    setCharacters((prev) => {
      const char = prev.find((c) => c.id === charId);
      if (char) {
        char.images.forEach((img) => {
          if (img.imageUrl) URL.revokeObjectURL(img.imageUrl);
        });
        deleteBlobs(char.images.map((img) => img.id));
      }
      return prev.filter((c) => c.id !== charId);
    });
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

  const addBackground = useCallback(async (name: string, file: File) => {
    const id = uid();
    await saveBlob(id, file);
    const imageUrl = URL.createObjectURL(file);
    setBackgrounds((prev) => [...prev, { id, name, imageUrl }]);
  }, []);

  const removeBackground = useCallback((bgId: string) => {
    setBackgrounds((prev) => {
      const bg = prev.find((b) => b.id === bgId);
      if (bg?.imageUrl) URL.revokeObjectURL(bg.imageUrl);
      deleteBlob(bgId);
      return prev.filter((b) => b.id !== bgId);
    });
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
