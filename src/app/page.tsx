'use client';

import { useState, useEffect } from 'react';
import { WorkoutProgram, WorkoutSession, DashboardStats } from '@/types';
import { getAllPrograms, getAllSessions, saveProgram } from '@/lib/db';
import { DEFAULT_PROGRAM } from '@/lib/defaults';
import { calculateDashboardStats } from '@/lib/stats';
import { daysAgo } from '@/lib/utils';
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

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      let programs = await getAllPrograms();
      if (programs.length === 0) {
        await saveProgram(DEFAULT_PROGRAM);
        programs = [DEFAULT_PROGRAM];
      }
      setProgram(programs[0]);

      const allSessions = await getAllSessions();
      setSessions(allSessions);
      setStats(calculateDashboardStats(allSessions));
    } catch (e) {
      console.error('Failed to load data:', e);
    } finally {
      setLoading(false);
    }
  }

  async function refreshSessions() {
    const allSessions = await getAllSessions();
    setSessions(allSessions);
    setStats(calculateDashboardStats(allSessions));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-charcoal-muted text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen max-w-lg mx-auto">
      <main className="flex-1 pb-20">
        {view === 'dashboard' && stats && program && (
          <Dashboard
            stats={stats}
            program={program}
            sessions={sessions}
            onStartWorkout={() => setView('workout')}
          />
        )}
        {view === 'workout' && program && (
          <WorkoutView
            program={program}
            sessions={sessions}
            onComplete={() => {
              refreshSessions();
              setView('dashboard');
            }}
            onBack={() => setView('dashboard')}
          />
        )}
        {view === 'history' && (
          <HistoryView sessions={sessions} />
        )}
        {view === 'program' && program && (
          <ProgramEditor
            program={program}
            onSave={(p) => {
              setProgram(p);
              saveProgram(p);
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
