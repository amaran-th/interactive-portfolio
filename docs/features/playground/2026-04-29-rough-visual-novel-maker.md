# 비주얼 노벨 메이커 Work 추가

플레이그라운드에 두 번째 Work로 **비주얼 노벨 메이커**를 추가했다.
캐릭터와 배경 이미지를 업로드하고, 컷마다 등장 캐릭터·발화자·대사를 설정해 간단한 비주얼 노벨을 만들 수 있는 도구다.

## 구성

- **HomeScreen** — 신규 프로젝트 시작 / 기존 세션 불러오기
- **AssetUploader** — 캐릭터(이름 + 이미지)·배경 이미지 등록
- **EditorScreen** — 컷별 배경, 등장 캐릭터, 발화자, 대사 편집
- **PlayScreen / VNDisplay** — 완성된 비주얼 노벨 재생 (클릭·키보드로 컷 전환)

## 상태 관리

- `useVNStore` — 전체 비주얼 노벨 상태(컷 목록, 자산 목록 등) 관리
- `useSlots` — 컷별 슬롯 상태 관리
- `imageStore` — 업로드된 이미지 URL 캐싱

## 라우팅

- 플레이그라운드 카드: `/playground` (WorkItem `id: 2`)
- 전체화면 서비스: `/rough-visual-novel-maker`
- `robots.ts`에 허용 경로 추가

## 관련 코드

- `app/(portfolio)/playground/_sections/Works/2_RoughVisualNovelMaker/` — 컴포넌트 및 상태 전체
- `app/(services)/rough-visual-novel-maker/page.tsx` — 서비스 전체화면 페이지
- `app/(portfolio)/playground/_sections/Works/data.tsx` — WorkItem 등록
- `app/robots.ts` — 허용 경로 추가
