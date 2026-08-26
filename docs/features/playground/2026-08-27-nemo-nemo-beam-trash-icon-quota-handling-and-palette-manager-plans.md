# 네모네모빔 휴지통 아이콘 고도화, 저장 실패 구분, 즐겨찾기 관리 드롭다운 계획

## 휴지통 아이콘 디테일 개선

`TrashIcon.tsx`의 픽셀 그리드를 8x8 3색(외곽선·몸통·손잡이) 구조에서 32x32 컬러 픽셀 아트로 교체했다. 색상 팔레트를 `Record<number, string>` 인덱스 방식 대신 셀마다 hex 문자열(또는 `null`)을 직접 담는 방식으로 바꿔, 색상 수 제약 없이 세밀한 아이콘을 표현할 수 있게 했다.

## 저장 실패를 용량 초과와 일반 에러로 구분

`assetLibrary.ts`/`wallpaper.ts`의 저장 함수(`savePixelArt`, `saveWallpaper` 등)가 반환하던 `boolean`을 `SaveResult`("ok" | "quota" | "error") 타입으로 교체했다. `isQuotaExceededError` 헬퍼로 `DOMException`의 `name`(`QuotaExceededError`, `NS_ERROR_DOM_QUOTA_REACHED`)과 레거시 `code === 22`를 확인해 localStorage 용량 초과를 구분한다. 호출부(UI)에서 용량 초과일 때만 별도 안내 문구를 보여줄 수 있는 기반이 마련됐다.

## 즐겨찾기 관리 드롭다운 전환 계획 (미구현)

`ColorWheel.tsx`의 "즐겨찾기 관리" UI를 인라인 펼침에서 뜨는 드롭다운으로 바꾸는 작업을 3개 계획 문서로 나눠 작성했다. 실제 코드 변경은 아직 없고 계획만 작성된 상태다.

1. **드롭다운 전환 + 팔레트 미리보기** — 톱니바퀴 버튼을 트리거로 삼아 `absolute` 드롭다운을 띄우고, 세트 목록을 `<select>` 방식에서 세트마다 색상 스와치(최대 5개, 초과 시 `+N`)·이름·아이콘 3개(불러오기·덮어쓰기·삭제)를 가진 행 목록으로 바꾼다. `selectedSetId` 상태를 없애고 세 핸들러가 대상 세트를 직접 인자로 받도록 단순화한다.
2. **아이콘 교체** — 불러오기 아이콘을 `Download` → `ArrowDownToLine`, 덮어쓰기를 `Save` → `ArrowUpFromLine`으로 바꿔 두 동작의 방향성을 아이콘만으로 드러낸다.
3. **위치 계산 개선** — 패널을 `absolute`(사이드바 스크롤 영역 안)에서 `fixed`로 바꾸고, `Editor.tsx`의 `rootRef`(ContextMenu가 쓰는 것과 같은 관례)를 기준으로 남은 공간을 재서 위/아래 방향과 `maxHeight`를 계산한다. 사이드바에 불필요한 스크롤이 생기거나 패널이 편집창 밖으로 잘리는 문제를 막는다.

## 기타

- 네모네모빔 커서 파일(crosshair/default/move) 재생성 및 기본 커서 핫스팟 좌표 조정.
- 사이트 도메인이 `amaran-th-interactive-portfolio.vercel.app`에서 `amaranth-project.vercel.app`으로 바뀌어 `next-sitemap.config.js`, `docs/blog/pretext.md`를 갱신했다. `app/robots.ts`는 옛 도메인이 남아 있어 후속 확인이 필요하다.

## 관련 코드
- `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/TrashIcon.tsx` — 32x32 컬러 픽셀 아이콘
- `app/(portfolio)/playground/_sections/Works/_shared/assetLibrary.ts` — `SaveResult`, `isQuotaExceededError`
- `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/wallpaper.ts` — `saveWallpaper` 반환 타입 변경
- `docs/superpowers/plans/2026-08-12-nemo-nemo-beam-palette-manager-dropdown.md`
- `docs/superpowers/plans/2026-08-12-nemo-nemo-beam-palette-manager-icons.md`
- `docs/superpowers/plans/2026-08-12-nemo-nemo-beam-palette-manager-positioning.md`
- `next-sitemap.config.js`, `docs/blog/pretext.md` — 도메인 갱신
