'use client';

import { WorkoutProgram, WorkoutSession, DashboardStats, WorkoutDay } from '@/types';
import { daysAgo } from '@/lib/utils';
import PageLayout from '@/components/PageLayout';

interface DashboardProps {
  stats: DashboardStats;
  program: WorkoutProgram;
  sessions: WorkoutSession[];
  onStartNextSession: (day: WorkoutDay) => void;
  onChooseWorkout: () => void;
}

export default function Dashboard({ stats, program, sessions, onStartNextSession, onChooseWorkout }: DashboardProps) {
  const nextDay = getNextWorkoutDay(program, sessions);
  const lastWorkoutForDay = getLastWorkoutForDay(sessions, nextDay?.name || '');

  const headerContent = (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-accent">
            <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
          </svg>
        </div>
        <p className="label-uppercase">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>
      <h1 className="text-[28px] font-bold tracking-tight leading-tight">
        Your Training
      </h1>
    </div>
  );

  return (
    <PageLayout header={headerContent}>

      {nextDay && !nextDay.isRest && (
        <div className="w-full card-elevated p-6 text-left mb-8">
          <div className="flex items-center justify-between">
            <button
              onClick={() => onStartNextSession(nextDay)}
              className="flex-1 text-left active:opacity-70 transition-opacity"
            >
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-6 h-6 rounded-lg bg-success-light flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-success">
                    <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" stroke="none" />
                  </svg>
                </div>
                <p className="label-uppercase">Next Session</p>
              </div>
              <h2 className="text-[22px] font-bold tracking-tight">{nextDay.name}</h2>
              <p className="text-[13px] text-charcoal-muted mt-1.5 font-medium">
                {nextDay.exercises.length} exercises
              </p>
            </button>
            <button
              onClick={onChooseWorkout}
              className="w-12 h-12 rounded-full bg-accent/8 flex items-center justify-center active:bg-accent/15 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-accent ml-0.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          {lastWorkoutForDay && (
            <div className="mt-4 pt-4 border-t border-surface-100 flex items-center gap-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-charcoal-muted">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              <p className="text-[12px] text-charcoal-muted">
                Last session · {daysAgo(lastWorkoutForDay.date)}
              </p>
            </div>
          )}
        </div>
      )}

      {nextDay?.isRest && (
        <div className="w-full card-elevated p-6 mb-8 gradient-subtle">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 rounded-lg bg-warm-dark flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-charcoal-muted">
                    <path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                  </svg>
                </div>
                <p className="label-uppercase">Today</p>
              </div>
              <h2 className="text-[22px] font-bold tracking-tight">Rest Day</h2>
              <p className="text-[13px] text-charcoal-muted mt-1.5">
                Recovery is part of the process
              </p>
            </div>
            <button
              onClick={onChooseWorkout}
              className="w-12 h-12 rounded-full bg-accent/8 flex items-center justify-center active:bg-accent/15 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-accent ml-0.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <StatCard value={stats.workoutsThisWeek} label="This Week" icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-accent">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        } />
        <StatCard value={stats.workoutsThisMonth} label="This Month" icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-accent">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        } />
        <StatCard value={stats.currentStreak} label="Day Streak" highlight icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-accent">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        } />
        <StatCard value={stats.totalWorkouts} label="All Time" icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-accent">
            <path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" />
          </svg>
        } />
      </div>
    </PageLayout>
  );
}

function StatCard({ value, label, highlight, icon }: { value: number; label: string; highlight?: boolean; icon: React.ReactNode }) {
  return (
    <div className={`card p-4 ${highlight && value > 0 ? 'bg-accent/4 border-accent/15' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="w-7 h-7 rounded-lg bg-surface-100 flex items-center justify-center">
          {icon}
        </div>
      </div>
      <p className="stat-number">{value}</p>
      <p className="text-[11px] text-charcoal-muted font-medium mt-1.5">{label}</p>
    </div>
  );
}

function getNextWorkoutDay(program: WorkoutProgram, sessions: WorkoutSession[]) {
  const completedSessions = sessions.filter(s => s.completed);
  if (completedSessions.length === 0) return program.days[0];

  const lastSession = completedSessions.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )[0];

  const lastDayIndex = program.days.findIndex(d => d.id === lastSession.dayId);
  const nextIndex = (lastDayIndex + 1) % program.days.length;
  return program.days[nextIndex];
}

function getLastWorkoutForDay(sessions: WorkoutSession[], dayName: string): WorkoutSession | null {
  const matching = sessions
    .filter(s => s.completed && s.dayName.toLowerCase() === dayName.toLowerCase())
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return matching[0] || null;
}
