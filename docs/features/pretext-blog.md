# DOM을 건드리지 않고 텍스트 높이를 안다는 것

`@chenglou/pretext`는 DOM 없이 텍스트의 레이아웃 결과를 계산하는 라이브러리다. 폰트 메트릭과 줄바꿈 알고리즘을 JS로 구현해, 브라우저에 요소를 그리지 않고도 특정 너비 안에서 텍스트가 몇 px 높이를 차지하는지 알 수 있다.

```js
const prepared = prepare(text, "13px Arial");
const { height } = layout(prepared, maxWidth, lineHeight);
```

어떤 상황에서 유용한지 확인하고 싶었다.

---

## DOM 기반 측정의 비용

가변 높이 카드 N개를 배치하기 위해 높이를 측정하는 상황을 보자.

가장 흔한 구현은 아이템마다 스타일을 바꾼 뒤 `scrollHeight`를 읽는 것이다.

```js
items.forEach((el) => {
  el.style.height = "auto";
  const h = el.scrollHeight; // 강제 Layout 발생
});
```

`scrollHeight`를 읽는 순간, 브라우저는 직전의 스타일 변경을 즉시 반영하기 위해 Layout 패스를 강제 실행한다. 스타일 쓰기와 레이아웃 읽기가 아이템마다 교차하므로, N개 아이템에 N번의 강제 Layout이 발생한다.

이를 쓰기와 읽기로 분리하면 Layout 횟수를 1회로 줄일 수 있다.

```js
items.forEach((el) => { el.style.height = "auto"; }); // 쓰기 일괄
const heights = items.map((el) => el.scrollHeight);   // 읽기 일괄 → Layout 1회
```

실제 측정 결과, 1000개 아이템 기준 thrashing 대비 Calc Time이 눈에 띄게 줄었다. 아이템 수에 비례하지도 않는다.

pretext의 Calc Time은 이보다 조금 더 낮지만, 단순 배치 시간만 놓고 보면 batched DOM과 큰 차이는 없다. batched DOM이 이미 강제 Layout을 1회로 줄였기 때문이다.

---

## pretext의 본질적인 이점

DOM 기반 측정은 요소를 실제로 그린 뒤에야 높이를 읽을 수 있다. pretext는 React가 DOM에 커밋하기 전에도, 서버에서도 동일하게 동작한다.

이 타이밍 차이가 유의미해지는 경우가 있다.

---

## 가상 스크롤에서의 점프

가상 스크롤은 뷰포트에 보이는 아이템만 DOM에 올린다. 각 아이템의 높이와 누적 오프셋으로 스크롤 영역 크기와 위치를 계산하므로, 렌더 전에 높이를 모르면 추정값을 쓰고 렌더 후 보정해야 한다.

### 추정값 기반

가장 단순한 점프 구현이다.

```
scrollTop = index × estimatedHeight
```

텍스트 길이가 1단어에서 100단어까지 분포하는 데이터에서, 너비 200px 기준 실제 높이는 30px에서 1000px 이상까지 분포한다. `estimatedHeight`를 50px로 가정하고 #2500으로 점프하면 실제 도달 위치는 #380 부근이다. 누적 오차가 수십만 px에 달하기 때문이다.

### TanStack Virtual의 보정

`scrollToIndex`는 내부적으로 보정 사이클을 돌린다.

1. 추정 높이 기준으로 `scrollTop` 설정
2. 해당 위치 아이템 렌더링 → `measureElement`로 실제 높이 측정
3. 목표 아이템이 뷰포트에 없으면 보정된 `scrollTop` 재설정
4. 목표 아이템이 나타날 때까지 반복

최종 위치는 정확하다. 다만 그 과정에서 scroll 이벤트와 강제 Layout이 반복 발생한다. 점프 구간 동안 scroll 이벤트를 직접 카운팅하면 DOM 방식은 3–8회, pretext 방식은 1–2회다.

### pretext 방식

렌더 전에 모든 아이템의 정확한 높이를 계산해 가상화 라이브러리에 전달한다.

```ts
const virtualizer = useVirtualizer({
  estimateSize: (index) => heights[index], // pretext로 사전 계산된 값
});
```

`estimateSize`가 이미 정확하므로 첫 번째 `scrollTop` 설정이 바로 맞는다. 보정 사이클이 없으므로 scroll 이벤트와 Layout이 각 1회씩만 발생한다.

---

## 정리

| | Layout 횟수 | 렌더 전 높이 계산 | 점프 정확도 |
|---|---|---|---|
| DOM (thrashing) | N회 | ✗ | △ |
| DOM (batched) | 1회 | ✗ | △ |
| Pretext | 0회 | ✓ | ✓ |

Layout 횟수만 줄이는 목적이라면 batched DOM으로 충분하다. 렌더 전에 높이가 필요한 경우, 가상 스크롤의 점프 정확도, 채팅 스크롤 고정 같은 상황에서는 pretext가 다른 선택지가 된다.
