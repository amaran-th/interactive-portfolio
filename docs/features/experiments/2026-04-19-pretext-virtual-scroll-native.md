# Pretext 실험 — Example 2 가상 스크롤 Native 구현 전환

## 개요

Example 2(가상 스크롤 벤치마크)의 세 가지 구현 모드를 라이브러리 의존도 기준으로 재설계했다. 기존에는 세 모드 모두 `@tanstack/react-virtual`을 사용했으나, 변경 후에는 두 번째 모드만 라이브러리를 사용한다.

| 모드 | 변경 전 | 변경 후 |
|------|---------|---------|
| Native | @tanstack + 고정 estimateSize | @tanstack 없음, 직접 구현 |
| @tanstack/react-virtual | @tanstack + scrollToIndex | 동일 (유지) |
| Pretext | @tanstack + Pretext heights | @tanstack 없음, 직접 구현 |

## Native 모드 구현 상세

### 가상 스크롤 동작 원리
- `scrollTop` state를 스크롤 이벤트로 갱신하고, 이진 탐색으로 가시 범위(startIndex ~ endIndex)를 계산
- 아이템은 `position: absolute`로 `translateY(offset)`에 배치
- `offsets` 배열: 측정된 높이가 있으면 실측값, 없으면 `ESTIMATED_ITEM_HEIGHT`(50px) 사용

### DOM 보정 로직
아이템이 뷰포트에 진입하면 `ResizeObserver`가 실제 높이를 측정하고, 측정값이 바뀐 경우 `measuredState`를 갱신해 오프셋을 재계산한다. `startIndex` / `endIndex`가 바뀔 때마다 observer를 재구성해 새로 진입한 아이템도 즉시 관찰 대상에 포함시킨다.

### texts 리셋 처리
`measuredState`에 `{ texts, heights }` 형태로 texts 참조를 함께 보관한다. 렌더 중 `measuredState.texts !== texts`이면 `measuredHeights`를 빈 객체로 파생해, texts 변경 시 측정값을 안전하게 초기화한다.

## Pretext 모드 구현 상세

Pretext로 사전 계산된 heights 배열로 전체 오프셋을 한 번에 계산하고, 이진 탐색으로 가시 범위를 찾는다. `measureElement` 단계가 없으므로 추정–측정–보정 사이클이 없고, 처음부터 정확한 `scrollTop`으로 점프할 수 있다.

## linter 이슈 해결

`react-hooks/set-state-in-effect` 규칙은 `useEffect`/`useLayoutEffect` 본문에서 `setState`를 직접 호출하는 것을 금지한다. 이 규칙을 만족하면서 DOM 측정 후 상태를 갱신하려면, setState 호출을 외부 시스템 콜백 안에 두어야 한다. `ResizeObserver` 콜백은 외부 시스템 구독으로 분류되므로 허용된다.

## 관련 코드
- `app/(experiments)/pretext/_sections/example2/VirtualListDOMNaive.tsx` — Native 가상 스크롤 (ResizeObserver 보정)
- `app/(experiments)/pretext/_sections/example2/VirtualList.tsx` — Pretext 가상 스크롤 (라이브러리 없음)
- `app/(experiments)/pretext/_sections/example2/BenchmarkPanel.tsx` — 모드 레이블 업데이트
- `docs/blog/pretext.md` — 블로그 포스팅 초안 (세 구현 방식 상세 설명 포함)
