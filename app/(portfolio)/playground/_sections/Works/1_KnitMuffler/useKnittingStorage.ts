import { EASY_DRAFTS, NORMAL_DRAFTS } from "./data";
import {
  ChallengeLevel,
  ChallengeProgress,
  ChallengeStat,
  FreeSave,
  KnitMufflerHistory,
  Stitch,
  Width,
} from "./type";
import { calcMedal } from "./utils";

const STORAGE_KEY = "knit-muffler-history";


function getHistory(): KnitMufflerHistory {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { easy: [], normal: [], hard: [], free: [] };
    const parsed = JSON.parse(raw) as Partial<KnitMufflerHistory>;
    return {
      easy: parsed.easy ?? [],
      normal: parsed.normal ?? [],
      hard: parsed.hard ?? [],
      free: parsed.free ?? [],
    };
  } catch {
    return { easy: [], normal: [], hard: [], free: [] };
  }
}

function saveHistory(history: KnitMufflerHistory): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {}
}

export function getChallengeStat(
  level: ChallengeLevel,
  id: number,
): ChallengeStat | null {
  const history = getHistory();
  return history[level].find((e) => e.id === id) ?? null;
}

export function getChallengeProgress(
  level: ChallengeLevel,
): ChallengeProgress | null {
  try {
    const history = getHistory();
    const drafts = level === "easy" ? EASY_DRAFTS : NORMAL_DRAFTS;
    return drafts.reduce(
      (acc, draft) => {
        const entry = history[level].find((e) => e.id === draft.id);
        const medal = entry
          ? calcMedal(level, entry.colorAccuracy, entry.slipCount)
          : null;
        return {
          clear: acc.clear + (entry ? 1 : 0),
          perfect: acc.perfect + (medal === "gold" ? 1 : 0),
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
  stat: Omit<ChallengeStat, "savedAt">,
): void {
  const history = getHistory();
  const lv = level as ChallengeLevel;
  const newEntry: ChallengeStat = {
    ...stat,
    savedAt: Date.now(),
  };
  const idx = history[lv].findIndex((e) => e.id === newEntry.id);
  if (idx === -1) {
    history[lv].push(newEntry);
  } else {
    history[lv][idx] = newEntry;
  }
  saveHistory(history);
}

export function getFreeSave(): FreeSave | null {
  const history = getHistory();
  return history.free[0] ?? null;
}

export function saveFreeMuffler(rows: Stitch[][], elapsed: number, width: Width): void {
  const history = getHistory();
  if (history.free.length === 0) {
    history.free.push({ name: "", width, rows, elapsed, savedAt: Date.now() });
  } else {
    history.free[0] = { ...history.free[0], width, rows, elapsed, savedAt: Date.now() };
  }
  saveHistory(history);
}

export function clearFreeSave(): void {
  const history = getHistory();
  history.free = [];
  saveHistory(history);
}

export function clearAllStats(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
