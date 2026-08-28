# 포트폴리오 / 서비스 도메인 분리 (모노레포) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 하나의 Next.js 앱을 npm workspaces 모노레포로 쪼개 포트폴리오와 서비스를 별도 Vercel 프로젝트·별도 도메인으로 배포하고, 포트폴리오는 서비스를 iframe으로 임베드한다.

**Architecture:** 레포 루트를 workspace 루트로 만들고 `apps/portfolio`(→ `amaranth-portfolio.vercel.app`, noindex)와 `apps/services`(→ `amaranth-project.vercel.app`, index) 두 독립 Next.js 앱을 둔다. Work 컴포넌트 6종과 `_shared`, `SVG.tsx`는 서비스 앱으로 이동한다. 포트폴리오 플레이그라운드는 컴포넌트를 import하지 않고 `<iframe src={SERVICES_ORIGIN + path}>`로 임베드하며, 서비스 앱은 CSP `frame-ancestors`로 포트폴리오 오리진만 허용한다.

**Tech Stack:** Next.js 16.1.6 (App Router, Turbopack), React 19.2.3, Tailwind CSS v4, TypeScript 5, npm workspaces, `@svgr/webpack`, `next-sitemap`, Vercel.

**Spec:** `docs/superpowers/specs/2026-08-28-domain-split-monorepo-design.md`

## Global Constraints

- Next.js 버전은 `16.1.6` 고정, React `19.2.3` / `react-dom` `19.2.3` 고정 (두 앱 동일).
- 테스트 스위트 없음. 각 태스크의 검증은 **`npm run build` 통과 + `npm run lint` 통과 + 명시된 `npm run dev` 수동 확인**이다. "테스트를 먼저 작성"하는 단계는 이 계획에 없다.
- 커밋 메시지는 프로젝트 관례를 따른다: `타입 : 한국어 요약` (예: `feat : ...`, `refactor : ...`, `chore : ...`, `docs : ...`). Claude 공동저자 트레일러 넣지 않음.
- 설명 문구(서비스 랜딩 카드 텍스트 등)는 `CLAUDE.md`의 Writing Guidelines를 따른다.
- 포트폴리오 앱은 전체 noindex(`robots.ts` `disallow: ["/"]`), 서비스 앱은 정상 색인.
- AdSense 스크립트와 Google Search Console verification 토큰(`GYxbiNXZ79bcXCmZMoBUWuI9DTE4nXL-6tk3bY5aDeU`)은 **서비스 앱에만** 둔다.
- 서비스 프로덕션 도메인은 현재 도메인 `amaranth-project.vercel.app`을 그대로 승계 → 리다이렉트 불필요.
- 포트폴리오 dev 포트 `3000`, 서비스 dev 포트 `3100`.

---

## 파일 구조 (최종)

```
interactive-portfolio/
├── package.json                    workspace 루트: { "private": true, "workspaces": ["apps/*"] }
├── .gitignore                      apps/* 하위 .next / sitemap 무시 규칙 포함
├── apps/
│   ├── portfolio/
│   │   ├── package.json            name "portfolio", dev "next dev", build "next build" (postbuild 없음)
│   │   ├── next.config.ts          turbopack svg rules
│   │   ├── tsconfig.json           "@/*": ["./*"]
│   │   ├── eslint.config.mjs
│   │   ├── postcss.config.mjs
│   │   ├── next-sitemap.config.js  삭제됨 (portfolio는 sitemap 없음)
│   │   ├── svgr.d.ts / gifenc.d.ts 등 필요한 것만
│   │   ├── public/                 interaction-lab/, fonts/, playground/*.png(썸네일)
│   │   └── app/
│   │       ├── layout.tsx          폰트만 (AdSense·verification 없음)
│   │       ├── page.tsx  globals.css  favicon.ico
│   │       ├── robots.ts            disallow ["/"]
│   │       ├── (portfolio)/         engineering-note, interaction-lab, playground, _components, layout.tsx
│   │       │   └── playground/_sections/Works/
│   │       │       ├── data.tsx     embedPath 방식, 컴포넌트 import 0
│   │       │       ├── Work.tsx     WorkItem: content 제거, embedPath 추가
│   │       │       └── WorkModal.tsx  iframe 렌더
│   │       └── (experiments)/       gpu-rotation, pretext (noindex 됨)
│   └── services/
│       ├── package.json            name "services", postbuild "next-sitemap"
│       ├── next.config.ts          turbopack svg rules + headers() CSP frame-ancestors
│       ├── tsconfig.json           "@/*": ["./*"]
│       ├── eslint.config.mjs  postcss.config.mjs  svgr.d.ts
│       ├── next-sitemap.config.js
│       ├── public/                 playground/ 전체 (png, svg, mp3, asset-simulator/, nemo-nemo-beam/)
│       └── app/
│           ├── layout.tsx          폰트 + AdSense + verification
│           ├── page.tsx            6개 서비스 목록 (임시)
│           ├── globals.css         Tailwind + @theme + SchoolSafeOuting @font-face + @utility font-knit-muffler
│           ├── robots.ts           정상 색인
│           ├── favicon.ico
│           ├── knit-muffler/page.tsx       visual-novel-studio/page.tsx   stellar-forge/page.tsx
│           ├── yearly-receipt/page.tsx     nemo-nemo-beam/page.tsx        asset-simulator/page.tsx
│           └── components/
│               ├── SVG.tsx
│               └── works/
│                   ├── 1_KnitMuffler/ 2_VisualNovelStudio/ 3_StellarForge/
│                   ├── 4_YearlyReceipt/ 5_PixelArtMaker/ 6_AssetSimulator/
│                   └── _shared/       assetLibrary.ts builtinAssets.ts fonts.ts renderPixelArt.ts useUnsavedChangesWarning.ts
├── daily-note/                      루트 유지 (gitignore 됨, 빌드 무관)
├── docs/                            루트 유지
└── .claude/                         commands·CLAUDE.md 경로 갱신 (gitignore 됨 — 커밋엔 CLAUDE.md만 반영)
```

---

## Task 1: 레포를 workspace 루트로 만들고 기존 앱을 `apps/portfolio`로 이관 (동작 불변)

기존 루트 앱을 **그대로** `apps/portfolio`로 옮긴다. 이 태스크에서는 서비스 분리·iframe 전환을 하지 않는다. 끝났을 때 `apps/portfolio`가 예전 루트 앱과 100% 동일하게 동작해야 한다.

**Files:**
- Create: `package.json` (루트, 신규 내용), `apps/portfolio/package.json`
- Move (`git mv`): `app/` → `apps/portfolio/app/`, `components/` → `apps/portfolio/components/`, `public/` → `apps/portfolio/public/`, `next.config.ts` `tsconfig.json` `next-sitemap.config.js` `eslint.config.mjs` `postcss.config.mjs` `next-env.d.ts` `svgr.d.ts` `gifenc.d.ts` `next-sitemap.config.js` → `apps/portfolio/`
- Modify: `apps/portfolio/app/layout.tsx` (pretendard `localFont` src 경로), `apps/portfolio/tsconfig.json`, `.gitignore`
- Delete: `apps/portfolio/app/scratch-task3-verify/` (빈 디렉터리), 루트 `package-lock.json` (재생성됨)

**Interfaces:**
- Produces: `apps/portfolio` — 포트폴리오 앱 루트. 내부 alias `@/*` → `apps/portfolio/*`. dev 포트 3000.
- Produces: 루트 `package.json` — `workspaces: ["apps/*"]`.

- [ ] **Step 1: 디렉터리 생성 및 파일 이동**

```bash
mkdir -p apps/portfolio
git mv app apps/portfolio/app
git mv components apps/portfolio/components
git mv public apps/portfolio/public
git mv next.config.ts tsconfig.json eslint.config.mjs postcss.config.mjs next-env.d.ts svgr.d.ts gifenc.d.ts next-sitemap.config.js apps/portfolio/
git rm -r --cached package-lock.json && rm package-lock.json
rmdir apps/portfolio/app/scratch-task3-verify 2>/dev/null || git rm -r apps/portfolio/app/scratch-task3-verify
```

- [ ] **Step 2: 루트 `package.json` 작성**

`package.json` (루트) 전체를 다음으로 교체:

```json
{
  "name": "interactive-portfolio",
  "version": "0.1.0",
  "private": true,
  "workspaces": ["apps/*"],
  "scripts": {
    "dev": "npm run dev --workspace portfolio",
    "dev:services": "npm run dev --workspace services",
    "build": "npm run build --workspaces --if-present",
    "lint": "npm run lint --workspaces --if-present"
  }
}
```

- [ ] **Step 3: `apps/portfolio/package.json` 작성**

기존 루트 `package.json`의 `dependencies` / `devDependencies`를 그대로 옮기고 메타만 조정:

```json
{
  "name": "portfolio",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3000",
    "build": "next build",
    "start": "next start --port 3000",
    "lint": "eslint"
  },
  "dependencies": {
    "@chenglou/pretext": "^0.0.4",
    "@tanstack/react-virtual": "^3.13.23",
    "gifenc": "^1.0.3",
    "html-to-image": "^1.11.13",
    "lucide-react": "^1.7.0",
    "next": "16.1.6",
    "next-sitemap": "^4.2.3",
    "pretendard": "^1.3.9",
    "react": "19.2.3",
    "react-dom": "19.2.3"
  },
  "devDependencies": {
    "@svgr/webpack": "^8.1.0",
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.1.6",
    "playwright": "^1.61.1",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

`postbuild`(next-sitemap)는 이 시점에는 유지한다 (Task 4에서 제거). `next-sitemap.config.js`도 그대로 둔다.

- [ ] **Step 4: pretendard 폰트 경로 수정**

`apps/portfolio/app/layout.tsx`에서 `localFont` src를 workspace 루트의 hoisted `node_modules` 기준으로 고친다. `apps/portfolio/app/layout.tsx` → 루트 `node_modules`는 3단계 상위:

```ts
const pretendard = localFont({
  src: "../../../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  variable: "--font-pretendard",
  weight: "45 920",
  display: "swap",
});
```

- [ ] **Step 5: `.gitignore` 갱신**

루트 `.gitignore`에서 앱 하위 산출물도 무시하도록 다음 항목을 추가/수정한다 (기존 항목은 유지):

```
# next.js
/.next/
/out/
apps/*/.next/
apps/*/out/

# sitemap (build artifact generated by next-sitemap)
apps/*/public/sitemap*.xml
```

- [ ] **Step 6: 의존성 설치**

Run: `npm install`
Expected: 루트에 `package-lock.json` 재생성, `node_modules` 루트 hoist, 에러 없음.

- [ ] **Step 7: 빌드 검증**

Run: `npm run build --workspace portfolio`
Expected: PASS — 기존 루트 라우트(`/`, `/playground`, `/knit-muffler` 등 `(services)` 그룹 포함, `/engineering-note`, `/interaction-lab`, `/pretext`, `/gpu-rotation`)가 전부 빌드됨.

- [ ] **Step 8: lint 검증**

Run: `npm run lint --workspace portfolio`
Expected: PASS (기존과 동일한 warning 수준).

- [ ] **Step 9: dev 수동 확인**

Run: `npm run dev --workspace portfolio`
확인:
- `http://localhost:3000/` 랜딩 정상
- `http://localhost:3000/playground` — Works 캐러셀에서 활성 항목 클릭 시 모달에 **라이브 컴포넌트**가 뜬다 (아직 iframe 아님)
- `http://localhost:3000/knit-muffler` 등 서비스 라우트가 아직 여기서 동작한다 (Task 3에서 제거 예정)

- [ ] **Step 10: 커밋**

```bash
git add -A
git commit -m "refactor : 레포를 npm workspaces 루트로 전환하고 기존 앱을 apps/portfolio로 이관"
```

---

## Task 2: `apps/services` 앱 셸 생성 (임시 랜딩만)

서비스 앱의 뼈대를 만든다. Work 컴포넌트·서비스 라우트는 Task 3에서. 이 태스크가 끝나면 `apps/services`가 임시 랜딩 하나로 단독 빌드·실행된다.

**Files:**
- Create: `apps/services/package.json`, `apps/services/next.config.ts`, `apps/services/tsconfig.json`, `apps/services/eslint.config.mjs`, `apps/services/postcss.config.mjs`, `apps/services/svgr.d.ts`, `apps/services/next-sitemap.config.js`, `apps/services/next-env.d.ts`
- Create: `apps/services/app/layout.tsx`, `apps/services/app/page.tsx`, `apps/services/app/globals.css`, `apps/services/app/robots.ts`
- Create: `apps/services/app/favicon.ico` (portfolio에서 복사)
- Modify: 루트 `package.json`은 이미 `--workspaces`라 변경 없음

**Interfaces:**
- Consumes: 없음 (신규 앱).
- Produces: `apps/services` — 서비스 앱 루트. alias `@/*` → `apps/services/*`. dev 포트 3100. `SERVICES` 색인 정책 = 정상.
- Produces: `apps/services/app/globals.css` — `@utility font-knit-muffler`, `SchoolSafeOuting` `@font-face` 포함 (Task 3의 Work 컴포넌트가 의존).

- [ ] **Step 1: `apps/services/package.json`**

```json
{
  "name": "services",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3100",
    "build": "next build",
    "postbuild": "next-sitemap",
    "start": "next start --port 3100",
    "lint": "eslint"
  },
  "dependencies": {
    "gifenc": "^1.0.3",
    "html-to-image": "^1.11.13",
    "lucide-react": "^1.7.0",
    "next": "16.1.6",
    "next-sitemap": "^4.2.3",
    "pretendard": "^1.3.9",
    "react": "19.2.3",
    "react-dom": "19.2.3"
  },
  "devDependencies": {
    "@svgr/webpack": "^8.1.0",
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.1.6",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

`@tanstack/react-virtual`, `@chenglou/pretext`, `playwright`는 서비스에 불필요하므로 넣지 않는다.

- [ ] **Step 2: 설정 파일들** — `apps/portfolio`에서 복사 후 조정

`apps/services/tsconfig.json` = `apps/portfolio/tsconfig.json` 복사 (내용 동일, `"@/*": ["./*"]` 유지).
`apps/services/eslint.config.mjs`, `apps/services/postcss.config.mjs`, `apps/services/svgr.d.ts` = `apps/portfolio`에서 그대로 복사.
`apps/services/next-env.d.ts` = 복사.

`apps/services/next.config.ts`:

```ts
import type { NextConfig } from "next";

const PORTFOLIO_ORIGINS = [
  "https://amaranth-portfolio.vercel.app",
  "http://localhost:3000",
];

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `frame-ancestors 'self' ${PORTFOLIO_ORIGINS.join(" ")}`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 3: `apps/services/next-sitemap.config.js`**

포트폴리오용 exclude 로직 제거, 전체 색인:

```js
/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || "https://amaranth-project.vercel.app",
  generateRobotsTxt: false,
};
```

- [ ] **Step 4: `apps/services/app/globals.css`**

`apps/portfolio/app/globals.css` 전체를 복사한다 (Tailwind import, `SchoolSafeOuting` `@font-face` 2개, `@theme inline` 폰트 변수, `@utility font-knit-muffler`, 그 외 전역 스타일 포함). 서비스 Work 컴포넌트가 이 유틸리티와 폰트에 의존하므로 누락 없이 그대로 가져온다.

- [ ] **Step 5: `apps/services/app/layout.tsx`**

`apps/portfolio/app/layout.tsx`를 기준으로 하되:
- pretendard `localFont` src: `apps/services/app/layout.tsx` → 루트 `node_modules`는 3단계 상위 → `"../../../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2"`
- `<head>`의 AdSense `<script>` 유지
- `metadata.verification.google` 유지
- `metadata`의 `title.template`은 서비스용으로: `template: "%s | amaranth", default: "amaranth"` (정확한 문구는 구현자 재량, `CLAUDE.md` Writing Guidelines 준수)
- `robots` 기본값은 색인 허용 (metadata에 `robots` 넣지 않음)

- [ ] **Step 6: `apps/services/app/robots.ts`**

```ts
import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${process.env.SITE_URL || "https://amaranth-project.vercel.app"}/sitemap.xml`,
  };
}
```

- [ ] **Step 7: `apps/services/app/page.tsx` (임시 플레이스홀더)**

```tsx
export const metadata = { title: "amaranth" };

export default function Home() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-gray-950 text-white">
      <p className="text-sm text-gray-400">서비스 목록 준비 중</p>
    </main>
  );
}
```

정식 목록은 Task 5.

- [ ] **Step 8: favicon 복사**

```bash
cp apps/portfolio/app/favicon.ico apps/services/app/favicon.ico
```

- [ ] **Step 9: 설치 + 빌드 검증**

Run: `npm install`
Run: `npm run build --workspace services`
Expected: PASS — `/`, `/robots.txt`, `/sitemap.xml` 생성.

- [ ] **Step 10: lint + dev 확인**

Run: `npm run lint --workspace services` → PASS
Run: `npm run dev --workspace services` → `http://localhost:3100/` 플레이스홀더 표시. 응답 헤더에 `Content-Security-Policy: frame-ancestors ...` 존재 확인 (`curl -sI http://localhost:3100/ | grep -i content-security`).

- [ ] **Step 11: 커밋**

```bash
git add -A
git commit -m "feat : apps/services 앱 셸 추가 (임시 랜딩, CSP frame-ancestors)"
```

---

## Task 3: Work 컴포넌트·서비스 라우트를 `apps/services`로 이동

Work 컴포넌트 6종 + `_shared` + `SVG.tsx`를 서비스 앱으로 옮기고 6개 서비스 라우트를 서비스 앱에 만든다. 포트폴리오 앱에서는 `(services)` route group을 **삭제**한다 (포트폴리오는 더 이상 서비스를 라우트로 서빙하지 않음). 포트폴리오의 `data.tsx`는 이 태스크에서는 아직 라이브 컴포넌트를 참조한 채로 둔다 → 그래서 Work 컴포넌트는 **이동이 아니라 복사**한다. 포트폴리오 쪽 복사본 제거는 Task 4.

**Files:**
- Copy: `apps/portfolio/app/(portfolio)/playground/_sections/Works/{1_KnitMuffler,2_VisualNovelStudio,3_StellarForge,4_YearlyReceipt,5_PixelArtMaker,6_AssetSimulator,_shared}` → `apps/services/components/works/`
- Copy: `apps/portfolio/components/SVG.tsx` → `apps/services/components/SVG.tsx`
- Copy: `apps/portfolio/public/playground/` → `apps/services/public/playground/` (전체: png, svg, mp3, `asset-simulator/`, `nemo-nemo-beam/`)
- Create: `apps/services/app/{knit-muffler,visual-novel-studio,stellar-forge,yearly-receipt,nemo-nemo-beam,asset-simulator}/page.tsx`
- Delete: `apps/portfolio/app/(services)/` (전체 route group: `layout.tsx` + 6개 `*/page.tsx`)

**Interfaces:**
- Consumes: `apps/services/app/globals.css` (`font-knit-muffler`, `SchoolSafeOuting`), `apps/services` alias `@/*`.
- Produces: `apps/services/components/works/<N_Name>/<Name>.tsx` — 각 Work의 기본 export 컴포넌트 (예: `@/components/works/1_KnitMuffler/KnitMuffler`).
- Produces: `apps/services/components/works/5_PixelArtMaker/cursors.ts` — `CURSOR_NORMAL` named export.
- Produces: `apps/services/components/SVG.tsx` — `KnitMufflerIcon` named export.
- Produces: 서비스 라우트 6개 (`/knit-muffler`, `/visual-novel-studio`, `/stellar-forge`, `/yearly-receipt`, `/nemo-nemo-beam`, `/asset-simulator`).

- [ ] **Step 1: 컴포넌트·에셋 복사**

```bash
mkdir -p apps/services/components/works
cp -R "apps/portfolio/app/(portfolio)/playground/_sections/Works/1_KnitMuffler" apps/services/components/works/
cp -R "apps/portfolio/app/(portfolio)/playground/_sections/Works/2_VisualNovelStudio" apps/services/components/works/
cp -R "apps/portfolio/app/(portfolio)/playground/_sections/Works/3_StellarForge" apps/services/components/works/
cp -R "apps/portfolio/app/(portfolio)/playground/_sections/Works/4_YearlyReceipt" apps/services/components/works/
cp -R "apps/portfolio/app/(portfolio)/playground/_sections/Works/5_PixelArtMaker" apps/services/components/works/
cp -R "apps/portfolio/app/(portfolio)/playground/_sections/Works/6_AssetSimulator" apps/services/components/works/
cp -R "apps/portfolio/app/(portfolio)/playground/_sections/Works/_shared" apps/services/components/works/
cp apps/portfolio/components/SVG.tsx apps/services/components/SVG.tsx
mkdir -p apps/services/public
cp -R apps/portfolio/public/playground apps/services/public/playground
```

- [ ] **Step 2: 복사된 Work 코드의 alias import 확인**

`apps/services/components/works/` 안에서 `@/`로 시작하는 import를 전수 확인:

Run: `grep -rn 'from "@/' apps/services/components/`
Expected: `1_KnitMuffler/SelectScreen.tsx`의 `import { KnitMufflerIcon } from "@/components/SVG";` 만 나온다. 이 경로는 서비스 alias(`@/*` → `apps/services/*`)에서 `apps/services/components/SVG.tsx`로 그대로 해석되므로 수정 불필요.

`apps/services/components/SVG.tsx`의 `import KnitMuffler from "@/public/playground/knit-muffler.svg";` → `apps/services/public/playground/knit-muffler.svg` 로 해석됨. Step 1에서 복사했으므로 OK.

그 외 `@/` import가 더 나오면 각각 서비스 앱 내부 경로로 판단해 수정한다 (대부분 상대경로 `./` `../`라 영향 없음).

- [ ] **Step 3: 6개 서비스 라우트 작성**

`apps/portfolio/app/(services)/<name>/page.tsx` 내용을 그대로 가져오되 import 경로만 `@/components/works/...`로 바꾼다. 예 — `apps/services/app/knit-muffler/page.tsx`:

```tsx
import KnitMuffler from "@/components/works/1_KnitMuffler/KnitMuffler";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "뜨개뜨개",
  description: "도안을 따라 나만의 뜨개질 작품을 만들어보세요!",
  icons: { icon: "/playground/knit-muffler.svg" },
  openGraph: {
    title: "뜨개뜨개",
    description: "도안을 따라 나만의 뜨개질 작품을 만들어보세요!",
    images: [{ url: "/playground/knit-muffler.png", alt: "뜨개뜨개 미리보기 이미지" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "뜨개뜨개",
    description: "도안을 따라 나만의 뜨개질 작품을 만들어보세요!",
    images: ["/playground/knit-muffler.png"],
  },
};

export default function KnitMufflerPage() {
  return (
    <main className="flex h-dvh justify-center overflow-hidden text-stone-900">
      <div className="h-full w-full max-w-5xl">
        <KnitMuffler />
      </div>
    </main>
  );
}
```

나머지 5개도 동일 패턴 — import 경로 매핑:
- `visual-novel-studio` → `@/components/works/2_VisualNovelStudio/VisualNovelStudio`
- `stellar-forge` → `@/components/works/3_StellarForge/StellarForge`
- `yearly-receipt` → `@/components/works/4_YearlyReceipt/YearlyReceipt`
- `nemo-nemo-beam` → `@/components/works/5_PixelArtMaker/PixelArtMaker` + `import { CURSOR_NORMAL } from "@/components/works/5_PixelArtMaker/cursors";`
- `asset-simulator` → `@/components/works/6_AssetSimulator/AssetSimulator`

각 `page.tsx`의 `metadata`/`main` 래퍼 마크업은 `apps/portfolio/app/(services)/<name>/page.tsx`의 것을 그대로 유지한다.

- [ ] **Step 4: 포트폴리오에서 `(services)` route group 삭제**

```bash
git rm -r "apps/portfolio/app/(services)"
```

- [ ] **Step 5: 포트폴리오 `robots.ts`에서 서비스/실험 경로 정리 (임시)**

`apps/portfolio/app/robots.ts`는 Task 4에서 전체 disallow로 바꾼다. 이 태스크에서는 `(services)` 삭제로 깨지지 않도록 그대로 둬도 무방하다 (경로 문자열 목록일 뿐 import 아님). 변경 없이 통과.

- [ ] **Step 6: 설치 + 서비스 빌드**

Run: `npm install`
Run: `npm run build --workspace services`
Expected: PASS — 라우트 `/`, `/knit-muffler`, `/visual-novel-studio`, `/stellar-forge`, `/yearly-receipt`, `/nemo-nemo-beam`, `/asset-simulator`, `/robots.txt`, `/sitemap.xml` 생성.

- [ ] **Step 7: 포트폴리오 빌드 (회귀 확인)**

Run: `npm run build --workspace portfolio`
Expected: PASS — `(services)` 그룹이 사라졌고 나머지는 그대로. `data.tsx`는 아직 로컬 Work 복사본을 참조하므로 정상.

- [ ] **Step 8: lint + dev 확인**

Run: `npm run lint --workspace services` → PASS
Run: `npm run dev --workspace services` → 6개 서비스 라우트를 브라우저에서 하나씩 열어 렌더·인터랙션 정상 확인. `knit-muffler`에서 `SchoolSafeOuting` 폰트·아이콘이 뜨는지 확인.

- [ ] **Step 9: 커밋**

```bash
git add -A
git commit -m "feat : Work 컴포넌트와 서비스 라우트를 apps/services로 이동, 포트폴리오 (services) 그룹 제거"
```

---

## Task 4: 포트폴리오 플레이그라운드를 iframe 임베드로 전환

포트폴리오가 Work 컴포넌트를 import하지 않도록 `data.tsx` / `Work.tsx` / `WorkModal.tsx`를 고치고, 포트폴리오 쪽 Work 컴포넌트 복사본과 미사용 의존성·sitemap 설정을 제거한다.

**Files:**
- Modify: `apps/portfolio/app/(portfolio)/playground/_sections/Works/Work.tsx` (`WorkItem` 타입)
- Modify: `apps/portfolio/app/(portfolio)/playground/_sections/Works/data.tsx` (전면 교체)
- Modify: `apps/portfolio/app/(portfolio)/playground/_sections/Works/WorkModal.tsx` (iframe 렌더)
- Modify: `apps/portfolio/app/robots.ts` (전체 disallow)
- Modify: `apps/portfolio/package.json` (postbuild 제거, 미사용 deps 제거)
- Delete: `apps/portfolio/app/(portfolio)/playground/_sections/Works/{1_KnitMuffler,2_VisualNovelStudio,3_StellarForge,4_YearlyReceipt,5_PixelArtMaker,6_AssetSimulator,_shared}`
- Delete: `apps/portfolio/components/SVG.tsx`, `apps/portfolio/components/` (비면), `apps/portfolio/next-sitemap.config.js`, `apps/portfolio/gifenc.d.ts`
- Create: `apps/portfolio/.env.local` (dev 전용, gitignore 됨)

**Interfaces:**
- Consumes: `apps/services`의 서비스 라우트 경로 (`/knit-muffler` 등) — `WorkItem.embedPath`로 참조.
- Consumes: 환경변수 `NEXT_PUBLIC_SERVICES_ORIGIN` (dev: `http://localhost:3100`, prod: Vercel에서 주입).
- Produces: `WorkItem` 타입 — `content` 필드 제거, `embedPath: string` 추가. `path`(외부 링크용)는 유지.

- [ ] **Step 1: `WorkItem` 타입 수정**

`apps/portfolio/.../Works/Work.tsx`의 인터페이스에서 `content: React.ReactNode;` 를 제거하고 `embedPath: string;` 를 추가한다. `path?: string` 는 유지 (모달의 "새 탭에서 열기"용).

```ts
export interface WorkItem {
  id: number;
  title: string;
  description: string;
  period?: string;
  platforms?: { type: "mobile" | "pc"; specialized?: boolean }[];
  skills?: { icon: string | null; name: string }[];
  thumbnail?: string;
  embedPath: string;
  path?: string;
}
```

`Work.tsx` 본문은 `content`를 쓰지 않으므로 그 외 수정 없음.

- [ ] **Step 2: `data.tsx` 전면 교체**

컴포넌트 import 6줄을 모두 제거하고, 각 항목의 `content: <X />` 를 `embedPath: "/..."` 로 바꾼다. `description` / `period` / `platforms` / `thumbnail` / `path` 문자열은 **그대로 보존**한다 (한 글자도 바꾸지 않음). 확장자는 `.tsx` → `.ts` 로 변경 가능하나 필수 아님. 매핑:

| id | title | embedPath | path (외부링크) | thumbnail |
|----|-------|-----------|------|-----------|
| 1 | 뜨개뜨개 | `/knit-muffler` | `/knit-muffler` | `/playground/knit-muffler.png` |
| 2 | 비주얼 노벨 스튜디오 | `/visual-novel-studio` | `/visual-novel-studio` | `/playground/visual-novel-studio.png` |
| 3 | 별들은 굉장한 빛메이커이다 | `/stellar-forge` | `/stellar-forge` | `/playground/stellar-forge.png` |
| 4 | 올해의 영수증 만들기 | `/yearly-receipt` | `/yearly-receipt` | `/playground/yearly-receipt.png` |
| 5 | 네모네모빔 | `/nemo-nemo-beam` | `/nemo-nemo-beam` | `/playground/nemo-beam.png` |
| 6 | 자산 시뮬레이터 | `/asset-simulator` | `/asset-simulator` | (없음) |

파일 상단은 `import { WorkItem } from "./Work";` 만 남는다.

- [ ] **Step 3: `WorkModal.tsx` — iframe 렌더**

상단에 서비스 오리진 상수를 추가:

```ts
const SERVICES_ORIGIN =
  process.env.NEXT_PUBLIC_SERVICES_ORIGIN ?? "https://amaranth-project.vercel.app";
```

`{selected.content}` 를 렌더하던 좌측 패널을 iframe으로 교체한다. 해당 `<div>` (className에 `md:w-[calc(80vh-64px)]` 있는 블록) 내부를:

```tsx
{isOpen ? (
  <iframe
    key={selected.id}
    src={`${SERVICES_ORIGIN}${selected.embedPath}`}
    title={selected.title}
    loading="lazy"
    className="h-full w-full border-0"
  />
) : null}
```

`selected.path` 기반 "새 탭에서 열기" 링크는 이미 헤더에 `ExternalLink`로 있으므로 그대로 두되, `href`를 절대 URL로 바꾼다:

```tsx
{selected.path && (
  <Link
    href={`${SERVICES_ORIGIN}${selected.path}`}
    target="_blank"
    rel="noopener noreferrer"
  >
    <ExternalLink className="inline-block opacity-60 hover:opacity-80" size={20} />
  </Link>
)}
```

추가로, iframe 패널 하단(또는 헤더 타이틀 옆)에 **눈에 띄는 텍스트 링크**를 둔다 — 헤더의 작은 아이콘만으로는 부족하다:

```tsx
{selected.path && (
  <a
    href={`${SERVICES_ORIGIN}${selected.path}`}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
  >
    새 탭에서 열기 <ExternalLink size={13} />
  </a>
)}
```

배치 위치(iframe 위/아래 얇은 바 등)는 구현자 재량. 모달의 서비스는 "체험"이고 저장 데이터가 실제 서비스 페이지와 공유되지 않으므로(스펙 "저장소 동작" 참고), 진짜 작업하려는 사용자가 퍼스트파티 페이지로 쉽게 넘어갈 수 있어야 한다.

모바일 탭 토글("설명"/"결과물")에서 "결과물" 쪽도 이 iframe이 보이도록 기존 조건부 클래스는 유지한다 (`mobileView === "content"`).

- [ ] **Step 4: 포트폴리오 Work 컴포넌트 복사본 삭제**

```bash
cd apps/portfolio/app/\(portfolio\)/playground/_sections/Works
git rm -r 1_KnitMuffler 2_VisualNovelStudio 3_StellarForge 4_YearlyReceipt 5_PixelArtMaker 6_AssetSimulator _shared
cd -
git rm apps/portfolio/components/SVG.tsx
git rm apps/portfolio/gifenc.d.ts
git rm apps/portfolio/next-sitemap.config.js
```

`apps/portfolio/components/` 가 비면 디렉터리도 제거.

- [ ] **Step 5: 포트폴리오 `robots.ts` 전체 disallow**

`apps/portfolio/app/robots.ts` 전체를 교체:

```ts
import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}
```

- [ ] **Step 6: 포트폴리오 `package.json` 정리**

- `scripts`에서 `"postbuild": "next-sitemap"` 제거
- `dependencies`에서 `next-sitemap`, `gifenc`, `html-to-image` 제거
- `@tanstack/react-virtual`(engineering-note·pretext에서 사용), `@chenglou/pretext`(pretext에서 사용), `lucide-react`(WorkModal 등), `pretendard` 는 **유지**
- `devDependencies`의 `playwright` 는 유지

확인:

Run: `grep -rn "gifenc\|html-to-image\|next-sitemap" apps/portfolio/app apps/portfolio/*.ts apps/portfolio/*.js 2>/dev/null`
Expected: 결과 없음 (참조가 모두 사라짐).

- [ ] **Step 7: AdSense·verification 포트폴리오에서 제거**

`apps/portfolio/app/layout.tsx`:
- `<head>` 안의 AdSense `<script async src="https://pagead2.googlesyndication.com/...">` 제거 (`<head>`가 비면 `<head>` 태그도 제거)
- `metadata`에서 `verification: { google: "..." }` 제거
- `metadata.robots` 는 `(portfolio)/layout.tsx`에 이미 noindex가 있으나, 루트에도 `robots: { index: false, follow: false }` 를 추가해 experiments 포함 전체를 덮는다

- [ ] **Step 8: `.env.local` 생성 (dev용)**

```bash
printf 'NEXT_PUBLIC_SERVICES_ORIGIN=http://localhost:3100\n' > apps/portfolio/.env.local
```

(`.env*` 는 gitignore 됨 — 커밋되지 않음. 프로덕션 값은 Task 7에서 Vercel에 설정.)

- [ ] **Step 9: 빌드 검증**

Run: `npm install`
Run: `npm run build --workspace portfolio`
Expected: PASS. `data.tsx` / `WorkModal.tsx` 에 Work 컴포넌트 import 없음. sitemap 생성 안 함.

Run: `grep -rn "playground/_sections/Works/[1-6]_\|_sections/Works/_shared" apps/portfolio`
Expected: 결과 없음.

- [ ] **Step 10: lint + dev 통합 확인 (두 앱 동시)**

터미널 2개:
- `npm run dev --workspace services` (:3100)
- `npm run dev --workspace portfolio` (:3000)

확인:
- `http://localhost:3000/playground` — Works 캐러셀 썸네일 정상 (id 6은 썸네일 없어 타이틀 폴백)
- 활성 항목 클릭 → 모달에 `http://localhost:3100/<embedPath>` iframe 로드, 인터랙션 동작
- 브라우저 콘솔에 CSP/`frame-ancestors` 위반 에러 없음 (services `next.config.ts`가 `localhost:3000` 허용)
- 헤더 `ExternalLink` 클릭 → 새 탭에서 `http://localhost:3100/<path>` 열림
- 모바일 폭에서 "결과물" 탭 → iframe 표시
- `http://localhost:3000/robots.txt` → `Disallow: /`

- [ ] **Step 11: 커밋**

```bash
git add -A
git commit -m "feat : 포트폴리오 플레이그라운드를 서비스 iframe 임베드로 전환, Work 복사본·sitemap 제거"
```

---

## Task 5: 서비스 통합 도메인 랜딩 (임시 6개 목록)

`apps/services/app/page.tsx` 를 6개 서비스 카드 목록으로 채운다. 정식 디자인은 이후 별도 세션 — 지금은 각 서비스로 이동 가능한 최소 목록.

**Files:**
- Modify: `apps/services/app/page.tsx`
- Create: `apps/services/app/_components/ServiceList.tsx` (선택 — 인라인 가능)

**Interfaces:**
- Consumes: 서비스 라우트 6개, `apps/services/public/playground/*.png` 썸네일.
- Produces: `/` — 6개 서비스 링크 목록.

- [ ] **Step 1: 데이터 + 마크업 작성**

`apps/services/app/page.tsx`:

```tsx
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "amaranth",
  description: "브라우저에서 바로 쓰는 작은 도구 모음",
};

const services = [
  { path: "/knit-muffler", title: "뜨개뜨개", desc: "도안을 따라 뜨개질 작품을 만드는 게임", thumb: "/playground/knit-muffler.png" },
  { path: "/visual-novel-studio", title: "비주얼 노벨 스튜디오", desc: "캐릭터와 대사로 짧은 비주얼 노벨을 만드는 도구", thumb: "/playground/visual-novel-studio.png" },
  { path: "/stellar-forge", title: "별들은 굉장한 빛메이커이다", desc: "핵융합 순서로 원소를 합성하는 항성 시뮬레이션", thumb: "/playground/stellar-forge.png" },
  { path: "/yearly-receipt", title: "올해의 영수증 만들기", desc: "올해 목표 달성 현황을 영수증으로 출력하는 도구", thumb: "/playground/yearly-receipt.png" },
  { path: "/nemo-nemo-beam", title: "네모네모빔", desc: "바탕화면처럼 작품이 쌓이는 픽셀아트 편집기", thumb: "/playground/nemo-beam.png" },
  { path: "/asset-simulator", title: "자산 시뮬레이터", desc: "수입·지출·이체 일정으로 미래 자산 추이를 보는 도구", thumb: null },
];

export default function Home() {
  return (
    <main className="mx-auto min-h-dvh max-w-3xl px-6 py-16 bg-gray-950 text-white">
      <h1 className="text-3xl font-bold tracking-tight">amaranth</h1>
      <p className="mt-2 text-gray-400">브라우저에서 바로 쓰는 작은 도구 모음</p>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {services.map((s) => (
          <li key={s.path}>
            <Link
              href={s.path}
              className="flex h-full flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 transition-colors hover:border-white/20 hover:bg-white/10"
            >
              <div className="relative aspect-video overflow-hidden rounded-lg bg-white/5">
                {s.thumb ? (
                  <Image src={s.thumb} alt="" fill className="object-cover" />
                ) : null}
              </div>
              <div>
                <p className="font-medium">{s.title}</p>
                <p className="mt-1 text-sm text-gray-400">{s.desc}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

카드 설명(`desc`)은 `CLAUDE.md` Writing Guidelines에 맞춰 다듬는다 (번역투 금지, 단정형).

- [ ] **Step 2: 빌드 + lint**

Run: `npm run build --workspace services` → PASS
Run: `npm run lint --workspace services` → PASS

- [ ] **Step 3: dev 확인**

`http://localhost:3100/` → 6개 카드, 각 카드 클릭 시 해당 서비스로 이동.

- [ ] **Step 4: 커밋**

```bash
git add -A
git commit -m "feat : 서비스 도메인 임시 랜딩 (6개 서비스 목록)"
```

---

## Task 6: `CLAUDE.md` / `.claude/commands` 경로 동기화

재배치로 깨진 문서·커맨드 경로를 갱신한다. `.claude/` 는 gitignore 되므로 실제 커밋에는 `CLAUDE.md` 만 포함된다 — `.claude/commands/*.md` 는 로컬 파일로 갱신한다.

**Files:**
- Modify: `CLAUDE.md`
- Modify (로컬): `.claude/commands/new-work.md`, `.claude/commands/new-interaction.md`, `.claude/commands/new-research.md`, `.claude/commands/new-note.md`, `.claude/commands/commit.md`

**Interfaces:**
- Consumes: Task 1–5의 최종 디렉터리 구조.

- [ ] **Step 1: `CLAUDE.md` Commands 섹션**

`npm run dev` / `npm run build` / `npm run lint` 가 이제 workspace 명령임을 반영:

```
npm run dev            # 포트폴리오 dev (:3000)
npm run dev:services   # 서비스 dev (:3100)
npm run build          # 두 앱 모두 빌드
npm run lint           # 두 앱 모두 lint
```

- [ ] **Step 2: `CLAUDE.md` Architecture 섹션**

- "App structure" 경로를 `apps/portfolio/app/...` / `apps/services/app/...` 로 갱신
- 모노레포 구조 설명 추가: `apps/portfolio`(포트폴리오, noindex), `apps/services`(서비스, index), Work 컴포넌트는 `apps/services/components/works/`, 포트폴리오는 iframe 임베드
- "Adding a new interaction" 경로: `apps/portfolio/app/(portfolio)/playground/_sections/Interactions/`
- InteractionCard 경로: `apps/portfolio/.../Interactions/InteractionCard.tsx`

- [ ] **Step 3: `CLAUDE.md` Slash Commands 표**

데이터 파일 경로 갱신:

| 커맨드 | 데이터 파일 |
|--------|------------|
| `/new-work` | 서비스: `apps/services/components/works/` + `apps/services/app/<name>/page.tsx`, 포트폴리오: `apps/portfolio/app/(portfolio)/playground/_sections/Works/data.tsx` (iframe 항목) |
| `/new-interaction` | `apps/portfolio/app/(portfolio)/playground/_sections/Interactions.tsx` |
| `/new-research` | `apps/portfolio/app/(portfolio)/interaction-lab/_sections/data.ts` |
| `/new-note` | `apps/portfolio/app/(portfolio)/engineering-note/_sections/data.ts` |

"동기화 규칙"에 `WorkItem.content` 제거 / `embedPath` 추가를 반영.

- [ ] **Step 4: `.claude/commands/new-work.md` (로컬)**

새 Work 추가 절차를 2곳 편집으로 갱신:
1. `apps/services/components/works/<N_Name>/` 에 컴포넌트 추가
2. `apps/services/app/<name>/page.tsx` 라우트 추가 (metadata 포함)
3. `apps/portfolio/.../Works/data.tsx` 에 `{ id, title, description, period, platforms, thumbnail, embedPath, path }` 항목 추가 — **`content` 없음**
4. `apps/services/public/playground/` + `apps/portfolio/public/playground/` 에 썸네일 추가

예시 `WorkItem` 코드블록에서 `content: <X />` 제거, `embedPath: "/x"` 추가.

- [ ] **Step 5: 나머지 커맨드 파일 (로컬)**

`new-interaction.md` / `new-research.md` / `new-note.md` / `commit.md` 안의 파일 경로를 `apps/portfolio/...` 로 치환. `commit.md` 의 문서 생성 경로(`docs/superpowers/...`)는 루트 유지이므로 변경 없음.

- [ ] **Step 6: 커밋**

```bash
git add CLAUDE.md
git commit -m "docs : 모노레포 구조에 맞춰 CLAUDE.md 경로·커맨드 갱신"
```

---

## Task 7: Vercel 프로젝트 2개 구성 및 배포 검증

대시보드 작업 위주. 코드 변경 없음 — 체크리스트로 수행하고 결과를 확인한다.

**Files:**
- (선택) Create: `apps/portfolio/.env.example`, `apps/services/.env.example` — `.gitignore` 에 `!.env.example` 추가 시 커밋 가능. 필수 아님.

**Interfaces:**
- Consumes: GitHub 레포(모노레포 상태), Task 1–6 완료.

- [ ] **Step 1: 브랜치 푸시 + 프리뷰 확인 준비**

feature 브랜치를 origin에 push 한다. (아직 Vercel 프로젝트가 1개면 이 push로 기존 프로젝트가 프리뷰를 만든다 — Root Directory 미설정이라 실패할 수 있음, 정상.)

- [ ] **Step 2: 기존 Vercel 프로젝트 → portfolio 로 전환**

Vercel 대시보드 → 기존 프로젝트 Settings:
- **General → Root Directory**: `apps/portfolio`
- **General → Project Name**: `amaranth-portfolio` (또는 유지)
- **Build & Development**: Framework Next.js 자동, Install Command 는 루트에서 `npm install` (모노레포 자동 감지), 필요 시 "Include files outside of the Root Directory" **켬**
- **Domains**: `amaranth-portfolio.vercel.app` 를 프로덕션 도메인으로
- **Environment Variables**:
  - `NEXT_PUBLIC_SERVICES_ORIGIN` = `https://amaranth-project.vercel.app` (Production, Preview)
  - `SITE_URL` = `https://amaranth-portfolio.vercel.app`
- **Git → Ignored Build Step**: `git diff --quiet HEAD^ HEAD -- apps/portfolio` (또는 UI의 "Only build if changes in apps/portfolio")

- [ ] **Step 3: services Vercel 프로젝트 신규 생성**

- 같은 GitHub 레포를 Import
- **Root Directory**: `apps/services`
- **Include files outside of the Root Directory**: 켬
- **Domains**: `amaranth-project.vercel.app` (기존 도메인이 이 프로젝트로 오도록 이전 — 기존 프로젝트에서 도메인 제거 후 신규 프로젝트에 추가)
- **Environment Variables**: `SITE_URL` = `https://amaranth-project.vercel.app`
- **Git → Ignored Build Step**: `git diff --quiet HEAD^ HEAD -- apps/services`

> 첫 배포는 `HEAD^` 가 없어 Ignored Build Step 이 오작동할 수 있으니 각 프로젝트를 "Redeploy" 로 한 번 수동 배포한다.

- [ ] **Step 4: 프리뷰 배포로 교차 임베드 확인**

두 프로젝트의 프리뷰 URL 확보 후:
- portfolio 프리뷰의 `NEXT_PUBLIC_SERVICES_ORIGIN` 이 services **프로덕션**(`amaranth-project.vercel.app`)을 가리키므로, `/playground` 모달 iframe 이 프로덕션 서비스를 로드하는지 확인
- services `next.config.ts` 의 `frame-ancestors` 에 portfolio 프리뷰 도메인(`*.vercel.app`)이 없으면 프리뷰끼리는 임베드가 막힌다. 필요하면 `PORTFOLIO_ORIGINS` 에 `https://amaranth-portfolio.vercel.app` 외에 프리뷰 와일드카드 대응을 검토 — CSP `frame-ancestors` 는 와일드카드 서브도메인(`https://*.vercel.app`)을 허용하므로 임시로 추가 가능(프로덕션에선 좁히기)

- [ ] **Step 5: main 병합 + 프로덕션 검증**

- feature 브랜치를 `main` 에 병합
- portfolio 프로젝트: `amaranth-portfolio.vercel.app` 배포 확인, `/playground` iframe 이 `amaranth-project.vercel.app` 서비스 로드, `/robots.txt` 가 `Disallow: /`
- services 프로젝트: `amaranth-project.vercel.app` 배포 확인, 6개 서비스 라우트 정상, `/sitemap.xml` 생성, `/robots.txt` 색인 허용, AdSense·GSC verification 태그 존재
- 기존에 색인됐던 서비스 URL(`amaranth-project.vercel.app/knit-muffler` 등)이 그대로 유효한지 확인
- `apps/services` 만 수정한 커밋을 push → services 프로젝트만 빌드되고 portfolio 는 skip 되는지 배포 로그로 확인

- [ ] **Step 6: 마무리 커밋 (있는 경우)**

`frame-ancestors` 조정 등 코드 변경이 생겼으면:

```bash
git add -A
git commit -m "chore : 배포 환경에 맞춰 CSP frame-ancestors 조정"
```

---

## Self-Review

**Spec coverage:**

| Spec 항목 | 구현 태스크 |
|-----------|-------------|
| npm workspaces + 앱 2개 | Task 1, 2 |
| Work 컴포넌트·SVG.tsx → 서비스 앱 | Task 3 |
| `_shared/` 이동 | Task 3 (Step 1에 포함) |
| 포트폴리오 iframe 임베드 (`NEXT_PUBLIC_SERVICES_ORIGIN`, lazy, 새 탭 링크) | Task 4 |
| 서비스 CSP `frame-ancestors` | Task 2 (Step 2), Task 7 (Step 4 조정) |
| 포트폴리오 noindex / 서비스 index | Task 4 Step 5·7, Task 2 Step 5·6 |
| AdSense·verification 서비스 전용 | Task 2 Step 5, Task 4 Step 7 |
| 실험 → 포트폴리오(noindex 됨) | Task 1 (이관), Task 4 Step 7 (루트 robots) |
| 서비스 임시 랜딩 | Task 5 |
| Vercel 프로젝트 2개·Root Directory·Ignored Build Step·도메인 | Task 7 |
| 도메인값 amaranth-portfolio / amaranth-project | Task 4, 7 |
| Turborepo 미도입 | 계획 전체 (npm workspaces만) |
| `.claude`·CLAUDE.md 동기화 | Task 6 |
| `public/playground` 양쪽 필요 | Task 3 Step 1 (서비스로 복사), Task 4 (포트폴리오 유지) |
| `scratch-task3-verify` 삭제 | Task 1 Step 1 |

**Placeholder scan:** Task 5·2의 임시 랜딩은 스펙이 "임시"로 명시한 항목이며 정식 빌딩은 범위 밖. 그 외 "TBD/TODO/적절히" 없음. 모든 코드 단계에 실제 코드 포함.

**Type consistency:** `WorkItem` 은 Task 4 Step 1에서 `content` 제거 + `embedPath: string` 추가로 한 번만 정의되고, `data.tsx`(Step 2)·`WorkModal.tsx`(Step 3)가 동일하게 `selected.embedPath` / `selected.path` 를 참조한다. `CURSOR_NORMAL`·`KnitMufflerIcon` named export 는 Task 3 Interfaces에 명시. 서비스 라우트 경로와 `embedPath` 문자열이 Task 3·4에서 동일 표로 일치.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-08-28-domain-split-monorepo.md`. 두 가지 실행 옵션:**

**1. Subagent-Driven (추천)** — 태스크마다 새 subagent 를 띄우고 태스크 사이에 리뷰, 빠른 반복

**2. Inline Execution** — 이 세션에서 executing-plans 로 체크포인트마다 리뷰하며 진행

**어느 쪽으로 할까?**
