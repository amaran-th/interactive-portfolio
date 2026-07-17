# 네모네모빔 편집기 개선 — 레퍼런스 창, 확대경, 선택 되돌리기, 반응형 레이아웃

네모네모빔(`5_PixelArtMaker/`) 편집기를 실사용 가능한 수준으로 다듬는 과정에서 나온 여러 개선과, 그 과정에서 반복적으로 마주친 CSS 버그 패턴을 정리한다.

## 레퍼런스 창 (`ReferenceWindow.tsx`)

- Editor 레벨로 옮겨 여러 개를 동시에 띄울 수 있게 하고, `zIndex`·`spawnIndex` prop으로 항상 다른 모든 요소보다 앞에 오면서 순서대로 계단식(cascade)으로 배치되게 했다.
- 자체 스포이트(색상 추출)에 확대경을 붙였다.
- `clampPos`를 단순화해 제목 표시줄의 최소 16px만 편집기 안에 남으면 되는 것으로 완화했다.

## 확대경 위치 버그 (`Magnifier.tsx`)

편집기 루트(`.pam-editor`)가 열림/닫힘 전환을 위해 `scale-100`/`scale-95` 같은 Tailwind transform 클래스를 갖고 있는데, CSS 스펙상 `transform`이 `none`이 아닌 조상은 그 자체가 `position: fixed` 자손의 containing block이 된다 — 즉 `scale(1)`처럼 시각적으로는 항등이어도 `top`/`left`는 진짜 뷰포트가 아니라 그 조상 기준으로 계산된다. 이 세션에서 레퍼런스 창, 확대경 두 곳에서 이 버그를 마주쳤고, 확대경은 `createPortal(..., document.body)`로 조상을 완전히 벗어나는 방식으로, 레퍼런스 창은 지역 좌표계로 변환하는 방식으로 각각 해결했다.

스포이트 커서와 확대경 사이 간격(`CURSOR_OFFSET`)은 20 → 8 → 4로 단계적으로 줄여, 스포이트 커서 자체의 지름(8px)만큼만 띄우도록 맞췄다.

## 그라데이션 다이얼 공용화 (`GradientDial.tsx`)

텍스트 도구 하위 툴바를 다른 도구(카드 UI)와 일관되게 재정비하면서, DrawToolbar에 중복 구현돼 있던 그라데이션 방향 다이얼을 `GradientDial` 컴포넌트로 추출해 DrawToolbar·PixelCanvas(텍스트 도구) 양쪽에서 공유하게 했다. 선택 도구 하위 옵션도 "더보기" 팝오버 대신 구분선(`h-7 w-px bg-gray-200`)으로 한 카드 안에 병합했다.

## 선택 영역을 포함한 되돌리기/다시하기

`useCanvasHistory`의 `Snapshot`은 `{pixels, size}`만 가진 픽셀 전용 스택이라, 선택 영역(mask)을 여기 결합하면 이동과 무관한 다른 되돌리기 단계에서도 선택이 잘못 복원된다. 대신 Editor.tsx에 별도의 병렬 스택(`moveSelectionUndoRef`/`moveSelectionRedoRef`)을 두고, `undefined`를 "이 단계는 선택과 무관"이라는 센티널로 써서 이동(move) 커밋에서만 실제 마스크(`Set<number> | null`)를 채워 넣었다. 이렇게 하면 일반 그리기 작업의 되돌리기에는 영향을 주지 않으면서, 선택 영역을 옮긴 뒤 되돌리면 그 선택도 같이 원래대로 돌아온다.

## 데스크톱 아이콘 더블클릭 지터

파일을 더블클릭해 열 때도 매번 `pointerdown`이 드래그 핸들러를 거치는데, 두 클릭 사이 손이 한두 픽셀만 흔들려도 즉시 드래그로 취급돼 아이콘이 미세하게 밀렸다. `Math.hypot(dx,dy)` 누적 이동량이 `MOVE_THRESHOLD`(4px)를 넘을 때만 위치를 갱신·저장하도록 해 해결했다(`Desktop.tsx`).

## 반응형 좁은 폭 레이아웃

편집기 폭이 `NARROW_BREAKPOINT`(820px, `types.ts`) 아래로 좁아지면 여러 UI가 함께 반응하도록 만들었다. 이 기준은 브라우저 뷰포트가 아니라 편집기 자신의 `clientWidth`를 `ResizeObserver`로 재는 것이라 letterbox 레이아웃에서도 정확하다.

- **DrawToolbar**: 도형·텍스트·그라데이션 도구가 "더보기" 팝오버 뒤로 접힌다.
- **이미지 불러오기/내보내기 사이드바**: 기존 `w-60` 아코디언 두 개가 아이콘 두 개(📥/📤)로 줄고, 클릭하면 캔버스 위로 플로팅 팝업이 뜬다(`Editor.tsx`, `openFloatingPanel` 상태).
- **전체 여백·간격**: 메인 콘텐츠 줄의 `p-4/gap-4`, 사이드바의 `gap-3`, DrawToolbar 줄의 `p-3/gap-3`, 각 도구 카드(`ToolCard`)의 `p-2/gap-1.5`가 모두 narrow일 때 한 단계씩 좁은 값으로 바뀐다.

narrow 상태는 원래 DrawToolbar 안에서 자체적으로 측정했지만, 사이드바도 같은 기준을 따라야 해서 Editor.tsx로 끌어올려 한 번만 측정하고 `narrow` prop으로 DrawToolbar에 내려주는 구조로 바꿨다 — 두 컴포넌트가 각자 재는 방식이었다면 리사이즈 타이밍에 따라 기준이 미세하게 어긋날 수 있었다.

## 미해결

사용자가 채팅에 붙여넣은 배경화면 JSON(32×18, 576개 픽셀 값)을 기본 배경화면으로 설정해 달라는 요청은, 수동 전사가 두 번 다 개수가 틀려(578개, 568개) 보류 중이다. 파일 경로를 받아 직접 읽는 방식으로 처리할 예정.

## 관련 코드
- `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/ReferenceWindow.tsx` — 다중 레퍼런스 창, 지역 좌표 변환
- `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/Magnifier.tsx` — `document.body` 포털, `CURSOR_OFFSET`
- `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/GradientDial.tsx` — 공용 그라데이션 방향 다이얼
- `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/DrawToolbar.tsx` — 도구 카드, narrow 접힘, 선택 옵션 병합
- `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/Editor.tsx` — 선택 되돌리기 병렬 스택, narrow 상태 측정, 이미지 불러오기/내보내기 플로팅 팝업
- `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/Desktop.tsx` — 더블클릭 지터 방지 임계값
- `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/types.ts` — `NARROW_BREAKPOINT` 공용 상수
