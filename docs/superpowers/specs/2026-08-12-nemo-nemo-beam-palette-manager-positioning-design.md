# 네모네모빔 — 즐겨찾기 관리 드롭다운 위치 계산 개선

**목표:** "즐겨찾기 관리" 드롭다운 패널이 사이드바에 새 스크롤을 만들거나 편집창 밖으로 잘려 나가지 않도록, 열 때마다 남은 공간을 실제로 재보고 위치·최대 높이를 계산해서 연다.

## 현재 상태(문제)

패널은 `position: absolute`로, 톱니바퀴 버튼을 감싼 `relative` 라벨 줄 안에 떠 있다(`ColorWheel.tsx:267,283`). 이 라벨 줄은 `Editor.tsx:2701`의 사이드바(`w-56 ... overflow-y-auto`) 안에 있다. `overflow-y-auto`는 이 사이드바만 자기 안에서 스크롤되게 하려는 의도적 설계다(`Editor.tsx:2690-2695` 주석 — 캔버스까지 포함한 줄 전체가 스크롤되는 걸 막기 위해 각 사이드바만 따로 스크롤되게 함).

문제는 `absolute` 요소가 일반 흐름에서는 빠지지만, 가장 가까운 스크롤 가능한 조상(overflow: auto인 사이드바)의 스크롤 영역 계산에는 그대로 들어간다는 점이다. 저장된 팔레트 세트가 많아 패널이 세로로 길어지면, 사이드바의 스크롤 가능 범위가 그만큼 늘어나 사이드바 자체에 스크롤이 새로 생긴다 — 애초에 막으려던 바로 그 현상이다.

## 목표 동작

1. 패널을 열 때마다 실제 남은 공간을 측정해 위치·최대 높이를 정한다 — 화면(편집창) 크기가 어떻든 잘리거나 편집창 경계를 벗어나지 않는다.
2. 패널이 사이드바의 스크롤 영역에 전혀 기여하지 않는다 — 이 드롭다운 때문에 사이드바에 새 스크롤이 생기는 일이 없다.
3. 세트가 아주 많아 계산된 최대 높이로도 다 못 보여줄 때만, 목록 부분이 자체적으로 스크롤된다(사이드바나 페이지가 아니라 목록 안에서만) — 이건 정보가 실제로 넘칠 때의 최후 수단이지, 지금 겪는 문제와는 다른 종류다.

## 접근 방식 — `position: fixed` + 편집창 루트 기준 좌표

패널을 `absolute`에서 `fixed`로 바꾸고, 좌표를 편집창 루트(`Editor.tsx`의 `rootRef`, `pam-editor` 클래스가 붙은 그 div) 기준 상대좌표로 계산한다. 이 앱은 이미 `ContextMenu`에서 똑같은 문제를 풀어본 전례가 있다(`Editor.tsx:2307-2351`, `openFileMenu`/`openEditMenu`) — 편집창 루트에 `transform: scale(...)`이 걸려 있어(작은 화면에서 letterbox/축소 대응), `fixed` 좌표는 뷰포트가 아니라 이 루트 기준으로 계산해야 버튼 바로 아래에 정확히 자리 잡는다. 계산 관례를 그대로 따른다: `x = rect.left - rootRect.left`, `y = rect.bottom - rootRect.top`.

`fixed`로 바꾸면 두 가지가 동시에 해결된다:

- **사이드바 스크롤 문제가 애초에 사라진다.** `fixed` 요소의 containing block은(transform이 걸린) 편집창 루트이지 사이드바가 아니므로, 사이드바의 `overflow-y-auto` 스크롤 영역 계산에 전혀 들어가지 않는다.
- **편집창 밖으로 새지 않는다.** 편집창 루트 자체가 `overflow-hidden`(`Editor.tsx:2432`)이라, 계산이 어긋나는 극단적 경우에도 패널이 편집창 바깥으로 삐져나오지 않고 잘린다 — 다만 이건 안전망이고, 아래 충돌 회피 알고리즘이 정상적으로는 잘림 자체가 일어나지 않게 한다.

## 컴포넌트 인터페이스 변경

`ColorWheel`에 새 prop을 추가한다:

```ts
boundsRef: React.RefObject<HTMLDivElement | null>;
```

`Editor.tsx`에서 기존 `rootRef`를 그대로 넘긴다 — `ReferenceWindow`의 `boundsRef`(`Editor.tsx:3426`), `ImportPanel`의 `containerRef`(`Editor.tsx:2875`)와 같은 이미 있는 관례다.

## 충돌 회피 알고리즘

패널을 열 때 자연 높이를 미리 알 수 없으므로(세트 개수·이름 줄바꿈에 따라 달라짐) 2단계로 처리한다: ① `showPaletteManager`가 켜지면 일단 기본값(아래로, `maxHeight` 없음)으로 패널을 마운트한다. ② `useLayoutEffect`가 마운트 직후(브라우저가 화면에 그리기 전) 패널 자신의 `getBoundingClientRect()`(자연 높이)와 트리거 버튼·`boundsRef.current`의 `getBoundingClientRect()`를 읽어 최종 위치·방향·`maxHeight`를 계산해 적용한다. `useLayoutEffect`라 사용자 눈에는 깜빡임 없이 바로 최종 위치로 보인다. 여백 상수 `MARGIN = 8`(px)을 편집창 경계에서 항상 띄운다.

**세로:**
- `spaceBelow = boundsRect.bottom - triggerRect.bottom - MARGIN`
- `spaceAbove = triggerRect.top - boundsRect.top - MARGIN`
- 패널의 자연 높이가 `spaceBelow`보다 크고, `spaceAbove`가 `spaceBelow`보다 크면 위쪽으로 뒤집는다. 그 외에는 아래로 연다.
- 아래로 열 때: `top = triggerRect.bottom - rootRect.top`, `maxHeight = spaceBelow`.
- 위로 열 때: `bottom = rootRect.bottom - triggerRect.top`, `maxHeight = spaceAbove`.
- 세트 목록 부분에 `overflow-y-auto`를 둬서, 목록 자체 높이가 배정된 `maxHeight`를 넘을 때만 그 안에서 스크롤된다("새로 저장" 버튼은 항상 보이도록 목록 바깥에 둔 지금 구조를 유지한다).

**가로:** 지금처럼 트리거 버튼 오른쪽 끝에 패널 오른쪽 끝을 맞추는 걸 기본으로 하되, 그 결과 패널 왼쪽 끝이 편집창 왼쪽 경계(`+ MARGIN`)보다 왼쪽으로 나가면 패널을 오른쪽으로 밀어 왼쪽 끝이 `rootRect.left + MARGIN`에 오도록 고정한다(아주 좁은 편집창 대응).

**리사이즈 대응:** 패널이 열려 있는 동안 편집창 크기가 바뀌면 위 계산을 다시 한다 — `narrow` 상태 감지에 이미 쓰는 것과 같은 `ResizeObserver` 패턴을 `boundsRef.current`에 붙인다.

## 영향받지 않는 것

- 바깥 클릭으로 안 닫히는 것 — 그대로 유지.
- 행 레이아웃(스와치 미리보기·이름·아이콘 3개), 삭제 호버 동작, `handleLoadSet`/`handleOverwriteSet`/`handleDeleteSet` 로직 — 전혀 손대지 않는다.
- 패널의 시각적 스타일(배경색·그림자·패딩·`w-56` 너비) — 위치 계산 방식만 바뀐다.

## 테스트 계획

자동화된 테스트 스위트가 없는 프로젝트 — `npx tsc --noEmit`·`npm run lint`·`npm run build`로 정적 검증하고, 브라우저(Playwright 임시 스크립트)로 다음을 확인한다:

1. 평범한 화면 크기에서 톱니바퀴를 누르면 패널이 버튼 바로 아래에 뜨고, 사이드바에 새 스크롤이 생기지 않는지 확인한다(사이드바의 `scrollHeight`가 열기 전후로 그대로인지 직접 비교).
2. 팔레트 세트를 아주 많이(예: 15개 이상) 저장해둔 상태에서 패널을 열면, 사이드바가 아니라 세트 목록 부분만 자체적으로 스크롤되는지 확인한다.
3. 편집창을 세로로 작게 줄이고 사이드바 하단 쪽에서(스크롤해서) 톱니바퀴를 눌러, 아래 공간이 부족할 때 패널이 위쪽으로 뒤집혀 열리는지 확인한다.
4. 편집창을 아주 좁게 줄인 상태에서 패널을 열어, 패널이 편집창 왼쪽 경계 밖으로 나가지 않고 안쪽으로 당겨지는지 확인한다.
5. 패널이 열린 상태에서 브라우저 창 크기를 바꾸면 위치가 다시 계산돼 편집창 경계를 벗어나지 않는지 확인한다.
6. 어떤 경우에도 패널의 일부가 편집창 루트 경계(`getBoundingClientRect`) 밖으로 나가지 않는지(포함 관계) DOM에서 직접 확인한다.
7. 기존 동작(패널 열기/닫기, 세트별 불러오기·덮어쓰기·삭제, 빈 상태 안내문, 새로 저장)이 이번 변경 이후에도 그대로 동작하는지 회귀 확인한다.
