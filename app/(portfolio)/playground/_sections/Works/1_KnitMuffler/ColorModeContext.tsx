"use client";

import { createContext, useContext } from "react";
import { ColorDef, PALETTES } from "./data";
import { Color, ColorMode } from "./type";

export const ColorModeContext = createContext<ColorMode>("normal");

export function useColorPalette(): Record<Color, ColorDef> {
  const mode = useContext(ColorModeContext);
  return PALETTES[mode];
}
