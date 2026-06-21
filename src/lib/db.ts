import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { WorkoutProgram, WorkoutSession } from '@/types';

interface WorkoutDB extends DBSchema {
  programs: {
    key: string;
    value: WorkoutProgram;
  };
  sessions: {
    key: string;
    value: WorkoutSession;
    indexes: {
      'by-date': string;
      'by-program': string;
      'by-day': string;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<WorkoutDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<WorkoutDB>('workout-tracker', 1, {
      upgrade(db) {
        db.createObjectStore('programs', { keyPath: 'id' });
        const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
        sessionStore.createIndex('by-date', 'date');
        sessionStore.createIndex('by-program', 'programId');
        sessionStore.createIndex('by-day', 'dayId');
      },
    });
  }
  return dbPromise;
}

export async function saveProgram(program: WorkoutProgram): Promise<void> {
  const db = await getDB();
  await db.put('programs', program);
}

export async function getProgram(id: string): Promise<WorkoutProgram | undefined> {
  const db = await getDB();
  return db.get('programs', id);
}

export async function getAllPrograms(): Promise<WorkoutProgram[]> {
  const db = await getDB();
  return db.getAll('programs');
}

export async function deleteProgram(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('programs', id);
}

export async function saveSession(session: WorkoutSession): Promise<void> {
  const db = await getDB();
  await db.put('sessions', session);
}

export async function getSession(id: string): Promise<WorkoutSession | undefined> {
  const db = await getDB();
  return db.get('sessions', id);
}

export async function getAllSessions(): Promise<WorkoutSession[]> {
  const db = await getDB();
  return db.getAll('sessions');
}

export async function getSessionsByDate(date: string): Promise<WorkoutSession[]> {
  const db = await getDB();
  return db.getAllFromIndex('sessions', 'by-date', date);
}

export async function deleteSession(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('sessions', id);
}

export async function exportAllData(): Promise<{ programs: WorkoutProgram[]; sessions: WorkoutSession[] }> {
  const db = await getDB();
  const programs = await db.getAll('programs');
  const sessions = await db.getAll('sessions');
  return { programs, sessions };
}

export async function importData(data: { programs: WorkoutProgram[]; sessions: WorkoutSession[] }): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['programs', 'sessions'], 'readwrite');
  for (const program of data.programs) {
    await tx.objectStore('programs').put(program);
  }
  for (const session of data.sessions) {
    await tx.objectStore('sessions').put(session);
  }
  await tx.done;
}
