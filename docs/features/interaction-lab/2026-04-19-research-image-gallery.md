# 인터랙션 랩 Research 이미지 갤러리 추가

`ResearchRecord` 타입에 `images` 필드를 추가하고, Research 카드 확장 영역에 이미지 갤러리 UI를 구현했다.

## 데이터 구조

```ts
images?: {
  label: string;
  src: string;
}[];
```

Findings 섹션 아래에 위치하며, 필드가 없으면 렌더링되지 않는다.

## UI 구현

### 원본 비율 렌더링

Next.js `<Image />`에서 크기를 고정하지 않고 원본 비율을 유지하려면 `fill` 대신 다음 패턴을 사용한다.

```tsx
<Image
  width={0}
  height={0}
  sizes="400px"
  className="h-auto max-h-48 w-auto"
/>
```

### 라이트박스

클릭 시 전체 화면 오버레이로 원본 이미지를 확대 표시한다. state 구조:

```ts
type Lightbox = { images: LightboxImage[]; index: number };
```

복수 이미지가 있을 경우 좌/우 버튼과 `n / total` 카운터가 표시된다. 키보드 ←/→로 이동, Esc로 닫는다.

## 관련 코드
- `app/(portfolio)/interaction-lab/_sections/data.ts` — `ResearchRecord` 타입 및 데이터
- `app/(portfolio)/interaction-lab/_sections/Researches.tsx` — 갤러리 및 라이트박스 UI
