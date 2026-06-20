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

function parseWorkoutText(text: string) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const fullText = lines.join(' ');

  // Workout type (first meaningful line)
  const typeMatch = text.match(/^([^\n]+)/);
  let type = typeMatch ? typeMatch[1].trim() : 'Unknown';
  type = type.replace(/\d+月\d+日.*/, '').trim();

  // Duration HH:MM:SS or H:MM:SS
  const durationMatch = fullText.match(/(\d+:\d{2}:\d{2})/);
  let durationMin: number | null = null;
  if (durationMatch) {
    const parts = durationMatch[1].split(':').map(Number);
    durationMin = Math.round(parts[0] * 60 + parts[1] + parts[2] / 60);
  }

  // Calories
  const calMatch = fullText.match(/([\d,]+)\s*[Kk][Cc][Aa][Ll]/);
  const calories = calMatch ? parseInt(calMatch[1].replace(',', '')) : null;

  // Distance
  const distMatch = fullText.match(/([\d.]+)\s*[Kk][Mm]/);
  const distance = distMatch ? parseFloat(distMatch[1]) : null;

  // Heart rate
  const hrMatch = fullText.match(/(\d{2,3})\s*拍\s*\/\s*分/);
  const avgHR = hrMatch ? parseInt(hrMatch[1]) : null;

  // Date
  const dateMatch = text.match(/(\d+)月(\d+)日/);
  let date = new Date().toISOString().slice(0, 10);
  if (dateMatch) {
    const year = new Date().getFullYear();
    const month = String(parseInt(dateMatch[1])).padStart(2, '0');
    const day = String(parseInt(dateMatch[2])).padStart(2, '0');
    date = `${year}-${month}-${day}`;
  }

  // Start time
  const timeMatch = fullText.match(/(\d{1,2}:\d{2})(?:–|-)/);
  const startTime = timeMatch ? timeMatch[1] : '';

  return { type, date, startTime, durationMin, calories, avgHR, distance };
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    if (token !== SECRET_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const image = formData.get('image') as File;
    const id = (formData.get('id') as string) ?? '1';

    if (!image) {
      return NextResponse.json({ error: 'image is required' }, { status: 400 });
    }

    const imageBuffer = await image.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');

    // Google Vision API でテキスト抽出
    const visionApiKey = process.env.GOOGLE_VISION_API_KEY;
    const visionRes = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${visionApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: base64Image },
            features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
          }],
        }),
      }
    );

    const visionData = await visionRes.json();
    const extractedText = visionData.responses?.[0]?.fullTextAnnotation?.text ?? '';

    if (!extractedText) {
      return NextResponse.json({ error: 'テキストを認識できませんでした' }, { status: 400 });
    }

    const parsed = parseWorkoutText(extractedText);

    // Sheets に書き込み
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

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
        spreadsheetId, range: `${SHEET_NAME}!A1`, valueInputOption: 'RAW',
        requestBody: { values: [HEADER] },
      });
      existingValues = [HEADER];
    }

    const newRow = [
      parsed.date, id, parsed.type, parsed.startTime,
      parsed.durationMin ?? '', parsed.calories ?? '',
      parsed.avgHR ?? '', '', parsed.distance ?? '',
    ];

    let updatedRow = -1;
    for (let i = 1; i < existingValues.length; i++) {
      if (existingValues[i][0] === parsed.date && existingValues[i][1] === id &&
          existingValues[i][2] === parsed.type) {
        updatedRow = i + 1;
        break;
      }
    }

    if (updatedRow > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId, range: `${SHEET_NAME}!A${updatedRow}:I${updatedRow}`,
        valueInputOption: 'RAW', requestBody: { values: [newRow] },
      });
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId, range: `${SHEET_NAME}!A:I`,
        valueInputOption: 'RAW', requestBody: { values: [newRow] },
      });
    }

    return NextResponse.json({ success: true, parsed, extractedText });
  } catch (err) {
    console.error('Workout vision error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
