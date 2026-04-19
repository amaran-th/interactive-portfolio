# KnitMuffler 사운드 시스템 추가

실수 효과음과 배경음악을 추가하고, 사운드 on/off 토글 UI를 구현했다.

## 효과음 — fail.mp3

챌린지 모드(normal/hard)에서 코가 미끄러지는 이벤트(`stitch.slipped === true`) 발생 시 재생된다.

`useKnittingGame`이 `soundEnabled` 파라미터를 받아 재생 여부를 제어한다. 오디오 인스턴스는 마운트 시 한 번만 생성(`useRef`)하고, 재생 시 `currentTime = 0`으로 리셋해 연속 실수에도 겹치지 않게 했다.

## 배경음악 — useBackgroundMusic

`useBackgroundMusic` 훅이 배경음악 관련 상태와 로직을 캡슐화한다.

- 음원 경로(`/playground/background.mp3`)는 훅 내부 상수로 관리
- `enabled` 상태(기본값 `false`)와 `toggleSound` 함수를 반환
- on 전환 시 `currentTime = 0` 후 재생, off 전환 시 일시정지 및 리셋
- 기본값 off: 브라우저 autoplay 정책 우회, 사용자가 명시적으로 켜도록 유도

```ts
const { soundEnabled, toggleSound } = useBackgroundMusic();
```

## 사운드 토글 UI

- `SoundToggleButton` — `KnitMuffler.tsx`에 정의된 공용 아이콘 버튼 컴포넌트
- SelectScreen 좌측 상단에만 배치
- 소리가 꺼진 상태에서 팁 문구 표시: *"Tip: 소리를 키면 '잘못 뜬 코'를 좀 더 쉽게 찾을 수 있어요!"*

## 버그 수정 — 챌린지 다시하기

`handleInitialize`가 `resetKnitting`만 호출하고 `screen`을 `"play"`로 전환하지 않아, result 화면에서 다시하기 후 인게임으로 돌아가지 않던 문제를 수정했다.

```ts
setGameState((prev) =>
  prev.screen === "result" ? { ...prev, screen: "play" } : prev,
);
```

## 관련 코드
- `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/useBackgroundMusic.ts` — 배경음악 훅
- `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/KnitMuffler.tsx` — SoundToggleButton, useBackgroundMusic 호출
- `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/SelectScreen.tsx` — 토글 버튼 및 팁 문구
- `app/(portfolio)/playground/_sections/Works/1_KnitMuffler/useKnittingGame.ts` — soundEnabled 연동, handleInitialize 버그 수정
- `public/playground/background.mp3` — 배경음악 파일
- `public/playground/fail.mp3` — 실수 효과음 파일
