'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/',         label: 'TODAY',    icon: '⚡' },
  { href: '/activity', label: 'ACTIVITY', icon: '🏃' },
  { href: '/sleep',    label: 'SLEEP',    icon: '🌙' },
  { href: '/coach',    label: 'COACH',    icon: '🤖' },
  { href: '/profile',  label: 'PROFILE',  icon: '👤' },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 flex justify-around items-center border-t"
      style={{
        background: 'var(--card)',
        borderColor: 'var(--border)',
        height: '64px',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {tabs.map(tab => {
        const active = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex flex-col items-center gap-0.5 text-xs font-medium transition-colors"
            style={{ color: active ? 'var(--gold)' : 'var(--subtext)', minWidth: '56px' }}
          >
            <span className="text-lg leading-none">{tab.icon}</span>
            <span className="tracking-wider" style={{ fontSize: '9px' }}>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
