const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const FILE_NAME = 'health-workout-backup.json';

let tokenClient: any = null;
let accessToken: string | null = null;

export function getClientId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('google-drive-client-id');
}

export function setClientId(id: string): void {
  localStorage.setItem('google-drive-client-id', id);
}

export function isConfigured(): boolean {
  return !!getClientId();
}

export function isSignedIn(): boolean {
  return !!accessToken;
}

export async function signIn(): Promise<boolean> {
  const clientId = getClientId();
  if (!clientId) return false;

  return new Promise((resolve) => {
    const google = (window as any).google;
    if (!google?.accounts?.oauth2) {
      resolve(false);
      return;
    }

    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: (response: any) => {
        if (response.access_token) {
          accessToken = response.access_token;
          localStorage.setItem('google-drive-token', accessToken!);
          resolve(true);
        } else {
          resolve(false);
        }
      },
    });

    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
}

export function tryRestoreToken(): boolean {
  const saved = localStorage.getItem('google-drive-token');
  if (saved) {
    accessToken = saved;
    return true;
  }
  return false;
}

export function signOut(): void {
  accessToken = null;
  localStorage.removeItem('google-drive-token');
}

export function resetConfiguration(): void {
  accessToken = null;
  localStorage.removeItem('google-drive-token');
  localStorage.removeItem('google-drive-client-id');
  localStorage.removeItem('google-drive-last-sync');
}

async function findBackupFile(): Promise<string | null> {
  if (!accessToken) return null;

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${FILE_NAME}' and trashed=false&spaces=drive&fields=files(id,name,modifiedTime)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    if (response.status === 401) signOut();
    return null;
  }

  const data = await response.json();
  return data.files?.[0]?.id || null;
}

export async function saveToGoogleDrive(backupData: object): Promise<boolean> {
  if (!accessToken) return false;

  try {
    const fileId = await findBackupFile();
    const metadata = { name: FILE_NAME, mimeType: 'application/json' };
    const body = JSON.stringify(backupData, null, 2);

    if (fileId) {
      const response = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body,
        }
      );
      if (!response.ok) {
        if (response.status === 401) signOut();
        return false;
      }
    } else {
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', new Blob([body], { type: 'application/json' }));

      const response = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
          body: form,
        }
      );
      if (!response.ok) {
        if (response.status === 401) signOut();
        return false;
      }
    }

    localStorage.setItem('google-drive-last-sync', new Date().toISOString());
    return true;
  } catch {
    return false;
  }
}

export async function loadFromGoogleDrive(): Promise<object | null> {
  if (!accessToken) return null;

  try {
    const fileId = await findBackupFile();
    if (!fileId) return null;

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
      if (response.status === 401) signOut();
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}

export function getLastSyncTime(): string | null {
  return localStorage.getItem('google-drive-last-sync');
}
