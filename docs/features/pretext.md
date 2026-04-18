# Pretext — 렌더링 전에 텍스트 높이를 계산한다는 것

## Pretext란

`@chenglou/pretext`는 DOM 없이 텍스트의 레이아웃 결과를 계산하는 라이브러리다.
폰트 메트릭과 줄바꿈 알고리즘을 JS로 구현해, 브라우저에 요소를 그리지 않고도
특정 너비 안에서 텍스트가 몇 px 높이를 차지하는지 알 수 있다.

```js
const prepared = prepare(text, "13px Arial"); // 폰트 메트릭 분석
const { height } = layout(prepared, maxWidth, lineHeight); // 줄바꿈 계산
```

---

## 기존 방식과의 성능 비교 (Example 1)

가변 높이 카드 N개를 2열로 배치하는 상황을 기준으로 삼았다.
각 카드의 높이는 텍스트 내용에 따라 다르므로, 배치 전에 높이를 알아야 한다.

### DOM (thrashing)

가장 직관적인 방법. 아이템마다 스타일을 바꾼 뒤 `scrollHeight`를 읽는다.

```js
items.forEach((el) => {
  el.style.height = "auto"; // 레이아웃 무효화
  const h = el.scrollHeight; // 강제 Layout 발생
});
```

스타일 변경과 레이아웃 읽기가 번갈아 발생하므로, 아이템 수만큼 Layout이 강제 실행된다.
아이템이 많아질수록 Calc Time이 선형으로 증가한다.

### DOM (batched)

쓰기를 모두 끝낸 뒤 읽기를 한 번에 수행하면 강제 Layout을 1회로 줄일 수 있다.

```js
items.forEach((el) => { el.style.height = "auto"; }); // 쓰기 일괄
const heights = items.map((el) => el.scrollHeight);   // 읽기 일괄 → Layout 1회
```

thrashing 대비 Calc Time이 크게 줄어들고, 아이템 수에 비례하지도 않는다.

### Pretext

DOM을 전혀 건드리지 않고 높이를 계산한다.
강제 Layout이 없으므로 브라우저 paint Layout만 1회 발생한다.

---

### 결과를 보면

배치 계산만 두고 보면 batched DOM과 pretext의 Render Time 차이는 크지 않다.
batched가 이미 강제 Layout을 1회로 줄였기 때문이다.

그렇다면 pretext는 왜 쓰는가?

---

## pretext가 진짜 유용한 경우

pretext의 본질적인 이점은 **렌더링 이전에 높이를 알 수 있다**는 것이다.
DOM 기반 측정은 요소를 실제로 그린 뒤에야 `scrollHeight`를 읽을 수 있는 반면,
pretext는 React가 DOM에 커밋하기 전 단계에서도, 심지어 서버에서도 동일하게 동작한다.

이 특성이 결정적인 차이를 만드는 상황이 있다.

- **채팅 UI** — 새 메시지가 추가될 때 스크롤을 하단에 고정하려면,
  추가 전에 메시지 높이를 알아야 현재 스크롤 위치를 미리 보정할 수 있다.
  렌더 후 측정하면 화면이 잠깐 튀는 현상이 생긴다.

- **가상 스크롤** — 전체 아이템의 높이 합으로 스크롤 영역 크기를 결정하고,
  각 아이템의 누적 top 값으로 위치를 계산한다.
  렌더 전에 높이를 알 수 없으면, 추정값으로 배치하고 렌더 후 보정해야 한다.

- **특정 인덱스로 점프** — 가상 스크롤에서 아이템 #500으로 이동하려면
  그 위의 499개 높이 합을 알아야 scrollTop을 정확히 설정할 수 있다.

---

## 가상 스크롤에서의 차이 (Example 2)

Example 2는 "특정 인덱스 카드로 점프"하는 상황을 재현한다.

### 단순 구현의 문제

가장 직관적인 구현은 `scrollTop = index * estimatedHeight`이다.
아이템 높이를 상수(예: 50px)로 가정하고 인덱스만 곱한다.

너비가 100px일 때 실제 아이템 높이는 텍스트 길이에 따라 350–400px에 달한다.
추정값(50px)과 실제 값 사이의 누적 오차가 수십만 px에 이르기 때문에,
#2500으로 점프한다고 했을 때 실제로 도달하는 위치는 #380 부근이다.

```
scrollTop = 2500 × 50px = 125,000px   → 실제 #380 부근
scrollTop = 2500 × 375px = 937,500px  → 실제 #2500 (pretext 기준)
index delta: 2120
```

### TanStack Virtual의 보정 메커니즘

실전에서는 TanStack Virtual 같은 가상화 라이브러리를 쓰므로 상황이 달라진다.
`scrollToIndex`는 내부적으로 다음 과정을 반복한다.

1. 추정 높이 기준으로 `scrollTop` 설정 → scroll 이벤트 발생
2. 해당 위치 아이템 렌더링 → `measureElement`로 실제 높이 측정 → Layout 발생
3. 목표 아이템이 아직 뷰포트 안에 없으면 보정된 `scrollTop` 재설정 → scroll 이벤트 발생
4. 목표 아이템이 보일 때까지 반복

결과적으로 최종 위치는 올바르다. 그러나 그 과정에서 scroll 이벤트와 Layout이
여러 번 발생하며, 이 구간에 화면이 순간적으로 튀는 현상이 생긴다.

### 발생 횟수를 확인하는 방법

**Chrome DevTools Performance 탭**이 가장 직접적이다.

1. DevTools → Performance 탭 → Record 시작
2. Go 버튼 클릭 → Record 중지
3. 타임라인 확대 → DOM 모드: `Layout` 이벤트와 Scroll이 여러 번 묶여서 등장
4. Pretext 모드: Layout 1회, Scroll 1회

앱 내에서 확인하고 싶다면 점프 구간 동안 scroll 이벤트를 직접 카운팅할 수도 있다.

```js
let count = 0;
container.addEventListener("scroll", () => count++);
virtualizer.scrollToIndex(2500);
// DOM 모드: count가 3–10회, Pretext 모드: count가 1–2회
```

### Pretext 방식

렌더 전에 모든 아이템의 높이를 계산해 가상화 라이브러리에 전달한다.
`estimateSize`가 이미 정확한 값을 반환하므로 첫 번째 `scrollTop` 설정이 바로 정확하다.
보정 반복이 없으므로 scroll 이벤트와 Layout이 각 1회씩만 발생한다.

### Example 2 데모 구성

Demo에서는 TanStack Virtual의 보정 메커니즘을 배제하고,
양쪽 모두 `scrollTop`을 직접 계산해서 설정한다.

- **DOM 모드**: `scrollTop = index × (estimatedHeight + gap)` — 추정값 기반, 오차 그대로 노출
- **Pretext 모드**: `scrollTop = Σ heights[0..index-1] + index × gap` — 정확한 누적 합

이렇게 하면 보정 없이 한 번의 스크롤만으로 양쪽의 정확도 차이가 index delta로 명확하게 드러난다.
