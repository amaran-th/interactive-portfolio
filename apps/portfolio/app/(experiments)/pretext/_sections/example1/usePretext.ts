import { layout, prepare } from "@chenglou/pretext";

export type MeasureFn = (
  text: string,
  maxWidth?: number,
  lineHeight?: number,
) => number;

export function createPretextMeasurer(font: string = "16px Arial"): MeasureFn {
  return (text, maxWidth = 300, lineHeight = 20) => {
    const prepared = prepare(text, font);
    const result = layout(prepared, maxWidth, lineHeight);
    return result.height;
  };
}
