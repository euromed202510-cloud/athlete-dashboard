import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import Anthropic from '@anthropic-ai/sdk';

const SECRET_TOKEN = process.env.HEALTH_IMPORT_TOKEN ?? 'athlete2026';
const SHEET_NAME = 'Workout';
const HEADER = ['Date', 'ID', 'Type', 'Start Time', 'Duration (min)', 'Calories', 'Avg HR', 'Max HR', 'Distance (km)'];

function getAuth() {
  let privateKey = process.env.GOOGLE_PRIVATE_KEY ?? '';
  if (!privateKey.includes('BEGIN')) privateKey = Buffer.from(privateKey, 'base64').toString('utf8');
  if (privateKey.includes('\\n')) privateKey = privateKey.replace(/\\n/g, '\n');
  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    if (token !== SECRET_TOKEN) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await request.formData();
    const image = formData.get('image') as File;
    const id = (formData.get('id') as string) ?? '1';
    if (!image) return NextResponse.json({ error: 'image is required' }, { status: 400 });

    const imageBuffer = await image.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    const mimeType = (image.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

    // Claude vision で数値抽出
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' });

    const aiRes = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType, data: base64Image },
          },
          {
            type: 'text',
            text: `This is a workout summary screenshot (Apple Watch, Garmin, etc). Extract the following values and respond ONLY with a JSON object, no extra text:
{
  "type": "workout type (e.g. Running, Cycling, Strength)",
  "date": "YYYY-MM-DD (today is ${today} if not shown)",
  "startTime": "HH:MM or empty string",
  "durationMin": number or null,
  "calories": number or null,
  "avgHR": number or null,
  "maxHR": number or null,
  "distanceKm": number or null
}`,
          },
        ],
      }],
    });

    const rawText = aiRes.content[0].type === 'text' ? aiRes.content[0].text : '';
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: 'AI parse failed', raw: rawText }, { status: 400 });

    const parsed = JSON.parse(jsonMatch[0]);

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
      parsed.date ?? today, id, parsed.type ?? '', parsed.startTime ?? '',
      parsed.durationMin ?? '', parsed.calories ?? '',
      parsed.avgHR ?? '', parsed.maxHR ?? '', parsed.distanceKm ?? '',
    ];

    // 同日・同ID・同タイプなら上書き
    let updatedRow = -1;
    for (let i = 1; i < existingValues.length; i++) {
      if (existingValues[i][0] === (parsed.date ?? today) && existingValues[i][1] === id &&
          existingValues[i][2] === (parsed.type ?? '')) {
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

    return NextResponse.json({ success: true, parsed });
  } catch (err) {
    console.error('Workout vision error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
