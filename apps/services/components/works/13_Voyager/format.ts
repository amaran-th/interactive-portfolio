import { AU_KM } from "./horizons";

export const C_KM_S = 299_792.458;
export const LIGHT_DAY_S = 86_400;

/** 1,139만 km · 6.79억 km · 259.0억 km */
export function fmtKm(km: number, lang: "ko" | "en" = "ko"): string {
  if (km < 1) return "0 km";
  if (lang === "en") {
    if (km >= 1e9) return `${(km / 1e9).toFixed(2)} billion km`;
    if (km >= 1e6) return `${(km / 1e6).toFixed(km >= 1e8 ? 0 : 1)} million km`;
    return `${Math.round(km).toLocaleString("en-US")} km`;
  }
  if (km >= 1e8) return `${(km / 1e8).toFixed(km >= 1e10 ? 1 : 2)}억 km`;
  if (km >= 1e4) return `${Math.round(km / 1e4).toLocaleString("ko-KR")}만 km`;
  return `${Math.round(km).toLocaleString("ko-KR")} km`;
}

/** 빛으로 걸리는 시간: '0.4초', '37분 44초', '23시간 59분' */
export function fmtLight(sec: number, lang: "ko" | "en" = "ko"): string {
  const en = lang === "en";
  if (sec < 60) return `${sec < 10 ? sec.toFixed(1) : Math.round(sec)}${en ? " s" : "초"}`;
  if (sec < 3600) {
    const t = Math.round(sec);
    return en ? `${Math.floor(t / 60)} min ${t % 60} s` : `${Math.floor(t / 60)}분 ${t % 60}초`;
  }
  // 한 시간이 넘으면 분 단위로 반올림한다(1광일 = 24시간)
  const t = Math.round(sec / 60);
  const h = Math.floor(t / 60);
  const m = t % 60;
  if (en) return m ? `${h} h ${m} min` : `${h} hours`;
  return m ? `${h}시간 ${m}분` : `${h}시간`;
}

export const auToKm = (au: number) => au * AU_KM;
export const lightSec = (au: number) => auToKm(au) / C_KM_S;
/** 1광일 대비 비율(0~1) */
export const lightDayRatio = (au: number) => lightSec(au) / LIGHT_DAY_S;

