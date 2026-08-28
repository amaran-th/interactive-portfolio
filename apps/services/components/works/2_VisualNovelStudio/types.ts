export type CharacterImage = {
  id: string;
  label: string;
  pixelArtId: string;
  imageUrl: string; // 저장되지 않는 런타임 값 — pixelArtId를 렌더링한 결과
};

export type Character = {
  id: string;
  name: string;
  images: CharacterImage[];
};

export type Background = {
  id: string;
  name: string;
  pixelArtId: string;
  imageUrl: string; // 저장되지 않는 런타임 값 — pixelArtId를 렌더링한 결과
};

export type AudioTrackType = "bgm" | "sfx";

export type AudioTrack = {
  id: string;
  name: string;
  type: AudioTrackType;
  audioUrl: string;
};

export type CharacterPosition = "left" | "right";

export type TextEffect = "default" | "whisper" | "shout";

export const BGM_STOP = "__stop__";

export type Cut = {
  id: string;
  backgroundId: string | null;
  visibleCharacterIds: string[];
  characterPositions: Record<string, CharacterPosition>;
  characterImageIds: Record<string, string>; // charId → imageId
  speakerIds: string[]; // character IDs and/or "narrator"; empty = no speaker
  textEffect: TextEffect;
  text: string;
  bgmId: string | null; // null = no change, BGM_STOP = stop, trackId = switch BGM
  sfxId: string | null; // null = none, trackId = play once on cut load
};
