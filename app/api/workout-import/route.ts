import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const SECRET_TOKEN = process.env.HEALTH_IMPORT_TOKEN ?? 'athlete2026';
const SHEET_NAME = 'Workout';
const HEADER = ['Date', 'ID', 'Type', 'Start Time', 'Duration (min)', 'Calories', 'Avg HR', 'Max HR', 'Distance (km)'];

function getAuth() {
  let privateKey = process.env.GOOGLE_PRIVATE_KEY ?? '';
  if (!privateKey.includes('BEGIN')) {
    privateKey = Buffer.from(privateKey, 'base64').toString('utf8');
  }
  if (privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }
  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

const extractVal = (v: unknown): number | null => {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') { const n = parseFloat(v); return isNaN(n) ? null : n; }
  if (typeof v === 'object') {
    const obj = v as Record<string, unknown>;
    for (const key of ['value', 'Value', 'quantity', 'count', ...Object.keys(obj)]) {
      if (obj[key] != null && typeof obj[key] !== 'object') return extractVal(obj[key]);
    }
  }
  return null;
};

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    if (token !== SECRET_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const id = typeof body.id === 'string' && body.id ? body.id : '1';
    const date = typeof body.date === 'string' && body.date
      ? body.date
      : new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const type = typeof body.type === 'string' ? body.type : (body.workoutType ?? 'Unknown');
    const startTime = typeof body.startTime === 'string' ? body.startTime : '';
    const duration = extractVal(body.duration);
    const calories = extractVal(body.calories);
    const avgHR = extractVal(body.avgHR);
    const maxHR = extractVal(body.maxHR);
    const distance = extractVal(body.distance);

    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

    // Workoutシートがなければ作成
    let existingValues: string[][] = [];
    try {
      const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${SHEET_NAME}!A:I` });
      existingValues = (res.data.values as string[][]) ?? [];
    } catch {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: [{ addSheet: { properties: { title: SHEET_NAME } } }] },
      });
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${SHEET_NAME}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [HEADER] },
      });
      existingValues = [HEADER];
    }

    const newRow = [date, id, type, startTime, duration ?? '', calories ?? '', avgHR ?? '', maxHR ?? '', distance ?? ''];

    // 同じ日付+ID+種類+開始時刻があれば更新、なければ追加
    let updatedRow = -1;
    for (let i = 1; i < existingValues.length; i++) {
      if (existingValues[i][0] === date && existingValues[i][1] === id &&
          existingValues[i][2] === type && existingValues[i][3] === startTime) {
        updatedRow = i + 1;
        break;
      }
    }

    if (updatedRow > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${SHEET_NAME}!A${updatedRow}:I${updatedRow}`,
        valueInputOption: 'RAW',
        requestBody: { values: [newRow] },
      });
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${SHEET_NAME}!A:I`,
        valueInputOption: 'RAW',
        requestBody: { values: [newRow] },
      });
    }

    return NextResponse.json({ success: true, date, type });
  } catch (err) {
    console.error('Workout import error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
