# 네모네모빔 — 레이어 판정 범위 체크박스 + 콘텐츠 중앙 정렬 설계

## 배경

레이어 스택이 생긴 뒤, 스포이트·마법봉·페인트통 세 도구는 항상 "화면에 보이는 전체 레이어를 합성한 결과" 기준으로 색/영역을 판정한다(`PixelCanvas.tsx`의 `getFullComposite`). 레이어를 여러 장 쓰는 작업에서는 이게 항상 원하는 동작은 아니다 — 지금 그리고 있는 레이어만 보고 판정하고 싶을 때가 있다.

또한 이미지를 불러오거나 그리다 보면 실제 그림(불투명 픽셀)이 캔버스 중앙에서 벗어나 있는 경우가 많은데, 이를 한 번에 가운데로 옮기는 기능이 없다(Piskel의 "정렬" 기능과 동일한 요구).

두 요구를 하나의 메커니즘으로 묶는다: `LayerPanel`의 레이어 목록에 체크박스를 추가하고, 이 체크 집합이 (1) 스포이트·마법봉·페인트통의 판정 범위와 (2) 정렬 대상 레이어를 동시에 결정한다.

## 대상 파일

`app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/`
- `pixelGrid.ts` — 정렬용 순수 함수 `unionBoundingBox`, `shiftPixels` 추가
- `Editor.tsx` — `layerScope` 상태, scope 합성(`scopeBelowComposite`/`scopeAboveLayers`) 계산, `handleAlignLayers` 핸들러
- `PixelCanvas.tsx` — `getFullComposite`가 scope 합성을 쓰도록 수정, 새 props 3개(`scopeBelowComposite`, `scopeAboveLayers`, `activeLayerInScope`) 추가
- `LayerPanel.tsx` — 레이어 행에 체크박스 추가, 헤더에 "정렬" 버튼 추가

`compositeLayers`, `compositeLayerRange`, `mergeColors` 등 기존 합성/병합 함수는 변경 없음(그대로 재사용).

## 상태 모델 — `layerScope`

`Editor.tsx`에 세션 전용(저장 안 함) 상태를 추가한다:

```ts
const [layerScope, setLayerScope] = useState<Set<string>>(
  () => new Set([initialLayerState.activeLayerId]),
);
```

- 문서를 열 때(새 캔버스 생성, 파일 열기, 탭 전환 등 `history.reset`이 호출되는 모든 지점) `{ 그 시점의 활성 레이어 id }` 하나로 다시 초기화한다.
- 활성 레이어를 바꿔도(`onSelect`) `layerScope`는 건드리지 않는다 — 완전히 독립적인 상태다.
- 레이어가 삭제되면 그 id가 `layerScope`에 남아 있어도 상관없다 — 아래 모든 소비처가 `history.presentLayers`와 교집합을 취하는 방식으로 쓰기 때문에 존재하지 않는 id는 자연히 무시된다. 별도의 정리(cleanup) 로직을 두지 않는다.
- 레이어 모드에서만 의미가 있다(`layerMode === "layers"`) — 프레임 모드에서는 아래 서술할 scope 합성 계산 자체가 기존 온리언 스킨 로직을 그대로 통과시킨다.
- **레이어 조작이 `layerScope`에 미치는 영향(2026-08-07 최종 리뷰에서 드러난 gap을 메움):** 새로 만들어진 id를 활성 레이어로 삼는 조작(레이어 추가·복제)은 그 새 id를 기존 `layerScope`에 **추가**한다 — 사용자가 아직 존재하지도 않던 레이어를 미리 체크/해제할 방법이 없었으므로, "새로 만든 레이어는 기본으로 내 도구가 보는 대상"이 되는 게 자연스럽다. 평탄화는 기존 레이어를 전부 새 id 하나로 합치므로, `layerScope`를 그 결과 레이어 하나로 완전히 **교체**한다(기존 체크 상태를 이어받을 대상 자체가 사라지기 때문). 반대로 **기존** 레이어의 id를 그대로 넘겨받거나(병합 시 "아래 레이어"의 id를 유지) 다른 기존 레이어를 활성으로 삼는 조작(병합·삭제 후 남은 레이어로 활성 전환)은 `layerScope`를 건드리지 않는다 — 이미 사용자가 체크 여부를 정할 기회가 있었던 레이어이므로 `onSelect`로 활성 레이어만 바꿀 때와 같은 취급이다.

## 판정 범위 — 스포이트·마법봉·페인트통

> 이 절은 2026-08-06 브레인스토밍 도중 다른 세션이 병합한 블렌드 모드·색보정 기능(커밋 `2e4d035` 등)에 맞춰 갱신되었다. 초안 시점에는 `aboveComposite: PixelValue[] | null`(미리 평탄화한 배열)이었지만, 지금은 `aboveLayers: PixelLayer[] | null`(원본 레이어 배열)이다 — 위쪽 레이어마다 자기 블렌드 모드를 실제 배경 위에서 계산해야 해서, 미리 하나로 합치면(빈 캔버스 위에서 합치는 셈이라) 블렌드 결과가 달라지기 때문이다. `below`는 자신보다 위에 있는 것과 무관하게 결과가 고정되므로 여전히 미리 평탄화한 배열로 남아 있다.

### `Editor.tsx` — scope 합성 계산

기존 `belowComposite`/`aboveLayers`(화면 렌더링용, 변경 없음) 바로 옆에 병렬로 계산한다:

```ts
const scopeBelowComposite = useMemo(() => {
  if (layerMode === "frames") return belowComposite; // 프레임 모드는 scope 개념 없음, 기존 그대로
  const scoped = history.presentLayers
    .slice(0, activeLayerIndex)
    .filter((l) => layerScope.has(l.id));
  return compositeLayers(scoped, doc.width, doc.height);
}, [layerMode, belowComposite, history.presentLayers, activeLayerIndex, layerScope, doc.width, doc.height]);

const scopeAboveLayers = useMemo((): PixelLayer[] | null => {
  if (layerMode === "frames") return aboveLayers; // 프레임 모드는 scope 개념 없음, 기존 그대로
  const slice = history.presentLayers
    .slice(activeLayerIndex + 1)
    .filter((l) => layerScope.has(l.id));
  return slice.length > 0 ? slice : null;
}, [layerMode, aboveLayers, history.presentLayers, activeLayerIndex, layerScope]);

const activeLayerInScope =
  layerMode === "frames" ? true : layerScope.has(history.activeLayerId);
```

`compositeLayers`는 빈 배열을 넘기면 완전히 투명한 그리드를 돌려준다(기존 동작, 변경 불필요) — 체크된 레이어가 하나도 없으면 `scopeBelowComposite`는 빈 그리드, `scopeAboveLayers`는 `null`이 되고, `activeLayerInScope`가 `false`면 판정 결과는 "완전히 투명"이 된다. 이 경우를 위한 별도 분기는 필요 없다 — 아래 `getFullComposite`가 자연히 그렇게 동작한다.

이 두 값과 `activeLayerInScope`를 `PixelCanvas`에 새 props로 내려준다(기존 `belowComposite`/`aboveLayers`/`activeLayerOpacity`/`activeLayerBlendMode`/`activeLayerAdjustments`/`activeLayerLocked` 옆에 나란히).

### `PixelCanvas.tsx` — `getFullComposite` 수정

현재(`PixelCanvas.tsx:872-908`)는 `belowComposite`/`aboveLayers`/`activeLayerOpacity`/`activeLayerBlendMode`/`activeLayerAdjustments`를 조합한다(활성 레이어 자신의 블렌드 모드·보정을 반영하고, 위 레이어들은 `compositeLayersOnto`로 각자의 블렌드 모드를 실제 배경 위에서 순서대로 적용). 같은 조립 순서를 scope 값으로 교체한다:

```ts
const getFullComposite = useCallback((): PixelValue[] => {
  const base = scopeBelowComposite
    ? scopeBelowComposite.slice()
    : createGrid(width, height);
  if (!activeLayerInScope) {
    return scopeAboveLayers && scopeAboveLayers.length > 0
      ? compositeLayersOnto(base, scopeAboveLayers)
      : base;
  }
  const withActive = compositeOnto(
    base,
    workingRef.current,
    activeLayerOpacity,
    activeLayerBlendMode,
    activeLayerAdjustments,
  );
  return scopeAboveLayers && scopeAboveLayers.length > 0
    ? compositeLayersOnto(withActive, scopeAboveLayers)
    : withActive;
}, [
  scopeBelowComposite,
  scopeAboveLayers,
  activeLayerInScope,
  activeLayerOpacity,
  activeLayerBlendMode,
  activeLayerAdjustments,
  width,
  height,
]);
```

이 함수는 기존 `getFullComposite`를 **대체**한다(같은 이름, 같은 위치 — 새 함수를 추가하는 게 아니라 기존 구현을 이 내용으로 바꾸는 것). 호출부(스포이트 `:936`, 페인트통 `:999` 등, 마법봉 `:1026-1027`)는 그대로 `getFullComposite()`를 부르기만 하면 되므로 수정 불필요 — 함수 내부 구현만 바뀐다.

**주의:** 페인트통이 실제로 픽셀을 쓰는 대상(`workingRef.current`, 활성 레이어)은 이 변경과 무관하게 항상 그대로다. `layerScope`는 "어디까지를 같은 영역/색으로 볼지" 판정에만 관여하고, 실제 쓰기 대상에는 관여하지 않는다. 화면 렌더링(`belowComposite`/`aboveLayers`를 쓰는 기존 render 로직)은 이번 변경으로 전혀 달라지지 않는다.

## 정렬 — `unionBoundingBox` / `shiftPixels`

`pixelGrid.ts`에 두 순수 함수를 추가한다(기존 `flipHorizontal`/`rotate90` 등 변환 함수들 근처):

```ts
// 여러 레이어의 불투명 픽셀을 하나의 집합으로 보고 그 경계 상자를 구한다.
// 전부 완전히 투명하면(정렬할 내용이 없으면) null을 돌려준다.
export function unionBoundingBox(
  pixelLists: PixelValue[][],
  width: number,
  height: number,
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const pixels of pixelLists) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (pixels[y * width + x] === null) continue;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (minX === Infinity) return null;
  return { minX, minY, maxX, maxY };
}

// pixels를 (dx, dy)만큼 평행이동한 같은 크기의 새 그리드를 돌려준다.
// 캔버스 밖으로 나가는 픽셀은 잘리고, 새로 드러나는 자리는 투명(null)으로 채운다.
export function shiftPixels(
  pixels: PixelValue[],
  width: number,
  height: number,
  dx: number,
  dy: number,
): PixelValue[] {
  const out = new Array<PixelValue>(width * height).fill(null);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcX = x - dx;
      const srcY = y - dy;
      if (srcX < 0 || srcY < 0 || srcX >= width || srcY >= height) continue;
      out[y * width + x] = pixels[srcY * width + srcX];
    }
  }
  return out;
}
```

### `Editor.tsx` — `handleAlignLayers`

기존 `handleFlattenLayers`(`Editor.tsx:1920-1931`)와 같은 패턴 — 대상 레이어들을 새 배열로 만들어 `pushLayerOp` 한 번으로 실행취소 스택에 올린다:

```ts
const handleAlignLayers = useCallback(() => {
  const targets = history.presentLayers.filter((l) => layerScope.has(l.id));
  if (targets.length === 0) return;
  const box = unionBoundingBox(
    targets.map((l) => l.pixels),
    doc.width,
    doc.height,
  );
  if (!box) return; // 체크된 레이어가 전부 투명 — 정렬할 내용 없음
  const contentW = box.maxX - box.minX + 1;
  const contentH = box.maxY - box.minY + 1;
  const dx = Math.floor((doc.width - contentW) / 2) - box.minX;
  const dy = Math.floor((doc.height - contentH) / 2) - box.minY;
  if (dx === 0 && dy === 0) return; // 이미 중앙
  const nextLayers = history.presentLayers.map((l) =>
    layerScope.has(l.id)
      ? { ...l, pixels: shiftPixels(l.pixels, doc.width, doc.height, dx, dy) }
      : l,
  );
  pushLayerOp(nextLayers, history.activeLayerId);
}, [history.presentLayers, layerScope, doc.width, doc.height, pushLayerOp]);
```

## UI — `LayerPanel.tsx`

- 레이어 모드 헤더 행(`LayerPanel.tsx:155-164`, 지금 "평탄화" 버튼이 있는 자리)에 같은 스타일의 "정렬" 텍스트 버튼을 추가한다. `disabled` 조건은 없음(레이어 1장이어도 정렬은 유효한 동작).
- 각 레이어 행(`LayerPanel.tsx:169` 이하 `.map`) 맨 앞, 썸네일 왼쪽에 체크박스를 추가한다. `checked={layerScope.has(layer.id)}`, `onChange`는 새 prop `onToggleScope(id)`를 호출 — 클릭 시 행 전체의 `onClick={() => onSelect(layer.id)}`(활성 레이어 전환)가 같이 발동하지 않도록 `e.stopPropagation()`을 건다(기존 잠금 버튼 등과 같은 패턴, `LayerPanel.tsx:207-209` 참고).
- 체크박스에 title로 "판정·정렬 범위에 포함" 정도의 짧은 설명을 단다.

## 범위 밖

- 프레임 모드(애니메이션)에서의 판정 범위·정렬 — 이번 스코프에 포함하지 않는다(위 "상태 모델" 절 참고).
- `layerScope`를 저장 포맷(V3 등)에 반영하는 것 — 세션 전용 상태로 남긴다.
- 정렬 시 캔버스 크기 자체를 내용에 맞게 줄이거나 늘리는 것(Piskel의 "내용에 맞게 캔버스 크기 조정"과는 다른 기능) — 이번 요청은 "기존 캔버스 안에서 가운데로 옮기기"만 다룬다.
