"use client";

import { createContext, useContext } from "react";
import { Color, ColorMode } from "./type";
import { PALETTES } from "./data";

type ColorDef = { id: number; stroke: string; fill: string; text: string };

export const ColorModeContext = createContext<ColorMode>("normal");

export function useColorPalette(): Record<Color, ColorDef> {
  const mode = useContext(ColorModeContext);
  return PALETTES[mode];
}
