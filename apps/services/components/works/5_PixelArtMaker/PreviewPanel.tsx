"use client";

import { Frame } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PixelLayer } from "../_shared/assetLibrary";
import { PixelValue } from "./pixelGrid";
import { DEFAULT_FRAME_DURATION_MS } from "./types";

// 미리보기 캔버스가 놓일 정사각 박스의 한 변(px). 도안이 이보다 크면 축소해,
// 작으면 정수 배율로 확대해(최대 8배) 이 안에 맞춘다.
const PREVIEW_MAX = 176;

// 계속 증가하는 카운터를 실제 표시할 프레임 위치로 바꾼다. pingPong이면 끝에
// 닿을 때 방향을 뒤집어 앞뒤로 오가고(0→n-1→0…), 아니면 순환(mod)한다.
function frameAt(counter: number, length: number, pingPong: boolean): number {
  if (length <= 1) return 0;
  if (!pingPong) return counter % length;
  const period = 2 * (length - 1);
  const p = ((counter % period) + period) % period;
  return p < length ? p : period - p;
}

// "지금 작업물이 작게 보면 어떤지"를 항상 보여주는 패널. 프레임 모드에서는
// 메인 재생 버튼과 무관하게 자체 루프로 보이는 프레임을 계속 재생한다(항상
// 반복, pingPong이면 핑퐁).
export default function PreviewPanel({
  width,
  height,
  pixels,
  livePixels,
  viewRect,
  layers,
  layerMode,
  pingPong,
  canvasBgColor,
}: {
  width: number;
  height: number;
  // 레이어 모드에서 보여줄 합성 결과(Editor의 compositePixels).
  pixels: PixelValue[];
  // 그리는 중(커밋 전)이면 그 합성 결과 — 없으면 null. 레이어 모드에서만 쓴다.
  livePixels: PixelValue[] | null;
  // 지금 메인 캔버스에서 보고 있는 영역(도안 픽셀 좌표) — 전체가 보이면 null.
  viewRect: { x: number; y: number; w: number; h: number } | null;
  // 프레임 모드 자동 재생에 쓰인다.
  layers: PixelLayer[];
  layerMode: "layers" | "frames";
  // 자동 재생을 핑퐁(끝에서 방향 뒤집기)으로 할지.
  pingPong: boolean;
  canvasBgColor: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // 프레임 모드 자동 재생: 보이는 프레임 중 몇 번째를 그릴지. 계속 증가하고,
  // 읽을 때 보이는 프레임 수로 나머지 연산한다(프레임이 늘거나 줄어도 안전).
  const [frameIdx, setFrameIdx] = useState(0);
  // 지금 보고 있는 영역(뷰파인더) 사각형 표시 여부 — 헤더의 토글로 켜고 끈다.
  const [showViewRect, setShowViewRect] = useState(true);

  // 애니메이션 루프가 픽셀 편집마다 재시작하지 않도록 layers·pingPong은 ref로
  // 읽는다.
  const layersRef = useRef(layers);
  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);
  const pingPongRef = useRef(pingPong);
  useEffect(() => {
    pingPongRef.current = pingPong;
  }, [pingPong]);

  // 루프는 프레임 "구조"(보이는 프레임 목록·순서·지속시간)가 바뀔 때만 재시작.
  const framesSignature =
    layerMode === "frames"
      ? layers
          .filter((l) => l.visible)
          .map(
            (l) => `${l.id}:${l.frameDurationMs ?? DEFAULT_FRAME_DURATION_MS}`,
          )
          .join("|")
      : "";

  useEffect(() => {
    if (layerMode !== "frames") return;
    const getVisible = () => layersRef.current.filter((l) => l.visible);
    if (getVisible().length <= 1) return;
    let raf = 0;
    let last = performance.now();
    let elapsed = 0;
    // effect가 재시작하면(프레임 구조 변경) 0부터 다시 — 미리보기라 감수.
    let localIdx = 0;
    const tick = (now: number) => {
      elapsed += now - last;
      last = now;
      const vis = getVisible();
      if (vis.length > 0) {
        const dur =
          vis[frameAt(localIdx, vis.length, pingPongRef.current)]
            .frameDurationMs ?? DEFAULT_FRAME_DURATION_MS;
        if (elapsed >= dur) {
          elapsed -= dur;
          localIdx += 1;
          setFrameIdx(localIdx);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [layerMode, framesSignature]);

  const visibleFrames =
    layerMode === "frames" ? layers.filter((l) => l.visible) : [];
  const shownPixels =
    visibleFrames.length > 0
      ? visibleFrames[frameAt(frameIdx, visibleFrames.length, pingPong)].pixels
      : (livePixels ?? pixels);

  const displayScale = Math.min(PREVIEW_MAX / width, PREVIEW_MAX / height, 8);
  const displayW = Math.max(1, Math.round(width * displayScale));
  const displayH = Math.max(1, Math.round(height * displayScale));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const color = shownPixels[y * width + x];
        if (color === null || color === undefined) continue;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }, [width, height, shownPixels]);

  return (
    <div className="flex shrink-0 flex-col bg-white shadow-md">
      <div className="flex items-center justify-between gap-1 px-2 py-1.5 text-[10px] font-semibold text-gray-500">
        <span>미리보기</span>
        <div className="flex items-center gap-1.5">
          <span className="tabular-nums font-normal text-gray-400">
            {visibleFrames.length > 1 ? `${visibleFrames.length}프레임 · ` : ""}
            {width} × {height}
          </span>
          <button
            type="button"
            onClick={() => setShowViewRect((v) => !v)}
            title={
              showViewRect
                ? "지금 보고 있는 영역 표시 끄기"
                : "지금 보고 있는 영역 표시 켜기"
            }
            className={`flex h-4 w-4 items-center justify-center rounded-sm ${
              showViewRect
                ? "text-violet-500"
                : "text-gray-300 hover:text-gray-500"
            }`}
          >
            <Frame className="h-3 w-3" />
          </button>
        </div>
      </div>
      <div
        className="flex items-center justify-center p-2"
        style={{
          backgroundColor: canvasBgColor,
          height: PREVIEW_MAX + 16,
        }}
      >
        <div
          className="relative"
          style={{ width: displayW, height: displayH }}
        >
          <canvas
            ref={canvasRef}
            className="block shadow-sm"
            style={{
              imageRendering: displayScale >= 1 ? "pixelated" : "auto",
              width: displayW,
              height: displayH,
            }}
          />
          {viewRect && showViewRect && (
            <div
              className="pointer-events-none absolute border border-violet-500"
              style={{
                left: viewRect.x * displayScale,
                top: viewRect.y * displayScale,
                width: viewRect.w * displayScale,
                height: viewRect.h * displayScale,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
