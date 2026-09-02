# 네모네모빔 편집기 — 조작별 대상 레이어(참조 레이어) + 핑퐁 재생

9-01에 "체크한 레이어에 반전·회전·이동 적용"까지 넣었는데(a5581ae), 그 체크박스가 무슨 용도인지 드러나지 않는다는 피드백에서 출발해 레이어 스코프 UX를 전면 재설계했다. 함께 재생 옵션·아이콘도 정리.

## 재생: 항상 반복 + 핑퐁

"반복" 토글을 없애고 **재생은 항상 반복**을 기본으로 했다. 그 자리에 **핑퐁** 토글 — 켜면 끝 프레임에서 처음으로 점프하지 않고 방향을 뒤집어 앞뒤로 오간다(1→2→3→2→1→2→3…).

- `nextVisibleFrame(layers, currentId, direction, pingPong)` — `direction`(1/-1) 인자 추가, `{ layer, direction }` 반환. 경계에 닿으면 pingPong이면 방향 반전, 아니면 순환. 보이는 프레임이 없을 때만 `null`(정지).
- 재생 rAF 루프에 `playbackDirRef`(1/-1), 재생 시작 시 1로 리셋.
- `PreviewPanel`도 동일하게 — 계속 증가하는 카운터를 `frameAt(counter, length, pingPong)`로 실제 프레임 위치로 변환(`pingPong`이면 `period = 2*(length-1)` 왕복 인덱스).

용어는 Aseprite가 "Ping-pong"을 쓰므로 **"핑퐁"** 으로 확정.

## 프레임 모드 스코프 버그 수정

9-01에 추가한 반전·회전·지우기·이동은 `layerMode` 가드가 없어, 프레임 모드에서 stale한 `layerScope`(문서 열 때 첫 프레임)를 대상으로 삼았다. → 프레임 모드에선 **항상 현재 프레임 하나만** 대상(`resolveScopeIds`가 `layerMode === "frames"`면 `{activeLayerId}` 반환).

## 참조 레이어(Reference Layer) — CSP 방식

레이어 행에 **`Lightbulb` 토글**(잠금·눈 옆). 켜면 그 레이어가 "참조 레이어"(`referenceLayerIds: Set<string>`, 세션 전용, 문서 열면 비움). 클립스튜디오의 "참조 레이어" 개념 그대로 — Photoshop·Krita·GIMP엔 없고 CSP·MediBang만 쓰는 per-layer 플래그.

## 도구·조작마다 자기 대상 레이어

전역 하나가 아니라 **조작마다 따로** 저장한다(CSP도 도구별 Tool Property에 저장).

- `sampleScopes: Record<"eyedropper" | "wand" | "bucket", LayerScope>`
- `transformScopes: Record<"clear" | "flipH" | "flipV" | "rotateCcw" | "rotateCw" | "align" | "move", LayerScope>`
- `LayerScope = "active" | "reference" | "all"` — 활성 레이어 / 참조 레이어 / 보이는 레이어 전부
- `resolveScopeIds(scope)` 헬퍼 하나로 각 핸들러가 자기 대상 id 집합을 해석

### 판정 도구 (스포이트·마법봉·페인트통)

도구 옵션 바(하단 플로팅)에 `판정 대상 [활성] [참조] [전체]` 세그먼트. 도구를 바꾸면 그 도구에 저장된 값이 뜬다(스포이트=전체인 채로 마법봉으로 가면 마법봉의 값 표시).

판정 픽셀은 Editor의 `sampleComposite`가 결정 — active면 `null`(PixelCanvas가 편집 중 레이어 픽셀 사용), all이면 `compositePixels`, reference면 참조 레이어만 `compositeLayers`. **참조인데 지정된 참조 레이어가 없으면** 빈 그리드를 넘겨 아무것도 못 집게 하고, 도구 옵션 패널 **바로 위**에 경고를 띄운다(폴백 안 함).

### 변형 (지우기·반전H·반전V·회전↺·회전↻·정렬)

새 **"변형" 툴바 카드** — 예전엔 지우기만 편집 카드, 나머지는 "더보기" 팝오버라 대상 설정 위치가 어긋나 있었다.

각 버튼은 **분할 버튼**:
- 아이콘 클릭 → 현재 대상으로 실행
- 옆 캐럿(▾) → `활성 레이어 / 참조 레이어 / 전체 레이어` 드롭다운
- 아이콘 밑 작은 점이 현재 대상 색(회색=활성, violet=참조, 하늘=전체)
- 툴팁: `좌우 반전 · 대상: 참조 레이어`
- 대상="참조"인데 참조 레이어 없으면 그 버튼의 실행만 비활성

### 이동 도구

`transformScopes.move` 별개 상태. 이동 도구 선택 시 하단 옵션에 `이동 대상 [활성] [참조] [전체]`(선택 카드에 있어 "변형" 카드가 멀기 때문).

## 구조 정리

- **PixelCanvas**: `scopeBelowComposite` · `scopeAboveLayers` · `activeLayerInScope` 3-prop → `sampleComposite: PixelValue[] | null` 하나. `getFullComposite()`가 `sampleComposite ?? workingRef.current`로 단순화 — 활성 레이어 z순서 기준 부분 합성 로직이 통째로 사라졌다(전체 합성만 있으면 됨).
- **`layerScope` Set → `sampleScopes`/`transformScopes` Record + `referenceLayerIds` Set**로 분리.
- **`TOOLBAR_COMPACT_WIDTH` 1140 → 1210**: "변형" 카드로 툴바가 넓어져 rootW ~1185부터 줄바꿈이 시작되는데 compact는 1140에서 켜져 그 사이가 2줄이었다. 실측(Playwright로 카드 top 좌표 비교)해 상향 + 좁을 때 "변형" 카드를 `변형 ▾` 버튼 하나로 축소 → rootW 808~1543 전 구간 1줄 유지.

## 자잘한 것

- 아래로 병합 아이콘 `Combine` → `ArrowDownToLine`(관용 글리프).
- 레이어 행 잠금↔눈 아이콘 간격 축소(`w-6` → `w-5`, gap 없는 그룹).
- 선택 영역(마스크)은 "어느 픽셀"(캔버스 좌표), 레이어 스코프는 "어느 레이어" — 축이 달라 곱해진다. 레이어별 마스크를 두는 에디터는 없다(레이어 마스크는 별개 개념).

## 관련 코드

- `apps/services/components/works/5_PixelArtMaker/Editor.tsx` — `sampleScopes` · `transformScopes` · `referenceLayerIds`, `resolveScopeIds`, `sampleComposite`, 핸들러별 대상 해석, 참조 없음 경고 오버레이, 핑퐁 재생
- `apps/services/components/works/5_PixelArtMaker/DrawToolbar.tsx` — `SegmentedControl` · `ScopedActionButton`(분할 버튼) · `TransformButtons`, "변형" 카드, compact 축소
- `apps/services/components/works/5_PixelArtMaker/LayerPanel.tsx` — `Lightbulb` 참조 레이어 토글, 잠금·눈 간격, "핑퐁" 라벨, 병합 아이콘
- `apps/services/components/works/5_PixelArtMaker/PixelCanvas.tsx` — `sampleComposite` 1-prop, `getFullComposite` 단순화
- `apps/services/components/works/5_PixelArtMaker/PreviewPanel.tsx` — `frameAt` 핑퐁 인덱스
- `apps/services/components/works/5_PixelArtMaker/types.ts` — `LayerScope` · `SampleScopeTool` · `TransformScopeKey`, `TOOLBAR_COMPACT_WIDTH`

`nextVisibleFrame`(방향·핑퐁 인자 추가)은 `Editor.tsx` 내부 모듈 함수다. `pixelGrid.ts`는 `rotate90InPlace` 주석 한 줄만 바뀌었다.
