import { google } from 'googleapis';

function getAuth() {
  let privateKey = process.env.GOOGLE_PRIVATE_KEY ?? '';

  // If base64 encoded, decode it
  if (!privateKey.includes('BEGIN')) {
    privateKey = Buffer.from(privateKey, 'base64').toString('utf8');
  }

  // Handle escaped newlines
  if (privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
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
  fatigue: number | null;        // subjective 1-5
  sleepTotal: number | null;     // hours
  deepSleep: number | null;      // hours
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

export async function getMorningData(suffix = 'S1'): Promise<MorningRow[]> {
  // 「朝」シート（Googleフォーム回答）から読み込む
  const userId = suffix.replace(/^S/, '');
  const rows = await getSheetValues(`朝!A:Z`);
  if (rows.length < 2) return [];
  const [header, ...data] = rows;
  const idx = (name: string) => header.findIndex(h => h?.toLowerCase().includes(name.toLowerCase()));
  const idxJp = (name: string) => header.findIndex(h => h?.includes(name));

  const tsIdx = 0; // タイムスタンプ
  const userIdx = idxJp('ユーザーID') === -1 ? 1 : idxJp('ユーザーID');
  const rtIdx = idxJp('反応時間') === -1 ? idx('reaction') : idxJp('反応時間');
  const faIdx = idxJp('失敗数') === -1 ? idx('false') : idxJp('失敗数');
  const gripIdx = idxJp('握力') === -1 ? idx('grip') : idxJp('握力');
  const alcIdx = idxJp('アルコール') === -1 ? idx('alc') : idxJp('アルコール');
  const fatIdx = idxJp('疲労') === -1 ? idx('fatigue') : idxJp('疲労');
  const sleepIdx = idxJp('睡眠時間');
  const deepIdx = idxJp('深い睡眠');

  // タイムスタンプ→日付変換（"2026/06/12 23:16:42" → "2026-06-12"）
  const parseDate = (ts: string): string => {
    if (!ts) return '';
    const d = new Date(ts.replace(/\//g, '-').replace(' ', 'T'));
    if (isNaN(d.getTime())) return ts.slice(0, 10).replace(/\//g, '-');
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' });
  };

  // 睡眠時間パース: "6時間30分" or "6.5" → hours
  const parseSleep = (val: string | undefined): number | null => {
    if (!val) return null;
    const hrMin = val.match(/(\d+)時間(?:(\d+)分)?/);
    if (hrMin) return parseFloat(hrMin[1]) + (hrMin[2] ? parseFloat(hrMin[2]) / 60 : 0);
    return parseNum(val);
  };
  // 深い睡眠パース: 分単位入力 → 時間変換
  const parseDeepSleep = (val: string | undefined): number | null => {
    if (!val) return null;
    const n = parseNum(val);
    if (n == null) return null;
    return n >= 24 ? n / 60 : n; // 24以上は分とみなして時間に変換
  };

  return data
    .filter(r => r[tsIdx] && String(r[userIdx]) === userId)
    .map(r => {
      const rt = rtIdx >= 0 ? parseNum(r[rtIdx]) : null;
      return {
        date: parseDate(r[tsIdx]),
        reactionTime: rt != null && rt < 10 ? Math.round(rt * 1000) : rt, // 秒→ms変換
        falseAlarms: faIdx >= 0 ? parseNum(r[faIdx]) : null,
        gripStrength: gripIdx >= 0 ? parseNum(r[gripIdx]) : null,
        alcohol: alcIdx >= 0 ? parseNum(r[alcIdx]) : null,
        fatigue: fatIdx >= 0 ? parseNum(r[fatIdx]) : null,
        sleepTotal: sleepIdx >= 0 ? parseSleep(r[sleepIdx]) : null,
        deepSleep: deepIdx >= 0 ? parseDeepSleep(r[deepIdx]) : null,
      };
    });
}

export async function getNightData(suffix = 'S1'): Promise<NightRow[]> {
  const rows = await getSheetValues(`Master_Night_${suffix}!A:Z`);
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

export interface AutoHealthRow {
  date: string;
  id: string;
  hrv: number | null;
  rhr: number | null;
  spo2: number | null;
  respRate: number | null;
  wristTemp: number | null;
  sleepTotal: number | null;
  deepSleep: number | null;
  remSleep: number | null;
}

export async function getAutoHealthData(id = '1'): Promise<AutoHealthRow[]> {
  try {
    const ahRows = await getSheetValues('AutoHealth!A:J').catch(() => [] as string[][]);
    if (ahRows.length < 2) return [];
    const [header, ...data] = ahRows;
    const idx = (name: string) => header.findIndex(h => h?.toLowerCase().includes(name.toLowerCase()));
    const dateIdx = idx('date') === -1 ? 0 : idx('date');
    const idIdx = idx('id') === -1 ? 1 : idx('id');
    const result: AutoHealthRow[] = [];
    for (const r of data) {
      if (!r[dateIdx] || (id !== 'all' && String(r[idIdx]) !== String(id))) continue;
      result.push({
        date: r[dateIdx],
        id: r[idIdx] ?? '',
        hrv: parseNum(r[idx('hrv')]),
        rhr: parseNum(r[idx('rhr')]),
        spo2: parseNum(r[idx('spo2')]),
        respRate: parseNum(r[idx('resp')]),
        wristTemp: parseNum(r[idx('wrist') === -1 ? idx('temp') : idx('wrist')]),
        sleepTotal: parseNum(r[idx('sleep')]),
        deepSleep: parseNum(r[idx('deep')]),
        remSleep: parseNum(r[idx('rem')]),
      });
    }
    return result.sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}

export async function getDailyData(suffix = 'S1'): Promise<DailyRow[]> {
  try {
    const rows = await getSheetValues(`Master_Daily_${suffix}!A:Z`);
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
