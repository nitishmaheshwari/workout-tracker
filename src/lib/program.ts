import { WorkoutProgram, WorkoutDay, ExerciseDefinition, DayExercise } from '@/types';
import { generateId } from './utils';

// Old shape: days carried inline exercises { id, name, order } and there was
// no top-level library. Detect and migrate to the new { exercises, days } model.
interface LegacyExercise {
  id: string;
  name: string;
  order: number;
}

interface LegacyDay {
  id: string;
  name: string;
  dayNumber: number;
  isRest: boolean;
  exercises: LegacyExercise[];
}

function isLegacyProgram(program: unknown): program is Omit<WorkoutProgram, 'exercises' | 'days'> & { days: LegacyDay[] } {
  if (!program || typeof program !== 'object') return false;
  const p = program as { exercises?: unknown; days?: unknown };
  if (Array.isArray(p.exercises)) return false;
  if (!Array.isArray(p.days)) return false;
  const firstDay = p.days[0] as { exercises?: unknown } | undefined;
  if (!firstDay || !Array.isArray(firstDay.exercises)) return false;
  const firstEx = firstDay.exercises[0] as { name?: unknown } | undefined;
  // Legacy day exercises have a `name`; new ones only have `exerciseId`.
  return !!firstEx && typeof firstEx.name === 'string';
}

// Ensure a program conforms to the new data model. Migrates legacy programs by
// lifting every distinct exercise (case-insensitive by name) into a shared
// library and rewriting each day to reference library entries by id.
export function migrateProgram(program: WorkoutProgram): WorkoutProgram {
  if (!isLegacyProgram(program)) return program;

  const legacy = program as unknown as { id: string; name: string; createdAt: string; days: LegacyDay[] };

  const byName = new Map<string, ExerciseDefinition>();
  const library: ExerciseDefinition[] = [];

  const days: WorkoutDay[] = legacy.days.map((day) => {
    const dayExercises: DayExercise[] = day.exercises.map((ex, i) => {
      const key = ex.name.toLowerCase();
      let def = byName.get(key);
      if (!def) {
        def = { id: ex.id || generateId(), name: ex.name, order: library.length };
        byName.set(key, def);
        library.push(def);
      }
      return { exerciseId: def.id, order: i };
    });
    return {
      id: day.id,
      name: day.name,
      dayNumber: day.dayNumber,
      isRest: day.isRest,
      exercises: dayExercises,
    };
  });

  return {
    id: legacy.id,
    name: legacy.name,
    createdAt: legacy.createdAt,
    exercises: library,
    days,
  };
}

// Resolve a day's exercise references to their library definitions, ordered.
export function getDayExercises(program: WorkoutProgram, day: WorkoutDay): ExerciseDefinition[] {
  const byId = new Map(program.exercises.map((e) => [e.id, e]));
  return [...day.exercises]
    .sort((a, b) => a.order - b.order)
    .map((ref) => byId.get(ref.exerciseId))
    .filter((e): e is ExerciseDefinition => !!e);
}

export function getExerciseName(program: WorkoutProgram, exerciseId: string): string {
  return program.exercises.find((e) => e.id === exerciseId)?.name ?? '';
}
