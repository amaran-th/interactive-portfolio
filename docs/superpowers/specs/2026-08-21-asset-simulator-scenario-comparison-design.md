# 자산 시뮬레이터: 시나리오 비교 UI

이 문서는 v1, v2, v3 1·2라운드, 그리고 v3 3라운드 전반부(누적 이력 패널 + 레이아웃 개편 + 차트 범례, 2026-08-21 완료)가 전부 구현·리뷰 완료된 뒤 진행하는 v3 3라운드의 나머지 절반이다. 여러 수입·지출·이체·자산 설정을 서로 다른 시나리오로 저장해두고 동시에 비교할 수 있게 한다.

## 목표

- 자산(계좌·그룹)까지 포함한 전체 설정을 시나리오 단위로 여러 벌 만들고, 탭으로 전환하며 각각 독립적으로 편집할 수 있게 한다.
- 모든 시나리오의 총자산 추이를 하나의 그래프에 겹쳐 그려 한눈에 비교할 수 있게 한다.

## 데이터 모델

### Scenario (신규)

```ts
export type Scenario = {
  id: string;
  name: string;
  groups: Group[];
  assetClasses: AssetClass[];
  incomes: IncomeItem[];
  expenses: ExpenseItem[];
  transferRules: TransferRule[];
  exchangeRate: number;
  goal: Goal | null;
};
```

`AssetSimulator.tsx`가 지금 개별 `useState`로 들고 있는 `groups`/`assetClasses`/`incomes`/`expenses`/`transferRules`/`exchangeRate`/`goal`이 전부 이 타입 안으로 흡수된다. `today`, `horizonYears`(→`horizonMonths`), `selectedMonth`는 시나리오와 무관하게 계속 최상위 공유 상태로 남는다 — 모든 시나리오가 같은 시점·같은 범위를 기준으로 비교되어야 하기 때문이다(2번째 브레인스토밍 질문에서 확정).

### AssetSimulator 최상위 상태 변경

```ts
const [scenarios, setScenarios] = useState<Scenario[]>([
  { id: newId(), name: "시나리오 1", groups: [], assetClasses: [], incomes: [], expenses: [], transferRules: [], exchangeRate: 1350, goal: null },
]);
const [activeScenarioId, setActiveScenarioId] = useState(scenarios[0].id);
```

처음 로드 시 시나리오 1개로 시작해, 기존 단일-시나리오 동작과 화면상 완전히 동일하다(탭 바 자체는 보이지만 시나리오가 하나뿐이면 삭제 버튼이 비활성화된다).

기존의 모든 mutation 핸들러(`handleAddGroup`, `handleUpdateAssetClass`, `handleAddIncome` 등)는 시그니처는 그대로 유지한 채, 내부 구현만 "activeScenarioId를 가진 시나리오를 배열에서 찾아 그 안의 필드를 갱신"하는 방식으로 바뀐다. 예:

```ts
const handleAddGroup = (name: string): string => {
  const id = newId();
  setScenarios((prev) =>
    prev.map((s) =>
      s.id === activeScenarioId
        ? { ...s, groups: [...s.groups, { id, name, color: nextGroupColor(s.groups.length) }] }
        : s,
    ),
  );
  return id;
};
```

이 패턴을 기존 모든 핸들러에 동일하게 적용한다. `InputPanel`, 5개 차트 컴포넌트, `GoalCard`, `HistoryPanel`은 자신의 props 인터페이스를 전혀 바꾸지 않는다 — `AssetSimulator.tsx`가 활성 시나리오(`scenarios.find(s => s.id === activeScenarioId)`)에서 값을 꺼내 그대로 넘겨줄 뿐이다.

## 시나리오 관리 UI — `ScenarioTabs.tsx` (신규)

제목 줄 아래, "현재 자산/목표" 요약 행 위에 배치한다.

- 탭: 각 시나리오 이름을 버튼으로 나열, 클릭 시 `activeScenarioId` 전환. 활성 탭은 강조 스타일.
- 이름 클릭이 아니라 별도 연필 아이콘 클릭 시 인라인 텍스트 입력으로 전환(Enter 저장, Escape 취소) — `GroupPicker`의 그룹 리네임과 동일한 패턴.
- 각 탭에 삭제(✕) 아이콘. 시나리오가 1개뿐이면 비활성화(항상 최소 1개 유지, 자산군 primary 보장과 같은 불변식). 활성 탭을 삭제하면 남은 시나리오 중 첫 번째가 새로 활성화된다.
- "현재 탭 복제" 버튼: 활성 시나리오를 깊은 복사하고 새 `id`를 발급해 새 탭으로 추가, 이름은 `"{원본 이름} 복사본"`, 새로 추가된 탭이 즉시 활성화된다.
- "+ 새 시나리오" 버튼: 완전히 빈 상태(그룹·자산·수입·지출·이체 없음, 환율 1350, 목표 없음)의 새 탭을 추가하고 활성화한다. 이름은 `"시나리오 {n}"`(n은 현재 존재하는 시나리오 개수+1을 기준으로 충돌 없는 번호를 고름).

## 비교 차트 — `ScenarioComparisonChart.tsx` (신규)

탭 바 바로 아래, 활성 탭과 무관하게 항상 전체 시나리오 기준으로 렌더된다.

- 각 시나리오마다 `runSimulation({groups, assetClasses, incomes, expenses, transferRules, exchangeRate}, today, horizonMonths)`을 독립적으로 돌려 `MonthSnapshot[]`을 얻는다(시나리오 개수만큼 반복 — 시나리오가 소수일 것으로 가정하며, 이미 최대 361개월치 계산이 가벼운 것은 기존 `findGoalAchievementMonth`가 6000개월치를 매번 다시 계산해도 무리 없던 것으로 확인됨).
- x축은 공유 `horizonMonths`, y축은 `totalBalance`. 시나리오마다 다른 색의 선그래프로 겹쳐 그린다(팔레트는 기존 `GROUP_PALETTE` 재사용, 시나리오 개수 기준 순환 배정 — 자산·그룹 색과 이름공간은 겹치지 않으므로 충돌 걱정 없음).
- 아래에 시나리오 이름 + 색 점으로 된 고정 범례(다른 차트들과 동일 패턴), 선 위에 `<title>` 툴팁.
- 현재 슬라이더 위치(`selectedMonth`)에 세로 커서 선(기존 차트들과 동일).
- 자산·자산군 구성이 시나리오마다 달라 그 세부 항목은 이 그래프에 넣지 않는다(총자산만 비교 — 브레인스토밍에서 확정된 범위).

## 엣지 케이스

- 시나리오 삭제 시 그 시나리오가 활성 탭이었다면 남은 첫 번째 시나리오로 자동 전환.
- 시나리오가 1개일 때 삭제 버튼 비활성화, 툴팁 등으로 이유를 알릴 필요는 없음(버튼 자체가 disabled 스타일로 충분히 명확).
- 탭 이름이 비어 있으면(공백만 입력) 리네임을 무시하고 기존 이름 유지 — 다른 인라인 리네임 패턴(그룹 리네임)과 동일한 규칙.
- 시나리오 복제 시 내부 `id`(그룹 id, 자산 id, 수입/지출/이체 id)는 전부 새로 발급한다 — 원본과 사본이 같은 id를 공유하면 안 됨. 단, 그룹 id를 참조하는 자산의 `groupId` 등 내부 참조 관계는 복제본 내부에서 새로 발급된 id로 일관되게 다시 연결한다.

## 범위 밖 (Non-goals)

- 시나리오별 개별 목표 달성 시점을 비교 차트에 함께 표시하는 기능은 넣지 않는다(이번 라운드는 총자산 추이 비교만).
- 시나리오별로 다른 시뮬레이션 범위(horizonYears)나 슬라이더 위치를 갖는 기능은 넣지 않는다(공유로 확정).
- 시나리오 저장을 브라우저 로컬스토리지 등에 영속화하는 기능은 넣지 않는다(기존 앱 전체가 페이지 새로고침 시 초기화되는 것과 동일한 범위 — v3 4라운드의 "새로고침 경고"와 별개 주제).
