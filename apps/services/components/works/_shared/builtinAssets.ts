import type { PixelArt } from "./assetLibrary";

// id는 "builtin-" 접두사로 시작한다 — 사용자 라이브러리 id(uid(), 랜덤 7자,
// 접두사 없음)와 절대 겹치지 않는다.
//
// 콘텐츠는 아직 비어 있다. 네모네모빔(픽셀아트 메이커)에서 대표 캐릭터/배경을
// 완성한 뒤 "내보내기 → JSON"으로 받은 결과를 아래 배열에 리터럴로 붙여넣으면
// 바로 반영된다. 비어 있어도 기능은 정상 동작한다(선택 화면에 "기본 제공
// 리소스 없음"으로 표시될 뿐).
export const BUILTIN_CHARACTER_IMAGES: PixelArt[] = [];

export const BUILTIN_BACKGROUNDS: PixelArt[] = [];

export function findBuiltin(id: string): PixelArt | undefined {
  return [...BUILTIN_CHARACTER_IMAGES, ...BUILTIN_BACKGROUNDS].find(
    (art) => art.id === id,
  );
}
