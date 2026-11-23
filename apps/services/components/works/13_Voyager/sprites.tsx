// 도트 스프라이트. 문자 한 칸이 픽셀 하나이고, '.'은 비어 있다.
// 같은 색이 가로로 이어지면 rect 하나로 합쳐 SVG를 가볍게 한다.

const SPRITES = {
  voyager: {
    colors: { W: "#f4f4f8", L: "#b8bccc", D: "#6c7088", G: "#f8c838", B: "#9ca0b8" },
    rows: [
      "......WWWW......",
      "....WWLLLLWW....",
      "...WLLLLLLLLW...",
      "...WLLLDDLLLW...",
      "....WWLLLLWW....",
      "......WDDW......",
      "BBBB..DGGD..BBBB",
      "......DGGD......",
      ".....DDDDDD.....",
      "......L..L......",
      ".....L....L.....",
    ],
  },
  rocket: {
    colors: { W: "#f4f4f8", R: "#f85858", B: "#3cbcfc", Y: "#f8d878" },
    rows: [
      "...WW...",
      "..WWWW..",
      "..WBBW..",
      "..WWWW..",
      ".RWWWWR.",
      "RR.WW.RR",
      "...YY...",
      "...Y....",
    ],
  },
  earth: {
    colors: { B: "#3c8cfc", G: "#58d858", W: "#f4f4f8" },
    rows: [
      "..BBBB..",
      ".BGGBBB.",
      "BGGGBBWB",
      "BBGBBBBB",
      "BBBBGGBB",
      "BWBBGGGB",
      ".BBBBGB.",
      "..BBBB..",
    ],
  },
  jupiter: {
    colors: { C: "#f8d8a8", O: "#d89058", R: "#e85838", W: "#fcf0dc" },
    rows: [
      "..CCCC..",
      ".OOOOOO.",
      "CCCWCCCC",
      "OOOOOOOO",
      "CCCCCCCC",
      "OORRCOOO",
      ".CRRCCC.",
      "..OOOO..",
    ],
  },
  mercury: {
    colors: { G: "#a8a8b8", D: "#787888", W: "#d8d8e0" },
    rows: [
      "..GGGG..",
      ".GWGGDG.",
      "GGGGDGGG",
      "GDGGGGWG",
      "GGGGGDGG",
      "GGWGGGGG",
      ".GGDGGG.",
      "..GGGG..",
    ],
  },
  venus: {
    colors: { C: "#f8e0a8", O: "#e8b868", W: "#fcf4dc" },
    rows: [
      "..CCCC..",
      ".CWWCCC.",
      "CCCCOOCC",
      "OOCCCCCC",
      "CCCOOCCC",
      "CCCCCCOO",
      ".OCCCCC.",
      "..CCCC..",
    ],
  },
  mars: {
    colors: { R: "#e86838", D: "#b84828", W: "#f8d0b8" },
    rows: [
      "..RWWR..",
      ".RRRRRR.",
      "RRDRRRRR",
      "RRRRRDDR",
      "RDDRRRRR",
      "RRRRRRDR",
      ".RRRDRR.",
      "..RRRR..",
    ],
  },
  uranus: {
    colors: { C: "#a8f0f0", D: "#78c8d8", W: "#e0fcfc" },
    rows: [
      "..CCCC..",
      ".CWCCCC.",
      "CCCCCCCC",
      "DDDDDDDD",
      "CCCCCCCC",
      "CCCCCCCC",
      ".CCCCCD.",
      "..CCCC..",
    ],
  },
  neptune: {
    colors: { B: "#3c6cfc", D: "#2848b8", W: "#a8c8fc" },
    rows: [
      "..BBBB..",
      ".BWBBBB.",
      "BBBBBBBB",
      "DDDDBBBB",
      "BBBBBDDB",
      "BBWBBBBB",
      ".BBBBBD.",
      "..BBBB..",
    ],
  },
  speaker: {
    colors: { W: "#f4f4f8", C: "#3cbcfc" },
    rows: [
      "....W.......",
      "...WW...C...",
      "..WWW....C..",
      "WWWWW.C..C..",
      "WWWWW..C..C.",
      "WWWWW..C..C.",
      "WWWWW.C..C..",
      "..WWW....C..",
      "...WW...C...",
      "....W.......",
    ],
  },
  mute: {
    colors: { W: "#f4f4f8", R: "#f85858" },
    rows: [
      "....W.......",
      "...WW.......",
      "..WWW.......",
      "WWWWW.R...R.",
      "WWWWW..R.R..",
      "WWWWW...R...",
      "WWWWW..R.R..",
      "..WWW.R...R.",
      "...WW.......",
      "....W.......",
    ],
  },
  keyUp: {
    colors: { K: "#f4f4f8", S: "#9ca0d0", A: "#171a44" },
    rows: [
      ".KKKKKKKKKK.",
      "KKKKKKKKKKKK",
      "KKKKKAAKKKKK",
      "KKKKAAAAKKKK",
      "KKKAAAAAAKKK",
      "KKKKKAAKKKKK",
      "KKKKKAAKKKKK",
      "KKKKKAAKKKKK",
      "KKKKKKKKKKKK",
      "SSSSSSSSSSSS",
      ".SSSSSSSSSS.",
    ],
  },
  keyDown: {
    colors: { K: "#f4f4f8", S: "#9ca0d0", A: "#171a44" },
    rows: [
      ".KKKKKKKKKK.",
      "KKKKKKKKKKKK",
      "KKKKKAAKKKKK",
      "KKKKKAAKKKKK",
      "KKKKKAAKKKKK",
      "KKKAAAAAAKKK",
      "KKKKAAAAKKKK",
      "KKKKKAAKKKKK",
      "KKKKKKKKKKKK",
      "SSSSSSSSSSSS",
      ".SSSSSSSSSS.",
    ],
  },
  mouseWheel: {
    colors: { Y: "#f8d878" },
    rows: [
      "..........",
      ".....Y....",
      ".....Y....",
      ".....Y....",
      "..........",
      "..........",
      "..........",
      "..........",
      "..........",
      "..........",
      "..........",
      "..........",
    ],
  },
  keyLeft: {
    colors: { K: "#f4f4f8", S: "#9ca0d0", A: "#171a44" },
    rows: [
      ".KKKKKKKKKK.",
      "KKKKKKKKKKKK",
      "KKKKKAKKKKKK",
      "KKKKAAKKKKKK",
      "KKKAAAAAAAKK",
      "KKKAAAAAAAKK",
      "KKKKAAKKKKKK",
      "KKKKKAKKKKKK",
      "KKKKKKKKKKKK",
      "SSSSSSSSSSSS",
      ".SSSSSSSSSS.",
    ],
  },
  keyRight: {
    colors: { K: "#f4f4f8", S: "#9ca0d0", A: "#171a44" },
    rows: [
      ".KKKKKKKKKK.",
      "KKKKKKKKKKKK",
      "KKKKKKAKKKKK",
      "KKKKKKAAKKKK",
      "KKAAAAAAAKKK",
      "KKAAAAAAAKKK",
      "KKKKKKAAKKKK",
      "KKKKKKAKKKKK",
      "KKKKKKKKKKKK",
      "SSSSSSSSSSSS",
      ".SSSSSSSSSS.",
    ],
  },
  mouse: {
    colors: { K: "#f4f4f8", S: "#9ca0d0", Y: "#5c5cd8" },
    rows: [
      "..KKKKKK..",
      ".KKKKYKKK.",
      "KKKKKYKKKK",
      "KKKKKYKKKK",
      "KSSSSSSSSK",
      "KKKKKKKKKK",
      "KKKKKKKKKK",
      "KKKKKKKKKK",
      "KKKKKKKKKK",
      "SKKKKKKKKS",
      ".SKKKKKKS.",
      "..SSSSSS..",
    ],
  },
  io: {
    colors: { Y: "#f8e858", O: "#e8a838", R: "#c85818", W: "#fcfcd8" },
    rows: [
      "...WW...",
      "..W.W...",
      "..YYYY..",
      ".YOYYRY.",
      ".YYYOYY.",
      ".YRYYYO.",
      "..YYOY..",
      "...YY...",
    ],
  },
  titan: {
    colors: { O: "#e8a048", D: "#b86818", H: "#f8c878" },
    rows: [
      "..HHHH..",
      ".HOOOOH.",
      "HOOOOOOH",
      "OOOOOOOO",
      "OOOOOOOO",
      "ODOOOODO",
      ".DDOODD.",
      "..DDDD..",
    ],
  },
  saturn: {
    colors: { C: "#f8d878", O: "#d8a848", R: "#bcbcd8" },
    rows: [
      "...CCCC.....",
      "..COOOOC....",
      "RRRRRRRRRRRR",
      ".RCCCCCCR..R",
      "..OOOOOO.RR.",
      "...CCCC.....",
    ],
  },
  sun: {
    colors: { Y: "#f8e858", O: "#f8a838" },
    rows: [
      "O..OO..O",
      ".O.YY.O.",
      "..YYYY..",
      "OYYYYYYO",
      "OYYYYYYO",
      "..YYYY..",
      ".O.YY.O.",
      "O..OO..O",
    ],
  },
  flag: {
    colors: { W: "#f4f4f8", P: "#f878a8", Y: "#f8d878" },
    rows: [
      ".W......",
      ".WPPPP..",
      ".WPYYPP.",
      ".WPPPP..",
      ".W......",
      ".W......",
      ".W......",
      "WWW.....",
    ],
  },
  wave: {
    colors: { C: "#3cbcfc", W: "#d8f0fc" },
    rows: [
      "........",
      ".WW...WW",
      "W..W.W..",
      "....W...",
      ".CC...CC",
      "C..C.C..",
      "....C...",
      "........",
    ],
  },
  star: {
    colors: { Y: "#f8d878", W: "#fcfcfc" },
    rows: [
      "...YY...",
      "...YY...",
      "YYYWWYYY",
      ".YYWWYY.",
      "..YYYY..",
      ".YY..YY.",
      ".Y....Y.",
      "........",
    ],
  },
  record: {
    colors: { Y: "#f8c838", O: "#c88818", D: "#2c2c3c", W: "#fcf0b8" },
    rows: [
      "..YYYY..",
      ".YWYYOY.",
      "YWYOOYOY",
      "YYODDOYY",
      "YYODDOYY",
      "YOYOOYOY",
      ".YOYYOY.",
      "..YYYY..",
    ],
  },
  // 꺼진 카메라: 렌즈가 어둡고 오른쪽 위 불빛이 꺼진 색
  camera: {
    colors: { G: "#9ca0b8", L: "#6c7088", K: "#2c2c3c", W: "#4c4c6c", R: "#783040" },
    rows: [
      "......R.",
      "..GG....",
      "GGGGGGGG",
      "GLLKKLLG",
      "GLKWWKLG",
      "GLKWWKLG",
      "GLLKKLLG",
      "GGGGGGGG",
    ],
  },
  heart: {
    colors: { P: "#f878a8", W: "#fcd8e8" },
    rows: [
      ".PP..PP.",
      "PWPPPPPP",
      "PWPPPPPP",
      "PPPPPPPP",
      ".PPPPPP.",
      "..PPPP..",
      "...PP...",
      "........",
    ],
  },
} satisfies Record<string, { colors: Record<string, string>; rows: string[] }>;

export type SpriteName = keyof typeof SPRITES;

const RECTS: Record<SpriteName, { fill: string; d: string }[]> = Object.fromEntries(
  Object.entries(SPRITES).map(([name, { colors, rows }]) => {
    const paths: Record<string, string> = {};
    rows.forEach((row, y) => {
      let x = 0;
      while (x < row.length) {
        const ch = row[x];
        if (ch === ".") {
          x++;
          continue;
        }
        const start = x;
        while (x < row.length && row[x] === ch) x++;
        paths[ch] = (paths[ch] ?? "") + `M${start} ${y}h${x - start}v1h${start - x}z`;
      }
    });
    return [
      name,
      Object.entries(paths).map(([ch, d]) => ({ fill: (colors as Record<string, string>)[ch], d })),
    ];
  }),
) as Record<SpriteName, { fill: string; d: string }[]>;

/** scale: 픽셀 한 칸의 화면 크기(px) */
export function Sprite({ name, scale = 3, className }: { name: SpriteName; scale?: number; className?: string }) {
  const rows = SPRITES[name].rows;
  const w = rows[0].length;
  const h = rows.length;
  return (
    <svg
      width={w * scale}
      height={h * scale}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      className={className}
      style={{ flexShrink: 0 }}
    >
      {RECTS[name].map(({ fill, d }) => (
        <path key={fill} d={d} fill={fill} />
      ))}
    </svg>
  );
}
