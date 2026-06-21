'use client';

import { useState } from 'react';
import { WorkoutSession } from '@/types';
import { getExerciseHistory, getWeeklyProgression, getPersonalRecords } from '@/lib/stats';
import { formatDate, formatDateShort } from '@/lib/utils';
import ExerciseChart from '@/components/ExerciseChart';

interface HistoryViewProps {
  sessions: WorkoutSession[];
}

export default function HistoryView({ sessions }: HistoryViewProps) {
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [tab, setTab] = useState<'exercises' | 'sessions'>('exercises');

  const allExerciseNames = getUniqueExercises(sessions);
  const completedSessions = sessions
    .filter(s => s.completed)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (selectedExercise) {
    return (
      <ExerciseDetail
        exerciseName={selectedExercise}
        sessions={sessions}
        onBack={() => setSelectedExercise(null)}
      />
    );
  }

  return (
    <div className="px-6 pt-14">
      <header className="mb-8">
        <h1 className="text-[28px] font-bold tracking-tight">History</h1>
        <p className="text-[13px] text-charcoal-muted mt-1">
          {completedSessions.length} sessions logged
        </p>
      </header>

      <div className="flex gap-1 bg-surface-100 rounded-xl p-1 mb-6">
        <button
          onClick={() => setTab('exercises')}
          className={`flex-1 py-2.5 text-[12px] font-semibold rounded-lg transition-all duration-200 ${
            tab === 'exercises' ? 'bg-white shadow-sm text-charcoal' : 'text-charcoal-muted'
          }`}
        >
          By Exercise
        </button>
        <button
          onClick={() => setTab('sessions')}
          className={`flex-1 py-2.5 text-[12px] font-semibold rounded-lg transition-all duration-200 ${
            tab === 'sessions' ? 'bg-white shadow-sm text-charcoal' : 'text-charcoal-muted'
          }`}
        >
          By Session
        </button>
      </div>

      {tab === 'exercises' && (
        <div className="space-y-2">
          {allExerciseNames.map((name) => {
            const history = getExerciseHistory(sessions, name);
            const lastEntry = history[0];
            const sessions_count = history.length;
            return (
              <button
                key={name}
                onClick={() => setSelectedExercise(name)}
                className="w-full card p-4 text-left active:scale-[0.97] transition-all duration-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold truncate">{name}</p>
                    {lastEntry && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[12px] text-charcoal-muted font-medium">
                          {lastEntry.weight ?? '—'}w
                        </span>
                        <span className="text-[10px] text-charcoal-muted">·</span>
                        <span className="text-[12px] text-charcoal-muted tabular-nums">
                          {lastEntry.sets.map(s => s.reps ?? '—').join(' / ')}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-right ml-3">
                    <p className="text-[11px] text-charcoal-muted">{sessions_count}×</p>
                    {lastEntry && (
                      <p className="text-[10px] text-charcoal-muted/60 mt-0.5">{formatDateShort(lastEntry.date)}</p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
          {allExerciseNames.length === 0 && (
            <div className="text-center py-16">
              <p className="text-[14px] text-charcoal-muted">No exercises logged yet</p>
              <p className="text-[12px] text-charcoal-muted/60 mt-1">Complete a workout to see your history</p>
            </div>
          )}
        </div>
      )}

      {tab === 'sessions' && (
        <div className="space-y-2">
          {completedSessions.map((session) => {
            const totalSets = session.exercises.reduce((sum, ex) =>
              sum + ex.sets.filter(s => s.completed).length, 0
            );
            const totalVolume = session.exercises.reduce((sum, ex) =>
              sum + ex.sets.reduce((s, set) => s + (set.reps || 0) * (ex.weight || 0), 0), 0
            );
            return (
              <div key={session.id} className="card p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[14px] font-semibold">{session.dayName}</p>
                  <p className="text-[11px] text-charcoal-muted font-medium">{formatDate(session.date)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[12px] text-charcoal-muted">
                    {session.exercises.length} exercises
                  </span>
                  <span className="text-[10px] text-charcoal-muted/40">·</span>
                  <span className="text-[12px] text-charcoal-muted">
                    {totalSets} sets
                  </span>
                  {totalVolume > 0 && (
                    <>
                      <span className="text-[10px] text-charcoal-muted/40">·</span>
                      <span className="text-[12px] text-charcoal-muted tabular-nums">
                        {totalVolume.toLocaleString()} vol
                      </span>
                    </>
                  )}
                </div>
                {session.notes && (
                  <p className="text-[11px] text-charcoal-muted mt-2 italic leading-relaxed">
                    &ldquo;{session.notes}&rdquo;
                  </p>
                )}
              </div>
            );
          })}
          {completedSessions.length === 0 && (
            <div className="text-center py-16">
              <p className="text-[14px] text-charcoal-muted">No sessions yet</p>
              <p className="text-[12px] text-charcoal-muted/60 mt-1">Start your first workout</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ExerciseDetail({
  exerciseName,
  sessions,
  onBack,
}: {
  exerciseName: string;
  sessions: WorkoutSession[];
  onBack: () => void;
}) {
  const history = getExerciseHistory(sessions, exerciseName);
  const progression = getWeeklyProgression(history);
  const records = getPersonalRecords(sessions, exerciseName);

  return (
    <div className="px-6 pt-14 pb-8">
      <header className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="text-[13px] text-charcoal-muted font-medium">
          ← Back
        </button>
        <h1 className="text-[18px] font-bold tracking-tight">{exerciseName}</h1>
      </header>

      {progression && (
        <div className="card-elevated p-5 mb-4">
          <p className="label-uppercase mb-4">Weekly Progression</p>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-[11px] text-charcoal-muted font-medium mb-1">Current</p>
              <p className="text-[24px] font-bold tracking-tight">
                {progression.currentWeight ?? '—'}
              </p>
              <p className="text-[12px] text-charcoal-muted tabular-nums">
                {progression.currentTotalReps} total reps
              </p>
            </div>
            <div>
              <p className="text-[11px] text-charcoal-muted font-medium mb-1">Previous</p>
              <p className="text-[24px] font-bold tracking-tight text-charcoal-light">
                {progression.previousWeight ?? '—'}
              </p>
              <p className="text-[12px] text-charcoal-muted tabular-nums">
                {progression.previousTotalReps} total reps
              </p>
            </div>
          </div>
          {(progression.weightChange !== null || progression.repChange !== 0) && (
            <div className="mt-4 pt-4 border-t border-surface-100 flex gap-4">
              {progression.weightChange !== null && progression.weightChange !== 0 && (
                <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                  progression.weightChange > 0
                    ? 'bg-success-light text-success'
                    : 'bg-red-50 text-red-600'
                }`}>
                  {progression.weightChange > 0 ? '↑' : '↓'} {Math.abs(progression.weightChange)} weight
                </div>
              )}
              {progression.repChange !== 0 && (
                <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                  progression.repChange > 0
                    ? 'bg-success-light text-success'
                    : 'bg-red-50 text-red-600'
                }`}>
                  {progression.repChange > 0 ? '↑' : '↓'} {Math.abs(progression.repChange)} reps
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {records && (
        <div className="card p-5 mb-4">
          <p className="label-uppercase mb-4">Personal Records</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-[20px] font-bold">{records.highestWeight}</p>
              <p className="text-[10px] text-charcoal-muted font-medium mt-0.5">Best Weight</p>
            </div>
            <div className="text-center">
              <p className="text-[20px] font-bold">{records.mostRepsInSet}</p>
              <p className="text-[10px] text-charcoal-muted font-medium mt-0.5">Best Reps</p>
            </div>
            <div className="text-center">
              <p className="text-[20px] font-bold">{records.highestVolume}</p>
              <p className="text-[10px] text-charcoal-muted font-medium mt-0.5">Best Volume</p>
            </div>
          </div>
        </div>
      )}

      {history.length > 1 && (
        <div className="card p-5 mb-4">
          <p className="label-uppercase mb-4">Trend</p>
          <ExerciseChart history={history} />
        </div>
      )}

      <div className="card p-5">
        <p className="label-uppercase mb-5">Timeline</p>
        <div className="space-y-0">
          {history.map((entry, i) => (
            <div key={i} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={`w-2.5 h-2.5 rounded-full mt-1 ${i === 0 ? 'bg-accent' : 'bg-surface-300'}`} />
                {i < history.length - 1 && <div className="w-px flex-1 bg-surface-200 mt-1" />}
              </div>
              <div className="flex-1 pb-5">
                <div className="flex items-baseline justify-between">
                  <p className="text-[13px] font-semibold">
                    Weight {entry.weight ?? '—'}
                  </p>
                  <p className="text-[11px] text-charcoal-muted font-medium">{formatDateShort(entry.date)}</p>
                </div>
                <p className="text-[12px] text-charcoal-muted mt-0.5 tabular-nums">
                  {entry.sets.map(s => s.reps ?? '—').join(' / ')} reps
                </p>
                {entry.notes && (
                  <p className="text-[11px] text-charcoal-muted/80 mt-1.5 italic leading-relaxed">
                    &ldquo;{entry.notes}&rdquo;
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getUniqueExercises(sessions: WorkoutSession[]): string[] {
  const names = new Set<string>();
  for (const session of sessions) {
    if (!session.completed) continue;
    for (const exercise of session.exercises) {
      names.add(exercise.exerciseName);
    }
  }
  return Array.from(names).sort();
}
