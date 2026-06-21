'use client';

import { ReactNode } from 'react';

interface PageLayoutProps {
  header: ReactNode;
  children: ReactNode;
}

export default function PageLayout({ header, children }: PageLayoutProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 px-6 pb-3 border-b border-surface-200/50" style={{ paddingTop: 'max(16px, env(safe-area-inset-top, 16px))' }}>
        {header}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 overscroll-contain">
        {children}
      </div>
    </div>
  );
}
