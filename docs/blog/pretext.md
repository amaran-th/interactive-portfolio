# Pretext: DOM 없이 텍스트 높이를 측정하는 새로운 방법

## 서론

오늘은 최근 화제가 되었던 Pretext 라이브러리에 대해 알아보고자 한다.

---

## Pretext란

[GitHub: chenglou/pretext](https://github.com/chenglou/pretext)

> **DOM 접근 없이 Canvas API를 활용해 멀티라인 텍스트의 높이와 레이아웃을 계산하는 고속 순수 자바스크립트/타입스크립트 라이브러리**

메타 출신 개발자 Cheng Lou가 2026년 3월 말에 공개했다. 레이아웃 리플로우(Reflow)를 방지하여 기존 방식보다 최대 100배~500배 빠른 성능으로 텍스트 측정을 구현, UI 성능을 극적으로 개선한다.

### 기존의 텍스트 레이아웃 계산 방식이 갖고 있던 한계

웹에서 텍스트가 여러 줄로 표시될 때, 그 높이를 미리 알아내는 일은 생각보다 까다롭다. 지금까지 주로 사용해온 방법은 DOM에 엘리먼트를 렌더링한 뒤 `scrollHeight`나 `getBoundingClientRect()`로 실제 높이를 읽어오는 방식이다.

문제는 이 방법이 **레이아웃 리플로우(Layout Reflow)** 를 유발한다는 점이다. 브라우저는 레이아웃 관련 CSS 속성이 변경되면 내부적으로 레이아웃을 "무효화"하는데, 이 상태에서 `scrollHeight` 같은 값을 읽으려 하면 브라우저는 최신 값을 돌려주기 위해 레이아웃을 즉시 강제로 재계산한다. 이 과정이 바로 리플로우다.

특히 여러 아이템의 높이를 한꺼번에 측정해야 하는 상황에서, 쓰기(write)와 읽기(read)를 아이템마다 번갈아 수행하면 **레이아웃 스래싱(Layout Thrashing)** 이 발생한다.

레이아웃 스래싱이란, DOM의 스타일을 변경(쓰기)하자마자 레이아웃 관련 속성을 읽는 행위를 반복할 때 발생하는 현상이다. 브라우저는 성능을 위해 스타일 변경을 일괄로 모아두었다가 한 번에 처리하려 하는데, 읽기 연산이 끼어들면 "지금 당장 최신 레이아웃을 계산해야 한다"는 강제 재계산이 매번 트리거된다. 결과적으로 쓰기-읽기 쌍의 횟수만큼 리플로우가 연속으로 발생한다.

```js
// 아이템마다 쓰기 → 읽기를 반복 → N번 reflow
items.map((el) => {
  el.style.height = "auto";  // write: 레이아웃 무효화
  return el.scrollHeight;    // read: 강제 reflow 발생
});
```

1,000개의 아이템을 측정하면 1,000번의 리플로우가 발생한다. 리플로우는 JavaScript 실행을 일시 중단하고 브라우저의 메인 스레드를 점유하는 무거운 작업이기 때문에, 이 방식은 성능에 치명적이다.

### Pretext의 원리와 특징

- **DOM 없는 텍스트 측정:** `getBoundingClientRect` 대신 HTML Canvas의 `measureText`를 사용하여, 브라우저가 레이아웃을 다시 계산하는 무거운 작업을 완전히 피한다.
- **초고속 성능:** 계산 과정에서 레이아웃 리플로우를 유발하지 않아, 복잡한 애니메이션이나 실시간 텍스트 렌더링 상황에서도 프레임 드롭 없이 동작한다.
- **픽셀 단위 정밀도:** 폰트 엔진 기반의 자체 측정 로직을 통해 텍스트 줄바꿈과 배치(Layout)를 정확하게 계산한다.
- **가벼운 라이브러리:** 별도의 브라우저 환경 없이 서버 측 렌더링도 지원하는 가벼운 라이브러리이다.

API는 두 단계로 구성된다. 먼저 `prepare()`로 텍스트의 폰트 메트릭을 계산해두고, 이후 `layout()`으로 특정 너비에서의 높이를 계산한다. 텍스트가 바뀔 때는 `prepare()`를 다시 실행하고, 너비만 바뀔 때는 `layout()`만 다시 호출하면 된다. 비용이 큰 연산과 가벼운 연산을 분리함으로써 불필요한 재계산을 최소화할 수 있다.

---

## Pretext가 왜 좋을까?

Pretext의 성능을 기존 방식과 비교하고 측정할 수 있는 두 개의 예제를 마련했다. 구축한 테스트 환경을 배포해두었으니, 원한다면 [이 페이지](https://amaran-th-interactive-portfolio.vercel.app/pretext)에서 직접 테스트해볼 수도 있다.

### Case 1. 동적 너비에 따른 텍스트 별 높이 재계산

너비 슬라이더를 움직일 때마다 1,000개 텍스트 아이템 각각의 높이를 재계산하고 2열 레이아웃으로 배치하는 예제다. 직관적인 DOM 방식, batching 기법으로 최적화한 DOM 방식, 그리고 Pretext를 사용한 방식 세 가지를 비교한다.

#### DOM (thrashing)

```js
const heights = refs.current.map((el) => {
  if (!el) return 0;
  el.style.height = "auto";  // write: 레이아웃 무효화
  return el.scrollHeight;    // read: 강제 reflow 발생
});

// 측정 후 각 아이템에 높이·위치를 일괄 적용
refs.current.forEach((el, i) => {
  el.style.height = heights[i] + "px";
  el.style.left = ...;
  el.style.top = ...;
});
containerRef.current.style.height = totalHeight + "px";
```

아이템마다 `height: auto`(쓰기)와 `scrollHeight`(읽기)를 교대로 수행하여 N번의 동기 리플로우가 발생한다. 이후 각 아이템의 위치와 컨테이너 높이를 일괄 쓰기하면, 브라우저는 다음 페인트 직전에 이 변경 사항을 한 번 더 반영해야 한다. 이 최종 레이아웃 패스가 1번의 리플로우를 추가로 발생시킨다.

결국 1,000개 아이템 기준 총 리플로우 횟수는 N(측정 루프) + 1(최종 배치 반영) = **1,001회**가 된다.

#### DOM (batched)

```js
// 1. 쓰기 일괄 처리 → 레이아웃 무효화 1회
refs.current.forEach((el) => {
  if (el) el.style.height = "auto";
});

// 2. 읽기 일괄 처리 → reflow 1회로 모든 높이 측정
const heights = refs.current.map((el) => (el ? el.scrollHeight : 0));

// 3. 위치 배치 (쓰기만, reflow 없음)
refs.current.forEach((el, i) => { /* height, left, top 적용 */ });
containerRef.current.style.height = totalHeight + "px";
```

Batching이란 쓰기 연산을 한 번에 몰아서 처리한 뒤, 읽기 연산을 한 번에 몰아서 처리하는 기법이다. 브라우저는 여러 개의 쓰기 연산을 한 덩어리로 받아도 레이아웃을 한 번만 무효화한다. 이 무효화된 상태에서 읽기 연산을 한 번에 몰아서 수행하면, 브라우저가 단 1회의 리플로우로 모든 값을 계산해 반환한다.

이후 측정 결과를 바탕으로 아이템 위치를 다시 쓰기하면 페인트 직전 1번의 최종 리플로우가 발생한다. 총 리플로우 횟수는 1(읽기 시 강제 재계산) + 1(최종 배치 반영) = **2회**. 코드 구조를 쓰기 블록과 읽기 블록으로 명확히 분리하는 것만으로, 1,001번이던 리플로우를 2회로 줄일 수 있다.

#### Pretext

```js
// 1단계: 텍스트가 바뀔 때만 — 폰트 메트릭 계산 (DOM 접근 없음)
const preparedTexts = useMemo(
  () => texts.map((text) => prepare(text, FONT, { whiteSpace: "pre-wrap" })),
  [texts]
);

// 2단계: 너비가 바뀔 때만 — 줄바꿈 계산 (DOM 접근 없음)
const layoutData = useMemo(() => {
  return preparedTexts.map((prepared, i) => {
    const textHeight = layout(prepared, contentWidth, LINE_HEIGHT).height;
    // height, top, left 계산 ...
  });
}, [preparedTexts, width]);
```

`prepare()`는 텍스트의 각 문자별 폰트 메트릭(글자 너비, 어센더/디센더 등)을 Canvas API로 미리 계산해 캐싱한다. `layout()`은 이 캐싱된 메트릭을 바탕으로 주어진 너비에서의 줄바꿈 위치와 총 높이를 순수 JavaScript 연산으로 계산한다. DOM에 전혀 접근하지 않으므로 측정 과정의 리플로우는 0회다. 최종적으로 계산된 값을 DOM에 한 번 적용할 때 발생하는 페인트 직전 리플로우 1회만 남는다. 총 리플로우 횟수는 **1회**.

두 연산을 별도의 `useMemo`로 분리한 점도 주목할 만하다. 텍스트 목록이 바뀌지 않고 너비만 변경되는 경우, 비용이 큰 `prepare()` 단계는 건너뛰고 `layout()`만 재실행된다. 너비 슬라이더를 드래그할 때마다 폰트 메트릭을 처음부터 다시 계산하지 않아도 된다는 뜻이다.

**비교 결과:** 1,000개 아이템 기준으로 Calc Time이 DOM (thrashing)은 수십 ms, DOM (batched)는 수 ms, Pretext는 1ms 내외를 기록한다. 슬라이더를 빠르게 드래그하면 DOM (thrashing)에서는 화면이 버벅이는 현상이 뚜렷하게 나타나고, Pretext에서는 60FPS에 근접하는 부드러운 업데이트가 유지된다.

**시사점:** Batching은 강력하다. 별도 라이브러리 없이 코드 구조만 바꿔서 1,001번의 리플로우를 2번으로 줄인다. 그러나 Batching이 줄이는 것은 "불필요한 리플로우"이고, 남기는 것은 "측정을 위해 반드시 필요한 리플로우"다. 너비가 바뀔 때마다 DOM을 읽어야 실제 높이를 알 수 있다는 구조는, 측정 수단이 DOM인 이상 바꿀 수 없다. Pretext는 측정 자체를 DOM 밖으로 꺼내어, 이 구조적 제약을 없앤다.

여기서 자연스럽게 이런 질문이 생긴다. "수 ms와 1ms 차이라면, 실제로 체감할 수 있을까? Batching으로 충분한 거 아닌가?" 정적인 레이아웃이라면 맞다. Batching으로도 충분하다. 그러나 너비가 마우스 드래그에 따라 매 프레임 변하는 경우를 생각해보자. 60FPS 기준 한 프레임의 예산은 16.6ms다. DOM (batched)의 Calc Time이 5ms라면, 측정만으로 프레임 예산의 30%가 사라진다. Pretext의 1ms라면 6%다. 남은 예산으로 React 렌더링, 페인트, 기타 JS 작업을 모두 처리해야 하는 상황에서, 이 차이는 프레임 드롭의 유무로 이어질 수 있다. 또한 Batching을 쓰더라도 측정 비용은 아이템 수에 비례해 증가한다. 아이템이 5,000개, 10,000개로 늘어나면 DOM (batched)의 Calc Time도 함께 늘어나지만, Pretext의 `layout()` 비용 증가폭은 상대적으로 작다.

### Case 2. UX 지표 비교(CLS, Scroll 안정성): 가상 스크롤 구현

3,000개의 가변 높이 아이템으로 구성된 목록에서 특정 인덱스로 즉시 점프하는 예제다. 높이를 사전에 알지 못하면 스크롤 위치 계산이 부정확해지므로, 텍스트 높이 측정 방식이 UX에 직접 영향을 준다. 세 가지 방식 모두 외부 가상 스크롤 라이브러리 없이 직접 구현한 가운데, 두 번째 방식만 `@tanstack/react-virtual`을 사용한다.

#### Native

```js
// ResizeObserver로 화면에 보이는 아이템의 실제 높이를 비동기 관찰
const ro = new ResizeObserver((entries) => {
  setMeasuredState((prev) => {
    const heights = { ...prev.heights };
    for (const entry of entries) {
      const idx = Number(entry.target.dataset.index);
      const h = entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height;
      if (!isNaN(idx) && h > 0) heights[idx] = h;
    }
    return { texts, heights };
  });
});

// 누적 오프셋: 측정된 높이가 있으면 실측값, 없으면 추정값(50px)
for (let i = 0; i < texts.length; i++) {
  offsets[i] = acc;
  acc += (measuredHeights[i] ?? ESTIMATED_ITEM_HEIGHT) + ITEM_GAP;
}

// 점프 시: 측정된 누적 오프셋 사용 (미측정 범위는 추정값 기반)
el.scrollTop = offsets[jumpTarget.index];
```

라이브러리 없이 순수 구현한 가상 스크롤이다. 아이템이 뷰포트에 진입하면 `ResizeObserver`가 실제 높이를 측정해 오프셋을 보정한다. 측정된 범위는 정확한 누적 오프셋을 사용하고, 아직 한 번도 화면에 나타나지 않은 아이템은 추정값(50px)으로 채워진다. 위로 충분히 스크롤하며 모든 아이템을 한 번씩 거쳤다면 이후 점프는 정확해지지만, 처음 방문하는 먼 인덱스에서는 미측정 구간만큼 오차가 누적된다.

#### @tanstack/react-virtual

```js
const virtualizer = useVirtualizer({
  count: texts.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => ESTIMATED_ITEM_HEIGHT,         // 고정 추정값(50px)
  measureElement: (element) => element.getBoundingClientRect().height,
  gap: ITEM_GAP,
});

// 점프 시: 라이브러리의 scrollToIndex 활용
virtualizer.scrollToIndex(jumpTarget.index, { align: "start" });
```

`@tanstack/react-virtual`이 가상화와 높이 측정을 모두 담당한다. 라이브러리 내부적으로는 아이템별 실측 높이를 저장하는 사이즈 캐시를 관리한다. 아이템이 뷰포트에 진입하면 `measureElement`로 실제 높이를 측정하고, 추정값과 다를 경우 캐시를 갱신한 뒤 영향을 받는 아이템들의 오프셋을 일괄 재계산한다. 이후 스크롤 위치가 재계산된 오프셋과 어긋나 있으면 자동으로 보정한다. 이 "측정 → 캐시 갱신 → 오프셋 재계산 → 스크롤 보정"의 피드백 루프 덕분에, 한 번이라도 뷰포트를 거친 아이템에 대해서는 정확한 위치를 보장할 수 있다.

`scrollToIndex()`는 이 캐시를 참조해 이미 측정된 아이템은 실제 높이로, 미측정 아이템은 `estimateSize` 반환값으로 위치를 계산한다. Native 구현과의 핵심 차이는 여기에 있다. Native는 단순히 오프셋 배열을 직접 참조하는 반면, `@tanstack/react-virtual`은 점프 후에도 실제 렌더링 결과를 다시 측정해 오프셋과 스크롤 위치를 능동적으로 보정한다. 그러나 이 보정 루프도 "렌더링해야 측정할 수 있다"는 전제에서 출발한다. 처음 점프하는 먼 인덱스처럼 사이에 미측정 아이템이 많을수록, 추정값 기반 오차가 누적되어 보정이 여러 사이클을 거쳐야 수렴한다.

#### Pretext

```js
// 렌더링 전에 모든 아이템의 높이를 사전 계산
const { heights } = usePretextMeasurer(texts, itemWidth);

// 누적 오프셋: 모든 아이템의 정확한 높이를 이미 알고 있음
for (let i = 0; i < heights.length; i++) {
  offsets[i] = acc;
  acc += heights[i] + ITEM_GAP;
}

// 점프 시: 정확한 누적 오프셋으로 scrollTop 직접 설정
el.scrollTop = offsets[jumpTarget.index];
```

라이브러리 없이 직접 구현한 가상 스크롤에 Pretext로 사전 계산한 높이를 결합한다. 렌더링 전에 모든 아이템의 정확한 높이가 확정되어 있으므로, 누적 오프셋 계산에 추정값이나 보정 단계가 필요 없다. 점프 시 `offsets[index]`를 `scrollTop`에 직접 할당하면, 아직 렌더링되지 않은 아이템에 대해서도 오차 없이 이동할 수 있다.

**비교 결과:** Native는 방문하지 않은 범위로 처음 점프할 때 index delta가 수십~수백까지 벌어진다. 스크롤을 통해 미측정 구간을 거친 뒤에는 오차가 줄어들지만, 그 전까지는 점프 정확도를 보장할 수 없다. `@tanstack/react-virtual`도 구조적으로 같은 한계를 갖는다. 라이브러리가 내부 캐시로 보정을 시도하지만, 측정되지 않은 아이템이 사이에 있으면 오차가 발생한다. Pretext는 어떤 인덱스로 점프하더라도 index delta가 0을 기록하며, 스크롤 이벤트도 최소한으로 유지된다.

**시사점:** Case 2는 성능이 아니라 정확성의 문제다. Native와 `@tanstack/react-virtual`이 겪는 어려움은 접근 방식의 차이에서 오는 것이 아니라, 둘 다 "렌더링해야 높이를 알 수 있다"는 구조에 있기 때문이다. 얼마나 정교하게 보정 로직을 구현하든, 미방문 아이템의 높이는 추정에 의존할 수밖에 없다.

Pretext는 이 구조 자체를 바꾼다. 높이를 렌더링 전에 알 수 있으므로, 라이브러리를 쓰든 직접 구현하든 처음부터 정확한 오프셋으로 동작한다. 특히 채팅 UI처럼 "읽지 않은 첫 메시지로 바로 이동"이 핵심 기능인 경우, 점프 정확도는 성능 지표가 아닌 기능의 완결성 그 자체다.

---

## 실무 활용 포인트

- **버추얼 리스트(Virtual List):** 긴 메시지나 채팅 UI에서 각 메시지의 정확한 높이를 사전에 계산하여 렌더링할 때 유용하다. 렌더링 전에 레이아웃이 확정되므로, 스크롤 위치가 처음부터 정확하다.
- **실시간 레이아웃 변경:** 화면 크기나 컨테이너 너비가 동적으로 변할 때 텍스트 높이를 실시간으로 재계산해야 하는 경우. `prepare()`와 `layout()`의 역할이 분리되어 있어, 너비 변경 시 `layout()`만 다시 호출하면 된다.
- **고성능 인터랙션 UI:** 텍스트가 게임처럼 움직이거나 복잡한 인터랙션이 포함된 웹페이지에서 프레임 드롭 없이 텍스트 레이아웃을 유지할 수 있다.

Pretext는 기존의 CSS 기반 텍스트 레이아웃 방식에 도전을 제기하며, 웹 프론트엔드 개발에서 텍스트 렌더링 성능을 획기적으로 개선할 수 있는 가능성을 보여주고 있다.

---

## 한계와 단점

Pretext가 강력한 도구인 것은 사실이지만, 도입 전에 알아두어야 할 제약도 있다.

**폰트 일치 문제가 핵심적인 한계다.** Pretext는 `prepare(text, "13px Arial", ...)` 처럼 폰트를 문자열로 직접 지정해야 한다. CSS에서 실제로 적용되는 폰트와 이 문자열이 조금이라도 다르면 — 예를 들어 시스템 폰트 폴백이 적용되거나, 커스텀 웹폰트가 아직 로드되지 않았거나 — 측정값이 실제 렌더링 결과와 어긋난다. 폰트 로딩 타이밍에 따라 첫 계산 결과가 달라질 수 있어 주의가 필요하다.

**CSS의 세밀한 타이포그래피 속성은 반영하지 못한다.** `letter-spacing`, `word-spacing`, OpenType 합자(ligature), 커닝(kerning) 등은 Canvas `measureText`에서 정확히 재현되지 않는다. 단순한 레이아웃이라면 문제없지만, 타이포그래피가 정밀하게 중요한 UI에서는 오차가 생길 수 있다.

**두 단계 API의 관리 부담이 있다.** 텍스트 변경 시에는 `prepare()`, 너비 변경 시에는 `layout()`을 호출하는 식으로, 어떤 상태가 바뀌었는지에 따라 어떤 함수를 호출할지 직접 관리해야 한다. 단순히 높이 하나를 구하는 경우에도 이 구조를 의식해야 하므로, 기존 DOM 방식보다 설계가 필요하다.

**서버에서 정확한 높이를 보장할 수 없다.** 라이브러리 자체는 브라우저 없이도 동작하지만, 실제 폰트 렌더링은 클라이언트 환경에 따라 달라진다. SSR 시 계산한 값과 클라이언트에서의 실제 렌더링 결과가 다를 수 있어, 서버에서 계산한 높이를 레이아웃에 그대로 신뢰하기는 어렵다.

---

## 마무리

Pretext는 "DOM 없이 텍스트 높이를 측정한다"는 단순한 아이디어에서 출발하지만, 이 접근이 실제 성능에서 얼마나 큰 차이를 만들어내는지 직접 구현해보면서 체감할 수 있었다.

특히 가상 스크롤처럼 아이템의 정확한 높이를 사전에 알아야 하는 구조에서, Pretext는 "렌더링 → 측정 → 위치 계산"의 순환 고리를 끊어낸다. 렌더링 전에 이미 레이아웃이 결정되어 있으므로, 첫 페인트부터 스크롤 위치가 정확하다.

물론 폰트 일치나 CSS 세밀도 문제처럼 주의해야 할 지점도 분명히 존재한다. 모든 텍스트 측정 시나리오를 대체할 수 있는 만능 해법은 아니다.

그러나 채팅 UI, 무한 스크롤 피드, 실시간으로 크기가 변하는 텍스트 레이아웃처럼 측정 비용이 병목이 되는 상황이라면, Pretext는 충분히 검토할 가치가 있는 선택지다.
