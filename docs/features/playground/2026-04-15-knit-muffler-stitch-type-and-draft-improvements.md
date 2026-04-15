# KnitMuffler 코 종류 선택 및 도안 개선

## 코 종류(StitchType) 선택 기능

하드모드와 자유모드에서 V코 / Flower코를 선택할 수 있는 인터페이스를 추가했다.

### StitchType enum 전환

`type.ts`의 `StitchType`을 string union에서 string enum으로 변경했다.

```typescript
// 변경 전
export type StitchType = "V" | "Flower";

// 변경 후
export enum StitchType {
  V = "V",
  Flower = "Flower",
}
```

string enum을 선택한 이유: localStorage에 직렬화되는 `Stitch` 타입에 포함되므로, 값이 `"V"`/`"Flower"` 문자열로 유지되어 기존 저장 데이터와 역직렬화 호환성이 보장된다.

### 상태 및 핸들러

`useKnittingGame`에 `currentStitchType` 상태와 핸들러를 추가했다.

- `handleSelectStitchType(type)` — UI 클릭으로 특정 코 선택
- `handleToggleStitchType()` — Space 키 토글

Space 키 핸들러는 하드모드(`challenge + hard`)와 자유모드(`free`)에서만 동작한다. 이지/노멀 챌린지에서는 코 종류가 항상 V로 고정된다.

게임 시작(resetKnitting) 시 코 종류는 `StitchType.V`로 초기화된다.

### UI 배치

`PlayScreen` 하단 색상 팔레트의 왼쪽에 코 선택 카드를 배치했다. 각 버튼은 실제 `StitchBlock` 컴포넌트를 렌더링하여 현재 실 색상으로 코 모양을 미리 볼 수 있다.

## 하드모드 정확도 계산에 코 종류 포함

`useKnittingStats`에 `checkStitchType?: boolean` 옵션을 추가했다. 이 옵션이 `true`이면 정확도 계산 시 색상뿐만 아니라 코 종류도 일치해야 `correctColor`로 카운트된다.

```typescript
const colorMatch = stitch.color === target.color;
const typeMatch = !checkStitchType || stitch.type === target.type;
if (colorMatch && typeMatch) correctColor++;
```

`useKnittingGame`은 하드모드일 때만 `checkStitchType: true`를 전달한다.

## 챌린지 모드 도안 코 수 탭 필터

`ModeAccordion`에 코 수(width) 필터 탭을 추가했다. 도안 목록의 고유 width 값을 추출해 탭으로 렌더링한다.

- 현재는 모든 도안이 10수이므로 탭 하나만 표시됨
- 20수 도안이 추가되면 탭이 자동으로 생성되고 필터링 동작

## 도안 배경색 다양화

6개 도안의 배경색을 ivory(9)에서 각각 다른 색으로 변경했다.

| 도안 | 변경 배경색 | 이유 |
|------|------------|------|
| 당근 (EASY) | 1 BLUE | 하늘 배경 |
| 하트 (EASY) | 3 YELLOW | 따뜻한 배경 |
| 벌 (EASY) | 5 PINK | 꽃밭 |
| 꽃 (EASY) | 2 VIOLET | 예술적 하늘 |
| 수박 (NORMAL) | 0 WHITE | 깔끔한 배경 |
| 집 (NORMAL) | 3 YELLOW | 노을 하늘 (1=BLUE는 창문 색과 충돌) |

## 관련 코드
- `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/type.ts` — StitchType enum 정의
- `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/useKnittingGame.ts` — currentStitchType 상태, 핸들러, Space 키 처리
- `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/useKnittingStats.tsx` — checkStitchType 옵션 추가
- `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/PlayScreen.tsx` — 코 선택 UI
- `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/SelectScreen.tsx` — 챌린지 모드 코 수 탭 필터
- `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/data.ts` — 도안 배경색 변경, StitchType.V 사용
- `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/StitchBlock.tsx` — StitchType enum import
