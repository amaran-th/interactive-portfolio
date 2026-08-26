# 기본 폰트를 Geist Sans에서 Pretendard로 교체

전역 sans 폰트를 Geist Sans에서 Pretendard로 바꿨다. Geist Sans는 한글 글리프가 없어 한글 텍스트가 항상 시스템 폰트로 폴백되고 있었는데, Pretendard로 바꾸면서 한글도 지정한 폰트로 렌더링되게 했다. Geist Mono는 코드·숫자 표기용으로 그대로 유지한다.

Pretendard는 Google Fonts에 없어 `next/font/google`로 불러올 수 없다. 대신 `pretendard` npm 패키지(공식 배포, variable font 1개 파일 포함)를 설치하고 `next/font/local`로 `node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2`를 로드한다. `weight: "45 920"` 범위로 지정해 굵기 전체를 하나의 파일로 커버한다.

## 폰트 variable 클래스는 `<body>`가 아닌 `<html>`에 걸어야 한다

`pretendard.variable`/`geistMono.variable` 클래스를 `<body>`에만 적용했더니 실제로는 폰트가 적용되지 않고 시스템 폰트로 렌더링되는 문제가 있었다.

원인은 Tailwind v4의 `@theme inline`이 만드는 `--default-font-family: var(--font-pretendard)`가 `:root`(`<html>`) 스코프에 선언된다는 점이다. `html { font-family: var(--default-font-family, ui-sans-serif, ...) }`가 preflight에서 적용되는데, CSS 커스텀 프로퍼티는 자손 요소에서 조상 요소로는 상속되지 않는다. `--font-pretendard`가 `<body>` 클래스에만 정의돼 있으면 `<html>` 입장에서는 미정의 상태라 `var()`가 무효화되고 fallback 목록(`ui-sans-serif, system-ui, ...`)으로 넘어간다.

이 구조적 문제는 기존 Geist Sans 때도 동일하게 있었지만, macOS 시스템 폰트와 시각적으로 비슷해 드러나지 않았을 뿐이었다. Pretendard로 바꾸며 한글 렌더링을 확인하는 과정에서 발견했다.

해결은 폰트 variable 클래스를 `<html>`로 옮기는 것 — Next.js App Router에서 권장하는 표준 패턴이기도 하다. Playwright로 `getComputedStyle(document.body).fontFamily`가 `pretendard, "pretendard Fallback"`으로 정상 적용되는 것을 확인했다.

## 관련 코드
- `app/layout.tsx` — `next/font/local`로 Pretendard 로드, 폰트 variable 클래스를 `<html>`에 적용
- `app/globals.css` — `@theme inline`의 `--font-sans`를 `var(--font-pretendard)`로 매핑
- `package.json` — `pretendard` 의존성 추가
