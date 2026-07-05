# 목표 영수증 (Goals Receipt) — 설계 문서

## 개요

한 해의 목표와 하위 체크리스트를 관리하고, `[인쇄하기]`를 누르면 달성 현황을 영수증 형태로 "출력"해 보여주는 미니 프로젝트. 실제로 방문자가 자신의 목표를 입력·관리하는 실사용 도구다. 완료 여부는 퍼센트가 아니라 금액(₩)으로 표현된다 — 각 목표는 "품목", 목표별 정가는 연간 예산을 균등 분배한 값, 결제금액은 하위 체크리스트 완료 비율만큼 지불된 금액으로 매핑된다.

플레이그라운드 Work 번호 4, 경로 `/goals-receipt`.

## 데이터 모델 & 저장

```ts
type ChecklistItem = {
  id: string;
  label: string;
  checked: boolean;
};

type Goal = {
  id: string;
  title: string;          // 영수증의 품목명
  items: ChecklistItem[]; // 하위 체크리스트
};

type ReceiptStyle = "thermal" | "modern";

type ReceiptState = {
  year: string;         // 기본값: 현재 연도, 텍스트로 직접 수정 가능
  goals: Goal[];
  style: ReceiptStyle;  // 기본값: "thermal"
};
```

- 연간 총 예산: 고정 상수 `₩1,000,000` (목표 개수로 균등 분배 → 목표당 정가)
- 목표별 결제금액 = 정가 × (체크된 하위 항목 수 / 전체 하위 항목 수). 하위 항목이 0개면 결제금액 0
- `SUBTOTAL` = 정가 총합, `DISCOUNT` = SUBTOTAL − TOTAL PAID, `TOTAL PAID` = 결제금액 합 — 퍼센트 텍스트는 어디에도 노출하지 않음
- `ReceiptState` 전체를 localStorage 키 하나에 저장 (연도 archive 없음, 항상 최신 상태 덮어쓰기). 모드(`edit`/`receipt`)는 저장하지 않고 새로고침 시 항상 편집 모드로 시작

## 모드 & 인터랙션

- **편집 모드 (기본)**
  - 목표 추가/삭제, 목표 제목 수정
  - 목표별 하위 체크리스트 항목 추가/삭제/체크
  - 스타일 선택 토글(감열지 vs 컬러/모던, 2종 중 택1) — 선택은 `ReceiptState.style`에 저장되어 유지됨
  - `[인쇄하기]` 버튼 — 목표가 하나도 없으면 비활성화
- **영수증 모드**
  - `[인쇄하기]` 클릭 시: 프린터 슬릿 그래픽 아래로 종이가 슬라이드로 나오는 1회성 출력 애니메이션(기존 종이를 되감는 연출 없음, 매번 새로 출력)
  - 출력된 영수증은 스냅샷이 아니라 그 시점의 `ReceiptState`를 렌더링한 것 — 이후 `[수정하기]`로 편집 모드에 돌아가 값을 바꾸고 다시 인쇄하면 최신 상태로 재출력됨
  - `[이미지로 저장]` 버튼: `html-to-image`의 `toPng`으로 영수증 DOM을 캡처해 PNG 다운로드 (KnitMuffler `useResultExport.ts`와 동일 패턴, 프로젝트에 이미 설치된 의존성 재사용)
  - `[수정하기]` 버튼으로 편집 모드 복귀

## 비주얼

공통: 상단 연도 타이틀(`{year} GOALS RECEIPT`), 인쇄 시점 날짜, 목표별 1줄(`품목명 ... ₩결제금액` + `(3/4)` 완료 항목 보조 텍스트), 구분선 아래 `SUBTOTAL` / `DISCOUNT` / `TOTAL PAID`.

- **감열지 스타일 (기본)**: 흰 배경, 검은 모노스페이스(Geist Mono), 점선 구분선, 상하단 톱니 절취선(CSS `clip-path` 또는 반복 그라디언트), 상단 프린터 그래픽은 회색 박스 + 슬릿(div/box-shadow)
- **컬러/모던 스타일**: 프로젝트 기존 다크 글래스모피즘 톤(`white/5`, `white/10` 등)과 포인트 컬러를 사용한 카드형 UI. 영수증 형태(줄 구분, 총액 강조)는 유지하되 색과 라운드 코너로 앱스러운 느낌

## 파일 구조

`app/(portfolio)/playground/_sections/Works/4_GoalsReceipt/`

- `GoalsReceipt.tsx` — 모드 상태(`edit` | `receipt`) 관리, EditView/ReceiptView 스위칭
- `EditView.tsx` — 목표/체크리스트 CRUD, 스타일 토글, 인쇄 버튼
- `ReceiptView.tsx` — 출력 애니메이션, 영수증 렌더링(스타일 분기), 이미지 저장 버튼
- `useGoalsStorage.ts` — localStorage 로드/저장
- `useReceiptExport.ts` — html-to-image 캡처 로직 (useResultExport.ts 패턴 참고)
- `types.ts` — Goal, ChecklistItem, ReceiptState, ReceiptStyle
- `utils.ts` — id 생성, 정가/결제금액 계산 헬퍼

`app/(services)/goals-receipt/page.tsx` — 개별 서비스 페이지 (`knit-muffler/page.tsx` 참고)

## 엣지 케이스

- 목표 0개: 인쇄 버튼 비활성화, 편집 모드에 빈 상태 안내
- 하위 항목 0개인 목표: 결제금액 0으로 계산, 완료 항목 표시는 `(0/0)`
- 연도 텍스트: 빈 문자열 허용 안 함 (최소 1글자), 자유 텍스트라 숫자가 아니어도 무방
- localStorage 파싱 실패/최초 방문: 빈 목표 리스트 + 기본 연도로 초기화

## 테스트 / 검증

테스트 스위트가 없는 프로젝트이므로 수동 검증: 목표/항목 추가·삭제·체크, 두 스타일 전환, 인쇄→수정→재인쇄 반복, 이미지 저장 다운로드 확인, 새로고침 후 데이터 유지 확인.
