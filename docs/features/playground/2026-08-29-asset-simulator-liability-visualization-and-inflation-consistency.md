# 자산 시뮬레이터 부채 시각화 재설계 및 물가상승률 반영 통일

PNG export 마무리 폴리싱 이후, 부채(음수 잔액 자산)가 있을 때 차트가 알아보기 힘들다는 피드백을 계기로 자산 추이 그래프·자산 비교 패널의 스택 방식을 재설계했다. 함께 기본 자산 규칙을 정비하고, 물가상승률 반영이 일부 차트에만 적용되던 것을 전체로 통일했다.

## 자산/부채 분리 스택 + 순자산 오버레이

기존에는 자산 배열을 순서대로 누적(cumulative running sum)해 쌓는 방식이라, 음수 잔액 자산(부채)이 중간에 끼면 그 이후 쌓이는 자산들의 기준선 자체가 낮아지면서 스택 모양이 왜곡됐다. 부채를 "상쇄"시키는 게 아니라 부채는 부채대로 0 아래에, 자산은 자산대로 0 위에 각각 독립적으로 누적하도록 바꿨다 — `posCursor`/`negCursor` 두 개의 커서를 두고 각 항목의 부호에 따라 해당 커서에서만 쌓는 방식.

`AssetAreaChart`(연속 시계열)는 이 판정을 **월마다 독립적으로** 다시 한다 — 기본 자산도 시뮬레이션상 미래에 잔액이 음수로 떨어질 수 있어서, "부채 여부"를 자산 생성 시점 플래그가 아니라 해당 월 스냅샷의 실제 부호로 판단해야 한다. `ComparisonBarChart`(지금/N개월 후 두 막대)는 스냅샷 두 개만 다루므로 각 스냅샷을 독립적으로 `buildRawSegments`에 넣는 기존 구조가 이미 월별 판정과 동치였다.

순자산(자산 - 부채)은 스택과는 별도로 오버레이해서 보여준다:
- `AssetAreaChart`: 시나리오에 부채가 하나라도 있으면 전체 기간에 검은 꺾은선을 오버레이. 부채가 아예 없으면 스택의 꼭대기가 이미 순자산이라 선을 그리지 않는다.
- `ComparisonBarChart`: 막대 하나에 자산과 부채가 **둘 다** 있을 때만 그 막대에 검은 띠 + 순자산 숫자를 표시. 연속된 선이 아니라 막대 2개뿐이라 "전체 기간" 개념이 없어서, 두 컴포넌트의 표시 조건을 다르게 잡았다(brainstorming 스킬로 짧게 확인).

이 과정에서 겪은 두 가지 회귀:
- 라벨 겹침을 고치려고 `ComparisonBarChart`의 SVG viewBox `HEIGHT`를 늘렸더니, 이 SVG가 그대로 쓰이는 모바일 캐러셀 카드(고정 높이 `h-86`)가 통째로 커 보이는 부작용이 생겼다. `HEIGHT`는 원래대로 되돌리고, "부채 라벨이 실제로 렌더링되는 경우에만" 하단 여백(`BASE_Y`)을 렌더 시점에 동적으로 늘리는 방식으로 바꿨다 — 부채 없는 흔한 케이스는 원래 크기 그대로 유지.
- 그와 별개로, 부채 유무와 무관하게 `ComparisonBarChart`의 세로로 긴 종횡비(260:228) 자체가 `w-full`로 모바일 카드 폭에 꽉 차게 늘어나면서 고정 높이 카드를 넘쳐 흘렀다. PNG export 때 쓰던 "SVG를 디자인 폭으로 캡 + 가운데 정렬" 패턴을 `compact` prop으로 일반화해 모바일 캐러셀 전용으로도 적용했다.

## 기본 자산 규칙 정비

기본 자산(수입이 들어오고 지출이 나가는 자산)을 사용자가 라디오 버튼으로 수동 지정/해제하던 기존 UX를 없앴다. 대신:
- 새 시나리오 생성 시 "기본 자산"이라는 이름으로 자동 1개 시드(`emptyScenario`).
- 새로 추가하는 자산은 항상 `isPrimary: false`로 고정 — 폼에서 지정 옵션 자체를 제거.
- 기본 자산은 삭제 버튼이 아예 렌더링되지 않고, 핸들러 레벨에서도 방어.
- 기본 자산은 부채(음수 잔액)로 전환 불가 — 수정 폼에서 "부채로 추가" 체크박스를 비활성화 처리(회색 텍스트로 시각적으로도 비활성 표시).
- "기본 자산" 배지에 도움말 아이콘을 추가해, hover(모바일은 탭)로 "모든 수입과 지출은 기본자산을 통해 들어오고 나갑니다" 툴팁을 보여준다.

## 색상 팔레트 "이미 사용됨" 표시 방식 변경

이미 사용된 색상을 고를 수 없게 막을 때 원래는 `opacity-25`로 흐리게 처리했는데, "색상만 뿌얘지니까 무슨 색인지 못 알아보겠다"는 피드백을 받았다. 색은 원래 채도 그대로 두고, 대신 흰색 X 아이콘을 겹쳐서 "선택 불가"를 표시하도록 바꿨다. 처음엔 X 뒤에 반투명 검은 원을 깔았는데 이것도 "반투명 검은 필터는 빼달라"는 요청으로 제거하고, 대신 X 아이콘 자체에 옅은 `drop-shadow`를 줘서 배경색과 무관하게 읽히게 했다.

## 잡다한 버그 수정

- **입력 패널 편집 폼이 안 보이는 문제**: z-index 이슈로 짐작했지만 실제 원인은 달랐다 — 모바일 "입력패널 접기" 애니메이션(`grid-template-rows` 트릭)에 필요한 `overflow-hidden`이 데스크톱 폭에서도 항상 걸려 있어서, 카드 밖으로 넘치는 편집 팝업을 그대로 잘라내고 있었다. `@min-[500px]:overflow-visible`로 데스크톱에서만 풀어줬다. (z-index를 아무리 올려도 안 고쳐졌던 이유가 애초에 stacking 문제가 아니었기 때문 — clipping과 stacking은 완전히 다른 메커니즘이라는 걸 다시 확인.)
- **새 시나리오 이름이 "시나리오 2"부터 시작**: `let n = scenarios.length + 1`이 이미 존재하는 "예시 시나리오"까지 카운트해서 생긴 오프바이원. `n = 1`부터 시작해 실제 이름이 겹칠 때만 증가하도록 수정.
- **자산 비율 도넛의 부채 라벨에 있던 하락 아이콘 제거**: 빨간 텍스트만으로 충분하다는 피드백.
- **모바일 "이번 달 수입/지출 구성" 패널의 중복 라벨 제거**: 이미 수입/지출 토글이 있는데 도넛 위에 "수입"/"지출" 텍스트가 또 있어서, 모바일 폭(`@min-[500px]` 미만)에서만 숨김.

## 물가상승률 반영 범위 통일

"물가상승률 반영" 토글이 `AssetAreaChart`(커서 값)와 `ComparisonBarChart`(막대 전체)에만 적용되고, `FlowDiagram`(이번 달 자금 흐름)·`GroupDonutChart`(자산 비율 금액 모드)·`FlowRatioChart`(수입/지출 구성 툴팁)는 전혀 반영되지 않고 있었다. `ComparisonBarChart`에 있던 로컬 `realValueSnapshot` 헬퍼를 `types.ts`로 옮기고 `assetBalances`까지 포함해 스냅샷의 모든 금액 필드(자산 잔액, 그룹 합계, 수입/지출, 이체, 실패 항목)를 한 번에 할인하도록 확장한 뒤, 세 컴포넌트 모두에 적용했다. `FlowRatioChart`는 스냅샷의 `flow` 필드가 아니라 수입/지출 항목 정의(`IncomeItem`/`ExpenseItem`)를 직접 쓰는 구조라, `toRealValue`를 항목 단위로 개별 적용해야 했다.

물가상승률 20%·24개월 후로 실제 확인한 결과, 예를 들어 청년미래적금 12,000,000원이 8,333,333원으로, 예적금 합계 1,200만원이 833만원으로 정확한 할인율(≈0.694 = 1/1.2²)로 줄어드는 것을 확인했다.

## 새로 배운 것

- `html-to-image`가 SVG `<text>`에 Tailwind 클래스를 안정적으로 inline하지 못하는 문제는 색상뿐 아니라 **크기(`text-[Npx]`)에도** 똑같이 적용된다 — 실제로 `1,600,000원` 라벨이 지정한 10px 대신 브라우저 기본 크기(~16px)로 렌더링되는 걸 확대 스크린샷으로 발견했다. `fill`/`fontSize`/`fontWeight` 같은 네이티브 SVG 속성만 신뢰 가능.
- 더 나아가, `foreignObject` 안의 **인라인 스타일**(className이 아닌 순수 `style` 객체)조차 특정 조건에서 export 캡처 시 무시되는 경우를 발견했다 — 조건부로 계산된 색상값이 흰색으로 고정 출력됨. 원인은 특정하지 못했고, 우회책으로 해당 텍스트만 `foreignObject` 밖으로 빼서 네이티브 SVG `<text fill="...">`로 별도 렌더링해 해결했다.
- CSS Grid의 row-track 높이는 `align-items`와 무관하게 항상 가장 큰 형제 기준으로 정해진다 — 카드 간 여백 문제의 근본 해결은 grid를 flex로 바꾸는 것뿐이었다.
- SVG viewBox 종횡비를 한 곳(라벨 겹침)을 고치려고 바꾸면, 그 컴포넌트가 재사용되는 다른 모든 컨텍스트(데스크톱 그리드/export/모바일 캐러셀)에 함께 영향을 준다 — 실제로 이번에 겪은 두 번의 회귀가 전부 이 패턴이었다.

## 관련 코드
- `apps/services/components/works/6_AssetSimulator/AssetAreaChart.tsx` — 자산/부채 월별 분리 스택, 순자산 꺾은선 오버레이, 커서 위치의 자산/부채/순자산 점 표시
- `apps/services/components/works/6_AssetSimulator/ComparisonBarChart.tsx` — 자산/부채 분리 스택, 막대별 조건부 순자산 띠, `compact` prop(모바일 캐러셀 폭 캡)
- `apps/services/components/works/6_AssetSimulator/types.ts` — `realValueSnapshot` 공유 헬퍼(스냅샷 전체 금액 필드 물가상승률 할인)
- `apps/services/components/works/6_AssetSimulator/FlowDiagram.tsx` — 물가상승률 반영, `foreignObject` 색상 우회(네이티브 `<text>` 분리)
- `apps/services/components/works/6_AssetSimulator/GroupDonutChart.tsx` — 물가상승률 반영, 부채 라벨 아이콘 제거
- `apps/services/components/works/6_AssetSimulator/FlowRatioChart.tsx` — 물가상승률 반영(항목 단위), 모바일 중복 라벨 숨김
- `apps/services/components/works/6_AssetSimulator/AssetSimulator.tsx` — 기본 자산 시드/삭제 방지, `overflow-hidden` 조건부 해제, 시나리오 이름 카운터 수정
- `apps/services/components/works/6_AssetSimulator/input-sections/GroupAssetSection.tsx` — 기본 자산 지정 UI 제거, 부채 전환 방지, 도움말 툴팁
- `apps/services/components/works/6_AssetSimulator/input-sections/GroupPicker.tsx` — 색상 팔레트 X 아이콘 표시
