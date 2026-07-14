export interface Exercise {
  id: string;
  name: string;
  order: number;
}

export interface WorkoutDay {
  id: string;
  name: string;
  dayNumber: number;
  exercises: Exercise[];
  isRest: boolean;
}

export interface WorkoutProgram {
  id: string;
  name: string;
  days: WorkoutDay[];
  createdAt: string;
}

export interface ExerciseSet {
  setNumber: number;
  reps: number | null;
  completed: boolean;
}

export type ExerciseDifficulty = 'easy' | 'moderate' | 'difficult' | null;

export interface ExerciseLog {
  id: string;
  exerciseName: string;
  weight: number | null;
  sets: ExerciseSet[];
  notes: string;
  difficulty: ExerciseDifficulty;
  order: number;
}

export type WorkoutDifficulty = 'easy' | 'moderate' | 'difficult' | null;

export interface WorkoutSession {
  id: string;
  programId: string;
  dayId: string;
  dayName: string;
  date: string;
  exercises: ExerciseLog[];
  notes: string;
  difficulty: WorkoutDifficulty;
  completed: boolean;
  startedAt: string;
  completedAt: string | null;
}

export interface PersonalRecord {
  exerciseName: string;
  highestWeight: number;
  highestWeightDate: string;
  mostRepsInSet: number;
  mostRepsDate: string;
  highestVolume: number;
  highestVolumeDate: string;
  longestStreak: number;
}

export interface DashboardStats {
  workoutsThisWeek: number;
  workoutsThisMonth: number;
  currentStreak: number;
  longestStreak: number;
  totalWorkouts: number;
  totalSets: number;
  totalReps: number;
  totalVolume: number;
}

export interface ExerciseHistory {
  date: string;
  weight: number | null;
  sets: ExerciseSet[];
  notes: string;
  volume: number;
}

export interface WeeklyProgression {
  currentWeight: number | null;
  previousWeight: number | null;
  weightChange: number | null;
  currentTotalReps: number;
  previousTotalReps: number;
  repChange: number;
  personalBestWeight: number;
  personalBestVolume: number;
}
