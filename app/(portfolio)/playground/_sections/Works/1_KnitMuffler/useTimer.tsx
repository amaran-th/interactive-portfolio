import { useCallback, useEffect, useRef, useState } from "react";

export function useTimer(running: boolean): {
  elapsed: number;
  reset: (base?: number) => void;
} {
  const [elapsed, setElapsed] = useState(0);
  const baseRef = useRef(0);
  const countRef = useRef(0);

  const reset = useCallback((base = 0) => {
    baseRef.current = base;
    countRef.current = 0;
    setElapsed(base);
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      countRef.current += 1;
      setElapsed(baseRef.current + countRef.current);
    }, 10);
    return () => clearInterval(id);
  }, [running]);

  return { elapsed, reset };
}
