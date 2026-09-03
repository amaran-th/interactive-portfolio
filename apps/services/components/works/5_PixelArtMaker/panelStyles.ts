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
