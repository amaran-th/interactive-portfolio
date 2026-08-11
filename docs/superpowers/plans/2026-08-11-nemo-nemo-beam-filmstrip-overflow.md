# 네모네모빔 필름스트립 세로 스크롤 제거 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 프레임 모드 하단 필름스트립(`FrameFilmstrip.tsx`)의 프레임 카드 내용이 컨테이너보다 높아 생기는 세로 스크롤을 없앤다.

**Architecture:** 각 프레임 카드를 4단(번호+눈 아이콘 / 썸네일 / 지속시간 / 삭제 버튼)에서 3단(번호+눈 아이콘+삭제 버튼 / 썸네일 / 지속시간)으로 줄이고, 카드 상하 패딩을 살짝 줄여 안전 마진을 둔다. 컨테이너 높이·가로 스크롤·정보량·상호작용 모델은 그대로 둔다.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4.

## Global Constraints

- 자동화된 테스트 스위트가 없다 — 검증은 `npx tsc --noEmit -p tsconfig.json`, `npm run lint`, `npm run build`, 그리고 브라우저(Playwright 임시 스크립트) 확인이다.
- 컨테이너 높이(`h-24`)는 바꾸지 않는다.
- 번호·가시성 토글·썸네일·지속시간 편집·삭제 다섯 가지 정보는 전부 항상 보여야 한다(호버 전용 노출 금지).
- 재생 중(`isPlaying`) 편집 잠금, 프레임 1장뿐일 때 삭제 비활성화 등 기존 조건은 그대로 유지한다.
- 커밋 메시지는 한국어로 쓰고 `Co-Authored-By: Claude` 트레일러를 넣지 않는다.
- 이 저장소에는 이 작업과 무관한, 세션 내내 있어 온 사전 수정 파일들이 있다 — `git status`로 확인 후 이 태스크가 건드리는 파일 하나만 정확히 스테이징한다. `git add -A`/`git add .`를 쓰지 않는다.

---

### Task 1: `FrameFilmstrip.tsx` — 카드를 3단으로 재구성

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/FrameFilmstrip.tsx`

**Interfaces:**
- Consumes: 없음(기존 props·핸들러 그대로 재사용).
- Produces: 없음(이 계획의 유일한 태스크).

- [ ] **Step 1: 카드 컨테이너 패딩 축소**

프레임 카드 `<div>`(현재 85~91번째 줄)의 `className`을 다음으로 바꾼다 — `px-1 py-1`을 `px-1 py-0.5`로:

```tsx
            <div
              key={layer.id}
              onClick={() => !isPlaying && onSelect(layer.id)}
              className={`flex w-16 shrink-0 flex-col items-center gap-0.5 px-1 py-0.5 ${
                isActive ? "bg-violet-50" : "hover:bg-gray-50"
              } ${isPlaying ? "cursor-default" : "cursor-pointer"}`}
            >
```

- [ ] **Step 2: 헤더 줄에 삭제 버튼 합치고, 맨 아래 있던 독립 삭제 버튼 제거**

헤더 `<div>`(현재 92~109번째 줄, `<div className="flex w-full items-center justify-between text-[9px] text-gray-400">`로 시작해 그 짝 `</div>`로 끝나는 블록)를 다음으로 바꾼다 — 눈 아이콘 버튼을 감싸는 `<div className="flex items-center gap-1">`을 새로 추가하고, 그 안에 눈 아이콘 버튼과 삭제 버튼을 나란히 둔다:

```tsx
              <div className="flex w-full items-center justify-between text-[9px] text-gray-400">
                <span>{index + 1}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isPlaying) onToggleVisible(layer.id);
                    }}
                    disabled={isPlaying}
                    title={layer.visible ? "숨기기" : "보이기"}
                    className="text-gray-400 hover:text-gray-700 disabled:opacity-30"
                  >
                    {layer.visible ? (
                      <Eye className="h-3 w-3" />
                    ) : (
                      <EyeOff className="h-3 w-3" />
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isPlaying) onDelete(layer.id);
                    }}
                    disabled={isPlaying || layers.length <= 1}
                    title="프레임 삭제"
                    className="text-gray-300 hover:text-red-500 disabled:opacity-30"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
```

그 다음, 파일 맨 아래쪽 지속시간 `<input>` 뒤에 따로 있던 삭제 버튼 블록(현재 135~145번째 줄, `<button onClick={(e) => { e.stopPropagation(); if (!isPlaying) onDelete(layer.id); } ...`로 시작해 `</button>`로 끝나는 블록 — 방금 헤더로 옮긴 것과 내용이 같다)을 통째로 삭제한다. `<input>`(현재 111~134번째 줄) 바로 다음에 카드를 닫는 `</div>`가 오도록 한다.

- [ ] **Step 3: 타입 검사 + lint + 빌드**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 에러 없음.

Run: `npm run lint`
Expected: 새 에러 없음.

Run: `npm run build`
Expected: 빌드 성공.

- [ ] **Step 4: 브라우저 수동 확인**

`npm run dev`를 백그라운드로 띄우고, MCP 브라우저 도구가 없으므로 프로젝트에 이미 설치된 `playwright` 패키지로 임시 스크립트를 작성해(모듈 해석을 위해 프로젝트 루트 안에 두고, 확인 후 삭제) `/nemo-nemo-beam`에서 확인한다. `localStorage`에 프레임 여러 장짜리 작은 캔버스(`PixelArt`, V3 포맷, `layerMode: "frames"`)를 직접 주입해 데스크톱 아이콘을 더블클릭으로 열면 손으로 그릴 필요 없이 빠르게 검증할 수 있다(이전 작업들에서 쓴 것과 같은 방식).

1. 프레임 모드로 연 상태에서 필름스트립의 가로 스크롤 컨테이너(`overflow-x-auto`가 걸린 `<div>`)를 찾아 `scrollHeight <= clientHeight`인지 확인한다(세로 스크롤이 실제로 사라졌는지) — `getComputedStyle(el).overflowY`가 `"auto"`로 계산되더라도 스크롤할 내용이 없으면(`scrollHeight <= clientHeight`) 스크롤바 자체가 나타나지 않는다.
2. 카드 헤더 줄에 번호·눈 아이콘·삭제 버튼(휴지통 아이콘) 세 개가 모두 보이는지 확인한다.
3. 프레임이 2장 이상인 상태에서 삭제 버튼을 클릭하면 프레임이 실제로 하나 줄어드는지 확인한다.
4. 프레임이 1장만 남으면 삭제 버튼이 비활성화(`disabled`)되는지 확인한다.
5. 재생(▶) 버튼을 눌러 재생 중인 상태에서는 눈 아이콘·삭제 버튼·지속시간 입력이 모두 비활성화되는지 확인한다.
6. 지속시간 입력에 포커스를 주고 값을 바꾼 뒤 blur하면(또는 Enter) 커밋되어 화면에 반영되는지 확인한다.
7. 프레임을 10장 정도 만든 뒤에도 가로 스크롤은 정상 동작하고(`scrollWidth > clientWidth`), 세로 스크롤은 여전히 안 생기는지(`scrollHeight <= clientHeight`) 확인한다.

각 시나리오는 실제 DOM 상태(요소의 `scrollHeight`/`clientHeight`, 버튼 `disabled` 속성, 클릭 후 프레임 개수 변화)를 `page.evaluate`나 Playwright locator API로 읽어 확인한다 — 스크린샷만으로 판단하지 않는다. 확인 후 임시 스크립트·스크린샷·백그라운드 dev 서버를 모두 정리하고 `git status`로 깨끗한지 확인한다.

- [ ] **Step 5: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/FrameFilmstrip.tsx
git commit -m "fix: 프레임 필름스트립 카드를 3단으로 재구성해 세로 스크롤 제거"
```

---
