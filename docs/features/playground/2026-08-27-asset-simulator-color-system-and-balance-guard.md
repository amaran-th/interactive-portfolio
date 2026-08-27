# 자산 시뮬레이터 색상 체계 개편과 잔액 부족 처리

자산/그룹 색상 배정 규칙을 다시 세우고, 시뮬레이션 엔진의 지출·이체 처리를 잔액을 넘지 않도록 고쳤다.

## 색상 체계: 그룹에 속하면 그룹 색을 공유

기존에는 모든 자산이 그룹 소속 여부와 무관하게 각자 독립된 색을 가졌다. 이를 "그룹에 속한 자산은 개별 색이 없고 그룹 색을 그대로 쓴다. 그룹 미설정 자산은 그 자체로 단일 그룹이라 자기 색을 유지한다"는 규칙으로 재정의했다. `assetColor(asset, groups)` 헬퍼가 이 규칙을 캡슐화해 자산 목록, 자산 그래프, 자금 흐름도 전반에서 재사용된다.

이 변경에 따라 파생된 정리:
- 자산 비교 그래프는 항목별/그룹별 토글을 없애고 무조건 그룹별로 집계하도록 고정(그룹 소속 자산이 이제 시각적으로 구분이 안 되므로 항목별 보기 자체가 의미가 옅어짐).
- "그룹별 비율" 차트를 "자산 비율"로 개명. "미분류" 탭을 "전체"(모든 그룹 + 미분류 자산을 하나로 합친) 탭으로 교체. 특정 그룹 탭 안에서는 그 그룹 자산들이 전부 같은 그룹 색이 되어버리는 문제를 피하려고, 도넛이 자체 팔레트로 슬라이스 색을 새로 생성하도록 예외 처리.
- 값이 전부 0이라 도넛이 텅 비어 보이던 문제에 "표시할 데이터가 없어요" placeholder 추가.

## 색상 배정 충돌 버그

`nextGroupColor`/`nextAssetColor`가 각각 독립된 카운터(`groups.length`, `assetClasses.length`)로 동일한 `GROUP_PALETTE`를 순환하고 있어서, 그룹과 미분류 자산이 우연히 같은 인덱스에 걸리면 똑같은 색을 배정받는 버그가 있었다(예: 기본 계좌와 예적금 그룹이 둘 다 팔레트의 0번 색). `nextVisibleColor(groups, assetClasses)`로 통합해 "그룹 수 + 미분류 자산 수"를 하나의 시퀀스로 세도록 고쳤다.

동시에 색상 설정 UI 자체도 보강했다. 기존엔 그룹은 이름 수정 시에만, 자산은 목록에 추가된 뒤 점을 클릭해야만 색을 바꿀 수 있어 생성 시점에는 색을 고를 수 없었다. 자산 추가/수정 폼과 그룹 만들기 드롭다운 양쪽에 색상 스와치 선택 UI를 추가해, 생성 시점부터 원하는 색을 고를 수 있게 했다(기본값은 `nextVisibleColor`로 제안, 자유롭게 덮어쓸 수 있음).

## 잔액 부족 시 all-or-nothing 처리

기존 시뮬레이션 로직은 두 가지 문제가 있었다:
- 지출: `balances[primary.id] -= expenseOut`로 무조건 전액 차감 — 잔액이 부족해도 그대로 마이너스로 내려감.
- 이체: `Math.min(requested, sourceBalance)`로 클램프 — 요청 금액을 못 채우면 있는 만큼만 부분 이체.

둘 다 "설정한 금액과 다른 결과가 조용히 발생한다"는 점에서 바람직하지 않다고 판단해, 지출과 이체 모두 **항목 단위로 잔액을 확인하고, 감당 못 하면 그 항목 전체를 이번 달 건너뛰는(all-or-nothing)** 방식으로 바꿨다. 지출은 원래 월 합계를 한 번에 빼던 걸 항목별로 순회하며 각각 잔액을 확인하도록 재구성했고, 이체는 `sourceBalance <= 0 || requested > sourceBalance`일 때 실행 자체를 건너뛴다.

실패한 항목은 `MonthFlow.failedTransfers`/`failedExpenses`에 기록되고, 자금 흐름도 상단에 "잔액 부족으로 중단됐어요: OOO" 배너로 노출된다. 누적 이력(HistoryPanel)도 `snapshot.flow`를 참조하도록 정리해, 실패한 지출/이체가 실제로 일어난 것처럼 표시되지 않는다(이체는 원래부터 `snapshot.flow.transfers`만 읽어 자동으로 해결됐고, 지출은 스케줄 발동 여부만 보던 걸 실패 목록과 대조하도록 추가 수정).

예시 시나리오(청년미래적금 이체 500,000원 + S&P500/삼성전자 이체)로 5년을 돌려보면, 12개월째부터 우선순위가 가장 낮은 삼성전자 이체가 매달 걸러지면서 파킹통장 잔액이 50,000원에서 안정적으로 유지되는 자기 조정적 결과를 확인했다 — 마이너스로 내려가지 않고, 감당되는 항목만 계속 정상 진행된다.

## 예시 시나리오 데이터 개편

온보딩용 시드 시나리오("시나리오 1")를 "예시 시나리오"로 개명하고(새 시나리오 채번은 별도 로직이라 영향 없음), 내용을 더 풍부하게 바꿨다: 파킹통장(기본 자산)/청년미래적금(예적금 그룹)/S&P500·삼성전자(투자 그룹) 자산 구성, 수입에 반복+1회성, 지출에 반복·횟수제한·1회성을 섞어 스케줄 종류를 한 화면에서 보여주도록 구성. 청년미래적금에는 3년 만기 흐름(36회 납입 제한 + 만기 시 잔액 100% 이체 + 정부기여금·이자 유입)을 추가해 이체 시스템의 표현력을 보여준다. 기본 시뮬레이션 기간도 10년에서 5년으로 낮췄다.

## 관련 코드
- `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/types.ts` — `assetColor`, `nextVisibleColor`, `MonthFlow.failedTransfers`/`failedExpenses`
- `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/simulation.ts` — 지출/이체 all-or-nothing 로직
- `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/GroupDonutChart.tsx` — 자산 비율(전체 탭 + 자체 팔레트 + 빈 상태 placeholder)
- `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/ComparisonBarChart.tsx` — 그룹별 집계 고정
- `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/input-sections/GroupPicker.tsx`, `GroupAssetSection.tsx` — 생성 시점 색상 스와치 선택
- `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/AssetSimulator.tsx` — 예시 시나리오 시드 데이터
- `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/HistoryPanel.tsx` — 실패 지출 필터링
