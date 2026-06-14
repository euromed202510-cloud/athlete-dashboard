// Google Apps Script - Health Auto Import
// スプレッドシートの「拡張機能」→「Apps Script」に貼り付ける

const SHEET_NAME = 'AutoHealth';
const SECRET_TOKEN = 'athlete2026'; // iOSショートカットと一致させる

function doPost(e) {
  try {
    // Token verification
    const token = e.parameter.token;
    if (token !== SECRET_TOKEN) {
      return ContentService.createTextOutput(JSON.stringify({ error: 'Unauthorized' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // AutoHealthシートがなければ作成
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      // ヘッダー行を追加
      sheet.appendRow([
        'Date', 'ID',
        'HRV (ms)', 'RHR (bpm)', 'SpO2 (%)', 'Resp Rate (/min)',
        'Wrist Temp (℃)', 'Sleep Total (h)', 'Deep Sleep (h)', 'REM Sleep (h)'
      ]);
    }

    // 同じ日付+IDのデータが既にあれば更新、なければ追記
    const values = sheet.getDataRange().getValues();
    const dateStr = data.date;
    const userId = data.id || 'S1';

    let existingRow = -1;
    for (let i = 1; i < values.length; i++) {
      const rowDate = values[i][0];
      const rowId = values[i][1];
      if (rowDate === dateStr && rowId === userId) {
        existingRow = i + 1; // 1-indexed
        break;
      }
    }

    const row = [
      dateStr,
      userId,
      data.hrv ?? '',
      data.rhr ?? '',
      data.spo2 ?? '',
      data.respRate ?? '',
      data.wristTemp ?? '',
      data.sleepTotal ?? '',
      data.deepSleep ?? '',
      data.remSleep ?? '',
    ];

    if (existingRow > 0) {
      sheet.getRange(existingRow, 1, 1, row.length).setValues([row]);
    } else {
      sheet.appendRow(row);
    }

    return ContentService.createTextOutput(JSON.stringify({ success: true, date: dateStr }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// テスト用（手動実行で動作確認できる）
function testPost() {
  const mockData = {
    date: new Date().toISOString().slice(0, 10),
    id: 'S1',
    hrv: 45.2,
    rhr: 52,
    spo2: 97,
    respRate: 14.5,
    wristTemp: 0.2,
    sleepTotal: 7.2,
    deepSleep: 1.4,
    remSleep: 1.8,
  };

  const e = {
    parameter: { token: SECRET_TOKEN },
    postData: { contents: JSON.stringify(mockData) }
  };

  const result = doPost(e);
  Logger.log(result.getContent());
}
