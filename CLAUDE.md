# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev           # Portfolio app dev server at http://localhost:3000
npm run dev:services  # Services app dev server at http://localhost:3100
npm run build         # Build both workspaces (--workspaces --if-present)
npm run lint          # Lint both workspaces (--workspaces --if-present)
```

Run all commands from the repo root. This is an npm workspaces monorepo (`"workspaces": ["apps/*"]`); `npm install` at the root installs both apps.

No test suite is configured.

## Architecture

**Stack:** Next.js 16 (App Router) + React 19 + Tailwind CSS v4 + TypeScript

**Monorepo layout:** npm workspaces, two independent Next.js apps under `apps/`, each deployed as its own Vercel project.

- `apps/portfolio/` → `amaranth-portfolio.vercel.app` — landing, engineering note, interaction lab, playground, experiments. **Not indexed** (`app/robots.ts` disallows `/`, root + `(portfolio)` layout metadata set `robots: { index: false }`). No AdSense, no Search Console verification.
- `apps/services/` → `amaranth-project.vercel.app` — the 6 standalone services, each at its own route. **Indexed** (`app/robots.ts` normal, `next-sitemap` postbuild). `app/layout.tsx` carries the AdSense script + Google verification token.

The two apps share no code. Portfolio Work demos are shown by iframe-embedding the services app (see below), so the Work components live only in `apps/services/`.

**Portfolio app structure (`apps/portfolio/app/`):**

- `page.tsx` — Landing page, links to engineering-note / interaction-lab / playground
- `(portfolio)/playground/page.tsx` — Archive page; renders `Works` (iframe-embedded services) + `Interactions`
- `(portfolio)/playground/_sections/Interactions.tsx` — Aggregator that imports and renders each interaction component in a 2-column grid
- `(portfolio)/playground/_sections/Interactions/` — One folder per interaction demo
- `(portfolio)/playground/_sections/Works/` — `Work.tsx` (grid + `WorkItem` type), `WorkModal.tsx` (renders the `<iframe>`), `data.ts` (the Work list). No Work components here.
- `(experiments)/` — `gpu-rotation/`, `pretext/` (also noindex under the portfolio policy)

**Services app structure (`apps/services/`):**

- `app/page.tsx` — Temporary 6-service list landing
- `app/<service>/page.tsx` — One route per service (`knit-muffler`, `visual-novel-studio`, `stellar-forge`, `yearly-receipt`, `nemo-nemo-beam`, `asset-simulator`), each renders its Work component full-page with route `metadata`
- `components/works/1_KnitMuffler/` … `6_AssetSimulator/`, `_shared/` — the 6 Work components
- `components/SVG.tsx` — shared SVG (`KnitMufflerIcon` etc.)
- `next.config.ts` sets a CSP `frame-ancestors` header allowing the portfolio origin to embed these pages.

**Playground ↔ services embed:** `WorkModal` mounts `<iframe src={`${SERVICES_ORIGIN}${embedPath}`}>` only when the modal opens. `SERVICES_ORIGIN` comes from `NEXT_PUBLIC_SERVICES_ORIGIN` (`http://localhost:3100` locally, `https://amaranth-project.vercel.app` in prod). The grid/thumbnails use the `thumbnail` image, so the list stays light. localStorage is **not** shared between the embedded "trial" and a first-party visit to the service domain (different origins) — an accepted trade-off; the modal also shows an "open in new tab" link to `${SERVICES_ORIGIN}${path}`.

**Adding a new interaction:**

Each interaction follows a strict pattern (all paths under `apps/portfolio/app/(portfolio)/playground/_sections/Interactions/`):

1. Create a numbered folder (e.g., `3_NewEffect/`)
2. Add three plain files: `answer.html`, `answer.css`, `answer.js`
3. Create a server component (e.g., `NewEffect.tsx`) that reads those files with `fs.readFileSync` and passes them to `<InteractionCard>`
4. Import and render the component in `apps/portfolio/app/(portfolio)/playground/_sections/Interactions.tsx`

**InteractionCard** (`apps/portfolio/app/(portfolio)/playground/_sections/Interactions/InteractionCard.tsx`) is the shared display wrapper. It's a `"use client"` component that:

- Shows a live preview by injecting HTML via `dangerouslySetInnerHTML`, scoping CSS with the CSS `@scope` rule, and executing JS via `new Function("container", jsCode)` — the JS receives the container DOM element and should return a cleanup function
- Shows a code view with HTML/CSS/JS tabs and a copy button
- Hover on the title shows the description tooltip

**Design system:** Dark theme (`bg-gray-950`, `text-white`) throughout. UI uses `white/5`, `white/10` etc. glass-morphism tokens with Tailwind. Geist Sans/Mono fonts loaded via `next/font/google`.

## Slash Commands

프로젝트에 콘텐츠를 추가하는 4개의 커맨드가 `.claude/commands/`에 정의되어 있다. `.claude/`는 gitignore 되므로 로컬에만 존재한다 — 아래 경로가 바뀌면 커맨드 파일도 로컬에서 갱신한다.

| 커맨드 | 역할 | 핵심 데이터 타입 | 데이터 파일 |
|--------|------|-----------------|------------|
| `/new-work` | 플레이그라운드 Work 추가 | `WorkItem` | 서비스 앱 + `apps/portfolio/app/(portfolio)/playground/_sections/Works/data.ts` |
| `/new-interaction` | 인터랙션 랩 Interaction 추가 | — | `apps/portfolio/app/(portfolio)/playground/_sections/Interactions.tsx` |
| `/new-research` | 인터랙션 랩 Research 추가 | `ResearchRecord` | `apps/portfolio/app/(portfolio)/interaction-lab/_sections/data.ts` |
| `/new-note` | 엔지니어링 노트 항목 추가 | `EngineeringEntry` | `apps/portfolio/app/(portfolio)/engineering-note/_sections/data.ts` |

**`/new-work` 절차 (2곳 편집):**

1. 서비스 앱에 컴포넌트 추가 — `apps/services/components/works/<N_Name>/`
2. 서비스 앱에 라우트 추가 — `apps/services/app/<name>/page.tsx` (`metadata` 포함, Work 컴포넌트를 풀페이지로 렌더)
3. 포트폴리오 `data.ts` 에 항목 추가 — `{ id, title, description, period, platforms, thumbnail, embedPath, path }` (**`content` 필드 없음** — 라이브 컴포넌트가 아닌 iframe 참조)
4. 썸네일을 `apps/services/public/playground/` 와 `apps/portfolio/public/playground/` **양쪽**에 추가

**동기화 규칙:** 위 데이터 타입(`WorkItem`, `ResearchRecord`, `EngineeringEntry`) 또는 컴포넌트 패턴(`InteractionCard` props 등)이 변경되면, 대응하는 커맨드 파일(`.claude/commands/new-*.md`)의 예시 코드도 함께 업데이트해야 한다. `WorkItem` 은 도메인 분리로 `content` 필드가 사라지고 `embedPath: string` 이 추가됐다(`path?` 는 유지).

## Interaction Guidance Policy

When the user asks about implementing a new interaction, **do not write the answer files directly**. Instead, provide a learning guide that covers:

1. Core visual concept — what CSS/JS techniques are involved and why
2. HTML structure — what elements are needed (not the actual markup)
3. CSS approach — key properties/values with brief explanation
4. JS logic — algorithm/pseudocode or step-by-step hints
5. Suggested implementation order

The user will implement it themselves. Only provide actual code if explicitly asked.

## Writing Guidelines

프로젝트 내 모든 설명 문구(Work `description`, Research `summary`/`findings`, Engineering Note `problem`/`approach`/`outcome`, 인터랙션 tooltip 등)는 장황한 표현 대신 명확하고 직관적인 한국어로 쓴다.

- 번역투("~에 대해", "~를 통해", "~에 있어") 피하고 조사로 직결한다
- 같은 단어·구를 문장 안에서 반복하지 않는다 (예: "A가 제공됩니다. A를 활성화하면" → "A를 제공합니다. 활성화하면")
- "~할 수 있다", "~것이다", "~가능합니다" 같은 간접 표현은 실제로 가능성·선택지를 뜻할 때만 쓰고, 단정 가능한 사실은 단정형으로 쓴다
- 고유명사·수치·기술 용어(반응식, API명 등)는 그대로 보존한다 — 문체만 다듬고 의미는 절대 바꾸지 않는다
- 새 설명 문구를 추가하거나 기존 문구를 다듬을 때는 `humanize-korean` 스킬(plugin: `im-not-ai/humanize-korean`)의 원칙을 따른다
