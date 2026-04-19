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
  images?: {
    label: string;
    src: string;
  }[];
  references?: {
    label: string;
    href: string;
    type: "document" | "blog" | "project";
  }[];
};

export const researches: ResearchRecord[] = [
  // {
  //   id: "knit-muffler-ux-iteration",
  //   title: "목도리 뜨기 UX 개선",
  //   subtitle: "사용자 피드백 6가지를 반영한 인터랙션 재설계",
  //   period: "2026.04.08",
  //   thumbnailLabel: "ITER",
  //   accentClassName: "from-green-100 via-stone-100 to-amber-100",
  //   summary:
  //     "초기 버전을 직접 사용한 사용자들로부터 6가지 피드백을 수집했다. 초기화 동선의 번거로움, 목도리 성장 방향의 혼란, 이지 모드의 과도한 난이도, 색 선택과 뜨기의 분리된 조작, 현재 줄 파악의 어려움, 비직관적인 단축키가 주요 문제였다. 각 피드백에 대응하는 개선을 적용했다.",
  //   methods: [
  //     "사용자 피드백 수집 및 분류",
  //     "입력 흐름 재설계",
  //     "난이도별 분기 설계",
  //     "레이아웃 재설계",
  //     "localStorage 영속화",
  //   ],
  //   findings: [
  //     "홈 버튼만으로는 초기화 경로가 불명확했다. 홈 버튼 옆에 다시하기 버튼을 추가하자 초기화 의도가 분명해졌다.",
  //     "목도리가 위에서 아래로 성장하는 구조가 도안 읽기 순서(위→아래)와 반대여서 혼란을 줬다. 목도리를 화면 하단에 고정하고 위로 쌓이도록 변경해 도안 진행 방향과 일치시켰다.",
  //     "이지 모드에서도 잘못 떠지는 코드가 생겨 색 선택 자체에 집중하기 어렵다는 피드백이 있었다. 이지 모드의 실수 확률을 0으로 고정하고 실수 지표도 함께 숨겨 난이도 차이를 명확히 했다.",
  //     "색 선택과 뜨기가 분리된 두 단계 조작이어서 리듬이 끊겼다. 색상 버튼 클릭 또는 숫자 키 입력 시 선택과 뜨기가 동시에 일어나도록 통합하자 조작 흐름이 단순해졌다.",
  //     "도안이 작아 현재 몇 번째 줄을 뜨고 있는지 파악하기 어려웠다. 도안에서 현재 진행 줄을 강조 표시해 위치 파악이 쉬워졌다.",
  //     "F(뜨기)·J(풀기) 단축키가 기능을 연상하기 어렵다는 피드백이 있었다. 풀기는 Backspace로 변경해 '지우기'라는 직관과 연결했고, 뜨기는 색상 버튼 클릭으로 대체해 별도 키가 불필요해졌다.",
  //   ],
  //   nextSteps: [
  //     "챌린지 기록 이력 화면 추가",
  //     "자유 모드 복구 시 명시적 안내 메시지 표시",
  //   ],
  //   references: [
  //     {
  //       label: "프로젝트",
  //       href: "/playground/knit-muffler",
  //       type: "project",
  //     },
  //   ],
  // },
  {
    id: "knit-muffler-mobile-layout",
    title: "뜨개뜨개 모바일 레이아웃 개선",
    subtitle: "역할별 좌우 분리 배치로 양 엄지 조작 동선 최적화",
    period: "2026.04.19",
    thumbnailLabel: "MOB",
    accentClassName: "from-sky-100 via-stone-100 to-violet-100",
    summary:
      "양 엄지로 손가락으로 플레이하는 모바일 사용자를 고려해, 동작 분류에 따라 좌우로 분리 배치했다. 메인 동작에 해당하는 색상 팔레트는 왼쪽에, 풀기&툴 변경 등 부가적인 동작 버튼은 오른쪽에 배치해 양 손가락의 역할이 명확히 구분되도록 하였다.",
    methods: [
      "모바일 양손 그립 패턴 분석 및 Thumb Zone 고려",
      "동작 유형에 기반한 좌우 분리 배치 UI 설계",
    ],
    findings: [
      "기존 상하 배치는 시각적 균형을 기준으로 구성된 레이아웃이었다. 모바일에서 양 엄지로 조작할 때는 화면 좌우 가장자리가 더 자연스럽게 닿는 영역이므로, 메인 동작(색상 팔레트)와 부가 동작(풀기·툴 변경)을 좌우로 나눠 각 엄지의 역할과 물리적 위치를 일치시켰다.",
    ],
    images: [
      {
        label: "Before",
        src: "/interaction-lab/knit-muffler-mobile-layout_before.png",
      },
      {
        label: "After",
        src: "/interaction-lab/knit-muffler-mobile-layout_after.png",
      },
    ],
    nextSteps: ["다양한 모바일 기기 크기에서 Thumb Zone 검증"],
    references: [
      {
        label: "프로젝트",
        href: "/playground/knit-muffler",
        type: "project",
      },
      {
        label:
          "Hoober, S. (2013). How Do Users Really Hold Mobile Devices? UXmatters.",
        href: "https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php",
        type: "document",
      },
    ],
  },
  {
    id: "knit-muffler-sound-feedback",
    title: "뜨개뜨개 실패 효과음 추가",
    subtitle: "멀티태스킹 상황에서 시각 채널 의존도를 낮추는 청각 피드백 도입",
    period: "2026.04.18",
    thumbnailLabel: "SFX",
    accentClassName: "from-violet-100 via-stone-100 to-rose-100",
    summary:
      "뜨개뜨개는 색상 변경 타이밍 파악, 실패 코 인지, 하드 모드에서는 코 종류까지 동시에 처리해야 하는 멀티태스킹 상황이다. 처리해야 할 정보가 많아질수록 시각 채널만으로는 실패를 제때 인지하기 어렵다는 판단 하에 실패 효과음을 추가했다.",
    methods: ["Web Audio API를 활용한 실패 효과음 생성"],
    findings: [
      "색상 선택·실패 코 인지·코 종류 파악을 동시에 처리해야 하는 상황에서 시각 피드백만으로는 실패 인지가 지연되기 쉽다. 효과음을 추가하자 화면을 응시하지 않아도 실수 여부를 즉시 인지할 수 있게 됐다.",
    ],
    nextSteps: [
      "뜨기 완료·챌린지 달성 등 효과음을 도입할 수 있는 추가 포인트 탐색",
    ],
    references: [
      {
        label: "프로젝트",
        href: "/playground/knit-muffler",
        type: "project",
      },
      {
        label: "Gaver, W. W. (1986). Auditory Icons: Using Sound in Computer Interfaces. Human-Computer Interaction.",
        href: "https://doi.org/10.1207/s15327051hci0202_3",
        type: "document",
      },
    ],
  },
  {
    id: "knit-muffler-accessibility-color",
    title: "뜨개뜨개 색약 모드 도입",
    subtitle: "색각 이상 사용자를 위한 팔레트 접근성 개선",
    period: "2026.04.09",
    thumbnailLabel: "A11Y",
    accentClassName: "from-blue-100 via-stone-100 to-amber-100",
    summary:
      "뜨개뜨개의 기본 팔레트는 파스텔 계열 색상으로 구성되어 있어, 색각 이상(색약·색맹) 사용자가 색상을 구분하기 어렵다는 문제가 있었다. 색각 이상 환경에서도 혼동이 적은 Wong palette를 기반으로 대체 팔레트를 설계하고, 모드 선택 화면에서 토글로 전환할 수 있는 색약 모드를 구현했다.",
    methods: [
      "시뮬레이션 도구를 활용한 색각 유형별(적녹·청황색약, 완전색맹) 기존 팔레트 가시성 분석",
      "Wong palette 기반 실 색상별 대체 색상 매핑",
    ],
    findings: [
      "기본 팔레트의 파스텔 계열 색상은 명도 차이가 작아, 색각 이상 시뮬레이션에서 여러 색상이 유사하게 표시됐다.",
      "Wong palette는 주요 색각 이상 유형에서도 8가지 색상이 서로 구분 가능하도록 설계된 표준 팔레트다. 이를 기반으로 각 실 색상에 대응하는 대체 색상을 정의했다.",
    ],
    nextSteps: ["실제 색각 이상 사용자 테스트를 통한 팔레트 유효성 검증"],
    images: [
      {
        label: "기본 모드",
        src: "/interaction-lab/knit-muffler-accessibility-color_default.png",
      },
      {
        label: "색약 모드",
        src: "/interaction-lab/knit-muffler-accessibility-color_weakness-mode.png",
      },
    ],
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
