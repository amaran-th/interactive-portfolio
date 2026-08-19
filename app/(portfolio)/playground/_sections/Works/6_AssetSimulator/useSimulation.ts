import { useMemo } from "react";
import { MonthSnapshot, SimulationInput } from "./types";
import { runSimulation } from "./simulation";

export function useSimulation(
  input: SimulationInput,
  today: Date,
  horizonMonths: number,
): MonthSnapshot[] {
  return useMemo(
    () => runSimulation(input, today, horizonMonths),
    [input, today, horizonMonths],
  );
}
