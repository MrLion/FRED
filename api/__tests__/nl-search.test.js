import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import handler from '../nl-search.js';
function response() {
  return { status: vi.fn(function (status) { this.statusCode = status; return this; }), json: vi.fn() };
}
beforeEach(() => {
  vi.stubEnv('OLLAMA_BASE_URL', 'https://ollama.com');
  vi.stubEnv('OLLAMA_MODEL', 'test-cloud');
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('AI search endpoint', () => {
  it('recovers fenced JSON into usable search terms', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ message: { content: '```json\n{"searchTerms":["UNRATE"],"explanation":"US unemployment rate."}\n```' } }) }));
    const res = response();
    await handler({ method: 'POST', body: { query: 'What is the US unemployment rate?' } }, res);
    expect(res.statusCode).toBe(200);
    expect(res.json).toHaveBeenCalledWith({ searchTerms: ['UNRATE'], explanation: 'US unemployment rate.' });
  });
  it('reports interpretation failure instead of a fake successful search', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ message: { content: 'I cannot interpret this.' } }) }));
    const res = response();
    await handler({ method: 'POST', body: { query: 'inflation' } }, res);
    expect(res.statusCode).toBe(502);
    expect(res.json.mock.calls[0][0]).toMatchObject({ code: 'AI_INTERPRETATION_FAILED' });
    expect(res.json.mock.calls[0][0]).not.toHaveProperty('searchTerms');
  });
  it.each([null, {}, { query: 123 }, { query: ' ' }, { query: 'a'.repeat(1001) }])('rejects invalid input before calling the provider', async body => {
    vi.stubGlobal('fetch', vi.fn());
    const res = response();
    await handler({ method: 'POST', body }, res);
    expect(res.statusCode).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('rejects non-POST requests', async () => {
    const res = response(); await handler({ method: 'GET' }, res);
    expect(res.statusCode).toBe(405);
  });
});
