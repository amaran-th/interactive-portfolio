import { useMemo } from "react";
import { MonthSnapshot, SimulationInput } from "./types";
import { runSimulation } from "./simulation";

export function useSimulation(input: SimulationInput): MonthSnapshot[] {
  return useMemo(() => runSimulation(input), [input]);
}
