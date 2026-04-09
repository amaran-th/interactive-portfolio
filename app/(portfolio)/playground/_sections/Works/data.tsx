import KnitMuffler from "./1_KnitMuffler/KnitMuffler";
import { WorkItem } from "./Work";

export const works: WorkItem[] = [
  {
    id: 1,
    title: "목도리 뜨기",
    description: `'한컴 타자 연습'에서 착안한 목도리 뜨기 게임.
      
🎯 챌린지 모드: 난이도 별로 5개의 도안이 제공된다.
    - 이지 모드: 주어진 도안을 따라 목도리를 완성해야 한다.
    - 챌린지 모드: 새로운 코를 뜰 때마다 일정 확률로 '잘못 뜬 코'가 생성된다. '잘못 뜬 코'가 남아있지 않도록 풀고 다시 뜨기를 반복하면서 목도리를 완성해야 한다.
      
🎨 자유 모드: 다양한 색과 패턴의 실을 골라 목도리 길이에 제한 없이 나만의 목도리를 만들 수 있다.

특징:
- 색약을 위한 팔레트 모드가 제공된다.
      `,
    period: "2026.04.02 - 04.04",
    platforms: ["pc", "mobile"],
    content: <KnitMuffler />,
    thumbnail: "/playground/knit-muffler.png",
    path: "/knit-muffler",
  },
  {
    id: 2,
    title: "Project B",
    description: "프로젝트 설명이 들어갈 자리.",
    period: "2026.02",
    platforms: ["pc"],
    content: <p>Project B 내용 컴포넌트</p>,
  },
];
