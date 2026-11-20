const SESSION_STORAGE_KEY = 'skill98_active_session_v1';

export interface StoredClientSession {
  phone: string;
  fullName: string;
  userRole: 'customer' | 'admin' | 'super_admin';
  roleId: string;
  sessionToken?: string;
}

export function readStoredSession(): StoredClientSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.phone && parsed.userRole && parsed.userRole !== 'guest') {
      return parsed as StoredClientSession;
    }
  } catch {
    // ignore storage parse errors
  }
  return null;
}

export function writeStoredSession(session: StoredClientSession | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!session) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } else {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    }
  } catch {
    // ignore storage write errors
  }
}

export function getAuthHeaders(extraHeaders?: HeadersInit): HeadersInit {
  const session = readStoredSession();
  const base: Record<string, string> = {};
  if (session?.sessionToken) {
    base.Authorization = `Bearer ${session.sessionToken}`;
  }
  if (extraHeaders && typeof extraHeaders === 'object' && !Array.isArray(extraHeaders)) {
    return { ...base, ...(extraHeaders as Record<string, string>) };
  }
  return base;
}

export function buildAuthHeaders(isJson = true): HeadersInit {
  return getAuthHeaders(isJson ? { 'Content-Type': 'application/json' } : undefined);
}

export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = getAuthHeaders(init.headers);
  return fetch(input, {
    ...init,
    credentials: 'include',
    headers,
  });
}

export async function apiJson<T = unknown>(
  input: string,
  init: RequestInit = {}
): Promise<{ ok: boolean; status: number; data: T }> {
  const isJsonBody = init.body && typeof init.body === 'string';
  const headers = getAuthHeaders({
    ...(isJsonBody ? { 'Content-Type': 'application/json' } : {}),
    ...(init.headers as Record<string, string> | undefined),
  });
  const res = await fetch(input, {
    ...init,
    credentials: 'include',
    headers,
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, data };
}
