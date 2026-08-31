# 네모네모빔 데스크탑 아이콘 창 크기 연동 확대

네모네모빔의 데스크탑은 배경화면 이미지 비율에 맞춰 뷰포트를 채우며 커진다(`Desktop.tsx`의 `fittedSize`). 그런데 아이콘 박스(`w-20`, 80px), 썸네일 캔버스(48px), 그리드 간격(`GRID_STEP` 96px), 라벨(`text-[10px]`)이 모두 고정값이라, 큰 모니터에서는 배경만 커지고 아이콘은 그대로여서 상대적으로 작아 보였다.

## 접근

배경화면 컨테이너 폭에 비례하는 배율 `scale`을 구해 아이콘 관련 크기에 일괄로 곱한다. 그리드 간격도 같은 배율로 커지므로 아이콘이 옆 칸을 침범하지 않고, 배치가 통째로 확대·축소된다.

- `scale = clamp(desktopWidth / BASE_DESKTOP_WIDTH, MIN_ICON_SCALE, MAX_ICON_SCALE)`
- 기준값: `BASE_DESKTOP_WIDTH = 1280`, `MIN = 1.0`, `MAX = 1.6`
- 폭 1280px 이하면 배율 1.0 — 일반 노트북 뷰포트에서는 기존과 동일하게 보인다.

## 좌표 모델

아이콘 위치(`positions`)와 `useDesktopLayout`의 저장값은 **기준(배율 1.0) 픽셀 좌표**로 통일했다.

- 화면에 그릴 때: `기준좌표 * scale`
- 화면 좌표를 저장값으로 되돌릴 때(드래그 이동량, 박스 선택 히트박스, "정리하기"): `화면좌표 / scale`

모든 위치가 이미 `GRID_STEP` 격자에 스냅되므로 격자칸(col, row) 저장과 결과가 같고, 기존 `localStorage`(`pixel-art-desktop-layout`) 값이 그대로 호환되어 마이그레이션이 필요 없다.

## 시각 크기

- **일반 아이콘**(`DesktopIcon`): `scale` prop을 받아 박스 폭·패딩·간격·글자 크기를 인라인 스타일로 곱하고, 픽셀아트 캔버스는 내부 해상도를 `48 * scale`로 키워 다시 렌더한다(transform 확대는 픽셀아트가 뭉개짐).
- **특수 아이콘 4종**(휴지통·포맷·배경화면·편집기): SVG라 `transform: scale()` + `transform-origin: top left`로 확대한다(벡터라 손실 없음). 저장 위치가 없을 때의 기본 코너 배치는 `defaultSpecialCorner`의 기준 좌표 결과에 `scale`을 곱해, "정리하기"가 가정하는 좌표와 일치시킨다.

## 알려진 제약 (이번 범위 밖)

"정리하기"(`cleanUpLayout`)가 맨 아랫줄 아이콘을 컨테이너 경계에 붙여 스냅해 라벨이 잘린다. `main`에서도 동일하게 발생하는 기존 문제이며(`maxRow` 계산이 아이콘 높이를 빼지 않음), 이번 확대로 라벨이 커지면서 더 눈에 띈다.

## 관련 코드

- `apps/services/components/works/5_PixelArtMaker/iconMetrics.ts` — 배율 계산 함수 `getIconScale`와 아이콘 기준 크기 상수
- `apps/services/components/works/5_PixelArtMaker/Desktop.tsx` — `scale` 계산·전파, 드래그/박스선택/정리하기 좌표 변환, 특수 아이콘 transform 확대
- `apps/services/components/works/5_PixelArtMaker/DesktopIcon.tsx` — `scale` prop, 캔버스 재렌더 해상도·박스·글자 인라인 사이징
- `apps/services/components/works/5_PixelArtMaker/useDesktopLayout.ts` — 좌표가 기준 단위임을 명시(로직 변경 없음)
