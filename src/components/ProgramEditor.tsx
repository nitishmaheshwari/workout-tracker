'use client';

import { useState, useRef, useCallback } from 'react';
import { WorkoutProgram, WorkoutDay, ExerciseDefinition, DayExercise } from '@/types';
import { generateId } from '@/lib/utils';
import { getDayExercises } from '@/lib/program';
import PageLayout from '@/components/PageLayout';

interface ProgramEditorProps {
  program: WorkoutProgram;
  onSave: (program: WorkoutProgram, renames: { oldName: string; newName: string }[]) => void;
}

type Tab = 'routine' | 'exercises';

export default function ProgramEditor({ program, onSave }: ProgramEditorProps) {
  const [editProgram, setEditProgram] = useState<WorkoutProgram>({ ...program });
  const [tab, setTab] = useState<Tab>('routine');
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [pickerDay, setPickerDay] = useState<string | null>(null);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [dragging, setDragging] = useState<{ dayId: string; idx: number } | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const dragStartY = useRef(0);
  const dragItemHeight = useRef(0);

  function updateDay(dayId: string, updates: Partial<WorkoutDay>) {
    setEditProgram({
      ...editProgram,
      days: editProgram.days.map(d => d.id === dayId ? { ...d, ...updates } : d),
    });
  }

  // --- Library (exercise definitions) ---

  function addLibraryExercise() {
    const name = newExerciseName.trim();
    if (!name) return;
    if (editProgram.exercises.some(e => e.name.toLowerCase() === name.toLowerCase())) {
      setNewExerciseName('');
      return;
    }
    const def: ExerciseDefinition = { id: generateId(), name, order: editProgram.exercises.length };
    setEditProgram({ ...editProgram, exercises: [...editProgram.exercises, def] });
    setNewExerciseName('');
  }

  function renameLibraryExercise(exerciseId: string, newName: string) {
    setEditProgram({
      ...editProgram,
      exercises: editProgram.exercises.map(e => e.id === exerciseId ? { ...e, name: newName } : e),
    });
  }

  function removeLibraryExercise(exerciseId: string) {
    setEditProgram({
      ...editProgram,
      exercises: editProgram.exercises.filter(e => e.id !== exerciseId),
      days: editProgram.days.map(d => ({
        ...d,
        exercises: d.exercises
          .filter(ref => ref.exerciseId !== exerciseId)
          .map((ref, i) => ({ ...ref, order: i })),
      })),
    });
  }

  // --- Day <-> library references ---

  function addExerciseToDay(dayId: string, exerciseId: string) {
    const day = editProgram.days.find(d => d.id === dayId);
    if (!day) return;
    if (day.exercises.some(ref => ref.exerciseId === exerciseId)) return;
    const refs: DayExercise[] = [...day.exercises, { exerciseId, order: day.exercises.length }];
    updateDay(dayId, { exercises: refs });
  }

  function removeExerciseFromDay(dayId: string, exerciseId: string) {
    const day = editProgram.days.find(d => d.id === dayId);
    if (!day) return;
    const refs = day.exercises
      .filter(ref => ref.exerciseId !== exerciseId)
      .map((ref, i) => ({ ...ref, order: i }));
    updateDay(dayId, { exercises: refs });
  }

  function reorderExercise(dayId: string, fromIdx: number, toIdx: number) {
    const day = editProgram.days.find(d => d.id === dayId);
    if (!day || fromIdx === toIdx) return;
    const ordered = getDayExercises(editProgram, day);
    const [moved] = ordered.splice(fromIdx, 1);
    ordered.splice(toIdx, 0, moved);
    const refs: DayExercise[] = ordered.map((e, i) => ({ exerciseId: e.id, order: i }));
    updateDay(dayId, { exercises: refs });
  }

  const handleDragStart = useCallback((dayId: string, idx: number, e: React.PointerEvent) => {
    dragStartY.current = e.clientY;
    dragItemHeight.current = (e.currentTarget as HTMLElement).closest('[data-exercise-item]')?.getBoundingClientRect().height || 52;
    setDragging({ dayId, idx });
    setDragOverIdx(idx);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handleDragMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    const day = editProgram.days.find(d => d.id === dragging.dayId);
    if (!day) return;
    const delta = e.clientY - dragStartY.current;
    const steps = Math.round(delta / dragItemHeight.current);
    const newIdx = Math.max(0, Math.min(day.exercises.length - 1, dragging.idx + steps));
    setDragOverIdx(newIdx);
  }, [dragging, editProgram.days]);

  const handleDragEnd = useCallback(() => {
    if (dragging && dragOverIdx !== null) {
      reorderExercise(dragging.dayId, dragging.idx, dragOverIdx);
    }
    setDragging(null);
    setDragOverIdx(null);
  }, [dragging, dragOverIdx]);

  function handleSave() {
    const renames = collectRenames(program, editProgram);
    onSave(editProgram, renames);
  }

  const headerContent = (
    <div className="flex items-center justify-between">
      <h1 className="text-[28px] font-bold tracking-tight">Program</h1>
      <button
        onClick={handleSave}
        className="px-4 py-2 bg-accent text-white rounded-xl text-[12px] font-semibold active:scale-[0.95] transition-all shadow-sm"
      >
        Save Changes
      </button>
    </div>
  );

  return (
    <PageLayout header={headerContent}>
      <div className="flex gap-1 bg-surface-100 rounded-xl p-1 mb-6">
        <button
          onClick={() => setTab('routine')}
          className={`flex-1 py-2.5 text-[12px] font-semibold rounded-lg transition-all duration-200 ${
            tab === 'routine' ? 'bg-white shadow-sm text-charcoal' : 'text-charcoal-muted'
          }`}
        >
          Routine
        </button>
        <button
          onClick={() => setTab('exercises')}
          className={`flex-1 py-2.5 text-[12px] font-semibold rounded-lg transition-all duration-200 ${
            tab === 'exercises' ? 'bg-white shadow-sm text-charcoal' : 'text-charcoal-muted'
          }`}
        >
          Exercises
        </button>
      </div>

      {tab === 'exercises' && (
        <div>
          <div className="mb-4">
            <label className="label-uppercase">Program Name</label>
            <input
              type="text"
              value={editProgram.name}
              onChange={(e) => setEditProgram({ ...editProgram, name: e.target.value })}
              className="w-full mt-2 text-[17px] font-semibold bg-transparent border-b-2 border-surface-200 pb-2 focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          <label className="label-uppercase">Exercise Library</label>
          <p className="text-[11px] text-charcoal-muted mt-1 mb-3 leading-relaxed">
            Define each exercise once. Add them to any day in the Routine tab — the same exercise shares its history everywhere it appears.
          </p>

          <div className="space-y-2">
            {editProgram.exercises.map((exercise) => (
              <div key={exercise.id} className="flex items-center gap-3 bg-surface-50 rounded-xl p-3">
                <input
                  type="text"
                  value={exercise.name}
                  onChange={(e) => renameLibraryExercise(exercise.id, e.target.value)}
                  className="flex-1 text-[13px] font-medium bg-transparent focus:bg-white focus:rounded-lg focus:px-2 focus:py-1 focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
                />
                <button
                  onClick={() => removeLibraryExercise(exercise.id)}
                  className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-400 active:bg-red-100 transition-colors"
                  aria-label="Delete exercise"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            ))}
            {editProgram.exercises.length === 0 && (
              <p className="text-[12px] text-charcoal-muted py-4 text-center">No exercises yet</p>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <input
              type="text"
              value={newExerciseName}
              onChange={(e) => setNewExerciseName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addLibraryExercise(); }}
              placeholder="New exercise name"
              className="flex-1 bg-surface-50 rounded-xl px-4 py-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all"
            />
            <button
              onClick={addLibraryExercise}
              className="px-4 py-3 bg-charcoal text-white rounded-xl text-[12px] font-semibold active:scale-[0.95] transition-all"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {tab === 'routine' && (
        <div className="space-y-3">
          {editProgram.days.map((day) => {
            const dayExercises = getDayExercises(editProgram, day);
            const available = editProgram.exercises.filter(
              e => !day.exercises.some(ref => ref.exerciseId === e.id)
            );
            return (
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
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                    className={`text-charcoal-muted transition-transform duration-200 ${editingDay === day.id ? 'rotate-90' : ''}`}
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>

                {editingDay === day.id && !day.isRest && (
                  <div className="px-5 pb-5 border-t border-surface-100">
                    <div className="mt-4 mb-4">
                      <label className="label-uppercase">Day Name</label>
                      <input
                        type="text"
                        value={day.name}
                        onChange={(e) => updateDay(day.id, { name: e.target.value })}
                        className="w-full mt-1.5 text-[14px] font-medium bg-surface-50 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      {dayExercises.map((exercise, idx) => {
                        const isDragging = dragging?.dayId === day.id && dragging?.idx === idx;
                        const isDropTarget = dragging?.dayId === day.id && dragOverIdx === idx && dragging?.idx !== idx;
                        return (
                          <div
                            key={exercise.id}
                            data-exercise-item
                            className={`flex items-center gap-3 bg-surface-50 rounded-xl p-3 transition-all ${
                              isDragging ? 'opacity-50 scale-95' : ''
                            } ${isDropTarget ? 'ring-2 ring-accent/30 bg-accent/5' : ''}`}
                          >
                            <div
                              className="w-9 h-9 rounded-lg bg-white flex items-center justify-center cursor-grab active:cursor-grabbing shadow-sm active:shadow-md touch-none select-none"
                              onPointerDown={(e) => handleDragStart(day.id, idx, e)}
                              onPointerMove={handleDragMove}
                              onPointerUp={handleDragEnd}
                              onPointerCancel={handleDragEnd}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-charcoal-muted">
                                <circle cx="9" cy="6" r="1.5" fill="currentColor" stroke="none" />
                                <circle cx="15" cy="6" r="1.5" fill="currentColor" stroke="none" />
                                <circle cx="9" cy="12" r="1.5" fill="currentColor" stroke="none" />
                                <circle cx="15" cy="12" r="1.5" fill="currentColor" stroke="none" />
                                <circle cx="9" cy="18" r="1.5" fill="currentColor" stroke="none" />
                                <circle cx="15" cy="18" r="1.5" fill="currentColor" stroke="none" />
                              </svg>
                            </div>
                            <span className="flex-1 text-[13px] font-medium">{exercise.name}</span>
                            <button
                              onClick={() => removeExerciseFromDay(day.id, exercise.id)}
                              className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-400 active:bg-red-100 transition-colors"
                              aria-label="Remove from day"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <line x1="5" y1="12" x2="19" y2="12" />
                              </svg>
                            </button>
                          </div>
                        );
                      })}
                      {dayExercises.length === 0 && (
                        <p className="text-[12px] text-charcoal-muted py-2 text-center">No exercises yet</p>
                      )}
                    </div>

                    <div className="mt-4">
                      <button
                        onClick={() => setPickerDay(pickerDay === day.id ? null : day.id)}
                        className="w-full py-3 rounded-xl bg-charcoal text-white text-[12px] font-semibold active:scale-[0.97] transition-all"
                      >
                        {pickerDay === day.id ? 'Done Adding' : '+ Add Exercise'}
                      </button>
                      {pickerDay === day.id && (
                        <div className="mt-3 space-y-2">
                          {available.length === 0 ? (
                            <p className="text-[11px] text-charcoal-muted text-center py-2">
                              All library exercises are already in this day. Add more in the Exercises tab.
                            </p>
                          ) : (
                            available.map((ex) => (
                              <button
                                key={ex.id}
                                onClick={() => addExerciseToDay(day.id, ex.id)}
                                className="w-full flex items-center justify-between bg-surface-50 rounded-xl px-4 py-3 text-left active:bg-accent/5 transition-colors"
                              >
                                <span className="text-[13px] font-medium">{ex.name}</span>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-accent">
                                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </PageLayout>
  );
}

function collectRenames(
  original: WorkoutProgram,
  edited: WorkoutProgram,
): { oldName: string; newName: string }[] {
  const originalById = new Map<string, string>();
  for (const ex of original.exercises) originalById.set(ex.id, ex.name);

  const seen = new Set<string>();
  const renames: { oldName: string; newName: string }[] = [];
  for (const ex of edited.exercises) {
    const before = originalById.get(ex.id);
    if (before == null) continue;
    if (before === ex.name) continue;
    const key = before.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    renames.push({ oldName: before, newName: ex.name });
  }
  return renames;
}
