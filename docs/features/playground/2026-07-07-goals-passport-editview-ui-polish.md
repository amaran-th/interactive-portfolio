# GoalsPassport EditView UI 폴리싱

목표 영수증(GoalsPassport) 편집 화면의 시각적 디테일 3건을 정리했다.

## 텍스트 이모지 → lucide-react 아이콘

헤더·가이드·빈 상태 등에 흩어져 있던 텍스트 이모지(🧾📖✓📈⚠️🎫)를 파일 내에서 이미 쓰고 있던 `lucide-react` 아이콘으로 교체했다.

- `Receipt` — 헤더 로고
- `BookOpen` — 사용법 안내 토글
- `Check` / `TrendingUp` — 하위 항목 유형(체크/진행률) 설명 및 `KIND_META`
- `AlertTriangle` — 인쇄 기록 관련 경고 문구
- `Ticket` — 목표 없음 빈 상태
- `FileText` / `Moon` — 영수증 스타일(기본/다크) 토글

`STYLE_OPTIONS`, `KIND_META`의 `emoji: string` 필드를 `icon: LucideIcon` 타입으로 바꾸고, 렌더링 시 `const Icon = opt.icon; <Icon />` 형태로 컴포넌트를 꺼내 쓰도록 변경했다.

## border-dashed 위계 정리

헤더/가이드/툴바/목록/푸터 경계 6곳 전부에 동일한 굵기의 점선(`border-dashed`)이 쓰여 어떤 경계가 실제 구조 경계인지 구분되지 않았다.

- **1단계 (주요 프레임 경계)**: 헤더 하단·툴바 하단·푸터 상단 → 굵은 실선(`border-2`, `#e2d3ba`)
- **2단계 (하위 구분)**: 가이드↔툴바 사이(배경색이 같아 약하게만 구분 필요) → 얇은 실선(`border`, `#ecdcc4`)
- 안내문 내부 경고 문구 위 구분선은 제거하고 간격만 유지 (경고 텍스트가 이미 색상+아이콘으로 눈에 띔)
- 빈 상태 플레이스홀더 박스의 점선만 그대로 유지 — "여기에 추가하세요" 관용 표현이라 구조 경계와는 다른 의미로 분리해서 남김

## 카테고리 input과 하위 항목 배경 분리

목표 카테고리 input과 하위 항목 컨테이너가 같은 배경색(`#faf4ea`)을 써서 단조롭고 구분이 안 됐다. 카테고리 input만 흰 배경(`bg-white`) + 테두리(`border-2 border-[#ecdcc4]`)로 바꾸고, 포커스 시 배경은 이미 흰색이라 `focus:bg-white`는 제거했다.

## 관련 코드
- `app/(portfolio)/playground/_sections/Works/4_GoalsPassport/EditView.tsx` — 아이콘 교체, border 위계 정리, 카테고리 input 스타일 변경
