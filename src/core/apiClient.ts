const SESSION_STORAGE_KEY = 'skill98_active_session_v1';

export interface StoredClientSession {
  phone: string;
  fullName: string;
  userRole: 'customer' | 'admin' | 'super_admin';
  roleId: string;
  sessionToken?: string;
}

export interface GlobalActivitySnapshot {
  pendingCount: number;
  label: string;
}

export interface GlobalToastPayload {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
  durationMs?: number;
}

type ActivityListener = (snapshot: GlobalActivitySnapshot) => void;
type ToastListener = (toast: GlobalToastPayload) => void;

const activityListeners = new Set<ActivityListener>();
const toastListeners = new Set<ToastListener>();
let activeMutationCount = 0;
let activeMutationLabel = 'در حال ذخیره و پردازش...';

function notifyActivityListeners(): void {
  const snapshot: GlobalActivitySnapshot = {
    pendingCount: activeMutationCount,
    label: activeMutationLabel,
  };
  for (const listener of activityListeners) {
    try {
      listener(snapshot);
    } catch {
      // ignore subscriber errors
    }
  }
}

export function subscribeApiActivity(listener: ActivityListener): () => void {
  activityListeners.add(listener);
  listener({ pendingCount: activeMutationCount, label: activeMutationLabel });
  return () => {
    activityListeners.delete(listener);
  };
}

export function beginGlobalActivity(label = 'در حال ذخیره و پردازش...'): () => void {
  activeMutationCount += 1;
  activeMutationLabel = label;
  notifyActivityListeners();
  let ended = false;
  return () => {
    if (ended) return;
    ended = true;
    activeMutationCount = Math.max(0, activeMutationCount - 1);
    if (activeMutationCount === 0) {
      activeMutationLabel = 'در حال ذخیره و پردازش...';
    }
    notifyActivityListeners();
  };
}

export function subscribeGlobalToasts(listener: ToastListener): () => void {
  toastListeners.add(listener);
  return () => {
    toastListeners.delete(listener);
  };
}

export function emitGlobalToast(
  type: 'success' | 'error' | 'info',
  text: string,
  durationMs = 4500
): void {
  const cleanText = String(text || '').trim();
  if (!cleanText) return;
  const payload: GlobalToastPayload = {
    id: `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    text: cleanText,
    durationMs,
  };
  for (const listener of toastListeners) {
    try {
      listener(payload);
    } catch {
      // ignore subscriber errors
    }
  }
}

function inferActivityLabel(input: string, method: string): string {
  const lowerUrl = input.toLowerCase();
  if (method === 'DELETE' || lowerUrl.includes('/delete')) {
    return 'در حال حذف اطلاعات...';
  }
  if (lowerUrl.includes('/backup/create') || lowerUrl.includes('/auto-backup/run')) {
    return 'در حال تهیه و ارسال نسخه پشتیبان...';
  }
  if (lowerUrl.includes('/backup/restore')) {
    return 'در حال بازیابی نسخه پشتیبان...';
  }
  if (
    lowerUrl.includes('/test') ||
    lowerUrl.includes('/ping') ||
    lowerUrl.includes('/health')
  ) {
    return 'در حال ارسال و بررسی تست...';
  }
  if (lowerUrl.includes('/upload')) {
    return 'در حال آپلود و پردازش فایل...';
  }
  return 'در حال ذخیره و پردازش...';
}

function shouldTrackMutation(input: string, method: string, headersObj: Record<string, string>): boolean {
  if (headersObj['X-Silent-Activity'] === '1' || headersObj['x-silent-activity'] === '1') {
    return false;
  }
  const upperMethod = method.toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(upperMethod)) {
    return false;
  }
  const lowerUrl = input.toLowerCase();
  // Exclude noisy background telemetry/heartbeat/chat-ping endpoints
  if (
    lowerUrl.includes('/analytics/track') ||
    lowerUrl.includes('/heartbeat') ||
    lowerUrl.includes('/chat/ping')
  ) {
    return false;
  }
  return true;
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

export function getAuthHeaders(extraHeaders?: HeadersInit): Record<string, string> {
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
  const method = String(init.method || 'GET').toUpperCase();
  const headersObj = getAuthHeaders(init.headers);
  const track = shouldTrackMutation(input, method, headersObj);
  delete headersObj['X-Silent-Activity'];
  delete headersObj['x-silent-activity'];

  const finish = track ? beginGlobalActivity(inferActivityLabel(input, method)) : null;
  try {
    return await fetch(input, {
      ...init,
      credentials: 'include',
      headers: headersObj,
    });
  } finally {
    finish?.();
  }
}

export async function apiJson<T = unknown>(
  input: string,
  init: RequestInit = {}
): Promise<{ ok: boolean; status: number; data: T }> {
  const method = String(init.method || 'GET').toUpperCase();
  const isJsonBody = init.body && typeof init.body === 'string';
  const headersObj = getAuthHeaders({
    ...(isJsonBody ? { 'Content-Type': 'application/json' } : {}),
    ...(init.headers as Record<string, string> | undefined),
  });
  const track = shouldTrackMutation(input, method, headersObj);
  delete headersObj['X-Silent-Activity'];
  delete headersObj['x-silent-activity'];

  const finish = track ? beginGlobalActivity(inferActivityLabel(input, method)) : null;
  try {
    const res = await fetch(input, {
      ...init,
      credentials: 'include',
      headers: headersObj,
    });
    const data = (await res.json().catch(() => ({}))) as T;
    return { ok: res.ok, status: res.status, data };
  } finally {
    finish?.();
  }
}
