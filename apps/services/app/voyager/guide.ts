import type { ToolGuideContent } from "../_components/ToolGuide";

export const voyagerGuide: ToolGuideContent = {
  name: "49년만에 도달한 1일",
  intro: [
    "보이저 1호는 2026년 11월 18일 05:16:07 EST(10:16:07 UTC)에 지구에서 1광일, 곧 빛으로 24시간 걸리는 25,902,068,356km 거리에 닿았습니다. 인류가 만든 물체로는 처음입니다.",
    "이 페이지는 1977년 발사부터 1광일 도달까지 보이저 1호가 찍은 사진 9장과 주요 기록 16개를 한 줄로 이어 보여 줍니다. 아래 거리 패널은 지금 보는 지점에서 보이저가 지구와 얼마나 떨어졌는지 막대나 레이더로 보여 줍니다. 보이저에 실어 보낸 골든 레코드도 열어 볼 수 있고, 1광일 너머로 넘어가면 엔딩이 이어집니다. 사진은 NASA Photojournal의 원본 JPEG를 그대로 씁니다.",
  ],
  steps: [
    {
      title: "연대기 따라가기",
      body: "처음 들어오면 조작 안내와 소리 버튼이 뜹니다. 스피커 아이콘으로 배경음을 켜거나 끄고 '시작하기'를 누릅니다. 그 뒤 마우스 휠, 드래그, 키보드 ←→ 방향키, 위쪽 ◀▶ 버튼으로 기록 사이를 옮겨 다닙니다. Home 키는 발사로, End 키는 1광일 도달로 바로 갑니다. 보이저는 화면 가운데에 머물고 기록이 그 밑을 지나가며, 가운데 온 카드의 글자는 타이핑하듯 찍힙니다.",
    },
    {
      title: "좌표 읽기",
      body: "선 위의 도트 아이콘이 기록 하나입니다. 아래에 날짜와 발사 후 지난 날 수(T+일)가 붙습니다. 카드에 적힌 '목성에서 28만 km' 같은 거리는 NASA 캡션의 값으로, 행성이나 위성을 기준으로 잰 것입니다. 아이콘을 누르면 그 기록으로 이동합니다.",
    },
    {
      title: "거리 패널",
      body: "화면 아래 패널은 가운데 지점에서 보이저와 지구 사이 거리를 km와 AU로, 빛이 그 거리를 가는 데 걸리는 시간과 함께 보여 줍니다. 오른쪽 위에서 '막대'와 '레이더'를 바꿉니다. 막대는 왼쪽 끝 태양부터 오른쪽 끝 지금의 보이저까지를 실제 비율로 펼치고, 그 사이 지구(출발)에서 보이저까지 흐르는 점선이 지나온 길입니다. 행성과 카이퍼 벨트, 말단 충격, 태양권 끝은 보이저가 그 거리를 넘었을 때부터 보입니다. 범례의 이름에 마우스를 올리면 태양에서의 평균 거리가 나옵니다.",
    },
    {
      title: "레이더 보기",
      body: "레이더는 태양을 가운데 두고 행성들이 도는 판(황도면)을 비스듬히 내려다본 3D 화면입니다. 보이저가 지나온 실제 경로를 선으로 긋고, 황도면에서 얼마나 위로 올라갔는지 점선으로 내려 보여 줍니다. 보이저 1호는 토성을 지난 뒤 황도면 북쪽으로 약 35° 기울어진 길을 갑니다. 화면을 끌면 시점이 돌아갑니다.",
    },
    {
      title: "정보 패널",
      body: "DATE와 MISSION은 화면 가운데 지점의 날짜와 발사 후 날 수입니다. ◀ ▶로 이전·다음 기록으로 가고, '골든 레코드'를 누르면 실어 보낸 음반을 보고, 스피커 아이콘으로 배경음을 켜고 끕니다. 기록 사이를 지날 때 날짜는 앞뒤 기록 날짜 사이를 고르게 나눈 값이라 대략적인 위치이고, 거리 패널은 그 날짜의 값을 한 달 간격 궤도표에서 읽어 옵니다.",
    },
    {
      title: "골든 레코드 보기",
      body: "위쪽 정보 패널의 '골든 레코드' 버튼을 누르면 열립니다. '레코드'에서는 음반 사진과 생김새, '담긴 것'에서는 그림·인사말·지구의 소리·음악을 하나씩 펼쳐 봅니다(그림은 NASA 갤러리로 연결, 인사말과 지구의 소리는 펼치면 NASA 공식 SoundCloud 플레이어가 떠서 재생, 음악은 27곡 목록), '표지 해설'에서는 표지 사진 위 번호를 눌러 그림마다 뜻을 봅니다. Esc나 ✕로 닫습니다.",
    },
    {
      title: "사진 원본 보기",
      body: "카드의 사진을 누르면 화면에 맞춰 크게 엽니다(원본보다 키우지는 않습니다). '원본 크기'를 누르면 원본 픽셀 그대로 보고, 화면보다 크면 스크롤합니다. Esc나 ✕로 닫습니다. 창백한 푸른 점은 1990년 원본과 2020년 재처리판을 탭으로 바꿔 봅니다.",
    },
    {
      title: "1광일, 그리고 엔딩",
      body: "1광일 돌파 지점에 오면 축하 폭죽이 터집니다. 거기서 ▶나 →를 누르거나 휠을 더 굴리면 엔딩이 시작됩니다. 앞으로 이어지던 점선이 끊기고 지나온 기록이 뒤로 흘러가는 동안, 보이저가 처음 본 곳으로 뒤이어 간 탐사선과 망원경(갈릴레오호, 카시니-하위헌스호, 뉴호라이즌스호, 주노호, 제임스 웹 우주 망원경, 유로파 클리퍼호, IMAP)의 크레딧이 한 장씩 뜨고 그들이 찍은 사진이 옆에 쌓입니다. '다음 ▶' 버튼이나 →·Enter로 넘기고 ←로 이전 장을 봅니다. 다 보면 별빛이 하나씩 꺼지고 보이저와 위아래 패널이 사라진 뒤 '지구로 돌아가기'로 처음부터 다시 봅니다. Esc나 '엔딩 닫기'로 언제든 1광일 지점으로 돌아옵니다.",
    },
  ],
  notes: [
    {
      title: "사진을 키우지 않는 이유",
      body: "카드 안에서는 칸보다 큰 사진만 줄이고, 작은 사진은 키우지 않습니다. 이오의 화산 분출 사진은 원본이 140×140픽셀이라 그 크기 그대로 보입니다. 각 사진 아래 번호(PIA)를 누르면 NASA 원문 페이지로 갑니다.",
    },
    {
      title: "날짜와 수치의 출처",
      body: "날짜·거리·설명은 NASA Photojournal 캡션, 2026년 11월 19일 NASA 보도자료, NASA 보이저 1호 미션 페이지에 적힌 값만 옮겼습니다. 출처끼리 수치가 다르면 NASA 미션 페이지 값을 씁니다. 목성 최근접 거리(28만 km)가 그런 예입니다.",
    },
    {
      title: "거리는 어디서 가져왔나요",
      body: "거리 패널의 값은 NASA/JPL Horizons 궤도 계산 서비스에서 받은 보이저 1호(-31)의 지구 거리, 태양 거리, 태양 중심 황도 경도·위도입니다. 기록 시각의 지구 거리는 그 시각 그대로, 기록 사이는 1977년 9월부터 한 달 간격으로 받은 표를 이어 계산합니다. 1광일 도달 지점은 NASA 발표 거리(25,902,068,356km)를 씁니다. Horizons 값과의 차이는 0.01%가 안 됩니다. 행성 위치와 궤도는 평균 궤도 반지름과 공전 주기로 그린 원 궤도 근사이고, 카이퍼 벨트(약 30~50AU)는 어림 범위입니다.",
    },
    {
      title: "배경음",
      body: "배경음은 Synth-thetic이 만든 'Cosmic Navigation'으로, 누구나 자유롭게 쓰도록 CC0로 공개된 곡입니다(OpenGameArt). 작가가 반복용으로 낸 2분 33초짜리 파일을 이 사이트에 두고, 이음매 없이 이어서 반복 재생합니다. 처음에는 꺼져 있고 스피커 아이콘으로 켜고 끕니다.",
    },
    {
      title: "시간이 비는 구간",
      body: "기록 사이가 3년 넘게 비면 선 아래에 '··· 8년 ···'처럼 흐른 햇수를 표시합니다. 기록은 같은 간격으로 늘어놓았으므로 선 위 거리가 실제 시간에 비례하지 않습니다.",
    },
  ],
  faq: [
    {
      q: "1광일은 얼마나 먼가요?",
      a: "빛이 24시간 동안 가는 거리로, 25,902,068,356km입니다. 지금 보이저 1호에 명령을 보내면 도착하는 데 하루, 답이 돌아오는 데 또 하루가 걸립니다.",
    },
    {
      q: "보이저 1호는 지금도 사진을 찍나요?",
      a: "아니요. 1990년 2월 14일, 창백한 푸른 점을 찍고 34분 뒤 카메라를 영영 껐습니다. 고장이 아니라 전력을 아끼려는 결정이었고, 더는 가까이 지나갈 천체도 없었습니다. 그 뒤의 기록은 사진 없이 LOG 카드로 보여 줍니다.",
    },
    {
      q: "입력하거나 저장하는 정보가 있나요?",
      a: "없습니다. 이 페이지는 아무것도 저장하지 않고, 사진과 글꼴도 이 사이트에서 직접 불러옵니다. 배경음도 이 사이트에서 직접 불러옵니다. 골든 레코드에서 인사말이나 지구의 소리를 펼칠 때만 SoundCloud 서버에 접속합니다. NASA 원문 링크는 누를 때만 열립니다.",
    },
  ],
};

export const voyagerGuideEn: ToolGuideContent = {
  name: "49 Years to One Light-Day",
  intro: [
    "On November 18, 2026 at 05:16:07 EST (10:16:07 UTC), Voyager 1 reached one light-day from Earth: 25,902,068,356 km, the distance light travels in 24 hours. It is the first human-made object to get this far.",
    "This page lines up the photos Voyager 1 took and 16 key moments from its 1977 launch to the one-light-day mark. The distance panel at the bottom shows, as a bar or a radar view, how far Voyager is from Earth at the point you are looking at. You can also open the Golden Record it carries, and moving past one light-day leads into an ending. The photos are the original JPEGs from NASA's Photojournal.",
  ],
  steps: [
    {
      title: "Follow the chronicle",
      body: "When you arrive, a short guide and a sound button appear. Use the speaker icon to turn the music on or off, then press 'Start'. Move between entries with the mouse wheel, by dragging, with the ← → arrow keys, or with the ◀ ▶ buttons at the top. Home jumps to the launch and End to the one-light-day mark. Voyager stays in the middle of the screen while the entries pass beneath it, and the text of the centered card types itself out.",
    },
    {
      title: "Reading the timeline",
      body: "Each pixel icon on the line is one entry, with its date and the days since launch (T+ days) below. Distances on a card such as '280,000 km from Jupiter' come from NASA's captions and are measured from that planet or moon. Click an icon to jump to that entry.",
    },
    {
      title: "Distance panel",
      body: "The panel at the bottom shows the distance between Voyager and Earth at the center point in km and AU, along with how long light takes to cross it. Switch between 'Bar' and 'Radar' at the top right. The bar lays out the Sun (left end) to Voyager now (right end) to scale; the dashed line flowing from Earth (Start) toward Voyager is the path traveled. Planets, the Kuiper Belt, the termination shock and the heliopause appear once Voyager has gone past them. Hover over a name in the legend to see its average distance from the Sun.",
    },
    {
      title: "Radar view",
      body: "The radar is a 3D view looking down at an angle on the plane where the planets orbit the Sun (the ecliptic). It draws Voyager's actual path and drops a dotted line to show how far above the ecliptic it has climbed. After Saturn, Voyager 1 travels on a path tilted about 35° north of the ecliptic. Drag to rotate the view.",
    },
    {
      title: "Info panel",
      body: "DATE and MISSION are the date and days since launch at the center of the screen. ◀ ▶ go to the previous or next entry, 'Golden Record' opens the record Voyager carries, and the speaker icon turns the music on and off. Between entries, the date is spread evenly between the neighboring entries, so it is approximate; the distance panel reads the value for that date from a monthly trajectory table.",
    },
    {
      title: "The Golden Record",
      body: "Press 'Golden Record' in the info panel to open it. 'Record' shows a photo of the disc and what it is made of. In 'Contents' you can expand the images, greetings, sounds of Earth and music one by one (images link to NASA's gallery; expanding the greetings or sounds loads NASA's official SoundCloud player; music lists all 27 pieces). In 'Cover', click the numbers on the cover photo to see what each drawing means. Close with Esc or ✕.",
    },
    {
      title: "Viewing photos",
      body: "Click a photo on a card to open it fitted to the screen (never enlarged beyond its original size). Press 'Actual size' to see it pixel for pixel, scrolling if it is larger than the screen. Close with Esc or ✕. For the Pale Blue Dot, switch between the 1990 original and the 2020 reprocessed version with the tabs.",
    },
    {
      title: "One light-day, and the ending",
      body: "Fireworks go off when you reach the one-light-day mark. Press ▶ or →, or keep scrolling, to start the ending. The dashed line ahead is cut and the past entries drift away, while credits appear one by one for the spacecraft and telescope that followed where Voyager first looked (Galileo, Cassini-Huygens, New Horizons, Juno, the James Webb Space Telescope, Europa Clipper, IMAP), with their photos piling up beside them. Press 'Next ▶', → or Enter to continue and ← to go back. At the end, the stars go out one by one, Voyager and the panels disappear, and 'Return to Earth' takes you back to the start. Press Esc or 'Close ending' at any time to return to the one-light-day mark.",
    },
  ],
  notes: [
    {
      title: "Why photos aren't enlarged",
      body: "Inside a card, only photos larger than the space are scaled down; small ones are never enlarged. The Io eruption image is 140×140 pixels in the original, so it appears at that size. Click the number (PIA) under each photo to open NASA's page.",
    },
    {
      title: "Where dates and figures come from",
      body: "Dates, distances and descriptions are taken only from NASA Photojournal captions, NASA's November 19, 2026 news release and NASA's Voyager 1 mission pages. Where sources disagree, the mission page value is used — the closest approach to Jupiter (280,000 km) is one example.",
    },
    {
      title: "Where do the distances come from?",
      body: "The distance panel uses Voyager 1's (-31) distance from Earth, distance from the Sun, and heliocentric ecliptic longitude and latitude from NASA/JPL's Horizons system. At each entry the distance is the value for that moment; between entries it is interpolated from a monthly table starting in September 1977. The one-light-day point uses NASA's announced distance (25,902,068,356 km), less than 0.01% off the Horizons value. Planet positions and orbits are circular approximations from mean orbital radius and period, and the Kuiper Belt (about 30–50 AU) is a rough range.",
    },
    {
      title: "Music",
      body: "The music is 'Cosmic Navigation' by Synth-thetic, released under CC0 for anyone to use freely (OpenGameArt). The 2 min 33 s loop file the artist provided is hosted on this site and plays seamlessly on repeat. It starts off; turn it on or off with the speaker icon.",
    },
    {
      title: "Gaps in time",
      body: "When more than three years pass between entries, the years elapsed are shown under the line, like '··· 8 yr ···'. Entries are spaced evenly, so distance along the line is not proportional to time.",
    },
  ],
  faq: [
    {
      q: "How far is one light-day?",
      a: "The distance light travels in 24 hours: 25,902,068,356 km. A command sent to Voyager 1 now takes a day to arrive, and the reply another day to come back.",
    },
    {
      q: "Does Voyager 1 still take photos?",
      a: "No. On February 14, 1990, 34 minutes after taking the Pale Blue Dot, its cameras were switched off for good. It wasn't a failure but a decision to save power, and there were no more objects to fly close to. Later entries are shown as LOG cards without photos.",
    },
    {
      q: "Does this page collect or store anything?",
      a: "No. This page stores nothing, and the photos, fonts and music all load from this site. It connects to SoundCloud only when you expand the greetings or the sounds of Earth in the Golden Record. Links to NASA open only when you click them.",
    },
  ],
};
