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
  // {
  //   id: "gpu-rotation-raster-fallback",
  //   title: "GPU Rotation: 래스터 폴백과 사라지는 지도 회전",
  //   subtitle:
  //     "구글맵 회전 보정 구현 중 겪은 래스터 폴백 문제를 계기로, GPU 가속과 WebGL 회전 메커니즘을 재현·학습",
  //   date: "2026.06.27",
  //   tags: ["webgl", "gpu", "rendering", "google-maps", "raster-vs-vector"],
  //   problem:
  //     "일정 각도로 회전 보정한 지도를 띄워야 했는데, 벡터(WebGL) 모드가 래스터로 폴백되면서 heading 회전 자체가 지원되지 않았다. GPU 가속 유무가 왜 '회전 가능 여부'라는 기능 차이로 이어지는가?",
  //   approach: [
  //     "Example 1: 동일한 다크 맵 씬을 Raster(2D 캔버스에 비트맵을 굽고 ctx.rotate로 CPU 회전)와 Vector(WebGL2 버텍스 셰이더에서 2x2 회전 행렬을 정점에 곱함) 두 경로로 나란히 렌더링해 회전 품질·비용 비교",
  //     "라벨은 벡터 경로에서 빌보드 쿼드로 처리해 회전해도 수평을 유지시키고, 래스터 경로에서는 비트맵째 기울어져 뒤집히는 차이를 시각화",
  //     "'GPU 사용 불가 → 래스터 폴백 강제' 토글로 벡터 패널을 북쪽 고정시켜 실제 버그를 그대로 재현",
  //     "Example 2: WEBGL_debug_renderer_info로 실제 GPU/드라이버 문자열과 WebGL2 능력치를 출력하고, 소프트웨어 렌더러(SwiftShader 등) 여부를 판정. WebGL 컨텍스트 한도(~16) 초과 시 오래된 컨텍스트가 강제로 소실되는 현상도 재현",
  //   ],
  //   outcome: [
  //     "래스터 회전은 미리 그려진 비트맵을 픽셀 리샘플하는 것이라 흐려지고 라벨이 뒤집힌다 — 그래서 구글맵 래스터 렌더러는 heading/tilt를 아예 제공하지 않는다. '회전 지원'은 벡터/GPU 렌더링의 직접적 산물임을 확인",
  //     "벡터 회전은 GPU가 모든 정점에 동일한 행렬 변환을 병렬 적용하는 것이라 매 프레임 회전해도 사실상 공짜이고 어떤 각도에서도 선명하다",
  //     "GPU 블록리스트·하드웨어 가속 비활성·컨텍스트 한도 초과 등으로 WebGL을 잃으면 래스터로 폴백되고, 그 순간 회전 기능이 증발한다는 인과를 환경 introspection으로 체감",
  //   ],
  //   links: [
  //     {
  //       label: "인터랙티브 실험",
  //       href: "/gpu-rotation",
  //       type: "project",
  //     },
  //   ],
  // },
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
