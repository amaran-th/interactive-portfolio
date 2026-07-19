# 비주얼 노벨 스튜디오 라이트모드 리디자인 — 설계 문서

## 개요

`비주얼 노벨 스튜디오`(Work #2)는 프로젝트 전역 컨벤션(`CLAUDE.md`)대로 다크 테마(`bg-gray-950`, `text-white`)로 구현돼 있다. `픽셀아트 메이커`(Work #5)가 이미 라이트모드로 재디자인된 것처럼, 이 Work도 라이트모드로 바꾼다.

이 문서는 **비주얼 재디자인 범위**만 다룬다. 기능 로직(리소스 선택, 컷 편집, 재생, 저장 등)은 이미 구현·검증이 끝났고 변경하지 않는다 — 오직 색상·테두리·모서리·폰트만 바뀐다. (`docs/superpowers/specs/2026-07-12-pixel-art-maker-retro-redesign.md`와 동일한 원칙.)

## 배경: 왜 재디자인하는가

- 프로젝트 전역 컨벤션은 다크 테마이지만, 픽셀아트 메이커가 이미 명시적 예외로 라이트모드를 쓰고 있다 — VN 스튜디오도 사용자 요청으로 같은 예외를 적용한다.
- 픽셀아트 메이커와 **동일한 톤(화이트+바이올렛)을 그대로 쓰지 않고**, VN 스튜디오만의 독자적인 라이트 톤을 브라우저 시각 동반자로 3개 후보(웜 페이퍼 / 잉크 매뉴스크립트 / 로즈 트와일라잇)를 비교해 **잉크 매뉴스크립트**로 확정했다 — "원고지에 이야기를 쓰는" 느낌의 종이 그레이 + 딥 인디고 조합.

## 1. 비주얼 시스템 — 잉크 매뉴스크립트

| 항목 | 값 |
|---|---|
| 배경 | 종이 그레이 `#f7f6f3` |
| 카드/표면 | `#ffffff` |
| 포인트 컬러 | 딥 인디고 `#2f3a8f` (활성 탭, 강조 버튼, 선택 상태) |
| 본문 텍스트 | `#1f2430` (Tailwind `gray-900`에 가까운 값 — 실제 구현 시 `text-gray-900` 사용) |
| 보조 텍스트 | `text-gray-500`/`text-gray-600` (라이트 배경 기준으로 재조정) |
| 테두리 | 얇은 헤어라인(`border-gray-200`류, 대략 `#dcdee3`) — **픽셀아트 메이커(테두리 없음, 그림자만)와 다르게 테두리를 유지**해 "원고지/문서" 느낌을 낸다 |
| 모서리 | 각짐 — 모든 `rounded-*` 클래스 제거(`rounded-none`) |
| 위험/삭제 색상 | 텍스트형 삭제 버튼: `text-red-600 hover:bg-red-50` / 확정 삭제 버튼: `bg-red-500 text-white hover:bg-red-600` — 픽셀아트 메이커의 `ConfirmDialog.tsx`가 이미 쓰는 라이트모드 위험색 패턴과 통일 |
| 폰트 | `Mona12`/`Mona12-Bold` 도트 폰트 재사용 (아래 3번 참고) |

### Tailwind 클래스 치환 방향

기존 다크 클래스를 다음으로 치환한다:
- `bg-gray-950` → `bg-[#f7f6f3]` (또는 이에 대응하는 커스텀 유틸리티/CSS 변수)
- `text-white` → `text-gray-900`
- `bg-white/5`, `bg-white/8`, `bg-white/10`(패널·카드 배경) → `bg-white` + `border border-gray-200`
- `border-white/10`, `border-white/15`, `border-white/20` → `border-gray-200`
- 활성/강조 상태(예: 배경/컷 선택됨, 탭 활성) — `bg-white text-gray-950` → `bg-[#2f3a8f] text-white`
- 발화자 선택 칩(`EditorScreen.tsx`의 `bg-blue-500`(캐릭터)·`bg-amber-500`(나레이션))은 **그대로 유지** — 이미 흰 배경에서도 충분한 대비를 가진 채도라 별도 조정이 필요 없다
- 모든 `rounded-*` 클래스 제거

## 2. 예외: 플레이 화면의 대사박스

VN 스튜디오는 라이트모드로 바뀌지만, **대사박스(speaker 이름표 + 텍스트 박스)는 예외**다. 배경·캐릭터 이미지는 사용자가 그린 임의 색상의 픽셀아트이므로, 대사박스가 라이트 톤을 따르면 밝은 배경 위에서 가독성이 떨어질 수 있다. 실제 비주얼 노벨 장르의 관례대로, 대사박스는 UI 톤과 무관하게 **반투명 어두운 스타일을 그대로 유지**한다.

- `VNDisplay.tsx`의 speaker 이름표(`bg-black/60`)와 대사 텍스트 박스(`bg-gray-900/60`/`bg-black/60`, `border-white/10`/`border-white/20`, `ring-white/5`)는 **변경하지 않는다.**
- 배경(`bg` 없을 때의 fallback 그라디언트)과 "캐릭터 없음"/"삭제된 리소스" 플레이스홀더는 라이트 톤으로 바뀐다(대사박스가 아니므로 예외 대상이 아님).
- 스테이지 영역 자체의 바탕(`bg-gray-900` — 이미지가 없을 때 보이는 컨테이너 배경)은 라이트 톤(`bg-white` 또는 `bg-[#f7f6f3]`)으로 바뀐다. 대사박스만 예외.

## 3. 폰트 공유 위치 이동

`app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/fonts.ts`(Mona 폰트 `next/font/local` 로더)를 `app/(portfolio)/playground/_sections/Works/_shared/fonts.ts`로 옮긴다. 이제 픽셀아트 메이커와 VN 스튜디오 두 Work가 같은 폰트를 쓰므로 `_shared/`가 맞는 위치다(`assetLibrary.ts`, `renderPixelArt.ts`와 같은 패턴).

- 픽셀아트 메이커 쪽의 import 경로도 새 위치로 바꾼다 — 동작 변화 없는 순수 이동.
- `next/font/local`의 `src` 상대 경로(`../../../../../../public/fonts/Mona12.ttf`)는 새 파일 위치 기준으로 다시 계산해야 한다(`_shared/`가 한 단계 얕으므로 `../../../../../public/fonts/...`).
- VN 스튜디오 최상위 셸(`VisualNovelStudio.tsx`)에서 이 폰트를 적용해 하위 화면 전체에 전파한다(픽셀아트 메이커가 `PixelArtMaker.tsx`에서 하는 것과 동일한 패턴).

## 4. 적용 범위 (파일별)

전부 순수 비주얼 리스킨 — 로직/상태/이벤트 핸들러는 변경하지 않는다.

| 파일 | 변경 내용 |
| --- | --- |
| `HomeScreen.tsx` | 슬롯 카드(빈 슬롯/채워진 슬롯), 헤더, 삭제 확인 인라인 버튼 라이트 톤 |
| `VisualNovelStudio.tsx` | Mona 폰트 적용(최상위 래퍼) |
| `AssetUploader.tsx` | 탭 바, 캐릭터/배경/사운드 폼과 카드, `InlineInput`, `AudioTrackItem` 라이트 톤 |
| `ResourcePicker.tsx` | 모달 오버레이, 탭, 썸네일 그리드 라이트 톤 (오버레이 배경 `bg-black/70`은 모달이 얹히는 반투명 스크림이므로 유지 — 모달 패널 자체만 라이트) |
| `EditorScreen.tsx` | 헤더, 컷 목록, 배경/캐릭터/발화자 선택 칩, 대사 입력창, 음악 섹션 라이트 톤 |
| `VNDisplay.tsx` | 스테이지 바탕·플레이스홀더는 라이트, **대사박스는 예외(2번 참고)** |
| `PlayScreen.tsx` | 헤더, 컷 목록 라이트 톤 (내부에서 쓰는 `VNDisplay`는 위 규칙을 그대로 따름) |

## 범위 밖

- `_shared/` 아래 다른 Work가 쓰는 컴포넌트(예: `useUnsavedChangesWarning.ts`)는 UI가 없으므로 대상 아님.
- 이번 리디자인은 VN 스튜디오 하나에 국한된다 — 사이트 다른 Work나 포트폴리오 메인 페이지는 다크 테마 그대로 유지.
- 정확한 Tailwind 클래스 목록(파일별 상세 치환)은 구현 계획(writing-plans) 단계에서 확정한다.
