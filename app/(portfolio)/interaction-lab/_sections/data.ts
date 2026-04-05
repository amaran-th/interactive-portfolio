export type ResearchRecord = {
  id: string;
  title: string;
  subtitle: string;
  period: string;
  thumbnail?: string;
  thumbnailLabel: string;
  accentClassName: string;
  summary: string;
  methods: string[];
  findings: string[];
  nextSteps: string[];
  references?: {
    label: string;
    href: string;
    type: "document" | "reference";
  }[];
};

export const researches: ResearchRecord[] = [
  {
    id: "knit-muffler-flow",
    title: "목도리 뜨기 인터랙션",
    subtitle: "튜토리얼 없는 입력 구조와 피드백 톤 검증",
    period: "2026.04.02 - 04.04",
    thumbnailLabel: "KNIT",
    accentClassName: "from-stone-200 via-amber-100 to-sky-100",
    summary:
      "키 입력 기반 인터랙션이 처음 진입한 사용자에게도 자연스럽게 읽히는지, 그리고 결과 화면이 플레이 경험을 끊지 않고 마무리하는지 확인했다.",
    methods: ["플로우 점검", "마이크로카피 수정", "모바일 레이아웃 비교"],
    findings: [
      "입력 팔레트가 상단에 있을 때보다 하단 액션 근처에 있을 때 선택 전환이 더 빨랐다.",
      "도안과 상태판은 모바일에서 세로 스택보다 2열 배치가 작업 공간을 더 확보했다.",
      "결과 화면은 즉시 저장보다 이어 뜨기와 저장을 함께 제공할 때 흐름이 덜 끊겼다.",
    ],
    nextSteps: [
      "색상 선택과 입력 키 힌트를 같은 군으로 묶기",
      "결과 화면 저장 규격을 모바일 기준으로 한 번 더 정리하기",
    ],
    references: [
      {
        label: "블로그 포스트",
        href: "https://amaran-th.vercel.app/",
        type: "document",
      },
      {
        label: "프로젝트",
        href: "/playground/knit-muffler",
        type: "reference",
      },
    ],
  },
];
