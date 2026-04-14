# KnitMuffler 자유 모드 슬롯 시스템 + 대규모 리팩터링

자유 모드에 2개의 저장 슬롯을 도입하고, 컴포넌트 구조와 타입 시스템을 전면 정리했다.

## 자유 모드 슬롯 시스템

`SelectScreen`의 자유 모드 버튼을 `FreeAccordion` + `FreeSlotCard` 구조로 교체했다.

- **빈 슬롯**: 이름 입력 필드(최대 20자) + 10코/20코 토글 + 시작 버튼
- **저장된 슬롯**: 이름, 너비, 경과시간 표시 + 이어하기 버튼 + 삭제(2단계 확인)
- `FreeAccordion`은 `ModeAccordion`과 동일한 애니메이션 구조를 공유하며, 채워진 슬롯 수를 배지로 표시

슬롯 인덱스 기반 API:
```typescript
startFreeSlot(slotIndex: number, width: Width, name: string)  // 빈 슬롯에서 새 게임
resumeFreeSlot(slotIndex: number)                              // 저장된 슬롯 이어하기
```

`useKnittingGame` 내부에서 `freeSlotIndex`, `freeName` state를 유지하므로, `finishFree`/`resumeFree`/`restartFree`는 인수 없이 호출 가능하다.

## 스토리지 구조 변경

`KnitMufflerHistory.free`를 `FreeSave[]`에서 `(FreeSave | null)[]`로 변경해 슬롯 삭제를 표현한다. `JSON.stringify`는 sparse array hole을 `null`로 직렬화하므로 `JSON.parse` 후 `?? null` fallback으로 안전하게 라운드트립된다.

```typescript
export type KnitMufflerHistory = {
  [level in ChallengeLevel]: ChallengeStat[];
} & { free: (FreeSave | null)[] };
```

## 컴포넌트 구조 리팩터링

`KnitMuffler.tsx`에 혼재하던 플레이 화면 UI를 `PlayScreen.tsx`로 분리했다. `KnitMuffler.tsx`는 `useKnittingGame` 호출 + 색약 모드 state + `ColorModeContext.Provider` + 조건부 화면 렌더링만 담당하는 쉘로 축소됐다.

## 동적 그리드 너비

10코/20코 선택을 지원하기 위해 Tailwind `grid-cols-10` 대신 inline style을 사용한다.

```tsx
style={{ gridTemplateColumns: `repeat(${stitchCount}, 1fr)` }}
```

Tailwind는 빌드 타임에 사용된 클래스만 번들링하므로, 런타임에 결정되는 값은 purge 위험이 있어 inline style이 안전하다.

## Web Share API

`ShareButton`에서 클립보드 복사 fallback을 제거하고 Web Share API만 사용한다. `navigator.share` 지원 여부를 `useEffect`로 client-side에서 확인해 SSR hydration mismatch를 방지한다. 미지원 환경에서는 버튼 자체가 렌더링되지 않는다.

## 관련 코드
- `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/type.ts` — `KnitMufflerHistory` 타입 변경
- `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/useKnittingStorage.ts` — 슬롯 인덱스 기반 CRUD
- `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/useKnittingGame.ts` — `startFreeSlot`, `resumeFreeSlot` API
- `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/SelectScreen.tsx` — `FreeSlotCard`, `FreeAccordion`
- `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/PlayScreen.tsx` — 분리된 플레이 화면
- `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/KnitMuffler.tsx` — thin shell
- `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/MufflerPreview.tsx` — `stitchCount` prop 추가
