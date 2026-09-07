"use client";

import { Copy } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { PixelArt } from "../_shared/assetLibrary";
import HelpTip from "./HelpTip";
import { HELP } from "./helpTexts";
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
import Switch from "./Switch";

type Format = "png" | "svg" | "json" | "jpg" | "gif";

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

export default function ExportPanel({
  doc,
  canvasBgColor,
  pingPong,
}: {
  doc: PixelArt;
  // JPG는 알파가 없어 투명한 곳을 이 색(편집기 작업 영역 배경색)으로 채운다.
  canvasBgColor: string;
  // 프레임 모드 패널의 핑퐁 토글을 그대로 쓴다 — 내보내기 전용 옵션을 따로
  // 두지 않고, 미리보기에서 보이는 재생 방향과 항상 일치하게 한다.
  pingPong: boolean;
}) {
  const isFrames = doc.layerMode === "frames";
  const [format, setFormat] = useState<Format>("png");
  // 프레임 모드일 때만 GIF를 목록에 더한다 — 레이어 모드에는 "프레임"이라는
  // 개념이 없어 애니메이션 내보내기가 성립하지 않는다.
  const visibleFormats = isFrames
    ? [...FORMATS, { id: "gif" as const, label: "GIF" }]
    : FORMATS;
  const visibleFrameCount = (doc.layers ?? []).filter((l) => l.visible).length;
  const [scale, setScale] = useState(8);
  // 프레임 모드 + SVG: 켜면 프레임을 순환 재생하는 애니메이션 SVG, 끄면 지금
  // 보고 있는 프레임 한 장만.
  const [svgAnimated, setSvgAnimated] = useState(true);
  // 프레임 모드 + PNG: 켜면 보이는 프레임을 가로로 이어붙인 스프라이트 시트로,
  // 끄면 지금 보고 있는 프레임 한 장만. 스프라이트 시트는 알파(투명 배경)가
  // 있어야 게임 엔진에서 쓰므로 PNG에서만 제공한다.
  const [spriteSheet, setSpriteSheet] = useState(false);
  const svgAsAnimation = format === "svg" && isFrames && svgAnimated;
  const spriteAsSheet = format === "png" && isFrames && spriteSheet;
  const [status, setStatus] = useState<string | null>(null);
  const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback((message: string) => {
    setStatus(message);
    if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
    statusTimeoutRef.current = setTimeout(() => setStatus(null), 2000);
  }, []);

  // 프레임 모드에서 GIF를 골라둔 채로 레이어 모드로 돌아가면 버튼 목록에서는
  // 사라지는데 format 상태는 그대로 남아 화면에 안 보이는 포맷으로 내보내지는
  // 불일치가 생긴다 — 그 상황이면 안전한 기본값(PNG)으로 되돌린다. 렌더링 중에
  // 이전 layerMode와 비교해 조정한다(useEffect 안에서 setState하면
  // react-hooks/set-state-in-effect가 캐스케이딩 렌더를 경고한다).
  const [prevLayerMode, setPrevLayerMode] = useState(doc.layerMode);
  if (doc.layerMode !== prevLayerMode) {
    setPrevLayerMode(doc.layerMode);
    if (format === "gif" && !isFrames) setFormat("png");
    if (!isFrames && spriteSheet) setSpriteSheet(false);
  }

  // scale이 16으로 골라진 상태에서 GIF/스프라이트 시트로 바뀌면 화면에는 8×
  // 이하 버튼만 보이는데 내부 scale 값은 16으로 남아 화면에 없는 배율로
  // 내보내지는 불일치가 생긴다 — 그 상태면 8로 낮춘다.
  if ((format === "gif" || spriteAsSheet) && scale > 8) {
    setScale(8);
  }

  const handleSave = useCallback(() => {
    if (format === "png") {
      if (spriteAsSheet) exportAsSpriteSheet(doc, scale);
      else exportAsPNG(doc, scale);
    } else if (format === "jpg") exportAsJPG(doc, scale, canvasBgColor);
    else if (format === "svg") {
      if (svgAsAnimation) exportAsAnimatedSVG(doc, pingPong);
      else exportAsSVG(doc);
    } else if (format === "json") exportAsJSON(doc);
    else if (format === "gif") void exportAsGIF(doc, scale, pingPong);
  }, [
    format,
    doc,
    scale,
    svgAsAnimation,
    spriteAsSheet,
    canvasBgColor,
    pingPong,
  ]);

  // PNG·JPG는 이미지로, SVG·JSON은 코드(텍스트)로 클립보드에 복사한다.
  const handleSecondary = useCallback(async () => {
    if (format === "png" || format === "jpg") {
      const ok = spriteAsSheet
        ? await copySpriteSheetToClipboard(doc, scale)
        : format === "png"
          ? await copyPngToClipboard(doc, scale)
          : await copyJpgToClipboard(doc, scale, canvasBgColor);
      const what = spriteAsSheet ? "스프라이트 시트" : format.toUpperCase();
      flash(ok ? `${what}를 클립보드에 복사했습니다` : "클립보드 복사 실패");
    } else if (format === "svg") {
      flash(
        (await copyTextToClipboard(
          svgAsAnimation
            ? buildAnimatedSvgString(doc, pingPong)
            : buildSvgString(doc),
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
    }
  }, [
    format,
    doc,
    scale,
    flash,
    svgAsAnimation,
    spriteAsSheet,
    canvasBgColor,
    pingPong,
  ]);

  const hasSecondary = format !== "gif";
  const secondaryTitle =
    format === "svg" || format === "json"
      ? "코드 복사"
      : "클립보드에 이미지로 복사";

  return (
    <>
      <div className={`grid gap-1 ${isFrames ? "grid-cols-3" : "grid-cols-4"}`}>
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

      {format === "png" && isFrames && (
        <label className="flex items-center justify-between text-xs text-gray-600">
          <span className="flex items-center gap-1">
            스프라이트 시트
            <HelpTip text={HELP.exportSpriteSheet} />
          </span>
          <Switch
            checked={spriteSheet}
            onClick={() => setSpriteSheet((v) => !v)}
          />
        </label>
      )}

      {format === "jpg" && (
        <p className="flex items-center gap-1 text-[10px] text-gray-400">
          <span
            className="h-3 w-3 shrink-0 rounded-sm ring-1 ring-gray-300"
            style={{ backgroundColor: canvasBgColor }}
          />
          배경색
          <HelpTip text={HELP.exportJpgBackground} />
        </p>
      )}

      {format === "svg" && isFrames && (
        <label className="flex items-center justify-between text-xs text-gray-600">
          <span className="flex items-center gap-1">
            애니메이션
            <HelpTip text={HELP.exportSvgAnimation} />
          </span>
          <Switch
            checked={svgAnimated}
            onClick={() => setSvgAnimated((v) => !v)}
          />
        </label>
      )}

      {(format === "png" || format === "jpg" || format === "gif") && (
        <div className="flex flex-col gap-1">
          <label className="flex items-center justify-between text-xs text-gray-600">
            <span>해상도</span>
            <span className="text-[10px] tabular-nums text-gray-400">
              {doc.width * scale * (spriteAsSheet ? Math.max(1, visibleFrameCount) : 1)}{" "}
              × {doc.height * scale}px
            </span>
          </label>
          <div className="flex gap-1">
            {(format === "gif" || spriteAsSheet
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
