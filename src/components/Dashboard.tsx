'use client';

import { WorkoutProgram, WorkoutSession, DashboardStats } from '@/types';
import { daysAgo } from '@/lib/utils';

interface DashboardProps {
  stats: DashboardStats;
  program: WorkoutProgram;
  sessions: WorkoutSession[];
  onStartWorkout: () => void;
}

export default function Dashboard({ stats, program, sessions, onStartWorkout }: DashboardProps) {
  const nextDay = getNextWorkoutDay(program, sessions);
  const lastWorkoutForDay = getLastWorkoutForDay(sessions, nextDay?.name || '');

  return (
    <div className="px-6 pt-14 pb-6">
      <header className="mb-10">
        <p className="label-uppercase mb-2">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <h1 className="text-[28px] font-bold tracking-tight leading-tight">
          Your Training
        </h1>
      </header>

      {nextDay && !nextDay.isRest && (
        <button
          onClick={onStartWorkout}
          className="w-full card-elevated p-6 text-left mb-8 active:scale-[0.97] transition-all duration-200 group"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="label-uppercase mb-1.5">Next Session</p>
              <h2 className="text-[22px] font-bold tracking-tight">{nextDay.name}</h2>
              <p className="text-[13px] text-charcoal-muted mt-1.5 font-medium">
                {nextDay.exercises.length} exercises
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-accent/8 flex items-center justify-center group-hover:bg-accent/12 transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-accent ml-0.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </div>
          {lastWorkoutForDay && (
            <div className="mt-4 pt-4 border-t border-surface-100">
              <p className="text-[12px] text-charcoal-muted">
                Last session · {daysAgo(lastWorkoutForDay.date)}
              </p>
            </div>
          )}
        </button>
      )}

      {nextDay?.isRest && (
        <div className="w-full card-elevated p-6 mb-8 gradient-subtle">
          <p className="label-uppercase mb-1.5">Today</p>
          <h2 className="text-[22px] font-bold tracking-tight">Rest Day</h2>
          <p className="text-[13px] text-charcoal-muted mt-1.5">
            Recovery is part of the process
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard value={stats.workoutsThisWeek} label="This Week" />
        <StatCard value={stats.workoutsThisMonth} label="This Month" />
        <StatCard value={stats.currentStreak} label="Day Streak" highlight />
        <StatCard value={stats.totalWorkouts} label="All Time" />
      </div>

      <div className="card p-5">
        <p className="label-uppercase mb-4">Lifetime</p>
        <div className="space-y-3.5">
          <MetricRow label="Sets Completed" value={stats.totalSets.toLocaleString()} />
          <MetricRow label="Reps Completed" value={stats.totalReps.toLocaleString()} />
          <MetricRow label="Total Volume" value={formatVolume(stats.totalVolume)} />
        </div>
      </div>
    </div>
  );
}

function StatCard({ value, label, highlight }: { value: number; label: string; highlight?: boolean }) {
  return (
    <div className={`card p-4 ${highlight && value > 0 ? 'bg-accent/4 border-accent/15' : ''}`}>
      <p className="stat-number">{value}</p>
      <p className="text-[11px] text-charcoal-muted font-medium mt-1.5">{label}</p>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] text-charcoal-light">{label}</span>
      <span className="text-[13px] font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function formatVolume(vol: number): string {
  if (vol >= 1000000) return `${(vol / 1000000).toFixed(1)}M`;
  if (vol >= 1000) return `${(vol / 1000).toFixed(1)}K`;
  return vol.toString();
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
