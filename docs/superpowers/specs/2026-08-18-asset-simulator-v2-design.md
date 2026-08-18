# 자산 시뮬레이터 v2 재설계

이 문서는 [2026-08-18-asset-simulator-design.md](2026-08-18-asset-simulator-design.md)(v1)의 구현이 전부 끝나고 리뷰까지 마친 뒤, 사용자 피드백으로 진행한 대규모 재설계다. v1의 12개 태스크는 모두 구현·리뷰 완료되어 있고, 이 문서는 그 위에 얹는 변경 사항을 정리한다. v1 스펙에서 언급되지 않은 부분(시뮬레이션 엔진의 기본 흐름, SVG 직접 구현 방침, 세션 메모리 전용 저장 등)은 계속 유효하다.

## 이번 재설계로 되돌리는 것

**모달 테마**: v1 Task 12에서 추가한 `WorkModal.tsx`의 `theme` 분기(라이트/다크 오버라이드)를 전부 제거한다. `WorkItem.theme` 필드도 제거하고, 모든 Work는 다시 기존 다크 테마 하나만 쓴다. Work **콘텐츠 영역**(그래프·입력 카드들)은 계속 밝은 배경을 쓰되, 카테고리 색상으로 성격을 구분한다(아래 "카테고리 색상" 참조).

## 데이터 모델 변경

### Group (`types.ts`)
구조는 그대로(`{ id, name, color }`)지만, 관리 UI가 바뀐다 — 별도 "그룹" 카드가 없어지고, 자산군/고정수입 행을 추가할 때 그 자리에서 기존 그룹을 고르거나 이름을 입력해 새 그룹을 즉석 생성한다. **v2에는 그룹 삭제/이름변경 UI가 없다** — 세션 중 안 쓰는 그룹이 남아도 어떤 목록에도 안 보이므로 무해하다.

### AssetClass
```ts
type AssetClass = {
  id: string;
  name: string;
  groupId?: string;       // 필수 → 옵션으로 변경
  currency: "KRW" | "USD"; // 신규
  initialBalance: number;  // 자신의 통화 기준 금액
  annualReturnRate: number;
  isPrimary: boolean;
};
```
**기본 계좌(`isPrimary`)는 반드시 KRW 자산이어야 한다** — 수입/지출이 전부 원화 현금흐름이라, 매달 원화를 외화 잔액에 직접 더하고 빼는 통화 불일치를 피하기 위함이다. UI에서 USD 자산에는 기본 계좌 라디오를 비활성화한다.

### FixedIncome (신규 — 기존 `monthlyIncome: number` 대체)
```ts
type FixedIncome = {
  id: string;
  name: string;
  amount: number;    // KRW
  groupId?: string;   // 옵션, 목록 정리용 배지 표시에만 쓰임(차트에는 미반영)
};
```
`FixedExpense`는 구조 변경 없음(그룹 미지원 — 사용자가 요청한 건 고정수입만이었다).

### TransferRule
구조 변경 없음. **다만 UI에서 출발/도착 자산군이 서로 다른 통화면 이체 규칙을 만들 수 없게 막는다**(select 옵션 필터링 + 검증). 통화 간 이체 변환은 이번 범위 밖.

### SimulationInput
```ts
type SimulationInput = {
  groups: Group[];
  assetClasses: AssetClass[];
  fixedIncomes: FixedIncome[];      // monthlyIncome 필드 대체
  fixedExpenses: FixedExpense[];
  irregularIncomes: IrregularCashflow[];
  irregularExpenses: IrregularCashflow[];
  transferRules: TransferRule[];
  exchangeRate: number;              // KRW / 1 USD, 세션 내내 고정
};
```

### MonthSnapshot
```ts
type MonthSnapshot = {
  monthIndex: number;
  assetBalances: Record<string, number>;    // 자산 고유 통화 기준(성장률 계산용)
  assetBalancesKRW: Record<string, number>; // KRW 환산(집계·차트용)
  groupTotals: Record<string, number>;      // KRW, 그룹 있는 자산군만
  ungroupedTotalKRW: number;                 // 그룹 없는 자산군 합계(KRW) — 신규
  totalBalance: number;                      // KRW 전체 합
  flow: MonthFlow;
};
```

### 시뮬레이션 엔진 변경 (`simulation.ts`)
- 매달 성장률(`annualReturnRate/12`)은 여전히 자산의 고유 통화 기준 `assetBalances`에 적용한다.
- 매달 끝에 `assetBalancesKRW[id] = currency === "USD" ? balance * exchangeRate : balance`를 계산한다.
- `groupTotals`/`ungroupedTotalKRW`/`totalBalance`는 전부 `assetBalancesKRW`에서 계산한다.
- 수입/지출/이체 로직 자체(순서: 수입→지출→이체→성장)는 v1과 동일하다.
- **v1에서 발견된 실제 버그를 이번에 같이 고친다**: `monthIndexFromTargetDate`가 0을 반환하는(오늘 날짜) 비정기 수입/지출이 시뮬레이션 루프(`month >= 1`)에서 누락되던 문제 — 입력 단(날짜 선택기 기본값을 다음 달로, `min`도 다음 달로, 1~HORIZON_MONTHS 범위를 벗어나면 등록을 막고 안내 문구 표시)에서 해결한다.

## 카테고리 색상

| 카테고리 | 색상 |
|---|---|
| 자산군 | 인디고(`indigo-500` 계열, 기존 유지) |
| 수입(고정+비정기) | 에메랄드(`emerald-500` 계열) |
| 지출(고정+비정기) | 로즈(`rose-500` 계열) |
| 이체 규칙 | 앰버(`amber-500` 계열) |

카드 테두리·강조 버튼 색을 이 팔레트로 통일해 성격을 한눈에 구분한다.

## 입력 패널 재구성

1. **자산군** — 그룹은 인라인 선택/생성, 통화(KRW/USD) 선택 추가, 기본 계좌는 KRW만 지정 가능.
2. **고정 수입 & 고정 지출** — 색상만 통일된 독립 카드 2개(수입=에메랄드, 지출=로즈), 나란히 배치. 고정수입 행에도 그룹 배지.
3. **비정기 수입 & 비정기 지출** — 위와 동일한 패턴.
4. **이체 규칙** — 앰버 톤 단일 카드.

각 리스트(6종 전부)는 **행 클릭 시 인라인 편집**을 지원한다: 그 행의 데이터로 폼이 채워지고 "추가" 버튼이 "저장"으로 바뀌며, "취소"로 편집을 나갈 수 있다. 리스트 삭제(✕)는 v1과 동일하게 유지.

**키보드 UX**: 각 폼의 입력창에서 Enter → 그 섹션의 추가/저장 버튼과 동일 동작. 필수값이 비어 있으면 제출을 막고 그 입력창으로 포커스를 옮긴다.

## 시각화 변경

- **AssetAreaChart**: 카드 상단에 총자산 표시를 추가한다(TimelineSlider에서 이전). 그룹 없는 자산군은 "미분류" 밴드로 합산해 스택에 포함한다(중립 회색).
- **GroupDonutChart**: 그룹 탭에 "미분류"도 그룹이 하나 이상 없는 자산군이 있을 때 추가한다. 각 조각에 비율(%)뿐 아니라 KRW 환산 실제 금액도 표시한다(`formatKRW` 사용).
- **TimelineSlider**: 총자산 표시를 제거하고 시점 라벨 + 슬라이더만 남긴다.
- **ComparisonBarChart (신규, 4번째 차트)**: "지금"(0개월)과 현재 선택 시점, 두 개의 스택 막대를 그룹별 색상으로 나란히 그린다. 각 막대 위에 합계 금액을 `formatKRW`로 표시. 기존 3개 차트(AssetAreaChart, GroupDonutChart, FlowDiagram)는 그대로 두고 이 차트를 추가해 2×2 그리드로 배치한다(PC 전용이므로 폭 확장과 함께 적용).
- **FlowDiagram**: 구조 변경 없음(v1 유지).

## 숫자 축약 포맷 (`formatKRW`, 신규 유틸)

- 1억 이상: `1.1억원` (소수 첫째 자리까지)
- 1만 이상 1억 미만: `3293만원` (반올림한 정수)
- 1만 미만: `8,500원` (그대로)

차트 라벨·합계·리스트 금액 표시 등 **표시용 텍스트**에 전부 적용한다. 입력 필드 자체의 값은 그대로 숫자로 유지한다.

## 레이아웃 폭 확장

- 독립 서비스 페이지(`app/(services)/asset-simulator/page.tsx`)의 `max-w-5xl`을 더 넓은 값(`max-w-[1600px]` 등)으로 키운다.
- `AssetSimulator.tsx`의 그리드(`md:grid-cols-[320px_1fr]`)에서 입력 패널 폭을 다소 늘리고(예: 360px), 결과 영역은 4개 차트를 2×2로 배치할 수 있도록 `md:grid-cols-2`를 유지한다.
- 콘텐츠 최상단에 "자산 시뮬레이터" 제목(h2 등)을 표시한다.
- 모달 안에서의 폭은 `WorkModal.tsx`의 공통 분할 레이아웃(`md:w-[calc(80vh-64px)]`)을 따르므로 이번 변경 범위에 포함하지 않는다 — 폭 확장은 콘텐츠 내부 레이아웃과 독립 페이지에만 적용된다.

## v1 최종 리뷰에서 발견된 버그 중 이번에 같이 고치는 것

- 비정기 수입/지출이 오늘 날짜(0개월 후)로 등록되면 계산에서 누락되던 문제 (Critical) — 위 "시뮬레이션 엔진 변경"에서 해결.
- 자산군/그룹 삭제 시 그 자산을 참조하는 이체 규칙이 안 지워지던 문제, 기본 계좌 삭제 시 새 기본 계좌가 자동 지정되지 않던 문제 — `AssetSimulator.tsx`의 삭제 핸들러에서 함께 해결.
- `app/robots.ts`에 `/asset-simulator` 경로가 빠져있던 문제 — 한 줄 추가.
- `GroupAssetSection`/`TransferRuleSection`의 드롭다운이 삭제된 그룹·자산을 계속 참조하던 문제 — 그룹이 인라인으로 바뀌면서 이 컴포넌트들이 재작성되므로 자연히 해결.

## 범위 밖 (Non-goals, v2에서도 유지)

- 그룹 삭제/이름변경 UI (위에서 명시)
- 통화가 다른 자산 간 이체 변환
- 실시간 환율 조회(수동 입력 고정값만)
- localStorage 등 영속 저장, `horizonMonths` 사용자 조절, 인플레이션 반영 — v1과 동일하게 범위 밖 유지.
