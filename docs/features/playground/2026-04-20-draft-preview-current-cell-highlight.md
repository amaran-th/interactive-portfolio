# 도안 미리보기 현재 뜰 예정 셀 강조 표시

`DraftPreview`에 `currentStitchCount` prop을 추가해, 현재 줄에서 다음에 뜰 셀을 빨간 테두리로 표시했다.

## 구현

### 셀 인덱스 계산

줄 진행 방향에 따라 강조할 열 인덱스가 달라진다.

```ts
const nextCellCol =
  ri === currentRowIndex && typeof currentStitchCount === "number"
    ? ri % 2 === 1
      ? row.length - 1 - currentStitchCount  // 홀수 줄: 우→좌
      : currentStitchCount                   // 짝수 줄: 좌→우
    : -1;
```

### 스타일 적용

Tailwind `outline-2` 단독으로는 `outline-style`이 설정되지 않아 보이지 않는다. 이미 `style` 객체가 있는 셀 div에는 inline style로 직접 지정하는 것이 더 명확하다.

```tsx
style={{
  ...(isNext ? { outline: "2px solid rgb(239 68 68)", outlineOffset: "-2px" } : {}),
}}
```

## 관련 코드
- `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/DraftPreview.tsx` — `currentStitchCount` prop 추가 및 셀 강조
- `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/PlayScreen.tsx` — 두 DraftPreview 사용처에 prop 전달
