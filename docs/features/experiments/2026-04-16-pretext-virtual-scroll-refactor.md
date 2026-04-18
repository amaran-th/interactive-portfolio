# pretext 실험 페이지 — Example 2 리팩터링

Example 2(가상 스크롤 점프 데모)의 세 VirtualList 컴포넌트 간 공통 로직과 UI 구조를 추출했다.

## 추출한 공통 요소

**`useJumpWithScrollCount` (hooks.ts)**
세 컴포넌트 모두에 인라인으로 중복되어 있던 점프 + 스크롤 이벤트 카운팅 로직을 훅으로 추출했다. `doScroll` 콜백을 ref로 보관해 effect 의존성 없이 항상 최신 값을 참조한다.

```ts
useJumpWithScrollCount(parentRef, jumpTarget, onJumpComplete, onScrollCount, doScroll)
```

**`findIndexFromScrollTop` (hooks.ts)**
BenchmarkPanel에 인라인으로 정의되어 있던 유틸 함수를 hooks.ts로 이동하고 export했다. `gap` 파라미터에 `ITEM_GAP` 기본값을 부여해 호출부를 단순화했다.

**`VirtualListShell.tsx`**
세 컴포넌트가 동일하게 갖고 있던 외부 wrapper → ListHeader → 스크롤 컨테이너 구조를 컴포넌트로 추출했다. `parentRef`, `totalSize`, `children`을 props로 받는다.

**`ListHeader.tsx`**
도트 인디케이터 + 라벨 + "렌더 수 / 전체" 표시 헤더.

**`styles.ts`**
- `BASE_ITEM_STYLE` — 세 컴포넌트가 공유하는 position/typography/box 속성
- `itemBackgroundColor(index)` — 골든 앵글(137.5°) HSL 분포로 인덱스마다 다른 배경색 반환

## 컴포넌트별 차이점

| | estimateSize | measureElement | 점프 방식 |
|---|---|---|---|
| VirtualList | `heights[index]` (pretext 사전 계산) | 없음 | `scrollToIndex` |
| VirtualListDOM | `ESTIMATED_ITEM_HEIGHT` | `getBoundingClientRect().height` | `scrollToIndex` (보정 사이클) |
| VirtualListDOMNaive | `ESTIMATED_ITEM_HEIGHT` | `getBoundingClientRect().height` | 직접 `scrollTop` 할당 (보정 없음) |

VirtualListDOM과 VirtualListDOMNaive는 점프 방식이 근본적으로 달라(라이브러리 보정 유무가 데모의 핵심 비교 포인트) 별도 파일로 유지하고, 공통 구조만 VirtualListShell로 통합했다.

## 관련 코드
- `app/(experiments)/pretext/_sections/example2/hooks.ts` — 훅 및 유틸
- `app/(experiments)/pretext/_sections/example2/styles.ts` — 공통 스타일 상수
- `app/(experiments)/pretext/_sections/example2/VirtualListShell.tsx` — 공통 UI 쉘
- `app/(experiments)/pretext/_sections/example2/ListHeader.tsx` — 공통 헤더
- `app/(experiments)/pretext/_sections/example2/VirtualList.tsx`
- `app/(experiments)/pretext/_sections/example2/VirtualListDOM.tsx`
- `app/(experiments)/pretext/_sections/example2/VirtualListDOMNaive.tsx`
