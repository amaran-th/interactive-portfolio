# 비주얼 노벨 스튜디오 — 이미지 업로드 제거 & 리소스 선택 방식 설계

## 배경

[`2026-07-10-vn-asset-ecosystem-design.md`](./2026-07-10-vn-asset-ecosystem-design.md)에서 정의한 "자산 없는 비주얼 노벨" 3-Work 생태계의 3단계(비주얼 노벨 메이커 v2)에 해당한다. 픽셀아트 메이커(Work #5)는 이미 구현되어 있고, 비트 음악 메이커는 아직 없다.

이번 작업 범위는 **이미지(캐릭터/배경)만** 다룬다. 오디오(BGM/SFX)는 비트 음악 메이커가 없는 상태라 기존 파일 업로드 + IndexedDB 파이프라인을 그대로 둔다.

원본 생태계 문서에는 없던 추가 요구사항: 사용자가 직접 만든 네모네모빔 리소스 외에 **기본 제공(built-in) 캐릭터/배경**도 선택지에 포함한다.

## 대상 파일

`app/(portfolio)/playground/_sections/Works/2_VisualNovelStudio/`
- `types.ts`, `AssetUploader.tsx`, `useVNStore.ts`, `imageStore.ts`, `VNDisplay.tsx`, `EditorScreen.tsx`, `VisualNovelStudio.tsx`

`app/(portfolio)/playground/_sections/Works/_shared/`
- `assetLibrary.ts`(기존), `renderPixelArt.ts`(신규), `builtinAssets.ts`(신규)

`app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/exportPixelArt.ts`(캔버스 렌더링 로직 추출)

## 데이터 모델 변경

`types.ts`:

```ts
export type CharacterImage = {
  id: string;       // VN 스튜디오 내부 식별자 (cut.characterImageIds가 참조)
  label: string;     // 표정 이름 등
  pixelArtId: string; // _shared/assetLibrary.ts PixelArt.id 또는 builtinAssets.ts의 builtin id
};

export type Background = {
  id: string;
  name: string;
  pixelArtId: string;
};
```

`imageUrl` 필드는 완전히 제거한다. 화면에 그릴 때는 `pixelArtId`를 렌더링 유틸로 해석해 얻은 값을 그때그때 쓴다(아래 3번). `AudioTrack`은 변경하지 않는다.

## 기본 제공 리소스 (`_shared/builtinAssets.ts`)

`assetLibrary.ts`가 `resolvePixelArt`에서 이 파일의 `findBuiltin`을 가져다 쓰므로(아래 참고), 순환 런타임 의존을 피하려면 여기서는 `PixelArt` 타입만 `import type`으로 가져온다:

```ts
import type { PixelArt } from "./assetLibrary";

export const BUILTIN_CHARACTER_IMAGES: PixelArt[] = [
  // id는 "builtin-" 접두사로 시작 — 사용자 라이브러리(uid() 랜덤 7자)와 충돌 불가능
];

export const BUILTIN_BACKGROUNDS: PixelArt[] = [];

export function findBuiltin(id: string): PixelArt | undefined {
  return [...BUILTIN_CHARACTER_IMAGES, ...BUILTIN_BACKGROUNDS].find(
    (a) => a.id === id,
  );
}
```

콘텐츠는 이 세션 범위 밖이다. 네모네모빔에서 대표 캐릭터/배경을 완성한 뒤 "JSON으로 내보내기"한 결과를 위 배열에 리터럴로 붙여넣는 방식으로 채운다(작업 순서는 구현 계획에서 별도 안내). 처음엔 빈 배열이어도 기능은 정상 동작해야 한다(피커에 "기본 제공 리소스 없음" 상태만 보임).

## 리소스 조회 (`_shared/assetLibrary.ts`에 추가)

```ts
export function resolvePixelArt(id: string): PixelArt | undefined {
  return getPixelArt(id) ?? findBuiltin(id);
}
```

라이브러리(사용자 저장분)를 먼저 찾고 없으면 builtin에서 찾는다. 두 곳 모두 없으면 `undefined` — 삭제된 리소스 케이스(7번 참고).

## 공유 렌더링 유틸 (`_shared/renderPixelArt.ts`, 신규)

`5_PixelArtMaker/exportPixelArt.ts`의 `renderToCanvas`를 이 파일로 옮기고, PixelArtMaker 쪽은 여기서 import해 쓰도록 바꾼다.

```ts
export function renderToCanvas(doc: PixelArt, scale: number): HTMLCanvasElement;
export function pixelArtToObjectUrl(doc: PixelArt, scale?: number): Promise<string>;
```

`pixelArtToObjectUrl`은 `canvas.toBlob` + `URL.createObjectURL`로 blob URL을 만든다(거대한 base64 data URL 대신 — 기존 IndexedDB blob URL 패턴과 동일한 메모리 특성 유지). 캔버스 렌더링 자체는 동기(sync)이므로 IndexedDB 비동기 조회보다 단순하다.

## 피커 UI (`AssetPicker.tsx` — `AssetUploader.tsx` 대체)

- 캐릭터 "표정 이미지 추가"와 배경 등록 모두 동일한 피커를 연다.
- 피커는 "기본 제공" / "네모네모빔 리소스" 두 탭의 썸네일 그리드. 각 탭은 `resolvePixelArt`가 참조하는 두 소스(builtin 배열, `listPixelArt()`)를 각각 렌더링.
- 네모네모빔 라이브러리가 비어 있으면 빈 상태 안내("네모네모빔에서 만든 그림이 없어요" 등).
- 기존 배경 권장 비율(16:9) / 캐릭터 권장 비율(2:5) 안내 문구는 피커 상단에 유지하되 강제하지 않는다(픽셀아트 메이커는 캔버스 크기를 자유롭게 만들 수 있으므로).
- 파일 업로드 관련 코드(`DropImageArea`, `handleDrop`, `input[type=file]`)는 캐릭터/배경 쪽에서 전부 제거. 오디오 탭의 업로드는 그대로 둔다.

## `useVNStore.ts` 변경

- `addCharacterImage(charId, label, file: File)` → `addCharacterImage(charId, label, pixelArtId: string)`. `saveBlob` 호출 제거.
- `addBackground(name, file: File)` → `addBackground(name, pixelArtId: string)`. 동일하게 `saveBlob` 제거.
- 마운트 시 이미지 blob 복원 로직(`loadBlobUrls(imageIds)` 관련 부분)을 제거 — 오디오 id 복원(`loadBlobUrls(audioIds)`)만 남는다.
- `removeCharacterImage`/`removeCharacter`/`removeBackground`에서 이미지 관련 `URL.revokeObjectURL`/`deleteBlob` 호출 제거(오디오 관련은 유지).

`imageStore.ts`는 삭제하지 않고 그대로 둔다 — 오디오 blob 저장에 계속 쓰인다. DB/스토어 이름(`vn-studio-images`)이 이제 오디오만 가리키는 건 이번 범위에서 리네이밍하지 않는다(기존 저장된 슬롯의 오디오 데이터를 깨뜨리지 않기 위해).

## 렌더링 소비처 변경 (`VNDisplay.tsx`, `EditorScreen.tsx`)

`<img src={bg.imageUrl}>` / `<img src={getCharImage(char.id).imageUrl}>` 자리를, `pixelArtId`를 받아 `resolvePixelArt` + `pixelArtToObjectUrl`로 해석한 URL을 쓰는 방식으로 바꾼다. 같은 `pixelArtId`가 여러 곳(여러 컷, 좌/우 동시 등장 등)에서 쓰일 수 있으므로, 컴포넌트 트리 상위(예: `VNMakerWithSlot` 또는 `useVNStore` 반환값)에서 `pixelArtId → objectUrl` 캐시(`Map`)를 두고 재사용한다. 캐시 무효화는 이번 범위에서 다루지 않는다(같은 세션 내에서 builtin/라이브러리 내용이 안 바뀐다고 가정).

## 저장 버전 / 마이그레이션

`useVNStore.ts`의 `STORAGE_VERSION`을 4 → 5로 올린다. `loadMeta`의 기존 `version < 3` 폐기 조건을 `version < 5`로 바꿔, 구버전 슬롯은 지금과 동일한 방식(그냥 폐기, 빈 상태로 시작)으로 처리한다.

**영향**: 기존에 로컬에 저장돼 있던 VN 스튜디오 슬롯의 캐릭터/배경/컷 데이터가 전부 리셋된다(사용자 확인 완료 — 개인 포트폴리오 데모 데이터라 문제 없음).

## 참조 끊김 처리

`resolvePixelArt(pixelArtId)`가 `undefined`를 반환하는 경우(네모네모빔에서 원본 삭제됨):
- 피커 그리드: 이런 항목은 애초에 목록에 없으므로 해당 없음.
- 이미 캐릭터/배경에 연결된 상태에서 원본이 삭제된 경우: `VNDisplay`/`EditorScreen`에서 깨진 이미지 대신 플레이스홀더(예: 점선 테두리 박스 + "삭제된 리소스" 텍스트)를 보여준다. 크래시 없이 렌더링만 스킵.

## 범위 밖

- 오디오(BGM/SFX)를 비트 음악 메이커 자산으로 옮기는 작업 — 비트 음악 메이커가 아직 없음.
- 기본 제공 캐릭터/배경의 실제 콘텐츠 제작.
- 피커 검색/필터, 리소스 정렬 등 UX 세부사항 — 구현 계획에서 필요시 확정.
