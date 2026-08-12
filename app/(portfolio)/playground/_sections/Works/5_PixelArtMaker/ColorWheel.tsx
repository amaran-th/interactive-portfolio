"use client";

import { Download, Save, Settings, Trash2, X } from "lucide-react";
import {
  CSSProperties,
  RefObject,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import ColorPicker, { CHECKER_STYLE } from "./ColorPicker";
import { PromptModal } from "./Dialogs";
import {
  createPaletteSet,
  deletePaletteSet,
  listPaletteSets,
  PaletteSet,
  updatePaletteSetColors,
} from "./paletteSets";
import { DEFAULT_CANVAS_BG_COLOR, MAX_PALETTE_COLORS, Tool } from "./types";

// 지금 어느 색을 색상환으로 조작하고 있는지 — MS페인트의 주/보조 색상
// 사각형과 같은 개념. 스와치를 좌클릭하면 primary가, 우클릭하면 secondary가
// 함께 활성화된다(둘 다 동시에 방금 지정한 대상을 색상환에 바로 보여준다).
// canvasBg는 편집기 캔버스 배경색 스와치를 클릭했을 때 활성화된다.
type ArmedTarget = "primary" | "secondary" | "canvasBg";

const TRANSPARENT_HEX = "#00000000";

export default function ColorWheel({
  favorites,
  activeColorHex,
  secondaryColorHex,
  onChangeActiveColor,
  onChangeSecondaryColor,
  onAddFavorite,
  onRemoveFavorite,
  onEditFavorite,
  onReplaceFavorites,
  tool,
  onToolChange,
  canvasBgColor,
  onChangeCanvasBgColor,
  boundsRef,
}: {
  favorites: string[];
  activeColorHex: string;
  // 그라데이션 끝 색상 — MS페인트의 보조 색상과 같은 개념. null이면 투명.
  secondaryColorHex: string | null;
  onChangeActiveColor: (hex: string) => void;
  onChangeSecondaryColor: (hex: string | null) => void;
  onAddFavorite: (hex: string) => void;
  onRemoveFavorite: (index: number) => void;
  // 즐겨찾기 스와치를 선택한 뒤 색상환을 조작하면 그 스와치의 저장값 자체를
  // 바꾼다(다른 에디터의 팔레트 편집과 같은 방식) — 이미 칠한 픽셀은 값을
  // 직접 복사해 저장하므로 이 편집에 영향받지 않는다.
  onEditFavorite: (index: number, hex: string) => void;
  // 팔레트 세트를 "불러오면" 지금 즐겨찾기 전체를 그 세트 색으로 바꾼다.
  onReplaceFavorites: (colors: string[]) => void;
  tool: Tool;
  onToolChange: (tool: Tool) => void;
  // 편집기 작업 영역(캔버스가 놓인 주변 여백)의 배경색 — 캔버스 자체가 아니라
  // 그 바깥을 칠한다. 항상 불투명 단색이라 같은 색상환의 알파만 무시하고 쓴다.
  canvasBgColor: string;
  onChangeCanvasBgColor: (hex: string) => void;
  // 드롭다운 패널이 벗어나면 안 되는 경계 — 편집창 루트(Editor.tsx의
  // rootRef). 편집창 루트에 transform(scale)이 걸려 있어, 패널을 fixed로
  // 띄울 때 뷰포트가 아니라 이 루트 기준으로 위치를 계산해야 한다.
  boundsRef: RefObject<HTMLDivElement | null>;
}) {
  const [armedTarget, setArmedTarget] = useState<ArmedTarget>("primary");

  // 지금 활성/보조 색상과 "연결된" 즐겨찾기 스와치 — 스와치를 클릭해 고르면
  // 연결되고, 연결된 동안 색상환을 조작하면 활성/보조 색상뿐 아니라 그
  // 스와치의 저장값도 함께 바뀐다(다른 에디터의 팔레트 편집처럼). 스포이트 등
  // 색상환을 거치지 않은 다른 경로로 활성/보조 색상이 바뀌면 그 스와치와 값이
  // 어긋나므로, 렌더링 중 즉시 연결을 끊는다 — 그래야 우연히 같은 색이어도
  // 스와치를 직접 고르지 않았다면 강조 표시되지 않는다.
  const [primaryFavoriteIndex, setPrimaryFavoriteIndex] = useState<
    number | null
  >(null);
  const [secondaryFavoriteIndex, setSecondaryFavoriteIndex] = useState<
    number | null
  >(null);
  if (
    primaryFavoriteIndex !== null &&
    favorites[primaryFavoriteIndex] !== activeColorHex
  ) {
    setPrimaryFavoriteIndex(null);
  }
  if (
    secondaryFavoriteIndex !== null &&
    favorites[secondaryFavoriteIndex] !== secondaryColorHex
  ) {
    setSecondaryFavoriteIndex(null);
  }

  // 특정 파일이 아니라 편집기 자체에 저장되는 팔레트 세트 — 다른 작품을 열어도
  // 그대로 남아 있고, 즐겨찾기로 불러오거나 지금 즐겨찾기를 새 세트로 저장할 수
  // 있다. listPaletteSets 자체가 서버 환경(window 없음)을 가드하므로 초기
  // useState 지연 초기화 함수에서 바로 읽어도 안전하다.
  const [paletteSets, setPaletteSets] = useState<PaletteSet[]>(() =>
    listPaletteSets(),
  );
  const [saveSetPromptOpen, setSaveSetPromptOpen] = useState(false);
  // 세트 불러오기/저장/삭제는 즐겨찾기 색을 고르는 것만큼 자주 쓰지 않는다 —
  // 기본은 닫아 두고, "즐겨찾기" 라벨 옆 톱니바퀴를 눌러야 뜨는 드롭다운 패널로 보여준다.
  const [showPaletteManager, setShowPaletteManager] = useState(false);

  // 드롭다운 트리거(톱니바퀴)와 패널 DOM 노드 — 열 때마다 실제 남은 공간을
  // 재서 패널을 편집창 밖으로 나가지 않게 fixed로 띄운다.
  const paletteManagerTriggerRef = useRef<HTMLButtonElement>(null);
  const paletteManagerPanelRef = useRef<HTMLDivElement>(null);
  const [paletteManagerPanelStyle, setPaletteManagerPanelStyle] =
    useState<CSSProperties>({});

  // 편집창 루트(boundsRef) 기준 좌표로 패널 위치를 계산한다 —
  // ContextMenu(Editor.tsx의 openFileMenu/openEditMenu)와 같은 관례: 편집창
  // 루트에 transform(scale)이 걸려 있어, fixed 좌표는 뷰포트가 아니라 이
  // 루트 기준 상대좌표로 계산해야 정확히 자리 잡는다. 패널이 열려 있는 동안
  // 편집창 크기가 바뀌면(narrow 감지에 쓰는 것과 같은 ResizeObserver 패턴)
  // 위치를 다시 계산해, 창을 줄여도 경계를 벗어나지 않게 한다.
  // recompute를 이 effect 안에 지역 함수로 두는 이유: 밖으로 빼 useCallback
  // 으로 만들면 effect 안에서 그 참조를 곧바로 호출하는 모양이 되어(이후
  // ResizeObserver 콜백으로도 재사용) "effect 안에서 setState를 동기 호출"로
  // 오인돼 react-hooks/set-state-in-effect 린트 규칙에 걸린다. useLayoutEffect라
  // 브라우저가 그리기 전에 최종 위치가 반영돼 화면에는 깜빡임 없이 바로 최종
  // 위치로 보인다.
  useLayoutEffect(() => {
    if (!showPaletteManager) return;
    const bounds = boundsRef.current;
    if (!bounds) return;

    const recompute = () => {
      const trigger = paletteManagerTriggerRef.current;
      const panel = paletteManagerPanelRef.current;
      if (!trigger || !panel) return;

      const MARGIN = 8;
      const triggerRect = trigger.getBoundingClientRect();
      const boundsRect = bounds.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();

      const spaceBelow = boundsRect.bottom - triggerRect.bottom - MARGIN;
      const spaceAbove = triggerRect.top - boundsRect.top - MARGIN;
      const openUpward =
        panelRect.height > spaceBelow && spaceAbove > spaceBelow;

      const style: CSSProperties = { position: "fixed" };
      if (openUpward) {
        style.bottom = boundsRect.bottom - triggerRect.top;
        style.maxHeight = spaceAbove;
      } else {
        style.top = triggerRect.bottom - boundsRect.top;
        style.maxHeight = spaceBelow;
      }

      let left = triggerRect.right - boundsRect.left - panelRect.width;
      if (left < MARGIN) left = MARGIN;
      style.left = left;

      setPaletteManagerPanelStyle(style);
    };

    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(bounds);
    return () => ro.disconnect();
  }, [showPaletteManager, boundsRef]);

  // 항상 새 세트를 만든다(기존 세트를 고르고 있어도 덮어쓰지 않는다) — 세트를
  // 덮어쓰는 행동은 이름이 명확한 handleOverwriteSet으로 따로 뺐다.
  const handleSaveAsNewSet = useCallback(() => {
    if (favorites.length === 0) return;
    setSaveSetPromptOpen(true);
  }, [favorites.length]);

  const handleConfirmSaveAsNewSet = useCallback(
    (name: string) => {
      setSaveSetPromptOpen(false);
      createPaletteSet(name, favorites);
      setPaletteSets(listPaletteSets());
    },
    [favorites],
  );

  // 세트 목록의 "덮어쓰기" 아이콘이 바로 호출한다 — select로 먼저 "고르는"
  // 절차가 없어져, 대상 세트를 인자로 직접 받는다.
  const handleOverwriteSet = useCallback(
    (set: PaletteSet) => {
      updatePaletteSetColors(set.id, favorites);
      setPaletteSets(listPaletteSets());
    },
    [favorites],
  );

  // 불러오기는 지금 즐겨찾기에 세트 색을 더하는 게 아니라, 즐겨찾기 전체를
  // 세트 색으로 통째로 바꾼다 — "이 세트를 쓴다"는 뜻이 분명해지도록.
  const handleLoadSet = useCallback(
    (set: PaletteSet) => onReplaceFavorites(set.colors),
    [onReplaceFavorites],
  );

  const handleDeleteSet = useCallback((set: PaletteSet) => {
    deletePaletteSet(set.id);
    setPaletteSets(listPaletteSets());
  }, []);

  const targetHex =
    armedTarget === "primary"
      ? activeColorHex
      : armedTarget === "secondary"
        ? (secondaryColorHex ?? TRANSPARENT_HEX)
        : canvasBgColor;

  const handlePickerChange = useCallback(
    (hex: string) => {
      if (armedTarget === "primary") {
        onChangeActiveColor(hex);
        if (primaryFavoriteIndex !== null)
          onEditFavorite(primaryFavoriteIndex, hex);
      } else if (armedTarget === "secondary") {
        onChangeSecondaryColor(hex);
        if (secondaryFavoriteIndex !== null)
          onEditFavorite(secondaryFavoriteIndex, hex);
      } else {
        onChangeCanvasBgColor(hex);
      }
    },
    [
      armedTarget,
      primaryFavoriteIndex,
      secondaryFavoriteIndex,
      onChangeActiveColor,
      onChangeSecondaryColor,
      onChangeCanvasBgColor,
      onEditFavorite,
    ],
  );

  // "즐겨찾기에 추가" 버튼은 지금 색상환이 보여주는 값을 그대로 쓴다 — 이를 위해
  // targetHex를 hsv로 한 번 더 풀 필요 없이, 편집기에서 실제로 칠할 색은 항상
  // activeColorHex(주 색상)이므로 그 값을 추가 대상으로 삼는다.
  const isFull = favorites.length >= MAX_PALETTE_COLORS;

  // 스와치를 좌클릭하면 활성(주) 색상을, 우클릭하면 보조 색상(그라데이션 끝)을
  // "고르기만" 한다 — 스와치와 연결하지는 않으므로, 고른 뒤 색상환을 움직여도
  // 그 스와치의 저장값은 그대로다(그림을 그리다 살짝 색을 조정했는데 팔레트
  // 자체가 조용히 바뀌어버리는 사고를 막는다). 이전에 다른 스와치가 편집
  // 연결돼 있었다면 그 연결도 함께 끊는다.
  const pickFavorite = useCallback(
    (hex: string, target: ArmedTarget) => {
      setArmedTarget(target);
      if (target === "primary") {
        onChangeActiveColor(hex);
        setPrimaryFavoriteIndex(null);
      } else {
        onChangeSecondaryColor(hex);
        setSecondaryFavoriteIndex(null);
      }
    },
    [onChangeActiveColor, onChangeSecondaryColor],
  );

  // 더블클릭하면 그 스와치를 색상환에 "연결"한다 — 연결된 동안 색상환을
  // 움직이면 활성 색상뿐 아니라 이 스와치의 저장값 자체도 함께 바뀐다(다른
  // 에디터의 팔레트 색상 편집과 같은 방식). 색을 고르기만 할 때(단일 클릭)와
  // 분명히 구분되도록 별도 제스처로 뺐다.
  const pickFavoriteForEdit = useCallback(
    (hex: string, index: number) => {
      setArmedTarget("primary");
      setPrimaryFavoriteIndex(index);
      onChangeActiveColor(hex);
    },
    [onChangeActiveColor],
  );

  return (
    <div className="flex flex-col items-center gap-3 bg-white p-3 shadow-md">
      <div className="flex gap-2">
        <ColorPicker
          value={targetHex}
          onChange={handlePickerChange}
          alphaDisabled={armedTarget === "canvasBg"}
          eyedropperActive={tool === "eyedropper"}
          onEyedropperClick={() => onToolChange("eyedropper")}
        />

        {/* MS페인트식 주/보조 색상 겹침 사각형 — 클릭한 쪽이 지금 색상환으로
            조작하는 대상이 된다. 그 아래 직사각형은 편집기 캔버스 배경색으로,
            같은 색상환을 그대로 재사용해 편집한다. */}
        <div
          className="flex shrink-0 flex-col items-center gap-1.5"
          style={{ marginTop: 2 }}
        >
          <div className="relative h-11 w-11">
            <button
              onClick={() => setArmedTarget("secondary")}
              title="보조 색상(그라데이션 끝) — 클릭해 색상환으로 편집, 없으면 투명"
              className={`absolute right-0 bottom-0 h-7 w-7 ${
                armedTarget === "secondary"
                  ? "ring-2 ring-violet-500"
                  : "ring-1 ring-black/15"
              }`}
              style={
                secondaryColorHex
                  ? { backgroundColor: secondaryColorHex }
                  : CHECKER_STYLE
              }
            />
            <button
              onClick={() => setArmedTarget("primary")}
              title="활성 색상 — 클릭해 색상환으로 편집"
              className={`absolute top-0 left-0 h-7 w-7 ${
                armedTarget === "primary"
                  ? "ring-2 ring-violet-500"
                  : "ring-1 ring-black/15"
              }`}
              style={{ backgroundColor: activeColorHex }}
            />
          </div>
          <button
            onClick={() => setArmedTarget("canvasBg")}
            onContextMenu={(e) => {
              e.preventDefault();
              onChangeCanvasBgColor(DEFAULT_CANVAS_BG_COLOR);
            }}
            title="편집기 작업 영역 배경색(캔버스 주변) — 클릭해 색상환으로 편집 · 우클릭으로 기본 회색으로 초기화"
            className={`h-4 w-11 ${
              armedTarget === "canvasBg"
                ? "ring-2 ring-violet-500"
                : "ring-1 ring-black/15"
            }`}
            style={{ backgroundColor: canvasBgColor }}
          />
        </div>
      </div>

      <div className="relative flex w-full items-center justify-between">
        <p className="text-xs font-semibold text-gray-500">즐겨찾기</p>
        <button
          ref={paletteManagerTriggerRef}
          onClick={() => setShowPaletteManager((v) => !v)}
          title="즐겨찾기 관리(팔레트 세트 불러오기·저장·삭제)"
          className={`flex h-5 w-5 items-center justify-center ${
            showPaletteManager
              ? "bg-violet-500 text-white"
              : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          }`}
        >
          <Settings className="h-3 w-3" />
        </button>
        {/* 팔레트 세트 — 파일이 아니라 편집기 자체에 저장돼 다른 작품을
            열어도 남아 있다. 위 즐겨찾기와는 분리된 저장소로, 즐겨찾기를
            이름 붙여 저장해뒀다가 나중에 통째로 불러와 쓴다. */}
        {showPaletteManager && (
          <div
            ref={paletteManagerPanelRef}
            style={paletteManagerPanelStyle}
            className="fixed z-30 flex w-56 flex-col gap-1 overflow-hidden bg-white p-2 shadow-xl"
          >
            <p className="text-xs font-semibold text-gray-500">즐겨찾기 관리</p>
            {paletteSets.length === 0 ? (
              <p className="text-[10px] text-gray-400">저장된 세트가 없습니다</p>
            ) : (
              <div className="flex min-h-0 flex-col overflow-y-auto">
                {paletteSets.map((set) => (
                  <div key={set.id} className="group flex items-center gap-1 py-1">
                    <div className="flex shrink-0 gap-px">
                      {set.colors.slice(0, 5).map((c, i) => (
                        <span
                          key={i}
                          className="h-2.5 w-2.5"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    {set.colors.length > 5 && (
                      <span className="shrink-0 text-[8px] text-gray-400">
                        +{set.colors.length - 5}
                      </span>
                    )}
                    <span
                      className="min-w-0 flex-1 truncate text-[10px] text-gray-700"
                      title={set.name}
                    >
                      {set.name}
                    </span>
                    <button
                      onClick={() => handleLoadSet(set)}
                      title="즐겨찾기 전체를 이 세트 색으로 교체"
                      className="flex h-5 w-5 shrink-0 items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    >
                      <Download className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleOverwriteSet(set)}
                      title="이 세트를 지금 즐겨찾기 내용으로 덮어쓰기"
                      className="flex h-5 w-5 shrink-0 items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    >
                      <Save className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteSet(set)}
                      title="이 세트 삭제"
                      className="invisible flex h-5 w-5 shrink-0 items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 group-hover:visible"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={handleSaveAsNewSet}
              disabled={favorites.length === 0}
              title="지금 즐겨찾기를 새 이름의 팔레트 세트로 저장"
              className="bg-gray-100 px-1.5 py-1 text-[10px] text-gray-600 hover:bg-gray-200 disabled:opacity-30"
            >
              새로 저장
            </button>
          </div>
        )}
      </div>

      <div className="grid w-full grid-cols-6 gap-1.5">
        {favorites.map((color, index) => (
          <div key={index} className="group relative h-6 w-6">
            <button
              onClick={() => pickFavorite(color, "primary")}
              onDoubleClick={() => pickFavoriteForEdit(color, index)}
              onContextMenu={(e) => {
                e.preventDefault();
                pickFavorite(color, "secondary");
              }}
              title={`${color} — 클릭: 활성 색상으로 선택 · 더블클릭: 색상환으로 이 스와치 편집 · 우클릭: 보조 색상`}
              className={`h-6 w-6 ${
                primaryFavoriteIndex === index
                  ? "ring-2 ring-violet-500"
                  : "ring-1 ring-black/10"
              }`}
              style={{ backgroundColor: color }}
            />
            {secondaryFavoriteIndex === index && (
              <span className="absolute -right-0.5 -bottom-0.5 h-2 w-2 rounded-full bg-white shadow-[0_0_0_1px_#8b5cf6]" />
            )}
            {/* 다른 에디터의 스와치 패널처럼, 지우기는 눌러야 보이는 실수
                방지용 더블클릭 대신 마우스를 올렸을 때만 나타나는 × 버튼으로 뺀다. */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveFavorite(index);
              }}
              title="즐겨찾기에서 제거"
              className="absolute -top-1 -right-1 hidden h-3.5 w-3.5 items-center justify-center rounded-full bg-gray-700 text-white hover:bg-red-500 group-hover:flex"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        ))}
        <button
          disabled={isFull}
          onClick={() => {
            // 방금 추가한 스와치를 바로 활성 색상과 연결한다 — 추가하자마자
            // 색상환으로 이어서 다듬을 수 있다.
            setPrimaryFavoriteIndex(favorites.length);
            onAddFavorite(activeColorHex);
          }}
          title={
            isFull ? "즐겨찾기가 가득 찼습니다" : "현재 값을 즐겨찾기에 추가"
          }
          className="flex h-6 w-6 items-center justify-center bg-gray-100 text-xs text-gray-500 shadow-sm disabled:opacity-30"
        >
          +
        </button>
      </div>

      <PromptModal
        open={saveSetPromptOpen}
        title="팔레트 세트 이름"
        defaultValue={`세트 ${paletteSets.length + 1}`}
        onConfirm={handleConfirmSaveAsNewSet}
        onCancel={() => setSaveSetPromptOpen(false)}
      />
    </div>
  );
}
