"use client";

import { Frame, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PixelLayer } from "../_shared/assetLibrary";
import { PixelValue } from "./pixelGrid";
import { DEFAULT_FRAME_DURATION_MS } from "./types";

// 박스 크기를 실측하기 전 첫 프레임에 쓰는 대략치(깜빡임 방지용) — 실측되면
// 바로 실제 폭으로 갱신된다.
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
// 메인 재생 버튼과 무관하게 자체 루프로 보이는 프레임을 반복 재생한다
// (pingPong이면 핑퐁) — 계속 움직이는 게 거슬릴 수 있어 헤더의 일시정지
// 토글로 이 패널만 따로 멈출 수 있다.
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
  // 미리보기 정사각 박스 — 사이드바 폭에 맞춰 늘어나므로 실측해서 캔버스
  // object-fit:contain·viewRect 오버레이 계산에 쓴다.
  const boxRef = useRef<HTMLDivElement>(null);
  const [boxSize, setBoxSize] = useState(PREVIEW_MAX);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => setBoxSize(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // 프레임 모드 자동 재생: 보이는 프레임 중 몇 번째를 그릴지. 계속 증가하고,
  // 읽을 때 보이는 프레임 수로 나머지 연산한다(프레임이 늘거나 줄어도 안전).
  const [frameIdx, setFrameIdx] = useState(0);
  // 지금 보고 있는 영역(뷰파인더) 사각형 표시 여부 — 헤더의 토글로 켜고 끈다.
  const [showViewRect, setShowViewRect] = useState(true);
  // 이 패널 전용 일시정지 — 계속 자동 재생되는 게 거슬릴 수 있어 헤더에서
  // 끄고 켤 수 있게 한다. 메인 재생(isPlaying)과는 무관하다.
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(isPaused);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

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
      // 일시정지 중엔 루프 자체는 계속 돌리되(재생 버튼을 누르면 바로
      // 이어지도록) 진행은 멈춘다. last를 매 프레임 갱신해 두면, 재생을
      // 다시 누를 때 멈춰 있던 시간이 elapsed에 한꺼번에 안 더해진다.
      if (isPausedRef.current) {
        last = now;
        raf = requestAnimationFrame(tick);
        return;
      }
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

  // object-fit:contain과 같은 계산 — 캔버스 자체는 CSS objectFit으로 맡기고,
  // 이 값은 viewRect 오버레이를 그 letterbox된 이미지 위에 정확히 겹치는
  // 데만 쓴다.
  const containScale = boxSize > 0 ? Math.min(boxSize / width, boxSize / height) : 0;
  const imgW = width * containScale;
  const imgH = height * containScale;
  const offsetX = (boxSize - imgW) / 2;
  const offsetY = (boxSize - imgH) / 2;

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
        <div className="flex items-center gap-1">
          {visibleFrames.length > 1 && (
            <button
              type="button"
              onClick={() => setIsPaused((p) => !p)}
              title={isPaused ? "미리보기 재생" : "미리보기 일시정지"}
              className={`flex h-4 w-4 items-center justify-center rounded-sm ${
                isPaused
                  ? "text-violet-500"
                  : "text-gray-300 hover:text-gray-500"
              }`}
            >
              {isPaused ? (
                <Play className="h-3 w-3" />
              ) : (
                <Pause className="h-3 w-3" />
              )}
            </button>
          )}
          <span>미리보기</span>
        </div>
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
      {/* 도안 비율과 무관하게 패널 자체는 항상 1:1 정사각 — 캔버스는
          object-fit:contain으로 그 안을 letterbox하며 꽉 채운다. viewRect
          오버레이만 containScale/offset으로 같은 계산을 따로 해서 그
          letterbox된 이미지 위에 겹친다. */}
      <div
        ref={boxRef}
        className="relative aspect-square w-full"
        style={{ backgroundColor: canvasBgColor }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full shadow-sm"
          style={{
            imageRendering: containScale >= 1 ? "pixelated" : "auto",
            objectFit: "contain",
          }}
        />
        {viewRect && showViewRect && boxSize > 0 && (
          <div
            className="pointer-events-none absolute border border-violet-500"
            style={{
              left: viewRect.x * containScale + offsetX,
              top: viewRect.y * containScale + offsetY,
              width: viewRect.w * containScale,
              height: viewRect.h * containScale,
            }}
          />
        )}
      </div>
    </div>
  );
}
