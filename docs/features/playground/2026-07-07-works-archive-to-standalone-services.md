# Works 그리드 대신 독립 서비스 페이지로 노출

플레이그라운드 아카이브(`Works/data.tsx`)에 있던 항목 중 비주얼 노벨 메이커(id 2), 별의 연금술/StellarForge(id 3), 올해의 영수증/GoalsPassport(id 4)를 `works` 배열에서 주석 처리해 2열 그리드에서 제외했다. 대신 각 Work 컴포넌트를 `(services)` 라우트 그룹 아래 전체 화면 독립 페이지로 노출한다.

## 구성

- `app/(services)/stellar-forge/page.tsx` — `Works/3_StellarForge/StellarForge`를 렌더링. `3_StellarForge/`(StarCore, Starfield, elements, factory, useFactory)는 이번에 새로 추가된 Work.
- `app/(services)/survey/page.tsx` — `Works/4_GoalsPassport/GoalsPassport`를 렌더링.
- `app/(services)/rough-visual-novel-maker/`, `app/(services)/knit-muffler/` — 기존에 이미 같은 패턴으로 존재.

## 등록

- `app/robots.ts` — allow 목록에 `/gpu-rotation`, `/stellar-forge`, `/yearly-receipt` 추가.
- `next-sitemap.config.js`, `app/robots.ts` — `siteUrl` 기본값을 `https://example.com`에서 실제 배포 도메인으로 변경.

## 알려진 이슈

`app/(services)/survey/page.tsx`의 실제 라우트는 `/survey`이지만 `robots.ts`에는 `/yearly-receipt`로 등록되어 있어 서로 일치하지 않는다. `Works/data.tsx`에 주석 처리된 GoalsPassport 항목의 `path` 필드도 `/yearly-receipt`로 되어 있다. 폴더명(`survey`)과 의도한 경로(`/yearly-receipt`) 중 무엇이 맞는지 확인 후 정리가 필요하다.

## 관련 코드

- `app/(portfolio)/playground/_sections/Works/data.tsx` — 그리드 노출 항목 목록
- `app/(services)/stellar-forge/page.tsx`, `app/(services)/survey/page.tsx` — 독립 서비스 페이지
- `app/robots.ts`, `next-sitemap.config.js` — 크롤링/사이트맵 설정
