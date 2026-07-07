# 목표 영수증 — 인쇄 기록을 구글 시트에 쌓기 (설정 가이드)

인쇄(`인쇄하기`)할 때마다 그 시점의 영수증 상태가 구글 시트에 기록됩니다.
**같은 기기(브라우저)** 는 같은 행이 갱신되고, **새 기기**는 새 행이 추가됩니다.

흐름: 브라우저 → `/api/goals-log`(서버 라우트, 웹훅 URL 은닉) → Apps Script 웹앱 → 구글 시트

> ⚠️ 기기 식별은 브라우저 localStorage 기반이라 "기기"라기보다 **브라우저 프로필** 단위입니다(시크릿창·다른 브라우저는 새 기록). 공개 배포 사이트라 방문자 누구나 인쇄하면 행이 쌓입니다.

---

## 1. 구글 시트 + Apps Script 준비

1. 새 구글 시트를 하나 만든다.
2. 상단 메뉴 **확장 프로그램 → Apps Script**.
3. 기본 코드를 지우고 아래를 붙여넣는다.

```javascript
const SHEET_NAME = 'GoalsReceipt';
const HEADERS = [
  'deviceId', 'year', 'totalPaid', 'subtotal',
  'goalsDone', 'goalsTotal', 'itemsDone', 'itemsTotal',
  'goalsJson', 'settledAt', 'updatedAt',
];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000); // 동시 쓰기 방지
  try {
    const data = JSON.parse(e.postData.contents);
    if (!data.deviceId) {
      return json({ ok: false, error: 'missing-deviceId' });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
    if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);

    const row = [
      data.deviceId,
      data.year || '',
      data.totalPaid || 0,
      data.subtotal || 0,
      data.goalsDone || 0,
      data.goalsTotal || 0,
      data.itemsDone || 0,
      data.itemsTotal || 0,
      JSON.stringify(data.goals || []),
      data.settledAt || '',
      new Date(),
    ];

    // deviceId 로 기존 행 찾기 → 있으면 갱신, 없으면 추가 (업서트)
    const lastRow = sheet.getLastRow();
    let target = -1;
    if (lastRow >= 2) {
      const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (let i = 0; i < ids.length; i++) {
        if (ids[i][0] === data.deviceId) { target = i + 2; break; }
      }
    }
    if (target === -1) sheet.appendRow(row);
    else sheet.getRange(target, 1, 1, row.length).setValues([row]);

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```

4. **배포 → 새 배포 → 유형: 웹 앱**
   - 실행 계정: **나**
   - 액세스 권한: **모든 사용자**
   - 배포하면 나오는 **웹 앱 URL**(`https://script.google.com/macros/s/……/exec`)을 복사한다.

---

## 2. 환경변수 등록

로컬 `.env.local`(레포 루트, git에 커밋하지 말 것):

```
GOALS_SHEET_WEBHOOK_URL=https://script.google.com/macros/s/……/exec
```

Vercel: **Project → Settings → Environment Variables** 에 같은 키/값 추가 후 재배포.

> 미설정 상태에서는 `/api/goals-log` 가 조용히 스킵하므로, 설정 전에도 인쇄는 정상 동작합니다.

---

## 3. 확인

1. `.env.local` 저장 후 **dev 서버 재시작**(새 `app/api` 라우트 인식을 위해 필요).
2. `/goals-passport` 에서 목표를 채우고 `인쇄하기`.
3. 구글 시트 `GoalsReceipt` 탭에 행이 생기는지 확인.
4. 같은 브라우저에서 다시 인쇄 → **같은 행이 갱신**되면 성공.

## 기록되는 컬럼

`deviceId · year · totalPaid · subtotal · goalsDone/goalsTotal · itemsDone/itemsTotal · goalsJson(목표별 상세) · settledAt · updatedAt`
