import { exportAllData, importData } from './db';

const BACKUP_KEY = 'health-backup-data';
const BACKUP_TIMESTAMP_KEY = 'health-backup-timestamp';
const BACKUP_SCHEDULE_KEY = 'health-backup-last-scheduled';

export async function autoBackupToLocalStorage(): Promise<void> {
  try {
    const data = await exportAllData();
    if (data.sessions.length === 0 && data.programs.length === 0) return;
    localStorage.setItem(BACKUP_KEY, JSON.stringify(data));
    localStorage.setItem(BACKUP_TIMESTAMP_KEY, new Date().toISOString());
  } catch {}
}

export function getBackupInfo(): { exists: boolean; timestamp: string | null; sessionCount: number } {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    const timestamp = localStorage.getItem(BACKUP_TIMESTAMP_KEY);
    if (!raw) return { exists: false, timestamp: null, sessionCount: 0 };
    const data = JSON.parse(raw);
    return {
      exists: true,
      timestamp,
      sessionCount: data.sessions?.length || 0,
    };
  } catch {
    return { exists: false, timestamp: null, sessionCount: 0 };
  }
}

export async function restoreFromLocalStorage(): Promise<boolean> {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data.programs || !data.sessions) return false;
    await importData(data);
    return true;
  } catch {
    return false;
  }
}

export function scheduleNightlyBackup(): void {
  const check = () => {
    const now = new Date();
    const hour = now.getHours();
    const today = now.toISOString().split('T')[0];
    const lastScheduled = localStorage.getItem(BACKUP_SCHEDULE_KEY);

    if (hour >= 21 && lastScheduled !== today) {
      localStorage.setItem(BACKUP_SCHEDULE_KEY, today);
      autoBackupToLocalStorage();
    }
  };

  check();
  setInterval(check, 60 * 1000);
}
