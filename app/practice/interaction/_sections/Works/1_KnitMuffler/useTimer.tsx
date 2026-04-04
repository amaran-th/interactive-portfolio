import { useEffect, useRef, useState } from "react";

export function useTimer(started: boolean, resetKey = 0) {
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setElapsed(0);
  }, [resetKey]);

  useEffect(() => {
    if (!started) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 10);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [started]);

  return elapsed;
}
