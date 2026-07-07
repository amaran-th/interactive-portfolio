import { NextResponse } from "next/server";

// 목표 영수증 인쇄 기록을 구글 시트(Apps Script 웹앱)로 전달하는 프록시.
// 웹훅 URL은 클라이언트에 노출하지 않고 서버 환경변수로만 둔다.
const MAX_BODY = 20_000; // 20KB 방어

export async function POST(req: Request) {
  const url = process.env.GOALS_SHEET_WEBHOOK_URL;
  // 미설정 시엔 조용히 스킵 — 기록 기능이 꺼져 있어도 인쇄는 정상 동작
  if (!url) {
    return NextResponse.json({ ok: false, skipped: "not-configured" });
  }

  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return NextResponse.json({ ok: false, error: "read-failed" }, { status: 400 });
  }

  if (raw.length > MAX_BODY) {
    return NextResponse.json(
      { ok: false, error: "payload-too-large" },
      { status: 413 },
    );
  }

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 });
  }

  if (typeof data.deviceId !== "string" || data.deviceId.length === 0) {
    return NextResponse.json(
      { ok: false, error: "missing-deviceId" },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: raw,
    });
    const text = await res.text();
    return NextResponse.json(
      { ok: res.ok, upstream: text.slice(0, 200) },
      { status: res.ok ? 200 : 502 },
    );
  } catch {
    return NextResponse.json({ ok: false, error: "upstream-failed" }, {
      status: 502,
    });
  }
}
