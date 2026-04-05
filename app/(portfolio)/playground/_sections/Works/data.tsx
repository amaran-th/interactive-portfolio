import KnitMuffler from "./1_KnitMuffler/KnitMuffler";
import { WorkItem } from "./Work";

export const works: WorkItem[] = [
  {
    id: 1,
    title: "목도리 뜨기",
    description:
      "키보드 입력으로 목도리를 완성하는 인터랙션. 챌린지와 자유 모드를 오가며 입력 구조, 결과 화면, 저장 흐름을 계속 다듬고 있다.",
    period: "2026.04.02 - 04.04",
    platforms: ["pc", "mobile"],
    content: <KnitMuffler />,
    thumbnail: "/playground/knit-muffler.png",
    path: "/playground/knit-muffler",
  },
  {
    id: 2,
    title: "Project B",
    description: "프로젝트 설명이 들어갈 자리.",
    period: "2026.02",
    platforms: ["mobile"],
    content: <p>Project B 내용 컴포넌트</p>,
  },
];
