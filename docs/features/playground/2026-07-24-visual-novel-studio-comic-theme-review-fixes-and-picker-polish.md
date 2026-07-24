# 비주얼 노벨 스튜디오 — 만화 테마 최종 리뷰 반영, 대비·아이콘 정리, 리소스 피커 개선

지난 세션에서 완료한 만화·낙서 테마 리디자인의 최종 전체 브랜치 리뷰 결과를 반영하고, 이어서 색상 대비·이모지 글리프·리소스 피커 UX·홈 화면 UI를 다듬었다.

## 만화 테마 최종 리뷰 반영

전체 브랜치 리뷰(Minor 4건, Critical/Important 없음, "merge 가능") 중 실제로 고칠 가치가 있는 2건을 반영했다.

- `ResourcePicker.tsx`: Thumb 안쪽 미리보기 박스가 다른 파일의 썸네일 프레임 관례(`rounded-lg`)와 다르게 맨 `rounded`를 쓰고 있던 것을 통일
- `VNDisplay.tsx`: 편집 UI 테마가 두 번(라이트모드, 만화 테마) 바뀌는 동안 이 컴포넌트만 의도적으로 손대지 않았다는 근거가 스펙·플랜 문서에만 있고 코드에는 없었다 — `"use client"` 바로 아래에 설명 주석 추가

나머지 2건(배경 칩의 미세한 픽셀아트 클리핑, CTA 모서리가 배치에 따라 다른 것)은 리뷰어가 "결함 아님"으로 직접 판단해 손대지 않았다.

## 편집 UI 텍스트 대비 감사

"색상 대비가 아쉽다"는 피드백을 받고, 만화 테마의 페이지 배경(`#818181`) 위에 직접 놓인 텍스트들의 실제 명도 대비를 WCAG 공식으로 계산했다.

- `text-gray-700`(`#374151`) on `#818181` = **2.65:1** — AA 기준(4.5:1) 크게 미달
- `text-black/70` on `#818181` = **3.83:1** — 역시 미달
- 카드(`#d9d9d9`) 위에서는 같은 `text-gray-700`이 7.3:1로 충분해서 그대로 둠

페이지 배경에 직접 놓이는 곳만 `text-black/85`(4.77:1, AA 통과)로 교체했다. `EditorScreen.tsx`의 배경·캐릭터·발화자·텍스트이펙트·음악 칩 비선택 상태와 헤더 컷 수, `PlayScreen.tsx` 헤더 부제·컷 카운터, `HomeScreen.tsx`/`VisualNovelStudio.tsx` 페이지 부제, `AssetUploader.tsx` 탭 바 비선택 상태·빈 오디오 트랙 안내문이 대상이었다. 카드 위 텍스트는 손대지 않았다.

## 이모지 → lucide 아이콘 교체

이모지 글리프는 플랫폼·브라우저에 따라 이모지 폰트로 렌더링되며 색이 섞여 나오는 문제가 있다("▶" 재생 심볼이 오렌지/화이트로 렌더링되는 현상이 이전 세션에서 이미 관찰됨). 이미 파일 전반에서 쓰고 있는 `lucide-react` 라인 아이콘으로 통일했다.

- `HomeScreen.tsx`: `▶` → `<Play />`
- `AssetUploader.tsx`: `🖼️` → `<ImageIcon />`

`←`/`→` 같은 일반 유니코드 화살표는 이모지 폰트 폴백이 없어 그대로 두었다.

## 네모네모빔 리소스 피커 — 실제 픽셀 규격 표시

리소스 피커의 썸네일이 `object-contain`으로 프레임을 항상 꽉 채우게 늘어나서, 16×16과 128×128 그림이 목록에서 똑같은 크기로 보여 실제 해상도를 구분할 수 없었다. 사용자 피드백을 여러 차례 받으며 방향을 조정한 끝에 다음으로 정리했다.

- 카드 영역(이름 아래)에 `width × height` 텍스트 라벨 — 정확한 픽셀 수는 이 라벨이 담당
- 썸네일 안쪽 이미지 전용 배경을 흰색으로 둬서 프레임 배경(`#d9d9d9`)과 구분 — 실제 그림의 경계(특히 투명 영역)가 눈에 띔
- 이미지는 높이·너비 중 하나가 박스에 꽉 차도록 원본 가로세로 비율 그대로 표시(`object-contain`) — 정사각형이 아닌 배경(16:9)·캐릭터(2:5) 리소스도 비율이 찌그러지지 않음

중간 과정에서 "그림보다 작은 캔버스는 확대하지 않고 원본 크기 그대로 보여줘 상대적 크기 차이를 드러낸다"는 접근과 투명 영역을 체커보드로 표시하는 접근을 각각 시도했지만, 둘 다 사용자 피드백으로 되돌리고 위 최종안으로 수렴했다.

## 홈 화면 슬롯 카드 — 재생 버튼 위치 이동

슬롯 번호(01/02/03)를 보여주던 왼쪽 원형 배지 자리를 재생 버튼으로 바꿨다. 액션 영역에 따로 있던 재생 버튼은 중복이라 제거했고(이제 삭제·편집 버튼만 남음), 더 이상 쓰지 않는 `index` prop을 `FilledSlotCard`에서 제거했다.

## 관련 코드
- `app/(portfolio)/playground/_sections/Works/2_VisualNovelStudio/ResourcePicker.tsx` — 썸네일 모서리 통일, 픽셀 규격 라벨·레터박스 표시
- `app/(portfolio)/playground/_sections/Works/2_VisualNovelStudio/VNDisplay.tsx` — 테마 제외 사유 주석
- `app/(portfolio)/playground/_sections/Works/2_VisualNovelStudio/EditorScreen.tsx` — 텍스트 대비 수정
- `app/(portfolio)/playground/_sections/Works/2_VisualNovelStudio/PlayScreen.tsx` — 텍스트 대비 수정
- `app/(portfolio)/playground/_sections/Works/2_VisualNovelStudio/HomeScreen.tsx` — 텍스트 대비 수정, 이모지 → 아이콘, 재생 버튼 위치 이동
- `app/(portfolio)/playground/_sections/Works/2_VisualNovelStudio/VisualNovelStudio.tsx` — 텍스트 대비 수정
- `app/(portfolio)/playground/_sections/Works/2_VisualNovelStudio/AssetUploader.tsx` — 텍스트 대비 수정, 이모지 → 아이콘
