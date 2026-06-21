'use client';

import { useState } from 'react';
import { exportAllData, importData } from '@/lib/db';

interface SettingsViewProps {
  onImport: () => void;
}

export default function SettingsView({ onImport }: SettingsViewProps) {
  const [message, setMessage] = useState('');

  async function handleExport() {
    try {
      const data = await exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `workout-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage('Backup exported');
    } catch {
      setMessage('Export failed');
    }
  }

  async function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        await importData(data);
        setMessage('Data restored successfully');
        onImport();
      } catch {
        setMessage('Import failed — invalid file');
      }
    };
    input.click();
  }

  return (
    <div className="px-6 pt-14 pb-8">
      <header className="mb-8">
        <h1 className="text-[28px] font-bold tracking-tight">Settings</h1>
      </header>

      <div className="space-y-4">
        <div className="card p-5">
          <p className="label-uppercase mb-4">Data Management</p>
          <div className="space-y-2.5">
            <button
              onClick={handleExport}
              className="w-full flex items-center gap-3 py-3.5 px-4 bg-surface-50 rounded-xl text-left active:scale-[0.97] transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-accent/8 flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-accent">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </div>
              <div>
                <p className="text-[13px] font-semibold">Export Backup</p>
                <p className="text-[11px] text-charcoal-muted">Download as JSON file</p>
              </div>
            </button>
            <button
              onClick={handleImport}
              className="w-full flex items-center gap-3 py-3.5 px-4 bg-surface-50 rounded-xl text-left active:scale-[0.97] transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-accent/8 flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-accent">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <div>
                <p className="text-[13px] font-semibold">Restore Backup</p>
                <p className="text-[11px] text-charcoal-muted">Import from JSON file</p>
              </div>
            </button>
          </div>
        </div>

        <div className="card p-5">
          <p className="label-uppercase mb-3">About</p>
          <p className="text-[13px] text-charcoal-light leading-relaxed">
            A minimal workout tracker built for tracking progressive overload over time.
          </p>
          <div className="mt-4 pt-4 border-t border-surface-100 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-success" />
              <p className="text-[11px] text-charcoal-muted">All data stored locally on device</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-success" />
              <p className="text-[11px] text-charcoal-muted">Works offline</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-success" />
              <p className="text-[11px] text-charcoal-muted">No account required</p>
            </div>
          </div>
        </div>

        {message && (
          <div className="card p-4 border-accent/20 bg-accent/3">
            <p className="text-[12px] text-accent font-medium">{message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
