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
  about: string;
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
    label: "과학",
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
    about:
      "도안대로 실 색을 바꿔 가며 한 코씩 떠서 목도리를 완성하는 뜨개 게임이에요.",
    tags: ["뜨개질", "목도리", "도안", "타이핑", "메달"],
    thumb: "/playground/knit-muffler.png",
  },
  {
    slug: "visual-novel-studio",
    category: "creative",
    title: "비주얼 노벨 스튜디오",
    desc: "내가 그린 캐릭터가 말을 하기 시작했다",
    about:
      "직접 그린 캐릭터와 배경으로 짧은 비주얼 노벨을 만들어 바로 재생해 보는 도구예요.",
    tags: ["비주얼노벨", "스토리", "대사", "캐릭터", "배경음악"],
    thumb: "/playground/visual-novel-studio.png",
  },
  {
    slug: "stellar-forge",
    category: "game",
    title: "별들은 굉장한 빛메이커이다",
    desc: "핵융합 순서대로 원소를 합성하는 항성 시뮬레이션",
    about:
      "수소에서 철까지, 별 속에서 원소가 만들어지는 순서를 직접 이어 가는 핵융합 게임이에요.",
    tags: ["우주", "별", "핵융합", "원소", "초신성", "시뮬레이션"],
    thumb: "/playground/stellar-forge.png",
  },
  {
    slug: "yearly-receipt",
    category: "productivity",
    title: "올해의 영수증 만들기",
    desc: "올해 목표, 얼마나 달성했나요? 영수증을 출력하시겠습니까?",
    about:
      "한 해 목표를 얼마나 이뤘는지 영수증 한 장으로 돌아보는 연말 회고 도구예요.",
    tags: ["목표", "회고", "체크리스트", "연말", "영수증"],
    thumb: "/playground/yearly-receipt.png",
  },
  {
    slug: "nemo-nemo-beam",
    category: "creative",
    title: "네모네모빔",
    desc: "픽셀아트의, 픽셀아트에 의한, 픽셀아트를 위한 에디터",
    about:
      "설치 없이 브라우저에서 도트 그림과 애니메이션을 만드는 픽셀아트 에디터예요.",
    tags: ["도트", "그림", "애니메이션", "스프라이트", "PNG", "GIF"],
    thumb: "/playground/nemo-beam.png",
  },
  {
    slug: "asset-simulator",
    category: "productivity",
    title: "자산 시뮬레이터",
    desc: "내 작고 귀여운 돈, 잘 모이고 있나?",
    about:
      "지금 가진 돈과 앞으로의 수입·지출로 몇 년 뒤 자산이 어떻게 될지 미리 계산해 봐요.",
    tags: ["돈", "재테크", "저축", "가계부", "복리", "계산기"],
    thumb: null,
  },
  {
    slug: "text-encoding",
    category: "productivity",
    title: "문자 인코딩 변환기",
    desc: "'가'는 UTF-8로 EA B0 80",
    about:
      "글자가 UTF-8·EUC-KR 같은 인코딩에서 어떤 바이트로 저장되는지 확인하는 변환기예요.",
    tags: ["인코딩", "유니코드", "UTF-8", "EUC-KR", "아스키", "ASCII", "바이트", "16진수"],
    thumb: null,
  },
  {
    slug: "color-picker",
    category: "productivity",
    title: "색상 추출기",
    desc: "콕 찍은 한 색부터 사진 팔레트까지",
    about:
      "이미지에서 원하는 색의 코드를 뽑거나, 많이 쓰인 색으로 팔레트를 만드는 도구예요.",
    tags: ["색상", "컬러", "스포이트", "팔레트", "HEX", "RGB", "HSL", "색상코드", "색 조합", "컬러 팔레트", "PNG"],
    thumb: null,
  },
  {
    slug: "monorism",
    category: "creative",
    title: "모노리즘",
    desc: "딱, 딱, 뒤집어서 그리는 모자이크",
    about:
      "앞뒤 색이 다른 칩을 하나씩 뒤집어 그림을 만드는 3D 모자이크 판이에요.",
    tags: ["모자이크", "스팽글", "도트", "3D", "픽셀아트", "칩"],
    thumb: "/playground/monorism-chips.png",
  },
  {
    slug: "stage-lighting",
    category: "creative",
    title: "조명 연습실",
    desc: "무대에 조명을 걸고 큐를 짜 보는 3D 연습실",
    about:
      "3D 무대에 조명을 걸고 큐를 짜 보며 공연 조명을 연습하는 곳이에요.",
    tags: ["조명", "무대", "공연", "큐", "3D", "헤이즈", "연극", "채널", "젤", "좌석", "객석", "마네킹"],
    thumb: "/playground/stage-lighting.png",
  },
  {
    slug: "char-counter",
    category: "productivity",
    title: "글자수 세기",
    desc: "공백 포함·제외, 바이트까지 바로",
    about:
      "자기소개서처럼 분량 제한이 있는 글을 쓰면서 글자 수를 바로 확인하는 도구예요.",
    tags: ["글자 수", "자기소개서", "자소서", "분량", "바이트 계산", "단어 수"],
    thumb: "/playground/char-counter.png",
  },
  {
    slug: "voyager",
    category: "science",
    title: "49년만에 도달한 1일",
    desc: "보이저 1호의 1광일 돌파 기념 연대기",
    about:
      "보이저 1호가 1광일에 닿은 것을 기념해, 49년 여정을 원본 사진과 기록으로 따라가는 8비트 연대기예요.",
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
      t.about,
      ...t.tags,
      getCategory(t.category)?.label ?? "",
    ].join(" ");
    return normalizeQuery(haystack).includes(q);
  });
}
