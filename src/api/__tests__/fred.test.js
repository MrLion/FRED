import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, val) => { store[key] = String(val); }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: () => { store = {}; },
  };
})();
vi.stubGlobal('localStorage', localStorageMock);

describe('fred.js', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.restoreAllMocks();
  });

  describe('fredFetch proxy URL building', () => {
    it('builds correct proxy URL with endpoint and params', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ categories: [] }),
      }));

      const { getCategoryChildren } = await import('../fred.js');
      await getCategoryChildren(0);

      const calledUrl = fetch.mock.calls[0][0];
      expect(calledUrl).toContain('/api/fred-proxy?');
      expect(calledUrl).toContain('endpoint=category%2Fchildren');
      expect(calledUrl).toContain('category_id=0');
      // Should NOT contain api_key
      expect(calledUrl).not.toContain('api_key');
    });
  });

  describe('searchSeries signal forwarding', () => {
    it('passes signal to fetch', async () => {
      const controller = new AbortController();
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ seriess: [], count: 0 }),
      }));

      const { searchSeries } = await import('../fred.js');
      await searchSeries('GDP', {}, controller.signal);

      expect(fetch).toHaveBeenCalledOnce();
      const fetchOpts = fetch.mock.calls[0][1];
      expect(fetchOpts.signal).toBe(controller.signal);
    });
  });

  describe('getSeriesObservations', () => {
    it('uses 10000 as default limit', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ observations: [] }),
      }));

      const { getSeriesObservations } = await import('../fred.js');
      await getSeriesObservations('GDP');

      const calledUrl = fetch.mock.calls[0][0];
      expect(calledUrl).toContain('limit=10000');
    });
  });

});

describe('complete observation history', () => {
  it('fetches every page and retains missing observations as gaps', async () => {
    const { getSeriesObservations } = await import('../fred.js');
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ count: 3, observations: [{ date: '2020-01-01', value: '1' }, { date: '2020-02-01', value: '.' }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ count: 3, observations: [{ date: '2020-03-01', value: '3' }] }) }));
    const observations = await getSeriesObservations('TEST', { all: true, limit: 2 });
    expect(observations).toHaveLength(3);
    expect(observations[1].value).toBe('.');
    expect(fetch.mock.calls[1][0]).toContain('offset=2');
  });
});

describe('browsing complete directories', () => {
  it('loads all release directory pages instead of stopping at a fixed limit', async () => {
    const { getReleases } = await import('../fred.js');
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ count: 3, releases: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ count: 3, releases: [{ id: 3, name: 'C' }] }) }));
    const releases = await getReleases();
    expect(releases.map(release => release.id)).toEqual([1, 2, 3]);
    expect(fetch.mock.calls[1][0]).toContain('offset=2');
  });
  it('keeps a source failure distinct from an empty release list', async () => {
    const { getSourceReleases } = await import('../fred.js');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 502 }));
    await expect(getSourceReleases(1)).rejects.toThrow('502');
  });
  it('preserves release totals and forwards pagination, sorting and cancellation', async () => {
    const { getReleaseSeries } = await import('../fred.js');
    const controller = new AbortController();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ count: 501, seriess: [{ id: 'GDP' }] }) }));
    expect(await getReleaseSeries(53, { offset: 50, order_by: 'title', sort_order: 'asc', signal: controller.signal })).toEqual({ series: [{ id: 'GDP' }], count: 501 });
    const [url, options] = fetch.mock.calls[0];
    expect(url).toContain('offset=50');
    expect(url).toContain('sort_order=asc');
    expect(url).toContain('order_by=title');
    expect(options.signal).toBe(controller.signal);
  });
  it('loads a release title directly for shared detail links', async () => {
    const { getRelease } = await import('../fred.js');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ releases: [{ id: 10, name: 'Consumer Price Index' }] }) }));
    expect(await getRelease(10)).toEqual({ id: 10, name: 'Consumer Price Index' });
    expect(fetch.mock.calls[0][0]).toContain('endpoint=release&release_id=10');
  });
});
