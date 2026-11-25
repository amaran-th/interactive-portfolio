# 같은 라우트 폴더의 icon.svg + icon.png로 인한 Turbopack 빌드 패닉

## 증상
- 서비스 앱의 Vercel 배포와 로컬 `next build`가 모두 Turbopack 내부 오류로 멈췄다(Next 16.1.6).
  - 메시지: `TurbopackInternalError: Dependency tracking is disabled so invalidation is not allowed`
  - 패닉 로그에도 원인 파일이 나오지 않는다.
- 개발 서버(`next dev`)는 정상이라 배포할 때까지 알아채지 못했다.

## 원인 좁히기
1. 개발 서버·동시 작업의 영향을 없애려고 `git worktree add --detach <dir> <sha>` → `npm ci` → `next build`로 커밋 상태를 따로 빌드했다. 깨끗한 폴더에서도 재현돼 코드 문제로 확정했다.
2. GitHub 커밋 상태(`gh api repos/<repo>/commits/<sha>/status`)에서 Vercel의 마지막 성공 커밋과 첫 실패 푸시를 찾아, 그 사이 커밋을 하나씩 빌드했다.
3. 원인 커밋 안에서 메타데이터 파일을 하나씩 지워 빌드했다. `app/voyager/icon.svg`만 지우면 통과했다. 이 폴더에는 같은 이름 규칙의 `icon.png`가 함께 있었다.
4. 다른 라우트(`app/stage-lighting/icon.svg`, `app/color-picker/icon.svg`)는 SVG 하나만 있어도 빌드가 통과했다. 원인은 SVG 자체가 아니라 **한 라우트 폴더에 `icon.svg`와 `icon.png`가 함께 있는 것**으로 본다.

## 조치
- 같은 폴더에 `icon.png`·`apple-icon.png`가 있어 SVG만 지웠다. 탭 아이콘은 PNG로 나온다.
- 한 라우트 폴더에는 `icon.*` 파일을 하나만 둔다(SVG든 PNG든).
- 루트의 `app/icon.svg`는 빌드에 문제가 없었다.

## 관련 코드
- `apps/services/app/voyager/` — `icon.png`, `apple-icon.png` (SVG 삭제)
- `apps/services/app/icon.svg` — 루트 사이트 아이콘(정상)
