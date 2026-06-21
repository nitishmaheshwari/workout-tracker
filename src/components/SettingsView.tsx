'use client';

import { useState, useEffect } from 'react';
import { exportAllData, importData } from '@/lib/db';
import { useTheme } from '@/lib/theme';
import { getBackupInfo, restoreFromLocalStorage, autoBackupToLocalStorage } from '@/lib/backup';
import {
  isConfigured,
  getClientId,
  setClientId,
  signIn,
  signOut,
  isSignedIn,
  tryRestoreToken,
  saveToGoogleDrive,
  loadFromGoogleDrive,
  getLastSyncTime,
  resetConfiguration,
} from '@/lib/google-drive';
import PageLayout from '@/components/PageLayout';

interface SettingsViewProps {
  onImport: () => void;
}

export default function SettingsView({ onImport }: SettingsViewProps) {
  const [message, setMessage] = useState('');
  const { theme, toggle } = useTheme();
  const [backupInfo, setBackupInfo] = useState<{ exists: boolean; timestamp: string | null; sessionCount: number }>({ exists: false, timestamp: null, sessionCount: 0 });
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveConfigured, setDriveConfigured] = useState(false);
  const [showClientIdInput, setShowClientIdInput] = useState(false);
  const [clientIdInput, setClientIdInput] = useState('');
  const [driveSyncing, setDriveSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    setBackupInfo(getBackupInfo());
    setDriveConfigured(isConfigured());
    if (isConfigured()) {
      const restored = tryRestoreToken();
      setDriveConnected(restored);
    }
    setLastSync(getLastSyncTime());
  }, []);

  async function handleExport() {
    try {
      const data = await exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `health-backup-${new Date().toISOString().split('T')[0]}.json`;
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

  async function handleBackupNow() {
    await autoBackupToLocalStorage();
    setBackupInfo(getBackupInfo());
    setMessage('Backup saved locally');
  }

  async function handleRestoreLocal() {
    const success = await restoreFromLocalStorage();
    if (success) {
      setMessage('Data restored from local backup');
      onImport();
    } else {
      setMessage('No backup found');
    }
  }

  function handleSaveClientId() {
    if (clientIdInput.trim()) {
      setClientId(clientIdInput.trim());
      setDriveConfigured(true);
      setShowClientIdInput(false);
      setMessage('Google Drive configured');
    }
  }

  async function handleDriveSignIn() {
    const success = await signIn();
    setDriveConnected(success);
    if (success) {
      setMessage('Connected to Google Drive');
    } else {
      setMessage('Sign-in failed');
    }
  }

  function handleDriveSignOut() {
    signOut();
    setDriveConnected(false);
    setMessage('Disconnected from Google Drive');
  }

  async function handleDriveBackup() {
    setDriveSyncing(true);
    try {
      const data = await exportAllData();
      const success = await saveToGoogleDrive(data);
      if (success) {
        setLastSync(getLastSyncTime());
        setMessage('Saved to Google Drive');
      } else {
        setMessage('Drive backup failed — try signing in again');
        setDriveConnected(false);
      }
    } catch {
      setMessage('Drive backup failed');
    } finally {
      setDriveSyncing(false);
    }
  }

  async function handleDriveRestore() {
    setDriveSyncing(true);
    try {
      const data = await loadFromGoogleDrive();
      if (data && (data as any).programs && (data as any).sessions) {
        await importData(data as any);
        setMessage('Restored from Google Drive');
        onImport();
      } else {
        setMessage('No backup found on Google Drive');
      }
    } catch {
      setMessage('Restore from Drive failed');
    } finally {
      setDriveSyncing(false);
    }
  }

  function formatTimestamp(ts: string | null): string {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  return (
    <PageLayout header={<h1 className="text-[28px] font-bold tracking-tight">Settings</h1>}>
      <div className="space-y-4">
        <div className="card p-5">
          <p className="label-uppercase mb-4">Appearance</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-surface-100 flex items-center justify-center">
                {theme === 'dark' ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-accent">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-accent">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-[13px] font-semibold">Dark Mode</p>
                <p className="text-[11px] text-charcoal-muted">{theme === 'dark' ? 'On' : 'Off'}</p>
              </div>
            </div>
            <button
              onClick={toggle}
              className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${
                theme === 'dark' ? 'bg-accent' : 'bg-surface-300'
              }`}
            >
              <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-300 ${
                theme === 'dark' ? 'translate-x-5.5' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-accent">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <p className="label-uppercase">Google Drive</p>
          </div>

          {!driveConfigured && !showClientIdInput && (
            <div>
              <p className="text-[12px] text-charcoal-muted leading-relaxed mb-3">
                Back up your data to Google Drive. Survives app removal, device changes, anything.
              </p>
              <button
                onClick={() => setShowClientIdInput(true)}
                className="w-full py-3 rounded-xl bg-accent text-white text-[12px] font-semibold active:scale-[0.97] transition-all"
              >
                Set Up Google Drive
              </button>
            </div>
          )}

          {showClientIdInput && (
            <div>
              <p className="text-[11px] text-charcoal-muted leading-relaxed mb-3">
                Enter your Google OAuth Client ID. Create one at console.cloud.google.com → Credentials → OAuth 2.0 Client ID (Web application). Add your app URL as authorized JavaScript origin.
              </p>
              <input
                type="text"
                value={clientIdInput}
                onChange={(e) => setClientIdInput(e.target.value)}
                placeholder="xxxx.apps.googleusercontent.com"
                className="w-full bg-surface-50 rounded-xl px-4 py-3 text-[12px] mb-3 focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowClientIdInput(false)}
                  className="flex-1 py-2.5 rounded-xl bg-surface-100 text-[12px] font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveClientId}
                  className="flex-1 py-2.5 rounded-xl bg-accent text-white text-[12px] font-semibold"
                >
                  Save
                </button>
              </div>
            </div>
          )}

          {driveConfigured && !showClientIdInput && (
            <div>
              <div className="bg-surface-50 rounded-xl p-4 mb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-semibold">
                      {driveConnected ? 'Connected' : 'Not connected'}
                    </p>
                    {lastSync && (
                      <p className="text-[11px] text-charcoal-muted mt-0.5">
                        Last sync: {formatTimestamp(lastSync)}
                      </p>
                    )}
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full ${driveConnected ? 'bg-success' : 'bg-surface-300'}`} />
                </div>
              </div>

              {!driveConnected ? (
                <div className="space-y-2.5">
                  <button
                    onClick={handleDriveSignIn}
                    className="w-full py-3 rounded-xl bg-accent text-white text-[12px] font-semibold active:scale-[0.97] transition-all"
                  >
                    Sign In with Google
                  </button>
                  <button
                    onClick={() => { resetConfiguration(); setDriveConfigured(false); setDriveConnected(false); setLastSync(null); setMessage('Drive configuration reset'); }}
                    className="w-full py-2.5 rounded-xl text-[11px] font-medium text-charcoal-muted active:text-red-500 transition-colors"
                  >
                    Reset Configuration
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex gap-2">
                    <button
                      onClick={handleDriveBackup}
                      disabled={driveSyncing}
                      className="flex-1 py-3 rounded-xl bg-accent text-white text-[12px] font-semibold active:scale-[0.97] transition-all disabled:opacity-50"
                    >
                      {driveSyncing ? 'Syncing...' : 'Backup to Drive'}
                    </button>
                    <button
                      onClick={handleDriveRestore}
                      disabled={driveSyncing}
                      className="flex-1 py-3 rounded-xl bg-surface-50 text-[12px] font-semibold text-charcoal active:scale-[0.97] transition-all disabled:opacity-50"
                    >
                      Restore from Drive
                    </button>
                  </div>
                  <button
                    onClick={() => { resetConfiguration(); setDriveConfigured(false); setDriveConnected(false); setLastSync(null); setMessage('Drive configuration reset'); }}
                    className="w-full py-2.5 rounded-xl text-[11px] font-medium text-charcoal-muted active:text-red-500 transition-colors"
                  >
                    Reset Configuration
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="card p-5">
          <p className="label-uppercase mb-4">Local Backup</p>
          <div className="bg-surface-50 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-semibold">
                  {backupInfo.exists ? 'Backup Available' : 'No Backup Yet'}
                </p>
                {backupInfo.exists && (
                  <p className="text-[11px] text-charcoal-muted mt-0.5">
                    {backupInfo.sessionCount} sessions · {formatTimestamp(backupInfo.timestamp)}
                  </p>
                )}
                <p className="text-[11px] text-charcoal-muted mt-1">
                  Auto-saves daily at 9 PM and after every workout
                </p>
              </div>
              <div className={`w-2.5 h-2.5 rounded-full ${backupInfo.exists ? 'bg-success' : 'bg-surface-300'}`} />
            </div>
          </div>
          <div className="space-y-2.5">
            <div className="flex gap-2">
              <button
                onClick={handleBackupNow}
                className="flex-1 py-3 rounded-xl bg-surface-50 text-[12px] font-semibold text-charcoal active:scale-[0.97] transition-all"
              >
                Backup Now
              </button>
              <button
                onClick={handleRestoreLocal}
                disabled={!backupInfo.exists}
                className="flex-1 py-3 rounded-xl bg-accent text-white text-[12px] font-semibold active:scale-[0.97] transition-all disabled:opacity-30"
              >
                Restore
              </button>
            </div>
            <button
              onClick={handleExport}
              className="w-full flex items-center gap-3 py-3 px-4 bg-surface-50 rounded-xl text-left active:scale-[0.97] transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-accent">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <p className="text-[12px] font-medium">Export to File</p>
            </button>
            <button
              onClick={handleImport}
              className="w-full flex items-center gap-3 py-3 px-4 bg-surface-50 rounded-xl text-left active:scale-[0.97] transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-accent">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p className="text-[12px] font-medium">Import from File</p>
            </button>
          </div>
        </div>

        {message && (
          <div className="card p-4 border-accent/20 bg-accent/5">
            <p className="text-[12px] text-accent font-medium">{message}</p>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
