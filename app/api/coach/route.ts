import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getAutoHealthData, getMorningData, getDailyData } from '@/lib/sheets';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { user = 'S1' } = await req.json();
    const autoHealthId = user.replace(/^S/, '');

    const safe = (p: Promise<unknown[]>) => p.catch(() => []);
    const [morning, daily, autoHealth] = await Promise.all([
      safe(getMorningData(user)),
      safe(getDailyData(user)),
      safe(getAutoHealthData(autoHealthId)),
    ]);

    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' });

    const findToday = <T extends { date: string }>(arr: T[]) =>
      arr.find(r => r.date === todayStr || r.date.replace(/\//g, '-') === todayStr);

    const todayAH = findToday(autoHealth as { date: string }[]) ?? (autoHealth as { date: string }[])[autoHealth.length - 1];
    const todayMorning = findToday(morning as { date: string }[]) ?? (morning as { date: string }[])[morning.length - 1];
    const todayDaily = findToday(daily as { date: string }[]) ?? (daily as { date: string }[])[daily.length - 1];

    const metrics = {
      date: todayStr,
      hrv: todayAH?.hrv ?? todayDaily?.hrv ?? null,
      rhr: todayAH?.rhr ?? todayDaily?.rhr ?? null,
      respRate: todayAH?.respRate ?? todayDaily?.breathRate ?? null,
      sleepTotal: todayAH?.sleepTotal ?? null,
      deepSleep: todayAH?.deepSleep ?? null,
      fatigue: todayMorning?.fatigue ?? null,
      reactionTime: todayMorning?.reactionTime ?? null,
    };

    const prompt = `あなたはN-of-1スポーツ科学に基づくパーソナルアスリートコーチです。以下の本日の生体データを分析し、日本語で実践的なコーチングアドバイスを提供してください。

【本日の生体データ】
- 日付: ${metrics.date}
- HRV（心拍変動）: ${metrics.hrv != null ? Math.round(metrics.hrv) + ' ms' : 'データなし'}
- 安静時心拍数: ${metrics.rhr != null ? metrics.rhr + ' bpm' : 'データなし'}
- 呼吸数: ${metrics.respRate != null ? metrics.respRate + ' /min' : 'データなし'}
- 睡眠時間: ${metrics.sleepTotal != null ? metrics.sleepTotal.toFixed(1) + ' h' : 'データなし'}
- 深い睡眠: ${metrics.deepSleep != null ? metrics.deepSleep.toFixed(1) + ' h' : 'データなし'}
- 主観的疲労度: ${metrics.fatigue != null ? metrics.fatigue + '/10' : 'データなし'}
- 反応時間: ${metrics.reactionTime != null ? metrics.reactionTime + ' ms' : 'データなし'}

【分析と指示】
1. **今日のリカバリー状態**（HRV・RHRを中心に2〜3文で評価）
2. **トレーニング推奨**（今日の強度・内容の具体的な推奨）
3. **注目ポイント**（特に気になる指標があれば言及）
4. **明日への提言**（睡眠・栄養・メンタルの観点から1つのアクション）

データが不足している項目は「—」として、利用可能なデータのみで分析してください。簡潔かつ具体的に、約300字以内でまとめてください。`;

    const stream = await client.messages.stream({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
      thinking: { type: 'adaptive' },
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (e) {
    return new Response(String(e), { status: 500 });
  }
}
