# GoalsPassport → YearlyReceipt 전면 리네임

이전 세션에서 "올해의 영수증 만들기" Work의 공개용 문구(제목, 경로 `/yearly-receipt`, 썸네일)는 이미 변경돼 있었지만, 내부 코드의 폴더·컴포넌트·타입·훅 이름은 여전히 `GoalsPassport`/`Passport` 계열을 쓰고 있었다. 공개 정체성과 내부 네이밍이 어긋나 있던 상태를 `YearlyReceipt` 계열로 통일했다.

## 리네임 매핑

- 폴더: `4_GoalsPassport` → `4_YearlyReceipt`
- 컴포넌트: `GoalsPassport` → `YearlyReceipt` (`YearlyReceipt.tsx`)
- 뷰 컴포넌트: `PassportView` → `ReceiptView` (`ReceiptView.tsx`)
- export 훅: `usePassportExport` → `useReceiptExport` (`useReceiptExport.ts`, 다운로드 파일명도 `-passport.png` → `-receipt.png`)
- 타입: `PassportStyle` → `ReceiptStyle`, `PassportState` → `ReceiptState`
- 내부 상태값: 화면 모드 `"passport"` → `"receipt"`, ref 이름 `passportCaptureRef` → `receiptCaptureRef`
- localStorage 키: `"goals-passport-state"` → `"yearly-receipt-state"`
- 페이지 함수명: `GoalsPassportPage` → `YearlyReceiptPage`

`Goal`, `useGoalsStorage` 등 목표(Goal) 자체를 가리키는 식별자는 그대로 유지했다 — 리네임 대상은 "Passport"라는 제품명 성격의 식별자에 한정했다.

## 주의사항

localStorage 키가 바뀌었기 때문에, 기존에 `goals-passport-state` 키로 저장돼 있던 사용자 데이터는 이번 변경 이후 새 키(`yearly-receipt-state`)로 마이그레이션되지 않고 초기화된다.

## 관련 코드
- `app/(portfolio)/playground/_sections/Works/4_YearlyReceipt/` — 리네임된 컴포넌트 폴더 전체
- `app/(portfolio)/playground/_sections/Works/data.tsx` — import 및 사용처 갱신
- `app/(services)/yearly-receipt/page.tsx` — 페이지 컴포넌트 import·함수명 갱신
