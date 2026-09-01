"use client";

import { Copy } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { PixelArt } from "../_shared/assetLibrary";
import {
  buildAnimatedSvgString,
  buildSvgString,
  copyJpgToClipboard,
  copyPngToClipboard,
  copySpriteSheetToClipboard,
  copyTextToClipboard,
  exportAsAnimatedSVG,
  exportAsGIF,
  exportAsJPG,
  exportAsJSON,
  exportAsPNG,
  exportAsSpriteSheet,
  exportAsSVG,
} from "./exportPixelArt";

type Format = "png" | "svg" | "json" | "jpg" | "gif" | "spritesheet";

// 래스터 형식(PNG·JPG)을 나란히, 그 다음 벡터/데이터 형식(SVG·JSON) 순으로 배치한다.
const FORMATS: { id: Format; label: string }[] = [
  { id: "png", label: "PNG" },
  { id: "jpg", label: "JPG" },
  { id: "svg", label: "SVG" },
  { id: "json", label: "JSON" },
];

// PNG·JPG는 래스터라 배율만큼 실제 출력 해상도가 달라진다 — SVG·JSON은
// 벡터/데이터라 해상도 개념이 없어 이 옵션 자체를 보여주지 않는다.
const SCALE_OPTIONS = [1, 2, 4, 8, 16];

// GIF·스프라이트 시트는 배율에 보이는 프레임 수까지 곱해져 캔버스가
// 커지므로, 16×까지 열어두면 브라우저 캔버스 크기 한도(대략 65,535px)를
// 넘기거나 GIF 인코딩 중 메모리가 급증할 수 있어 8×까지로 상한을 낮춘다.
const FRAME_SCALE_OPTIONS = [1, 2, 4, 8];

export default function ExportPanel({ doc }: { doc: PixelArt }) {
  const [format, setFormat] = useState<Format>("png");
  // 프레임 모드일 때만 GIF·스프라이트 시트를 목록에 더한다 — 레이어 모드에는
  // "프레임"이라는 개념이 없어 애초에 애니메이션 내보내기가 성립하지 않는다.
  const visibleFormats =
    doc.layerMode === "frames"
      ? [
          ...FORMATS,
          { id: "gif" as const, label: "GIF" },
          { id: "spritesheet" as const, label: "스프라이트" },
        ]
      : FORMATS;
  // 스프라이트 시트는 보이는 프레임 수만큼 가로로 이어붙이므로, 해상도
  // 표시·배율 상한 계산 둘 다 이 값이 필요하다.
  const visibleFrameCount = (doc.layers ?? []).filter((l) => l.visible).length;
  const [scale, setScale] = useState(8);
  // 프레임 모드에서 SVG로 내보낼 때: 켜면 프레임을 순환 재생하는 애니메이션
  // SVG, 끄면 지금 보고 있는 프레임 한 장만.
  const [svgAnimated, setSvgAnimated] = useState(true);
  const svgAsAnimation =
    format === "svg" && doc.layerMode === "frames" && svgAnimated;
  const [status, setStatus] = useState<string | null>(null);
  const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback((message: string) => {
    setStatus(message);
    if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
    statusTimeoutRef.current = setTimeout(() => setStatus(null), 2000);
  }, []);

  // 프레임 모드에서 GIF·스프라이트 시트를 골라둔 채로 레이어 모드로 돌아가면
  // 버튼 목록에서는 사라지는데 format 상태는 그대로 남아, "파일로 저장"을
  // 누르면 화면에 안 보이는 포맷으로 여전히 내보내지는 불일치가 생긴다 —
  // 그런 상황이 되면 안전한 기본값(PNG)으로 되돌린다. 렌더링 중에 이전
  // layerMode와 비교해 조정한다(useEffect 안에서 setState하면
  // react-hooks/set-state-in-effect가 캐스케이딩 렌더를 경고한다).
  const [prevLayerMode, setPrevLayerMode] = useState(doc.layerMode);
  if (doc.layerMode !== prevLayerMode) {
    setPrevLayerMode(doc.layerMode);
    if ((format === "gif" || format === "spritesheet") && doc.layerMode !== "frames") {
      setFormat("png");
    }
  }

  // scale이 16으로 골라진 상태에서 포맷을 GIF·스프라이트 시트로 바꾸면,
  // 화면에는 8× 이하 버튼만 보이는데(FRAME_SCALE_OPTIONS) 내부 scale 값은
  // 여전히 16으로 남아 "파일로 저장"을 누르면 화면에 없는 배율로 여전히
  // 내보내지는 불일치가 생긴다 — 그 상태가 되면 8로 낮춘다.
  if ((format === "gif" || format === "spritesheet") && scale > 8) {
    setScale(8);
  }

  const handleSave = useCallback(() => {
    if (format === "png") exportAsPNG(doc, scale);
    else if (format === "svg") {
      if (svgAsAnimation) exportAsAnimatedSVG(doc);
      else exportAsSVG(doc);
    } else if (format === "json") exportAsJSON(doc);
    else if (format === "gif") void exportAsGIF(doc, scale);
    else if (format === "spritesheet") exportAsSpriteSheet(doc, scale);
    else exportAsJPG(doc, scale);
  }, [format, doc, scale, svgAsAnimation]);

  // PNG·JPG는 이미지로, SVG·JSON은 코드(텍스트)로 클립보드에 복사한다.
  const handleSecondary = useCallback(async () => {
    if (format === "png") {
      flash(
        (await copyPngToClipboard(doc, scale))
          ? "PNG를 클립보드에 복사했습니다"
          : "클립보드 복사 실패",
      );
    } else if (format === "jpg") {
      flash(
        (await copyJpgToClipboard(doc, scale))
          ? "JPG를 클립보드에 복사했습니다"
          : "클립보드 복사 실패",
      );
    } else if (format === "svg") {
      flash(
        (await copyTextToClipboard(
          svgAsAnimation ? buildAnimatedSvgString(doc) : buildSvgString(doc),
        ))
          ? "SVG 코드를 복사했습니다"
          : "클립보드 복사 실패",
      );
    } else if (format === "json") {
      flash(
        (await copyTextToClipboard(JSON.stringify(doc, null, 2)))
          ? "JSON을 복사했습니다"
          : "클립보드 복사 실패",
      );
    } else if (format === "spritesheet") {
      flash(
        (await copySpriteSheetToClipboard(doc, scale))
          ? "스프라이트 시트를 클립보드에 복사했습니다"
          : "클립보드 복사 실패",
      );
    }
  }, [format, doc, scale, flash, svgAsAnimation]);

  const hasSecondary = format !== "gif";
  const secondaryTitle =
    format === "svg" || format === "json"
      ? "코드 복사"
      : "클립보드에 이미지로 복사";

  return (
    <>
      <div className={`grid gap-1 ${doc.layerMode === "frames" ? "grid-cols-3" : "grid-cols-4"}`}>
        {visibleFormats.map((f) => (
          <button
            key={f.id}
            onClick={() => setFormat(f.id)}
            className={`py-1.5 text-[10px] font-semibold ${
              format === f.id
                ? "bg-violet-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {format === "svg" && doc.layerMode === "frames" && (
        <label className="flex items-center justify-between text-xs text-gray-600">
          <span>애니메이션</span>
          <button
            type="button"
            role="switch"
            aria-checked={svgAnimated}
            onClick={() => setSvgAnimated((v) => !v)}
            title={
              svgAnimated
                ? "보이는 프레임을 순환 재생하는 SVG"
                : "지금 보고 있는 프레임 한 장만 SVG로"
            }
            className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${
              svgAnimated ? "bg-violet-500" : "bg-gray-300"
            }`}
          >
            <span
              className="absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform"
              style={{
                transform: svgAnimated
                  ? "translateX(12px)"
                  : "translateX(0)",
              }}
            />
          </button>
        </label>
      )}

      {(format === "png" ||
        format === "jpg" ||
        format === "gif" ||
        format === "spritesheet") && (
        <div className="flex flex-col gap-1">
          <label className="flex items-center justify-between text-xs text-gray-600">
            <span>해상도</span>
            <span className="text-[10px] tabular-nums text-gray-400">
              {doc.width *
                scale *
                (format === "spritesheet" ? Math.max(1, visibleFrameCount) : 1)}{" "}
              × {doc.height * scale}px
            </span>
          </label>
          <div className="flex gap-1">
            {(format === "gif" || format === "spritesheet"
              ? FRAME_SCALE_OPTIONS
              : SCALE_OPTIONS
            ).map((s) => (
              <button
                key={s}
                onClick={() => setScale(s)}
                className={`flex-1 py-1 text-[10px] ${
                  scale === s
                    ? "bg-violet-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>
      )}

      {status && <p className="text-[10px] text-violet-600">{status}</p>}

      <div className="flex gap-1.5">
        <button
          onClick={handleSave}
          className="flex-1 bg-violet-500 py-2 text-xs font-semibold text-white hover:bg-violet-600"
        >
          파일로 저장
        </button>
        {hasSecondary && (
          <button
            onClick={handleSecondary}
            title={secondaryTitle}
            className="flex w-9 shrink-0 items-center justify-center bg-gray-100 text-gray-500 hover:bg-gray-200"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </>
  );
}
