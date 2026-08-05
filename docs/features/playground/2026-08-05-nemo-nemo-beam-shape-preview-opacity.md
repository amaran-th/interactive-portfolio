# 네모네모빔 도형 미리보기 불투명화

직선·사각형·원 도형 도구를 확정하기 전 미리보기가 반투명하게 렌더링되던 것을 완전 불투명으로 변경했다.

기존에는 `PixelCanvas.tsx`의 도형 미리보기 렌더링에서 `ctx.globalAlpha = 0.75`를 적용해 확정 전 도형을 흐리게 표시했다. 이 값을 제거해 미리보기 단계에서도 실제 채워질 색이 그대로 보이도록 했다. 관련해 필요 없어진 리셋용 `ctx.globalAlpha = 1` 호출도 함께 정리했다.

텍스트·이미지 배치 미리보기(`pendingText`, `pendingImage`)는 커밋 전 상태임을 시각적으로 구분하기 위한 반투명 처리를 그대로 유지했다. 이번 변경은 도형 미리보기에만 한정된다.

## 관련 코드
- `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/PixelCanvas.tsx` — 도형 미리보기 렌더링 로직
