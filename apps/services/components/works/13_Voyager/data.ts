// 보이저 1호 연대기. 날짜·거리·설명은 NASA 원문(Photojournal 캡션, 2026-11-19 보도자료
// RELEASE26-098, science.nasa.gov 미션 페이지)에 적힌 값만 옮겼다. 출처끼리 수치가 엇갈리는
// 항목(목성·토성 최근접 거리 등)은 NASA 미션 페이지 값을 쓴다.

import type { SpriteName } from "./sprites";

export type VoyagerPhoto = {
  /** NASA Photojournal 번호 */
  pia: string;
  /** public/voyager/ 아래 원본 JPEG */
  src: string;
  width: number;
  height: number;
  /** 버전이 여럿일 때 탭 이름 */
  label?: string;
};

export type VoyagerEvent = {
  id: string;
  /** YYYY-MM-DD (현지 기록 날짜) */
  date: string;
  kind: "photo" | "log";
  title: string;
  /** NASA 캡션에 적힌 거리(행성·위성 기준 등). 기준을 함께 적는다 */
  distance?: string;
  /** 기록 시각의 지구 중심 거리(AU). NASA/JPL Horizons, 보이저 1호(-31) — 좌표의 거리 척도 */
  earthAu: number;
  body: string;
  icon: SpriteName;
  photos?: VoyagerPhoto[];
};

export const LAUNCH = "1977-09-05";
/** 1광일 도달 시각(UTC) — NASA 보도자료 05:16:07 EST */
export const LIGHT_DAY_AT = Date.UTC(2026, 10, 18, 10, 16, 7);
export const LIGHT_DAY_KM = 25_902_068_356;

const photo = (pia: string, width: number, height: number, label?: string): VoyagerPhoto => ({
  pia,
  src: `/voyager/${pia}.jpg`,
  width,
  height,
  label,
});

export const EVENTS: VoyagerEvent[] = [
  {
    id: "launch",
    earthAu: 0,
    date: "1977-09-05",
    kind: "log",
    title: "발사",
    body: "보이저 2호(8월 20일)보다 2주 늦게 지구를 떠났습니다. 목성과 토성을 거쳐 태양계 바깥으로 가도록 궤도가 설계되었습니다.",
    icon: "rocket",
  },
  {
    id: "earth-moon",
    earthAu: 0.07613878540325,
    date: "1977-09-18",
    kind: "photo",
    title: "초승달 모양의 지구와 달",
    body: "우주선이 지구와 달을 한 장에 담은 첫 초승달 사진. 좌측 상단에 보이는 흐릿한 형상이 달입니다. 지구가 훨씬 밝은 탓에 달의 밝기를 3배 밝게 보정했습니다.",
    icon: "earth",
    photos: [photo("PIA00013", 565, 790)],
  },
  {
    id: "jupiter-first",
    earthAu: 3.99896848042327,
    date: "1979-01-06",
    kind: "photo",
    title: "목성 근접 관측 첫 장",
    distance: "목성에서 5,760만 km",
    body: "석 달 동안 이어진 목성 근접 관측의 첫 사진. 오른쪽 가장자리에 대적점이 보입니다.",
    icon: "jupiter",
    photos: [photo("PIA00029", 400, 400)],
  },
  {
    id: "great-red-spot",
    earthAu: 4.39435016592033,
    date: "1979-02-25",
    kind: "photo",
    title: "대적점",
    distance: "목성에서 920만 km",
    body: "목성의 대적점과 주변 구름. 160km 크기의 구름까지 구별됩니다. 왼쪽의 물결무늬는 복잡하게 요동치는 파동 영역입니다.",
    icon: "jupiter",
    photos: [photo("PIA00014", 895, 848)],
  },
  {
    id: "jupiter-closest",
    earthAu: 4.53914269307829,
    date: "1979-03-05",
    kind: "log",
    title: "목성 최근접",
    distance: "목성에서 28만 km",
    body: "12:05 UT, 목성에 가장 가까이 다가갔습니다.",
    icon: "jupiter",
  },
  {
    id: "io",
    earthAu: 4.58454115503412,
    date: "1979-03-08",
    kind: "photo",
    title: "이오의 화산 분출",
    distance: "이오에서 450만 km",
    body: "최근접 사흘 뒤 목성의 위성 중 하나인 이오를 촬영했습니다. JPL 엔지니어 린다 모라비토가 이 사진에서 지구 밖 첫 화산 분출을 찾아냈습니다. 가장자리의 분출 구름은 260km 넘게 솟았습니다.",
    icon: "io",
    photos: [photo("PIA00379", 140, 140)],
  },
  {
    id: "titan",
    earthAu: 10.1938893655894,
    date: "1980-11-12",
    kind: "photo",
    title: "타이탄의 두꺼운 연무",
    distance: "타이탄에서 43만 5천 km",
    body: "토성의 위성 중 하나인 타이탄 전체가 연무에 덮여 있고, 북극 위에는 더 짙은 구름층이 덮개처럼 얹혀 있습니다. 근접 비행에서 화성보다 훨씬 짙은 대기를 확인했습니다.",
    icon: "titan",
    photos: [photo("PIA02238", 485, 580)],
  },
  {
    id: "saturn-closest",
    earthAu: 10.1936551007970,
    date: "1980-11-12",
    kind: "log",
    title: "토성 최근접",
    distance: "토성에서 약 12만 6천 km",
    body: "23:46 UT, 토성에 가장 가까이 다가갔습니다. 이후 태양계 행성들을 뒤로하고 성간 공간 쪽으로 향했습니다.",
    icon: "saturn",
  },
  {
    id: "saturn-crescent",
    earthAu: 10.1695872084990,
    date: "1980-11-16",
    kind: "photo",
    title: "초승달 모양의 토성",
    distance: "토성에서 530만 km",
    body: "최근접 나흘 뒤에 촬영했습니다. 지구에서는 볼 수 없는 각도입니다. 고리 그림자가 토성 위에 드리우고, 고리 사이 검은 띠가 바로 카시니 간극입니다.",
    icon: "saturn",
    photos: [photo("PIA00335", 800, 550)],
  },
  {
    id: "family-portrait",
    earthAu: 40.4713409195271,
    date: "1990-02-14",
    kind: "photo",
    title: "태양계 가족사진",
    distance: "태양에서 약 40AU",
    body: "카메라를 태양 쪽으로 돌려 60장의 태양계 사진을 찍었습니다. 그중 39장을 이어 붙여 행성 6개를 한 장면에 담았습니다. 사진 중앙의 밝은 점이 태양입니다.",
    icon: "sun",
    photos: [photo("PIA00451", 4000, 1200)],
  },
  {
    id: "pale-blue-dot",
    earthAu: 40.4713409195271,
    date: "1990-02-14",
    kind: "photo",
    title: "창백한 푸른 점",
    body: "태양계 가족사진 중 지구를 담은 한 장의 사진. 지구는 0.12픽셀 크기로, 햇빛이 산란된 줄기 한가운데 떠 있습니다. 2020년에는 30주년을 맞아 새로 처리한 판을 공개했습니다.",
    icon: "earth",
    photos: [photo("PIA00452", 453, 614, "1990 원본"), photo("PIA23645", 5230, 5175, "2020 재처리")],
  },
  {
    id: "camera-off",
    earthAu: 40.4713409195271,
    date: "1990-02-14",
    kind: "log",
    title: "카메라를 끄다",
    body: "창백한 푸른 점을 찍고 34분 뒤, 전력을 아끼기 위해 카메라 전원을 영구적으로 끄기로 합니다. 더는 가까이 근접할 천체가 없어 찍을 대상도 없었습니다.",
    icon: "camera",
  },
  {
    id: "pioneer",
    earthAu: 69.5796393032089,
    date: "1998-02-17",
    kind: "log",
    title: "가장 먼 인공물이 되다",
    distance: "태양에서 69.4AU",
    body: "파이어니어 10호를 앞질러 인류가 만든 물체 가운데 가장 멀리 간 우주선이 됐습니다.",
    icon: "flag",
  },
  {
    id: "termination-shock",
    earthAu: 94.8160882879841,
    date: "2004-12-16",
    kind: "log",
    title: "말단 충격파 도달",
    body: "태양풍이 갑자기 느려지는 경계, 말단 충격파에 닿았습니다.",
    icon: "wave",
  },
  {
    id: "interstellar",
    earthAu: 121.427186843681,
    date: "2012-08-25",
    kind: "log",
    title: "성간 공간 진입",
    body: "태양권을 벗어나, 인류가 만든 우주선 가운데 처음으로 성간 공간에 들어섰습니다. 같은 경계를 2018년, 보이저 2호가 넘었습니다.",
    icon: "star",
  },
  {
    id: "light-day",
    // NASA가 발표한 1광일 거리 그대로(Horizons 값 173.1349AU와 0.006% 차이). 빛으로 정확히 24시간이 되게 한다
    earthAu: LIGHT_DAY_KM / 149_597_870.7,
    date: "2026-11-18",
    kind: "log",
    title: "1광일 돌파",
    body: "05:16:07 EST(10:16:07 UTC), 지구에서 빛으로 정확히 하루(24시간) 걸리는 거리에 도달했습니다. 이제 신호가 도달하는 데, 응답이 돌아오는 데 또 하루가 걸립니다.",
    icon: "heart",
  },
];

/** 발사일로부터 지난 날 수 */
export function daysSinceLaunch(date: string): number {
  return Math.round((Date.parse(date) - Date.parse(LAUNCH)) / 86_400_000);
}

export const NASA_PAGE = (pia: string) => `https://photojournal.jpl.nasa.gov/catalog/${pia}`;

/** 기록의 영어 문구. 한국어 문구와 같은 NASA 원문을 옮겼다 */
const EVENT_EN: Record<string, { title: string; body: string; distance?: string; labels?: string[] }> = {
  launch: {
    title: "Launch",
    body: "Left Earth two weeks after Voyager 2 (August 20). Its trajectory was designed to fly past Jupiter and Saturn and on out of the solar system.",
  },
  "earth-moon": {
    title: "Crescent Earth and Moon",
    body: "The first image of Earth and the Moon together in a single frame, both as crescents. The faint shape at upper left is the Moon. Because Earth is far brighter, the Moon was brightened three times.",
  },
  "jupiter-first": {
    title: "First of the Jupiter close-ups",
    distance: "57.6 million km from Jupiter",
    body: "The first image of a three-month close-up study of Jupiter. The Great Red Spot sits at the right edge.",
  },
  "great-red-spot": {
    title: "The Great Red Spot",
    distance: "9.2 million km from Jupiter",
    body: "Jupiter's Great Red Spot and the clouds around it, with features as small as 160 km. The wavy pattern at left is a region of complex, turbulent waves.",
  },
  "jupiter-closest": {
    title: "Closest approach to Jupiter",
    distance: "280,000 km from Jupiter",
    body: "12:05 UT — the closest point to Jupiter.",
  },
  io: {
    title: "Volcanic plume on Io",
    distance: "4.5 million km from Io",
    body: "Taken three days after closest approach, looking back at Io, one of Jupiter's moons. In this image JPL engineer Linda Morabito found the first volcanic eruption seen beyond Earth. The plume at the edge rises more than 260 km.",
  },
  titan: {
    title: "Titan's thick haze",
    distance: "435,000 km from Titan",
    body: "Saturn's moon Titan is wrapped in haze, with a darker layer of cloud capping the north pole. The flyby found an atmosphere far denser than Mars'.",
  },
  "saturn-closest": {
    title: "Closest approach to Saturn",
    distance: "About 126,000 km from Saturn",
    body: "23:46 UT — the closest point to Saturn. From here it left the planets behind and headed toward interstellar space.",
  },
  "saturn-crescent": {
    title: "Crescent Saturn",
    distance: "5.3 million km from Saturn",
    body: "Taken four days after closest approach, from an angle never seen from Earth. The rings cast shadows on the planet, and the dark band between the rings is the Cassini Division.",
  },
  "family-portrait": {
    title: "Solar system family portrait",
    distance: "About 40 AU from the Sun",
    body: "The camera turned back toward the Sun and took 60 frames. Thirty-nine of them were stitched together to show six planets in one scene. The bright spot at the center is the Sun.",
  },
  "pale-blue-dot": {
    title: "Pale Blue Dot",
    body: "The frame from the family portrait that holds Earth. Earth is 0.12 pixel in size, floating in a band of scattered sunlight. A newly processed version was released in 2020 for the 30th anniversary.",
    labels: ["1990 original", "2020 reprocessed"],
  },
  "camera-off": {
    title: "Cameras off",
    body: "Thirty-four minutes after the Pale Blue Dot, the cameras were switched off for good to save power. There were no more objects close enough to photograph.",
  },
  pioneer: {
    title: "Most distant human-made object",
    distance: "69.4 AU from the Sun",
    body: "Passed Pioneer 10 to become the most distant spacecraft humanity has ever built.",
  },
  "termination-shock": {
    title: "Crossing the termination shock",
    body: "Reached the termination shock, the boundary where the solar wind abruptly slows down.",
  },
  interstellar: {
    title: "Entering interstellar space",
    body: "Left the heliosphere and became the first human-made spacecraft to enter interstellar space. Voyager 2 crossed the same boundary in 2018.",
  },
  "light-day": {
    title: "One light-day",
    body: "At 05:16:07 EST (10:16:07 UTC) it reached the distance light travels from Earth in exactly one day (24 hours). Now a signal takes a day to arrive, and the reply another day to come back.",
  },
};

/** 화면 언어에 맞춘 기록 문구 */
export function eventText(e: VoyagerEvent, lang: "ko" | "en") {
  if (lang === "ko") return { title: e.title, body: e.body, distance: e.distance, labels: e.photos?.map((p) => p.label) };
  const en = EVENT_EN[e.id];
  return { title: en.title, body: en.body, distance: en.distance, labels: en.labels ?? e.photos?.map((p) => p.label) };
}
