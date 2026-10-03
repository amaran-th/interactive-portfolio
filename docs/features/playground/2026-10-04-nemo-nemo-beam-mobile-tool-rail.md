# 네모네모빔 모바일 도구 세로 열 재설계

모바일 편집기의 도구 선택 UI를 하단 독 "도구" 탭 팝오버에서, 캔버스
왼쪽에 항상 보이는 세로 아이콘 열로 바꿨다. 도구 전환마다 팝오버를
여닫을 필요 없이 탭 한 번으로 바뀌는 드로잉 앱(ibisPaint·미디방페인트
등) 관례를 따른다.

## 구조

- **세로 도구 열**(`MobileToolRail.tsx`): 연필·지우개·채우기·선택·
  올가미·이동·자동 선택 7개 아이콘 + 맨 아래 "+"(직선·사각형·원·텍스트·
  그라데이션 5개 더보기).
- **옵션 플라이아웃**: 이미 활성인 도구를 한 번 더 탭하면 그 도구의
  하위 옵션(브러시 크기·채우기 모드·선택 모드 등)이 도구 열 오른쪽에
  펼쳐진다. 처음 도구를 고르는 탭만으로는 옵션이 자동으로 열리지
  않는다 — 옵션 패널이 캔버스 일부를 가리므로, 막 바꾼 도구로 그리려는
  자리를 바로 덮지 않기 위함.
- **"+" 목록**: 열어도 안 닫히고, 그 안에서 다른 도구를 고르면 선택만
  바뀌고 목록은 계속 떠 있는다(여러 도구를 번갈아 써보기 편하도록).
  "+"를 다시 누르면(열든 닫든) 열려 있던 옵션 패널은 항상 같이 닫는다 —
  기본 도구 옵션과 "+" 목록이 같은 자리에 뜨는 구조라 안 닫으면 겹친다.
- 하단 독은 "도구" 탭이 빠지고 색상/레이어/더보기 3개로 줄었다.

## 캔버스를 밀어내는 구조 (오버레이에서 전환)

처음엔 도구 열을 캔버스 위에 떠 있는 오버레이로 구현했다. 반투명하게
하거나 드래그로 옮기는 안도 검토했지만, 둘 다 "그 자리가 안 보인다"는
문제만 다룰 뿐 "그 자리를 탭해서 그릴 수 없다"는 진짜 문제는 풀지
못한다 — 오버레이인 이상 입력 자체를 막기 때문이다. 결국 Procreate·
ibisPaint처럼 도구 열이 **실제 레이아웃 폭을 차지해 캔버스를 밀어내는**
구조로 바꿨다.

- `MobileEditorShell.tsx`가 캔버스 옆에 레이아웃 칸(`railSlotRef`)을
  마련하고, 그 DOM 노드를 콜백 ref로 `Editor.tsx`에 올려보낸다
  (`onRailSlotMount` → `mobileRailSlot` state).
- `Editor.tsx`는 그 노드를 `DrawToolbar`에 `railSlot`으로 내려주고,
  `DrawToolbar`는 그대로 `MobileToolRail`에 전달한다.
- `MobileToolRail`은 도구 아이콘 부분만 `createPortal`로 그 칸에 그려
  넣어 실제 폭을 차지하게 하고, "+" 목록·옵션 패널은 반대로(열고 닫을
  때마다 캔버스가 추가로 밀리면 안 되므로) 캔버스 래퍼 안에서 오버레이로
  띄운다.
- 이 패턴은 데스크탑이 도구 하위 옵션을 캔버스 하단에 포털로 그려 넣을
  때 이미 쓰던 `secondaryToolbarPortal`(자식이 그린 DOM 노드를 상태로
  올려 받아 다음 렌더에 내려주는 패턴)을 그대로 재사용한 것이다.

## 옵션 패널 폭 — `w-max`/`max-width` 조합의 함정

올가미·선택·마법봉의 옵션 패널이 실제 필요한 폭보다 훨씬 넓게 렌더되며
줄마다 빈 여백이 남는 문제가 있었다.

`width: max-content`(Tailwind `w-max`)는 "줄바꿈 없이 한 줄로 쭉
늘어놓았을 때의 폭"을 기준으로 계산된다. 그 값이 `max-width` 상한을
넘으면 패널은 **상한값 그대로** 렌더링되고, 그 안에서 `flex-wrap`으로
줄바꿈된 각 줄은 실제 필요한 폭보다 훨씬 좁은데도 패널 자체 폭은 줄지
않아 여백이 남는다. `width: min-content`(가장 넓은 단일 flex item
기준)로 바꾸면 반대로 거의 모든 묶음이 한 줄에 하나씩만 들어가 지나치게
세로로 길어진다.

해결: 실측 기반 고정 폭(`220px`)을 직접 골라, 작은 버튼 묶음 2~3개는
한 줄에 같이 들어가고 가장 넓은 덩어리("전역 동일색" 토글 줄)만 자기
줄을 쓰도록 했다. 섹션이 여러 개인 도구(마법봉 = "선택 옵션" + "대상
레이어" 2개 섹션)는 데스크탑처럼 섹션마다 따로 흰 패널로 나누지 않고
패널 하나(`mobileOptionsNode`)에 세로로 모았다 — 섹션별 옵션 계산
자체(`secondarySections`, 어떤 도구가 어떤 옵션을 갖는지)는 데스크탑과
완전히 공유하고, 감싸는 모양(패널을 몇 개로 나눌지)만 모바일 전용으로
분리했다.

## 색상 탭 스와치

하단 독 "색상" 탭 아이콘을 범용 팔레트 모양 대신, 지금 활성 색상으로
채워진 작은 원으로 바꿨다 — 다른 드로잉 앱들처럼 탭을 열지 않아도
지금 쓰는 색을 한눈에 볼 수 있다.

## 관련 코드

- `apps/services/components/works/5_PixelArtMaker/MobileToolRail.tsx` — 세로 도구 열 + 옵션/"+" 플라이아웃 본체(신규)
- `apps/services/components/works/5_PixelArtMaker/DrawToolbar.tsx` — `mobileLayout` 분기를 `MobileToolRail`로 위임, `mobileOptionsNode`
- `apps/services/components/works/5_PixelArtMaker/MobileEditorShell.tsx` — `railSlot` 레이아웃 칸, 색상 탭 스와치, 하단 독 3탭 축소
- `apps/services/components/works/5_PixelArtMaker/Editor.tsx` — `mobileRailSlot` 상태, `DrawToolbar`/`MobileEditorShell`에 prop 연결
- `docs/superpowers/specs/2026-10-01-nemo-nemo-beam-mobile-tool-rail-design.md` — 설계 스펙
- `docs/superpowers/plans/2026-10-01-nemo-nemo-beam-mobile-tool-rail.md` — 구현 플랜
