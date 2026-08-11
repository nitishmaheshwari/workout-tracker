import { WorkoutProgram, WorkoutDay, ExerciseDefinition, DayExercise, WorkoutSession } from '@/types';
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

// Sessions are the source of truth for what was actually trained. Fold any
// exercise that appears in a completed session back into the program so the
// library and routine never drift from reality:
//   1. lift every logged-but-unknown exercise name into the shared library, and
//   2. additively append it to the plan of each (non-rest) day it was logged on.
// Purely data-driven — no hardcoded exercise names. Nothing is ever removed;
// existing library entries and day order are preserved. Returns the same
// program reference when there's nothing to add (identity check by caller).
export function reconcileProgramFromSessions(
  program: WorkoutProgram,
  sessions: WorkoutSession[],
): WorkoutProgram {
  const completed = sessions.filter((s) => s.completed);
  if (completed.length === 0) return program;

  // Existing library, indexed case-insensitively by name.
  const libByName = new Map<string, ExerciseDefinition>();
  for (const ex of program.exercises) libByName.set(ex.name.toLowerCase(), ex);

  const library = [...program.exercises];
  let changed = false;

  function ensureLibraryEntry(name: string): ExerciseDefinition {
    const key = name.toLowerCase();
    let def = libByName.get(key);
    if (!def) {
      def = { id: generateId(), name, order: library.length };
      libByName.set(key, def);
      library.push(def);
      changed = true;
    }
    return def;
  }

  // For each day, the ordered set of exercise names logged against it, taken
  // from that day's most recent session first so appended exercises follow the
  // order you last performed them.
  const loggedNamesByDay = new Map<string, string[]>();
  const latestDateByDay = new Map<string, string>();
  const sortedByDateDesc = [...completed].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  for (const session of sortedByDateDesc) {
    const isLatest = !latestDateByDay.has(session.dayId);
    if (isLatest) latestDateByDay.set(session.dayId, session.date);

    let names = loggedNamesByDay.get(session.dayId);
    if (!names) {
      names = [];
      loggedNamesByDay.set(session.dayId, names);
    }
    const ordered = [...session.exercises].sort((a, b) => a.order - b.order);
    for (const ex of ordered) {
      ensureLibraryEntry(ex.exerciseName);
      const key = ex.exerciseName.toLowerCase();
      if (!names.some((n) => n.toLowerCase() === key)) names.push(ex.exerciseName);
    }
  }

  const days: WorkoutDay[] = program.days.map((day) => {
    if (day.isRest) return day;
    const loggedNames = loggedNamesByDay.get(day.id);
    if (!loggedNames || loggedNames.length === 0) return day;

    const referenced = new Set(day.exercises.map((ref) => ref.exerciseId));
    const additions: DayExercise[] = [];
    let order = day.exercises.length;
    for (const name of loggedNames) {
      const def = libByName.get(name.toLowerCase());
      if (!def || referenced.has(def.id)) continue;
      referenced.add(def.id);
      additions.push({ exerciseId: def.id, order: order++ });
    }
    if (additions.length === 0) return day;
    changed = true;
    return { ...day, exercises: [...day.exercises, ...additions] };
  });

  if (!changed) return program;
  return { ...program, exercises: library, days };
}
