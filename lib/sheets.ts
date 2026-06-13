import { google } from 'googleapis';

function getAuth() {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
}

async function getSheetValues(range: string): Promise<string[][]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range,
  });
  return (res.data.values as string[][]) ?? [];
}

export interface MorningRow {
  date: string;
  reactionTime: number | null;   // Go/No-Go RT (ms)
  falseAlarms: number | null;    // False Alarms count
  gripStrength: number | null;   // kg
  alcohol: number | null;        // drinks
  fatigue: number | null;        // subjective 1-10
}

export interface NightRow {
  date: string;
  cmj: number | null;            // cm
  maxPower: number | null;       // W
  rpe: number | null;            // 1-10
  hydration: number | null;      // L
  coffee: number | null;         // cups
}

export interface DailyRow {
  date: string;
  hrv: number | null;            // ms SDNN
  rhr: number | null;            // bpm
  sleepDuration: number | null;  // hours
  deepSleep: number | null;      // hours
  rem: number | null;            // hours
  breathRate: number | null;     // /min
  skinTemp: number | null;       // ±℃
  spo2: number | null;           // %
  vo2max: number | null;
}

function parseNum(val: string | undefined): number | null {
  if (!val || val.trim() === '' || val.trim() === '-') return null;
  const n = parseFloat(val.replace(',', '.'));
  return isNaN(n) ? null : n;
}

export async function getMorningData(): Promise<MorningRow[]> {
  const rows = await getSheetValues('Master_Morning_S1!A:Z');
  if (rows.length < 2) return [];
  const [header, ...data] = rows;
  const idx = (name: string) => header.findIndex(h => h?.toLowerCase().includes(name.toLowerCase()));

  const dateIdx = idx('date') === -1 ? 0 : idx('date');
  const rtIdx = idx('reaction');
  const faIdx = idx('false');
  const gripIdx = idx('grip');
  const alcIdx = idx('alcohol') === -1 ? idx('alc') : idx('alcohol');
  const fatIdx = idx('fatigue') === -1 ? idx('fatigu') : idx('fatigue');

  return data
    .filter(r => r[dateIdx])
    .map(r => ({
      date: r[dateIdx],
      reactionTime: rtIdx >= 0 ? parseNum(r[rtIdx]) : null,
      falseAlarms: faIdx >= 0 ? parseNum(r[faIdx]) : null,
      gripStrength: gripIdx >= 0 ? parseNum(r[gripIdx]) : null,
      alcohol: alcIdx >= 0 ? parseNum(r[alcIdx]) : null,
      fatigue: fatIdx >= 0 ? parseNum(r[fatIdx]) : null,
    }));
}

export async function getNightData(): Promise<NightRow[]> {
  const rows = await getSheetValues('Master_Night_S1!A:Z');
  if (rows.length < 2) return [];
  const [header, ...data] = rows;
  const idx = (name: string) => header.findIndex(h => h?.toLowerCase().includes(name.toLowerCase()));

  const dateIdx = idx('date') === -1 ? 0 : idx('date');
  const cmjIdx = idx('cmj');
  const pwrIdx = idx('power') === -1 ? idx('max') : idx('power');
  const rpeIdx = idx('rpe');
  const hydIdx = idx('hydrat') === -1 ? idx('water') : idx('hydrat');
  const cofIdx = idx('coffee');

  return data
    .filter(r => r[dateIdx])
    .map(r => ({
      date: r[dateIdx],
      cmj: cmjIdx >= 0 ? parseNum(r[cmjIdx]) : null,
      maxPower: pwrIdx >= 0 ? parseNum(r[pwrIdx]) : null,
      rpe: rpeIdx >= 0 ? parseNum(r[rpeIdx]) : null,
      hydration: hydIdx >= 0 ? parseNum(r[hydIdx]) : null,
      coffee: cofIdx >= 0 ? parseNum(r[cofIdx]) : null,
    }));
}

export async function getDailyData(): Promise<DailyRow[]> {
  try {
    const rows = await getSheetValues('Master_Daily!A:Z');
    if (rows.length < 2) return [];
    const [header, ...data] = rows;
    const idx = (name: string) => header.findIndex(h => h?.toLowerCase().includes(name.toLowerCase()));

    const dateIdx = idx('date') === -1 ? 0 : idx('date');

    return data
      .filter(r => r[dateIdx])
      .map(r => ({
        date: r[dateIdx],
        hrv: parseNum(r[idx('hrv')]),
        rhr: parseNum(r[idx('rhr')]),
        sleepDuration: parseNum(r[idx('sleep')]),
        deepSleep: parseNum(r[idx('deep')]),
        rem: parseNum(r[idx('rem')]),
        breathRate: parseNum(r[idx('breath')]),
        skinTemp: parseNum(r[idx('temp') === -1 ? idx('skin') : idx('temp')]),
        spo2: parseNum(r[idx('spo2')]),
        vo2max: parseNum(r[idx('vo2')]),
      }));
  } catch {
    return [];
  }
}
