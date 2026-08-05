# 네모네모빔 — 이미지 import 색상 병합 UX 개편

## 배경

이미지를 불러올 때(`ImportPanel.tsx`) 추출된 대표 색상은 스와치를 다른 스와치 위로 드래그해야 병합된다. 사용자 피드백:

- 드래그 제스처 자체를 처음 쓰는 사람이 발견하기 어렵다(안내 문구를 읽어야만 안다)
- 여러 색을 한 번에 정리해야 할 때 한 쌍씩 반복 드래그해야 해서 번거롭다
- 5×5px 스와치 위에 정확히 드롭하는 정밀도/타겟팅이 불편하다

이번 작업은 드래그 병합을 없애고, **다중 선택 + 병합 버튼** 방식으로 완전히 대체한다.

## 대상 파일

`app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/`
- `ImportPanel.tsx` — 병합 모드 상태·선택 상태·UI 전면 교체
- `pixelate.ts` — 다중 소스 병합 헬퍼 `mergeManyColors` 추가

`quantizeColors`, `mergeColors`, `dedupePalette`는 변경 없음(자동 병합·재색상 시 자동 중복 병합 경로는 그대로 유지).

## 병합 모드 진입

"실행취소" 버튼 옆에 **"병합 모드"** 토글 버튼을 추가한다.

- **꺼짐(기본)**: 지금과 동일하게 스와치 클릭 = 재색상 팝오버(`armedColorIndex`). 안내 문구: `추출된 색상 — 클릭해 재색상`.
- **켜짐**: 스와치 클릭이 다중 선택으로 바뀐다. 재색상 팝오버는 열리지 않는다(`armedColorIndex`는 이 모드 동안 무시하고, 토글 ON 시점에 열려 있던 팝오버가 있으면 즉시 닫는다). 안내 문구: `병합할 색상을 클릭해 선택 · 다시 클릭하면 기준색 지정`.

두 모드는 상호 배타적이며, 기존 드래그 관련 코드(`draggable`, `onDragStart`/`onDragOver`/`onDragLeave`/`onDrop`, `dragOverIndex` 상태, `handleMergeDrag`)는 전부 제거한다.

## 선택 상태 모델

병합 모드 동안의 선택은 순서를 보존하는 인덱스 배열로 관리한다:

```ts
const [mergeSelection, setMergeSelection] = useState<number[]>([]);
```

- `mergeSelection[0]`이 항상 "기준색"(살아남는 색)이다.
- 병합 모드를 끄거나(토글 OFF), 팔레트가 바뀌는 동작(슬라이더 재추출, undo)이 일어나면 `mergeSelection`을 비운다.

**스와치 클릭 시 동작(같은 클릭 이벤트, 별도 클릭 영역·모디파이어 키 없음):**

1. 클릭한 인덱스가 `mergeSelection`에 없으면 → 배열 끝에 추가(신규 선택). 배열이 비어 있었다면 이 색이 자동으로 기준색이 된다.
2. 클릭한 인덱스가 이미 있고 **기준색이 아니면(배열의 0번째가 아니면)** → 그 인덱스를 배열 맨 앞으로 이동시켜 새 기준색으로 승격(다른 원소들의 상대 순서는 유지, 기존 기준색은 그 뒤로 밀려 "선택됨" 상태가 됨).
3. 클릭한 인덱스가 이미 있고 **기준색이면(배열의 0번째)** → 배열에서 제거(선택 해제). 남은 원소가 있으면 새 0번째(가장 먼저 선택됐던 색)가 자동으로 새 기준색이 된다.

**시각 표시:**
- 기준색(`mergeSelection[0]`): 굵은 에메랄드 링(`ring-2 ring-emerald-500`) + 좌상단에 작은 점 표시
- 선택됨(기준색 아님): 얇은 에메랄드 링(`ring-2 ring-emerald-300`)
- 미선택: 기존 `ring-1 ring-black/10` 유지

## 병합 실행

`mergeSelection.length >= 2`일 때만 "선택한 색상 N개 병합" 버튼이 나타나며 활성화된다(N은 `mergeSelection.length`).

```ts
// pixelate.ts에 추가 — targetIndex를 남기고 sourceIndices를 전부 그 안으로 접는다.
// mergeColors를 반복 호출하는 대신, 인덱스 밀림을 한 번에 계산해 안전하게 처리한다.
export function mergeManyColors(
  palette: string[],
  pixels: number[],
  targetIndex: number,
  sourceIndices: number[],
): { palette: string[]; pixels: number[] };
```

클릭 시:
1. `previewHistory`에 현재 `preview`를 **한 번만** push(배치 전체가 실행취소 1회 단위)
2. `mergeManyColors(preview.palette, preview.pixels, mergeSelection[0], mergeSelection.slice(1))` 호출, 결과로 `preview` 교체
3. `mergeSelection`을 빈 배열로 초기화
4. 병합 모드는 유지(토글 그대로 켜진 상태) — 배치 작업(여러 그룹을 연달아 병합)이 이번 개편의 핵심 동기이므로, 매번 모드를 다시 켤 필요가 없어야 한다

## 실행취소

기존 `handleUndo`/Ctrl+Z 가로채기 로직(`previewHistory` 기반)은 그대로 재사용한다. 배치 병합이 `previewHistory`에 항목 하나만 남기므로, 실행취소 한 번으로 방금 병합한 묶음 전체가 원상복구된다.

## 범위 밖

- `maxColors` 슬라이더(자동 병합 경로) 동작 변경 없음 — 색상 거리 기반 자동 병합은 그대로 유지
- 재색상 시 자동 중복 병합(`dedupePalette` 경로)은 병합 모드와 무관하게 그대로 동작
- 모바일/터치 환경 최적화(스와치 크기 확대 등)는 이번 스코프에 포함하지 않는다
