# SEO 최적화 설계

**날짜:** 2026-04-19

## 목표

- 검색 허용 경로(`/pretext`, `/knit-muffler`)에 올바른 메타데이터 제공
- 차단 경로에 `robots: { index: false }` 적용
- `next-sitemap`으로 sitemap.xml / robots.txt 빌드 시 자동 생성

---

## 1. Metadata 구조

### 전체 fallback — `app/layout.tsx`

`metadata` 객체에 `title.template` 및 `title.default`를 설정해 각 페이지 title의 suffix를 통일한다.

```ts
export const metadata: Metadata = {
  title: {
    template: "%s | Interactive Portfolio",
    default: "Interactive Portfolio",
  },
  description: "...",
};
```

### 인덱싱 허용 페이지

- `app/(experiments)/pretext/page.tsx`
- `app/(services)/knit-muffler/page.tsx`

각 페이지에 `export const metadata: Metadata`를 선언한다. 필수 필드:

```ts
export const metadata: Metadata = {
  title: "...",
  description: "...",
  openGraph: {
    title: "...",
    description: "...",
    type: "website",
    images: ["..."],
  },
};
```

### 인덱싱 차단 페이지

- `app/page.tsx`
- `app/(portfolio)/playground/page.tsx`
- `app/(portfolio)/interaction-lab/page.tsx`
- `app/(portfolio)/engineering-note/page.tsx`

각 페이지에 아래를 추가한다:

```ts
export const metadata: Metadata = {
  // 기존 메타데이터 유지 ...
  robots: { index: false, follow: false },
};
```

---

## 2. next-sitemap 설정

### 설치

```bash
npm install next-sitemap
```

### `next-sitemap.config.js` (루트)

```js
/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || "https://example.com",
  generateRobotsTxt: true,
  exclude: ["/", "/engineering-note", "/interaction-lab", "/playground"],
  robotsTxtOptions: {
    policies: [
      { userAgent: "*", disallow: ["/", "/engineering-note", "/interaction-lab", "/playground"] },
      { userAgent: "*", allow: ["/pretext", "/knit-muffler"] },
    ],
  },
};
```

exclude에 없는 경로는 빌드 시 자동으로 sitemap에 포함된다.

### `package.json` postbuild 스크립트

```json
{
  "scripts": {
    "postbuild": "next-sitemap"
  }
}
```

### 환경변수

`.env.local`에 `SITE_URL=https://실제도메인` 설정. 미설정 시 fallback URL 사용.

---

## 파일 변경 목록

| 파일 | 변경 내용 |
|------|----------|
| `app/layout.tsx` | `metadata` title template 설정 |
| `app/page.tsx` | `robots: { index: false }` 추가 |
| `app/(portfolio)/playground/page.tsx` | `robots: { index: false }` 추가 |
| `app/(portfolio)/interaction-lab/page.tsx` | `robots: { index: false }` 추가 |
| `app/(portfolio)/engineering-note/page.tsx` | `robots: { index: false }` 추가 |
| `app/(experiments)/pretext/page.tsx` | 전체 metadata 선언 (title, description, OG) |
| `app/(services)/knit-muffler/page.tsx` | 전체 metadata 선언 (title, description, OG) |
| `next-sitemap.config.js` | 신규 생성 |
| `package.json` | `postbuild` 스크립트 추가 |

---

## 미결 사항

- `SITE_URL` 실제 도메인 확인 필요
- `/pretext`, `/knit-muffler` 각 페이지의 title/description/OG 이미지 내용은 구현 시 사용자가 직접 채운다
