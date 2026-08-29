# 자산 시뮬레이터 내보내기/불러오기 기능 추가

시나리오를 JSON으로 백업·복원하고, 월별 시뮬레이션 결과를 CSV로, 차트 대시보드 전체를 PNG로 내보낼 수 있는 기능을 추가했다. 작업 도중 저장소가 세션 밖에서 모노레포로 재구성된 사실을 뒤늦게 발견해 경로를 다시 파악하는 과정도 함께 있었다.

## 저장소 구조 변경 발견

작업을 시작하며 익숙한 경로(`app/(portfolio)/playground/_sections/Works/6_AssetSimulator/`)를 찾다가 `app/` 디렉터리 자체가 사라진 것을 발견했다. `git log`로 확인해보니 세션이 모르는 사이 10개의 커밋이 쌓여 있었고, 저장소는 `apps/portfolio`(포트폴리오 셸)와 `apps/services`(실제 Work 컴포넌트·서비스 라우트)로 분리된 npm workspaces 모노레포로 재구성돼 있었다. 자산 시뮬레이터 소스는 `apps/services/components/works/6_AssetSimulator/`로 이동했고, 이전 세션에서 만든 온보딩 스크린샷·코드는 모두 그대로 보존돼 있었다.

## JSON: 시나리오 단위 백업/복원

`exportScenarioJson`은 현재 활성 시나리오 하나만 JSON으로 내보낸다. 가져오기(`parseScenarioJson`)는 파일을 파싱한 뒤 `newId()`로 id를 재발급해 기존 시나리오와 충돌하지 않게 하고, 항상 **새 시나리오 탭으로 추가**한다(기존 탭을 덮어쓰지 않음).

## CSV: 월별 시뮬레이션 결과

`exportSnapshotsCsv`는 전체 시뮬레이션 기간(설정된 년수 전체)의 자산별 잔액(KRW 환산)·총자산·수입·지출·이체 합계를 월별 행으로 만든다. 헤더는 한글이라 UTF-8 BOM을 붙여 엑셀에서 깨지지 않게 했다.

## PNG: 차트 대시보드 전체, 항상 데스크톱 레이아웃으로

"전체 그래프가 한 이미지에 다 들어와야 하고, 비율·크기는 데스크톱 기준"이라는 요구사항이 핵심이었다. 이미 다른 Work(영수증/목도리 결과 저장)에서 쓰던 `html-to-image`를 재사용해 `chartsColumnRef`(차트 그리드의 `@container` 루트)를 캡처하되, `toPng`의 `width`/`style.width` 옵션으로 1400px까지 강제 리사이즈했다. 이렇게 하면 뷰어가 실제로 모바일에서 보고 있어도, 컨테이너 쿼리 기반 반응형 그리드가 캡처 시점엔 항상 데스크톱 2행 5패널 레이아웃으로 해석된다 — 별도의 숨김 클론 트리를 만들 필요 없이 기존 반응형 마크업을 그대로 재사용한 것이다.

처음엔 1200px로 캡처했더니 4열 그리드의 "이번 달 수입/지출 구성" 패널(도넛 2개가 나란히 있는 col-span-2 패널)이 우측에서 잘렸다 — 배정된 컬럼 폭보다 내부 콘텐츠가 넓었던 것으로 보고, 정확한 최소 폭을 계산하는 대신 1400px로 넉넉히 늘려 해결했다. 연도 프리셋 칩 행은 `data-html-to-image-ignore` 속성으로 캡처에서 제외했다(다른 Work의 export 훅에서 이미 쓰던 동일한 필터 관례).

배경은 페이지의 인디고/블루/퍼플 그라디언트를 `style.background`로 재현해, 반투명 카드가 실제 화면처럼 보이도록 했다.

## UI 배치: 네 차례의 위치 조정

export/import UI를 어디에 둘지 총 네 번 피드백을 받으며 옮겼다.

1. 시나리오 탭 줄 아래 별도 행
2. "상세옵션 라인에 넣어달라" → 환율/물가상승률 옆(데스크톱 인라인 행 + 모바일 "상세 설정" 모달)
3. "이건 서비스 설정이 아니라 시나리오 기능이니 상세옵션도 아닌 것 같다" → `ScenarioTabs`로 이동(데스크톱은 "현재 탭 복제"/"+ 새 시나리오" 옆, 모바일은 시나리오 드롭다운 안 플랫 리스트)
4. "줄줄이 있는 게 별로다, 헤더 말고 컨테이너 상단에" → 최종적으로 `ScenarioTabs`에서도 완전히 빼서 스크롤 컨테이너 맨 위 독립된 줄로, 우측 정렬

돌아보면 세 번의 이동은 "환율/물가상승률=시뮬레이션 파라미터", "시나리오 탭 액션=시나리오 메타 조작", "내보내기/불러오기=둘 다 아닌 독립 기능"이라는 서로 다른 카테고리를 하나씩 확인해 나간 과정이었다.

또한 "내보내기 아이콘이 잘못된 것 같아, 불러오기는 별개 버튼으로" 요청에 따라, 원래 내보내기 드롭다운(PNG/CSV/JSON) 안에 있던 JSON 가져오기를 `ImportScenarioButton`이라는 독립 버튼으로 분리했다. 이후 "둘이 아이콘 바꿔줘" 요청으로 두 버튼의 아이콘을 맞바꿨다(불러오기=`Download`, 내보내기=`Upload`).

## 새로 배운 것

- CSS 컨테이너 쿼리(`@container`) 기반 반응형 레이아웃은, 캡처 대상 요소의 인라인 `width`를 강제로 오버라이드하는 것만으로 실제 뷰포트와 무관하게 특정 브레이크포인트를 재현할 수 있다. 별도의 "데스크톱 전용 숨김 클론"을 만들 필요 없이 기존 반응형 마크업을 그대로 재사용 가능하다.
- 장시간 실행 세션에서는 저장소가 세션 밖에서 바뀔 수 있다는 걸 전제하고, 익숙한 경로가 갑자기 안 보이면 `git log`/`ls`로 구조 자체가 바뀌지 않았는지부터 확인하는 게 안전하다.

## 관련 코드
- `apps/services/components/works/6_AssetSimulator/exportUtils.ts` — JSON/CSV 직렬화, 다운로드 트리거
- `apps/services/components/works/6_AssetSimulator/ExportMenu.tsx` — PNG/CSV/JSON 내보내기 드롭다운
- `apps/services/components/works/6_AssetSimulator/ImportScenarioButton.tsx` — JSON 불러오기 단독 버튼
- `apps/services/components/works/6_AssetSimulator/AssetSimulator.tsx` — `handleExportChartImage`(html-to-image 캡처), 내보내기/불러오기 UI 배치
- `apps/services/components/works/6_AssetSimulator/ScenarioTabs.tsx` — export/import 이동 과정에서 거쳐간 위치(현재는 다시 제거됨)
