# 자산 없는 비주얼 노벨 — 3-Work 생태계 설계 문서

## 개요

`비주얼 노벨 메이커`(Work #2)는 현재 캐릭터/배경 이미지와 BGM/SFX 오디오 파일을 사용자가 직접 업로드해 IndexedDB에 Blob으로 저장한다. 이 방식은 이 프로젝트의 취지(서버·외부 인프라 없이, 가벼운 데이터만으로 최대한의 가치를 뽑는다)와 맞지 않는다.

대안으로 파일 업로드 대신 **텍스트로 표현 가능한 데이터**(픽셀 그리드, 노트 시퀀스)로 자산을 만들고 재생 시점에 캔버스/Web Audio로 합성하는 방식을 도입한다. 이를 위해 서로 다른 목적을 가진 세 개의 Work가 하나의 공유 자산 라이브러리로 연결된다.

- **픽셀아트 메이커** (신규 Work) — 캐릭터/배경 픽셀아트 제작. 고유 컨셉(단순 편집기가 아닌 매력 포인트)은 별도 브레인스토밍 세션에서 다룬다.
- **비트 음악 메이커** (신규 Work) — BGM/SFX 패턴 제작. 고유 컨셉도 별도 세션에서 다룬다.
- **비주얼 노벨 메이커 v2** (기존 Work #2 개편) — 라이브러리에서 자산을 "선택"해 컷을 구성. 자체 업로드 기능은 제거.

각 메이커는 자기 목적을 위해 독립적으로도 쓸 수 있는 완결된 Work이며, 비주얼 노벨 메이커는 그 산출물을 소비하는 대상 중 하나일 뿐이다. 이 문서는 **자산 계약(데이터 형태)과 세 Work의 역할 분담**만 다룬다. 각 메이커의 고유 컨셉과 상세 UI는 이후 별도 스펙에서 확정한다.

## 공유 자산 라이브러리

Works 전역에서 공유하는 localStorage 기반 라이브러리를 둔다. 위치는 개별 Work 폴더가 아닌 공용 위치:

```
app/(portfolio)/playground/_sections/Works/_shared/assetLibrary.ts
```

```ts
type PixelArt = {
  id: string;
  name: string;
  width: number;
  height: number;
  palette: string[];   // hex 색상, 작품당 개수 제한(예: 16색 이하)
  pixels: number[];    // length = width*height, palette 인덱스, -1 = 투명
};

type BeatTrack = {
  wave: "square" | "triangle" | "noise";
  steps: (string | null)[]; // 음정(e.g. "C4") 또는 null(무음), 트랙 내 스텝 수 동일
};

type BeatPattern = {
  id: string;
  name: string;
  type: "bgm" | "sfx"; // bgm = 루프 재생, sfx = 1회 재생
  bpm: number;
  tracks: BeatTrack[];
};

type AssetLibrary = {
  pixelArt: PixelArt[];
  beatPatterns: BeatPattern[];
};
```

- 픽셀아트/음악 메이커가 "저장"하면 이 라이브러리(localStorage 키 하나)에 추가된다.
- 비주얼 노벨 메이커는 파일 선택 대신 이 라이브러리에서 골라 쓴다(썸네일/재생 미리듣기 그리드에서 선택하는 라이브러리 브라우저 UI).
- 전부 숫자/문자열 배열이므로 Blob 대비 데이터가 훨씬 가볍고, `JSON.stringify` 결과 자체가 내보내기/공유 포맷이 된다.
- 자산 삭제(픽셀아트/패턴 삭제)는 이 설계 범위에서는 다루지 않는다 — 각 메이커 세부 설계에서 정의.

## 픽셀아트 데이터 계약

- 해상도는 프리셋 중 제작자가 선택(예: 16x16 / 32x32 / 32x48). 배경은 캐릭터와 동일한 툴로 더 큰 캔버스(예: 160x90)에 그려 같은 라이브러리에 저장된다.
- 팔레트는 자유 색상(hex)이되 작품당 색상 개수를 제한한다(예: 16색 이하).
- 캐릭터 1명은 여러 표정 이미지(예: 기본/기쁨/슬픔)를 가질 수 있다 — 기존 `Character.images: CharacterImage[]` 구조를 유지하되, 각 이미지가 파일 URL 대신 `PixelArt.id` 참조로 바뀐다.

## 음악 데이터 계약

- 스텝 시퀀서(트래커) 방식: BPM + 트랙별 파형(`square`/`triangle`/`noise`) + 스텝 배열(음정 또는 무음).
- BGM(루프)과 SFX(1회 재생)를 `BeatPattern.type`으로 구분 — 기존 `AudioTrackType`("bgm"/"sfx") 구조를 그대로 승계한다.
- 재생은 Web Audio API로 그 자리에서 합성한다. 오디오 파일 저장은 전혀 없다.

## 비주얼 노벨 메이커 v2에서 바뀌는 부분

기존 파일: `app/(portfolio)/playground/_sections/Works/2_RoughVisualNovelMaker/`

- `types.ts` — `CharacterImage.imageUrl` / `Background.imageUrl` / `AudioTrack.audioUrl` → 각각 `PixelArt.id` / `BeatPattern.id` 참조로 교체
- `AssetUploader.tsx`(파일 업로드 UI) → 공유 라이브러리에서 자산을 고르는 라이브러리 브라우저 컴포넌트로 교체
- `imageStore.ts`(IndexedDB Blob 저장) — 삭제. 픽셀아트는 `assetLibrary.ts`가 대체
- `VNDisplay.tsx` / `PlayScreen.tsx` — `<img>` 렌더링 대신 픽셀아트 데이터를 캔버스에 그리는 렌더러로, 오디오 `<audio>` 태그 대신 Web Audio 합성 재생으로 교체
- 프로젝트 데이터(컷 배열 등) 자체는 참조 id들만 담으므로 지금보다 훨씬 가벼워진다

## 빌드 순서

1. 픽셀아트 메이커 (+ 공유 자산 라이브러리 `pixelArt` 부분 최초 구현)
2. 비트 음악 메이커 (+ 라이브러리 `beatPatterns` 부분 추가)
3. 비주얼 노벨 메이커 v2 개편 (라이브러리 소비 + 업로드 로직 제거)

앞의 두 Work가 먼저 존재해야 실제 자산이 라이브러리에 쌓이고, VN 메이커의 라이브러리 브라우저 UI를 실물 데이터로 검증할 수 있다.

## 범위 밖 (다음 세션)

- 픽셀아트 메이커의 고유 컨셉(단순 편집기 이상의 매력 포인트) 및 상세 UI
- 비트 음악 메이커의 고유 컨셉 및 상세 UI
- 두 메이커의 정확한 캔버스/시퀀서 편집 인터랙션, 파일 구조, 엣지 케이스
- 라이브러리 자산 삭제/이름변경/용량 초과 시 정책
