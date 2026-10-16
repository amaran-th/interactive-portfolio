# 서비스 앱 도구 포털 개편 설계

- 날짜: 2026-10-17
- 대상: `apps/services` (amaranth-project.vercel.app)
- 참고 컨셉: [rakko.tools](https://rakko.tools/ko) — 설치·가입 없는 무료 웹 도구를 카테고리·검색으로 모은 포털

## 배경과 목표

서비스 앱을 rakko.tools처럼 "작은 웹 도구를 계속 붙여 나가는 포털"로 바꾼다. 앞으로 생활·텍스트·이미지/창작·개발·게임 도구를 대상 구분 없이 늘리므로, 도구를 한 곳에 등록하면 메인·카테고리 페이지·sitemap에 자동으로 반영되는 구조가 필요하다.

전체 작업은 세 하위 작업으로 나누고, 이 문서는 **1번만** 다룬다.

1. **포털 구조 개편** (이 문서) — 도구 레지스트리, 카테고리, 검색, 카테고리 페이지
2. 브랜딩 — 사이트 이름·마스코트·로고 (별도 설계)
3. 실용 도구 추가 — 도구마다 `/new-work` 절차로 하나씩

### 성공 기준

- 새 도구를 `lib/tools.ts`의 `TOOLS`에 한 항목 넣으면 메인·카테고리 페이지·sitemap에 반영된다.
- 메인에서 검색어로 도구를 바로 찾는다.
- 카테고리마다 색인 가능한 정적 페이지가 있다.
- 기존 카드 UI와 디자인 스타일, 도구 URL은 그대로다.

### 지키는 것 (변경 금지)

- 카드 UI: `STICKER` 카드(굵은 `point` 테두리 + 어긋난 단색 그림자), 썸네일·`ServiceThumbFallback`, 카테고리 배지, 데스크톱 hover/focus 설명 오버레이, 모바일 가로 배치 — 마크업·클래스 그대로 옮긴다.
- 테마 토큰 `main`/`point`/`sub`/`shade`/`ink`, 하늘색 배경.
- 도구 URL `/<slug>`, 각 도구의 `page.tsx`·`guide.ts`·`ToolShell`, 포트폴리오 `data.ts`의 `embedPath`/`path`.
- "이 사이트에 대해" 섹션, `SiteFooter` 배치 규칙(콘텐츠 페이지에만).

## 1. 데이터와 라우트

### 도구 레지스트리 `apps/services/lib/tools.ts`

```ts
export type CategoryId = "life" | "text" | "creative" | "dev" | "game";

export type Category = {
  id: CategoryId;
  label: string;        // "생활·계산"
  description: string;  // 카테고리 페이지 소개 1~2문장
  badgeClass: string;   // 배지·칩 배경색 클래스
};

export type Tool = {
  slug: string;         // "knit-muffler" → 경로 "/knit-muffler"
  category: CategoryId; // 도구당 하나
  title: string;
  desc: string;         // 한 줄 소개 (기존 desc)
  about: string;        // 설명 (기존 about)
  tags: string[];       // 검색용
  thumb: string | null;
};

export const CATEGORIES: Category[];  // 표시 순서 = 배열 순서
export const TOOLS: Tool[];
```

- 초기 카테고리와 순서: 생활·계산(`life`) / 텍스트(`text`) / 이미지·창작(`creative`) / 개발·웹(`dev`) / 게임(`game`).
- 배지 색: 기존 `#ffdd94`(게임), `#e7a6bc`(창작), `bg-sub`(생활·계산 — 기존 '생산성')를 유지하고, 텍스트·개발·웹 색은 같은 파스텔 톤으로 새로 정한다.
- 기존 6개 도구 분류:
  - 생활·계산: `yearly-receipt`, `asset-simulator`
  - 이미지·창작: `nemo-nemo-beam`, `visual-novel-studio`
  - 게임: `knit-muffler`, `stellar-forge`
- 도구가 없는 카테고리는 칩·섹션·카테고리 페이지 모두에서 뺀다(빈 페이지 색인 방지). 헬퍼 `activeCategories()`가 도구가 1개 이상인 카테고리만 돌려준다.
- `isNew`, 즐겨찾기, 정렬 옵션 등은 넣지 않는다(YAGNI).

### 라우트

- `/` — 메인 (아래 2장)
- `/category/[id]` — `generateStaticParams`로 `activeCategories()`만 정적 생성, `dynamicParams = false`. 없는 id는 404(`not-found.tsx`).
  - `generateMetadata`: title `"<label> 도구"`, description은 `Category.description`.
- sitemap: `next-sitemap`이 빌드된 정적 페이지를 수집하므로 설정 변경 없이 카테고리 페이지가 들어간다.

## 2. 화면

### 공통 부품 (`apps/services/app/_components/`)

- `ToolCard.tsx` — 현재 `page.tsx`의 `<li>` 안 카드 마크업을 그대로 옮긴 컴포넌트. props: `tool: Tool`. 배지 색·라벨은 카테고리에서 가져온다. 훅 없음(서버·클라이언트 양쪽에서 렌더 가능).
- `ToolGrid.tsx` — `<ul className="grid gap-3 break-keep sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">` + `ToolCard` 목록. 기존 그리드 클래스 그대로.
- `CategoryChips.tsx` — '전체'(`/`) + 활성 카테고리 칩 링크. 배지와 같은 둥근 `border-point` 테두리 + 카테고리 색. 현재 위치 칩은 `bg-point text-white`, `aria-current="page"`.

### 메인 `/`

```
Amaranth Site
간단 웹서비스 모음
[ 도구 검색…                    ]   ← STICKER 스타일 입력창 (SVG 돋보기 아이콘)
(전체●)(생활·계산)(이미지·창작)(게임)
── 생활·계산 ─────────── 전체 보기 →
[카드][카드]
── 이미지·창작 ────────── 전체 보기 →
...
이 사이트에 대해
SiteFooter
```

- 검색어가 없으면 카테고리 순서대로 섹션(`h2` + `/category/<id>` "전체 보기" 링크 + `ToolGrid`)을 보여 준다.
- 검색어가 있으면 섹션 대신 결과 수("N개")와 결과 `ToolGrid` 하나. 결과가 없으면 "'<검색어>'에 맞는 도구가 없습니다" 안내.
- 검색 대상: `title`, `desc`, `about`, `tags`, 카테고리 `label`. 비교 전에 소문자로 바꾸고 공백을 지운다. 순서는 `TOOLS` 순서 유지.
- 구현: `ToolSearch.tsx`(`"use client"`)가 입력값 상태를 갖고, 검색어가 없을 때는 서버에서 넘겨받은 섹션 목록(children)을 그대로 보여 준다. 초기 HTML에 전체 목록이 서버 렌더링되어 크롤러와 사용자가 같은 내용을 본다.
- 검색어는 URL·localStorage에 남기지 않는다 → 개인정보처리방침 변경 없음.

### 카테고리 `/category/[id]`

```
← 전체 도구
<label> 도구
<description>
(전체)(생활·계산●)(이미지·창작)(게임)
[카드][카드]
SiteFooter
```

- 메인과 같은 컨테이너(`mx-auto max-w-6xl px-5 pt-8 pb-12`, `bg-shade text-ink`).
- 검색창은 두지 않는다.

## 3. 함께 고칠 문서

- `CLAUDE.md` — Services app structure에 `lib/tools.ts`, `app/category/[id]`, 공통 부품을 추가. 서비스 앱 안내 문구 동기화 규칙의 "메인 `services` 목록에 `about`" → "`lib/tools.ts`의 `TOOLS`에 `about`·`category`·`tags`".
- `.claude/commands/new-work.md`(로컬) — 같은 변경 반영.
- 카테고리 `description` 등 새 문구는 Writing Guidelines(humanize-korean 원칙)를 따른다.

## 4. 검증

1. `npm run lint`, `npm run build` 통과. 빌드 후 `apps/services/public/sitemap*.xml`에 `/category/life`, `/category/creative`, `/category/game`이 있고 `/category/text`, `/category/dev`는 없다.
2. dev 서버(`npm run dev:services`)에서 모바일(375px)·데스크톱(1280px) 폭으로 확인:
   - 메인 카드가 개편 전과 같다(개편 전 스크린샷과 비교).
   - 검색: "픽셀" → 네모네모빔, "게임" → 게임 카테고리 2개, 없는 단어 → 빈 결과 안내, 지우면 섹션 복귀.
   - 칩·"전체 보기" 링크 이동, 현재 칩 강조.
   - `/category/unknown` → 404.
3. 6개 도구 링크가 모두 열린다.

## 범위 밖

- 브랜딩(이름·마스코트·로고), 새 도구 추가, 관련 도구 추천, 즐겨찾기·최근 사용, 도구 페이지 내 카테고리 이동 UI.
