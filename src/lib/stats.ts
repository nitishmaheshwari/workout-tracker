import { WorkoutSession, WorkoutProgram, DashboardStats, ExerciseHistory, WeeklyProgression, PersonalRecord } from '@/types';
import { startOfWeek, startOfMonth, parseISO, differenceInDays, isSameDay, subDays } from 'date-fns';

export function calculateDashboardStats(sessions: WorkoutSession[], program: WorkoutProgram | null): DashboardStats {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);

  const completedSessions = sessions.filter(s => s.completed);

  const workoutsThisWeek = completedSessions.filter(
    s => parseISO(s.date) >= weekStart
  ).length;

  const workoutsThisMonth = completedSessions.filter(
    s => parseISO(s.date) >= monthStart
  ).length;

  const currentStreak = calculateStreak(completedSessions, program);

  let totalSets = 0;
  let totalReps = 0;
  let totalVolume = 0;

  for (const session of completedSessions) {
    for (const exercise of session.exercises) {
      for (const set of exercise.sets) {
        if (set.reps && set.reps > 0) {
          totalSets++;
          totalReps += set.reps;
          totalVolume += (exercise.weight || 0) * set.reps;
        }
      }
    }
  }

  return {
    workoutsThisWeek,
    workoutsThisMonth,
    currentStreak,
    totalWorkouts: completedSessions.length,
    totalSets,
    totalReps,
    totalVolume,
  };
}

function calculateStreak(sessions: WorkoutSession[], program: WorkoutProgram | null): number {
  if (sessions.length === 0) return 0;

  const sorted = [...sessions].sort(
    (a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()
  );

  const uniqueByDate: WorkoutSession[] = [];
  for (const s of sorted) {
    const prev = uniqueByDate[uniqueByDate.length - 1];
    if (!prev || !isSameDay(parseISO(s.date), parseISO(prev.date))) {
      uniqueByDate.push(s);
    }
  }

  if (uniqueByDate.length === 0) return 0;

  const today = new Date();
  const lastWorkout = uniqueByDate[0];
  const daysSinceLast = differenceInDays(today, parseISO(lastWorkout.date));

  if (daysSinceLast < 0) return 0;
  if (!intermediatesAllRest(program, lastWorkout.dayId, daysSinceLast)) return 0;

  let streak = 1;
  for (let i = 1; i < uniqueByDate.length; i++) {
    const newer = uniqueByDate[i - 1];
    const older = uniqueByDate[i];
    const actualGap = differenceInDays(parseISO(newer.date), parseISO(older.date));
    if (intermediatesAllRest(program, older.dayId, actualGap)) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

function intermediatesAllRest(
  program: WorkoutProgram | null,
  fromDayId: string,
  calendarGap: number,
): boolean {
  if (calendarGap <= 1) return true;
  if (!program || program.days.length === 0) return false;
  const days = program.days;
  const fromIdx = days.findIndex(d => d.id === fromDayId);
  if (fromIdx === -1) return false;
  const len = days.length;
  if (calendarGap - 1 >= len) return false;
  for (let k = 1; k < calendarGap; k++) {
    const pos = (fromIdx + k) % len;
    if (!days[pos].isRest) return false;
  }
  return true;
}

export function getExerciseHistory(sessions: WorkoutSession[], exerciseName: string): ExerciseHistory[] {
  const history: ExerciseHistory[] = [];

  const sortedSessions = [...sessions]
    .filter(s => s.completed)
    .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());

  for (const session of sortedSessions) {
    for (const exercise of session.exercises) {
      if (exercise.exerciseName.toLowerCase() === exerciseName.toLowerCase()) {
        const totalReps = exercise.sets.reduce((sum, set) => sum + (set.reps || 0), 0);
        const volume = (exercise.weight || 0) * totalReps;
        history.push({
          date: session.date,
          weight: exercise.weight,
          sets: exercise.sets,
          notes: exercise.notes,
          volume,
        });
      }
    }
  }

  return history;
}

export function getWeeklyProgression(history: ExerciseHistory[]): WeeklyProgression | null {
  if (history.length === 0) return null;

  const current = history[0];
  const previous = history.length > 1 ? history[1] : null;

  const currentTotalReps = current.sets.reduce((sum, s) => sum + (s.reps || 0), 0);
  const previousTotalReps = previous
    ? previous.sets.reduce((sum, s) => sum + (s.reps || 0), 0)
    : 0;

  let personalBestWeight = 0;
  let personalBestVolume = 0;

  for (const entry of history) {
    if ((entry.weight || 0) > personalBestWeight) {
      personalBestWeight = entry.weight || 0;
    }
    if (entry.volume > personalBestVolume) {
      personalBestVolume = entry.volume;
    }
  }

  return {
    currentWeight: current.weight,
    previousWeight: previous?.weight || null,
    weightChange: previous?.weight != null && current.weight != null
      ? current.weight - previous.weight
      : null,
    currentTotalReps,
    previousTotalReps,
    repChange: currentTotalReps - previousTotalReps,
    personalBestWeight,
    personalBestVolume,
  };
}

export function getPersonalRecords(sessions: WorkoutSession[], exerciseName: string): PersonalRecord | null {
  const history = getExerciseHistory(sessions, exerciseName);
  if (history.length === 0) return null;

  let highestWeight = 0;
  let highestWeightDate = '';
  let mostRepsInSet = 0;
  let mostRepsDate = '';
  let highestVolume = 0;
  let highestVolumeDate = '';

  for (const entry of history) {
    if ((entry.weight || 0) > highestWeight) {
      highestWeight = entry.weight || 0;
      highestWeightDate = entry.date;
    }
    for (const set of entry.sets) {
      if ((set.reps || 0) > mostRepsInSet) {
        mostRepsInSet = set.reps || 0;
        mostRepsDate = entry.date;
      }
    }
    if (entry.volume > highestVolume) {
      highestVolume = entry.volume;
      highestVolumeDate = entry.date;
    }
  }

  return {
    exerciseName,
    highestWeight,
    highestWeightDate,
    mostRepsInSet,
    mostRepsDate,
    highestVolume,
    highestVolumeDate,
    longestStreak: history.length,
  };
}
