# 즐겨찾기 관리 드롭다운 전환 + 팔레트 색상 미리보기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `ColorWheel.tsx`의 "즐겨찾기 관리"(팔레트 세트 불러오기·저장·삭제) UI를 인라인 펼침에서 뜨는 드롭다운 패널로 바꾸고, 각 세트의 색상을 스와치로 미리 볼 수 있게 한다.

**Architecture:** 톱니바퀴 버튼을 `relative` 래퍼로 감싸고 그 안에 `absolute` 드롭다운 패널을 둔다(`DrawToolbar.tsx`/`LayerPanel.tsx`의 필터 드롭다운과 같은 패턴). 세트 목록은 네이티브 `<select>`+공유 버튼 4개 방식에서, 세트마다 색상 미리보기·이름·아이콘 3개(불러오기·덮어쓰기·삭제)를 가진 한 줄 행 목록으로 바뀐다. "select로 고르기" 개념 자체가 없어지므로 `selectedSetId` 상태와 그 상태를 참조하던 3개 핸들러의 시그니처가 함께 바뀐다 — 로직과 UI가 서로 맞물려 있어 한 태스크로 묶는다.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, lucide-react.

## Global Constraints

- 자동화된 테스트 스위트가 없다 — 검증은 `npx tsc --noEmit -p tsconfig.json`, `npm run lint`, `npm run build`, 그리고 브라우저(Playwright 임시 스크립트) 확인이다.
- 삭제 아이콘은 확인창 없이 호버 후 클릭 한 번으로 즉시 삭제한다(기존 즐겨찾기 스와치 제거와 같은 관례).
- 색상 스와치는 세트당 최대 5개까지만 보여주고, 6개 이상이면 `+N`으로 나머지 개수를 표시한다.
- `paletteSets.ts`의 데이터 모델·저장 함수는 손대지 않는다.
- 커밋 메시지는 한국어로 쓰고 `Co-Authored-By: Claude` 트레일러를 넣지 않는다.
- 이 저장소에는 이 작업과 무관한 사전 수정 파일들이 있다 — `git status`로 확인 후 이 태스크가 건드리는 파일 하나만 정확히 스테이징한다. `git add -A`/`git add .`를 쓰지 않는다.

---

### Task 1: `ColorWheel.tsx` — 드롭다운 전환 + 색상 미리보기 + 로직 단순화

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/ColorWheel.tsx`

**Interfaces:**
- Consumes: 없음(기존 `paletteSets.ts` API — `createPaletteSet`/`deletePaletteSet`/`listPaletteSets`/`updatePaletteSetColors`, `PaletteSet` 타입 — 그대로 재사용).
- Produces: 없음(이 계획의 유일한 태스크, 컴포넌트 내부 구현만 바뀐다 — `ColorWheel`의 외부 props는 전혀 안 바뀐다).

- [ ] **Step 1: import에 아이콘 3개 추가**

`lucide-react` import(현재 3번째 줄)를 다음으로 바꾼다:

```ts
import { Download, Save, Settings, Trash2, X } from "lucide-react";
```

- [ ] **Step 2: `selectedSetId` 상태 제거**

`const [selectedSetId, setSelectedSetId] = useState("");`(현재 94번째 줄)를 통째로 삭제한다. 그 줄 앞뒤(`paletteSets` state 선언, `saveSetPromptOpen` state 선언)는 그대로 둔다.

- [ ] **Step 3: `handleConfirmSaveAsNewSet`에서 세트 선택 관련 코드 제거**

`handleConfirmSaveAsNewSet`(현재 107~115번째 줄)를 다음으로 바꾼다:

```ts
  const handleConfirmSaveAsNewSet = useCallback(
    (name: string) => {
      setSaveSetPromptOpen(false);
      createPaletteSet(name, favorites);
      setPaletteSets(listPaletteSets());
    },
    [favorites],
  );
```

- [ ] **Step 4: 세 핸들러가 대상 세트를 직접 인자로 받도록 수정**

`handleOverwriteSet`·`handleLoadSet`·`handleDeleteSet`(현재 117~137번째 줄, 그 사이 주석 포함)를 다음으로 통째로 바꾼다:

```ts
  // 세트 목록의 "덮어쓰기" 아이콘이 바로 호출한다 — select로 먼저 "고르는"
  // 절차가 없어져, 대상 세트를 인자로 직접 받는다.
  const handleOverwriteSet = useCallback(
    (set: PaletteSet) => {
      updatePaletteSetColors(set.id, favorites);
      setPaletteSets(listPaletteSets());
    },
    [favorites],
  );

  // 불러오기는 지금 즐겨찾기에 세트 색을 더하는 게 아니라, 즐겨찾기 전체를
  // 세트 색으로 통째로 바꾼다 — "이 세트를 쓴다"는 뜻이 분명해지도록.
  const handleLoadSet = useCallback(
    (set: PaletteSet) => onReplaceFavorites(set.colors),
    [onReplaceFavorites],
  );

  const handleDeleteSet = useCallback((set: PaletteSet) => {
    deletePaletteSet(set.id);
    setPaletteSets(listPaletteSets());
  }, []);
```

- [ ] **Step 5: 톱니바퀴 버튼을 드롭다운 트리거로 바꾸고 관리 패널을 그 자리로 옮긴다**

"즐겨찾기" 라벨 줄(현재 269~282번째 줄, `<div className="flex w-full items-center justify-between">`로 시작해 그 줄의 `</div>`로 끝나는 블록)을 다음으로 통째로 바꾼다 — 톱니바퀴 버튼을 `relative` 래퍼로 감싸고, 그 안에 드롭다운 패널(세트 목록 + 새로 저장 버튼)을 새로 넣는다:

```tsx
      <div className="flex w-full items-center justify-between">
        <p className="text-xs font-semibold text-gray-500">즐겨찾기</p>
        <div className="relative">
          <button
            onClick={() => setShowPaletteManager((v) => !v)}
            title="즐겨찾기 관리(팔레트 세트 불러오기·저장·삭제)"
            className={`flex h-5 w-5 items-center justify-center ${
              showPaletteManager
                ? "bg-violet-500 text-white"
                : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            }`}
          >
            <Settings className="h-3 w-3" />
          </button>
          {/* 팔레트 세트 — 파일이 아니라 편집기 자체에 저장돼 다른 작품을
              열어도 남아 있다. 위 즐겨찾기와는 분리된 저장소로, 즐겨찾기를
              이름 붙여 저장해뒀다가 나중에 통째로 불러와 쓴다. */}
          {showPaletteManager && (
            <div className="absolute top-full right-0 z-30 mt-1 flex w-56 flex-col gap-1 bg-white p-2 shadow-xl">
              <p className="text-xs font-semibold text-gray-500">즐겨찾기 관리</p>
              {paletteSets.length === 0 ? (
                <p className="text-[10px] text-gray-400">저장된 세트가 없습니다</p>
              ) : (
                <div className="flex flex-col">
                  {paletteSets.map((set) => (
                    <div key={set.id} className="group flex items-center gap-1 py-1">
                      <div className="flex shrink-0 gap-px">
                        {set.colors.slice(0, 5).map((c, i) => (
                          <span
                            key={i}
                            className="h-2.5 w-2.5"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                      {set.colors.length > 5 && (
                        <span className="shrink-0 text-[8px] text-gray-400">
                          +{set.colors.length - 5}
                        </span>
                      )}
                      <span
                        className="min-w-0 flex-1 truncate text-[10px] text-gray-700"
                        title={set.name}
                      >
                        {set.name}
                      </span>
                      <button
                        onClick={() => handleLoadSet(set)}
                        title="즐겨찾기 전체를 이 세트 색으로 교체"
                        className="flex h-5 w-5 shrink-0 items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      >
                        <Download className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleOverwriteSet(set)}
                        title="이 세트를 지금 즐겨찾기 내용으로 덮어쓰기"
                        className="flex h-5 w-5 shrink-0 items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      >
                        <Save className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteSet(set)}
                        title="이 세트 삭제"
                        className="hidden h-5 w-5 shrink-0 items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 group-hover:flex"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={handleSaveAsNewSet}
                disabled={favorites.length === 0}
                title="지금 즐겨찾기를 새 이름의 팔레트 세트로 저장"
                className="bg-gray-100 px-1.5 py-1 text-[10px] text-gray-600 hover:bg-gray-200 disabled:opacity-30"
              >
                새로 저장
              </button>
            </div>
          )}
        </div>
      </div>
```

- [ ] **Step 6: 옛 "즐겨찾기 관리" 블록 삭제**

즐겨찾기 스와치 그리드(`<div className="grid w-full grid-cols-6 gap-1.5">...`) 다음에 있던, `showPaletteManager && (...)`로 시작하는 옛 관리 패널 블록 전체(위 주석 포함, 현재 336~391번째 줄)를 통째로 삭제한다. 그 블록의 내용은 Step 5에서 라벨 줄 안으로 이미 옮겨졌다. 바로 다음에 있는 `<PromptModal ... />`(현재 393~399번째 줄)는 그대로 둔다.

- [ ] **Step 7: 타입 검사 + lint + 빌드**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 에러 없음.

Run: `npm run lint`
Expected: 새 에러 없음.

Run: `npm run build`
Expected: 빌드 성공.

- [ ] **Step 8: 브라우저 수동 확인**

`npm run dev`가 이미 떠 있을 수 있다(소유자가 동시에 작업 중일 수 있음) — 락 충돌이 나면 직접 시작하지 않은 프로세스를 강제 종료하지 말고 기존 서버를 재사용한다(Fast Refresh가 최신 소스를 서빙하므로 검증에 문제없다). MCP 브라우저 도구가 없으므로 프로젝트에 이미 설치된 `playwright` 패키지로 임시 스크립트를 작성해(모듈 해석을 위해 프로젝트 루트 안에 두고, 확인 후 삭제) `/nemo-nemo-beam`에서 확인한다. `localStorage`에 작은 캔버스(`PixelArt`, V3 포맷)를 직접 주입해 데스크톱 아이콘을 더블클릭으로 연다. 팔레트 세트는 `localStorage`의 `pixel-art-maker:palette-sets` 키에 `paletteSets.ts`의 `PaletteSet` 형식(`{id, name, colors}[]`)으로 직접 주입하면 UI 조작 없이 빠르게 준비할 수 있다 — 색상 6개 이상인 세트 하나(`+N` 확인용), 이름이 긴 세트 하나(말줄임 확인용)를 포함시킨다.

1. 톱니바퀴를 누르면 패널이 뜨고(문서 흐름을 밀어내지 않고 겹쳐서 — 패널이 뜬 상태에서 그 아래 즐겨찾기 스와치 그리드의 화면 위치가 패널 열기 전과 같은지 확인), 다시 누르면 닫히는지 확인한다.
2. 각 세트 행에 이름과 색상 스와치(최대 5개)가 보이는지 확인한다.
3. 색상이 6개 이상인 세트 행에 `+N`이 정확한 개수(전체 색상 수 − 5)로 표시되는지 확인한다.
4. 이름이 긴 세트가 말줄임(`...`)으로 잘려 보이는지, `title` 속성에 전체 이름이 있는지 확인한다.
5. 한 행의 불러오기 아이콘을 클릭하면 즐겨찾기 스와치 그리드가 그 세트의 색으로 즉시 교체되는지 확인한다.
6. 즐겨찾기를 몇 개 바꾼 뒤 한 행의 덮어쓰기 아이콘을 클릭하고, 패널을 닫았다 다시 열어 그 행의 스와치 미리보기가 갱신됐는지 확인한다.
7. 행에 마우스를 올리지 않으면 삭제 아이콘이 안 보이고, 올리면 나타나는지, 클릭하면 확인창 없이 바로 그 세트가 목록에서 사라지는지 확인한다.
8. 저장된 세트를 전부 지운 상태에서 패널을 열면 "저장된 세트가 없습니다" 문구가 보이는지 확인한다.
9. 즐겨찾기가 1개 이상 있으면 세트를 하나도 안 고른 상태에서도 "새로 저장" 버튼이 활성 상태인지 확인한다.

각 시나리오는 실제 DOM 상태(요소 존재 여부, 텍스트 내용, 클래스)를 `page.evaluate`나 Playwright locator API로 읽어 확인한다 — 스크린샷만으로 판단하지 않는다. 확인 후 임시 스크립트·스크린샷을 정리하고(직접 띄운 dev 서버가 아니라면 종료하지 않는다), `git status`로 이 태스크가 의도한 파일만 스테이징됐는지 확인한다.

- [ ] **Step 9: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/ColorWheel.tsx
git commit -m "feat: 즐겨찾기 관리를 드롭다운 패널로 전환하고 팔레트 세트 색상 미리보기 추가"
```

---
