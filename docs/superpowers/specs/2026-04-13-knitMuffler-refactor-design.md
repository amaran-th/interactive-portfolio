# KnitMuffler 리팩토링 설계

**날짜:** 2026-04-13  
**범위:** `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/`  
**목표:** 기능 변경 없이 데이터 구조 개선 + 컴포넌트 구조 분리

---

## 1. 상태 구조 개선

### 1-1. Challenge state 통합

**Before:** 3개의 분리된 state
```typescript
const [challengeLevel, setChallengeLevel] = useState<ChallengeLevel | null>(null);
const [challengeDraftKey, setChallengeDraftKey] = useState<string | null>(null);
const [challengeDraft, setChallengeDraft] = useState<number[][]>(...);
```

**After:** 단일 nullable 객체
```typescript
type ChallengeCtx = {
  level: ChallengeLevel;
  draftKey: string;
  draft: number[][];
};

const [challengeCtx, setChallengeCtx] = useState<ChallengeCtx | null>(null);
```

- `challengeCtx === null`이면 자유 모드 또는 선택 화면
- `startChallenge`에서 세 값을 한 번에 설정
- `ResultModal`, `SelectScreen` 호출 시 구조분해해서 전달

### 1-2. Knitting state → `useReducer`

**Before:** 4개의 분산된 state + `currentStitch`(중복)
```typescript
const [knittedRows, setKnittedRows] = useState<Stitch[][]>([]);
const [currentRow, setCurrentRow] = useState<Stitch[]>([]);
const [currentStitch, setCurrentStitch] = useState(0); // 항상 currentRow.length
const [currentRowEverKnitted, setCurrentRowEverKnitted] = useState(false);
```

**After:** reducer 단일 관리, `currentStitch` 제거
```typescript
type KnittingState = {
  knittedRows: Stitch[][];
  currentRow: Stitch[];          // currentStitch = currentRow.length로 파생
  currentRowEverKnitted: boolean;
};

const INITIAL_STATE: KnittingState = {
  knittedRows: [],
  currentRow: [],
  currentRowEverKnitted: false,
};

type KnittingAction =
  | { type: "KNIT"; stitch: Stitch }
  | { type: "UNRAVEL"; mode: Mode }
  | { type: "RESET" }
  | { type: "LOAD_ROWS"; rows: Stitch[][] };
```

**Reducer 동작:**
- `KNIT`: stitch를 currentRow에 추가. `currentRow.length === STITCH_COUNT`이면 행 완성 후 reset
- `UNRAVEL` (free): currentRow 끝 제거. 비어있으면 이전 knittedRow 복원
- `UNRAVEL` (challenge): `currentRowEverKnitted`가 false이면 이전 행 마지막 stitch 제거. true이면 currentRow 끝 제거
- `RESET`: INITIAL_STATE 반환
- `LOAD_ROWS`: knittedRows만 지정, 나머지 초기화 (자유 모드 이어뜨기용)

### 1-3. Timer API 개선

**Before:** `resetKey`(증가 트릭) + `elapsedOffset` 분리 관리
```typescript
const [resetKey, setResetKey] = useState(0);
const [elapsedOffset, setElapsedOffset] = useState(0);
const rawElapsed = useTimer(started, resetKey);
const elapsed = elapsedOffset + rawElapsed;
```

**After:** `reset(base?)` 함수 반환
```typescript
function useTimer(running: boolean): { elapsed: number; reset: (base?: number) => void }
```

- `timer.reset()` — 일반 리셋 (elapsed → 0)
- `timer.reset(savedElapsed)` — 자유 모드 이어뜨기 (저장된 값부터 재시작)
- 내부 구현: `baseRef` + `countRef`로 offset 관리, setInterval은 기존과 동일

`resetKnitting`이 `timer.reset()`을 함께 호출하도록 변경.

---

## 2. 컴포넌트 구조 분리

### 2-1. 파일 목록 변화

| 파일 | 변화 | 예상 줄 수 |
|------|------|-----------|
| `KnitMuffler.tsx` | thin shell로 축소 | ~60줄 |
| `PlayScreen.tsx` | **신규** — play UI 전담 | ~250줄 |
| `useKnittingGame.ts` | reducer + timer 개선 + free 로직 흡수 | ~250줄 |
| `useTimer.tsx` | reset 함수 반환 방식으로 변경 | ~30줄 |
| `SelectScreen.tsx` | 변경 없음 | — |
| `ResultModal.tsx` | 변경 없음 | — |
| `useKnittingStats.tsx` | 변경 없음 | — |

### 2-2. `KnitMuffler.tsx` (thin shell)

책임:
- `colorMode` state + `ColorModeContext.Provider`
- `useKnittingGame()` 호출
- `screen`에 따라 분기 렌더
  - `"select"` → `<SelectScreen>`
  - `"play"` / `"result"` → `<PlayScreen>` (result 때 ResultModal overlay 포함)

### 2-3. `PlayScreen.tsx` (신규)

현재 `KnitMuffler.tsx`에서 play 관련 JSX 전부 이동:
- 상단 House / RotateCcw 버튼
- 타이틀 (mode/level 표시)
- 자유 모드 저장하기 버튼 (우상단)
- 모바일 / 데스크탑 Status 패널 (챌린지 모드만)
- 모바일 / 데스크탑 도안 패널 (챌린지 모드만)
- 목도리 스크롤 영역 (`MufflerPreview`) — scrollRef 포함
- 색상 팔레트 (`palette` useMemo 포함)
- 풀기(Backspace) 버튼
- `ResultModal` overlay (screen === "result"일 때)
- `useResultExport()` 호출 (ResultModal에 ref/handler 전달)

Props: `useKnittingGame` 반환값 + `colorMode`

---

## 3. Free mode 저장 로직 이동

현재 `KnitMuffler.tsx`에 직접 작성된 4개 handler를 `useKnittingGame.ts`로 이동:

| 기존 (KnitMuffler.tsx) | 이동 후 (useKnittingGame.ts) |
|----------------------|---------------------------|
| `handleStartFree` | `startFree()` |
| `handleFinishFree` | `finishFree()` |
| `handleResumeFree` | `resumeFree()` |
| `handleRestartFree` | `restartFree()` |

각 함수 내부에서 `getFreeSave()`, `saveFreeMuffler()`, `clearFreeSave()`를 직접 호출.  
`KnitMuffler.tsx`는 이 함수들을 props로 `PlayScreen`/`SelectScreen`에 전달만 함.

---

## 4. 변경되지 않는 것

- **기능:** 챌린지 모드, 자유 모드, 저장, 이어뜨기, 다시 만들기, 결과 저장, 공유, 기록 초기화, 키보드 단축키, 메달 시스템 — 모두 동일
- **외부 API:** `useKnittingStats`, `utils`, `data`, `type`, `useKnittingStorage` 의 공개 타입/함수 시그니처 유지
- **Dead code 제거:** `useKnittingGame`의 `generatedDraft` — 어디서도 사용되지 않으므로 삭제
- **UI/스타일:** 클래스명, 레이아웃, 반응형 동작 그대로 유지
