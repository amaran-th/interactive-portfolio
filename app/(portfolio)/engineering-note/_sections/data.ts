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
    id: "viewport-scroll-lock",
    title: "Viewport Height and Fixed Action Area",
    subtitle: "모바일에서 작업 영역만 스크롤되도록 레이아웃 재정리",
    date: "2026.04.05",
    tags: ["layout", "mobile", "viewport"],
    problem:
      "길이가 길어질수록 하단 액션 버튼이 같이 밀려 내려가면서, 실제로는 고정되어야 하는 UI가 콘텐츠 흐름에 종속되고 있었다.",
    approach: [
      "페이지 루트를 `100dvh` 기준 높이로 고정",
      "중앙 작업 영역에만 `overflow-y-auto` 적용",
      "상단/하단 고정 UI는 별도 레이어로 유지",
    ],
    outcome: [
      "뜨개질이 이루어지는 영역만 스크롤되고 버튼 영역은 고정되도록 분리",
      "모바일 브라우저 UI 변화에 덜 흔들리는 레이아웃 확보",
    ],
    links: [
      {
        label: "블로그 포스트",
        href: "https://amaran-th.vercel.app/",
        type: "blog",
      },
      {
        label: "프로젝트",
        href: "/playground/knit-muffler",
        type: "project",
      },
    ],
  },
];
