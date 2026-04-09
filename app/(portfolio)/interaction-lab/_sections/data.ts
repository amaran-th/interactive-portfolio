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
    type: "document" | "blog" | "project";
  }[];
};

export const researches: ResearchRecord[] = [
  {
    id: "knit-muffler-ux-iteration",
    title: "목도리 뜨기 UX 개선",
    subtitle: "사용자 피드백 6가지를 반영한 인터랙션 재설계",
    period: "2026.04.08",
    thumbnailLabel: "ITER",
    accentClassName: "from-green-100 via-stone-100 to-amber-100",
    summary:
      "초기 버전을 직접 사용한 사용자들로부터 6가지 피드백을 수집했다. 초기화 동선의 번거로움, 목도리 성장 방향의 혼란, 이지 모드의 과도한 난이도, 색 선택과 뜨기의 분리된 조작, 현재 줄 파악의 어려움, 비직관적인 단축키가 주요 문제였다. 각 피드백에 대응하는 개선을 적용했다.",
    methods: [
      "사용자 피드백 수집 및 분류",
      "입력 흐름 재설계",
      "난이도별 분기 설계",
      "레이아웃 재설계",
      "localStorage 영속화",
    ],
    findings: [
      "홈 버튼만으로는 초기화 경로가 불명확했다. 홈 버튼 옆에 다시하기 버튼을 추가하자 초기화 의도가 분명해졌다.",
      "목도리가 위에서 아래로 성장하는 구조가 도안 읽기 순서(위→아래)와 반대여서 혼란을 줬다. 목도리를 화면 하단에 고정하고 위로 쌓이도록 변경해 도안 진행 방향과 일치시켰다.",
      "이지 모드에서도 잘못 떠지는 코드가 생겨 색 선택 자체에 집중하기 어렵다는 피드백이 있었다. 이지 모드의 실수 확률을 0으로 고정하고 실수 지표도 함께 숨겨 난이도 차이를 명확히 했다.",
      "색 선택과 뜨기가 분리된 두 단계 조작이어서 리듬이 끊겼다. 색상 버튼 클릭 또는 숫자 키 입력 시 선택과 뜨기가 동시에 일어나도록 통합하자 조작 흐름이 단순해졌다.",
      "도안이 작아 현재 몇 번째 줄을 뜨고 있는지 파악하기 어려웠다. 도안에서 현재 진행 줄을 강조 표시해 위치 파악이 쉬워졌다.",
      "F(뜨기)·J(풀기) 단축키가 기능을 연상하기 어렵다는 피드백이 있었다. 풀기는 Backspace로 변경해 '지우기'라는 직관과 연결했고, 뜨기는 색상 버튼 클릭으로 대체해 별도 키가 불필요해졌다.",
    ],
    nextSteps: [
      "챌린지 기록 이력 화면 추가",
      "자유 모드 복구 시 명시적 안내 메시지 표시",
    ],
    references: [
      {
        label: "프로젝트",
        href: "/playground/knit-muffler",
        type: "project",
      },
    ],
  },
  {
    id: "knit-muffler-accessibility-color",
    title: "목도리 뜨기 색약 모드",
    subtitle: "색각 이상 사용자를 위한 팔레트 접근성 개선",
    period: "2026.04.09",
    thumbnailLabel: "A11Y",
    accentClassName: "from-blue-100 via-stone-100 to-amber-100",
    summary:
      "색각 이상(색약·색맹) 사용자는 기본 팔레트의 유사 색조를 구분하기 어렵다는 문제가 이전 리서치에서 미해결 과제로 남아 있었다. 이를 해결하기 위해 색각 이상에서도 혼동이 적은 Wong palette를 기반으로 대체 팔레트를 설계하고, 선택 화면에서 스위치 토글로 전환할 수 있는 색약 모드를 구현했다.",
    methods: [
      "색각 유형(1형·2형 색맹, 색약) 시뮬레이션 분석",
      "Wong palette 기반 대체 색상 정의",
    ],
    findings: [
      "Wong palette는 8가지 색상이 주요 색각 이상 유형에서도 서로 구분 가능하도록 설계된 표준 팔레트다. 이를 기반으로 각 실 색상에 대응하는 대체 색상을 정의했다(파란 하늘·빨간보라·노랑·주황·버밀리온·검정·청록·회색·아이보리).",
    ],
    nextSteps: ["실제 색각 이상 사용자 테스트를 통한 팔레트 유효성 검증"],
    references: [
      {
        label: "프로젝트",
        href: "/playground/knit-muffler",
        type: "project",
      },
      {
        label: "Wong, B. (2011). Color blindness. Nature Methods.",
        href: "https://www.nature.com/articles/nmeth.1618",
        type: "document",
      },
    ],
  },
];
