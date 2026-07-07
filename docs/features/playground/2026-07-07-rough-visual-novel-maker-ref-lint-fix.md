# 비주얼 노벨 메이커 useVNStore 렌더 중 ref 접근 린트 에러 수정

`2_RoughVisualNovelMaker/useVNStore.ts`에서 ESLint 실행 시 `react-hooks/refs` 규칙 위반으로 4건의 에러가 발생했다. `useRef`로 보관한 초기 저장 데이터(`initialMeta.current`)를 `useState`의 lazy initializer 함수 안에서 읽는 패턴이 원인이었다.

React Compiler의 `react-hooks/refs` 규칙은 `useState` lazy initializer 내부에서의 ref 값 읽기도 "렌더링 중 ref 접근"으로 간주해 에러를 낸다. 컴포넌트 마운트 시 한 번만 계산되면 되는 값이라도 `useRef`에 담아 여러 초기화 함수에서 공유하는 방식은 이 규칙과 충돌한다.

해결 방법은 `useRef(loadMeta(storageKey))` 대신 `useState(() => loadMeta(storageKey))`로 초기값을 계산해, ref가 아닌 상태값으로 `initialMeta`를 관리하는 것이다. 이 값은 setter를 쓰지 않으므로 사실상 불변값이지만, `useState`의 lazy initializer 특성상 최초 렌더에서만 계산되어 동일한 목적을 달성하면서도 린트 규칙을 준수한다. 이후 `characters`, `backgrounds`, `audioTracks`, `cuts`의 초기 상태 계산과 마운트 시 blob URL 복원용 `useEffect`에서 모두 `.current` 대신 일반 변수 참조로 교체했다.

## 관련 코드
- `app/(portfolio)/playground/_sections/Works/2_RoughVisualNovelMaker/useVNStore.ts` — `initialMeta`를 `useRef`에서 `useState(() => ...)`로 교체
