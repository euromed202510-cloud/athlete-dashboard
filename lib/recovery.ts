import type { MorningRow, NightRow, DailyRow } from './sheets';

export interface RecoveryScore {
  total: number;
  status: 'PEAK' | 'GOOD' | 'CAUTION' | 'REST';
  components: {
    hrv: number;
    sleep: number;
    deepSleep: number;
    rhr: number;
    breathRate: number;
  };
  penalties: number;
  bonuses: number;
  hrvLevel: 'HIGH' | 'NORMAL' | 'LOW' | null;
  cmjLevel: 'HIGH' | 'LOW' | null;
  action: string;
  actionIcon: string;
}

function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function std(arr: number[], avg: number): number {
  const variance = arr.reduce((a, b) => a + (b - avg) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

export function calcRecoveryScore(
  today: { morning?: MorningRow; night?: NightRow; daily?: DailyRow },
  history: { morning: MorningRow[]; night: NightRow[]; daily: DailyRow[] }
): RecoveryScore {
  const d = today.daily;
  const m = today.morning;
  const prevNight = history.night[history.night.length - 1];

  // --- HRV score (35%) ---
  const hrvHistory = history.daily.map(r => r.hrv).filter((v): v is number => v !== null);
  let hrvScore = 50;
  let hrvLevel: 'HIGH' | 'NORMAL' | 'LOW' | null = null;

  if (d?.hrv && hrvHistory.length >= 7) {
    const last30 = hrvHistory.slice(-30);
    const avg = mean(last30);
    const sd = std(last30, avg);
    if (d.hrv >= avg + sd) {
      hrvScore = 100;
      hrvLevel = 'HIGH';
    } else if (d.hrv <= avg - sd) {
      hrvScore = 20;
      hrvLevel = 'LOW';
    } else {
      hrvScore = clamp(50 + ((d.hrv - avg) / (sd || 1)) * 50);
      hrvLevel = 'NORMAL';
    }
  }

  // --- Sleep duration (20%) ---
  let sleepScore = 50;
  if (d?.sleepDuration != null) {
    if (d.sleepDuration >= 7) sleepScore = 100;
    else if (d.sleepDuration >= 6) sleepScore = 70;
    else if (d.sleepDuration >= 5) sleepScore = 40;
    else sleepScore = 20;
  }

  // --- Deep sleep (15%) ---
  let deepScore = 50;
  if (d?.deepSleep != null) {
    if (d.deepSleep >= 1.5) deepScore = 100;
    else if (d.deepSleep >= 1.0) deepScore = 70;
    else if (d.deepSleep >= 0.5) deepScore = 40;
    else deepScore = 20;
  }

  // --- RHR (15%) ---
  const rhrHistory = history.daily.map(r => r.rhr).filter((v): v is number => v !== null);
  let rhrScore = 50;
  if (d?.rhr && rhrHistory.length >= 7) {
    const avg = mean(rhrHistory.slice(-30));
    // lower RHR = better
    const diff = avg - d.rhr;
    rhrScore = clamp(50 + diff * 5);
  }

  // --- Breath rate (15%) ---
  const breathHistory = history.daily.map(r => r.breathRate).filter((v): v is number => v !== null);
  let breathScore = 50;
  if (d?.breathRate && breathHistory.length >= 7) {
    const avg = mean(breathHistory.slice(-30));
    const diff = avg - d.breathRate;
    breathScore = clamp(50 + diff * 10);
  }

  const base =
    hrvScore * 0.35 +
    sleepScore * 0.20 +
    deepScore * 0.15 +
    rhrScore * 0.15 +
    breathScore * 0.15;

  // --- Penalties ---
  let penalties = 0;
  if (m?.alcohol != null) {
    if (m.alcohol >= 3) penalties += 12;
    else if (m.alcohol >= 1) penalties += 4;
  }
  if (m?.fatigue != null && m.fatigue >= 8) penalties += 5;
  if (prevNight?.rpe != null && prevNight.rpe >= 9) penalties += 5;
  if (d?.skinTemp != null && d.skinTemp >= 1) penalties += 8;

  // --- Bonuses ---
  let bonuses = 0;
  if (m?.reactionTime != null && m.reactionTime < 250) bonuses += 3;
  const gripHistory = history.morning.map(r => r.gripStrength).filter((v): v is number => v !== null);
  if (m?.gripStrength && gripHistory.length >= 3) {
    const avg = mean(gripHistory);
    if (m.gripStrength >= avg) bonuses += 2;
  }
  // hydration bonus tracked via night sheet in future

  const total = clamp(Math.round(base - penalties + bonuses));

  let status: RecoveryScore['status'];
  if (total >= 80) status = 'PEAK';
  else if (total >= 60) status = 'GOOD';
  else if (total >= 40) status = 'CAUTION';
  else status = 'REST';

  // --- CMJ level ---
  const cmjHistory = history.night.map(r => r.cmj).filter((v): v is number => v !== null);
  let cmjLevel: 'HIGH' | 'LOW' | null = null;
  const todayCmj = today.night?.cmj;
  if (todayCmj && cmjHistory.length >= 5) {
    const avg = mean(cmjHistory.slice(-30));
    cmjLevel = todayCmj >= avg ? 'HIGH' : 'LOW';
  }

  // --- Action matrix ---
  let action = '';
  let actionIcon = '';
  if (hrvLevel === 'HIGH' && cmjLevel === 'HIGH') {
    action = '高強度・最大出力セッション';
    actionIcon = '🔥 PEAK DAY';
  } else if (hrvLevel === 'HIGH' && cmjLevel === 'LOW') {
    action = '技術練習・有酸素のみ';
    actionIcon = '⚠️ CNS FATIGUE';
  } else if (hrvLevel === 'LOW' && cmjLevel === 'HIGH') {
    action = '強度50%以下・短時間';
    actionIcon = '🔶 AUTONOMIC STRESS';
  } else if (hrvLevel === 'LOW' && cmjLevel === 'LOW') {
    action = '完全休養またはウォーク';
    actionIcon = '🛑 FULL REST';
  } else {
    action = status === 'PEAK' ? '高強度OK' : status === 'GOOD' ? '通常トレーニング' : status === 'CAUTION' ? '軽め推奨' : '休養';
    actionIcon = status === 'PEAK' ? '🔥' : status === 'GOOD' ? '✅' : status === 'CAUTION' ? '⚠️' : '🛑';
  }

  return {
    total,
    status,
    components: { hrv: Math.round(hrvScore), sleep: Math.round(sleepScore), deepSleep: Math.round(deepScore), rhr: Math.round(rhrScore), breathRate: Math.round(breathScore) },
    penalties,
    bonuses,
    hrvLevel,
    cmjLevel,
    action,
    actionIcon,
  };
}
