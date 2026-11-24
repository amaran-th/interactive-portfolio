// 서비스 앱의 도구 목록. 메인·카테고리 페이지가 모두 이 파일을 읽는다.
// node:test가 그대로 실행하도록 다른 모듈을 import하지 않는다.

export type CategoryId = "life" | "productivity" | "text" | "creative" | "dev" | "game" | "science";

export type Category = {
  id: CategoryId;
  label: string;
  description: string;
  // 배지·칩 배경 — amaran-th.github.io 테마 팔레트의 sub 색을 빌려 쓴다.
  badgeClass: string;
};

export type Tool = {
  slug: string;
  category: CategoryId;
  title: string;
  desc: string;
  tags: string[];
  thumb: string | null;
};

export const CATEGORIES: Category[] = [
  {
    id: "life",
    label: "생활·계산",
    description: "생활 속 숫자를 계산하고 기록하는 도구를 모았습니다.",
    badgeClass: "bg-sub",
  },
  {
    id: "productivity",
    label: "생산성",
    description: "목표 정리, 돈 계산, 글자 수 세기, 인코딩 확인, 색 뽑기처럼 일하다 자주 손이 가는 도구예요.",
    badgeClass: "bg-sub",
  },
  {
    id: "text",
    label: "텍스트",
    description: "글자가 컴퓨터 안에서 어떤 숫자로 저장되는지 들여다보는 도구예요.",
    badgeClass: "bg-[#c5e3b5]",
  },
  {
    id: "creative",
    label: "창작",
    description: "네모네모빔에서 그린 그림을 비주얼 노벨 스튜디오로 가져가면 캐릭터와 배경으로 쓸 수 있어요.",
    badgeClass: "bg-[#e7a6bc]",
  },
  {
    id: "dev",
    label: "개발·웹",
    description: "이미지에서 색을 뽑거나 팔레트를 만드는 것처럼, 웹 작업하다 자주 찾게 되는 도구예요.",
    badgeClass: "bg-[#d4c4f0]",
  },
  {
    id: "game",
    label: "게임",
    description: "뜨개 도안을 한 코씩 채우거나, 수소로 시작해 철이 나올 때까지 원소를 합성해요.",
    badgeClass: "bg-[#ffdd94]",
  },
  {
    id: "science",
    label: "스토리",
    description: "탐사선이 찍은 원본 사진과 기록을 따라가며 우주를 둘러봐요.",
    badgeClass: "bg-[#b5d4f0]",
  },
];

export const TOOLS: Tool[] = [
  {
    slug: "knit-muffler",
    category: "game",
    title: "뜨개뜨개",
    desc: "한 코 한 코, 틀리지 말고 빠르게!",
    tags: ["뜨개질", "목도리", "도안", "타이핑", "메달"],
    thumb: "/playground/knit-muffler.png",
  },
  {
    slug: "visual-novel-studio",
    category: "creative",
    title: "비주얼 노벨 스튜디오",
    desc: "쉽게 만드는 나만의 비주얼노벨",
    tags: ["비주얼노벨", "스토리", "대사", "캐릭터", "배경음악"],
    thumb: "/playground/visual-novel-studio.png",
  },
  {
    slug: "stellar-forge",
    category: "game",
    title: "별들은 굉장한 빛메이커이다",
    desc: "핵융합 순서대로 원소를 합성하는 항성 시뮬레이션",
    tags: ["우주", "별", "핵융합", "원소", "초신성", "시뮬레이션"],
    thumb: "/playground/stellar-forge.png",
  },
  {
    slug: "yearly-receipt",
    category: "productivity",
    title: "올해의 영수증 만들기",
    desc: "올해 목표, 얼마나 달성했나요? 영수증을 출력하시겠습니까?",
    tags: ["목표", "회고", "체크리스트", "연말", "영수증"],
    thumb: "/playground/yearly-receipt.png",
  },
  {
    slug: "nemo-nemo-beam",
    category: "creative",
    title: "네모네모빔",
    desc: "픽셀아트의, 픽셀아트에 의한, 픽셀아트를 위한 에디터",
    tags: ["도트", "그림", "애니메이션", "스프라이트", "PNG", "GIF"],
    thumb: "/playground/nemo-beam.png",
  },
  {
    slug: "asset-simulator",
    category: "productivity",
    title: "자산 시뮬레이터",
    desc: "내 작고 귀여운 돈, 잘 모이고 있나?",
    tags: ["돈", "재테크", "저축", "가계부", "복리", "계산기"],
    thumb: "/playground/asset-simulator.png",
  },
  {
    slug: "text-encoding",
    category: "productivity",
    title: "문자 인코딩 변환기",
    desc: "'가'는 UTF-8로 EA B0 80",
    tags: ["인코딩", "유니코드", "UTF-8", "EUC-KR", "아스키", "ASCII", "바이트", "16진수"],
    thumb: "/playground/text-encoding.png",
  },
  {
    slug: "color-picker",
    category: "productivity",
    title: "색상 추출기",
    desc: "색상 스포이트와 나만의 컬러팔레트 만들기",
    tags: ["색상", "컬러", "스포이트", "팔레트", "HEX", "RGB", "HSL", "색상코드", "색 조합", "컬러 팔레트", "PNG"],
    thumb: "/playground/color-picker.png",
  },
  {
    slug: "monorism",
    category: "creative",
    title: "모노리즘",
    desc: "앞뒷면을 조합해 만드는 모자이크 아트",
    tags: ["모자이크", "스팽글", "도트", "3D", "픽셀아트", "칩"],
    thumb: "/playground/monorism-chips.png",
  },
  {
    slug: "stage-lighting",
    category: "creative",
    title: "조명 연습실",
    desc: "간단 무대 조명 시뮬레이터",
    tags: ["조명", "무대", "공연", "큐", "3D", "헤이즈", "연극", "채널", "젤", "좌석", "객석", "마네킹"],
    thumb: "/playground/stage-lighting.png",
  },
  {
    slug: "char-counter",
    category: "productivity",
    title: "글자수 세기",
    desc: "간이 자소서 노트",
    tags: ["글자 수", "자기소개서", "자소서", "분량", "바이트 계산", "단어 수"],
    thumb: "/playground/char-counter.png",
  },
  {
    slug: "voyager",
    category: "science",
    title: "49년만에 도달한 1일",
    desc: "보이저 1호의 1광일 돌파 기념 연대기",
    tags: ["보이저", "우주", "NASA", "탐사선", "창백한 푸른 점", "골든 레코드", "연대기", "8비트"],
    thumb: "/playground/voyager.png",
  },
];

export function getCategory(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

export function toolsIn(id: CategoryId): Tool[] {
  return TOOLS.filter((t) => t.category === id);
}

export function activeCategories(): Category[] {
  return CATEGORIES.filter((c) => toolsIn(c.id).length > 0);
}

export function normalizeQuery(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "");
}

export function searchTools(query: string, tools: Tool[] = TOOLS): Tool[] {
  const q = normalizeQuery(query);
  if (!q) return tools;
  return tools.filter((t) => {
    const haystack = [
      t.title,
      t.desc,
      ...t.tags,
      getCategory(t.category)?.label ?? "",
    ].join(" ");
    return normalizeQuery(haystack).includes(q);
  });
}
