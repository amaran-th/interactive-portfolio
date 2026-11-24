// 게임기 옆에 놓인 종이 설명서. 넓은 화면에선 게임기 왼쪽에, 좁은 화면에선 '설명서' 탭을 눌러 펼친다.
import PixelIcon from "./PixelIcon";
import r from "./retro.module.css";

const KEYS: [string, string, string][] = [
  ["십자키", "방향키 · WASD", "칸 옮기기 · 줄 끝에서 좌우는 목표 넘기기"],
  ["A", "Enter", "고르기 · 입력 시작"],
  ["B", "Esc", "입력 끝내기 · 집은 것 놓기"],
  ["SELECT", "Q", "영수증 스타일 바꾸기"],
  ["START", "E", "영수증 출력"],
];

/** <dialog> 안에 놓인다. 오른쪽 아래 접힌 귀퉁이('알겠어요')가 method="dialog" 폼 단추라 누르면 닫힌다 */
export default function Manual() {
  return (
    <section
      aria-labelledby="yr-manual-title"
      className={`relative px-5 pt-6 pb-20 ${r.paper}`}
    >
      <span aria-hidden className={r.staple} />
      <h2
        id="yr-manual-title"
        className="flex items-center gap-2 font-bold tracking-[0.15em]"
      >
        <PixelIcon name="book" size={16} fill="#2b2a24" />
        사용 설명서
      </h2>
      <p className={`mt-0.5 ${r.paperMute}`}>
        GOAL RECEIPT · 휴대용 목표 정산기
      </p>

      <h3 className={`mt-4 ${r.paperHead}`}>사용법</h3>
      <ol className="mt-1 flex flex-col gap-1.5">
        <li className="flex gap-2">
          <span className="font-bold">1.</span>
          <span>
            &lsquo;목표 추가&rsquo;로 목표 분류를 만들어요.{" "}
            <span className={r.paperMute}>(예: 공부, 습관, 쉼, 일)</span>
          </span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold">2.</span>
          <span>
            분류마다 하위 항목을 적고 유형을 골라요.{" "}
            <span className={r.paperMute}>
              체크는 했다·안 했다, 진행률은 현재값/목표값.
            </span>
          </span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold">3.</span>
          <span>
            목표는 한 장씩 좌우로 넘겨 봐요. 번호 탭을 고르면 좌우로 순서를
            바꿔요.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold">4.</span>
          <span>START로 영수증을 출력하고 이미지로 저장해요.</span>
        </li>
      </ol>

      <h3 className={`mt-4 ${r.paperHead}`}>조작법</h3>
      <table className="mt-1 w-full border-collapse text-left">
        <tbody>
          {KEYS.map(([pad, key, what]) => (
            <tr key={pad} className={r.paperRow}>
              <th
                scope="row"
                className="py-1 pr-2 align-top font-bold whitespace-nowrap"
              >
                {pad}
              </th>
              <td
                className={`py-1 pr-2 align-top whitespace-nowrap ${r.paperMute}`}
              >
                {key}
              </td>
              <td className="py-1 align-top">{what}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className={`mt-4 ${r.paperHead}`}>주의사항</h3>
      <p className="mt-1">
        적은 목표는 이 브라우저에만 저장돼요. 브라우저 데이터를 지우면 함께
        사라지니 영수증 이미지로 남겨 두세요.
      </p>

      <form method="dialog">
        <button className={r.dogEar}>
          <span>알겠어요</span>
        </button>
      </form>
    </section>
  );
}
