const seed = (n: number) => {
  const x = Math.sin(n + 1) * 10000;
  return x - Math.floor(x);
};

const WORDS = [
  "Error", "Warning", "Connection", "timeout", "occurred", "failed",
  "retry", "limit", "exceeded", "server", "unreachable", "network",
  "broken", "pipe", "refused", "reset", "invalid", "response",
  "unexpected", "token", "null", "undefined", "overflow", "stack",
  "heap", "memory", "allocation", "segfault", "critical", "fatal",
];

export const texts: string[] = Array.from({ length: 10_000 }, (_, i) => {
  const len = Math.floor(seed(i) * 25) + 8; // 8~32 단어
  return Array.from({ length: len }, (__, j) =>
    WORDS[Math.floor(seed(i * 31 + j) * WORDS.length)]
  ).join(" ");
});
