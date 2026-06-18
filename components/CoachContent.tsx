'use client';

import { useState } from 'react';

export default function CoachContent({ user = 'S1' }: { user?: string }) {
  const [advice, setAdvice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function analyze() {
    setLoading(true);
    setAdvice('');
    setError('');
    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user }),
      });
      if (!res.ok) throw new Error(await res.text());
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No stream');
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setAdvice(prev => prev + decoder.decode(value));
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-6 flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-bold tracking-widest" style={{ color: 'var(--subtext)' }}>
          COACH
        </h1>
        <p className="text-xs mt-1" style={{ color: 'var(--subtext)', opacity: 0.7 }}>
          AI coaching powered by Claude
        </p>
      </div>

      <div
        className="rounded-xl p-4 flex flex-col gap-3"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <button
          onClick={analyze}
          disabled={loading}
          className="w-full py-3 rounded-lg font-bold text-sm tracking-widest transition-opacity"
          style={{
            background: loading ? 'var(--border)' : 'var(--text)',
            color: loading ? 'var(--subtext)' : 'var(--bg)',
            opacity: loading ? 0.7 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? '分析中...' : '今日のデータを分析する'}
        </button>

        {error && (
          <p className="text-xs" style={{ color: 'var(--red)' }}>{error}</p>
        )}

        {advice && (
          <div
            className="rounded-lg p-3 text-sm leading-relaxed whitespace-pre-wrap"
            style={{ background: 'var(--bg)', color: 'var(--text)', lineHeight: 1.7 }}
          >
            {advice}
          </div>
        )}

        {!advice && !loading && !error && (
          <p className="text-xs text-center" style={{ color: 'var(--subtext)', opacity: 0.6 }}>
            ボタンを押してAIコーチからアドバイスを受け取ろう
          </p>
        )}
      </div>
    </div>
  );
}
