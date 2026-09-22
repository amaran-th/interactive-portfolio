# 네모네모빔 모바일 레이아웃 — Phase 1: 셸(뼈대)

**목표:** 좁은 화면(지금의 `narrow`, `NARROW_BREAKPOINT = 820px`)에서 지금처럼 데스크톱 레이아웃의 요소를 아이콘/팝업으로 접는 정도가 아니라, 메디방류 모바일 드로잉 앱처럼 캔버스를 최대화하고 도구·색상·레이어를 하단 독 + 바텀시트로 접근하는 완전히 다른 화면 구조로 바꾼다. 기존 기능은 하나도 빠지지 않되, 시각적으로 더 깊이 숨을 수 있다(예: 2탭 들어가야 나오는 항목).

이 문서는 **셸(전체 틀)만** 다룬다. 도구바·색상환·레이어 패널 각각의 모바일 내부 구성(어떤 컨트롤을 어떻게 배치할지)은 각자 별도 설계 문서에서 다룬다 — 이번 단계에서는 기존 데스크톱 컴포넌트를 그대로 바텀시트 안에 넣어 우선 동작하게 만든다.

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

`MobileEditorShell` props (1차 초안 — 필요 시 구현 중 조정). 지금 어느 시트가 열려 있는지(`mobileSheet`/`moreDetail`)는 셸 내부 상태다 — Editor.tsx가 알 필요 없는 순수 네비게이션 상태라 prop으로 안 뺀다:

```ts
{
  fileName: string;
  onExit: () => void;              // 상단 바 좌측 닫기 — Editor.tsx의 handleExitClick 그대로
  onSave: () => void;              // 상단 바 저장 아이콘 — handleSave 그대로
  saveError: boolean;
  showSavedNotice: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  canvas: ReactNode;               // 지금 데스크톱 트리의 캔버스 뷰포트 부분 그대로
  toolPanel: ReactNode;            // <DrawToolbar>(Editor.tsx:3046) — 지금은 인라인 1회성, 셸을 위해 top-level 변수로 뺀다. Phase 2에서 모바일용으로 교체
  colorPanel: ReactNode;           // <ColorWheel>(Editor.tsx:3107) — 마찬가지로 인라인 1회성 → top-level 변수로. Phase 3
  layerPanel: ReactNode;           // <LayerPanel> — 지금 desktop wide(3391)·narrow 아이콘열(3446) 두 곳에 완전히 같은 props로 중복 선언돼 있다. 이 셸 작업에서 top-level 변수 하나로 합쳐 세 곳(wide·narrow 아이콘열·모바일 셸)이 공유하게 한다. Phase 4
  moreItems: { label: string; onClick: () => void }[]; // 더보기 리스트 항목
  tabs: { index: number; name: string; active: boolean }[];
  onSelectTab: (index: number) => void;
  onCloseTab: (index: number) => void; // requestCloseTab 그대로(더러우면 확인 다이얼로그, 아니면 바로 닫기) — 데스크톱 탭 바의 X와 동일 기능, 탭 목록 시트 각 행에도 필요(빠지면 탭을 닫을 방법이 없어진다)
  // 데스크톱 제목표시줄과 마찬가지로 활성 탭만 이름을 바꿀 수 있다(비활성
  // 탭은 데스크톱에서도 탭 바 자체에 편집 가능한 입력칸이 없다) — 탭 목록
  // 시트에서 활성 탭 행에만 편집 아이콘을 둔다.
  onRenameActiveTab: (name: string) => void; // Editor.tsx의 setName + setHasMetaEdits(true) 그대로
  onNewTab: () => void;
}
```

## 새 상태 — 화면 구조

```
┌─────────────────────────────┐
│ [‹] [파일명 ▾]  [💾][↩][↪] │  ← 상단 바, 얇게 고정
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

- **상단 바**: 좌측부터 `‹`(편집기 닫기, `onExit`) · 파일명(누르면 탭 목록 시트, `onOpenTabList`) · 저장(`onSave`, 저장 실패/자동 저장됨 표시는 아이콘 옆에 작게) · 되돌리기 · 다시실행. 데스크톱 제목표시줄의 인라인 이름 편집은 탭 목록 시트로 옮긴다(파일명을 누르면 이제 "편집 모드"가 아니라 "탭 목록"이 열리므로 같은 자리에서 둘 다 할 수 없다). 메뉴 바(파일/편집/레퍼런스/도움말)는 전부 "더보기"로 옮긴다.
- **캔버스**: 상단 바와 하단 독 사이 나머지 전부. 지금 데스크톱 트리에서 캔버스 뷰포트(`canvasViewportRef`가 있는 `<div>`)를 그대로 재사용한다.
- **하단 독**: 4개 고정 아이콘. 각각 눌렀을 때 열리는 시트는 아래 "바텀시트" 참고.

## 새 상태 — 바텀시트 (`BottomSheet` 컴포넌트)

새 공용 컴포넌트 `BottomSheet.tsx`를 만든다 — 이번 셸에서 최소 5곳(도구·색상·레이어·더보기·탭 목록)이 쓰고, Phase 5의 더보기 하위 항목(파일/편집/불러오기/내보내기/레퍼런스/도움말)도 같은 컴포넌트를 쓴다.

```ts
function BottomSheet({
  open,
  onClose,
  title,
  heightMode, // "peek"(부분 높이, 캔버스가 위로 계속 보임) | "full"(리스트·상세 화면)
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  heightMode: "peek" | "full";
  children: ReactNode;
}): JSX.Element | null
```

- **peek** — 도구/색상/레이어. 화면 아래 절반 정도(예: `max-h-[55vh]`)만 차지해 캔버스가 계속 보인다. 같은 하단 독 아이콘을 다시 누르거나, 시트 상단 그립(grabber)을 아래로 드래그하면 닫힌다.
- **full** — 더보기, 탭 목록, 그리고 더보기 하위 항목들(파일/편집/불러오기/내보내기/레퍼런스/도움말). 리스트나 기존 데스크톱 패널(`ImportPanel`/`ExportPanel`/`TracingListPanel`/도움말 다이얼로그 내용)을 그대로 넣기엔 세로 공간이 필요하므로 화면 대부분을 차지한다. 뒤로가기(‹) 버튼으로 닫는다.
- 열려 있는 시트는 한 번에 하나 — 하단 독 상태를 `mobileSheet: "tools" | "color" | "layers" | "more" | "tabs" | null` 하나로 관리한다("더보기" 안에서 하위 항목을 열면 `moreDetail: string | null`로 한 단계 더 스택).
- 드래그 다운/그립 제스처의 정확한 구현(포인터 이벤트 처리)은 이 문서에서 픽셀 단위로 정하지 않는다 — 구현 계획 단계에서 정한다. 최소 요건은 "탭으로 닫기(같은 독 아이콘 또는 명시적 버튼)는 반드시 동작해야 한다"는 것.

## 새 상태 — 더보기 시트 내용

리스트형(`heightMode="full"`): **파일 / 편집 / 이미지 불러오기 / 내보내기 / 레퍼런스 / 도움말**. 각 항목을 누르면 그 항목 전용 `BottomSheet`(`full`)가 스택으로 열린다.

- **파일**: `openFileMenu`(`Editor.tsx:2624`)의 항목 중 "내보내기"(서브메뉴 포함)만 빼고 나머지를 리스트로 보여준다 — 새로 만들기(`setShowNewCanvasDialog(true)`) / 열기(`setShowOpenDialog(true)`) / JSON 불러오기(`jsonFileInputRef.current?.click()`) / 저장(`handleSave`) / 다른 이름으로 저장(`handleSaveAs`). "내보내기"는 이미 더보기의 별도 항목이라 여기선 뺀다.
- **편집**: `openEditMenu`(`Editor.tsx:2711`) 항목 중 실행취소/다시실행은 상단 바에 이미 있으므로 뺀다 — 복사(`selection.copy`) / 캔버스 크기 수정(`setResizingCanvas(true)`) / 붙여넣기(`handlePaste`)만 리스트로 보여준다.
- **이미지 불러오기 / 내보내기**: 기존 `importPanel`/`exportPanel` 변수를 그대로 시트 안에 넣는다.
- **레퍼런스**: `TracingListPanel`(narrow에서 이미 쓰던 리스트형 레퍼런스 UI)을 그대로 재사용한다.
- **도움말**: 기존 도움말 다이얼로그 내용을 그대로 넣는다.

이 매핑은 1차안이며, Phase 5에서 실제 항목 수·순서를 다시 검토한다.

## 새 상태 — 탭 목록 시트

`heightMode="full"`. 열려 있는 탭(`tabs` 배열)을 리스트로 보여주고, 맨 아래 "+ 새 파일" 항목을 둔다. 항목을 누르면 그 탭으로 전환(`onSelectTab`)하고 시트를 닫는다. 각 행에 닫기(✕, `onCloseTab`) 아이콘을 둔다 — 데스크톱 탭 바의 X와 같은 기능(저장 안 된 변경이 있으면 확인 다이얼로그). 활성 탭은 강조 표시(●)하고, 그 행에만 편집(연필) 아이콘을 둬 이름을 바꿀 수 있게 한다(`onRenameActiveTab`) — 비활성 탭은 이름 편집을 지원하지 않는다(데스크톱과 동일한 제약).

## 영향받지 않는 것

- `narrow`보다 넓은 구간의 데스크톱 레이아웃(`IMPORT_EXPORT_BREAKPOINT` 포함) — 전혀 손대지 않는다.
- `Desktop.tsx`(편집기 밖 바탕화면 화면) 자체의 레이아웃 — 이번 범위는 편집창 컨테이너에 한정된다.
- 도구바·색상환·레이어 패널 컴포넌트 내부 — 이번 단계에서는 손대지 않고 시트 안에 그대로 넣는다(내부 모바일 최적화는 Phase 2~4).
- 저장 포맷, 실행취소 스택, 탭 전환 시 상태 스냅숏/복원 로직 — 전부 그대로.

## 테스트 계획

자동화된 테스트 스위트가 없는 프로젝트 — `npx tsc --noEmit`·`npm run lint`·`npm run build`로 정적 검증하고, 브라우저(Playwright 또는 DevTools 기기 에뮬레이션, 예: 390px 폭)로 다음을 확인한다:

1. 390px 폭에서 편집창을 열면 letterbox 없이 뷰포트를 꽉 채우는지 확인한다(상단 바 바로 아래부터 캔버스가 시작하는지).
2. 하단 독의 도구/색상/레이어를 각각 눌러 시트가 열리고, 캔버스가 시트 위로 계속 보이는지(peek) 확인한다. 같은 아이콘을 다시 누르면 닫히는지 확인한다.
3. 더보기 → 각 하위 항목(파일/편집/이미지 불러오기/내보내기/레퍼런스/도움말)이 열리고, 뒤로가기로 더보기 리스트로 돌아오는지 확인한다.
4. 상단 바의 되돌리기/다시실행·저장이 실제로 동작하는지, 파일명을 눌러 탭 목록 시트가 열리고 탭 전환·새 파일 추가·활성 탭 이름 바꾸기가 되는지, 좌측 `‹`로 편집기를 나갈 수 있는지 확인한다.
5. 창 폭을 820px 위아래로 오가며(리사이즈) 셸이 데스크톱 레이아웃과 깨끗하게 전환되는지(레이아웃이 깨지거나 상태가 유실되지 않는지) 확인한다.
6. 데스크톱 폭(≥ 820px)에서는 기존 레이아웃이 지금과 완전히 동일하게 동작하는지(회귀 없음) 확인한다.
