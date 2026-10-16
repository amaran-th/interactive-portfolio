# 자산 시뮬레이터 — 원화 전용화, 연간 인상률 단순화, 부정확성 경고

## 경고 문구

본문 상단의 불러오기/내보내기 버튼 줄 왼쪽에 안내 문구를 둔다. "세금·수수료·수익률 변동을 빼고 단순하게 계산한 추정치라 실제와 다를 수 있어요. 참고용으로만 봐 주세요." sticky 헤더가 높아지지 않도록 헤더 밖에 배치했다. 사용 안내(`guide.ts`)의 "계산에 들어가지 않는 것"에도 실제와 다를 수 있고, 중요한 결정은 금융기관이나 전문가와 확인하라는 내용을 더했다.

## 달러 자산 제거

쓰이는 곳이 없어 통화 선택(KRW/USD), 환율 입력(데스크톱 헤더·모바일 상세 설정), 환산 로직을 모두 없앴다.

- `Currency` 타입, `AssetClass.currency`, `Scenario.exchangeRate`, `SimulationInput.exchangeRate` 삭제
- 원화 하나만 남아 `MonthSnapshot.assetBalances`(원래 통화)와 `assetBalancesKRW`(원화 환산)를 `assetBalances` 하나로 합치고, `ungroupedTotalKRW`는 `ungroupedTotal`로 이름을 바꿈
- 이체 규칙의 "같은 통화 자산끼리만" 제한 제거
- 안내 문구: 통화 언급 삭제, 달러 FAQ를 "외화 자산은 지금 환율로 바꾼 원화 금액을 넣는다"로 교체

## 금액 변동 → 연간 인상률

금액이 바뀌는 경우는 사실상 연봉 인상률처럼 매년 오르는 경우뿐이라 보고 구조를 줄였다. 승진·대출 상환 완료처럼 한 번 바뀌는 경우는 항목을 종료 날짜로 끊고 새 항목을 추가해 표현한다.

- `AmountAdjustment`: `{ id, type: "percent" | "amount", value, fromDate }`. `direction`·`frequency`·`until` 삭제
- 계산: `fromDate`부터 12개월마다 한 번씩 무기한 인상. 퍼센트는 복리로, 금액은 회차마다 더해진다
- UI: 라벨을 "연간 인상률"로 바꾸고, `[시작월] 부터` / `매년 [값] [%/원] 씩 인상` 두 줄 문장형으로 배치. 기본값 3%
- JSON 불러오기 호환: 옛 인하 변동은 버리고, 주기·종료 조건은 무시하며 시작월·단위·값만 남긴다. `exchangeRate`·`currency` 필드도 버린다

## 관련 코드
- `apps/services/components/works/6_AssetSimulator/types.ts` — `AmountAdjustment`·`MonthSnapshot` 타입 정리, 통화 타입 삭제
- `apps/services/components/works/6_AssetSimulator/simulation.ts` — `adjustmentOccurrences`·`effectiveAmount` 단순화, 환산 로직 삭제
- `apps/services/components/works/6_AssetSimulator/input-sections/AmountAdjustmentEditor.tsx` — 연간 인상률 편집기
- `apps/services/components/works/6_AssetSimulator/exportUtils.ts` — 옛 JSON 마이그레이션
- `apps/services/components/works/6_AssetSimulator/AssetSimulator.tsx` — 환율 입력 제거, 경고 문구 추가
- `apps/services/app/asset-simulator/guide.ts` — 사용 안내 문구 갱신
