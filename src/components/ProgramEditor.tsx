'use client';

import { useState } from 'react';
import { WorkoutProgram, WorkoutDay, Exercise } from '@/types';
import { generateId } from '@/lib/utils';

interface ProgramEditorProps {
  program: WorkoutProgram;
  onSave: (program: WorkoutProgram) => void;
}

export default function ProgramEditor({ program, onSave }: ProgramEditorProps) {
  const [editProgram, setEditProgram] = useState<WorkoutProgram>({ ...program });
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [newExerciseName, setNewExerciseName] = useState('');

  function updateDay(dayId: string, updates: Partial<WorkoutDay>) {
    setEditProgram({
      ...editProgram,
      days: editProgram.days.map(d => d.id === dayId ? { ...d, ...updates } : d),
    });
  }

  function addExercise(dayId: string) {
    if (!newExerciseName.trim()) return;
    const day = editProgram.days.find(d => d.id === dayId);
    if (!day) return;

    const newEx: Exercise = {
      id: generateId(),
      name: newExerciseName.trim(),
      order: day.exercises.length,
    };

    updateDay(dayId, { exercises: [...day.exercises, newEx] });
    setNewExerciseName('');
  }

  function removeExercise(dayId: string, exerciseId: string) {
    const day = editProgram.days.find(d => d.id === dayId);
    if (!day) return;
    const exercises = day.exercises.filter(e => e.id !== exerciseId);
    exercises.forEach((e, i) => (e.order = i));
    updateDay(dayId, { exercises });
  }

  function moveExercise(dayId: string, exerciseId: string, direction: 'up' | 'down') {
    const day = editProgram.days.find(d => d.id === dayId);
    if (!day) return;
    const idx = day.exercises.findIndex(e => e.id === exerciseId);
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === day.exercises.length - 1) return;

    const exercises = [...day.exercises];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    [exercises[idx], exercises[swapIdx]] = [exercises[swapIdx], exercises[idx]];
    exercises.forEach((e, i) => (e.order = i));
    updateDay(dayId, { exercises });
  }

  return (
    <div className="px-6 pt-14 pb-8">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-[28px] font-bold tracking-tight">Program</h1>
        <button
          onClick={() => onSave(editProgram)}
          className="px-4 py-2 bg-accent text-white rounded-xl text-[12px] font-semibold active:scale-[0.95] transition-all shadow-sm"
        >
          Save Changes
        </button>
      </header>

      <div className="mb-8">
        <label className="label-uppercase">Program Name</label>
        <input
          type="text"
          value={editProgram.name}
          onChange={(e) => setEditProgram({ ...editProgram, name: e.target.value })}
          className="w-full mt-2 text-[17px] font-semibold bg-transparent border-b-2 border-surface-200 pb-2 focus:outline-none focus:border-accent transition-colors"
        />
      </div>

      <div className="space-y-3">
        {editProgram.days.map((day) => (
          <div key={day.id} className="card overflow-hidden">
            <button
              onClick={() => setEditingDay(editingDay === day.id ? null : day.id)}
              className="w-full p-5 text-left flex items-center justify-between active:bg-surface-50 transition-colors"
            >
              <div>
                <p className="text-[14px] font-semibold">
                  Day {day.dayNumber} · {day.name}
                </p>
                <p className="text-[11px] text-charcoal-muted font-medium mt-0.5">
                  {day.isRest ? 'Rest' : `${day.exercises.length} exercises`}
                </p>
              </div>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className={`text-charcoal-muted transition-transform duration-200 ${editingDay === day.id ? 'rotate-90' : ''}`}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>

            {editingDay === day.id && !day.isRest && (
              <div className="px-5 pb-5 border-t border-surface-100">
                <div className="space-y-2 mt-4">
                  {day.exercises.map((exercise, idx) => (
                    <div
                      key={exercise.id}
                      className="flex items-center gap-2.5 bg-surface-50 rounded-xl p-3"
                    >
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => moveExercise(day.id, exercise.id, 'up')}
                          className={`text-[10px] text-charcoal-muted p-0.5 ${idx === 0 ? 'opacity-20' : 'active:text-charcoal'}`}
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => moveExercise(day.id, exercise.id, 'down')}
                          className={`text-[10px] text-charcoal-muted p-0.5 ${idx === day.exercises.length - 1 ? 'opacity-20' : 'active:text-charcoal'}`}
                        >
                          ▼
                        </button>
                      </div>
                      <span className="flex-1 text-[13px] font-medium">{exercise.name}</span>
                      <button
                        onClick={() => removeExercise(day.id, exercise.id)}
                        className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center text-red-400 text-[12px] active:bg-red-100"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 mt-4">
                  <input
                    type="text"
                    value={newExerciseName}
                    onChange={(e) => setNewExerciseName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addExercise(day.id);
                    }}
                    placeholder="Exercise name"
                    className="flex-1 bg-surface-50 rounded-xl px-4 py-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all"
                  />
                  <button
                    onClick={() => addExercise(day.id)}
                    className="px-4 py-3 bg-charcoal text-white rounded-xl text-[12px] font-semibold active:scale-[0.95] transition-all"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
