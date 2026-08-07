# 네모네모빔 필터 드롭다운 패널 전환 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `LayerPanel.tsx`에서 항상 펼쳐져 있는 블렌드 모드·색보정 UI를 아이콘 트리거 버튼 + 드롭다운 패널로 바꾸고, 보정값(밝기·대비·채도·색온도·틴트) 초기화 버튼을 추가하고, 스타일을 네모네모빔의 보라색(violet) 베이스에 맞춘다.

**Architecture:** `DrawToolbar.tsx`의 기존 "더보기" 드롭다운 패턴(로컬 `useState` + `absolute top-full ... bg-white shadow-xl` 패널)을 그대로 따른다. 데이터 모델(`PixelLayer`)과 합성 로직(`pixelGrid.ts`)은 전혀 건드리지 않는 순수 UI 변경이다.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, lucide-react.

## Global Constraints

- 자동화된 테스트 스위트가 없다 — 검증은 `npx tsc --noEmit -p tsconfig.json`, `npm run lint`, `npm run build`, 그리고 필요한 경우 Playwright 임시 스크립트를 통한 브라우저 확인이다.
- 초기화 버튼은 보정 5개(밝기·대비·채도·색온도·틴트)만 0으로 되돌린다 — 블렌드 모드는 건드리지 않는다.
- 드롭다운 패널은 트리거 버튼을 다시 눌러야 닫힌다 — 바깥 클릭 감지나 슬라이더 조작 중 자동 닫힘은 넣지 않는다.
- 커밋 메시지는 한국어로 쓰고 `Co-Authored-By: Claude` 트레일러를 넣지 않는다.
- 이 저장소에는 이 작업과 무관한, 세션 내내 있어 온 사전 수정 파일들이 있다(`app/(portfolio)/playground/_sections/Works/4_YearlyReceipt/EditView.tsx`, `app/robots.ts`, `docs/blog/pretext.md`, `next-sitemap.config.js`, 그리고 untracked `docs/superpowers/specs/2026-08-05-nemo-nemo-beam-tracing-mode-design.md`) — 절대 스테이징하지 않는다. `git add -A`/`git add .` 대신 항상 정확한 파일 경로만 스테이징한다.

---

### Task 1: `LayerPanel.tsx` — 드롭다운 트리거·패널·초기화 버튼

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/LayerPanel.tsx`

**Interfaces:**
- Consumes: 없음(기존 `BlendMode`/`PixelLayer` 타입, `ADJUSTMENT_ROWS` 상수 그대로 재사용).
- Produces: `LayerPanel`이 새 prop `onResetAdjustments: (id: string) => void`를 받는다 — Task 2가 이 prop에 실제 핸들러를 연결한다.

- [ ] **Step 1: import에 `SlidersHorizontal` 추가**

`lucide-react` import(현재 3~18번째 줄)를 다음으로 바꾼다:

```ts
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  Layers as LayersIcon,
  Lock,
  Pause,
  Play,
  Plus,
  Repeat,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Unlock,
} from "lucide-react";
```

- [ ] **Step 2: prop 추가**

구조분해 목록에서 `onAdjustmentDragEnd,`(현재 62번째 줄) 다음, `onFlatten,` 이전에 추가:

```ts
  onAdjustmentDragEnd,
  onResetAdjustments,
  onFlatten,
```

타입 선언에서 `onAdjustmentDragEnd: () => void;`(현재 104번째 줄) 다음, `onFlatten: () => void;` 이전에 추가:

```ts
  onAdjustmentDragEnd: () => void;
  onResetAdjustments: (id: string) => void;
  onFlatten: () => void;
```

- [ ] **Step 3: 드롭다운 열림 상태 추가**

`const [editingId, setEditingId] = useState<string | null>(null);`(현재 114번째 줄) 다음 줄에 추가:

```ts
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [showFilterPanel, setShowFilterPanel] = useState(false);
```

(기존 `const [editingName, setEditingName] = useState("");` 줄은 그대로 두고, 그 다음에 `showFilterPanel` 줄만 새로 끼워 넣는다.)

- [ ] **Step 4: `hasActiveFilter` 계산 추가**

`const activeLayer = layers[activeIndex] ?? layers[layers.length - 1];`(현재 118번째 줄) 다음 줄에 추가:

```ts
  const activeLayer = layers[activeIndex] ?? layers[layers.length - 1];
  // 트리거 버튼을 보라색으로 강조할지 판정 — 블렌드 모드가 Normal이 아니거나
  // 보정 5개 중 하나라도 0이 아니면 "지금 필터가 걸려 있다"는 뜻이다.
  const hasActiveFilter =
    (activeLayer.blendMode ?? "normal") !== "normal" ||
    !!activeLayer.brightness ||
    !!activeLayer.contrast ||
    !!activeLayer.saturation ||
    !!activeLayer.temperature ||
    !!activeLayer.tint;
```

- [ ] **Step 5: 블렌드·보정 블록을 트리거 버튼 + 드롭다운 패널로 교체**

지금 블렌드 모드·보정 슬라이더가 항상 펼쳐져 있는 블록 전체(`<div className="flex shrink-0 flex-col gap-1 border-t border-gray-100 px-3 py-2">`로 시작해 그 짝 `</div>`로 끝나는, 현재 262~305번째 줄)를 다음으로 통째로 바꾼다:

```tsx
          <div className="relative shrink-0 border-t border-gray-100 px-3 py-2">
            <button
              onClick={() => setShowFilterPanel((v) => !v)}
              title="블렌드 모드·색보정"
              className={`flex h-6 w-6 items-center justify-center ${
                hasActiveFilter
                  ? "bg-violet-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </button>
            {showFilterPanel && (
              <div className="absolute top-full left-0 z-30 mt-1 flex w-48 flex-col gap-1 bg-white p-2 shadow-xl">
                <label className="flex items-center justify-between gap-2 text-[10px] text-gray-500">
                  블렌드 모드
                  <select
                    value={activeLayer.blendMode ?? "normal"}
                    onChange={(e) =>
                      onBlendModeChange(activeLayer.id, e.target.value as BlendMode)
                    }
                    className="bg-gray-100 px-1.5 py-1 text-[10px] text-gray-600"
                  >
                    <option value="normal">Normal</option>
                    <option value="multiply">Multiply</option>
                    <option value="screen">Screen</option>
                    <option value="overlay">Overlay</option>
                    <option value="darken">Darken</option>
                    <option value="lighten">Lighten</option>
                    <option value="color-dodge">Color Dodge</option>
                    <option value="color-burn">Color Burn</option>
                  </select>
                </label>
                {ADJUSTMENT_ROWS.map(({ field, label }) => (
                  <label
                    key={field}
                    className="flex items-center gap-2 text-[10px] text-gray-500"
                  >
                    {label}
                    <input
                      type="range"
                      min={-100}
                      max={100}
                      value={activeLayer[field] ?? 0}
                      onChange={(e) =>
                        onAdjustmentChange(activeLayer.id, field, Number(e.target.value))
                      }
                      onPointerUp={onAdjustmentDragEnd}
                      onBlur={onAdjustmentDragEnd}
                      className="flex-1 accent-violet-500"
                    />
                    <span className="w-8 shrink-0 text-right">
                      {activeLayer[field] ?? 0}
                    </span>
                  </label>
                ))}
                <button
                  onClick={() => onResetAdjustments(activeLayer.id)}
                  disabled={
                    !activeLayer.brightness &&
                    !activeLayer.contrast &&
                    !activeLayer.saturation &&
                    !activeLayer.temperature &&
                    !activeLayer.tint
                  }
                  className="self-end text-[10px] text-violet-500 hover:text-violet-700 disabled:opacity-30"
                >
                  초기화
                </button>
              </div>
            )}
          </div>
```

- [ ] **Step 6: 타입 검사 + lint**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: `Editor.tsx`의 두 `<LayerPanel>` 호출부가 아직 `onResetAdjustments`를 안 넘겨서 나는 에러만 남는다(Task 2에서 해결). `LayerPanel.tsx` 자체에서 나는 에러는 없어야 한다.

Run: `npm run lint`
Expected: `LayerPanel.tsx`에서 나는 새 에러 없음.

- [ ] **Step 7: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/LayerPanel.tsx
git commit -m "feat: 레이어 패널 필터 UI를 드롭다운 패널로 전환하고 보정 초기화 버튼 추가"
```

---

### Task 2: `Editor.tsx` — 초기화 핸들러 + 배선 + 전체 검증

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/Editor.tsx`

**Interfaces:**
- Consumes: Task 1의 `LayerPanel`의 새 prop `onResetAdjustments: (id: string) => void`.
- Produces: 없음(이 계획의 마지막 태스크).

- [ ] **Step 1: `handleResetAdjustments` 핸들러 추가**

`handleAdjustmentDragEnd` 함수(현재 1916~1918번째 줄) 다음, `handleFlattenLayers` 이전에 추가:

```ts
  const handleResetAdjustments = useCallback(
    (id: string) => {
      const nextLayers = history.presentLayers.map((l) =>
        l.id === id
          ? {
              ...l,
              brightness: undefined,
              contrast: undefined,
              saturation: undefined,
              temperature: undefined,
              tint: undefined,
            }
          : l,
      );
      pushLayerOp(nextLayers, history.activeLayerId);
    },
    [history.presentLayers, history.activeLayerId, pushLayerOp],
  );
```

- [ ] **Step 2: 두 `<LayerPanel>` 호출부에 prop 연결**

넓은 사이드바용 호출부(현재 2541번째 줄부터 시작)와 좁은 플로팅 패널용 호출부(현재 2591번째 줄부터 시작) 둘 다에서, `onAdjustmentDragEnd={handleAdjustmentDragEnd}` 다음 줄에 추가한다(두 곳 모두 동일하게):

```tsx
                      onAdjustmentDragEnd={handleAdjustmentDragEnd}
                      onResetAdjustments={handleResetAdjustments}
                      onFlatten={handleFlattenLayers}
```

(넓은 사이드바 쪽은 들여쓰기가 6칸, 좁은 플로팅 패널 쪽은 4칸이다 — 각 호출부의 기존 들여쓰기를 그대로 따른다.)

- [ ] **Step 3: 타입 검사 + lint + 빌드**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 에러 없음(레이어·프레임 모드·블렌드 기능 관련 코드를 포함해 전체가 클린해야 한다).

Run: `npm run lint`
Expected: 새 에러 없음. 기존에 있던 `PixelCanvas.tsx`의 `handlePointerDown` 관련 `react-hooks/exhaustive-deps` 경고와 다른 파일들의 `no-img-element` 경고는 이 작업과 무관한 사전 존재 경고이므로 그대로 남아 있어도 된다.

Run: `npm run build`
Expected: 빌드 성공.

- [ ] **Step 4: 브라우저 수동 확인**

`npm run dev`를 백그라운드로 띄우고, MCP 브라우저 도구가 없으므로 프로젝트에 이미 설치된 `playwright` 패키지로 임시 스크립트를 작성해(모듈 해석을 위해 프로젝트 루트 안에 두고, 확인 후 삭제) `/nemo-nemo-beam`에서 다음을 실제로 조작해 확인한다. `localStorage`에 레이어 1장짜리 작은 캔버스(`PixelArt`, V3 포맷)를 직접 주입해 데스크톱 아이콘을 더블클릭으로 열면 손으로 그릴 필요 없이 빠르게 검증할 수 있다(이전 태스크들에서 쓴 것과 같은 방식).

1. 트리거 버튼(`title="블렌드 모드·색보정"`)을 클릭하면 패널이 열리고, 다시 클릭하면 닫힌다.
2. 블렌드 모드를 Normal이 아닌 값(예: Multiply)으로 바꾸면 트리거 버튼이 보라색(`bg-violet-500`)으로 바뀐다 — 패널을 닫아도 유지된다.
3. 보정 슬라이더(예: 밝기)를 0이 아닌 값으로 두면 트리거 버튼이 보라색으로 바뀐다.
4. 블렌드 모드를 Normal로, 보정 5개를 전부 0으로 되돌리면 트리거 버튼이 다시 회색으로 돌아온다.
5. 보정값이 하나라도 0이 아닌 상태에서 "초기화" 버튼을 클릭하면 슬라이더 5개가 전부 0으로 돌아가고, 블렌드 모드는 그대로 유지된다(초기화 버튼은 블렌드 모드를 건드리지 않는다).
6. 초기화 직후 Ctrl+Z를 한 번 누르면 초기화 이전 값으로 정확히 되돌아간다(실행취소 항목이 하나로 남는지 확인).
7. 보정이 전부 기본값(블렌드 Normal, 슬라이더 전부 0)인 레이어를 선택하면 "초기화" 버튼이 비활성화(`disabled`, 흐리게 표시)된다.
8. 넓은 화면(사이드바 레이아웃)과 좁은 화면(플로팅 패널 레이아웃, 브라우저 창을 좁혀서 확인) 둘 다에서 트리거 버튼·패널·초기화 버튼이 동일하게 동작한다.

각 시나리오는 실제 DOM 상태(슬라이더 `value`, 버튼의 `disabled`/클래스, 패널 요소의 존재 여부)를 `page.evaluate`나 Playwright의 locator API로 읽어 확인한다 — 스크린샷만으로 판단하지 않는다. 확인 후 임시 스크립트·스크린샷·백그라운드 dev 서버를 모두 정리하고 `git status`로 깨끗한지 확인한다.

- [ ] **Step 5: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/Editor.tsx
git commit -m "feat: 레이어 패널 필터 초기화 핸들러 추가 및 배선"
```

---
