# AdSense 재심사 대응 — 도구 안내 섹션과 개인정보처리방침

서비스 앱(`amaranth-project.vercel.app`)이 AdSense에서 두 가지 사유로 거절됐다. 하나는 게시자 콘텐츠가 없는 화면에 광고가 게재된다는 것이고, 다른 하나는 가치가 낮은 콘텐츠라는 것이다. 이번 작업은 이 두 사유와 AdSense 개인정보처리방침 요구사항에 근거한 범위로 한정했다. SEO 튜닝, 디자인 변경, 분량을 채우기 위한 문장은 넣지 않았다.

## 수정 전 상태

빌드 결과 `.next/server/app/*.html`의 body 텍스트를 측정한 결과는 다음과 같다.

| 페이지 | 텍스트 | 내용 |
|---|---|---|
| `/` | 235자 | 제목과 도구별 한 줄 설명 |
| `/knit-muffler` | 370자 | 난이도 라벨과 슬롯 버튼 |
| `/visual-novel-studio` | 59자 | 슬롯 버튼 |
| `/stellar-forge` | 357자 | 자원 수치와 반응로 라벨 |
| `/yearly-receipt` | 0자 | localStorage 하이드레이션 전에는 `null`을 렌더 |
| `/nemo-nemo-beam` | 15자 | 바탕화면 아이콘 라벨 |
| `/asset-simulator` | 1,021자 | 입력 라벨과 예시 값 |

`/privacy`와 `/about`은 404였다. AdSense 스크립트는 `app/layout.tsx`의 `AdSenseLoader`가 기본 404 페이지를 포함한 모든 페이지에 넣고 있었다.

## 도구 페이지 안내 섹션

- `ToolGuide`는 서버 컴포넌트로, 콘텐츠는 `{ name, intro, steps, notes, faq }` 구조다. 서버에서 렌더하므로 초기 HTML에 텍스트가 그대로 들어간다.
- 페이지마다 콘텐츠를 `app/<service>/guide.ts`에 따로 두고, 기존 `<main>`(`h-dvh`) **뒤에** `<ToolGuide>`만 덧붙였다. 따라서 첫 화면은 여전히 도구가 꽉 채운다.
- 문구는 컴포넌트 소스에서 확인한 동작만으로 작성했다. 예를 들면 다음과 같다.
  - 뜨개뜨개: NORMAL·HARD에서 코마다 20% 확률로 잘못 뜬 코가 생기고, 메달 판정은 `calcMedal`을 따른다.
  - 별들은 굉장한 빛메이커이다: 철 60개(`FE_CORE_LIMIT`)가 쌓이면 초신성, 태양질량 25배 이상이면 블랙홀이 된다. 방치 보상은 최대 8시간이다.
  - 올해의 영수증: 항목 하나가 ₩10,000이고 진행률만큼 부분 결제한다.
  - 자산 시뮬레이터: 잔액이 부족하면 지출과 이체를 건너뛴다. 시나리오는 자동 저장되지 않는다.
- 각 섹션에는 도구 주제와 관련된 정보를 함께 넣었다. 평면뜨기의 방향 전환, 철에서 핵융합이 멈추는 이유, 정수 배율 내보내기, 72의 법칙, 물가를 반영한 실질 가치 등이다.

## 메인 페이지

사이트 소개(제작 의도, 운영자, 포트폴리오 링크)와 도구별 2~3문장 설명(`about`)을 추가했다. 링크 목록만 있는 "이동 목적 화면"으로 보이지 않게 하려는 것이다. 운영자 정보는 지어내지 않고 사용자에게서 받아 채웠다.

## 개인정보처리방침 (`/privacy`)과 공통 푸터

- AdSense 필수 고지 세 가지를 넣었다. 제3자 공급업체가 쿠키로 광고를 게재한다는 점, Google이 광고 쿠키를 사용한다는 점, adssettings에서 맞춤 광고를 해제할 수 있다는 점이다.
- 사이트가 실제로 저장하는 항목은 코드에서 찾은 그대로 `STORAGE_ITEMS`에 적었다. localStorage 키 16개와 IndexedDB `vn-studio-images`다.
- 외부 요청은 AdSense, jsDelivr 글꼴(뜨개뜨개), Vercel 호스팅이다. 분석 도구는 없다.
- `SiteFooter`를 루트 layout에 넣어 모든 페이지에서 `/privacy`로 갈 수 있게 했다.
- 저장 항목은 모바일에서 표가 비좁아 카드 목록으로 표시한다.

## 검증

- `npm run build`, `npm run lint`가 모두 통과했다. 경고는 기존 도구 파일에서만 나온다.
- 빌드 HTML에 페이지별 안내 제목, 본문, FAQ 문장과 `/privacy` 푸터 링크가 들어 있다. `/privacy`는 sitemap에도 자동으로 추가된다.
- Playwright(1280×800)로 6개 페이지 모두 `<main>` 높이가 뷰포트와 같고 안내 섹션이 y=800에서 시작하는 것을 확인했다. 페이지 에러는 없었다.
- 페이지가 세로로 스크롤되면서 모바일 터치 드래그가 스크롤에 뺏길 수 있었다. 그래서 CDP `Input.dispatchTouchEvent`로 네모네모빔 바탕화면의 롱프레스 드래그를 재현했다. 아이콘 순서가 저장되고 `scrollY`가 0으로 유지됐다.

## 보류한 항목 (보고만 함)

- 기본 404 페이지에 콘텐츠가 없다. 안내 문구와 링크를 넣은 `app/not-found.tsx` 추가를 검토한다.
- 비주얼 노벨 스튜디오의 '기본 제공' 리소스 탭이 비어 있다(`_shared/builtinAssets.ts`).
- 뜨개뜨개의 "새로운 도안이 업데이트될 예정" 문구가 준비 중인 콘텐츠를 예고하는 표현이다.
- 별들은 굉장한 빛메이커이다의 metadata description("머지 퍼즐")이 현재의 방치형 게임 방식과 다르다.
- 메인의 자산 시뮬레이터 카드에 썸네일이 없다.

## 유지보수

기능이나 저장 키가 바뀌면 `guide.ts`, 메인 `about`, 개인정보처리방침을 함께 고쳐야 한다. 이 규칙을 CLAUDE.md와 `/new-work` 커맨드에 추가했다.

## 관련 코드
- `apps/services/app/_components/ToolGuide.tsx` — 도구 안내 섹션 서버 컴포넌트
- `apps/services/app/_components/SiteFooter.tsx` — 공통 푸터 (`/privacy` 링크)
- `apps/services/app/<service>/guide.ts` — 도구별 안내 콘텐츠 (6개)
- `apps/services/app/<service>/page.tsx` — `<main>` 뒤에 `<ToolGuide>` 추가
- `apps/services/app/page.tsx` — 사이트 소개, 도구별 `about`
- `apps/services/app/privacy/page.tsx` — 개인정보처리방침
- `apps/services/app/layout.tsx` — `SiteFooter` 렌더
- `CLAUDE.md` — 서비스 앱 안내 문구 동기화 규칙
