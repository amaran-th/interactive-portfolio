# 네모네모빔 모바일 도구 세로 열 재설계 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 네모네모빔 모바일 편집기의 도구 선택을 하단 독 "도구" 탭 팝오버에서
캔버스 왼쪽에 항상 떠 있는 세로 아이콘 열(오버레이)로 바꾼다.

**Architecture:** 새 컴포넌트 `MobileToolRail.tsx`가 세로 아이콘 열 + 오른쪽
플라이아웃(도구별 하위 옵션 또는 "+" 도구 더보기 그리드)을 렌더링한다.
`DrawToolbar.tsx`는 도구 메타데이터·하위 옵션 계산 로직을 그대로 유지한 채
`mobileLayout`일 때 이 컴포넌트로 위임만 한다. `MobileEditorShell.tsx`는 하단
독에서 "도구" 탭을 없애고, 그 자리 대신 도구 패널을 캔버스 래퍼 안에 항상
마운트한다.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4.
자동 테스트 없음(`CLAUDE.md`) — `tsc --noEmit` + `eslint` + 브라우저 수동 검증.

**Spec:** `docs/superpowers/specs/2026-10-01-nemo-nemo-beam-mobile-tool-rail-design.md`

## Global Constraints

- 모바일(`narrow`/`mobileLayout`)만 대상 — desktop(`DrawToolbar`의 `mobileLayout`
  미지정 경로) 렌더링·동작은 절대 바꾸지 않는다.
- 새 UI는 `panelStyles.ts`의 `FLOATING_PANEL`(불투명 흰 배경 + `ring-1
  ring-gray-300` + 그림자)만 쓴다. 반투명(알파 블렌딩) 배경을 쓰지 않는다.
- 세로 열·플라이아웃 버튼 크기는 `h-11 w-11 rounded-xl`(44px, 둥근 모서리).
- 도구별 하위 옵션 계산(`secondarySections`/`secondarySectionsNode`, 브러시
  크기·채우기 모드·그라데이션·선택 모드 등)은 `DrawToolbar.tsx`에 그대로 두고
  절대 재계산 로직을 만들지 않는다 — 새 컴포넌트는 그 결과물을 그리기만 한다.
- `Editor.tsx`는 변경하지 않는다.
- 자동 테스트가 없으므로 각 태스크는 `npx tsc --noEmit -p
  apps/services/tsconfig.json`과 `npm run lint --workspace services`가
  기존 경고(9개, 0 에러) 그대로 유지되는지로 검증하고, 이어서 브라우저로 직접
  동작을 확인한다.

---

### Task 1: `MobileToolRail` 컴포넌트 생성 + `DrawToolbar.tsx` 모바일 분기 교체

**Files:**
- Create: `apps/services/components/works/5_PixelArtMaker/MobileToolRail.tsx`
- Modify: `apps/services/components/works/5_PixelArtMaker/DrawToolbar.tsx:370-478` (props·JSDoc), `DrawToolbar.tsx:748-926` (return 문)

**Interfaces:**
- Produces: `MobileToolRail` 기본 내보내기, props
  `{ primaryTools: ToolMeta[]; moreTools: ToolMeta[]; tool: Tool; onToolChange: (tool: Tool) => void; optionsContent: React.ReactNode }`
  (`ToolMeta = { tool: Tool; icon: typeof Paintbrush; label: string; key: string }`).
- Consumes: `DrawToolbar.tsx`가 이미 계산해 둔 `drawCardTools`(7개 배열),
  `COLLAPSIBLE_DRAW_TOOLS`(5개 배열, 모듈 최상단 상수), `secondarySectionsNode`
  (`React.ReactNode | null`). `Tool` 타입은 `./types`에서, `FLOATING_PANEL`은
  `./panelStyles`에서 가져온다(둘 다 기존 파일, 새로 안 만든다).

- [ ] **Step 1: `MobileToolRail.tsx` 작성**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Paintbrush, Plus } from "lucide-react";
import { FLOATING_PANEL } from "./panelStyles";
import { Tool } from "./types";

type ToolMeta = {
  tool: Tool;
  icon: typeof Paintbrush;
  label: string;
  key: string;
};

function RailButton({
  active,
  onClick,
  title,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  icon: typeof Paintbrush;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
        active
          ? "bg-violet-500 text-white"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

// 캔버스 왼쪽에 항상 떠 있는 세로 도구 열 — 팝오버를 열지 않고 탭 한 번으로
// 도구를 바꾸는 드로잉 앱(ibisPaint·미디방페인트 등) 관례를 따른다. 도구별
// 하위 옵션(브러시 크기·채우기 모드 등) 계산은 DrawToolbar.tsx가 그대로
// 맡고, 이 컴포넌트는 그 결과물(optionsContent)을 열 오른쪽 플라이아웃에
// 그리기만 한다 — 옵션 계산 로직을 여기서 새로 만들지 않는다.
export default function MobileToolRail({
  primaryTools,
  moreTools,
  tool,
  onToolChange,
  optionsContent,
}: {
  primaryTools: ToolMeta[];
  moreTools: ToolMeta[];
  tool: Tool;
  onToolChange: (tool: Tool) => void;
  optionsContent: React.ReactNode;
}) {
  const [openFlyout, setOpenFlyout] = useState<"tool" | "more" | null>(null);

  // 도구가 바뀌면(세로 열이든 "+" 그리드든) 그 도구의 옵션을 자동으로 연다 —
  // 옵션이 없는 도구(예: 텍스트, optionsContent가 null)면 닫는다. 첫 마운트
  // 에는 실행하지 않는다(편집기를 열자마자 플라이아웃이 뜨는 건 원치 않는다).
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    // tool이 바뀔 때만 반응해야 한다 — optionsContent가 다른 이유로 바뀌는
    // 경우(같은 도구를 쓰는 중 그라데이션 단계 수를 조정하는 등)에는 이미
    // 열려 있는 플라이아웃을 새로 열거나 닫지 않는다. optionsContent는 그
    // 시점의 최신 값을 읽기만 하므로 의존성 배열에서 의도적으로 뺀다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    setOpenFlyout(optionsContent !== null ? "tool" : null);
  }, [tool]);

  const selectPrimary = (t: Tool) => {
    if (t === tool) {
      setOpenFlyout((cur) => (cur === "tool" ? null : "tool"));
      return;
    }
    onToolChange(t);
  };

  const selectFromMore = (t: Tool) => {
    if (t === tool) {
      setOpenFlyout((cur) => (cur === "tool" ? null : "tool"));
      return;
    }
    onToolChange(t);
  };

  return (
    <>
      {openFlyout !== null && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setOpenFlyout(null)}
        />
      )}
      <div className="absolute left-2 top-1/2 z-20 -translate-y-1/2">
        <div className={`flex flex-col gap-1.5 p-1.5 ${FLOATING_PANEL}`}>
          {primaryTools.map(({ tool: t, icon, label, key }) => (
            <RailButton
              key={t}
              active={tool === t}
              onClick={() => selectPrimary(t)}
              title={`${label} (${key})`}
              icon={icon}
            />
          ))}
          <div className="h-px bg-gray-200" />
          <RailButton
            active={openFlyout === "more"}
            onClick={() =>
              setOpenFlyout((cur) => (cur === "more" ? null : "more"))
            }
            title="도형·텍스트·그라데이션 도구 더보기"
            icon={Plus}
          />
        </div>
        {openFlyout === "tool" && optionsContent && (
          <div className={`absolute left-full top-0 ml-2 ${FLOATING_PANEL}`}>
            {optionsContent}
          </div>
        )}
        {openFlyout === "more" && (
          <div
            className={`absolute left-full top-0 ml-2 grid grid-cols-3 gap-1.5 p-1.5 ${FLOATING_PANEL}`}
          >
            {moreTools.map(({ tool: t, icon, label, key }) => (
              <RailButton
                key={t}
                active={tool === t}
                onClick={() => selectFromMore(t)}
                title={`${label} (${key})`}
                icon={icon}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 2: `DrawToolbar.tsx`에 `MobileToolRail` import 추가**

파일 맨 위 import 블록은 모듈 경로 알파벳 순으로 정렬돼 있다
(`GradientDial` → `HelpTip` → `helpTexts` → `panelStyles` → `Switch` →
`types`). 그 순서를 지켜 `import { HELP } from "./helpTexts";`와
`import { FLOATING_PANEL } from "./panelStyles";` 사이에 추가:

```tsx
import MobileToolRail from "./MobileToolRail";
```

- [ ] **Step 3: `mobileLayout` prop 주석 갱신**

`DrawToolbar.tsx`의 `mobileLayout?: boolean;` 위 주석(현재 470~476번 줄,
"모바일 셸("도구" 팝오버) 전용 — true면: (1)...(3) 도구별 하위 옵션을 이
컴포넌트 안에 바로 그린다" 로 시작하는 블록)을 찾아 아래로 바꾼다:

```tsx
  // 모바일 셸(캔버스 왼쪽 세로 도구 열) 전용 — true면 이 함수는 desktop
  // JSX를 렌더링하지 않고 MobileToolRail로 위임한다(아래 이른 return 참고).
  // drawCardTools·secondarySections 계산은 desktop과 동일하게 이 함수
  // 안에서 이뤄지고, MobileToolRail은 그 결과물만 받아 그린다. desktop은
  // 이 prop이 없으니(undefined) 지금과 완전히 동일하게 동작한다.
  mobileLayout?: boolean;
```

- [ ] **Step 4: `mobileLayout` 이른 return 추가 + desktop 분기의 죽은 조건 정리**

`DrawToolbar.tsx`의 현재 748번째 줄(`return (` 시작) 바로 위에 이른 return을
추가하고, desktop 전용이 된 아래 `!mobileLayout`/`mobileLayout ?` 조건들을
정리한다.

먼저 748번 줄 바로 위(730번대, `secondarySectionsNode` 계산이 끝난 directly
다음)에 삽입:

```tsx
  // mobileLayout이면 desktop 전용 카드 레이아웃 대신 세로 도구 열로
  // 위임한다 — drawCardTools·secondarySectionsNode는 위에서 이미 계산을
  // 끝냈으므로 그대로 넘기기만 한다.
  if (mobileLayout) {
    return (
      <MobileToolRail
        primaryTools={drawCardTools}
        moreTools={COLLAPSIBLE_DRAW_TOOLS}
        tool={tool}
        onToolChange={onToolChange}
        optionsContent={secondarySectionsNode}
      />
    );
  }

```

그다음 기존 `return (` 블록(desktop JSX) 안에서 이제 항상 `mobileLayout ===
undefined`인 상태로만 실행되므로, 다음 네 곳을 정리한다:

1. (원래 767~777번 줄 부근) `{!compact && !mobileLayout && COLLAPSIBLE_DRAW_TOOLS.map(...)}` →
   `{!compact && COLLAPSIBLE_DRAW_TOOLS.map(...)}`로 `!mobileLayout &&` 제거.
2. (원래 778번 줄 부근) `{(compact || mobileLayout) && (` → `{compact && (`로
   `|| mobileLayout` 제거. 같은 블록을 닫는 조건이 없으므로 JSX 구조(괄호
   짝)는 그대로 두고 조건식만 바꾼다.
3. (원래 796번 줄 부근) `{(compact || mobileLayout) && showMoreDrawTools && (` →
   `{compact && showMoreDrawTools && (`로 동일하게 정리.
4. (원래 816번 줄 부근) `{!mobileLayout && (` 로 감싸져 있던 "선택 · 조작"
   `ToolCard` 블록 — 감싸는 조건과 그 짝이 되는 `)}`를 제거해 항상 렌더링되게
   한다:
   ```tsx
   <ToolCard title="선택 · 조작" compact={compact}>
     <div className="flex gap-1">
       {SELECT_TOOLS.map(({ tool: t, icon, label, key }) => (
         <ToolButton
           key={t}
           active={tool === t}
           onClick={() => onToolChange(t)}
           title={`${label} (${key})`}
           icon={icon}
         />
       ))}
     </div>
   </ToolCard>
   ```
5. (원래 837번 줄 부근) `{!mobileLayout && (` 로 감싸져 있던 "편집" 카드
   `<div className="relative">...</div>` 블록도 같은 방식으로 감싸는 조건을
   제거해 항상 렌더링되게 한다(내부 `ToolCard title="편집"`과
   `TransformMoreButtons` 호출은 그대로 유지).
6. (원래 918~924번 줄) 함수 맨 끝의
   ```tsx
   {mobileLayout ? (
     <div className="px-3 pb-1.5">{secondarySectionsNode}</div>
   ) : (
     secondarySections.length > 0 &&
     secondaryPortalTarget &&
     createPortal(secondarySectionsNode, secondaryPortalTarget)
   )}
   ```
   를 desktop 분기만 남기고 단순화:
   ```tsx
   {secondarySections.length > 0 &&
     secondaryPortalTarget &&
     createPortal(secondarySectionsNode, secondaryPortalTarget)}
   ```

- [ ] **Step 5: 타입 체크 + 린트**

```bash
cd /Users/seyeon/Documents/github_projects/interactive-portfolio
npx tsc --noEmit -p apps/services/tsconfig.json
npm run lint --workspace services
```

기대 결과: 에러 0개, 경고 9개(기존 baseline과 동일 — `Desktop.tsx`의 unused
eslint-disable 1개, `PixelCanvas.tsx`의 exhaustive-deps 1개, `<img>` 관련 7개).
`MobileToolRail.tsx`·`DrawToolbar.tsx`에 새 에러·경고가 없어야 한다.

- [ ] **Step 6: 커밋**

```bash
cd /Users/seyeon/Documents/github_projects/interactive-portfolio
git add apps/services/components/works/5_PixelArtMaker/MobileToolRail.tsx apps/services/components/works/5_PixelArtMaker/DrawToolbar.tsx
git commit -m "feat: 네모네모빔 모바일 도구를 세로 아이콘 열로 재설계"
```

---

### Task 2: `MobileEditorShell.tsx` — 하단 독 "도구" 탭 제거, 도구 패널을 캔버스 오버레이로

**Files:**
- Modify: `apps/services/components/works/5_PixelArtMaker/MobileEditorShell.tsx`

**Interfaces:**
- Consumes: Task 1에서 만든 `MobileToolRail`을 직접 참조하지 않는다 —
  `toolPanel` prop(`Editor.tsx`가 `<DrawToolbar mobileLayout={narrow} .../>`로
  구성해 내려주는 기존 값, 이미 Task 1 덕분에 `mobileLayout`일 때
  `MobileToolRail`을 반환한다)을 그대로 받아 위치만 바꿔 그린다. 이 컴포넌트
  자체의 다른 props(`MobileEditorShellProps`)는 변경하지 않는다.
- Produces: 이 파일 밖에서 쓰는 것 없음(leaf 컴포넌트).

- [ ] **Step 1: `PopoverKind`에서 `"tools"` 제거**

`MobileEditorShell.tsx`의 (현재 57번 줄)

```tsx
type PopoverKind = "tools" | "color" | "layers" | "more" | null;
```

를

```tsx
type PopoverKind = "color" | "layers" | "more" | null;
```

로 바꾼다.

- [ ] **Step 2: `toolsBtnRef` 제거 + `btnRefFor` 정리**

(현재 89번 줄) `const toolsBtnRef = useRef<HTMLButtonElement>(null);` 줄을
삭제한다.

(현재 94~101번 줄)

```tsx
  const btnRefFor = (kind: Exclude<PopoverKind, null>) =>
    kind === "tools"
      ? toolsBtnRef
      : kind === "color"
        ? colorBtnRef
        : kind === "layers"
          ? layersBtnRef
          : moreBtnRef;
```

를

```tsx
  const btnRefFor = (kind: Exclude<PopoverKind, null>) =>
    kind === "color"
      ? colorBtnRef
      : kind === "layers"
        ? layersBtnRef
        : moreBtnRef;
```

로 바꾼다.

- [ ] **Step 3: `popoverContent`에서 `"tools"` 분기 제거**

(현재 200~201번 줄)

```tsx
  let popoverContent: React.ReactNode = null;
  if (openPopover === "tools") popoverContent = toolPanel;
  else if (openPopover === "color") popoverContent = colorPanel;
```

를

```tsx
  let popoverContent: React.ReactNode = null;
  if (openPopover === "color") popoverContent = colorPanel;
```

로 바꾼다(이어지는 `else if (openPopover === "layers")`, `else if
(openPopover === "more")` 블록은 그대로 둔다).

- [ ] **Step 4: 캔버스 래퍼 안에 `toolPanel`을 항상 렌더링**

(현재 317~319번 줄)

```tsx
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {canvas}
      </div>
```

를

```tsx
      {/* toolPanel(모바일에서는 MobileToolRail)은 더 이상 독 팝오버 콘텐츠가
          아니라 캔버스 위에 항상 떠 있는 오버레이다 — 이 div가 relative라
          MobileToolRail 내부의 absolute 포지셔닝이 이 캔버스 영역 기준으로
          앉는다(화면 전체 기준 fixed가 아니라 상단 바·하단 독과 자동으로
          안 겹친다). */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {canvas}
        {toolPanel}
      </div>
```

로 바꾼다.

- [ ] **Step 5: 하단 독에서 "도구" 버튼 제거**

(현재 339~349번 줄)

```tsx
        <div className="flex items-center justify-around border-t border-gray-200 bg-white py-1.5">
          <button
            ref={toolsBtnRef}
            onClick={() => toggle("tools")}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] ${
              openPopover === "tools" ? "text-violet-600" : "text-gray-500"
            }`}
          >
            <PenTool className="h-5 w-5" />
            도구
          </button>
          <button
            ref={colorBtnRef}
```

를

```tsx
        <div className="flex items-center justify-around border-t border-gray-200 bg-white py-1.5">
          <button
            ref={colorBtnRef}
```

로 바꾼다(즉 `toolsBtnRef` 버튼 전체를 삭제하고, 곧바로 "색상" 버튼부터
시작하게 한다).

- [ ] **Step 6: 이제 안 쓰는 `PenTool` import 제거**

`PenTool`은 방금 지운 "도구" 버튼 아이콘에만 쓰였다. 파일 맨 위 import
블록(현재 3~12번 줄)에서

```tsx
import {
  Layers,
  Menu,
  Palette,
  PenTool,
  Play,
  Redo2,
  Save,
  Undo2,
} from "lucide-react";
```

를

```tsx
import {
  Layers,
  Menu,
  Palette,
  Play,
  Redo2,
  Save,
  Undo2,
} from "lucide-react";
```

로 바꾼다.

- [ ] **Step 7: 타입 체크 + 린트**

```bash
cd /Users/seyeon/Documents/github_projects/interactive-portfolio
npx tsc --noEmit -p apps/services/tsconfig.json
npm run lint --workspace services
```

기대 결과: 에러 0개, 경고 9개(Task 1과 동일 baseline). `MobileEditorShell.tsx`에
`PenTool`·`toolsBtnRef`·`"tools"` 관련 미사용 변수 경고가 없어야 한다.

- [ ] **Step 8: 브라우저 수동 검증**

```bash
# 서비스 앱 dev 서버가 이미 떠 있지 않다면:
cd /Users/seyeon/Documents/github_projects/interactive-portfolio
npm run dev:services
```

브라우저에서 `http://localhost:3100/nemo-nemo-beam`을 열고, 창 폭을
820px(`NARROW_BREAKPOINT`) 아래로 좁힌 뒤(리사이즈가 잘 안 먹으면, 콘솔에서
`document.querySelector('.pam-editor').style.width = '390px'`처럼 `.pam-editor`
요소 자체의 폭을 직접 줄여도 같은 `ResizeObserver` 경로를 타 narrow 모드로
전환된다) 파일 하나를 열어 확인한다:

1. 하단 독에 "도구" 탭이 없고 색상 · 레이어 · 더보기 3개만 보인다.
2. 캔버스 왼쪽에 세로 아이콘 열(펜슬·지우개·채우기·선택·올가미·이동·자동
   선택 + "+")이 팝오버를 열지 않아도 바로 보인다.
3. "펜슬" 아이콘을 탭 → 펜슬이 활성(보라색) 상태가 되고 오른쪽에 브러시 크기
   플라이아웃이 자동으로 뜬다.
4. 활성 상태인 "펜슬"을 다시 탭 → 플라이아웃만 닫힌다(도구는 그대로 펜슬).
5. "+"를 탭 → 직선·사각형·원·텍스트·그라데이션 5개 그리드가 뜬다. "텍스트"를
   고르면 도구만 바뀌고 플라이아웃은 안 뜬다(옵션 없음). "사각형"을 고르면
   도구가 바뀌면서 브러시 크기·채우기 옵션 플라이아웃이 바로 뜬다.
6. 캔버스 빈 곳을 탭 → 열려 있던 플라이아웃이 닫힌다(도구 열 자체는 남는다).
7. 창을 다시 820px보다 넓혀 desktop 레이아웃으로 돌아왔을 때 기존 "그리기/
   선택·조작/편집" 3개 카드 + 캔버스 하단 포털 하위 옵션이 예전과 동일하게
   동작한다(회귀 없음).

- [ ] **Step 9: 커밋**

```bash
cd /Users/seyeon/Documents/github_projects/interactive-portfolio
git add apps/services/components/works/5_PixelArtMaker/MobileEditorShell.tsx
git commit -m "feat: 네모네모빔 모바일 하단 독에서 도구 탭 제거, 도구 열을 캔버스 오버레이로"
```
