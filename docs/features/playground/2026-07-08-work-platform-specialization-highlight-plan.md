# Work 최적화 플랫폼 강조 표시 구현 계획

**Goal:** Work 모달의 "지원 플랫폼" 배지 중 특정 플랫폼에 최적화된 항목을 여러 개까지 강조 표시한다.

**Architecture:** `WorkItem.platforms`를 `("mobile"|"pc")[]`에서 `{ type: "mobile"|"pc"; specialized?: boolean }[]`로 바꾸고, `WorkModal.tsx`의 배지 렌더링에서 `specialized`가 true인 항목만 흰 배경으로 강조한다.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4. 테스트 스위트 없음 — 검증은 `npm run lint`와 dev 서버 수동 확인으로 한다.

이 프로젝트는 소규모 개인 포트폴리오이며 테스트 프레임워크가 없다. 각 태스크의 검증 단계는 유닛 테스트 대신 타입체크/lint와 관련 파일 리뷰로 대체한다.

---

### Task 1: `WorkItem.platforms` 타입 변경

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/Work.tsx:11`

**Interfaces:**
- Produces: `WorkItem.platforms?: { type: "mobile" | "pc"; specialized?: boolean }[]` — 이후 모든 태스크가 이 타입을 사용한다.

- [ ] **Step 1: 타입 변경**

`Work.tsx`의 `WorkItem` 인터페이스에서:

```ts
  platforms?: ("mobile" | "pc")[];
```

를 다음으로 교체:

```ts
  platforms?: { type: "mobile" | "pc"; specialized?: boolean }[];
```

- [ ] **Step 2: 타입 에러 확인**

이 시점에서 `data.tsx`와 `WorkModal.tsx`가 옛 타입을 쓰므로 타입 에러가 나는 게 정상이다. Task 2, 3에서 해결한다.

---

### Task 2: `data.tsx`의 4개 Work `platforms` 값 갱신

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/data.tsx:26` (뜨개뜨개)
- Modify: `app/(portfolio)/playground/_sections/Works/data.tsx:42` (비주얼 노벨 메이커)
- Modify: `app/(portfolio)/playground/_sections/Works/data.tsx:64` (굉장한 별메이커)
- Modify: `app/(portfolio)/playground/_sections/Works/data.tsx:84` (올해의 영수증)

**Interfaces:**
- Consumes: `WorkItem.platforms` 타입 (Task 1에서 정의)

- [ ] **Step 1: 뜨개뜨개(id 1) — PC·모바일 둘 다 강조**

`platforms: ["pc", "mobile"],` (26번 줄)를:

```ts
    platforms: [
      { type: "pc", specialized: true },
      { type: "mobile", specialized: true },
    ],
```

- [ ] **Step 2: 비주얼 노벨 메이커(id 2) — PC만 강조**

`platforms: ["pc", "mobile"],` (42번 줄)를:

```ts
    platforms: [
      { type: "pc", specialized: true },
      { type: "mobile" },
    ],
```

- [ ] **Step 3: 굉장한 별메이커(id 3) — 강조 없음**

`platforms: ["pc", "mobile"],` (64번 줄)를:

```ts
    platforms: [{ type: "pc" }, { type: "mobile" }],
```

- [ ] **Step 4: 올해의 영수증(id 4) — 모바일만 강조**

`platforms: ["mobile", "pc"],` (84번 줄)를:

```ts
    platforms: [
      { type: "mobile", specialized: true },
      { type: "pc" },
    ],
```

---

### Task 3: `WorkModal.tsx` 배지 렌더링 갱신

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/WorkModal.tsx:178-190`

**Interfaces:**
- Consumes: `WorkItem.platforms: { type: "mobile" | "pc"; specialized?: boolean }[]`

- [ ] **Step 1: 배지 map 로직을 새 타입에 맞게 교체**

기존:

```tsx
                      {selected.platforms.map((platform) => (
                        <span
                          key={platform}
                          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-sm text-gray-200"
                        >
                          {platform === "mobile" ? (
                            <Smartphone className="h-4 w-4 text-gray-500" />
                          ) : (
                            <Monitor className="h-4 w-4 text-gray-500" />
                          )}
                          {platform === "mobile" ? "모바일" : "PC"}
                        </span>
                      ))}
```

다음으로 교체:

```tsx
                      {selected.platforms.map((platform) => (
                        <span
                          key={platform.type}
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
                            platform.specialized
                              ? "border-white/80 bg-white text-gray-900 font-medium"
                              : "border-white/10 bg-black/20 text-gray-200"
                          }`}
                        >
                          {platform.type === "mobile" ? (
                            <Smartphone
                              className={`h-4 w-4 ${platform.specialized ? "text-gray-700" : "text-gray-500"}`}
                            />
                          ) : (
                            <Monitor
                              className={`h-4 w-4 ${platform.specialized ? "text-gray-700" : "text-gray-500"}`}
                            />
                          )}
                          {platform.type === "mobile" ? "모바일" : "PC"}
                        </span>
                      ))}
```

- [ ] **Step 2: 린트 확인**

Run: `npm run lint`
Expected: `app/(portfolio)/playground/_sections/Works/` 관련 에러 없음

---

### Task 4: `.claude/commands/new-work.md` 예시 코드 동기화

**Files:**
- Modify: `.claude/commands/new-work.md:39`

CLAUDE.md의 동기화 규칙: `WorkItem` 타입이 바뀌면 `/new-work` 커맨드의 예시 코드도 함께 갱신해야 한다.

- [ ] **Step 1: 예시 코드 갱신**

```ts
  platforms: ["pc", "mobile"], // 해당하는 것만
```

를:

```ts
  platforms: [{ type: "pc" }, { type: "mobile", specialized: true }], // 해당하는 것만, 특히 그 플랫폼에 최적화되어 있다면 specialized: true
```

---

### Task 5: 전체 검증

**Files:** 없음 (검증만)

- [ ] **Step 1: 린트 실행**

Run: `npm run lint`
Expected: 에러 없음

- [ ] **Step 2: dev 서버로 수동 확인**

Run: `npm run dev`
브라우저에서 `/playground` → Work 카드 클릭 → 모달의 "지원 플랫폼" 배지가 최적화된 항목만 흰 배경으로 강조되는지 확인. 4개 Work 모두 확인.
