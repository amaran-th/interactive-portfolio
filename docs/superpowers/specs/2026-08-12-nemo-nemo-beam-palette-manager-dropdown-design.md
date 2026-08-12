# 네모네모빔 — 즐겨찾기 관리 드롭다운 전환 + 팔레트 색상 미리보기

**목표:** `ColorWheel.tsx`의 "즐겨찾기 관리"(팔레트 세트 불러오기·저장·삭제) UI를 지금의 인라인 펼침(아래 내용을 밀어내림)에서 뜨는 드롭다운 패널로 바꾸고, 세트 목록에 각 세트가 어떤 색으로 구성됐는지 스와치로 미리 볼 수 있게 한다.

## 현재 상태

톱니바퀴 버튼(`showPaletteManager` 토글)을 누르면 `w-full flex flex-col ... border-t pt-2` 블록이 문서 흐름 안에서 펼쳐진다 — 아래 있는 내용(캔버스 배경색 스와치 등은 위쪽에 있어 안 밀리지만, 이 컴포넌트 자체의 세로 길이가 늘어나 전체 사이드바 레이아웃에 영향을 준다). 세트 목록은 네이티브 `<select>`로, 각 옵션에 `이름 (색상 수)`만 텍스트로 보이고 실제 색은 안 보인다. 세트를 다루려면 select로 먼저 "고른" 뒤 아래 공유 버튼 4개(불러오기(교체)·덮어쓰기·새로 저장·삭제) 중 하나를 눌러야 한다.

## 드롭다운 전환

톱니바퀴 버튼을 감싸는 `<div className="relative">`를 새로 두고, 패널을 `absolute top-full right-0 z-30 mt-1 w-56 bg-white p-2 shadow-xl`로 바꾼다 — `DrawToolbar.tsx`/`LayerPanel.tsx`의 필터 드롭다운과 같은 패턴이다. `right-0`으로 버튼 오른쪽 끝에 맞춰 왼쪽으로 펼쳐지게 해, ColorWheel 위젯 폭(약 224px) 안에 패널이 들어오게 한다. 열림/닫힘은 지금의 `showPaletteManager` 상태와 토글 버튼 스타일(열려 있으면 보라색 강조)을 그대로 재사용한다 — 바깥 클릭으로 닫히는 기능은 넣지 않는다(이 프로젝트의 다른 드롭다운들과 같은 관례 — 여러 아이콘을 연달아 누를 수 있어야 하므로 자동으로 안 닫힌다).

## 세트 목록 — 한 줄 압축 레이아웃 + 색상 미리보기

세트마다 한 줄:

- **왼쪽**: 색상 스와치 최대 5개(각 10×10px, `gap-px`), 6개 이상이면 다섯 번째 다음에 `+N`(나머지 개수) 텍스트를 작게 표시한다.
- **가운데**: 세트 이름 — `min-w-0 flex-1 truncate`로 길면 말줄임(`title` 속성으로 전체 이름은 툴팁으로 확인 가능).
- **오른쪽**: 아이콘 버튼 3개 — 불러오기(`Download`), 덮어쓰기(`Save`), 삭제(`Trash2`, 이 프로젝트의 다른 삭제 버튼들과 같은 아이콘). 삭제 아이콘은 행에 마우스를 올렸을 때만 나타난다 — `LayerPanel.tsx`의 즐겨찾기 스와치 제거(×) 버튼과 같은 `hidden group-hover:flex` 패턴.

목록 아래에 "새로 저장" 버튼을 독립적으로 둔다 — 특정 세트를 고르지 않아도 되는 동작이라 행 아이콘과 분리한다.

세트가 하나도 없으면 목록 대신 "저장된 세트가 없습니다" 같은 짧은 안내문을 보여준다.

## 로직 단순화 — "고르고 실행" → "행마다 즉시 실행"

`selectedSetId` 상태와 `<select>`를 완전히 제거한다. `handleLoadSet`/`handleOverwriteSet`/`handleDeleteSet`는 더 이상 `selectedSetId`를 참조하지 않고, 대상 `PaletteSet`(또는 `id`)을 인자로 받아 그 자리에서 바로 실행한다:

```ts
const handleLoadSet = useCallback(
  (set: PaletteSet) => onReplaceFavorites(set.colors),
  [onReplaceFavorites],
);

const handleOverwriteSet = useCallback(
  (set: PaletteSet) => {
    updatePaletteSetColors(set.id, favorites);
    setPaletteSets(listPaletteSets());
  },
  [favorites],
);

const handleDeleteSet = useCallback((set: PaletteSet) => {
  deletePaletteSet(set.id);
  setPaletteSets(listPaletteSets());
}, []);
```

`handleSaveAsNewSet`/`handleConfirmSaveAsNewSet`(새로 저장 버튼 + 이름 입력 모달)는 세트 선택과 무관했으므로 그대로 둔다.

## 삭제 확인 없음

지금 즐겨찾기 스와치 제거(같은 파일의 `onRemoveFavorite` × 버튼)도 확인창 없이 호버 후 클릭 한 번으로 지운다 — 같은 관례를 세트 삭제에도 그대로 적용한다. 별도 확인 다이얼로그를 넣지 않는다.

## 영향받지 않는 것

- `paletteSets.ts`의 데이터 모델·저장 함수(`createPaletteSet`/`renamePaletteSet`/`updatePaletteSetColors`/`deletePaletteSet`/`listPaletteSets`) — 전혀 변경 없음.
- "새로 저장" 흐름(`PromptModal`로 이름 입력) — 그대로 유지.
- 즐겨찾기 스와치 그리드 자체(색 고르기·추가·편집·제거) — 이번 변경은 그 아래 "즐겨찾기 관리" 영역에만 해당한다.
- 저장 포맷 — 팔레트 세트는 원래도 문서 파일이 아니라 편집기 자체(`localStorage`)에 저장되므로 이번 변경과 무관하다.

## 테스트 계획

자동화된 테스트 스위트가 없는 프로젝트 — `npx tsc --noEmit`·`npm run lint`·`npm run build`로 정적 검증하고, 브라우저(Playwright 임시 스크립트)로 다음을 확인한다:

1. 톱니바퀴를 누르면 패널이 뜨고(문서 흐름을 밀어내지 않고 겹쳐서), 다시 누르면 닫힌다.
2. 팔레트 세트를 2개 이상 저장해둔 상태에서 패널을 열면, 각 행에 세트 이름과 색상 스와치(최대 5개 + 필요시 `+N`)가 보인다.
3. 색상이 6개 이상인 세트의 행에 `+N`이 정확한 개수(전체 색상 수 - 5)로 표시되는지 확인한다.
4. 이름이 긴 세트가 말줄임(`...`)으로 잘려 보이는지 확인한다.
5. 한 행의 "불러오기" 아이콘을 클릭하면 즐겨찾기 스와치 그리드가 그 세트의 색으로 즉시 교체되는지 확인한다(다른 행을 먼저 "고르는" 절차 없이).
6. 즐겨찾기를 몇 개 바꾼 뒤 한 행의 "덮어쓰기" 아이콘을 클릭하면 그 세트의 저장값이 지금 즐겨찾기로 바뀌는지(다시 패널을 열어 스와치 미리보기가 갱신됐는지) 확인한다.
7. 행에 마우스를 올리지 않은 상태에서는 삭제 아이콘이 안 보이고, 올리면 나타나는지 확인한다. 삭제 아이콘을 클릭하면 확인창 없이 바로 그 세트가 목록에서 사라지는지 확인한다.
8. 저장된 세트가 하나도 없는 상태에서 패널을 열면 안내 문구가 보이는지 확인한다.
9. "새로 저장" 버튼이 특정 행을 고르지 않아도 항상(즐겨찾기가 1개 이상일 때) 활성 상태인지 확인한다.
