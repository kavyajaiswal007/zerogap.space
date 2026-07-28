import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { ApiError, apiRequest, uploadRequest, type AuthPayload, type Profile } from './backend';
import { KAVYA_PROFILE, PROTOTYPE_TOKEN } from './prototypeData';
import { VINEET_PROFILE, VINEET_TOKEN } from './vineetData';

const STORAGE_KEY = 'zerogap.session';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface StoredSession {
  user: Profile;
  accessToken?: string;
  refreshToken?: string | null;
  expiresAt?: number | null;
  token?: string;
}

interface SessionContextValue {
  loading: boolean;
  user: Profile | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  register: (payload: { email: string; password: string; fullName: string }) => Promise<AuthPayload>;
  login: (payload: { email: string; password: string }) => Promise<AuthPayload>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<Profile | null>;
  request: <T>(path: string, options?: { method?: HttpMethod; body?: unknown }) => Promise<T>;
  upload: <T>(path: string, formData: FormData) => Promise<T>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

function isKavyaLogin(email: string) {
  const nextEmail = email.trim().toLowerCase();
  return nextEmail === '1' || nextEmail === '1@zerogap.com';
}

function isVineetLogin(email: string) {
  const nextEmail = email.trim().toLowerCase();
  return (
    nextEmail === 'vinit sir' ||
    nextEmail === 'vinitsir' ||
    nextEmail === 'vineetkumarverma@zerogap.in' ||
    nextEmail === 'vineet' ||
    nextEmail === 'dr.vineet'
  );
}

function localProfileFor(email: string) {
  if (isKavyaLogin(email)) return KAVYA_PROFILE;
  if (isVineetLogin(email)) return VINEET_PROFILE;
  return null;
}

function tokenForProfile(nextUser: Profile) {
  if (nextUser.id === VINEET_PROFILE.id) return VINEET_TOKEN;
  return PROTOTYPE_TOKEN;
}

function isLocalToken(token: string | null | undefined) {
  return token === PROTOTYPE_TOKEN || token === VINEET_TOKEN;
}

function readStoredSession() {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function writeStoredSession(payload: AuthPayload) {
  const stored: StoredSession = {
    user: payload.user,
    accessToken: payload.session.access_token,
    refreshToken: payload.session.refresh_token ?? null,
    expiresAt: payload.session.expires_at ?? null,
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
}

function writeLocalSession(user: Profile) {
  const token = tokenForProfile(user);
  const stored: StoredSession = {
    user,
    accessToken: token,
    refreshToken: token,
    expiresAt: Math.floor(Date.now() / 1000) + 86400 * 30,
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
}

function clearStoredSession() {
  window.localStorage.removeItem(STORAGE_KEY);
}

function isExpired(expiresAt: number | null) {
  if (!expiresAt) return false;
  return expiresAt * 1000 <= Date.now();
}

function localPayloadFor(nextUser: Profile): AuthPayload {
  const token = tokenForProfile(nextUser);
  return {
    user: nextUser,
    session: {
      access_token: token,
      refresh_token: token,
      expires_at: Math.floor(Date.now() / 1000) + 86400 * 30,
    },
  };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<Profile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  function applySession(payload: AuthPayload) {
    writeStoredSession(payload);
    startTransition(() => {
      setUser(payload.user);
      setAccessToken(payload.session.access_token);
      setRefreshToken(payload.session.refresh_token ?? null);
    });
    return payload;
  }

  function applyLocalSession(nextUser: Profile) {
    const payload = localPayloadFor(nextUser);
    writeLocalSession(payload.user);
    startTransition(() => {
      setUser(payload.user);
      setAccessToken(payload.session.access_token);
      setRefreshToken(payload.session.refresh_token ?? null);
    });
    return payload;
  }

  function clearSessionState() {
    clearStoredSession();
    startTransition(() => {
      setUser(null);
      setAccessToken(null);
      setRefreshToken(null);
    });
  }

  async function refreshWithToken(nextRefreshToken: string) {
    const refreshed = await apiRequest<AuthPayload>('/api/auth/refresh', {
      method: 'POST',
      body: { refreshToken: nextRefreshToken },
    });
    return applySession(refreshed);
  }

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      const stored = readStoredSession();
      const storedAccessToken = stored?.accessToken ?? stored?.token ?? null;
      const storedRefreshToken = stored?.refreshToken ?? null;
      const storedExpiresAt = stored?.expiresAt ?? null;
      if (!stored?.user || !storedAccessToken) return;

      if (isLocalToken(storedAccessToken)) {
        if (!active) return;
        startTransition(() => {
          setUser(stored.user);
          setAccessToken(storedAccessToken);
          setRefreshToken(storedRefreshToken ?? storedAccessToken);
        });
        return;
      }

      if (!isExpired(storedExpiresAt)) {
        if (!active) return;
        startTransition(() => {
          setUser(stored.user);
          setAccessToken(storedAccessToken);
          setRefreshToken(storedRefreshToken);
        });
        return;
      }

      if (!storedRefreshToken) {
        clearStoredSession();
        return;
      }

      try {
        const refreshed = await apiRequest<AuthPayload>('/api/auth/refresh', {
          method: 'POST',
          body: { refreshToken: storedRefreshToken },
        });
        if (active) applySession(refreshed);
      } catch {
        clearStoredSession();
      }
    }

    void restoreSession().finally(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  async function login({ email, password }: { email: string; password: string }): Promise<AuthPayload> {
    const localProfile = localProfileFor(email);
    if (localProfile) {
      return applyLocalSession(localProfile);
    }

    const payload = await apiRequest<AuthPayload>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    return applySession(payload);
  }

  async function register({ email, password, fullName }: { email: string; password: string; fullName: string }): Promise<AuthPayload> {
    const localProfile = localProfileFor(email);
    if (localProfile) {
      return applyLocalSession(localProfile);
    }

    const payload = await apiRequest<AuthPayload>('/api/auth/register', {
      method: 'POST',
      body: { email, password, fullName },
    });
    return applySession(payload);
  }

  async function logout() {
    const token = accessToken;
    clearSessionState();

    if (token && !isLocalToken(token)) {
      apiRequest('/api/auth/logout', { method: 'POST', token }).catch(() => {});
    }
  }

  async function refreshProfile() {
    if (!accessToken) return null;
    if (isLocalToken(accessToken)) return user;

    const profile = await apiRequest<Profile>('/api/auth/me', { token: accessToken });
    startTransition(() => setUser(profile));

    const stored = readStoredSession();
    if (stored) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...stored, user: profile }));
    }

    return profile;
  }

  async function request<T>(path: string, options: { method?: HttpMethod; body?: unknown } = {}): Promise<T> {
    if (!accessToken) {
      throw new ApiError('Session expired. Please sign in again.', 401, 'SESSION_EXPIRED');
    }

    try {
      return await apiRequest<T>(path, {
        method: options.method,
        body: options.body,
        token: accessToken,
      });
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401 || !refreshToken || isLocalToken(accessToken)) {
        throw error;
      }

      try {
        const refreshed = await refreshWithToken(refreshToken);
        return await apiRequest<T>(path, {
          method: options.method,
          body: options.body,
          token: refreshed.session.access_token,
        });
      } catch (refreshError) {
        await logout();
        throw refreshError;
      }
    }
  }

  async function upload<T>(path: string, formData: FormData): Promise<T> {
    if (!accessToken) {
      throw new ApiError('Session expired. Please sign in again.', 401, 'SESSION_EXPIRED');
    }

    try {
      return await uploadRequest<T>(path, accessToken, formData);
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401 || !refreshToken || isLocalToken(accessToken)) {
        throw error;
      }

      try {
        const refreshed = await refreshWithToken(refreshToken);
        return await uploadRequest<T>(path, refreshed.session.access_token, formData);
      } catch (refreshError) {
        await logout();
        throw refreshError;
      }
    }
  }

  return (
    <SessionContext.Provider
      value={{
        loading,
        user,
        accessToken,
        refreshToken,
        isAuthenticated: Boolean(user && accessToken),
        register,
        login,
        logout,
        refreshProfile,
        request,
        upload,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be inside SessionProvider');
  }
  return context;
}
