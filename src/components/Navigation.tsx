'use client';

import React from 'react';

type View = 'dashboard' | 'workout' | 'history' | 'program' | 'settings';

interface NavigationProps {
  currentView: View;
  onNavigate: (view: View) => void;
}

const NAV_ITEMS: { view: View; label: string; icon: (active: boolean) => React.ReactNode }[] = [
  {
    view: 'dashboard',
    label: 'Home',
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        {!active && <polyline points="9 22 9 12 15 12 15 22" />}
      </svg>
    ),
  },
  {
    view: 'workout',
    label: 'Train',
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? '2.2' : '1.8'} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" fill={active ? 'currentColor' : 'none'} />
        <circle cx="12" cy="12" r="9" />
      </svg>
    ),
  },
  {
    view: 'history',
    label: 'History',
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? '2.2' : '1.8'} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    view: 'program',
    label: 'Program',
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? '2.2' : '1.8'} strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="6" x2="20" y2="6" />
        <line x1="4" y1="12" x2="20" y2="12" />
        <line x1="4" y1="18" x2="16" y2="18" />
      </svg>
    ),
  },
  {
    view: 'settings',
    label: 'More',
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? '2.2' : '1.8'} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="2" fill={active ? 'currentColor' : 'none'} />
        <circle cx="4" cy="12" r="2" fill={active ? 'currentColor' : 'none'} />
        <circle cx="20" cy="12" r="2" fill={active ? 'currentColor' : 'none'} />
      </svg>
    ),
  },
];

export default function Navigation({ currentView, onNavigate }: NavigationProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-surface-200/60 safe-bottom z-50">
      <div className="max-w-lg mx-auto flex items-center justify-around py-2 px-2">
        {NAV_ITEMS.map(({ view, label, icon }) => {
          const isActive = currentView === view;
          return (
            <button
              key={view}
              onClick={() => onNavigate(view)}
              className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-accent'
                  : 'text-charcoal-muted/60 active:text-charcoal-muted'
              }`}
            >
              {icon(isActive)}
              <span className={`text-[10px] font-semibold tracking-wide ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
