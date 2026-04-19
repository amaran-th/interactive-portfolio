export type EngineeringEntry = {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  tags: string[];
  problem: string;
  approach: string[];
  outcome: string[];
  links?: {
    label: string;
    href: string;
    type: "blog" | "document" | "project";
  }[];
};

export const engineeringEntries: EngineeringEntry[] = [
  {
    id: "pretext-text-measurement",
    title: "Pretext: Text Measurement Without Layout Reflow",
    subtitle:
      "Canvas API 기반 텍스트 측정으로 레이아웃 리플로우 없이 가상 스크롤 점프 정확도 달성",
    date: "2026.04.19",
    tags: ["performance", "virtual-scroll", "text-measurement", "reflow"],
    problem:
      "Pretext가 기존 DOM 접근 방식(scrollHeight, getBoundingClientRect)과 비교해 어떤 이점을 가지는가?",
    approach: [
      "Case 1: 1,000개 텍스트 높이 측정 — DOM 접근 / Batching로 최적화된 DOM 접근 / Pretext 세 방식의 레이아웃 리플로우 횟수 비교",
      "Case 2: 3,000개 항목 가상 스크롤에서 임의 인덱스로 점프 — Native 구현(ResizeObserver 보정) / @tanstack/react-virtual / Pretext 세 구현의 점프 정확도 비교",
      "리플로우 횟수와 레이아웃 계산 및 렌더링 소요 시간 측정, 스크롤 점프 후 실제 도달한 인덱스와 요청 인덱스의 오차값 등을 계산해 비교 기준으로 삼음",
    ],
    outcome: [
      "Case 1: DOM Thrashing 1,001회 → Batching 2회 → Pretext 1회(초기 prepare 1회만 발생)",
      "Case 2: Native와 @tanstack은 추정 높이 기반으로 수백 인덱스 delta 발생, Pretext는 사전 계산된 정확한 오프셋으로 오차값 0 도출",
      "Batching은 불필요한 리플로우를 제거하지만 DOM 측정 자체의 구조적 제약은 해소하지 못함. Pretext는 측정 과정에서 DOM에 접근하지 않기 때문에 이 제약에서 벗어나 새로운 대안을 제시할 수 있음.",
    ],
    links: [
      {
        label: "블로그 포스트",
        href: "https://amaran-th.vercel.app/Pretext%EB%9D%BC%EC%9D%B4%EB%B8%8C%EB%9F%AC%EB%A6%AC",
        type: "blog",
      },
      {
        label: "A/B 테스트",
        href: "/pretext",
        type: "project",
      },
    ],
  },
];
