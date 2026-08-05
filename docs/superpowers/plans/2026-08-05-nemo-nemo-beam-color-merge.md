# 네모네모빔 색상 병합 UX 개편 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 이미지 import 패널(`ImportPanel.tsx`)의 색상 병합을 드래그 방식에서 "병합 모드 토글 + 다중 선택 + 병합 버튼" 방식으로 완전히 교체한다.

**Architecture:** 순서를 보존하는 선택 인덱스 배열(`mergeSelection`)로 다중 선택 상태를 관리하고, 클릭 한 번으로 선택·기준색 승격·선택 해제를 순환시키는 3단계 클릭 사이클을 스와치 버튼에 적용한다. 실제 병합 연산은 `pixelate.ts`에 새로 추가하는 `mergeManyColors`가 담당하며, 기존 `mergeColors`(쌍 병합)를 소스가 큰 인덱스부터 반복 호출하는 방식으로 구현해 인덱스 밀림 계산을 새로 만들지 않는다. 기존 드래그 병합 코드(`draggable`/`onDragStart`/`onDragOver`/`onDragLeave`/`onDrop`, `dragOverIndex`, `handleMergeDrag`)는 전부 제거한다.

**Tech Stack:** Next.js 16(App Router) + React 19 + TypeScript, 상태는 React 훅으로만 관리(외부 상태 라이브러리 없음).

## Global Constraints

- 이 프로젝트에는 자동화된 테스트 스위트가 없다(`package.json`에 `test` 스크립트 없음). 각 태스크는 자동 테스트 대신 `npx tsc --noEmit -p tsconfig.json`(타입 검사)과 `npm run lint`(ESLint) 통과, 그리고 `npm run dev`로 띄운 브라우저에서의 수동 확인으로 검증한다. 새로운 테스트 프레임워크를 도입하지 않는다.
- 설명 문구(안내 텍스트, 버튼 title 등)는 프로젝트의 한국어 문체 규칙(번역투 금지, 조사로 직결, 반복 회피)을 따른다.
- 이 Work(`5_PixelArtMaker`)는 밝은 OS 창 스타일(`bg-white`, `text-gray-600`, 아이콘/버튼 텍스트 `text-[10px]`)을 쓰고, 기존 "재색상 팝오버 열림" 강조는 `violet` 계열(`ring-violet-400`, `bg-violet-500`)을 쓴다. 병합 모드의 선택 강조는 이와 구분되도록 새로 `emerald` 계열을 쓴다(재색상 모드와 병합 모드를 시각적으로 명확히 구분하기 위함) — 이 프로젝트에서 emerald를 쓰는 다른 곳은 없으므로 이번에 새로 도입하는 강조색이다.
- 커밋 메시지는 한글, `Co-Authored-By: Claude` 트레일러를 붙이지 않는다.
- 설계 문서: `docs/superpowers/specs/2026-08-05-nemo-nemo-beam-color-merge-design.md`

---

### Task 1: `pixelate.ts`에 `mergeManyColors` 추가

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/pixelate.ts`

**Interfaces:**
- Consumes: 기존 `export function mergeColors(palette: string[], pixels: number[], indexA: number, indexB: number): { palette: string[]; pixels: number[] }` (`pixelate.ts:129-142`, 변경 없음)
- Produces: `export function mergeManyColors(palette: string[], pixels: number[], targetIndex: number, sourceIndices: number[]): { palette: string[]; pixels: number[] }` — Task 2의 `ImportPanel.tsx`가 이 함수를 import해서 쓴다.

- [ ] **Step 1: `mergeManyColors` 함수 추가**

`export function mergeColors(...)` 정의(현재 129~142번째 줄) 바로 뒤, `dedupePalette` 정의 바로 앞에 추가한다:

```ts
// 여러 소스 인덱스를 한 번에 targetIndex로 접는다. mergeColors(쌍 병합)를
// 소스 값이 큰 인덱스부터 내림차순으로 반복 호출하는 방식으로 구현한다 —
// 큰 인덱스를 먼저 지우면, 아직 처리하지 않은 나머지 소스들은 전부 방금
// 지운 인덱스보다 작으므로(내림차순 순회) 이번 삭제로 인한 인덱스 밀림의
// 영향을 받지 않는다(삭제는 자신보다 큰 인덱스만 한 칸씩 당긴다). 따라서
// 매 반복 소스는 항상 원래 값 그대로 써도 안전하고, target의 현재 위치만
// mergeColors와 같은 공식(targetIndex = indexA > indexB ? indexA - 1 : indexA)으로
// 갱신해 다음 반복에 넘기면 된다.
export function mergeManyColors(
  palette: string[],
  pixels: number[],
  targetIndex: number,
  sourceIndices: number[],
): { palette: string[]; pixels: number[] } {
  let curPalette = palette;
  let curPixels = pixels;
  let curTarget = targetIndex;
  const sortedSources = [...sourceIndices].sort((a, b) => b - a);
  for (const source of sortedSources) {
    const merged = mergeColors(curPalette, curPixels, curTarget, source);
    curPalette = merged.palette;
    curPixels = merged.pixels;
    curTarget = curTarget > source ? curTarget - 1 : curTarget;
  }
  return { palette: curPalette, pixels: curPixels };
}
```

- [ ] **Step 2: 타입 검사**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 에러 없음.

- [ ] **Step 3: 린트**

Run: `npm run lint`
Expected: 에러 없음(`mergeManyColors`는 아직 아무 데서도 import하지 않지만, export된 함수라 미사용 변수 경고 대상이 아니다).

- [ ] **Step 4: 커밋**

```bash
git add "app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/pixelate.ts"
git commit -m "feat : 네모네모빔 다중 색상 병합 헬퍼(mergeManyColors) 추가"
```

---

### Task 2: `ImportPanel.tsx` — 드래그 병합 제거 + 병합 모드 UI 구현

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/ImportPanel.tsx`

**Interfaces:**
- Consumes: Task 1의 `mergeManyColors(palette, pixels, targetIndex, sourceIndices)`
- Produces: (외부에서 참조되는 새 export 없음 — 컴포넌트 내부 UX 변경)

- [ ] **Step 1: import 교체**

현재(9~16번째 줄):

```ts
import {
  dedupePalette,
  mergeColors,
  pixelateImage,
  quantizeColors,
  reducePaletteFast,
  resamplePixelGrid,
} from "./pixelate";
```

다음으로 교체:

```ts
import {
  dedupePalette,
  mergeManyColors,
  pixelateImage,
  quantizeColors,
  reducePaletteFast,
  resamplePixelGrid,
} from "./pixelate";
```

- [ ] **Step 2: 상태 선언 교체 — `dragOverIndex` 제거, `mergeMode`/`mergeSelection` 추가**

현재(102~108번째 줄):

```ts
  // 드래그로 스와치를 다른 스와치 위에 놓으면 병합한다 — 지금 드래그가
  // 올라가 있는 대상만 별도로 표시해 놓을 위치를 알려준다.
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  // 색상 병합(드래그 병합·동일색 자동 병합)만 되돌릴 수 있게 하는 로컬
  // 되돌리기 스택 — 슬라이더로 다시 추출하면(runPixelate) 이전 상태와는
  // 아예 다른 팔레트가 되므로 함께 비운다.
  const [previewHistory, setPreviewHistory] = useState<Preview[]>([]);
```

다음으로 교체:

```ts
  // 병합 모드 on/off — 켜지면 스와치 클릭이 재색상 팝오버 대신 다중 선택으로
  // 동작한다.
  const [mergeMode, setMergeMode] = useState(false);
  // 병합 모드에서 선택한 스와치 인덱스들 — 순서를 보존한다. 0번째가 항상
  // "기준색"(병합 후 살아남는 색)이고, 나머지는 기준색으로 접힐 소스다.
  const [mergeSelection, setMergeSelection] = useState<number[]>([]);
  // 색상 병합(다중 선택 병합·동일색 자동 병합)만 되돌릴 수 있게 하는 로컬
  // 되돌리기 스택 — 슬라이더로 다시 추출하면(runPixelate) 이전 상태와는
  // 아예 다른 팔레트가 되므로 함께 비운다.
  const [previewHistory, setPreviewHistory] = useState<Preview[]>([]);
```

- [ ] **Step 3: `handleMergeDrag` 제거, `toggleMergeMode`/`handleMergeSelectClick`/`handleMergeConfirm` 추가**

현재(196~217번째 줄):

```ts
  // 스와치를 다른 스와치 위로 드래그해서 놓으면 병합한다 — 놓인 자리(target)의
  // 색이 남고, 끌어온 스와치(source)는 사라진다. 명시적인 병합 행위라 항상
  // 되돌리기 스택에 남긴다.
  const handleMergeDrag = useCallback(
    (sourceIndex: number, targetIndex: number) => {
      if (!preview || sourceIndex === targetIndex) return;
      setPreviewHistory((h) => [...h, preview]);
      const merged = mergeColors(
        preview.palette,
        preview.pixels,
        targetIndex,
        sourceIndex,
      );
      setPreview({
        ...preview,
        palette: merged.palette,
        pixels: merged.pixels,
      });
      setArmedColorIndex(null);
    },
    [preview],
  );
```

다음으로 교체:

```ts
  // 병합 모드 토글 — 켤 때든 끌 때든 선택 상태를 비우고, 켜는 순간 열려 있던
  // 재색상 팝오버가 있으면 닫는다(두 모드는 상호 배타적이다).
  const toggleMergeMode = useCallback(() => {
    setMergeMode((v) => !v);
    setMergeSelection([]);
    setArmedColorIndex(null);
  }, []);

  // 병합 모드에서 스와치를 클릭했을 때의 3단계 순환:
  // 1) 선택 안 됨 → 선택 목록 끝에 추가(목록이 비어 있었다면 이 색이 곧 기준색)
  // 2) 선택됨(기준색 아님) → 맨 앞으로 옮겨 새 기준색으로 승격
  // 3) 선택됨(기준색) → 선택에서 제거(남은 게 있으면 그중 가장 먼저 선택된
  //    색이 자동으로 새 기준색이 된다 — 배열 0번째가 항상 기준색이므로 별도
  //    처리가 필요 없다)
  const handleMergeSelectClick = useCallback((index: number) => {
    setMergeSelection((sel) => {
      const pos = sel.indexOf(index);
      if (pos === -1) return [...sel, index];
      if (pos === 0) return sel.filter((v) => v !== index);
      return [index, ...sel.filter((v) => v !== index)];
    });
  }, []);

  // 선택된 색상 전체(mergeSelection[0]을 제외한 나머지)를 기준색으로 접는다.
  // 배치 전체를 되돌리기 스택에 한 번만 남겨, 실행취소 한 번으로 이번에
  // 합친 묶음 전체가 복원되게 한다. 병합 모드 자체는 유지한다 — 여러 그룹을
  // 연달아 병합하는 배치 작업이 이번 개편의 핵심 동기이기 때문이다.
  const handleMergeConfirm = useCallback(() => {
    if (!preview || mergeSelection.length < 2) return;
    setPreviewHistory((h) => [...h, preview]);
    const merged = mergeManyColors(
      preview.palette,
      preview.pixels,
      mergeSelection[0],
      mergeSelection.slice(1),
    );
    setPreview({ ...preview, palette: merged.palette, pixels: merged.pixels });
    setMergeSelection([]);
  }, [preview, mergeSelection]);
```

- [ ] **Step 4: `runPixelate`에서 `mergeSelection`도 초기화**

현재(130~137번째 줄, `setPreview({...})` 다음 부분):

```ts
      setPreview({
        width: raw.width,
        height: raw.height,
        palette: quantized.palette,
        pixels: quantized.pixels,
      });
      setArmedColorIndex(null);
      setPreviewHistory([]);
    },
    [],
  );
```

다음으로 교체(추가된 줄은 `setMergeSelection([]);` 하나뿐):

```ts
      setPreview({
        width: raw.width,
        height: raw.height,
        palette: quantized.palette,
        pixels: quantized.pixels,
      });
      setArmedColorIndex(null);
      setPreviewHistory([]);
      setMergeSelection([]);
    },
    [],
  );
```

- [ ] **Step 5: `handleUndo`에서도 `mergeSelection` 초기화**

현재(245~249번째 줄):

```ts
  const handleUndo = useCallback(() => {
    if (previewHistory.length === 0) return;
    setPreview(previewHistory[previewHistory.length - 1]);
    setPreviewHistory((h) => h.slice(0, -1));
  }, [previewHistory]);
```

다음으로 교체:

```ts
  const handleUndo = useCallback(() => {
    if (previewHistory.length === 0) return;
    setPreview(previewHistory[previewHistory.length - 1]);
    setPreviewHistory((h) => h.slice(0, -1));
    setMergeSelection([]);
  }, [previewHistory]);
```

- [ ] **Step 6: 안내 문구 + 버튼 줄 JSX 교체**

현재(725~738번째 줄):

```tsx
          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-xs text-gray-600">
                추출된 색상 — 클릭해 재색상, 다른 색상 위로 드래그하면 병합
              </p>
              <button
                onClick={handleUndo}
                disabled={previewHistory.length === 0}
                title="색상 병합 되돌리기 (Ctrl/Cmd+Z)"
                className="shrink-0 bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600 hover:bg-gray-200 disabled:opacity-30"
              >
                실행취소
              </button>
            </div>
```

다음으로 교체(라벨을 버튼 줄과 분리해 좁은 사이드바에서 줄바꿈이 찌그러지지 않게 한다 — 이 파일의 "픽셀 해상도" 라벨과 같은 패턴):

```tsx
          <div>
            <div className="mb-1 flex flex-col gap-1">
              <p className="text-xs text-gray-600">
                {mergeMode
                  ? "병합할 색상을 클릭해 선택 · 다시 클릭하면 기준색 지정"
                  : "추출된 색상 — 클릭해 재색상"}
              </p>
              <div className="flex items-center justify-end gap-1">
                <button
                  onClick={toggleMergeMode}
                  title="여러 색상을 한 번에 병합"
                  className={`px-1.5 py-0.5 text-[10px] ${
                    mergeMode
                      ? "bg-emerald-500 text-white hover:bg-emerald-600"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  병합 모드
                </button>
                <button
                  onClick={handleUndo}
                  disabled={previewHistory.length === 0}
                  title="색상 병합 되돌리기 (Ctrl/Cmd+Z)"
                  className="shrink-0 bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600 hover:bg-gray-200 disabled:opacity-30"
                >
                  실행취소
                </button>
              </div>
              {mergeMode && mergeSelection.length >= 2 && (
                <button
                  onClick={handleMergeConfirm}
                  className="bg-emerald-500 py-1 text-[10px] font-semibold text-white hover:bg-emerald-600"
                >
                  선택한 색상 {mergeSelection.length}개 병합
                </button>
              )}
            </div>
```

- [ ] **Step 7: 스와치 버튼 JSX 교체 — 드래그 속성 제거, 클릭 사이클 연결, 링 스타일 교체**

현재(739~780번째 줄):

```tsx
            <div ref={swatchContainerRef} className="flex flex-wrap gap-1.5">
              {preview.palette.map((color, i) => (
                <button
                  key={i}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", String(i));
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragOverIndex !== i) setDragOverIndex(i);
                  }}
                  onDragLeave={() =>
                    setDragOverIndex((cur) => (cur === i ? null : cur))
                  }
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverIndex(null);
                    const sourceIndex = Number(
                      e.dataTransfer.getData("text/plain"),
                    );
                    if (!Number.isNaN(sourceIndex))
                      handleMergeDrag(sourceIndex, i);
                  }}
                  onClick={(e) => {
                    setArmedColorIndex((cur) => (cur === i ? null : i));
                    const rect = e.currentTarget.getBoundingClientRect();
                    setPopoverPos({ left: rect.left, top: rect.bottom + 4 });
                  }}
                  title={`${color} — 클릭: 색상 변환 · 드래그해서 다른 색상 위에 놓으면 병합`}
                  className={`h-5 w-5 ${
                    dragOverIndex === i
                      ? "ring-2 ring-violet-500"
                      : armedColorIndex === i
                        ? "ring-2 ring-violet-400"
                        : "ring-1 ring-black/10"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
```

다음으로 교체:

```tsx
            <div ref={swatchContainerRef} className="flex flex-wrap gap-1.5">
              {preview.palette.map((color, i) => {
                const selPos = mergeSelection.indexOf(i);
                const isAnchor = selPos === 0;
                const isSelected = selPos !== -1;
                return (
                  <button
                    key={i}
                    onClick={(e) => {
                      if (mergeMode) {
                        handleMergeSelectClick(i);
                        return;
                      }
                      setArmedColorIndex((cur) => (cur === i ? null : i));
                      const rect = e.currentTarget.getBoundingClientRect();
                      setPopoverPos({ left: rect.left, top: rect.bottom + 4 });
                    }}
                    title={
                      mergeMode
                        ? `${color} — 클릭해 선택 · 다시 클릭하면 기준색 지정`
                        : `${color} — 클릭: 색상 변환`
                    }
                    className={`relative h-5 w-5 ${
                      isAnchor
                        ? "ring-2 ring-emerald-500"
                        : isSelected
                          ? "ring-2 ring-emerald-300"
                          : !mergeMode && armedColorIndex === i
                            ? "ring-2 ring-violet-400"
                            : "ring-1 ring-black/10"
                    }`}
                    style={{ backgroundColor: color }}
                  >
                    {isAnchor && (
                      <span className="absolute -left-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    )}
                  </button>
                );
              })}
            </div>
```

- [ ] **Step 8: 타입 검사**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 에러 없음(`dragOverIndex`, `handleMergeDrag`, `mergeColors` import 참조가 전부 제거되어 미정의 참조 에러가 없어야 한다).

- [ ] **Step 9: 린트**

Run: `npm run lint`
Expected: 에러 없음(미사용 import/변수 없어야 함).

- [ ] **Step 10: 수동 브라우저 확인**

Run: `npm run dev`, 브라우저에서 플레이그라운드 → 네모네모빔 편집기 → 이미지 불러오기(또는 새 캔버스 다이얼로그의 이미지 import) 진입.

확인 목록:
1. 색이 여러 개(4개 이상) 나오는 이미지를 불러온다.
2. 병합 모드가 꺼진 기본 상태에서 스와치를 클릭하면 지금처럼 재색상 팝오버가 뜨는지 확인(회귀 없음).
3. "병합 모드" 버튼을 누른다 — 안내 문구가 "병합할 색상을 클릭해 선택..."으로 바뀌고, 버튼 자체가 강조색(emerald)으로 바뀌는지 확인.
4. 스와치 3개를 순서대로 클릭한다 — 첫 번째가 굵은 링 + 좌상단 점(기준색), 나머지 둘은 얇은 링(선택됨)으로 표시되는지 확인. "선택한 색상 3개 병합" 버튼이 나타나는지 확인.
5. 기준색이 아닌 선택된 스와치 하나를 다시 클릭한다 — 그 색이 새 기준색(굵은 링 + 점)으로 바뀌고, 이전 기준색은 얇은 링으로 강등되는지 확인(선택에서 빠지지 않음).
6. 지금 기준색인 스와치를 다시 클릭한다 — 선택에서 빠지고, 남은 색 중 가장 먼저 선택했던 색이 새 기준색이 되는지 확인.
7. 다시 색 3개를 선택한 뒤 "선택한 색상 N개 병합" 버튼을 누른다 — 팔레트에서 해당 색들이 하나(기준색)로 합쳐지고, 미리보기 캔버스의 픽셀도 즉시 기준색으로 바뀌는지 확인. 병합 모드는 계속 켜진 채로 남아 있는지 확인.
8. Ctrl/Cmd+Z(또는 "실행취소" 버튼)를 한 번만 누른다 — 방금 합친 3개 색 전체가 한 번에 복원되는지 확인(여러 번 눌러야 하지 않아야 함).
9. "병합 모드" 버튼을 다시 눌러 끈다 — 선택 표시가 사라지고, 스와치 클릭이 다시 재색상 팝오버를 여는지 확인.
10. 스와치를 드래그해봐도 아무 일도 일어나지 않는지 확인(드래그 병합 완전히 제거됨 — 브라우저 기본 이미지 드래그 고스트만 보일 수 있으나 병합은 되지 않아야 함).

Expected: 위 10가지 모두 통과.

- [ ] **Step 11: 커밋**

```bash
git add "app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/ImportPanel.tsx"
git commit -m "feat : 네모네모빔 색상 병합을 드래그 방식에서 다중 선택+버튼 방식으로 교체"
```
