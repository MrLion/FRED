import { afterEach, describe, expect, it, vi } from 'vitest';
import { interpretQuestion, parseSearchInterpretation, SEARCH_SCHEMA } from '../search-interpretation.js';
const result = { searchTerms: ['CPIAUCSL', 'inflation'], explanation: 'US inflation indicators.' };
afterEach(() => vi.unstubAllGlobals());

describe('AI search response parsing', () => {
  it.each([
    JSON.stringify(result),
    `\`\`\`json\n${JSON.stringify(result)}\n\`\`\``,
    `Here are the indicators:\n${JSON.stringify(result)}\nEnd of response.`,
    `<think>Consider indicators</think>${JSON.stringify(result)}`,
  ])('accepts JSON with common model formatting', content => {
    expect(parseSearchInterpretation(content)).toEqual(result);
  });
  it('handles braces and escaped quotes inside JSON strings', () => {
    const data = { ...result, explanation: 'An index {not a rate}, called "CPI".' };
    expect(parseSearchInterpretation(`\`\`\`json\n${JSON.stringify(data)}\n\`\`\``)).toEqual(data);
  });
  it('does not use an intermediate answer from reasoning', () => {
    expect(parseSearchInterpretation(`<think>${JSON.stringify({ ...result, searchTerms: ['WRONG'] })}</think>${JSON.stringify(result)}`)).toEqual(result);
  });
  it.each(['', 'No answer', '{"searchTerms":"GDP","explanation":"test"}', '{"searchTerms":[],"explanation":"test"}', '{"searchTerms":[123],"explanation":"test"}', '{"searchTerms":["GDP"],"explanation":{}}', `<think>${JSON.stringify(result)}`, `${JSON.stringify(result)} ${JSON.stringify(result)}`])('rejects missing, malformed or ambiguous answers', content => {
    expect(() => parseSearchInterpretation(content)).toThrow();
  });
  it('normalizes terms and limits their count', () => {
    expect(parseSearchInterpretation(JSON.stringify({ searchTerms: [' GDP ', 'GDP', '', 'growth', 'output', 'extra'], explanation: ' Growth ' }))).toEqual({ searchTerms: ['GDP', 'growth', 'output'], explanation: 'Growth' });
  });
});

describe('provider compatibility', () => {
  function mockProvider(content = JSON.stringify(result)) {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ message: { content } }) }));
  }
  it('requests structured output from a local Ollama model', async () => {
    mockProvider();
    await expect(interpretQuestion('inflation', { baseUrl: 'http://localhost:11434/', model: 'gemma4', apiKey: 'test-key' })).resolves.toEqual(result);
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('http://localhost:11434/api/chat');
    expect(JSON.parse(options.body).format).toEqual(SEARCH_SCHEMA);
    expect(options.headers.Authorization).toBe('Bearer test-key');
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });
  it.each([
    ['https://ollama.com', 'gemma4'],
    ['http://localhost:11434', 'gemma4:31b-cloud'],
  ])('does not require unsupported structured output for cloud models', async (baseUrl, model) => {
    mockProvider(`\`\`\`json\n${JSON.stringify(result)}\n\`\`\``);
    expect(await interpretQuestion('inflation', { baseUrl, model })).toEqual(result);
    expect(JSON.parse(fetch.mock.calls[0][1].body)).not.toHaveProperty('format');
  });
  it('rejects failed and empty provider responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    await expect(interpretQuestion('GDP', { baseUrl: 'https://ollama.com', model: 'model' })).rejects.toThrow();
    mockProvider('');
    await expect(interpretQuestion('GDP', { baseUrl: 'https://ollama.com', model: 'model' })).rejects.toThrow();
  });
});
