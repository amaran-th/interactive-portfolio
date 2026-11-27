"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useLang } from "./i18n";
import { Sprite } from "./sprites";
import type { ZoomTarget } from "./VoyagerTimeline";
import v from "./voyager.module.css";

// 보이저 1·2호에 실린 골든 레코드. 내용은 NASA 'Voyager Golden Record' 페이지
// (overview · golden-record-contents · golden-record-cover)에 적힌 사실만 옮겼다.

const NASA_RECORD = "https://science.nasa.gov/mission/voyager/golden-record-contents/";
const NASA_COVER = "https://science.nasa.gov/mission/voyager/golden-record-cover/";

const RECORD: ZoomTarget = {
  title: "골든 레코드",
  src: "/voyager/golden-record.jpg",
  width: 1975,
  height: 1971,
  id: "NASA/JPL",
  href: NASA_RECORD,
};
const COVER: ZoomTarget = {
  title: "골든 레코드 표지",
  src: "/voyager/golden-cover.jpg",
  width: 2389,
  height: 2389,
  id: "NASA/JPL",
  href: NASA_COVER,
};
const DIAGRAM: ZoomTarget = {
  title: "표지 그림 해설도",
  src: "/voyager/golden-cover-diagram.jpg",
  width: 2000,
  height: 1533,
  id: "NASA/JPL",
  href: NASA_COVER,
};

/** 표지 사진 위 표식 위치(%)와 해설 */
const COVER_SPOTS = [
  {
    x: 28,
    y: 31,
    title: "재생 방법",
    body: "음반과 바늘을 위에서 본 그림. 바늘은 처음부터 재생하는 자리에 놓여 있고, 바깥에서 안쪽으로 돕니다. 둘레의 2진수는 한 바퀴가 3.6초라는 뜻으로, 수소 원자 전이 주기(0.70×10⁻⁹초)를 단위로 적었습니다.",
  },
  {
    x: 29,
    y: 51,
    title: "옆에서 본 모습",
    body: "음반과 카트리지를 옆에서 본 그림. 아래 2진수는 한 면을 재생하는 시간, 약 1시간을 나타냅니다.",
  },
  {
    x: 66,
    y: 26,
    title: "그림 신호",
    body: "그림이 시작될 때 나오는 신호와 그림 1·2·3번째 줄의 파형. 2진수는 한 줄을 훑는 데 약 8밀리초가 걸린다는 뜻입니다.",
  },
  {
    x: 66,
    y: 52,
    title: "그림 맞추기",
    body: "세로줄을 번갈아 그려 512줄이 모이면 그림 한 장이 됩니다. 아래 원은 첫 그림의 견본이라, 해독이 맞았는지 확인하고 가로세로 비율을 맞추는 기준이 됩니다.",
  },
  {
    x: 32,
    y: 72,
    title: "펄서 지도",
    body: "펄서 14개를 기준으로 태양계의 위치를 나타낸 지도. 선마다 새긴 2진수가 펄서의 주기입니다. 파이어니어 10·11호 금속판에 실린 지도와 같습니다.",
  },
  {
    x: 66,
    y: 82,
    title: "수소 원자",
    body: "가장 낮은 두 상태의 수소 원자. 두 상태 사이를 오가는 시간이 표지 그림과 그림 해독 전체에 쓰는 시간 단위입니다.",
  },
];

/** NASA 목록 순서 그대로(27곡) */
const MUSIC: [string, string, string, string][] = [
  ["독일", "Bach, Brandenburg Concerto No. 2 in F. First Movement", "Munich Bach Orchestra, Karl Richter", "4:40"],
  ["자와", 'court gamelan, "Kinds of Flowers"', "recorded by Robert Brown", "4:43"],
  ["세네갈", "percussion", "recorded by Charles Duvelle", "2:08"],
  ["자이르", "Pygmy girls' initiation song", "recorded by Colin Turnbull", "0:56"],
  ["오스트레일리아", 'Aborigine songs, "Morning Star" and "Devil Bird"', "recorded by Sandra LeBrun Holmes", "1:26"],
  ["멕시코", '"El Cascabel"', "Lorenzo Barcelata and the Mariachi México", "3:14"],
  ["미국", '"Johnny B. Goode"', "Chuck Berry", "2:38"],
  ["뉴기니", "men's house song", "recorded by Robert MacLennan", "1:20"],
  ["일본", 'shakuhachi, "Tsuru No Sugomori" ("Crane\'s Nest")', "Goro Yamaguchi", "4:51"],
  ["독일", 'Bach, "Gavotte en rondeaux" from the Partita No. 3 in E major for Violin', "Arthur Grumiaux", "2:55"],
  ["오스트리아", "Mozart, The Magic Flute, Queen of the Night aria, no. 14", "Edda Moser, Bavarian State Opera, Wolfgang Sawallisch", "2:55"],
  ["조지아", 'chorus, "Tchakrulo"', "collected by Radio Moscow", "2:18"],
  ["페루", "panpipes and drum", "collected by Casa de la Cultura, Lima", "0:52"],
  ["미국", '"Melancholy Blues"', "Louis Armstrong and his Hot Seven", "3:05"],
  ["아제르바이잔", "bagpipes", "recorded by Radio Moscow", "2:30"],
  ["러시아", "Stravinsky, Rite of Spring, Sacrificial Dance", "Columbia Symphony Orchestra, Igor Stravinsky", "4:35"],
  ["독일", "Bach, The Well-Tempered Clavier, Book 2, Prelude and Fugue in C, No. 1", "Glenn Gould", "4:48"],
  ["독일", "Beethoven, Fifth Symphony, First Movement", "Philharmonia Orchestra, Otto Klemperer", "7:20"],
  ["불가리아", '"Izlel je Delyo Hagdutin"', "Valya Balkanska", "4:59"],
  ["미국", "Navajo Indians, Night Chant", "recorded by Willard Rhodes", "0:57"],
  ["영국", 'Holborne, "The Fairie Round"', "David Munrow and the Early Music Consort of London", "1:17"],
  ["솔로몬 제도", "panpipes", "collected by the Solomon Islands Broadcasting Service", "1:12"],
  ["페루", "wedding song", "recorded by John Cohen", "0:38"],
  ["중국", 'ch\'in, "Flowing Streams"', "Kuan P'ing-hu", "7:37"],
  ["인도", 'raga, "Jaat Kahan Ho"', "Surshri Kesar Bai Kerkar", "3:30"],
  ["미국", '"Dark Was the Night"', "Blind Willie Johnson", "3:15"],
  ["독일", "Beethoven, String Quartet No. 13 in B flat, Opus 130, Cavatina", "Budapest String Quartet", "6:37"],
];

// 화면 문구(한국어·영어)
const GR = {
  ko: {
    tabs: ["레코드", "담긴 것", "표지 해설"],
    dialog: "골든 레코드",
    sub: "보이저에 실어 보낸 지구의 소리와 그림",
    close: "닫기",
    record: "골든 레코드",
    cover: "골든 레코드 표지",
    diagram: "표지 그림 해설도",
    zoomRecord: "골든 레코드 원본 크기로 보기",
    recordAlt: "'The Sounds of Earth' 라벨이 붙은 금빛 음반",
    facts: [
      "지름 12인치(약 30cm), 금으로 도금한 구리 음반입니다.",
      "보이저 1호와 2호에 한 장씩 실려 1977년에 떠났습니다.",
      "알루미늄 덮개에 넣고, 재생할 카트리지와 바늘을 함께 실었습니다. 분당 16⅔회전으로 재생합니다.",
      "가운데 라벨에는 ‘The Sounds of Earth’, 그 둘레에는 ‘To the makers of music — all worlds, all time’이 손으로 새겨져 있습니다.",
      "칼 세이건(코넬대)이 이끈 위원회가 담을 내용을 골랐습니다.",
    ],
    images: "아날로그 신호로 기록된 115장의 그림",
    imagesBody: "NASA 갤러리에서 그중 48장을 볼 수 있습니다.",
    openGallery: "NASA 갤러리 열기 ↗",
    greetings: "55개 언어로 된 인사말",
    greetingsBody: "6천 년 전 수메르에서 쓰던 아카드어로 시작해 중국 방언 우어로 끝납니다.",
    greetingsPlayer: "55개 언어 인사말",
    sounds: "파도·바람·천둥 같은 자연의 소리와 새, 고래 등 여러 동물의 울음을 담은 지구의 소리",
    soundsPlayer: "지구의 소리",
    music: "약 90분 분량의 음악 27곡",
    fullList: "NASA 원문에서 전체 목록 보기",
    soundcloud: "NASA 공식 SoundCloud",
    nasaSource: "NASA 원문",
    coverAlt: "재생 방법과 지구의 위치를 그림으로 새긴 금빛 표지",
    uranium:
      "표지 한 면의 지름 2cm쯤 되는 동그란 자리에 아주 순수한 우라늄-238을 얇게 도금해 두었습니다(약 0.00026 µCi). 우라늄-238은 45억 1천만 년이 지나야 양이 절반으로 줄어듭니다. 그래서 누군가 이 레코드를 발견해 남은 양을 재면, 레코드가 지구를 떠난 지 얼마나 됐는지 알 수 있습니다.",
    coverOriginal: "표지 원본",
    nasaDiagram: "NASA 해설도",
    footer: "사진·자료 NASA/JPL-Caltech",
  },
  en: {
    tabs: ["Record", "Contents", "Cover"],
    dialog: "Golden Record",
    sub: "Sounds and images of Earth sent aboard Voyager",
    close: "Close",
    record: "Golden Record",
    cover: "Golden Record cover",
    diagram: "Cover diagram explained",
    zoomRecord: "View the Golden Record at full size",
    recordAlt: "Golden disc labeled 'The Sounds of Earth'",
    facts: [
      "A 12-inch (about 30 cm) gold-plated copper disc.",
      "One copy flew on each of Voyager 1 and 2, leaving in 1977.",
      "Packed in an aluminum jacket together with a cartridge and needle to play it. It plays at 16⅔ revolutions per minute.",
      "The center label reads ‘The Sounds of Earth’, and ‘To the makers of music — all worlds, all time’ is hand-etched around it.",
      "A committee chaired by Carl Sagan of Cornell University chose what went on it.",
    ],
    images: "115 images encoded as analog signals",
    imagesBody: "48 of them can be viewed in NASA's gallery.",
    openGallery: "Open NASA gallery ↗",
    greetings: "Greetings in 55 languages",
    greetingsBody: "Beginning with Akkadian, spoken in Sumer about 6,000 years ago, and ending with Wu, a Chinese dialect.",
    greetingsPlayer: "Greetings in 55 languages",
    sounds: "Sounds of Earth — natural sounds such as surf, wind and thunder, and the calls of birds, whales and other animals",
    soundsPlayer: "Sounds of Earth",
    music: "27 pieces of music, about 90 minutes in all",
    fullList: "See the full list at NASA",
    soundcloud: "NASA on SoundCloud",
    nasaSource: "NASA source",
    coverAlt: "Golden cover etched with how to play the record and where Earth is",
    uranium:
      "A small circle about 2 cm across on the cover is electroplated with ultra-pure uranium-238 (about 0.00026 µCi). Uranium-238 takes 4.51 billion years for half of it to decay. So anyone who finds the record can measure what remains and tell how long ago it left Earth.",
    coverOriginal: "Cover original",
    nasaDiagram: "NASA diagram",
    footer: "Photos & data NASA/JPL-Caltech",
  },
};

const COVER_SPOTS_EN = [
  {
    title: "How to play",
    body: "The record and stylus seen from above. The stylus sits in position to play from the beginning, and the record plays from the outside in. The binary code around it says one rotation takes 3.6 seconds, written in units of the hydrogen transition period (0.70×10⁻⁹ s).",
  },
  { title: "Side view", body: "The record and cartridge seen from the side. The binary code below gives the playing time of one side, about one hour." },
  {
    title: "Picture signal",
    body: "The signal that marks the start of a picture, and the waveforms of its first three lines. The binary code means one line takes about 8 milliseconds to scan.",
  },
  {
    title: "Building a picture",
    body: "Vertical lines drawn in alternation add up to 512 lines for one picture. The circle below is the first picture as a sample, a reference for checking the decoding and getting the aspect ratio right.",
  },
  {
    title: "Pulsar map",
    body: "A map showing the solar system's location relative to 14 pulsars. The binary code on each line is that pulsar's period. It is the same map carried on the Pioneer 10 and 11 plaques.",
  },
  {
    title: "Hydrogen atom",
    body: "A hydrogen atom in its two lowest states. The time it takes to switch between them is the unit of time for the cover diagrams and for decoding the pictures.",
  },
];

const COUNTRY_EN: Record<string, string> = {
  독일: "Germany",
  자와: "Java",
  세네갈: "Senegal",
  자이르: "Zaire",
  오스트레일리아: "Australia",
  멕시코: "Mexico",
  미국: "USA",
  뉴기니: "New Guinea",
  일본: "Japan",
  오스트리아: "Austria",
  조지아: "Georgia",
  페루: "Peru",
  아제르바이잔: "Azerbaijan",
  러시아: "Russia",
  불가리아: "Bulgaria",
  영국: "England",
  "솔로몬 제도": "Solomon Islands",
  중국: "China",
  인도: "India",
};

// NASA 골든 레코드 페이지(greetings·sounds)에 걸린 NASA 공식 SoundCloud 재생목록.
// 누를 때만 SoundCloud 플레이어를 불러와, 듣지 않으면 외부에 접속하지 않는다.
const GREETINGS_ID = "129056482";
const SOUNDS_ID = "129030648";
const NASA_GREETINGS = "https://science.nasa.gov/mission/voyager/golden-record-contents/greetings/";
const NASA_SOUNDS = "https://science.nasa.gov/mission/voyager/golden-record-contents/sounds/";
const NASA_IMAGES = "https://science.nasa.gov/gallery/images-on-the-golden-record/";

const scSrc = (id: string) =>
  `https://w.soundcloud.com/player/?url=${encodeURIComponent(`https://api.soundcloud.com/playlists/${id}`)}&color=%23f8d878&auto_play=false&hide_related=true&show_comments=false&show_reposts=false&visual=false`;

/** NASA 공식 SoundCloud 재생목록. 항목을 펼칠 때만 플레이어를 불러온다(재생은 플레이어에서 직접) */
function Player({ id, title, href }: { id: string; title: string; href: string }) {
  const g = GR[useLang()];
  return (
    <div className="flex flex-col gap-2">
      <iframe title={`${title} — ${g.soundcloud}`} className="block h-[300px] w-full" allow="autoplay" src={scSrc(id)} />
      <p className="text-[var(--mute)]">
        {g.soundcloud} ·{" "}
        <a href={href} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-[var(--yellow)]">
          {g.nasaSource}
        </a>
      </p>
    </div>
  );
}

/** 담긴 것 한 줄. 누르면 아래로 펼쳐진다 */
function Item({ label, open, onToggle, children }: { label: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <li className={v.frame}>
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full items-start gap-2 px-3 py-2 text-left text-[#d8daf0] hover:text-[var(--yellow)] focus-visible:outline-2 focus-visible:outline-[var(--yellow)]"
      >
        <span aria-hidden className={`shrink-0 transition-transform ${open ? "rotate-90 text-[var(--yellow)]" : ""}`}>
          ▸
        </span>
        <span className={open ? "text-[var(--yellow)]" : ""}>{label}</span>
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </li>
  );
}

export default function GoldenRecord({ onClose, onZoom }: { onClose: () => void; onZoom: (z: ZoomTarget) => void }) {
  const [tab, setTab] = useState(0);
  const lang = useLang();
  const g = GR[lang];
  const spots = lang === "en" ? COVER_SPOTS.map((s, i) => ({ ...s, ...COVER_SPOTS_EN[i] })) : COVER_SPOTS;
  const record = { ...RECORD, title: g.record };
  const cover = { ...COVER, title: g.cover };
  const diagram = { ...DIAGRAM, title: g.diagram };
  const [spot, setSpot] = useState(0);
  const [item, setItem] = useState<number | null>(null);
  const toggle = (i: number) => setItem((k) => (k === i ? null : i));
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => closeRef.current?.focus(), []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={g.dialog}
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-[#05060f]/80 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        // 탭마다 내용 길이가 달라도 창 크기는 그대로 두고, 안쪽만 스크롤한다
        className={`flex h-full w-full max-w-3xl flex-col sm:h-[min(31rem,100%)] ${v.frameActive}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 pt-3 pb-2">
          <Sprite name="record" scale={3} />
          <div className="mr-auto leading-tight">
            <p className="font-bold text-[var(--yellow)]">THE GOLDEN RECORD</p>
            <p className="text-[var(--mute)]">{g.sub}</p>
          </div>
          <button ref={closeRef} type="button" className={v.btn} onClick={onClose} aria-label={g.close}>
            ✕
          </button>
          <div className="flex basis-full gap-1" role="tablist">
            {g.tabs.map((t, i) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === i}
                className={`${v.tab} px-2`}
                onClick={() => setTab(i)}
              >
                {t}
              </button>
            ))}
          </div>
        </header>

        <div className={`min-h-0 flex-1 overflow-y-auto px-4 pt-1 pb-4 ${v.scroller}`}>
          {tab === 0 && (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <button type="button" className={`${v.photoBtn} shrink-0 self-center`} onClick={() => onZoom(record)} aria-label={g.zoomRecord}>
                <Image
                  src={RECORD.src}
                  alt={g.recordAlt}
                  width={RECORD.width}
                  height={RECORD.height}
                  unoptimized
                  style={{ display: "block", width: "auto", height: "auto", maxWidth: "min(100%, 300px)", maxHeight: "40vh" }}
                />
              </button>
              <ul className="flex flex-col gap-2 text-[#d8daf0]">
                {g.facts.map((f) => (
                  <li key={f}>▸ {f}</li>
                ))}
              </ul>
            </div>
          )}

          {tab === 1 && (
            <ul className="flex flex-col gap-2">
              <Item label={g.images} open={item === 0} onToggle={() => toggle(0)}>
                <p className="mb-2 text-[#d8daf0]">{g.imagesBody}</p>
                <a href={NASA_IMAGES} target="_blank" rel="noreferrer" className={`${v.btn} inline-flex`}>
                  {g.openGallery}
                </a>
              </Item>
              <Item label={g.greetings} open={item === 1} onToggle={() => toggle(1)}>
                <p className="mb-2 text-[#d8daf0]">{g.greetingsBody}</p>
                <Player id={GREETINGS_ID} title={g.greetingsPlayer} href={NASA_GREETINGS} />
              </Item>
              <Item
                label={g.sounds}
                open={item === 2}
                onToggle={() => toggle(2)}
              >
                <Player id={SOUNDS_ID} title={g.soundsPlayer} href={NASA_SOUNDS} />
              </Item>
              <Item label={g.music} open={item === 3} onToggle={() => toggle(3)}>
                <ol className="flex flex-col">
                  {MUSIC.map(([country, title, artist, len], i) => (
                    <li key={i} className="grid grid-cols-[2rem_1fr_auto] gap-x-2 py-1" style={{ boxShadow: "inset 0 -1px 0 0 #2a2e6c" }}>
                      <span className="text-[var(--mute)] tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                      <span className="min-w-0">
                        <span className="text-[var(--cyan)]">{lang === "en" ? (COUNTRY_EN[country] ?? country) : country}</span> {title}
                        <span className="block text-[var(--mute)]">{artist}</span>
                      </span>
                      <span className="tabular-nums text-[var(--mute)]">{len}</span>
                    </li>
                  ))}
                </ol>
                <a href={NASA_RECORD} target="_blank" rel="noreferrer" className="mt-2 inline-block underline underline-offset-2 hover:text-[var(--yellow)]">
                  {g.fullList}
                </a>
              </Item>
            </ul>
          )}

          {tab === 2 && (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              {/* 폭을 감싼 칸에 직접 줘야 번호 표식(%)이 사진 위 제자리에 놓인다 */}
              <div className="relative shrink-0 self-center" style={{ width: "min(100%, 360px, 48vh)" }}>
                <Image
                  src={COVER.src}
                  alt={g.coverAlt}
                  width={COVER.width}
                  height={COVER.height}
                  unoptimized
                  style={{ display: "block", width: "100%", height: "auto" }}
                />
                {spots.map((s, i) => (
                  <button
                    key={s.title}
                    type="button"
                    aria-label={`${i + 1}. ${s.title}`}
                    aria-pressed={spot === i}
                    onClick={() => setSpot(i)}
                    className={`absolute grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center font-bold ${v.spot}`}
                    style={{ left: `${s.x}%`, top: `${s.y}%` }}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <div className={`grid px-3 py-2 ${v.frame}`} aria-live="polite">
                  {spots.map((c, i) => (
                    <div key={c.title} className={`col-start-1 row-start-1 ${spot === i ? "" : "invisible"}`} aria-hidden={spot !== i}>
                      <p className="font-bold text-[var(--yellow)]">
                        {i + 1}. {c.title}
                      </p>
                      <p className="text-[#d8daf0]">{c.body}</p>
                    </div>
                  ))}
                </div>
                <p className="text-[#d8daf0]">
                  {g.uranium}
                </p>
                <div className="flex flex-wrap gap-3">
                  <button type="button" className={v.btn} onClick={() => onZoom(cover)}>
                    {g.coverOriginal}
                  </button>
                  <button type="button" className={v.btn} onClick={() => onZoom(diagram)}>
                    {g.nasaDiagram}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        <p className="px-4 pb-2 text-[var(--mute)]">{g.footer}</p>
      </div>
    </div>
  );
}
