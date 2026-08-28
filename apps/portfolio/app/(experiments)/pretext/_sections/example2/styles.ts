import type { CSSProperties } from "react";
import {
  BORDER_WIDTH,
  FONT_SIZE,
  HORIZONTAL_PADDING,
  LINE_HEIGHT,
  VERTICAL_PADDING,
} from "./constants";

/**
 * Returns a deterministic background color for an item at the given index.
 * Uses the golden angle (137.5°) for a visually spread hue distribution.
 * `dark` = true for dark-themed lists (subtle hues on dark bg),
 * `dark` = false for light-themed lists (pastel hues on white bg).
 */
export function itemBackgroundColor(index: number): string {
  const hue = (index * 137.5) % 360;
  return `hsl(${hue}deg 40% 18% / 0.85)`;
}

/** Shared layout/typography base for all virtual list item cards. */
export const BASE_ITEM_STYLE: CSSProperties = {
  position: "absolute",
  left: 0,
  top: 0,
  fontSize: FONT_SIZE,
  lineHeight: `${LINE_HEIGHT}px`,
  fontFamily: "inherit",
  padding: `${VERTICAL_PADDING}px ${HORIZONTAL_PADDING}px`,
  borderRadius: 6,
  borderWidth: BORDER_WIDTH,
  borderStyle: "solid",
  boxSizing: "border-box",
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
};
