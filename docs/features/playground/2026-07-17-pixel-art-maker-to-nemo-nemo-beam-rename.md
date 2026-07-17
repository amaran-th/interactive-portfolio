# 픽셀아트 메이커 → 네모네모빔 리네임

"픽셀아트 메이커" Work의 이름을 "네모네모빔"으로 바꾸고, 공개 라우트도 그에 맞춰 변경했다.

## 변경 내용

- `data.tsx`의 Work 항목: `title: "픽셀아트 메이커"` → `"네모네모빔"`, `path: "/pixel-art-maker"` → `"/nemo-nemo-beam"`, `thumbnail: "/playground/pixel-art-maker.png"` → `"/playground/nemo-beam.png"`
- 서비스 페이지 `app/(services)/pixel-art-maker/page.tsx`를 `app/(services)/nemo-nemo-beam/page.tsx`로 이동, `metadata`(title·openGraph·twitter·icons)와 이미지 참조를 모두 새 이름/에셋으로 갱신
- `app/robots.ts`의 `allow` 목록 경로도 `/nemo-nemo-beam`으로 갱신
- 사용자가 새로 추가한 `nemo-beam` 이미지 에셋(png·svg)을 썸네일·OG 이미지로 연결

내부 코드(`5_PixelArtMaker/` 폴더명, 컴포넌트명 `PixelArtMaker` 등)는 이번 리네임 범위에 포함하지 않고 그대로 유지했다 — 공개 문구·라우트·에셋만 바꿨다.

## 관련 코드
- `app/(portfolio)/playground/_sections/Works/data.tsx` — Work 항목의 title·path·thumbnail
- `app/(services)/nemo-nemo-beam/page.tsx` — 리네임된 서비스 페이지(구 `pixel-art-maker/page.tsx`)
- `app/robots.ts` — `allow` 경로 목록
