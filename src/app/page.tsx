'use client';

import { useState, useEffect } from 'react';
import { WorkoutProgram, WorkoutSession, DashboardStats, WorkoutDay } from '@/types';
import { getAllPrograms, getAllSessions, saveProgram, saveSession, deleteSession } from '@/lib/db';
import { DEFAULT_PROGRAM } from '@/lib/defaults';
import { calculateDashboardStats } from '@/lib/stats';
import { autoBackupToLocalStorage, scheduleNightlyBackup, getBackupInfo, restoreFromLocalStorage } from '@/lib/backup';
import Dashboard from '@/components/Dashboard';
import WorkoutView from '@/components/WorkoutView';
import HistoryView from '@/components/HistoryView';
import ProgramEditor from '@/components/ProgramEditor';
import SettingsView from '@/components/SettingsView';
import Navigation from '@/components/Navigation';

type View = 'dashboard' | 'workout' | 'history' | 'program' | 'settings';

export default function Home() {
  const [view, setView] = useState<View>('dashboard');
  const [program, setProgram] = useState<WorkoutProgram | null>(null);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDay, setStartDay] = useState<WorkoutDay | null>(null);
  const [showRestoreBanner, setShowRestoreBanner] = useState(false);
  const [editSessionId, setEditSessionId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    scheduleNightlyBackup();
  }, []);

  async function loadData() {
    try {
      let programs = await getAllPrograms();
      let allSessions = await getAllSessions();

      if (programs.length === 0 && allSessions.length === 0) {
        const backup = getBackupInfo();
        if (backup.exists && backup.sessionCount > 0) {
          setShowRestoreBanner(true);
        }
        await saveProgram(DEFAULT_PROGRAM);
        programs = [DEFAULT_PROGRAM];
      }

      if (programs.length === 0) {
        await saveProgram(DEFAULT_PROGRAM);
        programs = [DEFAULT_PROGRAM];
      }

      allSessions = await normalizeExerciseNamesOnce(programs[0], allSessions);

      setProgram(programs[0]);
      setSessions(allSessions);
      setStats(calculateDashboardStats(allSessions, programs[0]));
    } catch (e) {
      console.error('Failed to load data:', e);
    } finally {
      setLoading(false);
    }
  }

  async function refreshSessions() {
    const allSessions = await getAllSessions();
    setSessions(allSessions);
    setStats(calculateDashboardStats(allSessions, program));
    autoBackupToLocalStorage();
  }

  async function handleRestore() {
    const success = await restoreFromLocalStorage();
    if (success) {
      setShowRestoreBanner(false);
      await loadData();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-charcoal-muted text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-lg mx-auto">
      {showRestoreBanner && (
        <div className="shrink-0 px-5 py-3 bg-accent/10 border-b border-accent/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-accent">Backup Found</p>
              <p className="text-[11px] text-charcoal-muted mt-0.5">
                {getBackupInfo().sessionCount} sessions available
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowRestoreBanner(false)}
                className="px-3 py-1.5 rounded-lg bg-surface-100 text-[11px] font-semibold text-charcoal-muted"
              >
                Skip
              </button>
              <button
                onClick={handleRestore}
                className="px-3 py-1.5 rounded-lg bg-accent text-white text-[11px] font-semibold"
              >
                Restore
              </button>
            </div>
          </div>
        </div>
      )}
      <main className="flex-1 min-h-0 overflow-hidden">
        {view === 'dashboard' && stats && program && (
          <Dashboard
            stats={stats}
            program={program}
            sessions={sessions}
            onStartNextSession={(day) => {
              setStartDay(day);
              setView('workout');
            }}
            onChooseWorkout={() => {
              setStartDay(null);
              setView('workout');
            }}
          />
        )}
        {view === 'workout' && program && (
          <WorkoutView
            program={program}
            sessions={sessions}
            startDay={startDay}
            editSession={editSessionId ? sessions.find(s => s.id === editSessionId) ?? null : null}
            onComplete={() => {
              refreshSessions();
              setStartDay(null);
              const wasEditing = editSessionId !== null;
              setEditSessionId(null);
              setView(wasEditing ? 'history' : 'dashboard');
            }}
            onBack={() => {
              setStartDay(null);
              const wasEditing = editSessionId !== null;
              setEditSessionId(null);
              setView(wasEditing ? 'history' : 'dashboard');
            }}
          />
        )}
        {view === 'history' && (
          <HistoryView
            sessions={sessions}
            onDeleteSession={async (id) => {
              await deleteSession(id);
              refreshSessions();
            }}
            onEditSession={(id) => {
              setEditSessionId(id);
              setStartDay(null);
              setView('workout');
            }}
          />
        )}
        {view === 'program' && program && (
          <ProgramEditor
            program={program}
            onSave={async (p, renames) => {
              await saveProgram(p);
              setProgram(p);
              if (renames.length > 0) {
                await cascadeExerciseRenames(renames);
                await refreshSessions();
              } else {
                autoBackupToLocalStorage();
              }
              setView('dashboard');
            }}
          />
        )}
        {view === 'settings' && (
          <SettingsView onImport={refreshSessions} />
        )}
      </main>
      <Navigation currentView={view} onNavigate={setView} />
    </div>
  );
}

const NORMALIZE_FLAG_KEY = 'exercise-name-normalized-v1';

async function normalizeExerciseNamesOnce(
  program: WorkoutProgram,
  sessions: WorkoutSession[],
): Promise<WorkoutSession[]> {
  if (typeof window === 'undefined') return sessions;
  if (localStorage.getItem(NORMALIZE_FLAG_KEY)) return sessions;

  const canonical = new Map<string, string>();
  for (const day of program.days) {
    for (const ex of day.exercises) {
      const key = ex.name.toLowerCase();
      if (!canonical.has(key)) canonical.set(key, ex.name);
    }
  }

  const updated: WorkoutSession[] = [];
  for (const session of sessions) {
    let dirty = false;
    const newExercises = session.exercises.map(ex => {
      const target = canonical.get(ex.exerciseName.toLowerCase());
      if (target && target !== ex.exerciseName) {
        dirty = true;
        return { ...ex, exerciseName: target };
      }
      return ex;
    });
    if (dirty) {
      const next = { ...session, exercises: newExercises };
      await saveSession(next);
      updated.push(next);
    } else {
      updated.push(session);
    }
  }

  localStorage.setItem(NORMALIZE_FLAG_KEY, '1');
  return updated;
}

async function cascadeExerciseRenames(
  renames: { oldName: string; newName: string }[],
): Promise<void> {
  if (renames.length === 0) return;
  const map = new Map<string, string>();
  for (const r of renames) {
    if (r.oldName.toLowerCase() !== r.newName.toLowerCase() || r.oldName !== r.newName) {
      map.set(r.oldName.toLowerCase(), r.newName);
    }
  }
  if (map.size === 0) return;

  const all = await getAllSessions();
  for (const session of all) {
    let dirty = false;
    const newExercises = session.exercises.map(ex => {
      const target = map.get(ex.exerciseName.toLowerCase());
      if (target && target !== ex.exerciseName) {
        dirty = true;
        return { ...ex, exerciseName: target };
      }
      return ex;
    });
    if (dirty) {
      await saveSession({ ...session, exercises: newExercises });
    }
  }
}
