'use client';

import { useState } from 'react';
import { WorkoutProgram, WorkoutSession, DashboardStats, WorkoutDay } from '@/types';
import { daysAgo, formatDateShort } from '@/lib/utils';
import {
  getThisWeekDailyCounts,
  getThisMonthWeeklyCounts,
  getStreakRuns,
  getCumulativeWorkoutCounts,
  getLast30DaysCounts,
} from '@/lib/stats';
import PageLayout from '@/components/PageLayout';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
} from 'recharts';

interface DashboardProps {
  stats: DashboardStats;
  program: WorkoutProgram;
  sessions: WorkoutSession[];
  onStartNextSession: (day: WorkoutDay) => void;
  onChooseWorkout: () => void;
}

type StatKey = 'week' | 'month' | 'currentStreak' | 'longestStreak' | 'total' | 'daysSince';

export default function Dashboard({ stats, program, sessions, onStartNextSession, onChooseWorkout }: DashboardProps) {
  const nextDay = getNextWorkoutDay(program, sessions);
  const lastWorkoutForDay = nextDay ? getLastWorkoutForDay(sessions, nextDay.id) : null;
  const [openStat, setOpenStat] = useState<StatKey | null>(null);

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
        <StatCard value={stats.workoutsThisWeek} label="This Week" onClick={() => setOpenStat('week')} icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-accent">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        } />
        <StatCard value={stats.workoutsThisMonth} label="This Month" onClick={() => setOpenStat('month')} icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-accent">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        } />
        <StatCard value={stats.currentStreak} label="Day Streak" highlight onClick={() => setOpenStat('currentStreak')} icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-accent">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        } />
        <StatCard value={stats.longestStreak} label="Longest Streak" onClick={() => setOpenStat('longestStreak')} icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-accent">
            <path d="M7 20l5-5 5 5" /><path d="M7 4l5 5 5-5" /><path d="M12 9v6" />
          </svg>
        } />
        <StatCard
          value={stats.daysSinceLastWorkout}
          displayValue={formatDaysSince(stats.daysSinceLastWorkout)}
          label="Days Since Last"
          onClick={() => setOpenStat('daysSince')}
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-accent">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
          }
        />
        <StatCard value={stats.totalWorkouts} label="All Time" onClick={() => setOpenStat('total')} icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-accent">
            <path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" />
          </svg>
        } />
      </div>

      {openStat && (
        <StatModal
          statKey={openStat}
          stats={stats}
          sessions={sessions}
          program={program}
          onClose={() => setOpenStat(null)}
        />
      )}
    </PageLayout>
  );
}

function StatCard({ value, displayValue, label, highlight, icon, onClick }: { value: number | null; displayValue?: string; label: string; highlight?: boolean; icon: React.ReactNode; onClick?: () => void }) {
  const shown = displayValue ?? (value == null ? '—' : String(value));
  const numericHighlight = highlight && typeof value === 'number' && value > 0;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`card p-4 text-left w-full active:scale-[0.97] transition-all duration-200 ${numericHighlight ? 'bg-accent/4 border-accent/15' : ''}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="w-7 h-7 rounded-lg bg-surface-100 flex items-center justify-center">
          {icon}
        </div>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-charcoal-muted/40">
          <path d="M18 15l-6-6-6 6" transform="rotate(90 12 12)" />
        </svg>
      </div>
      <p className="stat-number">{shown}</p>
      <p className="text-[11px] text-charcoal-muted font-medium mt-1.5">{label}</p>
    </button>
  );
}

function formatDaysSince(days: number | null): string {
  if (days == null) return '—';
  if (days === 0) return 'Today';
  return String(days);
}

function StatModal({
  statKey,
  stats,
  sessions,
  program,
  onClose,
}: {
  statKey: StatKey;
  stats: DashboardStats;
  sessions: WorkoutSession[];
  program: WorkoutProgram;
  onClose: () => void;
}) {
  const meta = getModalMeta(statKey, stats);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-charcoal/40 backdrop-blur-sm px-4 pb-6 sm:pb-4"
      onClick={onClose}
    >
      <div
        className="card-elevated w-full max-w-md p-5 rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="label-uppercase">{meta.label}</p>
            <p className="text-[28px] font-bold tracking-tight mt-1">{meta.value}</p>
            {meta.subtitle && (
              <p className="text-[12px] text-charcoal-muted mt-1">{meta.subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-100 flex items-center justify-center active:bg-surface-200 transition-colors"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-charcoal-muted">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <StatChart statKey={statKey} sessions={sessions} program={program} />
      </div>
    </div>
  );
}

function getModalMeta(statKey: StatKey, stats: DashboardStats): { label: string; value: string; subtitle?: string } {
  switch (statKey) {
    case 'week':
      return { label: 'This Week', value: String(stats.workoutsThisWeek), subtitle: 'Workouts logged per day' };
    case 'month':
      return { label: 'This Month', value: String(stats.workoutsThisMonth), subtitle: 'Workouts logged per week' };
    case 'currentStreak':
      return { label: 'Current Streak', value: String(stats.currentStreak), subtitle: 'Rest days count when scheduled' };
    case 'longestStreak':
      return { label: 'Longest Streak', value: String(stats.longestStreak), subtitle: 'Your best run so far' };
    case 'total':
      return { label: 'All Time', value: String(stats.totalWorkouts), subtitle: 'Cumulative workouts' };
    case 'daysSince':
      return { label: 'Days Since Last', value: formatDaysSince(stats.daysSinceLastWorkout), subtitle: 'Activity in the last 30 days' };
  }
}

function StatChart({
  statKey,
  sessions,
  program,
}: {
  statKey: StatKey;
  sessions: WorkoutSession[];
  program: WorkoutProgram;
}) {
  if (statKey === 'week') {
    const data = getThisWeekDailyCounts(sessions);
    return <SimpleBarChart data={data} />;
  }
  if (statKey === 'month') {
    const data = getThisMonthWeeklyCounts(sessions);
    return <SimpleBarChart data={data} />;
  }
  if (statKey === 'daysSince') {
    const data = getLast30DaysCounts(sessions);
    return <SimpleBarChart data={data} />;
  }
  if (statKey === 'currentStreak' || statKey === 'longestStreak') {
    const runs = getStreakRuns(sessions, program);
    if (runs.length === 0) {
      return <EmptyChart message="No streaks yet" />;
    }
    const data = runs.map(r => ({
      label: `#${r.index}`,
      value: r.length,
      isToday: r.isCurrent,
      dateRange: r.startDate === r.endDate
        ? formatDateShort(r.startDate)
        : `${formatDateShort(r.startDate)} → ${formatDateShort(r.endDate)}`,
    }));
    return <StreakBarChart data={data} />;
  }
  const points = getCumulativeWorkoutCounts(sessions);
  if (points.length === 0) return <EmptyChart message="No workouts yet" />;
  const data = points.map(p => ({ label: formatDateShort(p.date), value: p.total }));
  return <CumulativeLineChart data={data} />;
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="h-40 flex items-center justify-center">
      <p className="text-[13px] text-charcoal-muted">{message}</p>
    </div>
  );
}

function SimpleBarChart({ data }: { data: { label: string; value: number; isToday: boolean }[] }) {
  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 5, bottom: 5, left: -20 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#78716c' }}
            axisLine={false}
            tickLine={false}
            dy={4}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#78716c' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: 'rgba(120,113,108,0.08)' }}
            contentStyle={{
              backgroundColor: '#1c1917',
              border: 'none',
              borderRadius: '10px',
              fontSize: '11px',
              color: '#fff',
              padding: '8px 12px',
            }}
            itemStyle={{ color: '#fff', fontSize: '11px' }}
            labelStyle={{ color: '#a8a29e', fontSize: '9px' }}
          />
          <Bar dataKey="value" radius={[6, 6, 2, 2]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.isToday ? '#3b5998' : '#a8a29e'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function StreakBarChart({ data }: { data: { label: string; value: number; isToday: boolean; dateRange: string }[] }) {
  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 5, bottom: 5, left: -20 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#78716c' }}
            axisLine={false}
            tickLine={false}
            dy={4}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#78716c' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: 'rgba(120,113,108,0.08)' }}
            contentStyle={{
              backgroundColor: '#1c1917',
              border: 'none',
              borderRadius: '10px',
              fontSize: '11px',
              color: '#fff',
              padding: '8px 12px',
            }}
            itemStyle={{ color: '#fff', fontSize: '11px' }}
            labelStyle={{ color: '#a8a29e', fontSize: '9px' }}
            formatter={((value: number, _name: string, item: { payload?: { dateRange?: string } }) => {
              const dateRange = item?.payload?.dateRange ?? '';
              return [`${value} days`, dateRange];
            }) as never}
          />
          <Bar dataKey="value" radius={[6, 6, 2, 2]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.isToday ? '#3b5998' : '#a8a29e'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function CumulativeLineChart({ data }: { data: { label: string; value: number }[] }) {
  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 5, bottom: 5, left: -20 }}>
          <XAxis dataKey="label" hide />
          <YAxis
            tick={{ fontSize: 10, fill: '#78716c' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1c1917',
              border: 'none',
              borderRadius: '10px',
              fontSize: '11px',
              color: '#fff',
              padding: '8px 12px',
            }}
            itemStyle={{ color: '#fff', fontSize: '11px' }}
            labelStyle={{ color: '#a8a29e', fontSize: '9px' }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#3b5998"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#3b5998', strokeWidth: 2, stroke: '#fff' }}
          />
        </LineChart>
      </ResponsiveContainer>
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

function getLastWorkoutForDay(sessions: WorkoutSession[], dayId: string): WorkoutSession | null {
  const matching = sessions
    .filter(s => s.completed && s.dayId === dayId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return matching[0] || null;
}
