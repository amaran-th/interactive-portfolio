# 네모네모빔 모바일 레이아웃 — Phase 1: 셸(뼈대)

**목표:** 좁은 화면(지금의 `narrow`, `NARROW_BREAKPOINT = 820px`)에서 지금처럼 데스크톱 레이아웃의 요소를 아이콘/팝업으로 접는 정도가 아니라, 메디방류 모바일 드로잉 앱처럼 캔버스를 최대화하고 도구·색상·레이어를 하단 독 + 그 아이콘 위에 뜨는 작은 플로팅 팝오버로 접근하는 완전히 다른 화면 구조로 바꾼다. 기존 기능은 하나도 빠지지 않되, 시각적으로 더 깊이 숨을 수 있다(예: 2단계 들어가야 나오는 항목).

> **개정 이력(2026-09-24):** 초안은 바텀시트(화면 절반~대부분을 덮는 모달)와 "탭 목록 시트"(편집기 안에서 여러 파일을 전환)를 썼으나, 실제로 목업을 보니 "웹사이트/모달" 느낌이 강하고 실제 드로잉 앱과 다르다는 피드백을 받아 전면 수정했다. 지금 버전은: (1) 바텀시트 대신, **이 편집기에 이미 있는** narrow 아이콘열의 플로팅 패널 패턴(`Editor.tsx`의 `FLOATING_PANEL` 스타일, `absolute top-0 right-full` 앵커링)을 그대로 재사용해 하단 독 위에 작은 팝오버로 띄운다. (2) 여러 파일 전환을 위한 탭 목록 UI를 아예 만들지 않는다 — 이 앱은 원래 "데스크탑(갤러리) → 편집기" 두 화면 구조이므로, 파일을 바꾸려면 좌측 상단 `‹`로 갤러리로 나가 거기서 다른 파일을 연다(데스크톱의 탭 바 자체가 모바일 셸의 범위 밖). 이 개정으로 `BottomSheet.tsx`(예전 Task 2 산출물)는 더 이상 쓰이지 않으므로 삭제한다 — 대체 컴포넌트도 필요 없다(아래 "하단 독 팝오버" 섹션 참고).

이 문서는 **셸(전체 틀)만** 다룬다. 도구바·색상환·레이어 패널 각각의 모바일 내부 구성(어떤 컨트롤을 어떻게 배치할지)은 각자 별도 설계 문서에서 다룬다 — 이번 단계에서는 기존 데스크톱 컴포넌트를 그대로 팝오버 안에 넣어 우선 동작하게 만든다.

## 현재 상태

- `PixelArtMaker.tsx`가 편집창을 열 때, `Desktop.tsx`가 계산한 `fittedSize`(배경화면 이미지 비율로 letterbox된 상자 크기)를 편집창 wrapper에 그대로 물려준다 — 편집창이 뷰포트 전체가 아니라 "데스크탑 배경화면과 같은 비율의 창"으로 뜬다. 이게 지금 "데스크톱 컨셉의 비율"이다.
- `Editor.tsx`는 `rootRef.clientWidth`를 재서 `narrow`(< 820px)를 계산하고, 이 값으로 기존 데스크톱 스켈레톤 안에서 부분적으로만 요소를 접는다. 레이아웃의 큰 뼈대는 narrow에서도 바뀌지 않는다. 이 스켈레톤은 위에서부터:
  1. **제목표시줄**(`Editor.tsx:2880-2924`) — 파일명 인라인 편집 input, 저장 실패/자동 저장됨 표시, 저장 버튼(`handleSave`), 편집기 닫기(X, `handleExitClick`) 버튼.
  2. **메뉴 바**(`2942-2974`) — 파일(`openFileMenu`)/편집(`openEditMenu`)/레퍼런스(`!narrow`일 때만)/도움말(`setShowHelpDialog(true)`) 버튼 4개.
  3. **탭 바**(`2977`~) — 열린 파일들을 가로로 나열, 클릭 시 `switchToTab`.
  4. 그 아래: 왼쪽 열(색상환+불러오기/내보내기) · 캔버스 · 오른쪽 열(미리보기+레이어 패널 또는 아이콘 열).
- `IMPORT_EXPORT_BREAKPOINT`(1000px)는 이미지 불러오기/내보내기만 먼저 접는 중간 단계 — 이번 모바일 셸과는 독립적으로 그대로 유지한다(모바일 셸이 켜지는 820px보다 넓은 구간에서만 의미가 있다).

## 새 상태 — 컨테이너

`PixelArtMaker.tsx`에서 편집창이 `narrow`일 때는 `fittedSize` 적용을 건너뛰고 뷰포트를 그대로 채운다.

```tsx
// PixelArtMaker.tsx
import { NARROW_BREAKPOINT } from "./types";

const appRef = useRef<HTMLDivElement>(null);
const [isMobile, setIsMobile] = useState(false);
useEffect(() => {
  const el = appRef.current;
  if (!el) return;
  const update = () => setIsMobile(el.clientWidth < NARROW_BREAKPOINT);
  update();
  const ro = new ResizeObserver(update);
  ro.observe(el);
  return () => ro.disconnect();
}, []);
```

`pam-app` 루트 div에 `ref={appRef}`를 달고, 편집창 wrapper의 `style`을 `!isMobile && fittedSize ? {...} : undefined`로 바꾼다 — 모바일이면 className의 `h-full w-full`만 남아 진짜 전체화면이 된다. `Desktop.tsx`(바탕화면 자체) 쪽은 이번 범위가 아니다 — 편집창이 열려 있을 때만 해당하는 변경이다.

`Editor.tsx`의 `narrow`는 `rootRef.clientWidth` 기준으로 이미 같은 820px를 보므로, wrapper가 진짜 전체 뷰포트 폭이 되면 `narrow`도 실제 기기 폭과 일치하게 켜진다 — 별도 동기화가 필요 없다.

## 새 상태 — Editor.tsx 최상위 분기

지금은 `narrow` 값에 따라 하나의 거대한 JSX 트리 안에서 조각조각 갈라지는데, 모바일은 구조 자체가 다르므로 콘텐츠는 최상위에서 통째로 분기한다. 단, **바깥 루트 `<div ref={rootRef} className="pam-editor ...">`(커서 `<style>`·`onPointerDownCapture` 포함, `Editor.tsx:2800-2825`)는 두 분기가 그대로 공유**해야 한다 — `narrow` 자체가 이 `rootRef.current`를 재서 계산되는데(폭 감지 `useEffect`가 `[]` deps로 마운트 시 한 번만 `ResizeObserver`를 답), `if (narrow) return <MobileEditorShell/>`처럼 **루트 엘리먼트 자체**를 다른 타입으로 바꿔버리면 그 순간 리액트가 통째로 언마운트·재마운트해 옵저버가 옛 노드를 잃고 다시는 못 얻는다(모바일로 넘어가면 그 뒤로 다시 넓혀도 영원히 데스크톱으로 못 돌아오는 버그). 그래서 분기는 루트 **안쪽**에서 한다:

```tsx
return (
  <div ref={rootRef} className="pam-editor ..." onPointerDownCapture={...}>
    <style>{/* 지금과 동일 */}</style>
    <input ref={jsonFileInputRef} type="file" .../>{/* 지금과 동일 — 위치만 유지 */}

    {narrow ? (
      <MobileEditorShell {...mobileShellProps} />
    ) : (
      <>{/* 제목표시줄 · 메뉴 바 · 탭 바 · ContextMenu · 3열 콘텐츠, 지금과 동일 */}</>
    )}

    {/* 아래는 분기와 무관하게 항상 렌더 — 모바일의 "더보기" 항목(새로 만들기·
        열기·저장·캔버스 크기 수정 등)도 이 다이얼로그들을 그대로 연다.
        지금 이미 이 위치(desktop 콘텐츠 다음, pam-editor 루트의 형제)에
        있으므로 옮길 필요 없이 그대로 둔다: */}
    {showNewCanvasDialog && <NewCanvasDialog .../>}
    {showOpenDialog && (/* 지금과 동일 */)}
    {showHelpDialog && (/* 지금과 동일 */)}
    {resizingCanvas && (/* 지금과 동일 */)}
    {pendingCloseTabIndex !== null && (/* 지금과 동일 */)}
    {pendingExit && (/* 지금과 동일 */)}
    <AlertModal /* 지금과 동일 */ />
    <PromptModal /* 지금과 동일 */ />
    {!narrow && (/* 레퍼런스 창 — 이미 !narrow 가드가 있어 그대로 둔다 */)}
  </div>
);
```

즉 실제로 "새로 통째로 갈라야 하는" 부분은 제목표시줄·메뉴바·탭바·`menuAnchor`(ContextMenu)·3열 콘텐츠뿐이다. 나머지(다이얼로그·모달·알림 두 개·레퍼런스 창)는 이미 그 콘텐츠 블록 *다음*에 형제로 있으므로 위치를 옮기지 않고 그대로 둔다 — 두 분기 모두에서 계속 동작한다.

`MobileEditorShell`은 새 파일(`MobileEditorShell.tsx`)로 뺀다 — `Editor.tsx`가 이미 3800줄 넘게 크고, 셸은 데스크톱 트리와 공유하는 마크업이 거의 없다. `Editor.tsx`는 이미 `importPanel`/`exportPanel`/`layerPanel`처럼 재사용 가능한 JSX 조각을 변수로 만들어 데스크톱 분기와 narrow 아이콘 열이 공유하게 하고 있다 — `MobileEditorShell`도 이 조각들을 그대로 props로 받는다(내부 구현을 모른 채 완성된 패널만 받으면 되므로 결합이 느슨하다).

`MobileEditorShell` props (1차 초안 — 필요 시 구현 중 조정). 지금 어느 팝오버가 열려 있는지(`openPopover`/`moreDetail`)는 셸 내부 상태다 — Editor.tsx가 알 필요 없는 순수 네비게이션 상태라 prop으로 안 뺀다. **여러 파일 전환 UI는 이 컴포넌트에 없다** — 이 앱은 데스크탑(갤러리, `Desktop.tsx`) → 편집기 두 화면 구조이므로, 파일을 바꾸려면 `onExit`으로 갤러리로 나간다(데스크톱의 탭 바는 모바일 셸 범위 밖):

```ts
{
  hasActiveTab: boolean;           // false면 "열린 파일 없음" 빈 상태(드물게만 발생 — 기존 Editor.tsx의 activeTabIndex<0 분기와 동급)
  fileName: string;                // isWallpaper면 WALLPAPER_NAME
  onRenameFile: (name: string) => void; // 상단 바 파일명 입력칸의 onChange — 데스크톱 제목표시줄과 동일한 인라인 편집(setName + setHasMetaEdits(true)), isWallpaper면 무시
  onExit: () => void;              // 상단 바 좌측 `‹` — Editor.tsx의 handleExitClick 그대로(갤러리로 나가기)
  onSave: () => void;              // 상단 바 저장 아이콘 — handleSave 그대로
  saveError: boolean;
  showSavedNotice: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  canvas: ReactNode;               // 지금 데스크톱 트리의 캔버스 뷰포트 부분 그대로
  toolPanel: ReactNode;            // <DrawToolbar> — Task 3에서 이미 top-level 변수로 추출됨
  colorPanel: ReactNode;           // <ColorWheel> — Task 3에서 이미 top-level 변수로 추출됨
  layerPanel: ReactNode;           // <LayerPanel> — Task 3에서 이미 top-level 변수로 추출·중복 제거됨(wide·narrow 아이콘열·모바일 셸 세 곳이 공유)
  moreItems: MobileMoreItem[];     // "더보기" 팝오버 목록 항목 — 아래 "더보기 팝오버 내용" 참고
  onNewTab: () => void;            // 빈 상태의 "새로 만들기"에만 쓰인다(setShowNewCanvasDialog(true))
  onOpenExisting: () => void;      // 빈 상태의 "열기"에만 쓰인다(setShowOpenDialog(true))
}
```

## 새 상태 — 화면 구조

```
┌─────────────────────────────┐
│ [‹] [파일명 입력칸]  [💾][↩][↪] │  ← 상단 바, 얇게 고정
├─────────────────────────────┤
│                             │
│                             │
│           캔버스             │  ← 남는 공간 전부
│                             │
│                             │
├─────────────────────────────┤
│  [도구] [색상] [레이어] [더보기] │  ← 하단 독, 고정
└─────────────────────────────┘
```

- **상단 바**: 좌측부터 `‹`(갤러리로 나가기, `onExit`) · 파일명(편집 가능한 입력칸, `onRenameFile` — 데스크톱 제목표시줄과 동일한 인라인 편집) · 저장(`onSave`, 저장 실패/자동 저장됨 표시는 아이콘 옆에 작게) · 되돌리기 · 다시실행. 메뉴 바(파일/편집/레퍼런스/도움말)는 전부 "더보기"로 옮긴다. **여러 파일 전환 UI는 없다** — 다른 파일을 열려면 `‹`로 갤러리(`Desktop.tsx`)로 나간다.
- **캔버스**: 상단 바와 하단 독 사이 나머지 전부. 지금 데스크톱 트리에서 캔버스 뷰포트(`canvasViewportRef`가 있는 `<div>`)를 그대로 재사용한다.
- **하단 독**: 4개 고정 아이콘(도구·색상·레이어·더보기). 각각 눌렀을 때 뜨는 팝오버는 아래 참고.

## 새 상태 — 하단 독 팝오버(바텀시트 아님)

**새 컴포넌트를 만들지 않는다.** 이 편집기에는 이미 "아이콘을 누르면 그 근처에 작은 플로팅 패널이 뜬다"는 패턴이 두 군데 있고(narrow일 때 이미지 불러오기/내보내기 아이콘 쌍 — `Editor.tsx:3399`, `className={\`absolute bottom-full left-0 z-40 mb-2 flex max-h-[70vh] w-72 flex-col ${FLOATING_PANEL}\`}`; narrow 아이콘열의 레이어/불러오기/내보내기/레퍼런스 — `Editor.tsx:3527`, `right-full` 버전), 모바일 하단 독도 **첫 번째와 완전히 같은 CSS 방식**(`bottom-full`, `FLOATING_PANEL`, `w-72` 등)을 그대로 쓴다. 바텀시트(화면 절반 이상을 덮는 모달)와 달리, 독을 감싸는 `relative` 컨테이너 안에서 `absolute bottom-full`로 그 독 바로 위에만 뜨고 캔버스 대부분이 계속 보인다 — 별도 그립·드래그·백드롭 애니메이션이 필요 없다(기존 두 패턴 모두 그런 것 없이 단순 `absolute` 포지셔닝뿐이다).

```tsx
// MobileEditorShell.tsx 안, 하단 독을 감싸는 구조 — Editor.tsx:3399의 패턴 그대로
<div className="relative">
  {openPopover && (
    <div className={`absolute bottom-full left-2 right-2 z-40 mb-2 flex max-h-[60vh] flex-col overflow-y-auto ${FLOATING_PANEL}`}>
      {/* openPopover === "tools" ? toolPanel : "color" ? colorPanel : "layers" ? layerPanel : 더보기 목록/상세 */}
    </div>
  )}
  <div className="flex items-center justify-around border-t border-gray-200 bg-white py-1.5">
    {/* 도구/색상/레이어/더보기 4개 아이콘 버튼 — 누르면 openPopover 토글 */}
  </div>
</div>
```

`FLOATING_PANEL`은 `./panelStyles`에서 이미 export되고 있다(흰 배경 + 테두리 + 그림자 — `ContextMenu`, 기존 narrow 아이콘열 팝업 등 이 편집기의 모든 플로팅 패널이 이미 이 스타일을 쓴다). 같은 상수를 그대로 재사용해 데스크톱과 시각적으로 동일한 "떠 있는 패널" 느낌을 낸다.

- 열려 있는 팝오버는 한 번에 하나 — `openPopover: "tools" | "color" | "layers" | "more" | null` 하나로 관리한다. 같은 독 아이콘을 다시 누르거나 팝오버 바깥(캔버스·독)을 누르면 닫힌다(기존 `ContextMenu.tsx`의 "바깥 클릭 시 닫기" `mousedown` 리스너 패턴을 그대로 따른다).
- "더보기"만 목록 → 상세로 한 단계 더 들어간다 — `moreDetail: string | null`로 관리하고, 상세를 보여줄 땐 팝오버 맨 위에 "‹ 목록으로" 같은 작은 뒤로가기를 둔다(별도 컴포넌트나 스택 없이 같은 팝오버 안에서 내용만 바뀐다).
- 도구/색상/레이어 팝오버 내용(`toolPanel`/`colorPanel`/`layerPanel`)은 이미 데스크톱 크기 그대로라 `w-72`(288px) 폭에 맞춰 가로 스크롤 없이 들어가는지는 실제 화면에서 확인이 필요하다 — 안 맞으면 `left-2 right-2`(거의 전체 폭)로 넓히거나 내용을 줄이는 건 이번 문서 범위가 아니다(Phase 2~4에서 각 패널 자체를 모바일용으로 다시 설계할 때 다룬다). 이번 단계의 목표는 "형태(팝오버)"이지 "내용 최적화"가 아니다.

## 새 상태 — 더보기 팝오버 내용

목록: **파일 / 편집 / 이미지 불러오기 / 내보내기 / 레퍼런스 / 도움말**. "도움말"만 즉시 실행되는 액션(`setShowHelpDialog(true)`)이고 나머지는 눌렀을 때 같은 팝오버 안에서 상세 내용으로 바뀐다(`moreDetail` 참고). `MobileMoreItem` 타입:

```ts
type MobileMoreItem =
  | { id: string; label: string; kind: "action"; onSelect: () => void }
  | { id: string; label: string; kind: "detail"; content: (closeAll: () => void) => ReactNode };
```

- **파일**: `openFileMenu`(`Editor.tsx:2624`)의 항목 중 "내보내기"(서브메뉴 포함)만 빼고 나머지를 리스트로 보여준다 — 새로 만들기(`setShowNewCanvasDialog(true)`) / 열기(`setShowOpenDialog(true)`) / JSON 불러오기(`jsonFileInputRef.current?.click()`) / 저장(`handleSave`) / 다른 이름으로 저장(`handleSaveAs`).
- **편집**: `openEditMenu`(`Editor.tsx:2711`) 항목 중 실행취소/다시실행은 상단 바에 이미 있으므로 뺀다 — 복사(`selection.copy`) / 캔버스 크기 수정(`setResizingCanvas(true)`) / 붙여넣기(`handlePaste`)만 리스트로 보여준다.
- **이미지 불러오기 / 내보내기**: 기존 `importPanel`/`exportPanel` 변수를 그대로 팝오버 안에 넣는다.
- **레퍼런스**: `TracingListPanel`(narrow에서 이미 쓰던 리스트형 레퍼런스 UI)을 그대로 재사용한다. `onToggleAdjust`에서 조정할 이미지를 고르는 순간 팝오버 전체를 닫아(`closeAll()`) 캔버스의 조정 손잡이가 바로 보이게 한다 — 데스크톱 narrow 아이콘열(`Editor.tsx:3552` 근처 `onToggleAdjust={(id) => { handleToggleReferenceAdjust(id); setOpenFloatingPanel(null); }}`)과 같은 이유다.
- **도움말**: `setShowHelpDialog(true)` — 이미 전역 오버레이 다이얼로그라 팝오버 안에 내용을 넣을 필요 없이 그냥 열고 팝오버는 닫는다.

이 매핑은 1차안이며, Phase 5에서 실제 항목 수·순서를 다시 검토한다.

## 영향받지 않는 것

- `narrow`보다 넓은 구간의 데스크톱 레이아웃(`IMPORT_EXPORT_BREAKPOINT` 포함) — 전혀 손대지 않는다.
- `Desktop.tsx`(편집기 밖 바탕화면/갤러리 화면) 자체의 레이아웃 — 이번 범위는 편집창 컨테이너에 한정된다.
- 도구바·색상환·레이어 패널 컴포넌트 내부 — 이번 단계에서는 손대지 않고 팝오버 안에 그대로 넣는다(내부 모바일 최적화는 Phase 2~4).
- 저장 포맷, 실행취소 스택, 탭 전환(데스크톱 폭에서) 시 상태 스냅숏/복원 로직 — 전부 그대로. 모바일 셸 자체는 여러 탭을 다루지 않는다(활성 탭 하나만).
- `BottomSheet.tsx`(2026-09-18 초안의 Task 2 산출물)는 이 개정으로 더 이상 쓰이지 않는다 — 삭제한다.

## 테스트 계획

자동화된 테스트 스위트가 없는 프로젝트 — `npx tsc --noEmit`·`npm run lint`·`npm run build`로 정적 검증하고, 브라우저(Playwright 또는 DevTools 기기 에뮬레이션, 예: 390px 폭)로 다음을 확인한다:

1. 390px 폭에서 편집창을 열면 letterbox 없이 뷰포트를 꽉 채우는지 확인한다(상단 바 바로 아래부터 캔버스가 시작하는지).
2. 하단 독의 도구/색상/레이어를 각각 눌러 그 독 바로 위에 작은 팝오버가 뜨고, 캔버스 대부분이 계속 보이는지 확인한다(화면을 덮는 모달이 아님). 같은 아이콘을 다시 누르거나 팝오버 바깥(캔버스)을 누르면 닫히는지 확인한다.
3. 더보기 → 목록이 뜨고, 이미지 불러오기/내보내기/레퍼런스를 누르면 같은 팝오버 안에서 그 내용으로 바뀌며 "‹ 목록으로"로 되돌아오는지, 도움말을 누르면 팝오버가 닫히며 도움말 다이얼로그가 뜨는지 확인한다.
4. 상단 바의 되돌리기/다시실행·저장이 실제로 동작하는지, 파일명 입력칸을 눌러 이름을 바꿀 수 있는지, 좌측 `‹`로 편집기를 나가 갤러리(Desktop) 화면으로 돌아가는지 확인한다.
5. 더보기 > 파일 > 새로 만들기/열기로 다이얼로그가 뜨는지(전역 다이얼로그가 분기 바깥에 그대로 있는지 검증), 레퍼런스에서 이미지를 조정 모드로 고르면 팝오버가 닫히고 캔버스에 조정 손잡이가 보이는지 확인한다.
6. 창 폭을 820px 위아래로 오가며(리사이즈) 셸이 데스크톱 레이아웃과 깨끗하게 전환되는지(레이아웃이 깨지거나 상태가 유실되지 않는지, 여러 번 오가도 매번 정상 전환되는지) 확인한다.
7. 데스크톱 폭(≥ 820px)에서는 기존 레이아웃(탭 바 포함)이 지금과 완전히 동일하게 동작하는지(회귀 없음) 확인한다 — 모바일 셸에 탭 UI가 없다고 데스크톱의 탭 기능이 줄어드는 게 아니다.
