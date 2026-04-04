import KnitMuffler from "./1_KnitMuffler/KnitMuffler";
import { WorkItem } from "./Work";

export const works: WorkItem[] = [
  {
    id: 1,
    title: "목도리 뜨기",
    description: "Web App",
    color: "from-violet-600 to-indigo-600",
    content: <KnitMuffler />,
  },
  {
    id: 2,
    title: "Project B",
    description: "Mobile",
    color: "from-rose-500 to-pink-600",
    content: <p>Project B 내용 컴포넌트</p>,
  },
  {
    id: 3,
    title: "Project C",
    description: "Design",
    color: "from-amber-500 to-orange-600",
    content: <p>Project C 내용 컴포넌트</p>,
  },
  {
    id: 4,
    title: "Project D",
    description: "Web App",
    color: "from-violet-600 to-indigo-600",
    content: <p>Project D 내용 컴포넌트</p>,
  },
  {
    id: 5,
    title: "Project E",
    description: "Mobile",
    color: "from-rose-500 to-pink-600",
    content: <p>Project E 내용 컴포넌트</p>,
  },
];
