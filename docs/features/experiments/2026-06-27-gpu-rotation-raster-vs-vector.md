# GPU Rotation 실험 추가 — Raster vs Vector

## 개요

구글맵 회전 보정 구현 중 겪은 래스터 폴백 문제(벡터→래스터 폴백 시 heading 회전 미동작)를 재현·학습하는 인터랙티브 실험을 `(experiments)` route group에 추가했다. `pretext`와 동일한 패턴(탭 2개 + `_sections/`).

경로: `/gpu-rotation`

## 구성

### Example 1 — Rotation (`_sections/example1/`)

동일한 다크 맵 씬을 두 경로로 나란히 렌더링하고 heading 슬라이더/오토스핀으로 회전시킨다.

- `scene.ts` — mulberry32 시드 PRNG로 격자 도로·블록·강·POI 마커를 절차적으로 생성. 원점 중앙, y 아래 방향, `SCENE_HALF=600`.
- `geometry.ts` — Scene을 WebGL 타입 배열로 변환. 블록/도로는 삼각형 메시(도로는 법선으로 폭을 준 쿼드), 마커는 포인트, 라벨은 단일 텍스처 시트 + 빌보드 쿼드.
- `gl.ts` — `VectorRenderer` 클래스. 버텍스 셰이더에서 2x2 회전·스케일 행렬(`u_m`)을 정점에 곱해 회전. 스케일은 대각선 기준(`hypot(halfW,halfH)/SCENE_HALF`)이라 회전해도 모서리가 비지 않는다. 라벨은 마커 위치만 회전시키고 코너 오프셋은 회전 없이 더해 수평 유지.
- `raster.ts` — `bakeScene`으로 heading 0 비트맵을 한 번 굽고, `drawRaster`로 매 프레임 `ctx.rotate + drawImage`. 픽셀 리샘플로 흐려지고 라벨이 같이 기울어진다. 반환값은 CPU 소요 ms.
- `RotationLab.tsx` — 두 캔버스 + 단일 rAF 루프(동일 heading 보장). FPS·CPU rotate ms·JS submit ms 측정. "GPU 사용 불가 → 래스터 폴백 강제" 토글 시 벡터 패널을 북쪽 고정 + 배지 표시(실제 버그 재현).

### Example 2 — GPU & Limits (`_sections/example2/EnvLab.tsx`)

- `WEBGL_debug_renderer_info`로 실제 Vendor/Renderer, GL/GLSL 버전, Max Texture/Viewport 출력. Renderer 문자열로 소프트웨어 렌더러(SwiftShader/llvmpipe 등) 여부 판정 → 폴백 위험 경고.
- 컨텍스트 한도 데모: WebGL 컨텍스트를 누적 생성해 created/alive/lost 카운트. ~16 초과 시 alive가 멈추고 lost 증가("Too many active WebGL contexts" 재현). `WEBGL_lose_context`로 정리.

## 등록

- `app/robots.ts` — allow 목록에 `/gpu-rotation` 추가 (sitemap은 transform 제외 패턴에 없으므로 자동 포함).
- `app/(portfolio)/engineering-note/_sections/data.ts` — `gpu-rotation-raster-fallback` 엔트리를 추가했으나, 이후 노트 목록 노출은 보류하고 주석 처리함. 실험 페이지(`/gpu-rotation`)와 이 문서는 그대로 유지.

## 관련 문서

- `docs/features/gpu-rotation-blog.md` — 학습용 블로그 포스트(래스터/벡터 회전, GPU·WebGL 파이프라인, 폴백 조건).
