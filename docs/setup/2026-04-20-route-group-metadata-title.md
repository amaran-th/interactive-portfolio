# route group별 메타데이터 title template 분리

루트 layout의 `title.template`이 `%s | Interactive Portfolio`로 전체에 적용되는데, `(services)`와 `(experiments)` route group은 다른 template이 필요해 각 group에 `layout.tsx`를 추가했다.

- `(services)/layout.tsx`: `template: "%s"` — 서비스 페이지는 title 그대로 노출
- `(experiments)/layout.tsx`: `template: "%s | Engineering Experiments"` — 실험 페이지는 별도 suffix 적용

Next.js App Router는 가장 가까운 조상 layout의 `title.template`을 적용하므로, route group layout에서 override하면 해당 그룹 하위 페이지 전체에 반영된다.

## 관련 코드
- `app/(services)/layout.tsx` — services route group layout, title template `%s`
- `app/(experiments)/layout.tsx` — experiments route group layout, title template `%s | Engineering Experiments`
- `app/layout.tsx` — 루트 layout, title template `%s | Interactive Portfolio`
