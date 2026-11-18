# 문자 인코딩 변환기: 번역기형 배치와 문자 하이라이트

문자 인코딩 변환기(`/text-encoding`)를 파파고 번역기처럼 왼쪽 입력·오른쪽 결과로 다시 배치했다.

## 배치 (`TextEncoding.tsx`)
- **공통 틀(`Translator`)**
  - 위 줄은 [왼쪽 형식 ⇄ 오른쪽 형식]이고, 아래는 한 상자를 반으로 나눈 입력·결과 칸이다.
  - 좁은 화면에서는 입력이 위, 결과가 아래로 쌓인다. 두 칸 모두 높이를 고정하고 안에서 스크롤한다.
- **방향**
  - 인코딩/디코딩 탭은 없앴다.
  - 가운데 ⇄를 누르면 방향이 바뀌고, 오른쪽 결과가 왼쪽 입력으로 옮겨 간다. 인코딩 형식은 디코딩 쪽 인코딩으로 이어진다.
- **형식 선택**
  - 인코딩: UTF-8, UTF-16, EUC-KR, ASCII, 유니코드(U+)
  - 디코딩: 앞의 네 인코딩. `U+AC00` 같은 코드포인트 입력은 '유니코드 (자동 감지)'로 표시한다.
  - 목록은 `_shared/Dropdown.tsx`의 `Select`(커스텀 listbox)로 그린다.
- **표**: 인코딩일 때 상자 아래에는 문자별 표만 둔다(인코딩별 바이트열 목록은 뺐다). 표는 남은 높이를 채우고 안에서 스크롤하며, 머리줄은 위에 붙어 있다.
- **라벨**: '바이트' → 'bytes', '진법' → '진법 표기', '글자' → '문자'로 바꿨다. 페이지 위에 '문자 인코딩 변환기' 제목을 둔다.

## 줄 고르기와 하이라이트
- 표의 줄을 누르면 그 줄이 칠해진다. 다시 누르면 풀린다.
- **입력 칸**
  - textarea는 일부만 칠할 수 없다. 그래서 같은 글을 뒤 층(`aria-hidden`)에 투명하게 그리고, 고른 문자만 `<mark>`로 칠한다.
  - 두 층은 같은 상자 규칙(`field`)을 쓰고, 스크롤은 `onScroll`로 맞춘다.
  - 고른 문자의 위치는 코드포인트 번호에서 UTF-16 인덱스로 바꿔 구한다. U+FFFF를 넘으면 두 칸이다.
- **결과 칸**
  - 결과를 문자별 조각(`outputParts`)을 띄어 이어 붙인 것으로 다룬다. 그래서 고른 문자의 조각만 칠할 수 있다.
  - 칠한 조각은 `scrollIntoView({ block: "nearest" })`로 보이게 한다.

## 드롭다운 공유
- 글자수 세기의 `Dropdown.tsx`를 `_shared/`로 옮겼다.
- `Select`에 두 속성을 추가했다.
  - `placement`(`"up" | "down"`, 기본 아래)
  - `triggerClassName`
- 글자수 세기는 화면 아래쪽이라 `placement="up"`을 쓴다.

## 관련 코드
- `apps/services/components/works/7_TextEncoding/TextEncoding.tsx` — 번역기형 배치·표·하이라이트
- `apps/services/components/works/_shared/Dropdown.tsx` — 공용 드롭다운
- `apps/services/app/text-encoding/page.tsx`, `guide.ts` — 라우트(`overflow-hidden`)·사용 안내
