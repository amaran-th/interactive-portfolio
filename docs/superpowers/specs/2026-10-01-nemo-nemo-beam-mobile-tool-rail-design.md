# 네모네모빔 모바일 도구 선택 UI 재설계 (세로 도구 열) 설계 문서

## 배경

2026-09-26에 모바일 도구 UI를 하단 독의 "도구" 탭 → 팝오버(7개 아이콘 줄 + 하위
옵션 자동 표시) 구조로 새로 짰다(`2026-09-26-nemo-nemo-beam-mobile-toolbar-design.md`).
사용자 피드백: 이 구조는 여전히 데스크탑 도구 카드를 그대로 팝오버에 욱여넣은
모양이고, "도구" 탭을 눌러야만 도구를 바꿀 수 있어 실제 드로잉 앱(ibisPaint·
미디방페인트 등)과는 다르다. 그리는 도중 도구 전환은 몇 초에 한 번씩 일어나는
가장 빈번한 조작인데, 매번 팝오버를 열어야 하는 건 그 앱들이 피하는 마찰이다.

## 목표

자주 쓰는 도구(연필·지우개·채우기·선택·올가미·이동·자동 선택)를 캔버스 가장자리에
항상 떠 있는 세로 아이콘 열로 옮겨, 팝오버를 열지 않고 탭 한 번으로 도구를
바꿀 수 있게 한다. 하단 독은 색상·레이어·더보기 3개로 줄어든다.

## 범위

- 모바일(`narrow`, `NARROW_BREAKPOINT` 미만) 도구 선택 UI만 대상. 데스크탑
  `DrawToolbar` 렌더링(`mobileLayout` 미지정 시 동작)은 전혀 건드리지 않는다.
- "더보기 > 편집"(격자·십자선·지우기·반전·회전·정렬)은 이미 하단 독 더보기
  탭에 있고 이번 변경과 무관 — 그대로 둔다.
- 색상·레이어 패널, 하단 독의 나머지 팝오버 동작은 변경하지 않는다.

## 전체 구조

캔버스 영역(`MobileEditorShell.tsx`의 `<div className="relative flex min-h-0
flex-1 overflow-hidden">{canvas}</div>`) 안에, 캔버스와 나란히(형제 노드로)
새 세로 도구 열을 절대 위치로 띄운다. 이 div가 이미 `relative`이므로 도구 열은
`absolute`로 이 컨테이너 기준 좌표에 앉는다 — 화면 전체 기준 `fixed`보다
정확하고, 상단 바·하단 독과 자동으로 안 겹친다.

```
┌────────────────────────────┐  ← 상단 바(파일명·되돌리기 등, 변경 없음)
│┌─┐                         │
││●│  (연필, 활성)            │
││○│  (지우개)                │
││○│  (채우기)                │
││○│  (선택)                  │
││○│  (올가미)                │
││○│  (이동)                  │
││○│  (자동 선택)              │
││+│  (도형·텍스트·그라데이션)  │
│└─┘         canvas          │
└────────────────────────────┘
 [색상]   [레이어]   [더보기]   ← 하단 독(도구 탭 제거, 3개로 축소)
```

도구 열 안의 아이콘을 탭하면 그 아이콘 오른쪽에 하위 옵션(브러시 크기·채우기
모드·선택 모드 등) 또는 5개 추가 도구 그리드가 플라이아웃으로 펼쳐진다.

## 컴포넌트 구성

### 새 파일: `MobileToolRail.tsx`

`DrawToolbar.tsx`는 이미 927줄로 크고, 도구별 하위 옵션 계산(`secondarySections`
빌드 로직)은 desktop·mobile이 완전히 동일하게 공유해야 한다 — 그 계산 자체는
`DrawToolbar.tsx`에 그대로 두고, **mobile 전용 렌더링 결과물만** 별도 파일
`MobileToolRail.tsx`로 뺀다. `DrawToolbar.tsx`는 `mobileLayout`일 때 이 컴포넌트를
호출하는 얇은 브랜치만 갖는다.

```ts
// MobileToolRail.tsx
export default function MobileToolRail({
  primaryTools,   // drawCardTools와 동일한 7개 배열(펜슬~자동 선택) — DrawToolbar가 이미 만드는 값 그대로 전달
  moreTools,      // COLLAPSIBLE_DRAW_TOOLS 5개 배열 — 그대로 전달
  tool,           // 현재 활성 도구
  onToolChange,   // (tool: Tool) => void
  optionsContent, // React.ReactNode | null — 현재 tool의 secondarySectionsNode, 그대로 전달
}: {
  primaryTools: { tool: Tool; icon: typeof Paintbrush; label: string; key: string }[];
  moreTools: { tool: Tool; icon: typeof Paintbrush; label: string; key: string }[];
  tool: Tool;
  onToolChange: (tool: Tool) => void;
  optionsContent: React.ReactNode;
})
```

`optionsContent`는 `secondarySectionsNode`를 그대로 받는다 — 그 값은 이미
`secondarySections.length > 0 ? (...) : null`로 계산되므로(`DrawToolbar.tsx`
735번 줄), 옵션이 없으면 정확히 `null`이 온다. 별도의 `hasOptions` 플래그를
두지 않고 `optionsContent !== null`을 그대로 그 신호로 쓴다 — 두 값이 어긋날
여지를 없앤다.

내부 상태: `openFlyout: "tool" | "more" | null` (컴포넌트 자신의 `useState`).

**동작:**
- 세로 열의 도구 아이콘 `t`를 탭: `onToolChange(t)` 호출. 그다음 `t === tool`이고
  이미 `openFlyout === "tool"`이면 `null`로 토글(닫기) — 이미 선택된 도구를 다시
  탭한 경우. 그 외(다른 도구를 새로 고른 경우)에는 `optionsContent !== null`일
  때만 `"tool"`로 연다(옵션이 없는 도구는 플라이아웃을 열지 않는다 — 아래 "옵션
  없는 도구" 참고).
- 맨 아래 "+" 탭: `openFlyout`을 `"more"`과 `null` 사이로 토글.
- "+" 그리드 안의 도구 `t`를 탭: `onToolChange(t)` 호출 후, 다음 렌더에서
  `optionsContent !== null`이면 `"tool"`로(그 도구의 옵션 플라이아웃으로 바로
  이어짐), 아니면 `null`로 닫는다. `t`를 선택한 시점엔 아직 이전 도구의
  `optionsContent`가 props에 남아 있으므로, 이 판단은 `onToolChange` 호출 후
  갱신된 `optionsContent`를 반영하는 `useEffect([tool])`에서 수행한다(탭
  핸들러 안에서 곧바로 판단하지 않는다).
- 배경(백드롭) 탭: `openFlyout`을 `null`로.

**렌더링(레이어 순서, 아래에서 위로):**
1. 캔버스(`z-0`, 기존과 동일)
2. 백드롭 — `openFlyout !== null`일 때만 `fixed inset-0 z-10` 투명 레이어,
   탭하면 `openFlyout`을 `null`로(`DrawToolbar.tsx`의 `ScopedActionButton`이
   이미 쓰는 것과 같은 패턴: `<div className="fixed inset-0 z-30"
   onClick={() => setOpen(false)} />`, 새 패턴을 만들지 않는다 — z-index 값만
   이 컴포넌트의 레이어 체계에 맞춘다)
3. 도구 열 — `absolute left-2 top-1/2 -translate-y-1/2 z-20 flex flex-col
   gap-1.5 p-1.5` + `FLOATING_PANEL`(`panelStyles.ts`, 불투명 흰 배경 + 테두리 +
   그림자 — 반투명 재질이 아니라 "캔버스 위에 뜬다"는 배치만 오버레이로 한다,
   이유는 아래 "스타일" 참고). 7개 도구 버튼 다음 구분선(`h-px bg-gray-200`)
   하나, 그다음 "+" 버튼. 백드롭(z-10)보다 위라 열려 있는 동안에도 항상
   클릭 가능하다.
4. 플라이아웃(옵션 또는 "+" 그리드) — 도구 열과 같은 `z-20`, 열 오른쪽
   `absolute left-full top-0 ml-2` + `FLOATING_PANEL`. `openFlyout === "tool"`
   이면 `optionsContent`를 그대로 렌더링(내용 자체는 `DrawToolbar`가 만들어
   내려주는 기존 `secondarySectionsNode` — 브러시 크기·채우기 옵션·그라데이션·
   선택 모드 등, 로직 변경 없음). `openFlyout === "more"`이면 같은 자리에
   `moreTools` 5개를 아이콘 그리드로(2~3열, 각 버튼 동일 `h-11 w-11
   rounded-xl`).
- 각 버튼: `h-11 w-11 rounded-xl` (44px, 기존 `ToolButton`의 `h-8 w-8` 각진
  사각형보다 크고 둥글게 — 터치 기준). 활성 상태는 기존 `ToolButton`과 동일하게
  `bg-violet-500 text-white`, 비활성은 `bg-gray-100 text-gray-600`.

### 옵션 없는 도구

7개 기본 도구는 전부 최소 하나의 `secondarySections` 항목을 갖지만(펜슬·지우개:
브러시 크기, 채우기: 대상 레이어, 선택·올가미·자동 선택: 선택 옵션, 이동: 대상
레이어), **"+" 뒤의 5개 중 "텍스트"는 `secondarySections`에 해당하는 항목이
없다**(`BRUSH_SIZE_TOOLS`·`SHAPE_TOOLS`·`GRADIENT_SHAPE_TOOLS`·
`SAMPLE_SCOPE_TOOLS`·`SELECT_LIKE_TOOLS`·`move` 분기 어디에도 `"text"`가 없음).
텍스트를 고르면 `optionsContent`가 `null`이므로 플라이아웃 없이 도구만 바뀐다 —
빈 플라이아웃 패널이 뜨는 걸 막기 위해 반드시 이 값으로 분기해야 한다.

### `DrawToolbar.tsx` 변경

- 도구 메타데이터·`secondarySections`/`secondarySectionsNode` 계산 로직은 전혀
  바꾸지 않는다.
- `mobileLayout`일 때의 반환 JSX(현재 748~926번 줄 — "그리기" `ToolCard` 아이콘
  줄 + `<div className="px-3 pb-1.5">{secondarySectionsNode}</div>`)를
  `<MobileToolRail>` 호출로 교체한다:
  ```tsx
  if (mobileLayout) {
    return (
      <MobileToolRail
        primaryTools={drawCardTools}
        moreTools={COLLAPSIBLE_DRAW_TOOLS}
        tool={tool}
        onToolChange={onToolChange}
        optionsContent={secondarySectionsNode}
      />
    );
  }
  ```
  (desktop 쪽 나머지 return 블록은 그대로 유지 — 이 분기가 함수 위쪽에서 먼저
  걸러지므로 아래 desktop JSX는 지금과 동일하게 동작한다.)
- 이 교체로 `ToolCard`/`ToolButton`은 desktop 전용이 되고, `showMoreDrawTools`
  state·"더보기" 버튼(그리기 카드 안)도 desktop(`compact`) 전용으로 남는다 —
  `mobileLayout`이 그 변수들을 더 이상 읽지 않게 된다.

### `MobileEditorShell.tsx` 변경

- 하단 독에서 "도구" 버튼(`toolsBtnRef`, `PopoverKind`의 `"tools"`)과 관련
  분기(`popoverContent`의 `openPopover === "tools"` 케이스, `toolsBtnRef`)를
  제거한다. `PopoverKind`는 `"color" | "layers" | "more" | null` 4종에서
  3종으로 줄어든다.
- 하단 독 바(`flex items-center justify-around ...`)에서 "도구" `<button>`을
  제거 — 색상·레이어·더보기 3개만 남는다(`justify-around`가 자동으로 3개
  기준으로 재배치하므로 폭 계산 로직 변경 불필요).
- `toolPanel` prop은 그대로 받되, 더 이상 팝오버 콘텐츠로 쓰지 않고 캔버스
  래퍼 안에 항상 렌더링한다:
  ```tsx
  <div className="relative flex min-h-0 flex-1 overflow-hidden">
    {canvas}
    {toolPanel}
  </div>
  ```
  (`toolPanel`은 `Editor.tsx`가 만드는 `<DrawToolbar mobileLayout={narrow}
  .../>` 그대로 — `mobileLayout`이 true이므로 위 `DrawToolbar` 변경에 따라
  이미 `<MobileToolRail>`을 반환한다. prop 인터페이스는 안 바뀐다.)

### `Editor.tsx` 변경

없음. `toolPanel` 구성(2828~2872번 줄)과 `<MobileEditorShell toolPanel=
{toolPanel} .../>` 전달은 지금과 동일 — `MobileEditorShell`이 그 노드를 어디에
꽂는지만 바뀐다.

## 스타일

- 도구 열·플라이아웃 모두 `panelStyles.ts`의 `FLOATING_PANEL`(불투명 흰 배경 +
  `ring-1 ring-gray-300` + 그림자)을 그대로 쓴다. 반투명(알파 블렌딩) 배경은
  쓰지 않는다 — 이 프로젝트의 `FLOATING_PANEL` 자체가 "흰 배경 위에 흰 패널이
  떠도 경계가 또렷하도록" 불투명 + 테두리로 설계돼 있고(`panelStyles.ts` 주석),
  반투명으로 하면 캔버스 그림이 아이콘 위에 비쳐 오히려 식별성이 떨어진다.
  "오버레이"라는 의도는 캔버스 레이아웃을 안 밀어내고 그 위에 뜬다는 배치로
  충분히 달성된다.
- 버튼 크기: `h-11 w-11`(44px), `rounded-xl`. 기존 데스크탑 `ToolButton`의
  `h-8 w-8`(32px) 각진 사각형과 달리 손가락 터치 기준 크기·둥근 모서리로 키운다.
- 아이콘 자체 크기는 기존과 동일하게 `h-4 w-4`(버튼이 커진 만큼 아이콘 주변
  여백이 늘어난다).

## 데이터 흐름 / 상태

새로 추가되는 상태는 `MobileToolRail` 내부의 `openFlyout`뿐이다. 그 외 모든
도구 상태(`tool`, `brushSize`, `selectMode`, `sampleScope`, `transformScopes`
등)는 지금과 동일하게 `Editor.tsx`가 소유하고 `DrawToolbar` props로 흘러
들어온다 — 이 설계는 순수하게 mobile 프레젠테이션 레이어 교체다.

## 테스트 / 검증 계획

자동 테스트가 없는 프로젝트라(`CLAUDE.md`) `tsc`/`lint` + 브라우저 수동 검증으로
확인한다:
- 세로 열 7개 아이콘 탭 → 도구 전환 + 해당 옵션 플라이아웃 자동 표시(펜슬→
  브러시 크기, 채우기→대상 레이어, 선택/올가미/자동 선택→선택 옵션, 이동→대상
  레이어).
- 이미 활성인 도구를 다시 탭 → 플라이아웃만 토글.
- "+" 탭 → 5개 도구 그리드, 그중 "텍스트" 선택 → 플라이아웃 없이 도구만 전환
  (옵션 없음 케이스), 나머지 4개(직선/사각형/원/그라데이션) 선택 → 옵션
  플라이아웃으로 자동 전환.
- 배경 탭 → 열린 플라이아웃 닫힘, 열 자체는 유지.
- 하단 독에 "도구" 버튼이 없고 색상/레이어/더보기 3개만 있음.
- 데스크탑(`narrow=false`) 화면은 기존 그대로(도구 카드 3개, 팝오버 위치 등)
  — 회귀 없음을 스크린샷으로 확인.

## 범위 밖 (이번에 다루지 않음)

- 캔버스에 실제로 그리기 시작(pointerdown)하면 열린 플라이아웃을 자동으로
  닫는 것 — 있으면 좋지만 이번 설계엔 포함하지 않는다. 필요하면 별도 후속
  작업으로.
- 도구 열 자체의 위치를 사용자가 드래그해 옮기거나 오른쪽으로 바꾸는 설정 —
  왼쪽 고정으로만 간다.
- 세로 공간이 아주 부족한 화면(가로 모드 등)에서 7+1개 버튼이 넘칠 때의
  스크롤 처리 — `overflow-y-auto max-h-full`로 안전장치만 두고, 실제 넘치는
  기기에서의 세밀한 조정은 하지 않는다.
