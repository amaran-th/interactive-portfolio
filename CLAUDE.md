# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Production build
npm run lint     # Run ESLint
```

No test suite is configured.

## Architecture

**Stack:** Next.js 16 (App Router) + React 19 + Tailwind CSS v4 + TypeScript

**App structure:**

- `app/page.tsx` — Landing page, links to the interaction archive
- `app/playground/page.tsx` — Archive page; renders all interaction components in a 2-column grid
- `app/(portfolio)/playground/_sections/Interactions/` — One folder per interaction demo

**Adding a new interaction:**

Each interaction follows a strict pattern:

1. Create a numbered folder under `_sections/` (e.g., `7_NewEffect/`)
2. Add three plain files: `answer.html`, `answer.css`, `answer.js`
3. Create a server component (e.g., `NewEffect.tsx`) that reads those files with `fs.readFileSync` and passes them to `<InteractionCard>`
4. Import and render the component in `app/playground/page.tsx`

**InteractionCard** (`_sections/InteractionCard.tsx`) is the shared display wrapper. It's a `"use client"` component that:

- Shows a live preview by injecting HTML via `dangerouslySetInnerHTML`, scoping CSS with the CSS `@scope` rule, and executing JS via `new Function("container", jsCode)` — the JS receives the container DOM element and should return a cleanup function
- Shows a code view with HTML/CSS/JS tabs and a copy button
- Hover on the title shows the description tooltip

**Design system:** Dark theme (`bg-gray-950`, `text-white`) throughout. UI uses `white/5`, `white/10` etc. glass-morphism tokens with Tailwind. Geist Sans/Mono fonts loaded via `next/font/google`.

## Slash Commands

프로젝트에 콘텐츠를 추가하는 4개의 커맨드가 `.claude/commands/`에 정의되어 있다.

| 커맨드 | 역할 | 핵심 데이터 타입 | 데이터 파일 |
|--------|------|-----------------|------------|
| `/new-work` | 플레이그라운드 Work 추가 | `WorkItem` | `Works/data.tsx` |
| `/new-interaction` | 인터랙션 랩 Interaction 추가 | — | `Interactions.tsx` |
| `/new-research` | 인터랙션 랩 Research 추가 | `ResearchRecord` | `interaction-lab/_sections/data.ts` |
| `/new-note` | 엔지니어링 노트 항목 추가 | `EngineeringEntry` | `engineering-note/_sections/data.ts` |

**동기화 규칙:** 위 데이터 타입(`WorkItem`, `ResearchRecord`, `EngineeringEntry`) 또는 컴포넌트 패턴(`InteractionCard` props 등)이 변경되면, 대응하는 커맨드 파일(`.claude/commands/new-*.md`)의 예시 코드도 함께 업데이트해야 한다.

## Interaction Guidance Policy

When the user asks about implementing a new interaction, **do not write the answer files directly**. Instead, provide a learning guide that covers:

1. Core visual concept — what CSS/JS techniques are involved and why
2. HTML structure — what elements are needed (not the actual markup)
3. CSS approach — key properties/values with brief explanation
4. JS logic — algorithm/pseudocode or step-by-step hints
5. Suggested implementation order

The user will implement it themselves. Only provide actual code if explicitly asked.
