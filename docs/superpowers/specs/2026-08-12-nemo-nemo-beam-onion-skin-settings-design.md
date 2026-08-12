# 네모네모빔 어니언 스킨 세부 설정 (투명도·범위)

**목표:** 어니언 스킨을 지금의 on/off 토글에서, 투명도와 범위(앞뒤 몇 프레임까지 보여줄지)를 조절할 수 있는 기능으로 확장한다. 레이어(프레임)마다 따로 설정하지 않고 전역(일괄) 값 하나로 둔다. 프레임 모드 패널에서 설정한다.

## 현재 상태

`Editor.tsx`의 `onionSkin: boolean`(기본 `true`) 하나로 켜고 끄기만 가능하다. 켜져 있으면 활성 프레임의 바로 이전·바로 다음 프레임(각각 정확히 1장, `prevVisibleFrame`/`nextVisibleFrame`)을 고정 투명도(`ONION_SKIN_OPACITY = 0.25`, `types.ts`)로 겹쳐 보여준다. `LayerPanel.tsx`의 프레임 모드 패널에 토글 버튼 하나로 노출돼 있다.

## 새 상태

`Editor.tsx`에 새 상태 두 개를 추가한다(둘 다 세션 동안만 유지 — 저장 포맷에는 들어가지 않는다, 지금 `onionSkin` 자체도 저장 안 되는 것과 같은 방식):

```ts
const [onionSkinOpacity, setOnionSkinOpacity] = useState(ONION_SKIN_OPACITY); // 0~1, 기본 0.25(지금과 동일)
const [onionSkinRange, setOnionSkinRange] = useState(1); // 1~5, 기본 1(지금과 동일 — 앞뒤 1장씩)
```

기본값이 지금 하드코딩된 동작과 완전히 같아서, 사용자가 슬라이더를 직접 조절하기 전까지는 화면에 아무 변화가 없다.

두 슬라이더 모두 지금 `onionSkin` 토글과 마찬가지로 실행취소 스택(`history`)과 무관한 순수 뷰 상태다 — 레이어 데이터가 아니므로 `pushLayerOp`나 드래그 코얼레싱(`dragCoalesceRef`)을 쓰지 않고, `onChange`에서 바로 `setOnionSkinOpacity`/`setOnionSkinRange`를 부르면 된다.

## 재생용 헬퍼와 분리

지금 `nextVisibleFrame`(단수)은 두 곳에서 쓰인다 — 어니언 스킨(다음 프레임 1장, `loop=false`)과 실제 재생 진행(`loop`을 프레임 순환 여부로 받음). 재생 진행 로직은 절대 건드리면 안 되므로, 어니언 스킨 전용으로 복수형 헬퍼를 새로 만든다(기존 `prevVisibleFrame`/`nextVisibleFrame` 코드 옆에 추가, 둘 다 그대로 둔다):

```ts
// 어니언 스킨 전용 — 현재 프레임에서 이전/다음 방향으로 최대 count장까지
// "보이는" 프레임을 가까운 순서대로 모은다. 재생(nextVisibleFrame)과 달리
// 순환하지 않는다 — 어니언 스킨은 원래 스택의 끝에서 반대편으로 넘어가
// 보여주면 오히려 혼란스럽다.
function prevVisibleFrames(
  layers: PixelLayer[],
  currentId: string,
  count: number,
): PixelLayer[] {
  const currentIndex = layers.findIndex((l) => l.id === currentId);
  const result: PixelLayer[] = [];
  for (let i = currentIndex - 1; i >= 0 && result.length < count; i--) {
    if (layers[i].visible) result.push(layers[i]);
  }
  return result;
}

function nextVisibleFrames(
  layers: PixelLayer[],
  currentId: string,
  count: number,
): PixelLayer[] {
  const currentIndex = layers.findIndex((l) => l.id === currentId);
  const result: PixelLayer[] = [];
  for (let i = currentIndex + 1; i < layers.length && result.length < count; i++) {
    if (layers[i].visible) result.push(layers[i]);
  }
  return result;
}
```

## 합성 로직 변경

`belowComposite`(이전 프레임들)와 `aboveLayers`(다음 프레임들) useMemo의 프레임 모드 분기에서, 지금 `prevVisibleFrame`/`nextVisibleFrame` 한 장만 찾아 `compositeLayers([{...prev, ...}], ...)`로 감싸던 부분을, `prevVisibleFrames`/`nextVisibleFrames`로 최대 `onionSkinRange`장을 가져와 전부 감싸는 방식으로 바꾼다. 각 프레임은 지금처럼 블렌드 모드·색보정을 무시하고(`blendMode: "normal"`, 다섯 보정 필드 `undefined`) `opacity: onionSkinOpacity`로 통일한다.

**겹치는 순서:** 가까운 프레임이 먼 프레임보다 위에(더 잘 보이게) 오도록, 배열을 "먼 프레임 → 가까운 프레임" 순서로 정렬해 넘긴다 — `prevVisibleFrames`/`nextVisibleFrames`가 돌려주는 배열은 가까운 순서이므로 뒤집어서(`.reverse()`) 쓴다.

모든 프레임이 같은 투명도라 프레임 간 그러데이션(멀수록 흐려짐)은 없다 — 이번 설계는 "단일 투명도 값"으로 확정했으므로 범위를 넓혀도 그 안의 모든 프레임이 똑같은 투명도로 보인다.

## UI — `LayerPanel.tsx`

프레임 모드 패널의 "어니언 스킨" 토글 버튼(`onToggleOnionSkin`) 다음에, **토글이 켜져 있을 때만** 두 슬라이더를 추가한다:

- **투명도**: `<input type="range" min={0} max={100}>`, 표시는 `%` — 내부적으로는 0~1 값을 100배해서 보여주고 되돌릴 때 100으로 나눈다(레이어 투명도 슬라이더와 같은 패턴).
- **범위**: `<input type="range" min={1} max={5} step={1}>`, "앞뒤 N장" 같은 라벨과 함께.

둘 다 지금 블렌드·보정 슬라이더에 쓰는 것과 같은 스타일(`accent-violet-500`, `text-[10px]`)로 맞춘다.

새 props: `LayerPanel`에 `onionSkinOpacity: number`, `onOnionSkinOpacityChange: (opacity: number) => void`, `onionSkinRange: number`, `onOnionSkinRangeChange: (range: number) => void`를 추가한다. `Editor.tsx`의 두 `<LayerPanel>` 호출부(넓은 사이드바·좁은 플로팅 패널) 모두에 연결한다.

## 영향받지 않는 것

- `prevVisibleFrame`/`nextVisibleFrame`(단수, 재생 진행용) — 전혀 손대지 않는다.
- 저장 포맷(V3) — `onionSkinOpacity`/`onionSkinRange`는 세션 상태일 뿐 `PixelArt`/`PixelLayer` 타입에 필드를 추가하지 않는다.
- 레이어 모드(`layerMode === "layers"`) — 어니언 스킨은 프레임 모드 전용 기능 그대로.
- 재생 중(`isPlaying`) 편집 잠금 등 기존 프레임 모드 컨트롤 동작 — 그대로 유지.

## 테스트 계획

자동화된 테스트 스위트가 없는 프로젝트 — `npx tsc --noEmit`·`npm run lint`·`npm run build`로 정적 검증하고, 브라우저(Playwright 임시 스크립트)로 다음을 확인한다:

1. 프레임 3장 이상인 문서를 열고 어니언 스킨을 켜면(기본값 그대로) 지금까지와 동일하게 앞뒤 1장씩만 흐리게 보이는지 확인한다(기본값 무변화 확인).
2. 범위를 3으로 올리면 활성 프레임 앞뒤로 최대 3장까지(존재하는 만큼) 유령 이미지가 보이는지, 캔버스에서 실제로 합성된 픽셀 데이터를 읽어 확인한다.
3. 투명도를 슬라이더로 조절하면(예: 50%) 유령 이미지의 실제 픽셀 알파/밝기가 그에 맞게 바뀌는지 확인한다.
4. 어니언 스킨 토글을 끄면 두 슬라이더가 사라지는지(또는 비활성화되는지) 확인한다.
5. 활성 프레임이 스택의 맨 앞/맨 뒤에 있어서 한쪽 방향에 프레임이 부족한 경우(예: 첫 프레임에서 range=3), 있는 만큼만 보여주고 에러 없이 동작하는지 확인한다.
6. 재생(▶) 버튼을 눌러 실제 재생이 정상적으로 프레임을 순환하는지(어니언 스킨 범위 확장이 재생 로직에 영향 없는지) 확인한다.
7. 레이어 모드로 전환하면 어니언 스킨 UI 자체가 안 보이는지(기존 동작 유지) 확인한다.
