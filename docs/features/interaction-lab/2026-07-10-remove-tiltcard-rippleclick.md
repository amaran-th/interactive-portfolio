# TiltCard, RippleClick 삭제

Interaction Lab에 있던 "TiltCard", "RippleClick" 두 인터랙션을 삭제했다. AI로 생성한 데모라 직접 만든 것이 아니어서 제거하고 싶다는 요청이었다.

폴더 번호가 `1_TiltCard`~`4_SlidingDoor`로 순차 부여돼 있었기 때문에, 두 항목을 단순히 지우기만 하면 `2`, `4`만 남아 번호에 구멍이 생긴다. `new-interaction` 커맨드가 기존 폴더 중 다음 번호를 판단해 새 폴더를 만드는 방식이라, 번호 순서를 유지하기 위해 남은 항목을 재정렬했다.

## 관련 코드
- `app/(portfolio)/playground/_sections/Interactions/1_TiltCard/`, `3_RippleClick/` — 폴더 전체 삭제
- `app/(portfolio)/playground/_sections/Interactions/1_HorrorButton/` — `2_HorrorButton/`에서 재번호
- `app/(portfolio)/playground/_sections/Interactions/2_SlidingDoor/` — `4_SlidingDoor/`에서 재번호, 각 컴포넌트의 `dir` 경로 문자열도 새 번호로 갱신
- `app/(portfolio)/playground/_sections/Interactions.tsx` — TiltCard·RippleClick import·사용처 제거, HorrorButton·SlidingDoor import 경로 갱신
