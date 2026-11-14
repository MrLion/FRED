import { useState, useEffect, useCallback } from 'react';

export function useFred(fetchFn) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [attempt, setAttempt] = useState(0);
  const refetch = useCallback(() => setAttempt(n => n + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setState(previous => ({ ...previous, loading: true, error: null }));
      try {
        const data = await fetchFn(controller.signal);
        if (!controller.signal.aborted) setState({ data, loading: false, error: null });
      } catch (error) {
        if (!controller.signal.aborted) setState(previous => ({ ...previous, loading: false, error: error.message }));
      }
    }
    load();
    return () => controller.abort();
  }, [fetchFn, attempt]);
  return { ...state, refetch };
}
