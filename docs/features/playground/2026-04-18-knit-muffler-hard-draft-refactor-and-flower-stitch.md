# KnitMuffler 하드 도안 리팩터링 및 Flower 스티치 시각화

## 헬퍼 함수 추가

`data.ts`에 두 가지 단축 헬퍼 함수를 추가했다.

```ts
const v = (c: number) => ({ type: StitchType.V, color: c as Color });
const f = (c: number) => ({ type: StitchType.Flower, color: c as Color });
```

기존 `toRow()`는 V 타입 단색 행만 생성할 수 있었다. `v()`/`f()`를 도입해 혼합 타입 행을 한 줄로 표현한다.

## 전통 문양 도안 리팩터링

id:1 하드 도안(전통 문양)은 `{ type, color, slipped }` 객체를 500줄 이상 나열한 verbose 형태였다. 헬퍼 함수로 전환해 10×10 그리드를 10줄로 표현하도록 리팩터링했다.

## 하드 전용 도안 신규 작성 (id:2~5, width:10)

기존 id:2~5는 normal 도안과 동일한 데이터였다. Flower 스티치를 활용한 하드 전용 도안으로 교체했다.

| id | 이름 | 주요 특징 |
|----|------|-----------|
| 2 | 꽃밭 | green bg(7) + pink/white/yellow Flower 산포 |
| 3 | 왕관 쓴 사람 | gray Flower bg(8) + V 스티치로 인물 형태 표현 |
| 4 | 멜론과 레몬 | blue bg(1) + Flower 텍스처로 과일 표면 표현 |
| 5 | 체크무늬 | ivory Flower bg(9) + V 스티치 색상 라인 |

## 짝수 행 요소 순서 반전

왕관 쓴 사람, 멜론과 레몬, 체크무늬, 방울토마토(EASY id:5)의 짝수 번째 행(0-indexed: 1,3,5,7,9) 요소 순서를 반전했다. 실제 뜨개질은 왕복으로 진행되므로 홀수 행은 오른쪽→왼쪽 방향으로 뜨게 된다.

palindrome 행(모든 요소가 동일한 행)은 반전해도 결과가 같으므로 `toRow()`를 그대로 유지했다.

## Flower 셀 시각화

`DraftPreview.tsx`에서 `StitchType.Flower` 셀에 `rounded-full`을 조건부 적용해 원형으로 렌더링한다. `PlayScreen.tsx`의 코 종류 선택 버튼도 동일하게 처리했다.

## 관련 코드
- `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/data.ts` — 도안 데이터 및 헬퍼 함수
- `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/DraftPreview.tsx` — Flower 셀 rounded-full 렌더링
- `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/PlayScreen.tsx` — 코 종류 버튼 Flower 형태
- `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/SelectScreen.tsx` — StatBadge shrink-0 고정
