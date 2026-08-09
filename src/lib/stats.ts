import { WorkoutSession, WorkoutProgram, DashboardStats, ExerciseHistory, WeeklyProgression, PersonalRecord } from '@/types';
import {
  startOfWeek,
  startOfMonth,
  endOfMonth,
  parseISO,
  differenceInDays,
  isSameDay,
  subDays,
  addDays,
  format,
} from 'date-fns';

export function calculateDashboardStats(sessions: WorkoutSession[], program: WorkoutProgram | null): DashboardStats {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);

  const completedSessions = sessions.filter(s => s.completed);

  // Logged sessions plus scheduled rest days that fell in range but weren't
  // explicitly logged — so rest days count toward the week/month totals.
  const workoutsThisWeek =
    completedSessions.filter(s => parseISO(s.date) >= weekStart).length +
    getScheduledRestDates(completedSessions, program, weekStart, now).size;

  const workoutsThisMonth =
    completedSessions.filter(s => parseISO(s.date) >= monthStart).length +
    getScheduledRestDates(completedSessions, program, monthStart, now).size;

  const currentStreak = calculateStreak(completedSessions, program);
  const longestStreak = calculateLongestStreak(completedSessions, program);

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

  let daysSinceLastWorkout: number | null = null;
  if (completedSessions.length > 0) {
    const latest = completedSessions
      .map(s => parseISO(s.date))
      .sort((a, b) => b.getTime() - a.getTime())[0];
    const diff = differenceInDays(now, latest);
    daysSinceLastWorkout = diff < 0 ? 0 : diff;
  }

  const missedThisMonth = calculateMissedThisMonth(completedSessions, program, now, monthStart);

  return {
    workoutsThisWeek,
    workoutsThisMonth,
    currentStreak,
    longestStreak,
    totalWorkouts: completedSessions.length,
    totalSets,
    totalReps,
    totalVolume,
    daysSinceLastWorkout,
    missedThisMonth,
  };
}

// Build a date -> program-day-index anchor list from completed sessions, so a
// schedule slot can be derived for any calendar date (advances one program day
// per calendar day from the most recent anchor on or before that date).
function buildAnchors(sessions: WorkoutSession[], program: WorkoutProgram) {
  return [...sessions]
    .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
    .map(s => ({ date: parseISO(s.date), idx: program.days.findIndex(d => d.id === s.dayId) }))
    .filter(a => a.idx !== -1);
}

function scheduledSlot(
  anchors: { date: Date; idx: number }[],
  program: WorkoutProgram,
  day: Date,
): number | null {
  let anchor: { date: Date; idx: number } | null = null;
  for (const a of anchors) {
    if (a.date <= day) anchor = a;
    else break;
  }
  if (!anchor) return null; // before the first workout
  const gap = differenceInDays(day, anchor.date);
  return (anchor.idx + gap) % program.days.length;
}

// Scheduled rest days in [start, end] (inclusive) that weren't explicitly
// logged — these should still count toward week/month totals.
function getScheduledRestDates(
  sessions: WorkoutSession[],
  program: WorkoutProgram | null,
  start: Date,
  end: Date,
): Set<string> {
  const result = new Set<string>();
  if (!program || program.days.length === 0) return result;
  const anchors = buildAnchors(sessions, program);
  if (anchors.length === 0) return result;

  const logged = new Set(sessions.map(s => format(parseISO(s.date), 'yyyy-MM-dd')));
  for (let day = new Date(start); day <= end; day = addDays(day, 1)) {
    const key = format(day, 'yyyy-MM-dd');
    if (logged.has(key)) continue;
    const slot = scheduledSlot(anchors, program, day);
    if (slot !== null && program.days[slot].isRest) result.add(key);
  }
  return result;
}

// Count scheduled TRAINING days this month (up to today) with nothing logged.
// The schedule advances one program day per calendar day, anchored by the last
// completed session on or before each date. Rest days are never "missed", and
// any day you logged a workout or rest is not missed.
function calculateMissedThisMonth(
  sessions: WorkoutSession[],
  program: WorkoutProgram | null,
  now: Date,
  monthStart: Date,
): number {
  if (!program || program.days.length === 0) return 0;

  const anchors = buildAnchors(sessions, program);
  if (anchors.length === 0) return 0;

  const loggedDates = new Set(sessions.map(s => format(parseISO(s.date), 'yyyy-MM-dd')));

  let missed = 0;
  for (let day = new Date(monthStart); day <= now; day = addDays(day, 1)) {
    const key = format(day, 'yyyy-MM-dd');
    if (loggedDates.has(key)) continue;
    const slot = scheduledSlot(anchors, program, day);
    if (slot !== null && !program.days[slot].isRest) missed++;
  }
  return missed;
}

function calculateLongestStreak(sessions: WorkoutSession[], program: WorkoutProgram | null): number {
  if (sessions.length === 0) return 0;

  const sorted = [...sessions].sort(
    (a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()
  );

  const uniqueByDate: WorkoutSession[] = [];
  for (const s of sorted) {
    const prev = uniqueByDate[uniqueByDate.length - 1];
    if (!prev || !isSameDay(parseISO(s.date), parseISO(prev.date))) {
      uniqueByDate.push(s);
    }
  }

  if (uniqueByDate.length === 0) return 0;

  // A run is a set of workouts bridged only by scheduled rest days. Its length
  // is the calendar span (inclusive), so rest days in between count too.
  let longest = 1;
  let runStart = uniqueByDate[0];
  for (let i = 1; i < uniqueByDate.length; i++) {
    const prev = uniqueByDate[i - 1];
    const curr = uniqueByDate[i];
    const gap = differenceInDays(parseISO(curr.date), parseISO(prev.date));
    if (!intermediatesAllRest(program, prev.dayId, gap)) {
      const span = differenceInDays(parseISO(prev.date), parseISO(runStart.date)) + 1;
      if (span > longest) longest = span;
      runStart = curr;
    }
  }
  const last = uniqueByDate[uniqueByDate.length - 1];
  const span = differenceInDays(parseISO(last.date), parseISO(runStart.date)) + 1;
  if (span > longest) longest = span;
  return longest;
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

  // Walk back to the workout that started the current run (bridged only by
  // scheduled rest days), then count calendar days from there through today.
  let runStart = lastWorkout;
  for (let i = 1; i < uniqueByDate.length; i++) {
    const newer = uniqueByDate[i - 1];
    const older = uniqueByDate[i];
    const actualGap = differenceInDays(parseISO(newer.date), parseISO(older.date));
    if (intermediatesAllRest(program, older.dayId, actualGap)) {
      runStart = older;
    } else {
      break;
    }
  }

  return differenceInDays(today, parseISO(runStart.date)) + 1;
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

export interface DailyBar {
  label: string;
  value: number;
  isToday: boolean;
}

export function getThisWeekDailyCounts(sessions: WorkoutSession[], program: WorkoutProgram | null = null): DailyBar[] {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const completed = sessions.filter(s => s.completed);
  // Scheduled rest days (up to today) that weren't logged also count as a day.
  const restDates = getScheduledRestDates(completed, program, weekStart, now);
  const bars: DailyBar[] = [];
  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i);
    const logged = completed.filter(s => isSameDay(parseISO(s.date), day)).length;
    const restCredit = restDates.has(format(day, 'yyyy-MM-dd')) ? 1 : 0;
    bars.push({
      label: format(day, 'EEE'),
      value: logged + restCredit,
      isToday: isSameDay(day, now),
    });
  }
  return bars;
}

export function getThisMonthWeeklyCounts(sessions: WorkoutSession[], program: WorkoutProgram | null = null): DailyBar[] {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const completed = sessions.filter(s => s.completed);
  const restDates = getScheduledRestDates(completed, program, monthStart, now);

  const bars: DailyBar[] = [];
  let weekIndex = 1;
  let cursor = startOfWeek(monthStart, { weekStartsOn: 1 });
  while (cursor <= monthEnd) {
    const weekEnd = addDays(cursor, 6);
    const inRange = (d: Date) => d >= cursor && d <= weekEnd && d >= monthStart && d <= monthEnd;
    const logged = completed.filter(s => inRange(parseISO(s.date))).length;
    let restCredit = 0;
    for (const key of restDates) {
      if (inRange(parseISO(key))) restCredit++;
    }
    const containsToday =
      now >= cursor && now <= weekEnd;
    bars.push({
      label: `W${weekIndex}`,
      value: logged + restCredit,
      isToday: containsToday,
    });
    cursor = addDays(cursor, 7);
    weekIndex++;
  }
  return bars;
}

export interface StreakRun {
  index: number;
  length: number;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export function getStreakRuns(sessions: WorkoutSession[], program: WorkoutProgram | null): StreakRun[] {
  const completed = sessions.filter(s => s.completed);
  if (completed.length === 0) return [];

  const sorted = [...completed].sort(
    (a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()
  );

  const unique: WorkoutSession[] = [];
  for (const s of sorted) {
    const prev = unique[unique.length - 1];
    if (!prev || !isSameDay(parseISO(s.date), parseISO(prev.date))) {
      unique.push(s);
    }
  }

  const runs: { start: WorkoutSession; end: WorkoutSession }[] = [];
  let start = unique[0];
  let end = unique[0];
  for (let i = 1; i < unique.length; i++) {
    const prev = unique[i - 1];
    const curr = unique[i];
    const gap = differenceInDays(parseISO(curr.date), parseISO(prev.date));
    if (intermediatesAllRest(program, prev.dayId, gap)) {
      end = curr;
    } else {
      runs.push({ start, end });
      start = curr;
      end = curr;
    }
  }
  runs.push({ start, end });

  const today = new Date();
  const lastRun = runs[runs.length - 1];
  const daysSinceLast = differenceInDays(today, parseISO(lastRun.end.date));
  const currentAlive =
    daysSinceLast >= 0 && intermediatesAllRest(program, lastRun.end.dayId, daysSinceLast);

  return runs.map((r, i) => {
    const isCurrent = currentAlive && i === runs.length - 1;
    // Length = calendar span (inclusive of scheduled rest days). A live run
    // extends through today.
    const endDate = isCurrent ? today : parseISO(r.end.date);
    const length = differenceInDays(endDate, parseISO(r.start.date)) + 1;
    return {
      index: i + 1,
      length,
      startDate: r.start.date,
      endDate: r.end.date,
      isCurrent,
    };
  });
}

export function getLast30DaysCounts(sessions: WorkoutSession[]): DailyBar[] {
  const now = new Date();
  const completed = sessions.filter(s => s.completed);
  const bars: DailyBar[] = [];
  for (let i = 29; i >= 0; i--) {
    const day = subDays(now, i);
    const count = completed.filter(s => isSameDay(parseISO(s.date), day)).length;
    bars.push({
      label: format(day, 'M/d'),
      value: count,
      isToday: isSameDay(day, now),
    });
  }
  return bars;
}

export interface CumulativePoint {
  date: string;
  total: number;
}

export function getCumulativeWorkoutCounts(sessions: WorkoutSession[]): CumulativePoint[] {
  const completed = sessions.filter(s => s.completed);
  if (completed.length === 0) return [];

  const byDate = new Map<string, number>();
  for (const s of completed) {
    byDate.set(s.date, (byDate.get(s.date) ?? 0) + 1);
  }

  const firstDate = [...byDate.keys()].sort()[0];
  const start = parseISO(firstDate);
  const today = new Date();
  const totalDays = differenceInDays(today, start);

  const points: CumulativePoint[] = [];
  let running = 0;
  for (let i = 0; i <= totalDays; i++) {
    const day = addDays(start, i);
    const key = format(day, 'yyyy-MM-dd');
    running += byDate.get(key) ?? 0;
    points.push({ date: key, total: running });
  }
  return points;
}
