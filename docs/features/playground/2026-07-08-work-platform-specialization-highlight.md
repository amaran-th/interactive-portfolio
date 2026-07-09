# 지원 플랫폼 중 최적화 플랫폼 강조 표시

Work 모달의 "지원 플랫폼" 배지가 지금은 모든 플랫폼을 동일하게 회색 톤으로 보여준다. Work에 따라 여러 플랫폼을 지원하더라도 특별히 그 플랫폼에 맞춰 설계된 경우(예: GoalsPassport는 모바일 중심 도구)가 있어, 이런 "최적화 플랫폼"을 여러 개까지 강조 표시할 수 있게 한다.

## 데이터 모델

`WorkItem.platforms` (`Work.tsx`)를 문자열 배열에서 객체 배열로 변경한다.

```ts
platforms?: { type: "mobile" | "pc"; specialized?: boolean }[];
```

`specialized`가 `true`인 항목이 강조 대상이며, 한 Work에 여러 개 있을 수 있다.

## 기존 Work 데이터 반영 (`data.tsx`)

- 뜨개뜨개(id 1): PC·모바일 둘 다 `specialized: true`
- 비주얼 노벨 메이커(id 2): PC만 `specialized: true`
- 굉장한 별메이커(id 3): 강조 없음
- 올해의 영수증(id 4): 모바일만 `specialized: true`

## 표시 (`WorkModal.tsx`)

- `specialized: true`인 배지: 흰 배경 + 진한(어두운) 텍스트로 강조
- 나머지: 기존 회색 톤(`border-white/10 bg-black/20`) 유지
- 별도의 "최적화" 텍스트 라벨은 추가하지 않고 색상 대비만으로 구분

## 영향 범위

- `Work.tsx` — `WorkItem.platforms` 타입 변경
- `data.tsx` — 4개 Work의 `platforms` 값 갱신
- `WorkModal.tsx` — 배지 렌더링 로직 갱신
- `.claude/commands/new-work.md` — 예시 코드의 `platforms` 필드 동기화 (CLAUDE.md 동기화 규칙)
