# 서비스 앱 도구 포털 개편 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 서비스 앱 메인을 도구 레지스트리 기반 포털(카테고리 섹션 + 검색 + 정적 카테고리 페이지)로 바꾼다. 카드 UI와 디자인은 그대로 둔다.

**Architecture:** `apps/services/lib/tools.ts` 한 파일이 카테고리·도구 데이터와 순수 함수(`searchTools`, `activeCategories`, `toolsIn`, `getCategory`)를 가진다. 기존 카드 마크업은 `ToolCard`로 그대로 옮기고, 메인은 서버에서 카테고리 섹션을 렌더한 뒤 클라이언트 `ToolSearch`가 검색어가 있을 때만 결과 그리드로 바꿔 보여 준다. `/category/[id]`는 도구가 있는 카테고리만 정적 생성한다.

**Tech Stack:** Next.js 16.1 App Router, React 19, Tailwind CSS v4, TypeScript, `lucide-react`(아이콘), Node 24 내장 `node:test`(타입 스트리핑으로 `.ts` 직접 실행), Playwright CLI(스크린샷).

**Spec:** `docs/superpowers/specs/2026-10-17-services-tool-portal-design.md`

## Global Constraints

- 카드 마크업·클래스(`STICKER`, 썸네일 박스, 배지, hover/focus 오버레이, 모바일 가로 배치)는 한 글자도 바꾸지 않는다. 배지 색·라벨만 카테고리 데이터에서 가져온다.
- 테마 토큰 `main`/`point`/`sub`/`shade`/`ink`, 컨테이너 `mx-auto max-w-6xl px-5 pt-8 pb-12`, 배경 `bg-shade text-ink`.
- 그리드 클래스 `grid gap-3 break-keep sm:grid-cols-3 sm:gap-4 lg:grid-cols-5` 유지.
- 도구 URL `/<slug>`, 각 도구 `page.tsx`·`guide.ts`·`ToolShell`, 포트폴리오 `data.ts`는 건드리지 않는다.
- 검색어는 URL·localStorage에 남기지 않는다. 외부 요청 없음 → 개인정보처리방침 변경 없음.
- 도구가 없는 카테고리(`text`, `dev`)는 칩·섹션·카테고리 페이지에서 뺀다.
- 아이콘은 이모지가 아니라 SVG(`lucide-react`).
- 새 한국어 문구는 CLAUDE.md Writing Guidelines를 따른다(번역투·반복·간접 표현 피하기).
- 커밋 메시지 형식 `feat : …` / `docs : …`, **`Co-Authored-By: Claude` 트레일러를 붙이지 않는다.** 커밋에는 이 작업 파일만 명시적으로 추가한다 — 작업 트리에 있는 다른 수정분(`5_PixelArtMaker/*`, `ScenarioTabs.tsx`, `docs/features/...`)은 건드리지 않는다.
- 명령은 레포 루트(`/Users/seyeon/Documents/github_projects/interactive-portfolio`)에서 실행한다.

## Review Focus

1. 공백만 있는 검색어(`"   "`) → 검색어 없음으로 보고 카테고리 섹션을 그대로 보여 준다. (Task 1 테스트 + Task 3 `normalize` 사용)
2. 정규식 특수문자가 든 검색어(`"("`, `".*"`) → 예외 없이 빈 결과. `includes` 비교만 쓴다. (Task 1 테스트)
3. 없는 카테고리 id(`/category/unknown`)와 도구가 없는 카테고리(`/category/text`) → 404. (Task 4 `dynamicParams = false` + 수동 확인)
4. JS가 꺼진 크롤러 → 초기 HTML에 6개 도구 카드가 모두 있다. (Task 3 빌드 HTML grep)
5. 모바일 375px에서 칩이 많아져도 가로 스크롤 없이 줄바꿈한다. (Task 2 `flex-wrap` + 스크린샷 확인)

---

## File Structure

| 파일 | 상태 | 책임 |
|------|------|------|
| `apps/services/lib/tools.ts` | Create | 카테고리·도구 데이터, 조회·검색 순수 함수 (import 없음 — node:test가 바로 실행) |
| `apps/services/lib/tools.test.mts` | Create | `node --test`용 테스트. `.mts`라 tsconfig `include`(`**/*.ts`)에 안 걸려 빌드 타입체크와 무관 |
| `apps/services/app/_components/ToolCard.tsx` | Create | 기존 카드 마크업 그대로 + `STICKER` 상수 export |
| `apps/services/app/_components/ToolGrid.tsx` | Create | 기존 그리드 `<ul>` + `ToolCard` 목록 |
| `apps/services/app/_components/CategoryChips.tsx` | Create | '전체' + 활성 카테고리 칩 링크 |
| `apps/services/app/_components/ToolSearch.tsx` | Create | `"use client"` 검색 입력 + 결과/children 전환 |
| `apps/services/app/page.tsx` | Modify | `services` 배열·`CATEGORY_STYLE`·`STICKER` 제거, 레지스트리로 섹션 렌더 |
| `apps/services/app/category/[id]/page.tsx` | Create | 정적 카테고리 페이지 |
| `CLAUDE.md` | Modify | 구조·동기화 규칙 갱신 |
| `.claude/commands/new-work.md` | Modify (gitignored, 로컬만) | 등록 위치 갱신 |

---

### Task 1: 도구 레지스트리와 검색 함수

**Files:**
- Create: `apps/services/lib/tools.ts`
- Test: `apps/services/lib/tools.test.mts`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `type CategoryId = "life" | "text" | "creative" | "dev" | "game"`
  - `type Category = { id: CategoryId; label: string; description: string; badgeClass: string }`
  - `type Tool = { slug: string; category: CategoryId; title: string; desc: string; about: string; tags: string[]; thumb: string | null }`
  - `CATEGORIES: Category[]`, `TOOLS: Tool[]`
  - `getCategory(id: string): Category | undefined`
  - `toolsIn(id: CategoryId): Tool[]`
  - `activeCategories(): Category[]` — 도구가 1개 이상인 카테고리, `CATEGORIES` 순서
  - `normalizeQuery(s: string): string` — 소문자 + 공백 제거
  - `searchTools(query: string, tools?: Tool[]): Tool[]` — 정규화한 검색어가 비면 `tools` 그대로

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/services/lib/tools.test.mts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CATEGORIES,
  TOOLS,
  activeCategories,
  getCategory,
  normalizeQuery,
  searchTools,
  toolsIn,
} from "./tools.ts";

const slugs = (tools: { slug: string }[]) => tools.map((t) => t.slug);

test("모든 도구의 카테고리가 CATEGORIES에 있고 slug가 겹치지 않는다", () => {
  const ids = new Set(CATEGORIES.map((c) => c.id));
  for (const t of TOOLS) assert.ok(ids.has(t.category), t.slug);
  assert.equal(new Set(slugs(TOOLS)).size, TOOLS.length);
});

test("activeCategories는 도구가 있는 카테고리만 순서대로 돌려준다", () => {
  assert.deepEqual(
    activeCategories().map((c) => c.id),
    ["life", "creative", "game"],
  );
});

test("toolsIn은 카테고리의 도구를 TOOLS 순서로 돌려준다", () => {
  assert.deepEqual(slugs(toolsIn("game")), ["knit-muffler", "stellar-forge"]);
  assert.deepEqual(slugs(toolsIn("life")), ["yearly-receipt", "asset-simulator"]);
  assert.deepEqual(slugs(toolsIn("creative")), ["visual-novel-studio", "nemo-nemo-beam"]);
  assert.deepEqual(toolsIn("text"), []);
});

test("getCategory는 없는 id에 undefined", () => {
  assert.equal(getCategory("game")?.label, "게임");
  assert.equal(getCategory("unknown"), undefined);
});

test("normalizeQuery는 소문자로 바꾸고 공백을 지운다", () => {
  assert.equal(normalizeQuery("  P N g "), "png");
  assert.equal(normalizeQuery("   "), "");
});

test("빈 검색어·공백만 있는 검색어는 전체를 돌려준다", () => {
  assert.deepEqual(slugs(searchTools("")), slugs(TOOLS));
  assert.deepEqual(slugs(searchTools("   ")), slugs(TOOLS));
});

test("제목·설명·태그·카테고리 이름으로 찾는다", () => {
  assert.deepEqual(slugs(searchTools("픽셀")), ["nemo-nemo-beam"]);
  assert.deepEqual(slugs(searchTools("게임")), ["knit-muffler", "stellar-forge"]);
  assert.deepEqual(slugs(searchTools("뜨개 뜨개")), ["knit-muffler"]);
  assert.deepEqual(slugs(searchTools("png")), ["nemo-nemo-beam"]);
  assert.deepEqual(slugs(searchTools("재테크")), ["asset-simulator"]);
});

test("맞는 도구가 없거나 특수문자만 있으면 빈 배열, 예외 없음", () => {
  assert.deepEqual(searchTools("없는단어xyz"), []);
  assert.deepEqual(searchTools("("), []);
  assert.deepEqual(searchTools(".*"), []);
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node --test apps/services/lib/tools.test.mts`
Expected: FAIL — `ERR_MODULE_NOT_FOUND` (`./tools.ts` 없음)

- [ ] **Step 3: 구현**

`apps/services/lib/tools.ts` — 도구 데이터는 현재 `apps/services/app/page.tsx`의 `services` 배열에서 `title`/`desc`/`about`/`thumb`를 **그대로** 옮기고 `path` → `slug`(앞의 `/` 제거)로 바꾼다:

```ts
// 서비스 앱의 도구 목록. 메인·카테고리 페이지가 모두 이 파일을 읽는다.
// node:test가 그대로 실행하도록 다른 모듈을 import하지 않는다.

export type CategoryId = "life" | "text" | "creative" | "dev" | "game";

export type Category = {
  id: CategoryId;
  label: string;
  description: string;
  // 배지·칩 배경 — amaran-th.github.io 테마 팔레트의 sub 색을 빌려 쓴다.
  badgeClass: string;
};

export type Tool = {
  slug: string;
  category: CategoryId;
  title: string;
  desc: string;
  about: string;
  tags: string[];
  thumb: string | null;
};

export const CATEGORIES: Category[] = [
  {
    id: "life",
    label: "생활·계산",
    description: "생활 속 숫자를 계산하고 기록하는 도구를 모았습니다.",
    badgeClass: "bg-sub",
  },
  {
    id: "text",
    label: "텍스트",
    description: "글을 세고, 바꾸고, 정리하는 도구를 모았습니다.",
    badgeClass: "bg-[#c5e3b5]",
  },
  {
    id: "creative",
    label: "이미지·창작",
    description: "그림을 그리고 이야기를 만드는 창작 도구를 모았습니다.",
    badgeClass: "bg-[#e7a6bc]",
  },
  {
    id: "dev",
    label: "개발·웹",
    description: "웹 개발과 웹 작업에 쓰는 도구를 모았습니다.",
    badgeClass: "bg-[#d4c4f0]",
  },
  {
    id: "game",
    label: "게임",
    description: "브라우저에서 바로 하는 게임을 모았습니다.",
    badgeClass: "bg-[#ffdd94]",
  },
];

export const TOOLS: Tool[] = [
  {
    slug: "knit-muffler",
    category: "game",
    title: "뜨개뜨개",
    desc: "정확하고 빠르게 뜨개 도안을 완성해봅시다!",
    about:
      "숫자 키나 색상 팔레트로 실 색을 골라 한 코씩 뜨고, 틀린 코는 풀어서 다시 뜹니다. EASY·NORMAL·HARD 도안 22개와 도안 없이 뜨는 자유 모드가 있고, 결과에 따라 메달을 받습니다.",
    tags: ["뜨개질", "목도리", "도안", "타이핑", "메달"],
    thumb: "/playground/knit-muffler.png",
  },
  {
    slug: "visual-novel-studio",
    category: "creative",
    title: "비주얼 노벨 스튜디오",
    desc: "캐릭터 시트와 대사를 입력해 나만의 이야기를 만들어봅시다!",
    about:
      "네모네모빔에서 그린 그림을 캐릭터와 배경으로 불러오고, 컷마다 발화자·대사·배경음악을 정해 장면을 이어 붙입니다. 완성한 이야기는 같은 화면에서 바로 재생합니다.",
    tags: ["비주얼노벨", "스토리", "대사", "캐릭터", "배경음악"],
    thumb: "/playground/visual-novel-studio.png",
  },
  {
    slug: "stellar-forge",
    category: "game",
    title: "별들은 굉장한 빛메이커이다",
    desc: "핵융합 순서대로 원소를 합성하는 항성 시뮬레이션",
    about:
      "수소를 모으고 반응로를 지어 헬륨, 탄소, 산소를 거쳐 철까지 만들어 갑니다. 복사압과 중력의 균형이 무너지거나 철이 쌓이면 초신성이 터지고, 다음 세대 별이 이어서 태어납니다.",
    tags: ["우주", "별", "핵융합", "원소", "초신성", "시뮬레이션"],
    thumb: "/playground/stellar-forge.png",
  },
  {
    slug: "yearly-receipt",
    category: "life",
    title: "올해의 영수증 만들기",
    desc: "올해 목표, 얼마나 달성했나요? 영수증을 출력하시겠습니까?",
    about:
      "목표를 카테고리와 하위 항목으로 나눠 체크형이나 진행률형으로 기록합니다. 항목 하나를 ₩10,000짜리 품목으로 보고 달성한 만큼 결제한 영수증을 만들어 이미지로 저장합니다.",
    tags: ["목표", "회고", "체크리스트", "연말"],
    thumb: "/playground/yearly-receipt.png",
  },
  {
    slug: "nemo-nemo-beam",
    category: "creative",
    title: "네모네모빔",
    desc: "픽셀아트의, 픽셀아트에 의한, 픽셀아트를 위한 에디터",
    about:
      "레이어, 프레임 애니메이션, 사진 픽셀화 기능을 갖춘 픽셀아트 편집기입니다. 저장한 그림은 바탕화면 아이콘으로 쌓이고, PNG·JPG·SVG·GIF 등으로 내보냅니다.",
    tags: ["도트", "그림", "애니메이션", "스프라이트"],
    thumb: "/playground/nemo-beam.png",
  },
  {
    slug: "asset-simulator",
    category: "life",
    title: "자산 시뮬레이터",
    desc: "내 작고 귀여운 돈, 잘 모이고 있나?",
    about:
      "보유 자산과 예정된 수입·지출·이체를 넣으면 최대 30년 동안의 자산 변화를 달마다 계산합니다. 이자 주기, 물가상승률, 목표 금액을 반영하고 시나리오 여러 개를 비교합니다.",
    tags: ["돈", "재테크", "저축", "가계부", "복리", "계산기"],
    thumb: null,
  },
];

export function getCategory(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

export function toolsIn(id: CategoryId): Tool[] {
  return TOOLS.filter((t) => t.category === id);
}

export function activeCategories(): Category[] {
  return CATEGORIES.filter((c) => toolsIn(c.id).length > 0);
}

export function normalizeQuery(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "");
}

export function searchTools(query: string, tools: Tool[] = TOOLS): Tool[] {
  const q = normalizeQuery(query);
  if (!q) return tools;
  return tools.filter((t) => {
    const haystack = [
      t.title,
      t.desc,
      t.about,
      ...t.tags,
      getCategory(t.category)?.label ?? "",
    ].join(" ");
    return normalizeQuery(haystack).includes(q);
  });
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node --test apps/services/lib/tools.test.mts`
Expected: `# pass 8`, `# fail 0` (타입 스트리핑 관련 ExperimentalWarning/MODULE_TYPELESS 경고는 무시)

- [ ] **Step 5: 린트**

Run: `npm run lint --workspace services`
Expected: 새 파일에서 에러 없음 (기존 경고는 그대로)

- [ ] **Step 6: Commit**

```bash
git add apps/services/lib/tools.ts apps/services/lib/tools.test.mts
git commit -m "feat : 서비스 앱 도구 레지스트리와 검색 함수 추가"
```

---

### Task 2: 카드 컴포넌트 분리 + 메인을 카테고리 섹션으로

**Files:**
- Create: `apps/services/app/_components/ToolCard.tsx`
- Create: `apps/services/app/_components/ToolGrid.tsx`
- Create: `apps/services/app/_components/CategoryChips.tsx`
- Modify: `apps/services/app/page.tsx` (전체 교체)

**Interfaces:**
- Consumes: `Tool`, `CategoryId`, `getCategory`, `activeCategories`, `toolsIn` (Task 1)
- Produces:
  - `export const STICKER: string` (`ToolCard.tsx`)
  - `export default function ToolCard({ tool }: { tool: Tool })`
  - `export default function ToolGrid({ tools }: { tools: Tool[] })`
  - `export default function CategoryChips({ current }: { current?: CategoryId })`

- [ ] **Step 1: 개편 전 스크린샷**

dev 서버가 3100에서 안 돌고 있으면 백그라운드로 띄운다: `npm run dev:services` (run_in_background). 뜬 뒤:

```bash
D=/private/tmp/portal-shots; mkdir -p $D
npx playwright screenshot --viewport-size "1280,900" --full-page http://localhost:3100/ $D/before-1280.png
npx playwright screenshot --viewport-size "375,812" --full-page http://localhost:3100/ $D/before-375.png
```
Expected: 두 PNG 생성.

- [ ] **Step 2: `ToolCard.tsx` 작성**

현재 `page.tsx`의 `<Link>…</Link>` 블록을 그대로 옮긴다. 바뀌는 곳은 `s.` → `tool.`, `href={s.path}` → ``href={`/${tool.slug}`}``, 배지 클래스와 라벨뿐이다.

```tsx
import Image from "next/image";
import Link from "next/link";
import { getCategory, type Tool } from "@/lib/tools";
import ServiceThumbFallback from "./ServiceThumbFallback";

// 굵은 외곽선 + 어긋난 단색 그림자 — 썸네일의 손그림 톤에 맞춘 "스티커" 카드
export const STICKER =
  "rounded-lg border-2 border-point bg-white shadow-[3px_3px_0_0_var(--color-point)]";

export default function ToolCard({ tool }: { tool: Tool }) {
  const category = getCategory(tool.category);
  return (
    <Link
      href={`/${tool.slug}`}
      className={`group relative grid h-full grid-cols-[auto_1fr] overflow-hidden sm:flex sm:flex-col transition-[translate,box-shadow] duration-150 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_0_var(--color-point)] ${STICKER}`}
    >
      <div className="relative m-3 mr-0 aspect-square w-20 shrink-0 self-start overflow-hidden border-2 border-point bg-shade sm:m-0 sm:w-auto sm:self-stretch sm:border-0 sm:border-b-2">
        {tool.thumb ? (
          <Image
            src={tool.thumb}
            alt=""
            fill
            sizes="(min-width: 1024px) 220px, (min-width: 640px) 33vw, 80px"
            className="object-cover"
          />
        ) : (
          <ServiceThumbFallback title={tool.title} />
        )}
      </div>
      {/* 모바일: 썸네일 오른쪽에 유형·이름·한 줄 소개, 설명은 그 아래 전체 폭
          sm 이상: 썸네일 아래로 모두 세로로 쌓는다 */}
      <div className="flex flex-col justify-center p-3 sm:justify-start sm:px-3 sm:pt-3 sm:pb-0 sm:pointer-fine:pb-3">
        <div className="flex items-center gap-1.5">
          <span
            className={`shrink-0 rounded-full border-[1.5px] border-point px-1.5 py-px text-[11px] font-bold text-point ${category?.badgeClass ?? ""}`}
          >
            {category?.label}
          </span>
          <p className="min-w-0 font-bold text-point">{tool.title}</p>
        </div>
        <p className="mt-0.5 text-xs font-medium text-main">{tool.desc}</p>
      </div>
      {/* 설명: 모바일·터치 기기는 카드 아래에, 마우스가 있는 데스크톱은
          썸네일 위 오버레이로 hover·키보드 포커스 때만 보인다(sm 이상 + 정밀 포인터) */}
      <p className="col-span-2 px-3 pb-3 text-[13px] leading-relaxed text-ink/85 sm:mt-1.5 sm:px-3 sm:pb-3 sm:pointer-fine:absolute sm:pointer-fine:inset-x-0 sm:pointer-fine:top-0 sm:pointer-fine:m-0 sm:pointer-fine:flex sm:pointer-fine:aspect-square sm:pointer-fine:items-center sm:pointer-fine:bg-point/90 sm:pointer-fine:p-4 sm:pointer-fine:text-xs sm:pointer-fine:text-white sm:pointer-fine:opacity-0 sm:pointer-fine:transition-opacity sm:pointer-fine:group-hover:opacity-100 sm:pointer-fine:group-focus-visible:opacity-100">
        {tool.about}
      </p>
    </Link>
  );
}
```

옮기기 전에 현재 `page.tsx`의 해당 블록과 클래스 문자열을 diff로 대조해 바뀐 글자가 없는지 확인한다(긴 클래스는 위 코드보다 원본이 우선).

- [ ] **Step 3: `ToolGrid.tsx` 작성**

```tsx
import type { Tool } from "@/lib/tools";
import ToolCard from "./ToolCard";

export default function ToolGrid({ tools }: { tools: Tool[] }) {
  return (
    <ul className="grid gap-3 break-keep sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
      {tools.map((tool) => (
        <li key={tool.slug}>
          <ToolCard tool={tool} />
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 4: `CategoryChips.tsx` 작성**

```tsx
import Link from "next/link";
import { activeCategories, type CategoryId } from "@/lib/tools";

function chipClass(active: boolean, bg: string) {
  return `inline-block rounded-full border-[1.5px] border-point px-3 py-1 text-xs font-bold transition-colors ${
    active ? "bg-point text-white" : `${bg} text-point hover:bg-white`
  }`;
}

/** '전체' + 도구가 있는 카테고리 칩. current가 없으면 '전체'가 현재 위치. */
export default function CategoryChips({ current }: { current?: CategoryId }) {
  return (
    <nav aria-label="카테고리">
      <ul className="flex flex-wrap gap-2">
        <li>
          <Link
            href="/"
            aria-current={current === undefined ? "page" : undefined}
            className={chipClass(current === undefined, "bg-white")}
          >
            전체
          </Link>
        </li>
        {activeCategories().map((c) => (
          <li key={c.id}>
            <Link
              href={`/category/${c.id}`}
              aria-current={current === c.id ? "page" : undefined}
              className={chipClass(current === c.id, c.badgeClass)}
            >
              {c.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

- [ ] **Step 5: `page.tsx` 교체**

`metadata`, 헤더, "이 사이트에 대해" 섹션, `SiteFooter`는 현재 코드 그대로 두고 `services`·`ServiceCategory`·`CATEGORY_STYLE`·`STICKER`와 카드 `<ul>`만 바꾼다. `Image`·`ServiceThumbFallback` import는 제거한다.

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { activeCategories, toolsIn } from "@/lib/tools";
import CategoryChips from "./_components/CategoryChips";
import SiteFooter from "./_components/SiteFooter";
import ToolGrid from "./_components/ToolGrid";

export const metadata: Metadata = {
  title: "Amaranth Site",
  description: "간단 웹 서비스 모음",
};

export default function Home() {
  return (
    <div className="min-h-dvh bg-shade text-ink">
      <main className="mx-auto max-w-6xl px-5 pt-8 pb-12">
        <header>
          <h1 className="text-xl font-extrabold tracking-tight break-keep text-point sm:text-2xl">
            Amaranth Site
          </h1>
          <p className="mt-1.5 text-sm text-ink/80">간단 웹서비스 모음</p>
        </header>

        <div className="mt-6">
          <CategoryChips />
        </div>

        <div className="mt-6 flex flex-col gap-8">
          {activeCategories().map((c) => (
            <section key={c.id} aria-labelledby={`category-${c.id}`}>
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 id={`category-${c.id}`} className="font-bold text-point">
                  {c.label}
                </h2>
                <Link
                  href={`/category/${c.id}`}
                  className="text-xs font-bold text-main hover:text-point"
                >
                  전체 보기 →
                </Link>
              </div>
              <ToolGrid tools={toolsIn(c.id)} />
            </section>
          ))}
        </div>

        {/* "이 사이트에 대해" <section> — 현재 코드 그대로 */}
      </main>
      <SiteFooter />
    </div>
  );
}
```

(위 주석 자리에 현재 `page.tsx`의 `<section aria-labelledby="about-title" …>…</section>` 블록을 한 글자도 바꾸지 않고 넣는다.)

- [ ] **Step 6: 린트·타입 확인**

Run: `npm run lint --workspace services && npx tsc --noEmit -p apps/services`
Expected: 에러 없음

- [ ] **Step 7: 개편 후 스크린샷과 비교**

```bash
D=/private/tmp/portal-shots
npx playwright screenshot --viewport-size "1280,900" --full-page http://localhost:3100/ $D/after2-1280.png
npx playwright screenshot --viewport-size "375,812" --full-page http://localhost:3100/ $D/after2-375.png
```
Read 도구로 before/after를 나란히 본다. Expected: 카드 하나하나의 모양(테두리·그림자·썸네일·배지 위치·글자)이 같다. 달라진 것은 칩 줄, 카테고리 섹션 제목과 "전체 보기", 카드 순서(카테고리별), '생산성' 배지가 '생활·계산'으로 바뀐 것뿐이다. 375px에서 가로 스크롤이 없다. `/category/...` 링크는 아직 404여도 된다(Task 4).

- [ ] **Step 8: Commit**

```bash
git add apps/services/app/_components/ToolCard.tsx apps/services/app/_components/ToolGrid.tsx apps/services/app/_components/CategoryChips.tsx apps/services/app/page.tsx
git commit -m "feat : 서비스 메인을 카테고리 섹션으로 나누고 카드 컴포넌트 분리"
```

---

### Task 3: 메인 검색

**Files:**
- Create: `apps/services/app/_components/ToolSearch.tsx`
- Modify: `apps/services/app/page.tsx` (섹션 묶음을 `ToolSearch`로 감싸기)

**Interfaces:**
- Consumes: `searchTools`, `normalizeQuery` (Task 1), `ToolGrid`, `STICKER` (Task 2)
- Produces: `export default function ToolSearch({ children }: { children: React.ReactNode })`

- [ ] **Step 1: `ToolSearch.tsx` 작성**

```tsx
"use client";

import { Search } from "lucide-react";
import { useState, type ReactNode } from "react";
import { normalizeQuery, searchTools } from "@/lib/tools";
import { STICKER } from "./ToolCard";
import ToolGrid from "./ToolGrid";

/** 검색어가 없으면 서버가 그린 children(카테고리 섹션)을, 있으면 결과 그리드를 보여 준다. */
export default function ToolSearch({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  const searching = normalizeQuery(query) !== "";
  const results = searching ? searchTools(query) : [];

  return (
    <>
      <div className="relative max-w-md">
        <label htmlFor="tool-search" className="sr-only">
          도구 검색
        </label>
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-point"
        />
        <input
          id="tool-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="도구 검색 (예: 픽셀, 목표, 게임)"
          autoComplete="off"
          className={`w-full py-2.5 pr-3 pl-9 text-sm text-ink placeholder:text-ink/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-main ${STICKER}`}
        />
      </div>

      {searching ? (
        <div className="mt-6">
          <p aria-live="polite" className="mb-3 text-sm text-ink/80">
            {results.length > 0
              ? `검색 결과 ${results.length}개`
              : `'${query.trim()}'에 맞는 도구가 없습니다.`}
          </p>
          {results.length > 0 && <ToolGrid tools={results} />}
        </div>
      ) : (
        children
      )}
    </>
  );
}
```

- [ ] **Step 2: `page.tsx`에 연결**

헤더 다음의 칩 `<div>`와 섹션 `<div>`를 `ToolSearch`로 감싸고, 검색창이 칩 위에 오게 한다:

```tsx
import ToolSearch from "./_components/ToolSearch";
// ...
        <div className="mt-6">
          <ToolSearch>
            <div className="mt-4">
              <CategoryChips />
            </div>
            <div className="mt-6 flex flex-col gap-8">
              {activeCategories().map((c) => (
                /* Task 2의 <section> 그대로 */
              ))}
            </div>
          </ToolSearch>
        </div>
```

(칩도 children에 넣는다 — 검색 중에는 칩 대신 결과만 보여 준다.)

- [ ] **Step 3: 린트·타입 확인**

Run: `npm run lint --workspace services && npx tsc --noEmit -p apps/services`
Expected: 에러 없음

- [ ] **Step 4: 브라우저 동작 확인**

dev 서버에서 Playwright로 검색 동작을 확인한다. 스크립트는 레포 밖에 둔다:

`/private/tmp/portal-shots/search-check.mjs`:
```js
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto("http://localhost:3100/");
const cards = () => page.locator("main ul.grid > li").count();
const check = async (q, expected) => {
  await page.fill("#tool-search", q);
  const n = await cards();
  const msg = await page.locator("[aria-live=polite]").textContent().catch(() => null);
  console.log(JSON.stringify({ q, n, msg, ok: n === expected }));
};
console.log("initial", await cards()); // 6
await check("픽셀", 1);
await check("게임", 2);
await check("없는단어xyz", 0);
await check("(", 0);
await check("   ", 6); // 공백만 → 섹션 복귀
await check("", 6);
await page.fill("#tool-search", "게임");
await page.screenshot({ path: "/private/tmp/portal-shots/search-1280.png", fullPage: true });
await browser.close();
```
Run: `cd /private/tmp/portal-shots && NODE_PATH=$(npm root -g) node search-check.mjs` — `playwright` 패키지를 못 찾으면 `cd /private/tmp/portal-shots && npm init -y >/dev/null && npm i playwright@1.61.1 >/dev/null && node search-check.mjs`.
Expected: `initial 6`, 모든 줄 `"ok":true`, 빈 결과일 때 `msg`가 `'없는단어xyz'에 맞는 도구가 없습니다.`. 스크린샷에서 검색창이 STICKER 모양이고 돋보기 SVG가 보인다.

- [ ] **Step 5: 빌드 HTML에 전체 목록이 있는지 확인 (JS 없는 크롤러)**

Run: `npm run build --workspace services && grep -o 'href="/[a-z-]*"' apps/services/.next/server/app/index.html | sort -u`
Expected: `/knit-muffler`, `/visual-novel-studio`, `/stellar-forge`, `/yearly-receipt`, `/nemo-nemo-beam`, `/asset-simulator` 6개가 모두 나온다.

- [ ] **Step 6: Commit**

```bash
git add apps/services/app/_components/ToolSearch.tsx apps/services/app/page.tsx
git commit -m "feat : 서비스 메인에 도구 검색 추가"
```

---

### Task 4: 카테고리 페이지

**Files:**
- Create: `apps/services/app/category/[id]/page.tsx`

**Interfaces:**
- Consumes: `activeCategories`, `getCategory`, `toolsIn` (Task 1), `CategoryChips`, `ToolGrid` (Task 2), `SiteFooter` (기존)
- Produces: 정적 라우트 `/category/life`, `/category/creative`, `/category/game`

- [ ] **Step 1: 페이지 작성**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { activeCategories, getCategory, toolsIn } from "@/lib/tools";
import CategoryChips from "../../_components/CategoryChips";
import SiteFooter from "../../_components/SiteFooter";
import ToolGrid from "../../_components/ToolGrid";

type Props = { params: Promise<{ id: string }> };

// 도구가 있는 카테고리만 만든다. 나머지 id는 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return activeCategories().map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const category = getCategory(id);
  if (!category) return {};
  return {
    title: `${category.label} 도구 | Amaranth Site`,
    description: category.description,
  };
}

export default async function CategoryPage({ params }: Props) {
  const { id } = await params;
  const category = getCategory(id);
  if (!category) notFound();
  const tools = toolsIn(category.id);
  if (tools.length === 0) notFound();

  return (
    <div className="min-h-dvh bg-shade text-ink">
      <main className="mx-auto max-w-6xl px-5 pt-8 pb-12">
        <Link
          href="/"
          className="text-xs font-bold text-main hover:text-point"
        >
          ← 전체 도구
        </Link>
        <header className="mt-2">
          <h1 className="text-xl font-extrabold tracking-tight break-keep text-point sm:text-2xl">
            {category.label} 도구
          </h1>
          <p className="mt-1.5 text-sm break-keep text-ink/80">
            {category.description}
          </p>
        </header>

        <div className="mt-6">
          <CategoryChips current={category.id} />
        </div>

        <section aria-label={`${category.label} 도구 목록`} className="mt-6">
          <ToolGrid tools={tools} />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
```

- [ ] **Step 2: 린트·빌드**

Run: `npm run lint --workspace services && npm run build --workspace services`
Expected: 빌드 로그 라우트 표에 `● /category/[id]`와 `/category/life`, `/category/creative`, `/category/game` 3개.

- [ ] **Step 3: sitemap 확인**

Run: `grep -o '<loc>[^<]*category[^<]*</loc>' apps/services/public/sitemap-0.xml`
Expected: `life`, `creative`, `game` 3개만, `text`·`dev` 없음.

- [ ] **Step 4: 브라우저 확인**

dev 서버에서(빌드 후 dev 서버가 꼬이면 재시작):
```bash
D=/private/tmp/portal-shots
npx playwright screenshot --viewport-size "1280,900" --full-page http://localhost:3100/category/creative $D/cat-1280.png
npx playwright screenshot --viewport-size "375,812" --full-page http://localhost:3100/category/creative $D/cat-375.png
for p in /category/unknown /category/text /category/game /knit-muffler /visual-novel-studio /stellar-forge /yearly-receipt /nemo-nemo-beam /asset-simulator; do printf "%s " $p; curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3100$p; done
```
Expected: 스크린샷에서 '이미지·창작' 칩이 `point` 배경, 카드 2개(비주얼 노벨 스튜디오·네모네모빔), 375px 가로 스크롤 없음. `/category/unknown`·`/category/text` → `404`, 나머지 → `200`.

- [ ] **Step 5: Commit**

```bash
git add "apps/services/app/category/[id]/page.tsx"
git commit -m "feat : 서비스 앱 카테고리 페이지 추가"
```

---

### Task 5: 문서와 커맨드 동기화

**Files:**
- Modify: `CLAUDE.md` (Services app structure, 서비스 앱 안내 문구 동기화 규칙)
- Modify: `.claude/commands/new-work.md` (gitignored, 로컬만)

**Interfaces:**
- Consumes: Task 1~4의 파일 경로·필드 이름
- Produces: 없음

- [ ] **Step 1: `CLAUDE.md` Services app structure 수정**

`- \`app/page.tsx\` — Temporary 6-service list landing` 줄을 다음으로 바꾼다:

```markdown
- `lib/tools.ts` — 도구 레지스트리(`CATEGORIES`, `TOOLS`)와 `searchTools`/`activeCategories`/`toolsIn`/`getCategory`. 메인·카테고리 페이지가 모두 읽는다. 테스트: `node --test apps/services/lib/tools.test.mts`
- `app/page.tsx` — 포털 메인: `ToolSearch` 검색창 + `CategoryChips` + 카테고리별 `ToolGrid` 섹션 + "이 사이트에 대해"
- `app/category/[id]/page.tsx` — 도구가 있는 카테고리만 정적 생성(`dynamicParams = false`)
- `app/_components/ToolCard.tsx`·`ToolGrid.tsx`·`CategoryChips.tsx`·`ToolSearch.tsx` — 카드(`STICKER` 스타일)·그리드·카테고리 칩·검색
```

- [ ] **Step 2: `CLAUDE.md` 동기화 규칙 수정**

- `apps/services/app/page.tsx`의 \`about\` 문구 → `apps/services/lib/tools.ts`의 \`TOOLS\` 항목(\`about\`·\`desc\`·\`tags\`)
- `메인 \`services\` 목록에 \`about\`을 넣고` → `\`lib/tools.ts\`의 \`TOOLS\`에 \`slug\`·\`category\`·\`title\`·\`desc\`·\`about\`·\`tags\`·\`thumb\`를 넣고(새 카테고리가 필요하면 \`CATEGORIES\`에 추가)`

- [ ] **Step 3: `.claude/commands/new-work.md` 수정**

71행 `- \`apps/services/app/page.tsx\`의 \`services\` 배열에 \`{ path, title, desc, about, thumb }\` 항목을 추가한다. \`about\`은 실제 기능 기준 2~3문장.`을 다음으로 바꾼다:

```markdown
- `apps/services/lib/tools.ts`의 `TOOLS` 배열에 `{ slug, category, title, desc, about, tags, thumb }` 항목을 추가한다. `category`는 `CATEGORIES`의 id(`life`·`text`·`creative`·`dev`·`game`) 중 하나이고, 맞는 게 없으면 `CATEGORIES`에 새로 추가한다. `about`은 실제 기능 기준 2~3문장, `tags`는 검색에 걸릴 단어 3~6개(제목·설명에 이미 있는 단어는 빼도 된다). 추가 후 `node --test apps/services/lib/tools.test.mts`를 돌려 카테고리·slug 검사를 통과시킨다(`activeCategories` 기대값이 바뀌면 테스트도 고친다).
```

117행 체크리스트 아래에 `- 빌드 후 \`apps/services/public/sitemap-0.xml\`에 새 도구 경로와 (새로 도구가 생긴) 카테고리 경로가 있는지 확인`을 추가한다.

- [ ] **Step 4: 최종 확인**

Run: `node --test apps/services/lib/tools.test.mts && npm run lint && npm run build`
Expected: 테스트 8개 통과, 두 워크스페이스 린트·빌드 성공.

- [ ] **Step 5: Commit** (`.claude/`는 gitignore라 `CLAUDE.md`만)

```bash
git add CLAUDE.md
git commit -m "docs : 서비스 앱 도구 레지스트리·카테고리 페이지 구조를 CLAUDE.md에 반영"
```
