'use client';

import { useState, useRef, useCallback } from 'react';
import { WorkoutProgram, WorkoutDay, Exercise } from '@/types';
import { generateId } from '@/lib/utils';
import PageLayout from '@/components/PageLayout';

interface ProgramEditorProps {
  program: WorkoutProgram;
  onSave: (program: WorkoutProgram, renames: { oldName: string; newName: string }[]) => void;
}

export default function ProgramEditor({ program, onSave }: ProgramEditorProps) {
  const [editProgram, setEditProgram] = useState<WorkoutProgram>({ ...program });
  const [editingDay, setEditingDay] = useState<string | null>(null);
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

  function renameExercise(dayId: string, exerciseId: string, newName: string) {
    const day = editProgram.days.find(d => d.id === dayId);
    if (!day) return;
    const target = day.exercises.find(e => e.id === exerciseId);
    if (!target) return;
    const oldName = target.name;
    const oldKey = oldName.toLowerCase();
    const days = editProgram.days.map(d => ({
      ...d,
      exercises: d.exercises.map(e => {
        if (e.id === exerciseId) return { ...e, name: newName };
        if (e.name.toLowerCase() === oldKey) return { ...e, name: newName };
        return e;
      }),
    }));
    setEditProgram({ ...editProgram, days });
  }

  function removeExercise(dayId: string, exerciseId: string) {
    const day = editProgram.days.find(d => d.id === dayId);
    if (!day) return;
    const exercises = day.exercises.filter(e => e.id !== exerciseId);
    exercises.forEach((e, i) => (e.order = i));
    updateDay(dayId, { exercises });
  }

  function reorderExercise(dayId: string, fromIdx: number, toIdx: number) {
    const day = editProgram.days.find(d => d.id === dayId);
    if (!day || fromIdx === toIdx) return;
    const exercises = [...day.exercises];
    const [moved] = exercises.splice(fromIdx, 1);
    exercises.splice(toIdx, 0, moved);
    exercises.forEach((e, i) => (e.order = i));
    updateDay(dayId, { exercises });
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
                  {day.exercises.map((exercise, idx) => {
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
                        <input
                          type="text"
                          value={exercise.name}
                          onChange={(e) => renameExercise(day.id, exercise.id, e.target.value)}
                          className="flex-1 text-[13px] font-medium bg-transparent focus:bg-white focus:rounded-lg focus:px-2 focus:py-1 focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
                        />
                        <button
                          onClick={() => removeExercise(day.id, exercise.id)}
                          className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-400 active:bg-red-100 transition-colors"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
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
    </PageLayout>
  );
}

function collectRenames(
  original: WorkoutProgram,
  edited: WorkoutProgram,
): { oldName: string; newName: string }[] {
  const originalById = new Map<string, string>();
  for (const day of original.days) {
    for (const ex of day.exercises) originalById.set(ex.id, ex.name);
  }

  const seen = new Set<string>();
  const renames: { oldName: string; newName: string }[] = [];
  for (const day of edited.days) {
    for (const ex of day.exercises) {
      const before = originalById.get(ex.id);
      if (before == null) continue;
      if (before === ex.name) continue;
      const key = before.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      renames.push({ oldName: before, newName: ex.name });
    }
  }
  return renames;
}
