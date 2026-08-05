# 네모네모빔 — 중앙 십자 보조선 추가, 그리드 off에서도 남던 격자 seam 수정

네모네모빔(`5_PixelArtMaker/`) 편집기에 그리드 on/off와 같은 방식으로 켜고 끄는 중앙 십자 보조선을 추가했다. 구현 도중 "그리드를 꺼도 격자무늬가 남는다"는 별개의 렌더링 버그가 제보돼 함께 고쳤다.

## 그리드 off에서도 남던 seam (`PixelCanvas.tsx`)

`scale`은 뷰포트 크기에 맞춘 `fitScale × zoom`이라 대부분 정수가 아닌 소수 값이다. 픽셀 한 칸을 `ctx.fillRect(x * scale, y * scale, scale, scale)`로 그리면, 이웃한 칸의 경계(`x*scale`과 `(x+1)*scale`)가 정수 픽셀에 딱 맞아떨어지지 않아 브라우저가 각 사각형 가장자리를 안티에일리어싱한다. 그 결과 칸 사이에 실선처럼 보이는 seam이 생기는데, 이건 `if (showGrid)` 블록과 무관하게 항상 그려지는 문제라 그리드를 꺼도 남아 있었다.

각 칸의 좌우/상하 경계 좌표를 미리 반올림해서, 한 칸의 오른쪽(아래) 경계가 다음 칸의 왼쪽(위) 경계와 정확히 같은 값이 되도록 하는 `cellRect(x, y, scale)` 헬퍼를 추가했다.

```ts
function cellRect(x: number, y: number, scale: number) {
  const left = Math.round(x * scale);
  const top = Math.round(y * scale);
  return {
    left,
    top,
    width: Math.round((x + 1) * scale) - left,
    height: Math.round((y + 1) * scale) - top,
  };
}
```

본문 픽셀, 선택 영역 하이라이트, 도형/그라데이션 미리보기, 텍스트 미리보기, 이미지 미리보기 — `x * scale, y * scale, scale, scale` 패턴으로 셀을 그리던 6곳 전부를 이 헬퍼로 교체했다.

## 중앙 십자 보조선 (`showCrosshair`)

그리드 토글과 같은 배선 패턴을 그대로 따랐다.

- `Editor.tsx`: `showCrosshair` 상태(기본값 꺼짐 — 그리드와 달리 가끔 정렬 잡을 때만 켜는 도구라 상시 on은 아님)
- `DrawToolbar.tsx`: "편집" 카드의 격자 버튼 옆에 `Crosshair` 아이콘 토글 버튼
- `useKeyboardShortcuts.ts`: `Shift+C` 단축키 (그리드의 `Shift+G`와 대응)
- `PixelCanvas.tsx`: `render()`에서 그리드를 그린 직후, 캔버스 중앙을 지나는 가로/세로 1px 선을 그림

십자선은 `canvasBgColor`를 자유롭게 바꿀 수 있는 캔버스 위에서 항상 보여야 해서, 고정 회색 대신 `ctx.globalCompositeOperation = "difference"` + 흰색 스트로크로 그린다. difference 블렌드는 밑바탕 색을 반전시키므로 배경이 검정이든 흰색이든 항상 대비가 생긴다(포토샵 가이드선과 같은 원리). 처음엔 `rgba(0,0,0,0.25)` 고정 회색으로 구현했는데, 검은 배경에서 안 보인다는 피드백을 받고 이 방식으로 바꿨다.

## 관련 코드
- `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/PixelCanvas.tsx` — `cellRect` 헬퍼, `showCrosshair` prop과 렌더링
- `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/Editor.tsx` — `showCrosshair` 상태, 배선
- `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/DrawToolbar.tsx` — 십자선 토글 버튼
- `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/useKeyboardShortcuts.ts` — `Shift+C` 단축키
