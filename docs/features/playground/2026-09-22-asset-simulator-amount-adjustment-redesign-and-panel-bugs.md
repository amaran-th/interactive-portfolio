# 자산 시뮬레이터 금액 변동 재설계 및 입력 패널 버그 3건 수정

금액 변동 UX를 "일시적/지속적 × 반복 여부" 4가지 조합으로 설계하기 시작해, 대화를 거치며 값 변동은 항상 지속적이라는 결론에 이르러 데이터 모델을 통째로 단순화했다. 그 과정에서 드러난 입력 패널 팝업 관련 버그 세 건(세로 오버플로우, 다중 팝업 동시 열림, select 변경 시 가로 위치 오정렬)과 포트폴리오 iframe 임베드 크기 문제도 함께 수정했다.

## 금액 변동 데이터 모델 단순화

`AmountAdjustment`는 처음 "일시적(기한 지나면 원복)/지속적(기한 지나도 유지)" × "반복 여부" 4조합으로 설계됐다. 이후 "반복+일시적" 조합은 실사용 시나리오가 그려지지 않는다는 이유로 제외해 3조합이 됐고, 더 나아가 "옵션을 1개로 제한했는데 일시적 변동은 연봉인상률 같은 지속적 변동이랑 같이 적용도 못 한다"는 지적으로 `effect` 축 자체를 없앴다. 값 변동은 이제 **항상 지속적**이다.

`repeat` 필드도 없어졌다 — 반복 구조 하나로 단발/반복을 모두 표현한다. `until: {type:"count", count:1}`은 "한 번만 적용되고 계속 유지되는" 단발 변동과 수학적으로 동치이므로, 이 값을 기본값으로 삼아 옛 "1회" 모드를 그대로 흡수했다.

`until`은 한때 `{indefinite|count}`로 좁히고 상위 `toDate`를 별도로 뒀지만, ScheduleEditor가 이미 쓰던 3종(무기한/특정 날짜까지/횟수) select와 통일해달라는 요청으로 `RepeatUntil`(날짜 포함)을 그대로 재사용하도록 되돌렸다. 최종 형태:

```ts
type AmountAdjustment = {
  id: string;
  type: "percent" | "amount";
  direction: "increase" | "decrease";
  value: number;
  fromDate: string;
  frequency: "monthly" | "yearly";
  until: RepeatUntil; // 무기한 | 날짜 | 횟수
};
```

`effectiveAmount`는 `adjustmentOccurrences`로 목표 월까지의 누적 발생 횟수를 구해, 그 횟수만큼 순서대로 적용한다 — 비율(%)은 곱(복리), 금액(원)은 더하기(단리). `until`이 날짜나 횟수로 캡되면 그 이후 월은 발생 횟수가 더 늘지 않고 마지막 수준에서 멈춘다(반복은 끝나도 값은 유지).

옛 `kind`(period/recurring)·`persist` 형식으로 내보낸 시나리오 JSON을 가져올 때를 위한 `exportUtils.ts`의 마이그레이션 로직도 최종 구조에 맞게 갱신했다.

## UI 정리

- 반복 여부가 `until` select 안의 한 옵션(횟수 1회 = 사실상 비반복)이 되면서, 별도의 반복 토글(Switch) 자체가 불필요해져 제거했다.
- `CustomSelect`에 `bordered` prop을 추가했다. compact 모드 기본 스타일은 테두리 없는(`border-transparent`) 형태인데, select와 input이 한 줄에 섞인 폼에서는 select만 테두리가 없어 어색해 보였다. `bordered`를 켜면 옆 input과 같은 `border-gray-200 bg-white`를 쓴다.
- "인상/인하" select를 행 맨 뒤로 옮기고, "값" input의 너비(`w-20`→`w-16`)와 세로 패딩(`py-1`→`py-0.5`)을 옆 select에 맞췄다.
- 자동 요약 문장의 어순을 정리했다 — "10원 인상씩 누적되며"는 "씩"이 "인상"이 아니라 숫자+단위 바로 뒤에 붙어야 자연스러워 "10원씩 인상되며"로 고치고, "인상"과 의미가 겹치는 "누적"은 뺐다.

## 버그 1 — 반복 옵션을 켜면 입력 패널 팝업이 화면 밖으로

`AssetSimulator.tsx`의 "입력패널 접기" 아코디언 래퍼가 `overflow-hidden`/`overflow-visible`을 **컨테이너 폭**(`@min-[500px]`) 기준으로 전환하고 있었다. 그래서 모바일 폭에서는 패널이 펼쳐진 상태여도 항상 `overflow-hidden`이 걸려 있었고, 그 안의 `FloatingFormPanel`(`position:absolute; top-full`로 카드 바깥 아래로 튀어나오는 팝업)이 그대로 잘려 보였다. z-index 문제처럼 보였지만 실제 원인은 clipping이었다 — 컨테이너 폭이 아니라 실제 `inputPanelCollapsed` 상태로 전환 조건을 바꿔, 펼쳐진 동안은 폭과 무관하게 `overflow-visible`이 되도록 고쳤다.

세로 오버플로우는 한때 `FloatingFormPanel`에 `max-height` + 내부 스크롤을 추가해 막았다가, "팝업 안에 스크롤 생기는 게 별로"라는 피드백으로 되돌렸다 — 위 아코디언 수정으로 이미 해결된 문제라 중복 조치였고, 페이지 자체 스크롤로 넘기는 편이 자연스러웠다.

## 버그 2 — 다른 섹션 폼을 열면 이전 섹션 팝업이 안 닫히고 겹침

수입/지출/자산군/이체 4개 섹션은 부모가 공유하는 `openSection`(`isFormOpen`)과 섹션 로컬 `editingId`를 `isFormVisible = isFormOpen || Boolean(editingId)`로 합쳐 팝업 표시 여부를 결정한다. 수입 항목을 편집하던 중 지출 항목을 클릭하면 `openSection`이 "지출"로 바뀌어 수입의 `isFormOpen`은 꺼지지만, 수입의 로컬 `editingId`는 지워지지 않아 수입 팝업도 계속 떠 있었다. 같은 `z-30`을 쓰는 두 카드가 동시에 열리면서 DOM 순서상 나중 카드가 이겨 겹쳐 보인 것 — 겉보기엔 z-index 버그였지만 실제 원인은 상태 정리 누락이었다.

4개 섹션 파일 전부에 다음을 추가해 해결했다:

```ts
useEffect(() => {
  if (!isFormOpen) resetForm();
}, [isFormOpen]);
```

## 버그 3 — select 값을 바꾸면 팝업이 화면 밖으로 잘림

`FloatingFormPanel`의 `align()`이 가로 오버플로우를 판단할 때 **팝업 자기 자신의 현재 rect**를 측정하고 있었다. 재현 시나리오: ① 처음 넘쳐서 `right:0`으로 보정 → ② select를 바꿔 세로 높이만 커짐(ResizeObserver 재발동) → ③ 이미 오른쪽으로 보정된 상태를 다시 측정하니 "안 넘치네"로 오판단 → `left:0`으로 스스로 되돌림 → ④ 스타일(위치)만 바뀐 거라 크기 변화가 없어 ResizeObserver가 다시 발동하지 않음 → 잘못된 `left:0`에 고정된 채 잘려 보임. 자기 참조로 인한 오실레이션 버그였다.

`el.offsetParent`(카드, 고정된 기준점)의 위치 + 팝업의 고정 폭으로 "left:0으로 붙였을 때의 자연 위치"를 계산하도록 바꿔, 이전 보정 여부와 무관하게 항상 같은 결과가 나오게 해 오실레이션을 원천 차단했다.

이 버그는 이 세션에서 직접 재현하지 못했다 — 원격 브라우저 자동화 환경이 `resize_window`를 지원하지 않아(`document.documentElement.clientWidth`가 항상 1430 고정) 진짜 좁은 뷰포트를 만들 수 없었고, 포트폴리오 iframe 임베드(진짜 좁은 폭)에서는 cross-origin이라 내부 스크롤을 자동화로 조작할 수 없었다. 코드 로직 추적만으로 원인과 수정을 확정하고, 사용자가 보내준 스크린샷으로 크로스체크했다.

## WorkModal iframe 크기 — 높이 기준 폭 계산의 함정

포트폴리오 `WorkModal.tsx`가 iframe 패널 폭을 `calc(80vh-64px)`로 계산하고 있었다. 폭을 세로 뷰포트 크기로 잡는 구조라, 화면이 좁아서가 아니라 화면이 세로로 얼마나 크냐에 따라 폭이 들쭉날쭉 좁아졌다(실측 697×719px). `md:w-[55%]`(가로 비율 기준)로 교체하고 모달 높이도 `90vh`→`95vh`로 늘렸다. 가장 긴 페이지(자산 시뮬레이터)는 그래도 iframe 내부 스크롤이 남는다는 트레이드오프를 사용자와 확인한 뒤 진행했다 — postMessage 기반 콘텐츠 높이 자동 맞춤은 6개 서비스 전체를 손대야 하는 더 큰 작업이라 보류.

## 새로 배운 것

- CSS 오버플로우 클리핑과 z-index 스태킹은 완전히 다른 메커니즘이다 — 팝업이 잘리거나 겹쳐 보이는 증상은 둘 다 "z-index 문제"처럼 보이지만, 실제로는 조상의 `overflow-hidden`이나 상태 정리 누락 같은 전혀 다른 원인일 수 있다. 이번 세 버그 모두 그랬다.
- `ResizeObserver` 콜백 안에서 자기 자신의 **현재(이미 보정된) 위치**를 측정해 "필요한지" 재판단하면, 보정을 스스로 되돌리는 오실레이션에 빠질 수 있다. 측정 기준은 항상 그 보정과 무관한 안정적인 값(부모 요소, 고정 크기 등)이어야 한다.
- `next dev`는 같은 앱 폴더에 대해 인스턴스를 두 개(포트만 다르게) 동시에 못 띄운다(`.next/dev/lock`).
- 포트폴리오 캐러셀(`Work.tsx`)은 `onPointerDown/Up`만 듣는데, 브라우저 자동화 도구의 클릭이 순수 마우스 이벤트만 보내면 반응하지 않는다 — `PointerEvent`를 직접 dispatch해야 하고, `pointerdown` 직후 바로 `pointerup`을 보내면 React state batching 때문에 `isDragging`이 아직 갱신 전이라 무시된다(약 100ms 지연 필요).

## 관련 코드
- `apps/services/components/works/6_AssetSimulator/types.ts` — `AmountAdjustment` 단일 구조로 단순화
- `apps/services/components/works/6_AssetSimulator/simulation.ts` — `adjustmentOccurrences`/`effectiveAmount`/`validateAdjustments`
- `apps/services/components/works/6_AssetSimulator/exportUtils.ts` — 옛 `kind`/`persist` 형식 마이그레이션
- `apps/services/components/works/6_AssetSimulator/input-sections/AmountAdjustmentEditor.tsx` — 금액 변동 폼 UI 전면 재작성
- `apps/services/components/works/6_AssetSimulator/CustomSelect.tsx` — `bordered` prop 추가
- `apps/services/components/works/6_AssetSimulator/Switch.tsx` — `size="compact"` variant(현재는 미사용, 다른 곳에서 재사용 가능)
- `apps/services/components/works/6_AssetSimulator/input-sections/FloatingFormPanel.tsx` — 가로 정렬 오실레이션 버그 수정
- `apps/services/components/works/6_AssetSimulator/AssetSimulator.tsx` — 아코디언 `overflow` 조건을 컨테이너 폭 대신 `inputPanelCollapsed`로 변경
- `apps/services/components/works/6_AssetSimulator/input-sections/IncomeSection.tsx`, `ExpenseSection.tsx`, `TransferRuleSection.tsx`, `GroupAssetSection.tsx` — `isFormOpen` 꺼지면 로컬 폼 상태 자동 초기화
- `apps/portfolio/app/(portfolio)/playground/_sections/Works/WorkModal.tsx` — iframe 패널 폭을 vh 기반에서 vw 기반으로, 모달 높이 확대
