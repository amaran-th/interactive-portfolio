# 팔레트 세트 행 아이콘 교체 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** "즐겨찾기 관리" 드롭다운의 세트별 행에서 불러오기 아이콘을 `Download` → `ArrowDownToLine`, 덮어쓰기 아이콘을 `Save` → `ArrowUpFromLine`으로 바꿔, 두 동작이 반대 방향임이 아이콘만으로 드러나게 한다.

**Architecture:** `ColorWheel.tsx` 한 파일의 `lucide-react` import와 두 아이콘 사용처만 바꾸는 단일 변경.

**Tech Stack:** React 19, TypeScript, lucide-react.

## Global Constraints

- 자동화된 테스트 스위트가 없다 — 검증은 `npx tsc --noEmit -p tsconfig.json`, `npm run lint`, `npm run build`, 그리고 브라우저 확인이다.
- 아이콘 크기·색상·버튼 스타일, `title` 툴팁 텍스트, 삭제(`Trash2`) 아이콘과 그 동작 로직은 손대지 않는다.
- 이 저장소에는 이 작업과 무관한 사전 수정 파일들이 있다 — `git status`로 확인 후 이 태스크가 건드리는 파일(`ColorWheel.tsx`) 하나만 정확히 스테이징한다. `git add -A`/`git add .`를 쓰지 않는다.
- 커밋 메시지는 한국어로 쓰고 `Co-Authored-By: Claude` 트레일러를 넣지 않는다.

---

### Task 1: 불러오기·덮어쓰기 아이콘 교체

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/ColorWheel.tsx`

**Interfaces:**
- 없음 — 이 컴포넌트 내부의 아이콘 선택만 바뀐다. 외부 props·핸들러 시그니처는 전혀 변경되지 않는다.

- [ ] **Step 1: import 교체**

3번째 줄 `import { Download, Save, Settings, Trash2, X } from "lucide-react";`를 다음으로 바꾼다:

```ts
import { ArrowDownToLine, ArrowUpFromLine, Settings, Trash2, X } from "lucide-react";
```

- [ ] **Step 2: 불러오기 아이콘 교체**

`<Download className="h-3 w-3" />`(현재 406번째 줄, 불러오기 버튼 안)를 다음으로 바꾼다:

```tsx
                      <ArrowDownToLine className="h-3 w-3" />
```

- [ ] **Step 3: 덮어쓰기 아이콘 교체**

`<Save className="h-3 w-3" />`(현재 413번째 줄, 덮어쓰기 버튼 안)를 다음으로 바꾼다:

```tsx
                      <ArrowUpFromLine className="h-3 w-3" />
```

두 버튼을 감싸는 `<button onClick={...} title={...} className={...}>` 자체와 `title` 텍스트는 전혀 손대지 않는다.

- [ ] **Step 4: 타입 검사 + lint + 빌드**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 에러 없음.

Run: `npm run lint`
Expected: 새 에러 없음(미사용 import 없음 — `Download`/`Save`는 이 파일 다른 곳에서 안 쓰인다).

Run: `npm run build`
Expected: 빌드 성공.

- [ ] **Step 5: 브라우저 확인**

`npm run dev`가 이미 떠 있으면(소유자가 동시에 작업 중일 수 있음) 재사용하고 직접 시작한 서버가 아니면 종료하지 않는다. `/nemo-nemo-beam`에서 데스크톱 아이콘을 열고, 팔레트 세트를 하나 이상 `localStorage`(`pixel-art-maker:palette-sets`)에 주입한 뒤 "즐겨찾기 관리" 드롭다운을 연다.

1. 불러오기 자리에 화살표가 아래로 내려와 밑줄에 닿는 모양(`ArrowDownToLine`)이, 덮어쓰기 자리에 화살표가 밑줄에서 위로 떠오르는 모양(`ArrowUpFromLine`)이 보이는지 확인한다.
2. 불러오기 클릭 시 즐겨찾기 전체가 그 세트 색으로 교체되는지(기존과 동일하게) 확인한다.
3. 즐겨찾기를 바꾼 뒤 덮어쓰기 클릭 시 그 세트가 갱신되는지(다시 열어 스와치 미리보기가 바뀌었는지) 확인한다.
4. 삭제 아이콘(호버 시에만 보임)과 그 동작이 이전과 동일하게 유지되는지 확인한다.

- [ ] **Step 6: 커밋**

```bash
git add "app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/ColorWheel.tsx"
git commit -m "fix: 팔레트 세트 불러오기·덮어쓰기 아이콘을 방향이 분명한 화살표 쌍으로 교체"
```

---
