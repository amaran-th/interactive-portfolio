"use client";

import { Link2, Link2Off } from "lucide-react";
import { RefObject, useEffect, useRef, useState } from "react";
import { getApplePixelColor } from "./applePreview";
import ImportPanel from "./ImportPanel";
import { PixelValue } from "./pixelGrid";
import { CANVAS_PRESET_GROUPS, MAX_CANVAS_SIZE } from "./types";

// 미리보기 캔버스가 화면에 표시되는 최대 크기(정사각형 안에 맞춤).
const PREVIEW_DISPLAY_MAX = 88;

// 마지막으로 만든(또는 프리셋으로 고른) 캔버스 크기를 기억해 다음에 다이얼로그를
// 열 때 기본값으로 채워준다 — 비슷한 규격을 연달아 여러 개 만드는 경우(예:
// 캐릭터 여러 장)가 많아, 매번 16×16부터 다시 고르지 않아도 되게 한다.
const LAST_SIZE_KEY = "pixel-art-last-canvas-size";

function loadLastSize(): { width: number; height: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LAST_SIZE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.width === "number" &&
      typeof parsed?.height === "number"
    ) {
      return { width: parsed.width, height: parsed.height };
    }
  } catch {}
  return null;
}

function saveLastSize(width: number, height: number): void {
  try {
    localStorage.setItem(LAST_SIZE_KEY, JSON.stringify({ width, height }));
  } catch {}
}

// "빈 캔버스"와 "이미지 불러오기"는 새 픽셀아트를 시작하는 서로 대등한 두
// 방법이다 — 한쪽을 기본, 다른 쪽을 부속 링크처럼 두지 않고 같은 무게의
// 탭 2개로 놓는다. 공통 요소는 파일명뿐이라 그것만 탭 바깥에 둔다.
type Mode = "blank" | "import";

export default function NewCanvasDialog({
  onSelect,
  onImportImage,
  onCancel,
  containerRef,
}: {
  onSelect: (width: number, height: number, name: string) => void;
  // width/height는 pixels의 실제 해상도, canvasWidth/canvasHeight는 최종
  // 캔버스 크기 — 원본이 캔버스보다 크면 이 둘이 달라진다(ImportPanel 참고).
  // 다르면 소비하는 쪽(Editor)이 리샘플 없이 배치 후 잘라내야 한다.
  onImportImage: (doc: {
    width: number;
    height: number;
    canvasWidth: number;
    canvasHeight: number;
    palette: string[];
    pixels: PixelValue[];
    name: string;
  }) => void;
  onCancel: () => void;
  containerRef?: RefObject<HTMLDivElement | null>;
}) {
  const [mode, setMode] = useState<Mode>("blank");
  const [name, setName] = useState("제목 없음");
  // 프리셋 버튼은 이 크기를 채워주는 바로가기일 뿐, 실제 값은 항상 width/height
  // 입력칸이 갖고 있다 — 그래서 프리셋을 고른 뒤에도 자유롭게 숫자를 고쳐
  // 임의 크기를 만들 수 있다.
  const [width, setWidth] = useState<number>(
    () => loadLastSize()?.width ?? CANVAS_PRESET_GROUPS[0].presets[0].width,
  );
  const [height, setHeight] = useState<number>(
    () => loadLastSize()?.height ?? CANVAS_PRESET_GROUPS[0].presets[0].height,
  );
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // 직접 입력 칸에서 가로세로 비율을 유지할지 — 켜져 있는 동안은 한쪽 값을
  // 고치면 다른 쪽이 지금 비율(aspectRatioRef)에 맞춰 자동으로 따라온다.
  // 이 비율 자체는 잠금이 풀려 있을 때·프리셋을 고를 때만 갱신되고, 잠긴
  // 동안에는 그 값 그대로 고정된다.
  const [lockAspect, setLockAspect] = useState(false);
  const aspectRatioRef = useRef(width / height);

  const clamp = (v: number) => Math.max(1, Math.min(MAX_CANVAS_SIZE, v || 1));

  const applyPreset = (w: number, h: number) => {
    setWidth(w);
    setHeight(h);
    aspectRatioRef.current = w / h;
  };

  const handleWidthInput = (v: number) => {
    const next = clamp(v);
    setWidth(next);
    if (lockAspect) {
      setHeight(clamp(Math.round(next / aspectRatioRef.current)));
    } else {
      aspectRatioRef.current = next / height;
    }
  };

  const handleHeightInput = (v: number) => {
    const next = clamp(v);
    setHeight(next);
    if (lockAspect) {
      setWidth(clamp(Math.round(next * aspectRatioRef.current)));
    } else {
      aspectRatioRef.current = width / next;
    }
  };

  const previewScale = Math.min(
    PREVIEW_DISPLAY_MAX / width,
    PREVIEW_DISPLAY_MAX / height,
  );
  const previewWidth = Math.round(width * previewScale);
  const previewHeight = Math.round(height * previewScale);

  // 선택한 캔버스 크기가 실제로 어느 정도 해상도인지 감이 오도록 보여준다.
  // 사과는 고정 래스터가 아니라 연속 좌표계의 도형(원·타원)으로 정의돼 있어
  // (getApplePixelColor) 지금 고른 width×height로 직접 채운다 — 그래서
  // 해상도가 낮으면 칸이 굵고 각지게, 높아질수록 곡선이 매끈하고 하이라이트
  // 같은 잔 디테일까지 보이게 실제로 더 자세해진다. 미리보기는 항상 같은
  // 화면 크기(previewWidth×previewHeight, 비율은 실제 캔버스와 동일)로 그린
  // 뒤 그 위에 실제 해상도만큼 격자선만 얹는다.
  useEffect(() => {
    if (mode !== "blank") return;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    canvas.width = previewWidth;
    canvas.height = previewHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, previewWidth, previewHeight);

    const cellW = previewWidth / width;
    const cellH = previewHeight / height;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const color = getApplePixelColor(x, y, width, height);
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(x * cellW, y * cellH, cellW, cellH);
      }
    }

    // 칸 하나가 화면에서 충분히 커 보일 때만 격자선을 그린다 — 해상도가
    // 높아 칸이 1px보다 작아지면 그려도 안 보이고 지저분해지기만 한다.
    if (cellW >= 3 && cellH >= 3) {
      ctx.strokeStyle = "rgba(0,0,0,0.15)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= width; x++) {
        ctx.beginPath();
        ctx.moveTo(Math.round(x * cellW) + 0.5, 0);
        ctx.lineTo(Math.round(x * cellW) + 0.5, previewHeight);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y++) {
        ctx.beginPath();
        ctx.moveTo(0, Math.round(y * cellH) + 0.5);
        ctx.lineTo(previewWidth, Math.round(y * cellH) + 0.5);
        ctx.stroke();
      }
    }
  }, [mode, width, height, previewWidth, previewHeight]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      {/* 헤더(제목·파일명·모드 탭)와 하단 액션(취소)은 고정하고, 그 사이
          본문(모드별 내용)만 스크롤한다 — 예전에는 모달 전체가 overflow-y-auto라
          내용이 길어지면 헤더까지 함께 스크롤되어 나가버렸다. */}
      <div className="flex max-h-[90%] w-104 flex-col bg-white shadow-xl">
        <div className="p-4 pb-0">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">
            새 픽셀아트
          </h2>

          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            파일명
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="파일명"
            className="mb-3 w-full select-text bg-white px-3 py-2 text-sm text-gray-900 shadow-[0_0_0_1px_rgba(0,0,0,0.12)] outline-none focus:shadow-[0_0_0_1.5px_#8b5cf6]"
          />

          <div className="mb-3 grid grid-cols-2 gap-1.5">
            <button
              onClick={() => setMode("blank")}
              className={`py-2 text-sm font-semibold ${
                mode === "blank"
                  ? "bg-violet-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              빈 캔버스
            </button>
            <button
              onClick={() => setMode("import")}
              className={`py-2 text-sm font-semibold ${
                mode === "import"
                  ? "bg-violet-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              이미지 불러오기
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-4 pb-3">
          {mode === "blank" ? (
            <>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                    캔버스 크기를 선택하세요
                  </label>
                  <div className="flex flex-col gap-2">
                    {CANVAS_PRESET_GROUPS.map(({ group, presets }) => (
                      <div key={group}>
                        <p className="mb-1 text-[9px] font-semibold text-gray-400">
                          {group}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {presets.map((preset) => (
                            <button
                              key={preset.label}
                              onClick={() =>
                                applyPreset(preset.width, preset.height)
                              }
                              className={`px-3 py-2 text-left text-sm ${
                                width === preset.width &&
                                height === preset.height
                                  ? "bg-violet-50 text-violet-700 shadow-[0_0_0_1.5px_#8b5cf6]"
                                  : "bg-gray-50 text-gray-700 hover:bg-violet-50"
                              }`}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <label className="mt-3 mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                    직접 입력 (1~{MAX_CANVAS_SIZE})
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={MAX_CANVAS_SIZE}
                      value={width}
                      onChange={(e) =>
                        handleWidthInput(Number(e.target.value))
                      }
                      className="w-full bg-white px-3 py-2 text-center text-sm text-gray-900 shadow-[0_0_0_1px_rgba(0,0,0,0.12)] outline-none focus:shadow-[0_0_0_1.5px_#8b5cf6]"
                    />
                    <span className="text-xs text-gray-400">×</span>
                    <input
                      type="number"
                      min={1}
                      max={MAX_CANVAS_SIZE}
                      value={height}
                      onChange={(e) =>
                        handleHeightInput(Number(e.target.value))
                      }
                      className="w-full bg-white px-3 py-2 text-center text-sm text-gray-900 shadow-[0_0_0_1px_rgba(0,0,0,0.12)] outline-none focus:shadow-[0_0_0_1.5px_#8b5cf6]"
                    />
                    <button
                      onClick={() =>
                        setLockAspect((v) => {
                          const next = !v;
                          if (next) aspectRatioRef.current = width / height;
                          return next;
                        })
                      }
                      title={
                        lockAspect
                          ? "가로세로 비율 유지 켜짐"
                          : "가로세로 비율 유지 꺼짐"
                      }
                      className={`flex h-8 w-8 shrink-0 items-center justify-center ${
                        lockAspect
                          ? "bg-violet-500 text-white"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {lockAspect ? (
                        <Link2 className="h-3.5 w-3.5" />
                      ) : (
                        <Link2Off className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex w-24 shrink-0 flex-col items-center gap-2">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                    미리보기
                  </label>
                  {/* 바깥 칸은 항상 같은 크기(PREVIEW_DISPLAY_MAX 기준 고정)로 둬
                      숫자를 바꿔도 레이아웃이 흔들리지 않게 하고(CLS 방지), 실제
                      테두리(안쪽 회색 박스)만 캔버스의 진짜 가로세로 비율대로
                      크기를 맞춘다 — 그래야 정사각형이 아닌 크기를 입력해도
                      미리보기 틀 자체가 그 비율을 그대로 보여준다. */}
                  <div
                    className="flex shrink-0 items-center justify-center"
                    style={{
                      width: PREVIEW_DISPLAY_MAX + 8,
                      height: PREVIEW_DISPLAY_MAX + 8,
                    }}
                  >
                    <div
                      className="flex items-center justify-center bg-gray-50 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]"
                      style={{
                        width: previewWidth + 8,
                        height: previewHeight + 8,
                      }}
                    >
                      <canvas
                        ref={previewCanvasRef}
                        style={{
                          imageRendering: "pixelated",
                          width: previewWidth,
                          height: previewHeight,
                        }}
                      />
                    </div>
                  </div>
                  <p className="text-center text-[9px] text-gray-400">
                    {width} × {height}
                  </p>
                </div>
              </div>

            </>
          ) : (
            <ImportPanel
              containerRef={containerRef}
              onConfirm={(imported) =>
                onImportImage({ ...imported, name: name || "제목 없음" })
              }
            />
          )}
        </div>

        <div className="flex gap-2 p-4 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 text-xs text-gray-400 hover:text-gray-900"
          >
            취소
          </button>
          {mode === "blank" && (
            <button
              onClick={() => {
                saveLastSize(width, height);
                onSelect(width, height, name || "제목 없음");
              }}
              className="flex-1 bg-violet-500 py-2 text-sm font-semibold text-white hover:bg-violet-600"
            >
              생성
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
