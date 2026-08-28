# 포트폴리오 / 서비스 도메인 분리 — 모노레포 설계 문서

## 개요

현재 이 레포는 Next.js 앱 하나로, 고유 서비스(`app/(services)/` 아래 6개)와 포트폴리오(`app/(portfolio)/` 아래 랜딩·엔지니어링 노트·인터랙션 랩·플레이그라운드), 실험(`app/(experiments)/`)이 전부 같은 Vercel 프로젝트·같은 도메인 `/` 경로로 서빙된다. route group이라 URL에는 그룹명이 붙지 않아 `/asset-simulator`와 `/playground`가 같은 사이트에 공존한다.

서비스를 배포하면 포트폴리오가 같은 도메인에 노출되는 구조가 부담스럽다. 레포는 하나로 유지하면서 도메인을 둘로 분리한다.

- **포트폴리오** → `amaranth-portfolio.vercel.app` (색인 안 함)
- **서비스 통합** → `amaranth-project.vercel.app` (색인함, 기존 도메인 승계)

분리 방식은 **npm workspaces 모노레포 + 앱 2개**다. 두 앱은 각각 독립된 Next.js 앱이며 각자의 Vercel 프로젝트로 배포된다. 서비스 배포본에 포트폴리오 코드가 들어가지 않는다(번들 분리).

## 결정 사항

| # | 항목 | 결정 |
|---|---|---|
| A | 실험(`gpu-rotation`, `pretext`) 소속 | **포트폴리오 앱**으로 이동 (색인 정책은 아래 "SEO" 참고) |
| B | `amaranth-project.vercel.app/` 루트 페이지 | 6개 서비스 목록 랜딩을 **임시로** 제작. 정식 빌딩은 이후 별도 세션 |
| C | AdSense + Google Search Console verification | **서비스 앱에만** 넣는다. 포트폴리오 앱에서는 제거 |
| D | 도메인 | 포트폴리오 `amaranth-portfolio.vercel.app`, 서비스 `amaranth-project.vercel.app` |
| E | Turborepo | 도입하지 않음. npm workspaces만으로 관리 (공유 패키지가 없어 이점이 작음) |

## 컴포넌트가 공유되지 않는 이유

원래 6개 서비스 페이지는 각자의 UI를 `app/(portfolio)/playground/_sections/Works/N_.../` 에서 import 하고, 플레이그라운드도 같은 Work 컴포넌트를 라이브로 렌더한다. 즉 Work 컴포넌트 6종이 두 영역에 공유됐다.

이번 설계에서 **포트폴리오는 Work 컴포넌트를 import 하지 않고 iframe으로 임베드**한다(아래 "iframe 임베드"). 그 결과 Work 컴포넌트의 소비처는 서비스 앱 하나뿐이므로, 별도 공유 패키지를 두지 않고 서비스 앱 내부 코드로 옮긴다. `components/SVG.tsx`(`KnitMufflerIcon`)도 `KnitMuffler`에서만 쓰이므로 서비스 앱으로 함께 이동한다.

## 최종 디렉터리 구조

```
interactive-portfolio/                       레포 루트 (이름 유지)
├── package.json                             "workspaces": ["apps/*"]
├── apps/
│   ├── portfolio/                           → amaranth-portfolio.vercel.app  (noindex)
│   │   ├── app/
│   │   │   ├── layout.tsx                   루트 레이아웃 (폰트만, AdSense·verification 없음)
│   │   │   ├── page.tsx                     랜딩
│   │   │   ├── globals.css                  Tailwind + @theme (Work용 폰트/utility 불필요)
│   │   │   ├── robots.ts                    전체 disallow
│   │   │   ├── engineering-note/
│   │   │   ├── interaction-lab/
│   │   │   ├── playground/
│   │   │   │   └── _sections/Works/
│   │   │   │       ├── data.tsx             content: iframe 참조로 교체, 컴포넌트 import 0
│   │   │   │       ├── Work.tsx  WorkModal.tsx  ...
│   │   │   └── experiments/                 gpu-rotation, pretext
│   │   ├── next.config.ts
│   │   ├── tsconfig.json                    "@/*": ["./*"]
│   │   └── package.json
│   └── services/                            → amaranth-project.vercel.app  (index)
│       ├── app/
│       │   ├── layout.tsx                   루트 레이아웃 (폰트 + AdSense + verification)
│       │   ├── page.tsx                     6개 서비스 목록 (임시)
│       │   ├── globals.css                  Tailwind + @theme + SchoolSafeOuting @font-face + @utility font-knit-muffler
│       │   ├── robots.ts                    정상 색인
│       │   ├── knit-muffler/page.tsx
│       │   ├── visual-novel-studio/page.tsx
│       │   ├── stellar-forge/page.tsx
│       │   ├── yearly-receipt/page.tsx
│       │   ├── nemo-nemo-beam/page.tsx
│       │   └── asset-simulator/page.tsx
│       ├── components/
│       │   ├── SVG.tsx                      (기존 루트 components/SVG.tsx)
│       │   └── works/                       Work 컴포넌트 6종 (기존 폴더 그대로 이동)
│       │       ├── 1_KnitMuffler/  2_VisualNovelStudio/  3_StellarForge/
│       │       ├── 4_YearlyReceipt/  5_PixelArtMaker/  6_AssetSimulator/
│       ├── next.config.ts                   svgr rules + CSP frame-ancestors 헤더
│       ├── next-sitemap.config.js
│       ├── tsconfig.json                    "@/*": ["./*"]
│       └── package.json                     deps: react, react-dom, lucide-react, gifenc, html-to-image, next-sitemap ...
├── daily-note/                              루트 유지 (빌드 무관)
├── docs/                                    루트 유지
└── .claude/                                 commands·CLAUDE.md 경로 갱신 (아래 ".claude 동기화")
```

- `app/scratch-task3-verify/`(빈 디렉터리)는 삭제한다.
- `@tanstack/react-virtual`은 엔지니어링 노트(포트폴리오)와 `pretext`(포트폴리오)에서 쓰이므로 포트폴리오 앱 의존성. `@chenglou/pretext`도 포트폴리오 앱 의존성.
- 각 앱은 자체 `next.config.ts`, `tsconfig.json`, `globals.css`, 루트 레이아웃을 가진다. 공유 설정 패키지는 두지 않고 각 앱이 자기 사본을 관리한다.

## iframe 임베드

### 포트폴리오 쪽 (`apps/portfolio`)

- `playground/_sections/Works/data.tsx` 의 각 항목에서 `content: <KnitMuffler />` 를 iframe 참조 데이터로 교체한다. 예: `embedPath: "/knit-muffler"`. Work 컴포넌트 import 문을 전부 제거한다.
- `WorkModal` 은 모달이 열릴 때만 `<iframe src={`${SERVICES_ORIGIN}${embedPath}`} loading="lazy">` 를 마운트한다. 그리드/썸네일은 기존 `thumbnail` 이미지를 그대로 쓰므로 목록은 가볍다.
- `SERVICES_ORIGIN` 은 `NEXT_PUBLIC_SERVICES_ORIGIN` 환경변수로 주입한다.
  - 로컬: `http://localhost:3100`
  - 프로덕션: `https://amaranth-project.vercel.app`
- iframe 크기는 모달이 정한 뷰포트(예: 90vw × 90vh)에 iframe 100%. 스크롤·반응형은 서비스 페이지가 담당한다. `postMessage` 로 높이를 주고받는 것은 이후 최적화 과제이며 이번 범위 밖.
- 모바일 등 iframe 상호작용이 불편한 환경을 위해 "새 탭에서 열기" 링크(`https://amaranth-project.vercel.app{embedPath}`)를 모달에 함께 둔다.

### 서비스 쪽 (`apps/services`)

- 각 서비스 `page.tsx` 는 지금처럼 해당 Work 컴포넌트를 풀페이지로 렌더한다. import 경로만 `@/components/works/...` 로 조정.
- **CSP `frame-ancestors`** 를 서비스 앱에 설정한다. `next.config.ts` 의 `headers()` 또는 `middleware.ts`:
  ```
  Content-Security-Policy: frame-ancestors 'self' https://amaranth-portfolio.vercel.app http://localhost:3000
  ```
  기본값은 외부 임베드 차단이므로 포트폴리오 오리진을 명시적으로 허용해야 한다. 그 외 도메인의 임베드는 자동 차단된다.

## Vercel 설정

같은 GitHub 레포에 Vercel 프로젝트 2개를 연결한다.

| 항목 | portfolio 프로젝트 | services 프로젝트 |
|---|---|---|
| 생성 방식 | 기존 프로젝트 재활용 (Root Directory 변경 + rename) | 신규 생성 |
| Git 레포 | 동일 레포 | 동일 레포 |
| Root Directory | `apps/portfolio` | `apps/services` |
| Include files outside root | 켬 | 켬 |
| 프로덕션 도메인 | `amaranth-portfolio.vercel.app` | `amaranth-project.vercel.app` |
| Ignored Build Step | `git diff --quiet HEAD^ HEAD -- apps/portfolio` | `git diff --quiet HEAD^ HEAD -- apps/services` |

> Ignored Build Step 은 Vercel Project Settings → Git 의 "Only build if there are changes in this folder" 옵션(모노레포 감지 시 노출)으로 대체 가능하다. 커맨드 방식을 쓸 경우 첫 빌드·스쿼시 머지에서 `HEAD^` 가 없을 수 있으니 프로젝트 첫 배포는 수동으로 한 번 돌린다.
| 환경변수 | `NEXT_PUBLIC_SERVICES_ORIGIN=https://amaranth-project.vercel.app`, `SITE_URL=https://amaranth-portfolio.vercel.app` | `SITE_URL=https://amaranth-project.vercel.app` |

- 서비스 도메인 `amaranth-project.vercel.app` 은 현재 `next-sitemap.config.js` 의 기본 `siteUrl` 과 동일하다 → 기존에 색인된 서비스 URL이 그대로 유지된다.
- 현재 프로덕션 도메인이 `amaranth-project.vercel.app` 임을 확인함 → 서비스 앱이 그대로 승계하므로 리다이렉트 불필요.

### push 할 때 배포 흐름 (`main` 기준)

```
git push origin main
   └─▶ Vercel webhook 1회 수신 → 연결된 프로젝트 각각 평가
         ├─ portfolio: Ignored Build Step 검사
         │     apps/portfolio/** 변경 → 빌드 → amaranth-portfolio.vercel.app 갱신
         │     아니면               → skip
         └─ services: Ignored Build Step 검사
               apps/services/** 변경 → 빌드 → amaranth-project.vercel.app 갱신
               아니면               → skip
```

서비스만 고쳐 push하면 services 프로젝트만 빌드·배포되고 포트폴리오 배포본은 손대지 않는다. 브랜치/PR은 각 프로젝트가 자기 프리뷰 배포를 만들고 PR에 각각 코멘트한다.

## SEO

- **포트폴리오 앱**: `robots.ts` 전체 `disallow: ["/"]`. `(portfolio)/layout.tsx` 의 기존 noindex 메타데이터와 일관. sitemap 없음(`next-sitemap` 미적용).
- **서비스 앱**: `robots.ts` 정상 색인. `next-sitemap` postbuild 로 sitemap 생성. `layout.tsx` 에 Google Search Console verification 토큰 유지.
- **실험(`gpu-rotation`, `pretext`)**: 포트폴리오 앱으로 이동하므로 포트폴리오의 전체 noindex 정책을 따른다 → 현재 색인되던 `/pretext`, `/gpu-rotation` 이 색인에서 빠진다. 이 두 페이지를 계속 색인하려면 포트폴리오 `robots.ts` 에 예외 경로를 두거나 서비스 앱으로 옮겨야 한다. 되돌릴 수 있는 결정이므로 우선 noindex로 둔다.

## 마이그레이션 순서

1. **workspace 뼈대** — 루트 `package.json` 에 `workspaces`, `apps/portfolio`·`apps/services` 빈 Next.js 앱 부트스트랩, 루트에서 `npm install` 동작 확인
2. **서비스 앱 구성**
   - `components/SVG.tsx` → `apps/services/components/SVG.tsx`
   - `Works/1_*` ~ `Works/6_*` → `apps/services/components/works/` (내부 상대 import 유지, `@/components/SVG` 경로 조정)
   - `app/(services)/*/page.tsx` → `apps/services/app/*/page.tsx`, import 경로 갱신
   - `globals.css` 에 `SchoolSafeOuting` `@font-face` 와 `@utility font-knit-muffler` 포함
   - 루트 레이아웃(폰트 + AdSense + verification), 임시 목록 `page.tsx`, `robots.ts`, `next-sitemap.config.js`
   - `next.config.ts` 에 svgr rules + CSP `frame-ancestors` 헤더
   - `npm run build` 로 서비스 앱 단독 빌드 확인
3. **포트폴리오 앱 구성**
   - `app/page.tsx`, `app/(portfolio)/*`, `app/(experiments)/*`, `app/globals.css`, 루트 레이아웃(폰트만) 이동
   - `data.tsx` 를 iframe 참조 방식으로 교체, Work 컴포넌트 import 제거
   - `WorkModal` 이 모달 오픈 시 iframe 마운트하도록 수정, "새 탭에서 열기" 링크 추가
   - `robots.ts` 전체 disallow
   - `npm run build` 로 포트폴리오 앱 단독 빌드 확인
4. **루트 정리** — 기존 `app/`, `next.config.ts`, `components/`, 루트 `next-sitemap.config.js`, `app/scratch-task3-verify/` 제거. `.gitignore`, 루트 `tsconfig.json` 조정
5. **로컬 검증** — 포트폴리오 `:3000`, 서비스 `:3100` 동시 실행. 포트폴리오 플레이그라운드 모달에서 iframe 이 로컬 서비스로 로드되는지, CSP 가 로컬 오리진을 허용하는지 확인
6. **Vercel** — 프로젝트 2개 설정, 프리뷰 배포로 확인 후 도메인 연결. 프로덕션 도메인 변경 시 리다이렉트 설정
7. **`.claude` 동기화** — 아래 항목

## .claude 동기화

`CLAUDE.md` 와 `.claude/commands/new-*.md`, `.claude/commands/commit.md` 가 `Works/data.tsx`, `app/(portfolio)/playground/_sections/...`, `app/(services)/...` 등 현재 경로를 참조한다. 재배치 후 다음을 갱신한다.

- `CLAUDE.md` 의 "App structure", "Adding a new interaction", "Slash Commands" 표의 데이터 파일 경로
- `.claude/commands/new-work.md` — `WorkItem` 데이터 경로(`apps/services/...` 및 포트폴리오 `data.tsx` iframe 항목 추가 방식), `content` 필드가 라이브 컴포넌트가 아닌 iframe 참조로 바뀐 점
- `.claude/commands/new-interaction.md`, `new-research.md`, `new-note.md` — 대상 파일 경로
- 새 Work 추가 절차: 서비스 앱에 컴포넌트·라우트 추가 + 포트폴리오 `data.tsx` 에 iframe 항목·썸네일 추가, 2곳 편집으로 바뀜

## 범위 밖 (다음 세션)

- `amaranth-project.vercel.app/` 정식 서비스 목록 랜딩 (이번엔 임시)
- iframe `postMessage` 높이 동기화 등 임베드 UX 최적화
- 실험 페이지 색인 유지 여부 재검토
- 커스텀 도메인 연결 (지금은 `.vercel.app` 서브도메인)
- Turborepo 도입 (빌드 캐시가 필요해지면)
