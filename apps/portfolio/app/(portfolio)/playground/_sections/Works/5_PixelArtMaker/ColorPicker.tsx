"use client";

import { Pipette } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { CURSOR_CROSSHAIR, CURSOR_NORMAL, CURSOR_POINTING } from "./cursors";
import { hexToRgba, hsvToRgb, rgbaToHex, rgbToHsv } from "./hsv";

export const COLOR_PICKER_SQUARE_SIZE = 120;

export const CHECKER_STYLE = {
  backgroundImage:
    "linear-gradient(45deg, #d4d4d8 25%, transparent 25%), linear-gradient(-45deg, #d4d4d8 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d4d4d8 75%), linear-gradient(-45deg, transparent 75%, #d4d4d8 75%)",
  backgroundSize: "8px 8px",
  backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px",
} as const;

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

// 세로 트랙(색상/알파 슬라이더) 위 pointer 좌표를 0~1 값으로 환산한다. 트랙
// 밖으로 나가도 0 또는 1로 클램프해 계속 그 방향 끝을 따라가게 한다 —
// 드래그 중 트랙을 벗어나면 마커가 그 자리에 멈춰버려 어색했다.
function trackValue(clientY: number, rect: DOMRect): number {
  if (rect.height === 0) return 0;
  return clamp01((clientY - rect.top) / rect.height);
}

const SQUARE_SIZE = COLOR_PICKER_SQUARE_SIZE;

// SV 정사각형 + 색상/알파 세로 슬라이더 + (선택) 스포이트 버튼 — 편집기의
// 색상환(ColorWheel)과 이미지 불러오기(ImportPanel)의 색상 일괄 수정이 똑같은
// 조작·시각 언어를 쓰도록 공유하는 순수 "단일 색 선택기"다. 즐겨찾기·주/보조
// 색상·팔레트 세트처럼 "어떤 색을 고르는가" 이상의 맥락은 이 컴포넌트가 모르고,
// value(현재 hex)/onChange(새 hex)만으로 동작한다.
export default function ColorPicker({
  value,
  onChange,
  alphaDisabled,
  eyedropperActive,
  onEyedropperClick,
}: {
  value: string;
  onChange: (hex: string) => void;
  // true면 항상 불투명해야 하는 대상(예: 편집기 배경색)을 편집 중이라는 뜻 —
  // 알파 슬라이더를 흐리게 표시하고 조작을 막는다.
  alphaDisabled?: boolean;
  eyedropperActive?: boolean;
  // 생략하면 스포이트 버튼 자체를 그리지 않는다(캔버스 도구와 무관한 맥락,
  // 예: 이미지 불러오기의 색상 일괄 수정에서는 스포이트가 의미가 없다).
  onEyedropperClick?: () => void;
}) {
  const squareRef = useRef<HTMLCanvasElement>(null);
  const draggingRef = useRef<"square" | "hue" | "alpha" | null>(null);
  const hueTrackRef = useRef<HTMLDivElement>(null);
  const alphaTrackRef = useRef<HTMLDivElement>(null);

  const [hsva, setHsva] = useState<[number, number, number, number]>(() => {
    const [r, g, b, a] = hexToRgba(value);
    return [...rgbToHsv(r, g, b), a];
  });

  // commit이 직접 만들어 낸 hex를 기억해둔다 — 그 값 그대로 value로 되돌아온
  // 것뿐이라면(우리 자신의 드래그가 원인) 아래 동기화가 다시 hex→rgb→hsv
  // 왕복 변환을 하지 않게 막는다. 매 드래그 틱마다 왕복 변환을 거치면 반올림
  // 오차가 누적돼(특히 채도가 낮을수록 아주 작은 rgb 반올림에도 hue가 크게
  // 흔들린다) 드래그 중 색상이 제멋대로 튀었다.
  const [lastCommittedHex, setLastCommittedHex] = useState<string | null>(null);

  // value가 외부에서(스와치 클릭 등) 바뀌었을 때만 컨트롤을 그 색의 H/S/V/A로
  // 새로 동기화한다. 렌더링 도중 "이전 렌더의 값과 비교해 조건부로 setState"하는
  // React의 공식 패턴을 쓴다 — 이펙트 안에서 매번 동기적으로 setState하면
  // 불필요한 캐스케이딩 리렌더가 생긴다.
  const [prevValue, setPrevValue] = useState(value);
  // 헥스 입력칸의 임시 텍스트 — 유효하지 않은 중간 입력(예: "#ff")도 그대로
  // 타이핑할 수 있게 hsva와 분리해 따로 둔다. value가 바뀔 때 함께 동기화한다.
  const [hexDraft, setHexDraft] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setHexDraft(value);
    if (value !== lastCommittedHex) {
      const [r, g, b, a] = hexToRgba(value);
      setHsva([...rgbToHsv(r, g, b), a]);
    }
    // lastCommittedHex는 "이 값을 만든 게 우리 자신(방금 commit)"이라는 걸
    // 딱 한 번만 알려주기 위한 값이라 여기서 쓰고 나면 비운다 — 지우지 않으면,
    // 나중에 전혀 다른 경로(예: 다른 즐겨찾기 스와치 클릭)로 우연히 같은 hex가
    // 다시 들어와도 "우리 자신의 반향"으로 착각해 동기화를 건너뛰어 버린다
    // (실제로 스와치를 눌러도 마커가 안 움직이는 버그로 나타났다).
    setLastCommittedHex(null);
  }

  const [hue, sat, val, alpha] = hsva;
  const opaqueRgb = hsvToRgb(hue, sat, val);

  // SV 정사각형 — 가로축 채도(왼쪽 0 → 오른쪽 1), 세로축 명도(위 1 → 아래 0).
  // 색상(hue)은 아래 슬라이더가 정하고, 정사각형은 그 hue의 채도·명도 평면만 그린다.
  const drawSquare = useCallback((h: number) => {
    const canvas = squareRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const size = SQUARE_SIZE;
    const imageData = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      const v = 1 - y / (size - 1);
      for (let x = 0; x < size; x++) {
        const s = x / (size - 1);
        const [r, g, b] = hsvToRgb(h, s, v);
        const i = (y * size + x) * 4;
        imageData.data[i] = r;
        imageData.data[i + 1] = g;
        imageData.data[i + 2] = b;
        imageData.data[i + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }, []);

  useEffect(() => {
    drawSquare(hue);
  }, [hue, drawSquare]);

  const commit = useCallback(
    (next: [number, number, number, number]) => {
      setHsva(next);
      const [r, g, b] = hsvToRgb(next[0], next[1], next[2]);
      const hex = rgbaToHex(r, g, b, alphaDisabled ? 1 : next[3]);
      setLastCommittedHex(hex);
      setHexDraft(hex);
      onChange(hex);
    },
    [alphaDisabled, onChange],
  );

  // #rrggbb 또는 #rrggbbaa만 유효한 값으로 받아들인다 — 그 외(입력 중간
  // 상태 포함)는 화면에만 반영하고 실제로 색을 바꾸지는 않는다.
  //
  // commit()을 그대로 재사용하지 않는다 — commit은 hsva에서 hex를 다시
  // 계산해 커밋하는데, hex→hsv→hex 왕복 변환은 부동소수점 반올림 때문에
  // 원래 값과 완전히 같다는 보장이 없다(채도가 낮을수록 오차가 커진다).
  // 그 결과가 입력창에 그대로 반영되면 사용자가 직접 타이핑한 값이 미세하게
  // 다른 값으로 조용히 바뀌어 보였다. 여기서는 hsva는 다른 컨트롤(SV 정사각형·
  // 슬라이더)이 따라가도록만 갱신하고, 실제로 커밋하는 값은 항상 입력한
  // 문자열 그대로 쓴다.
  const handleHexInputChange = useCallback(
    (raw: string) => {
      let s = raw.trim();
      if (s && !s.startsWith("#")) s = `#${s}`;
      setHexDraft(s);
      if (/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(s)) {
        const [r, g, b, a] = hexToRgba(s);
        const committed = alphaDisabled ? `#${s.slice(1, 7)}` : s;
        setHsva([...rgbToHsv(r, g, b), alphaDisabled ? 1 : a]);
        setLastCommittedHex(committed);
        if (alphaDisabled) setHexDraft(committed);
        onChange(committed);
      }
    },
    [alphaDisabled, onChange],
  );

  const applySquarePoint = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = squareRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      // 정사각형 밖으로 나가도 s/v를 0~1로 계속 클램프해, 마우스가 있는
      // 방향의 가장자리를 계속 따라가게 한다(포토샵·Aseprite와 같은 방식) —
      // 드래그 중 사각형을 벗어나면 마커가 그 자리에 멈춰버려 어색했다.
      const s = clamp01((clientX - rect.left) / rect.width);
      const v = clamp01(1 - (clientY - rect.top) / rect.height);
      commit([hue, s, v, alpha]);
    },
    [hue, alpha, commit],
  );

  const handleSquareDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      draggingRef.current = "square";
      squareRef.current?.setPointerCapture(e.pointerId);
      applySquarePoint(e.clientX, e.clientY);
    },
    [applySquarePoint],
  );

  const handleSquareMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (draggingRef.current !== "square") return;
      applySquarePoint(e.clientX, e.clientY);
    },
    [applySquarePoint],
  );

  const applyHuePoint = useCallback(
    (clientY: number) => {
      const track = hueTrackRef.current;
      if (!track) return;
      const t = trackValue(clientY, track.getBoundingClientRect());
      commit([t * 360, sat, val, alpha]);
    },
    [sat, val, alpha, commit],
  );

  const handleHueDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      draggingRef.current = "hue";
      hueTrackRef.current?.setPointerCapture(e.pointerId);
      applyHuePoint(e.clientY);
    },
    [applyHuePoint],
  );

  const handleHueMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (draggingRef.current !== "hue") return;
      applyHuePoint(e.clientY);
    },
    [applyHuePoint],
  );

  const applyAlphaPoint = useCallback(
    (clientY: number) => {
      const track = alphaTrackRef.current;
      if (!track) return;
      const t = trackValue(clientY, track.getBoundingClientRect());
      commit([hue, sat, val, t]);
    },
    [hue, sat, val, commit],
  );

  const handleAlphaDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      draggingRef.current = "alpha";
      alphaTrackRef.current?.setPointerCapture(e.pointerId);
      applyAlphaPoint(e.clientY);
    },
    [applyAlphaPoint],
  );

  const handleAlphaMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (draggingRef.current !== "alpha") return;
      applyAlphaPoint(e.clientY);
    },
    [applyAlphaPoint],
  );

  const handleDragEnd = useCallback(() => {
    draggingRef.current = null;
  }, []);

  const markerX = sat * SQUARE_SIZE;
  const markerY = (1 - val) * SQUARE_SIZE;
  const opaqueHex = `rgb(${opaqueRgb[0]}, ${opaqueRgb[1]}, ${opaqueRgb[2]})`;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        {/* SV 정사각형 */}
        <div
          className="relative"
          style={{ width: SQUARE_SIZE, height: SQUARE_SIZE }}
        >
          <canvas
            ref={squareRef}
            width={SQUARE_SIZE}
            height={SQUARE_SIZE}
            className="touch-none shadow-sm"
            style={{ cursor: CURSOR_CROSSHAIR }}
            onPointerDown={handleSquareDown}
            onPointerMove={handleSquareMove}
            onPointerUp={handleDragEnd}
            onPointerCancel={handleDragEnd}
          />
          <div
            className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_0_2px_#ffffff,0_1px_3px_rgba(0,0,0,0.35)]"
            style={{ left: markerX, top: markerY, backgroundColor: opaqueHex }}
          />
        </div>

        {/* (선택) 스포이트 + 색상·알파 세로 슬라이더 */}
        <div className="flex flex-col gap-1.5" style={{ height: SQUARE_SIZE }}>
          {onEyedropperClick && (
            <button
              onClick={onEyedropperClick}
              title="스포이트 (I)"
              className={`flex h-7 w-7 shrink-0 items-center justify-center transition-colors ${
                eyedropperActive
                  ? "bg-violet-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              style={{ cursor: CURSOR_POINTING }}
            >
              <Pipette className="h-4 w-4" />
            </button>
          )}
          <div className="flex flex-1 gap-1.5">
            {/* 색상(hue) 세로 슬라이더 */}
            <div
              ref={hueTrackRef}
              onPointerDown={handleHueDown}
              onPointerMove={handleHueMove}
              onPointerUp={handleDragEnd}
              onPointerCancel={handleDragEnd}
              className="relative h-full w-3.5 touch-none shadow-sm"
              style={{
                cursor: CURSOR_POINTING,
                background:
                  "linear-gradient(to bottom, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
              }}
            >
              <div
                className="pointer-events-none absolute left-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_0_2px_#ffffff,0_1px_3px_rgba(0,0,0,0.35)]"
                style={{
                  top: `${(hue / 360) * 100}%`,
                  backgroundColor: opaqueHex,
                }}
              />
            </div>
            {/* 알파(투명도) 세로 슬라이더 — alphaDisabled면 조작을 막고 흐리게 표시한다. */}
            <div
              ref={alphaTrackRef}
              onPointerDown={alphaDisabled ? undefined : handleAlphaDown}
              onPointerMove={alphaDisabled ? undefined : handleAlphaMove}
              onPointerUp={handleDragEnd}
              onPointerCancel={handleDragEnd}
              title={alphaDisabled ? "이 대상은 항상 불투명합니다" : undefined}
              className={`relative h-full w-3.5 touch-none shadow-sm ${
                alphaDisabled ? "opacity-40" : ""
              }`}
              style={{
                ...CHECKER_STYLE,
                cursor: alphaDisabled ? CURSOR_NORMAL : CURSOR_POINTING,
              }}
            >
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background: `linear-gradient(to bottom, transparent, ${opaqueHex})`,
                }}
              />
              <div
                className="pointer-events-none absolute left-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_0_2px_#ffffff,0_1px_3px_rgba(0,0,0,0.35)]"
                style={{ top: `${alpha * 100}%`, backgroundColor: opaqueHex }}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-gray-400">#</span>
        <input
          value={hexDraft.replace(/^#/, "")}
          onChange={(e) => handleHexInputChange(e.target.value)}
          spellCheck={false}
          maxLength={8}
          placeholder="rrggbb"
          title="헥스 코드 직접 입력 (RRGGBB 또는 RRGGBBAA)"
          className="w-20 bg-gray-100 px-1.5 py-1 font-mono text-[10px] text-gray-700 outline-none focus:shadow-[0_0_0_1.5px_#8b5cf6]"
        />
      </div>
    </div>
  );
}
