import { useCallback, useEffect, useRef, useState } from 'react';

export function usePagedList(fetchPage, enabled = true) {
  const [state, setState] = useState({ items: [], total: 0, loading: true });
  const [attempt, setAttempt] = useState(0);
  const request = useRef(null);
  const busy = useRef(false);
  const retry = useCallback(() => setAttempt(n => n + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    request.current = controller;
    busy.current = false;
    if (!enabled) return () => controller.abort();
    async function load() {
      setState({ owner: fetchPage, items: [], total: 0, loading: true });
      try {
        const page = await fetchPage(0, controller.signal);
        if (!controller.signal.aborted) setState({ ...page, owner: fetchPage, loading: false });
      } catch (error) {
        if (!controller.signal.aborted) setState({ owner: fetchPage, items: [], total: 0, loading: false, error: error.message });
      }
    }
    load();
    return () => controller.abort();
  }, [fetchPage, enabled, attempt]);

  async function loadMore() {
    if (busy.current || state.loading || state.nextOffset == null) return;
    const controller = request.current;
    busy.current = true;
    setState(previous => ({ ...previous, paging: true, pageError: null }));
    try {
      const page = await fetchPage(state.nextOffset, controller.signal);
      if (!controller.signal.aborted) setState(previous => ({
        ...page, owner: fetchPage,
        items: [...new Map([...previous.items, ...page.items].map(item => [item.id, item])).values()],
        loading: false, paging: false,
      }));
    } catch (error) {
      if (!controller.signal.aborted) setState(previous => ({ ...previous, paging: false, pageError: error.message }));
    } finally {
      if (!controller.signal.aborted) busy.current = false;
    }
  }

  const visible = state.owner === fetchPage ? state : { items: [], total: 0, loading: true };
  return { ...visible, retry, loadMore };
}
