# 네모네모빔 편집기 UI 폴리싱 — 프레임 모드 재구성·캔버스 자유 패닝

연속된 UI 피드백을 처리한 묶음. 프레임 모드 하단 UI 재구성, 도구 옵션 바 위치, 캔버스 자유 패닝, 미리보기·브러시 표시 개선.

## 미리보기 썸네일 이음선 제거

`FileThumbnail`이 `ctx.fillRect(x * cellW, y * cellH, cellW, cellH)`에서 `cellW = displayWidth / width`(대부분 비정수)를 쓰다 보니, 이웃 칸의 `fillRect` 가장자리가 픽셀 경계에 안 떨어져 안티에일리어싱된 실선이 격자무늬처럼 보였다. `PixelCanvas`의 `cellRect`와 동일하게 각 변을 `Math.round`로 맞춰 이웃 칸이 정확히 맞닿게 했다. 레이어 패널·프레임 필름스트립·"열기" 목록이 모두 이 컴포넌트를 공유하므로 함께 개선된다.

## 브러시 굵기 시각화

숫자만 있던 버튼(`1 2 3 4`)을, 실제로 찍히는 도트 크기(`size × size`)를 그대로 정사각형으로 보여주고 그 아래 작은 숫자를 두는 형태로 바꿨다. 정사각형은 가장 큰 크기(16px) 높이의 고정 칸(`h-4`)에 넣어, 크기가 달라져도 아래 숫자의 세로 위치가 네 버튼에서 일정하다.

## 프레임 모드 재구성

**하단 필름스트립**은 "타임라인"만 담당하도록 축소했다.

- `h-24`(96px) → `h-14`(56px), 썸네일 전용
- 셀 = 썸네일 + 좌상단 번호 배지(오버레이), 숨긴 프레임은 흐림 + 눈-off 아이콘
- 맨 끝에 `+` 추가 버튼
- 활성 프레임은 얇은 violet 프레임(`p-0.5` + `bg-violet-500`) + 진한 번호 배지로 강조

**오른쪽 "프레임" 탭**(`LayerPanel`의 frames 분기)에 편집 기능을 모았다.

- 새 "현재 프레임" 섹션: `N / M` 표시 + 지속시간 입력(버퍼-커밋) + `표시 / 복제 / ◀ 이동 / ▶ 이동 / 삭제` 버튼행
- 반복·어니언 스킨: 전체폭 토글 버튼 → 스위치 UI(`ReferenceWindow`의 참고/트레이싱 토글과 동형)
- 어니언 스킨 범위(1~5장): 슬라이더 → `<select>`
- 어니언 하위 옵션(투명도·범위)은 토글 라벨 시작선에 맞춰 들여쓰고 옅은 violet 연결선을 둬서 계층을 표현
- 분기 컨테이너에 `min-h-0 overflow-y-auto` 추가 — 창이 짧아도 패널 밖으로 넘치지 않고 패널 안에서 스크롤
- 지속시간 표시: `0.10초` → `0.1초` (`formatFrameSeconds` = `String(parseFloat((ms/1000).toFixed(2)))`)

배선은 `LayerPanel`에 `onFrameDurationChange` prop 하나만 추가(`handleFrameDurationChange` 재사용). 순서 이동은 기존 `onMoveUp`/`onMoveDown`(= index ±1)을 그대로 활용.

## 도구 옵션 바 + 캔버스 자유 패닝

도구별 하위 옵션(브러시 크기·채우기·그라데이션·선택 모드)은 **캔버스 영역 하단 중앙에 뜨는 플로팅 바**(`DrawToolbar`가 `secondaryPortalTarget`으로 포털)로 유지한다. 상단 바를 두껍게 만들지도, 좌우 사이드바를 가리지도 않는다.

대신 이 바가 작업물을 잠깐 가리는 문제는 **캔버스 자유 패닝**으로 해결한다.

- `Editor`에서 `<PixelCanvas>`를 `p-[320px]` 여백 wrapper로 감쌈 → 확대하지 않아도 캔버스 사방에 스크롤 여유가 생겨 스페이스+드래그로 캔버스를 어느 방향으로든 밀 수 있다(Figma식)
- `PixelCanvas`에 스크롤 중앙 정렬 이펙트 추가 — 캔버스 크기·뷰포트 크기·배율(`width`, `height`, `fitScale`, `zoom`)이 바뀔 때마다 `scrollLeft/Top`을 `(scrollWidth - clientWidth) / 2`로 되돌려 기본 시야는 항상 캔버스가 중앙에 오게 한다
- Ctrl/Cmd+휠 확대 리스너를 `<canvas>` 자체가 아니라 스크롤 뷰포트에 붙임 — 여백 위에서 Ctrl+휠을 해도 세로 스크롤이 아니라 확대/축소

### 왜 이 방식인가

도구 옵션 바 위치는 여러 방향을 시도했다(하단 플로팅 / 상단 고정 높이 줄 / 상단 4번째 카드). 결론은 **옵션은 어딘가엔 렌더돼야 하므로 "레이아웃 비용 0 + 스크롤 없음 + 예약 공간 없음"을 동시에 만족할 수 없다**는 것. 실제 에디터도 고정 높이 옵션 막대(Photoshop·Aseprite)나 사이드 속성 패널(Figma·Krita) 중 하나의 비용을 감수한다. 여기서는 "플로팅 유지 + 캔버스를 자유롭게 밀어 피하기"를 택했다.

## 참고 — SVG 내보내기

프레임 모드에서 `SVG로 내보내기`는 `buildSvgString(doc)`이 `doc.pixels`(현재 프레임 1장)만 `<rect>`로 뽑아 **정지 SVG**를 만든다. 애니메이션 결과물은 GIF(`exportAsGIF`, 프레임별 지속시간 반영) 또는 스프라이트 시트뿐이다.

## 관련 코드

- `apps/services/components/works/5_PixelArtMaker/FileThumbnail.tsx` — 썸네일 셀 경계 반올림
- `apps/services/components/works/5_PixelArtMaker/DrawToolbar.tsx` — 브러시 굵기 시각화, 옵션 버튼 `h-8` 통일
- `apps/services/components/works/5_PixelArtMaker/FrameFilmstrip.tsx` — 썸네일 전용 타임라인
- `apps/services/components/works/5_PixelArtMaker/LayerPanel.tsx` — "현재 프레임" 섹션, 스위치·셀렉트, 지속시간 포맷
- `apps/services/components/works/5_PixelArtMaker/Editor.tsx` — 프레임 배선, 캔버스 패닝 여백, 상단 바 간격
- `apps/services/components/works/5_PixelArtMaker/PixelCanvas.tsx` — 스크롤 중앙 정렬, 휠 확대 리스너 위치
