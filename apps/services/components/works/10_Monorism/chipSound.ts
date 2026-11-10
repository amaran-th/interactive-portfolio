// 칩 소리. 녹음 파일 없이 짧은 노이즈 버스트와 고음 클릭을 섞어 "딱"을 만든다.
// AudioContext는 브라우저 자동 재생 정책 때문에 첫 사용자 입력(unlock) 때 만든다.
import type { Tool } from "./board";

const MIN_INTERVAL_MS = 30;

export function createChipSound() {
  let ctx: AudioContext | null = null;
  let noise: AudioBuffer | null = null;
  let muted = false;
  let last = 0;

  function ensure(): AudioContext {
    if (!ctx) {
      ctx = new AudioContext();
      noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.05), ctx.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  }

  return {
    unlock() {
      ensure();
    },
    setMuted(m: boolean) {
      muted = m;
    },
    play(kind: Tool) {
      if (muted) return;
      const nowMs = performance.now();
      if (nowMs - last < MIN_INTERVAL_MS) return;
      last = nowMs;
      const c = ensure();
      const t = c.currentTime;
      // 빼기·놓기는 조금 낮게, 칩마다 ±10% 흔든다
      const pitch = (kind === "flip" ? 1 : 0.75) * (0.9 + Math.random() * 0.2);

      const src = c.createBufferSource();
      src.buffer = noise;
      const band = c.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.value = 3000 * pitch;
      band.Q.value = 1.2;
      const noiseGain = c.createGain();
      noiseGain.gain.setValueAtTime(0.5, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      src.connect(band).connect(noiseGain).connect(c.destination);
      src.start(t);
      src.stop(t + 0.05);

      const osc = c.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(2400 * pitch, t);
      osc.frequency.exponentialRampToValueAtTime(900 * pitch, t + 0.02);
      const oscGain = c.createGain();
      oscGain.gain.setValueAtTime(0.25, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);
      osc.connect(oscGain).connect(c.destination);
      osc.start(t);
      osc.stop(t + 0.03);
    },
    dispose() {
      void ctx?.close();
      ctx = null;
    },
  };
}
