'use client';

import { useState, useRef } from 'react';

export default function WorkoutUploadButton({ userId = '1' }: { userId?: string }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setStatus('loading');
    setMessage('');
    try {
      const form = new FormData();
      form.append('image', file);
      form.append('id', userId);

      const res = await fetch('/api/workout-vision?token=athlete2026', {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const p = data.parsed;
        setStatus('success');
        setMessage(`${p.type} ${p.durationMin ? p.durationMin + 'min' : ''} ${p.calories ? p.calories + 'kcal' : ''} → Saved`);
      } else {
        setStatus('error');
        setMessage(data.error ?? 'Failed');
      }
    } catch (e) {
      setStatus('error');
      setMessage(String(e));
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {/* カメラ用 */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
      {/* フォトライブラリ用 */}
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
      <div className="flex gap-2">
        <button
          onClick={() => inputRef.current?.click()}
          disabled={status === 'loading'}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            opacity: status === 'loading' ? 0.6 : 1,
          }}
        >
          <span style={{ fontSize: '1.1rem' }}>📸</span>
          カメラ
        </button>
        <button
          onClick={() => galleryRef.current?.click()}
          disabled={status === 'loading'}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold"
          style={{
            background: status === 'success' ? 'var(--green)' : 'var(--card)',
            border: '1px solid var(--border)',
            color: status === 'success' ? '#000' : 'var(--text)',
            opacity: status === 'loading' ? 0.6 : 1,
          }}
        >
          <span style={{ fontSize: '1.1rem' }}>🖼️</span>
          {status === 'loading' ? '解析中...' : status === 'success' ? '保存完了' : 'ライブラリ'}
        </button>
      </div>
      {message && (
        <p className="text-xs text-center" style={{ color: status === 'error' ? 'var(--red)' : 'var(--green)' }}>
          {message}
        </p>
      )}
    </div>
  );
}
