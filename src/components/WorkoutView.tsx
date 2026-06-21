'use client';

import { useState, useEffect, useRef } from 'react';
import { WorkoutProgram, WorkoutSession, ExerciseLog, WorkoutDay, ExerciseHistory } from '@/types';
import { saveSession } from '@/lib/db';
import { getExerciseHistory, getWeeklyProgression } from '@/lib/stats';
import { generateId, todayISO, formatDateShort, daysAgo } from '@/lib/utils';
import DualLineChart from '@/components/DualLineChart';
import PageLayout from '@/components/PageLayout';

interface WorkoutViewProps {
  program: WorkoutProgram;
  sessions: WorkoutSession[];
  startDay?: WorkoutDay | null;
  onComplete: () => void;
  onBack: () => void;
}

export default function WorkoutView({ program, sessions, startDay, onComplete, onBack }: WorkoutViewProps) {
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [hasAutoStarted, setHasAutoStarted] = useState(false);
  const [touchedExercises, setTouchedExercises] = useState<Set<number>>(new Set());
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeSession) {
      autoSaveDraft(activeSession);
    }
  }, [activeSession]);

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentExerciseIndex]);

  useEffect(() => {
    if (startDay && !hasAutoStarted && !activeSession) {
      startWorkout(startDay);
      setHasAutoStarted(true);
    }
  }, [startDay]);

  function autoSaveDraft(session: WorkoutSession) {
    try {
      localStorage.setItem('workout-draft', JSON.stringify(session));
    } catch {}
  }

  function clearDraft() {
    localStorage.removeItem('workout-draft');
  }

  function loadDraft(): WorkoutSession | null {
    try {
      const raw = localStorage.getItem('workout-draft');
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  }

  function startWorkout(day: WorkoutDay) {
    const draft = loadDraft();
    if (draft && draft.dayId === day.id && draft.date === todayISO()) {
      setActiveSession(draft);
      setCurrentExerciseIndex(0);
      return;
    }

    const exercises: ExerciseLog[] = day.exercises.map((ex, i) => {
      const history = getExerciseHistory(sessions, ex.name);
      const last = history.length > 0 ? history[0] : null;
      return {
        id: generateId(),
        exerciseName: ex.name,
        weight: last?.weight ?? null,
        sets: last
          ? last.sets.map((s, idx) => ({ setNumber: idx + 1, reps: s.reps, completed: false }))
          : [
              { setNumber: 1, reps: null, completed: false },
              { setNumber: 2, reps: null, completed: false },
              { setNumber: 3, reps: null, completed: false },
            ],
        notes: '',
        difficulty: null,
        order: i,
      };
    });

    const lastSessionForDay = sessions
      .filter(s => s.completed && s.dayId === day.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    const session: WorkoutSession = {
      id: generateId(),
      programId: program.id,
      dayId: day.id,
      dayName: day.name,
      date: todayISO(),
      exercises,
      notes: '',
      difficulty: lastSessionForDay?.difficulty ?? null,
      completed: false,
      startedAt: new Date().toISOString(),
      completedAt: null,
    };

    setActiveSession(session);
    setCurrentExerciseIndex(0);
  }

  function markTouched(index: number) {
    setTouchedExercises(prev => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  }

  function updateExercise(index: number, updates: Partial<ExerciseLog>) {
    if (!activeSession) return;
    markTouched(index);
    const exercises = [...activeSession.exercises];
    exercises[index] = { ...exercises[index], ...updates };
    setActiveSession({ ...activeSession, exercises });
  }

  function updateSet(exerciseIndex: number, setIndex: number, reps: number | null) {
    if (!activeSession) return;
    markTouched(exerciseIndex);
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
    clearDraft();
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
  const completedCount = activeSession.exercises.filter(
    (ex, i) => touchedExercises.has(i) && ex.sets.some(s => s.completed || (s.reps !== null && s.reps > 0))
  ).length;

  const headerContent = (
    <div className="flex items-center justify-between">
      <button onClick={() => setShowDiscardConfirm(true)} className="text-[13px] text-charcoal-muted font-medium">
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
    </div>
  );

  return (
    <PageLayout header={headerContent}>
      <div ref={topRef} />

      {showDiscardConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 backdrop-blur-sm px-8">
          <div className="card p-5 w-full max-w-sm">
            <p className="text-[14px] font-semibold mb-1">Discard Workout?</p>
            <p className="text-[12px] text-charcoal-muted mb-5">Your progress will not be saved.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDiscardConfirm(false)}
                className="flex-1 py-3 rounded-xl bg-surface-100 text-[13px] font-semibold active:scale-[0.97] transition-all"
              >
                Keep Going
              </button>
              <button
                onClick={() => { clearDraft(); onBack(); }}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white text-[13px] font-semibold active:scale-[0.97] transition-all"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
        {activeSession.exercises.map((ex, i) => {
          const isActive = i === currentExerciseIndex;
          const isDone = touchedExercises.has(i) && ex.sets.some(s => s.completed || (s.reps !== null && s.reps > 0));
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

      {history.length > 0 && (
        <ExerciseTrends history={history} />
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
                  (set.completed || (set.reps !== null && set.reps > 0))
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
          <label className="label-uppercase mb-2">How did this feel?</label>
          <div className="flex gap-2">
            {([['easy', 'Easy'], ['moderate', 'Just Right'], ['difficult', 'Difficult']] as const).map(([level, label]) => (
              <button
                key={level}
                onClick={() => updateExercise(currentExerciseIndex, {
                  difficulty: currentExercise.difficulty === level ? null : level
                })}
                className={`flex-1 py-2 rounded-lg text-[11px] font-semibold transition-all ${
                  currentExercise.difficulty === level
                    ? level === 'easy'
                      ? 'bg-success-light text-success border border-success/20'
                      : level === 'moderate'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-red-50 text-red-600 border border-red-200'
                    : 'bg-surface-50 text-charcoal-muted border border-transparent'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
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
          placeholder="Anything else to remember?"
          rows={2}
          className="w-full mt-2 bg-surface-50 rounded-xl px-4 py-3 text-[13px] resize-none focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all leading-relaxed"
        />
      </div>
    </PageLayout>
  );
}

function ExerciseTrends({ history }: { history: ExerciseHistory[] }) {
  const progression = getWeeklyProgression(history);
  const recentHistory = history.slice(0, 10).reverse();
  const totalSessions = history.length;

  const chartData = recentHistory.map(h => ({
    date: formatDateShort(h.date),
    weight: h.weight || 0,
    reps: h.sets.reduce((sum, s) => sum + (s.reps || 0), 0),
  }));

  return (
    <div className="rounded-2xl p-4 mb-5 bg-gradient-to-br from-accent/5 to-accent/10 border border-accent/10">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold text-accent uppercase tracking-wider">
          Trends · {totalSessions} {totalSessions === 1 ? 'session' : 'sessions'}
        </p>
        {progression && progression.weightChange !== null && progression.weightChange !== 0 && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            progression.weightChange > 0
              ? 'bg-green-100 text-green-700'
              : 'bg-red-50 text-red-600'
          }`}>
            {progression.weightChange > 0 ? '↑' : '↓'}{Math.abs(progression.weightChange)} weight
          </span>
        )}
      </div>

      <DualLineChart data={chartData} />
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
  const headerContent = (
    <div className="flex items-center justify-between">
      <button onClick={onBack} className="text-[13px] text-charcoal-muted font-medium">
        Back
      </button>
      <h1 className="text-[17px] font-semibold">Choose Workout</h1>
      <div className="w-10" />
    </div>
  );

  return (
    <PageLayout header={headerContent}>
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
    </PageLayout>
  );
}
