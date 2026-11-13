# 조명 연습실 v3 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (native).

**Goal:** 사이드바 개편, 극장 템플릿 객석, 올라서기·겹침 보정, 외부 사람 모델(남녀·자세 14종), 아이콘.

**Spec:** `docs/superpowers/specs/2026-11-13-stage-lighting-v3-design.md`

## Global Constraints

- 순수 모듈은 `import type`만(node:test). 테스트 `*.test.mts`.
- 정지 상태 렌더 0회, 큐 페이드 중 밝기만 바뀌면 그림자 갱신 0회(v2 보장 유지).
- 문구: 합니다체(guide), 해요체(UI·TOOLS.about), CLAUDE.md 글쓰기 규칙. 이모지 금지, SVG 아이콘.
- 커밋 `feat : …`, Co-Authored-By 없음, 다른 사람의 Monorism 변경 스테이징 금지, push 금지.

## Review Focus

1. v2 저장본(좌석 블록·인물 4자세) → v3: 인물 손실 없음, 객석은 템플릿으로(Task 1 테스트).
2. 템플릿 블록끼리·무대와 겹치지 않음, 모든 수치 범위 끝에서도(Task 2 테스트).
3. 계단 위로 끈 인물이 칸 높이에 서고, 회전된 소품에서도 맞음(Task 3 테스트).
4. 에셋 로드 실패·지연 시 절차적 마네킹으로 그려지고 피킹이 동작(Task 4 Playwright).
5. 패널의 숫자 칸 입력 중 단축키(Backspace 삭제 등) 무시, 끌기 중 포커스 유지(Task 6 Playwright).

### Task 1: 데이터 v3 (`show.ts`, 테스트)
Actor 필드·Pose 14종·Gender·Hair, 키 범위, `Venue = { template }`, `VenueTemplate`, `setActorGender`(키 맞춤), `duplicateEntity`, v2→v3 변환. 테스트: 기본값, 변환, 키 clamp, 복제(새 id·0.5m 옆).

### Task 2: 템플릿 배치 (`venue.ts`, 테스트)
`templateBlocks(stage, tpl)`, `defaultTemplate(shape)`, `SeatBlock.elevation`. 기존 `blockSeats` 등은 블록 입력 그대로. 테스트: 종류별 블록 수, 겹침 없음(좌석 원 간 거리 ≥ 0.5, 무대 밖), 발코니 높이, 범위 끝값.

### Task 3: 올라서기·겹침 (`placement.ts`, 테스트)
`surfaceAt`, `resolveOverlap`, `footprint`. 테스트: 단·탁자·상자 윗면, 계단 칸, 회전 90°, 기둥 제외, 겹침 밀어내기, 다른 층 무시, 실패 시 원위치.

### Task 4: 사람 모델 에셋 + 씬 (`scripts/stage-lighting-assets/`, `public/stage-lighting/`, `scene/humans.ts`, `scene/mannequin.ts` fallback)
에셋 스크립트(Playwright + three GLTFExporter)로 몸·머리·자세 glb 생성, LICENSE.md. `HumanLibrary`: 로드, 굽기 캐시(성별·자세·체형), 부위 가중치 attribute, 공유 셰이더 재질, 높이 스케일, 바운딩 박스. 씬은 로딩 전/실패 시 절차적 마네킹. Playwright: 남녀·자세 스크린샷, 정지 렌더 0.

### Task 5: 씬 통합 (`useStageScene.ts`)
인물 v3 필드, 객석 템플릿 블록, 끌기 중 y = surfaceAt, 피킹 박스. 

### Task 6: 사이드바 (`Sidebar.tsx`, `Outliner.tsx`, `fields.tsx` NumberField/Vec3Field, `Inspector.tsx` 재구성, `icons.tsx`, `Toolbar.tsx` 메뉴 아이콘, `SeatMap.tsx` 보기 전용 + 템플릿 패널, `StageLighting.tsx` 레이아웃·복제 단축키·놓을 때 겹침 보정)

### Task 7: 안내·등록·검증
guide.ts, TOOLS, privacy(what), CLAUDE.md, 전체 테스트, lint, build, Playwright 회귀(v2 항목 1–12) + v3 항목, 최종 리뷰.
