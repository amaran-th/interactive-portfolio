# 49년만에 도달한 1일 — 영어판과 배포 전 점검

보이저 1호 1광일 연대기(`/voyager`)에 영어판을 더하고, 배포 전에 사용권과 용량 문제를 정리했다.

## 영어판 구조

- **주소**: 한국어 `/voyager`, 영어 `/voyager/en`. 두 페이지 `metadata.alternates`에 `languages`를 넣어 hreflang으로 짝짓는다.
- **문구 관리**: 화면 문구는 `13_Voyager/i18n.ts`의 `T.ko`/`T.en`에 모은다.
  - 페이지가 `VoyagerTimeline`에 `lang`을 넘기고, 하위 컴포넌트는 `LangContext`(`useLang`, `useT`)로 읽는다.
  - 기록 카드는 `data.ts`의 `EVENT_EN`과 `eventText(e, lang)`이 맡는다.
  - 크레딧은 `Ending.tsx`의 `CREDITS_EN`, 골든 레코드는 `GoldenRecord.tsx`의 `GR`·`COVER_SPOTS_EN`·`COUNTRY_EN`이 맡는다.
- **단위 표기**: `fmtKm`·`fmtLight`는 `lang`에 따라 "25.90 billion km", "24 hours"로 바꾼다.
- **언어 선택기**: `ToolShell`에 `lang`과 `langPaths`를 더했다.
  - `langPaths`를 준 페이지에만 상단 바에 '한국어 | English' 선택기가 나온다. 휴대폰 폭에서는 KO | EN.
  - 사용 안내 드로어 라벨(`GuideDialog`, `ToolGuide`)도 `lang`을 따른다. 기본값은 `ko`라 다른 도구는 그대로다.
- **첫 안내 창**: `absolute`로 보이저 화면만 덮는다. 상단 바의 선택기는 첫 화면에서도 눌린다.

## 배포 전 점검

- **사진 사용권**: 하위헌스 착륙 사진 PIA07232는 출처가 ESA/NASA/JPL/University of Arizona라 ESA 이용 조건을 따른다. AdSense가 붙은 사이트라 NASA 단독 출처인 카시니 타이탄 자연색 사진 PIA06230(NASA/JPL/Space Science Institute)으로 바꿨다.
- **용량**: 뉴호라이즌스 사진 PIA19952는 엔딩의 작은 폴라로이드로만 쓰여서 5000px을 1200px로 줄였다(2.5MB → 약 390KB).
- **배경음**: CC0 곡 'Cosmic Navigation'을 사이트에 두고 재생한다. 외부 요청은 골든 레코드의 SoundCloud(펼칠 때만)뿐이고, 개인정보처리방침에 적었다.

## 그 밖의 수정

- **카드 스크롤**: 내용이 넘치는 현재 카드 위의 휠은 카드 안에서만 쓰고 연대기로 넘기지 않는다(`overscroll-contain` 포함).
- **파비콘**: 루트 `app/favicon.ico`를 `app/icon.ico`로 옮겼다. 덕분에 `/voyager`가 자기 `icon.svg`·`icon.png`·`apple-icon.png`(투명 배경)를 쓴다.

## 관련 코드
- `apps/services/components/works/13_Voyager/i18n.ts` — 한국어·영어 문구 사전과 `LangContext`
- `apps/services/components/works/13_Voyager/data.ts` — `EVENT_EN`, `eventText`
- `apps/services/components/works/13_Voyager/Ending.tsx` — 크레딧(`CREDITS_EN`), 카시니 사진 교체
- `apps/services/components/works/13_Voyager/GoldenRecord.tsx` — 아코디언 '담긴 것' 탭, 영어 사전
- `apps/services/app/_components/ToolShell.tsx` — `lang`·`langPaths`, 언어 선택기
- `apps/services/app/voyager/en/page.tsx` — 영어판 라우트
- `apps/services/app/voyager/guide.ts` — `voyagerGuide`, `voyagerGuideEn`
