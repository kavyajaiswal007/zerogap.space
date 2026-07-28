import { startTransition, useEffect, useEffectEvent, useState } from 'react';
import { ApiError } from './backend';
import { useSession } from './session';

export function useBackendResource<T>(loader: (request: ReturnType<typeof useSession>['request']) => Promise<T>, deps: unknown[] = []) {
  const session = useSession();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const runLoader = useEffectEvent(async () => {
    if (!session.isAuthenticated) {
      setLoading(false);
      setError(null);
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const nextData = await loader(session.request);
      startTransition(() => {
        setData(nextData);
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError(null);
        setData(null);
        return;
      }
      const message = err instanceof ApiError ? err.message : 'Unable to load this view right now.';
      setError(message);
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    if (session.loading) {
      return;
    }

    void runLoader();
  }, [session.loading, session.isAuthenticated, ...deps]);

  return {
    data,
    loading: session.loading || loading,
    error,
    reload: () => {
      void runLoader();
    },
  };
}
