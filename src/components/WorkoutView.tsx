'use client';

import { useState } from 'react';
import { WorkoutProgram, WorkoutSession, ExerciseLog, WorkoutDay } from '@/types';
import { saveSession } from '@/lib/db';
import { getExerciseHistory } from '@/lib/stats';
import { generateId, todayISO, formatDateShort, daysAgo } from '@/lib/utils';

interface WorkoutViewProps {
  program: WorkoutProgram;
  sessions: WorkoutSession[];
  onComplete: () => void;
  onBack: () => void;
}

export default function WorkoutView({ program, sessions, onComplete, onBack }: WorkoutViewProps) {
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);

  function startWorkout(day: WorkoutDay) {
    const exercises: ExerciseLog[] = day.exercises.map((ex, i) => ({
      id: generateId(),
      exerciseName: ex.name,
      weight: getLastWeight(ex.name),
      sets: [
        { setNumber: 1, reps: null, completed: false },
        { setNumber: 2, reps: null, completed: false },
        { setNumber: 3, reps: null, completed: false },
      ],
      notes: '',
      order: i,
    }));

    const session: WorkoutSession = {
      id: generateId(),
      programId: program.id,
      dayId: day.id,
      dayName: day.name,
      date: todayISO(),
      exercises,
      notes: '',
      completed: false,
      startedAt: new Date().toISOString(),
      completedAt: null,
    };

    setActiveSession(session);
    setCurrentExerciseIndex(0);
  }

  function getLastWeight(exerciseName: string): number | null {
    const history = getExerciseHistory(sessions, exerciseName);
    return history.length > 0 ? history[0].weight : null;
  }

  function updateExercise(index: number, updates: Partial<ExerciseLog>) {
    if (!activeSession) return;
    const exercises = [...activeSession.exercises];
    exercises[index] = { ...exercises[index], ...updates };
    setActiveSession({ ...activeSession, exercises });
  }

  function updateSet(exerciseIndex: number, setIndex: number, reps: number | null) {
    if (!activeSession) return;
    const exercises = [...activeSession.exercises];
    const sets = [...exercises[exerciseIndex].sets];
    sets[setIndex] = { ...sets[setIndex], reps, completed: reps !== null && reps > 0 };
    exercises[exerciseIndex] = { ...exercises[exerciseIndex], sets };
    setActiveSession({ ...activeSession, exercises });
  }

  function addSet(exerciseIndex: number) {
    if (!activeSession) return;
    const exercises = [...activeSession.exercises];
    const sets = [...exercises[exerciseIndex].sets];
    sets.push({ setNumber: sets.length + 1, reps: null, completed: false });
    exercises[exerciseIndex] = { ...exercises[exerciseIndex], sets };
    setActiveSession({ ...activeSession, exercises });
  }

  function removeSet(exerciseIndex: number, setIndex: number) {
    if (!activeSession) return;
    const exercises = [...activeSession.exercises];
    const sets = exercises[exerciseIndex].sets.filter((_, i) => i !== setIndex);
    sets.forEach((s, i) => (s.setNumber = i + 1));
    exercises[exerciseIndex] = { ...exercises[exerciseIndex], sets };
    setActiveSession({ ...activeSession, exercises });
  }

  async function finishWorkout() {
    if (!activeSession) return;
    const completed = {
      ...activeSession,
      completed: true,
      completedAt: new Date().toISOString(),
    };
    await saveSession(completed);
    onComplete();
  }

  if (!activeSession) {
    return (
      <DaySelector
        program={program}
        sessions={sessions}
        onSelect={(day) => startWorkout(day)}
        onBack={onBack}
      />
    );
  }

  const currentExercise = activeSession.exercises[currentExerciseIndex];
  const history = getExerciseHistory(sessions, currentExercise.exerciseName);
  const lastSession = history.length > 0 ? history[0] : null;
  const completedCount = activeSession.exercises.filter(
    ex => ex.sets.some(s => s.completed)
  ).length;

  return (
    <div className="px-6 pt-14 pb-6">
      <header className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="text-[13px] text-charcoal-muted font-medium">
          Cancel
        </button>
        <div className="text-center">
          <p className="text-[15px] font-semibold">{activeSession.dayName}</p>
          <p className="text-[11px] text-charcoal-muted">{completedCount}/{activeSession.exercises.length}</p>
        </div>
        <button
          onClick={finishWorkout}
          className="text-[13px] text-accent font-semibold"
        >
          Done
        </button>
      </header>

      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
        {activeSession.exercises.map((ex, i) => {
          const isActive = i === currentExerciseIndex;
          const isDone = ex.sets.some(s => s.completed);
          return (
            <button
              key={ex.id}
              onClick={() => setCurrentExerciseIndex(i)}
              className={`px-3.5 py-2 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all duration-200 ${
                isActive
                  ? 'bg-charcoal text-white shadow-sm'
                  : isDone
                  ? 'bg-success-light text-success'
                  : 'bg-surface-100 text-charcoal-muted'
              }`}
            >
              {ex.exerciseName}
            </button>
          );
        })}
      </div>

      {lastSession && (
        <div className="rounded-2xl p-4 mb-5 bg-gradient-to-br from-accent/5 to-accent/10 border border-accent/10">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold text-accent uppercase tracking-wider">
              Previous
            </p>
            <p className="text-[11px] text-accent/70">{formatDateShort(lastSession.date)}</p>
          </div>
          <div className="flex items-baseline gap-4">
            <div>
              <span className="text-[20px] font-bold">{lastSession.weight ?? '—'}</span>
              <span className="text-[11px] text-charcoal-muted ml-1">weight</span>
            </div>
            <div className="flex gap-1.5">
              {lastSession.sets.map((s, i) => (
                <span key={i} className="bg-white/80 px-2 py-0.5 rounded text-[12px] font-semibold tabular-nums">
                  {s.reps ?? '—'}
                </span>
              ))}
            </div>
          </div>
          {lastSession.notes && (
            <p className="text-[11px] text-charcoal-muted mt-2.5 italic leading-relaxed">
              &ldquo;{lastSession.notes}&rdquo;
            </p>
          )}
        </div>
      )}

      <div className="card-elevated p-6 mb-5">
        <h2 className="text-[18px] font-bold tracking-tight mb-5">{currentExercise.exerciseName}</h2>

        <div className="mb-6">
          <label className="label-uppercase">Weight</label>
          <input
            type="number"
            inputMode="decimal"
            value={currentExercise.weight ?? ''}
            onChange={(e) => updateExercise(currentExerciseIndex, {
              weight: e.target.value ? parseFloat(e.target.value) : null
            })}
            placeholder="0"
            className="w-full mt-2 text-[32px] font-bold tracking-tight bg-transparent border-b-2 border-surface-200 pb-2 focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="label-uppercase">Sets & Reps</label>
            <button
              onClick={() => addSet(currentExerciseIndex)}
              className="text-[11px] text-accent font-semibold uppercase tracking-wider"
            >
              + Add
            </button>
          </div>
          <div className="space-y-2.5">
            {currentExercise.sets.map((set, setIdx) => (
              <div key={setIdx} className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  set.completed
                    ? 'bg-success text-white'
                    : 'bg-surface-100 text-charcoal-muted'
                }`}>
                  {set.setNumber}
                </div>
                <input
                  type="number"
                  inputMode="numeric"
                  value={set.reps ?? ''}
                  onChange={(e) => updateSet(
                    currentExerciseIndex,
                    setIdx,
                    e.target.value ? parseInt(e.target.value) : null
                  )}
                  placeholder="reps"
                  className="flex-1 bg-surface-50 rounded-xl px-4 py-3 text-[14px] font-medium focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all"
                />
                {currentExercise.sets.length > 1 && (
                  <button
                    onClick={() => removeSet(currentExerciseIndex, setIdx)}
                    className="w-7 h-7 rounded-full bg-surface-100 flex items-center justify-center text-charcoal-muted text-[14px] active:bg-surface-200"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <label className="label-uppercase">Notes</label>
          <textarea
            value={currentExercise.notes}
            onChange={(e) => updateExercise(currentExerciseIndex, { notes: e.target.value })}
            placeholder="Any observations..."
            rows={2}
            className="w-full mt-2 bg-surface-50 rounded-xl px-4 py-3 text-[13px] resize-none focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all leading-relaxed"
          />
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setCurrentExerciseIndex(Math.max(0, currentExerciseIndex - 1))}
          disabled={currentExerciseIndex === 0}
          className="flex-1 py-3.5 rounded-2xl bg-surface-100 text-[13px] font-semibold disabled:opacity-25 active:scale-[0.97] transition-all"
        >
          Previous
        </button>
        <button
          onClick={() =>
            setCurrentExerciseIndex(
              Math.min(activeSession.exercises.length - 1, currentExerciseIndex + 1)
            )
          }
          disabled={currentExerciseIndex === activeSession.exercises.length - 1}
          className="flex-1 py-3.5 rounded-2xl bg-charcoal text-white text-[13px] font-semibold disabled:opacity-25 active:scale-[0.97] transition-all shadow-sm"
        >
          Next Exercise
        </button>
      </div>

      <div className="card p-5">
        <label className="label-uppercase">Session Notes</label>
        <textarea
          value={activeSession.notes}
          onChange={(e) => setActiveSession({ ...activeSession, notes: e.target.value })}
          placeholder="How did this workout feel?"
          rows={2}
          className="w-full mt-2 bg-surface-50 rounded-xl px-4 py-3 text-[13px] resize-none focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all leading-relaxed"
        />
      </div>
    </div>
  );
}

function DaySelector({
  program,
  sessions,
  onSelect,
  onBack,
}: {
  program: WorkoutProgram;
  sessions: WorkoutSession[];
  onSelect: (day: WorkoutDay) => void;
  onBack: () => void;
}) {
  return (
    <div className="px-6 pt-14">
      <header className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="text-[13px] text-charcoal-muted font-medium">
          Back
        </button>
        <h1 className="text-[17px] font-semibold">Choose Workout</h1>
        <div className="w-10" />
      </header>

      <div className="space-y-3">
        {program.days.filter(d => !d.isRest).map((day) => {
          const lastForDay = sessions
            .filter(s => s.completed && s.dayId === day.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

          return (
            <button
              key={day.id}
              onClick={() => onSelect(day)}
              className="w-full card p-5 text-left active:scale-[0.97] transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[15px] font-semibold">{day.name}</p>
                  <p className="text-[12px] text-charcoal-muted mt-0.5 font-medium">
                    {day.exercises.length} exercises
                  </p>
                </div>
                <div className="text-right">
                  {lastForDay ? (
                    <p className="text-[11px] text-charcoal-muted font-medium">
                      {daysAgo(lastForDay.date)}
                    </p>
                  ) : (
                    <p className="text-[11px] text-accent/60 font-medium">New</p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
