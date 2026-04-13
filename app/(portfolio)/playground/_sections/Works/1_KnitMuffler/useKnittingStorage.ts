import { EASY_DRAFTS, NORMAL_DRAFTS } from "./data";
import { ChallengeLevel, Stitch } from "./type";
import { calcMedal } from "./utils";

export type ChallengeStat = {
  elapsed: number;
  slipCount: number;
  colorAccuracy: number;
  spm: number;
  savedAt: number;
};

export type FreeSave = {
  rows: Stitch[][];
  elapsed: number;
  savedAt: number;
};

export type ChallengeProgress = {
  clear: number;
  perfect: number;
  total: number;
};

function challengeKey(level: string, draftKey: string) {
  return `knitMuffler_challenge_${level}_${draftKey}`;
}

const FREE_KEY = "knitMuffler_free";

export function getChallengeStat(
  level: ChallengeLevel,
  draftKey: string,
): ChallengeStat | null {
  try {
    const raw = localStorage.getItem(challengeKey(level, draftKey));
    return raw ? (JSON.parse(raw) as ChallengeStat) : null;
  } catch {
    return null;
  }
}

// TODO 키 별로 따로따로 저장하지 않고 리스트 혹은 객체로 한 번에 저장하게끔 수정하기
export function getChallengeProgress(
  level: ChallengeLevel,
): ChallengeProgress | null {
  try {
    return Object.keys(level === "easy" ? EASY_DRAFTS : NORMAL_DRAFTS).reduce(
      (acc, curr) => {
        const raw = localStorage.getItem(challengeKey(level, curr));
        const currentHistory = raw ? (JSON.parse(raw) as ChallengeStat) : null;
        const currentMedal = currentHistory
          ? calcMedal(
              level,
              currentHistory.colorAccuracy,
              currentHistory.slipCount,
            )
          : null;
        return {
          clear: acc.clear + (currentHistory ? 1 : 0),
          perfect: acc.perfect + (currentMedal === "gold" ? 1 : 0),
          total: acc.total + 1,
        };
      },
      { clear: 0, perfect: 0, total: 0 },
    );
  } catch {
    return null;
  }
}

export function saveChallengeStat(
  level: string,
  draftKey: string,
  stat: Omit<ChallengeStat, "savedAt">,
): void {
  try {
    localStorage.setItem(
      challengeKey(level, draftKey),
      JSON.stringify({ ...stat, savedAt: Date.now() }),
    );
  } catch {}
}

export function getFreeSave(): FreeSave | null {
  try {
    const raw = localStorage.getItem(FREE_KEY);
    return raw ? (JSON.parse(raw) as FreeSave) : null;
  } catch {
    return null;
  }
}

export function saveFreeMuffler(rows: Stitch[][], elapsed: number): void {
  try {
    localStorage.setItem(
      FREE_KEY,
      JSON.stringify({ rows, elapsed, savedAt: Date.now() }),
    );
  } catch {}
}

export function clearFreeSave(): void {
  try {
    localStorage.removeItem(FREE_KEY);
  } catch {}
}

export function clearAllStats(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("knitMuffler_")) keysToRemove.push(key);
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch {}
}
