# robots.txt sitemap 차단 문제 수정

`robots.ts`의 `disallow: ["/"]`가 루트 전체를 차단하면서 `/sitemap.xml`도 함께 접근이 막혀 있었다. `allow` 목록에 sitemap 경로를 명시적으로 추가해 해결했다.

또한 `next-sitemap.config.js`의 `siteUrl`이 `SITE_URL` 환경변수를 읽지 못할 경우 `https://example.com`으로 폴백되는 구조였으며, `.env`에 실제 도메인을 설정하기로 했다.

## 관련 코드
- `app/robots.ts` — robots 규칙 정의, allow에 `/sitemap.xml`, `/sitemap-0.xml` 추가
- `next-sitemap.config.js` — `siteUrl: process.env.SITE_URL || "https://example.com"` 설정
