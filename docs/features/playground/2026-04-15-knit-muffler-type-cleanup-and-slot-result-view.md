# KnitMuffler 타입 정리 및 슬롯 결과 화면 연동

## 타입 일관성 정리

네 가지 문제를 순서대로 해소했다.

**ColorDef 중복 제거**
`data.ts`와 `ColorModeContext.tsx`에 동일한 타입이 각각 local로 정의되어 있었다. `data.ts`의 정의를 `export type ColorDef`로 공개하고 `ColorModeContext.tsx`에서 import하도록 변경했다.

**Medal 타입 위치 통일**
`Medal = "gold" | "silver" | "bronze" | null` 타입이 `utils.ts`에 정의되어 있어, `SelectScreen.tsx`가 `Medal as MedalType`으로 alias import해야 했다. 타입을 `type.ts`로 이동하고 `utils.ts`에서 import해 사용하는 방식으로 전환했다. alias 불필요.

**PlayScreen colorMode prop 제거**
`KnitMuffler.tsx`가 `ColorModeContext.Provider`로 `colorMode`를 공급하면서 동시에 `PlayScreen`에 prop으로도 전달하는 이중 구조였다. `PlayScreen`이 `useColorPalette()` hook을 직접 사용하도록 변경하고 prop을 제거했다.

**ChallengeCtx export 제거**
`useKnittingGame.ts`에서 `export type ChallengeCtx`로 공개되어 있었지만 외부에서 import하는 파일이 없었다. `export` 키워드만 제거해 내부 전용임을 명확히 했다. `type.ts`로 이동하지 않은 이유는 `Draft` 타입을 참조하므로 `type.ts → data.ts → type.ts` 순환 의존이 발생하기 때문이다.

## 슬롯 클릭 → 결과 화면 이동

기존에는 채워진 자유 모드 슬롯을 클릭하면 플레이 화면으로 바로 이동했다. 이를 결과 화면으로 먼저 진입해 저장된 작품을 확인한 뒤 "이어 뜨기" 또는 "다시 시작"을 선택할 수 있도록 변경했다.

`viewFreeSave(slotIndex)` 함수를 `useKnittingGame`에 추가했다. `resumeFromFreeSave`와 동일하게 rows/elapsed를 state에 로드하되, 마지막에 `setScreen("result")`를 호출하는 것만 다르다.

`FreeSlotCard`의 채워진 슬롯 UI도 재구성했다. 카드 전체를 버튼으로 감싸는 대신 `div` 래퍼 + 미리보기 `button` + 삭제 `button` 구조로 분리했다. 삭제는 기존과 동일하게 2-step confirm을 유지한다.

## 관련 코드
- `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/type.ts` — `Medal` 타입 추가
- `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/utils.ts` — `Medal` 타입 제거, `type.ts`에서 import
- `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/ColorModeContext.tsx` — local `ColorDef` 제거
- `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/PlayScreen.tsx` — `colorMode` prop 제거, `useColorPalette()` 사용
- `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/useKnittingGame.ts` — `viewFreeSave` 추가, `ChallengeCtx` export 제거
- `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/SelectScreen.tsx` — `FreeSlotCard` UI 재구성, `onView` prop 교체
