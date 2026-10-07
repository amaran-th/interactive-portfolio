// 화면 위에 떠서 콘텐츠를 가리는 드롭다운·팝오버·컨텍스트 메뉴의 공통 외곽 스타일.
// 흰 배경 위에 흰 패널이 떠도 경계가 또렷하도록 1px 테두리 선을 두른다 —
// 그림자만으로는 뒷배경이 밝을 때 분간이 안 된다. 편집기 전역 관례대로
// 모서리는 각지게 둔다.
export const FLOATING_PANEL =
  "bg-white ring-1 ring-gray-300 shadow-xl shadow-gray-900/15";

// 제목이 있는 설정 패널의 헤더 스트립 — ReferenceWindow 제목표시줄과 같은 톤.
// 패널 본문과 border-b 로 나눠 "떠 있는 작은 창"으로 읽히게 한다.
export const FLOATING_PANEL_HEADER =
  "border-b border-gray-200 bg-gray-100 px-2.5 py-1.5 text-[11px] font-semibold text-gray-600";

// 모바일 팝오버처럼 좁은 영역 안에서 스크롤될 때 쓰는 컴팩트 스크롤바 —
// 기본 스크롤바는 두껍고 트랙 배경까지 있어 작은 팝오버 안에서 거슬린다.
// 트랙은 투명하게 비우고 얇은 썸만 보이게 한다.
export const COMPACT_SCROLLBAR =
  "[scrollbar-width:thin] [scrollbar-color:#d1d5db_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300";
