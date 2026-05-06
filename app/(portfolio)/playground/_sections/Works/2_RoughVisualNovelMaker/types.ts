export type CharacterImage = {
  id: string;
  label: string;
  imageUrl: string;
};

export type Character = {
  id: string;
  name: string;
  images: CharacterImage[];
};

export type Background = {
  id: string;
  name: string;
  imageUrl: string;
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
