import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

type FirebaseAppletConfigShape = {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  firestoreDatabaseId?: string;
};

const optionalConfigModules = import.meta.glob<{ default?: FirebaseAppletConfigShape }>(
  '../firebase-applet-config.json',
  { eager: true }
);
const firebaseAppletConfig: FirebaseAppletConfigShape =
  optionalConfigModules['../firebase-applet-config.json']?.default ?? {};

const viteEnv =
  typeof import.meta !== 'undefined'
    ? ((import.meta as { env?: Record<string, string | undefined> }).env ?? {})
    : {};

const firebaseConfig = {
  ...firebaseAppletConfig,
  apiKey: viteEnv.VITE_FIREBASE_API_KEY || firebaseAppletConfig.apiKey || '',
  authDomain: viteEnv.VITE_FIREBASE_AUTH_DOMAIN || firebaseAppletConfig.authDomain || '',
  projectId: viteEnv.VITE_FIREBASE_PROJECT_ID || firebaseAppletConfig.projectId || '',
  storageBucket: viteEnv.VITE_FIREBASE_STORAGE_BUCKET || firebaseAppletConfig.storageBucket || '',
  messagingSenderId:
    viteEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseAppletConfig.messagingSenderId || '',
  appId: viteEnv.VITE_FIREBASE_APP_ID || firebaseAppletConfig.appId || '',
  firestoreDatabaseId:
    viteEnv.VITE_FIREBASE_DATABASE_ID || firebaseAppletConfig.firestoreDatabaseId || '(default)',
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

const app = initializeApp(
  isFirebaseConfigured
    ? firebaseConfig
    : {
        apiKey: 'unconfigured',
        authDomain: 'localhost',
        projectId: 'unconfigured',
        appId: 'unconfigured',
      }
);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const BOOTSTRAPPED_ADMIN_EMAIL =
  (typeof import.meta !== 'undefined' &&
    (import.meta as { env?: Record<string, string> }).env?.VITE_BOOTSTRAPPED_ADMIN_EMAIL) ||
  '3mad.aria@gmail.com';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection check is performed only when explicitly needed to avoid console errors in restricted networks.

// Blueprint-synced validation constants and helpers
export const ID_REGEX = /^[a-zA-Z0-9_\-]+$/;

export function sanitizeSlugOrId(input: string, fallback = 'item_98'): string {
  const cleaned = input
    .trim()
    .replace(/[^a-zA-Z0-9_\-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 96);
  return cleaned.length >= 2 && ID_REGEX.test(cleaned) ? cleaned : `${fallback}_${Date.now()}`;
}

export function truncateString(val: string, minLen: number, maxLen: number, fallback: string): string {
  const trimmed = (val || '').trim();
  if (trimmed.length < minLen) return fallback.slice(0, maxLen);
  return trimmed.slice(0, maxLen);
}
