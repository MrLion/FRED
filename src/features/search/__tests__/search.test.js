import { describe, it, expect, vi, afterEach } from 'vitest';
import { questionStartDate, interpretSearch, searchSuggestions } from '../search';
afterEach(() => vi.unstubAllGlobals());

describe('search interpretation', () => {
  it('carries explicit since/from years without guessing a date', () => {
    expect(questionStartDate('How has inflation changed since 2020?')).toBe('2020-01-01');
    expect(questionStartDate('GDP from 1990')).toBe('1990-01-01');
    expect(questionStartDate('Compare GDP and unemployment')).toBeNull();
    expect(questionStartDate('Inflation since 2999')).toBeNull();
  });
  it('rejects malformed model output instead of treating it as search terms', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ searchTerms: 'GDP' }) }));
    await expect(interpretSearch('economic growth')).rejects.toThrow('invalid');
  });
  it('normalizes and bounds interpretation terms', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ searchTerms: [' GDP ', 'GDP', '', 'growth', 'output', 'extra'], explanation: 10 }) }));
    expect(await interpretSearch('growth')).toEqual({ searchTerms: ['GDP', 'growth', 'output'], explanation: '' });
  });
  it('preserves partial results and deduplicates series', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ seriess: [{ id: 'GDP' }], count: 1 }) })
      .mockRejectedValueOnce(new Error('Offline'))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ seriess: [{ id: 'GDP' }, { id: 'GDPC1' }], count: 2 }) }));
    expect(await searchSuggestions(['GDP', 'growth', 'real GDP'], new AbortController().signal)).toEqual({ series: [{ id: 'GDP' }, { id: 'GDPC1' }], partial: true });
  });
  it('does not report total provider failure as zero matches', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Offline')));
    await expect(searchSuggestions(['GDP'], new AbortController().signal)).rejects.toThrow('could not be loaded');
  });
  it('does not accept results after cancellation', async () => {
    const controller = new AbortController(); controller.abort();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ seriess: [], count: 0 }) }));
    await expect(searchSuggestions(['GDP'], controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
  });
});
