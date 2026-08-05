// gifenc(https://github.com/mattdesl/gifenc)는 자체 타입 선언이 없다 — 이
// 프로젝트가 실제로 쓰는 GIFEncoder/quantize/applyPalette API만 최소로
// 선언한다(전체 API 표면이 아니다).
declare module "gifenc" {
  // 실제로는 [r,g,b] 또는 [r,g,b,a] 길이의 배열이지만, 고정 길이 튜플
  // 유니온으로 선언하면 c[3](알파) 접근이 3-튜플 쪽 분기에서 "인덱스 3이
  // 없다"는 컴파일 에러가 난다 — number[]로 느슨하게 선언해 그 문제를 피한다.
  export type GifencColor = number[];

  export interface GIFEncoderWriteFrameOptions {
    palette?: GifencColor[];
    delay?: number;
    repeat?: number;
    transparent?: boolean;
    transparentIndex?: number;
    dispose?: number;
    first?: boolean;
  }

  export interface GIFEncoderInstance {
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      options?: GIFEncoderWriteFrameOptions,
    ): void;
    finish(): void;
    bytes(): Uint8Array;
    bytesView(): Uint8Array;
  }

  export function GIFEncoder(options?: { auto?: boolean }): GIFEncoderInstance;

  export function quantize(
    data: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    options?: { format?: string },
  ): GifencColor[];

  export function applyPalette(
    data: Uint8Array | Uint8ClampedArray,
    palette: GifencColor[],
    format?: string,
  ): Uint8Array;
}
