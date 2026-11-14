import { NL_SEARCH_SYSTEM_PROMPT } from './ai-config.js';

export const SEARCH_SCHEMA = {
  type: 'object',
  properties: {
    searchTerms: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 3 },
    explanation: { type: 'string' },
  },
  required: ['searchTerms', 'explanation'],
  additionalProperties: false,
};

function validate(value) {
  if (!value || !Array.isArray(value.searchTerms) ||
      !value.searchTerms.every(term => typeof term === 'string') ||
      typeof value.explanation !== 'string') {
    throw new Error('Invalid search interpretation');
  }
  const searchTerms = [...new Set(value.searchTerms.map(term => term.trim()).filter(Boolean))].slice(0, 3);
  if (!searchTerms.length || searchTerms.some(term => term.length > 200)) throw new Error('Invalid search terms');
  return { searchTerms, explanation: value.explanation.trim().slice(0, 1000) };
}

export function parseSearchInterpretation(content) {
  if (typeof content !== 'string' || content.length > 40000) throw new Error('Invalid AI response');
  // Do not extract an intermediate answer from a model's reasoning block.
  const text = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  if (/<think>/i.test(text)) throw new Error('Incomplete AI response');
  try { return validate(JSON.parse(text)); } catch { /* Accept a JSON object wrapped in prose or a code fence. */ }
  let start = -1;
  let depth = 0;
  let quoted = false;
  let escaped = false;
  const candidates = [];
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (start < 0) {
      if (character === '{') { start = index; depth = 1; }
      continue;
    }
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') quoted = false;
    } else if (character === '"') quoted = true;
    else if (character === '{') depth++;
    else if (character === '}' && --depth === 0) {
      try { candidates.push(validate(JSON.parse(text.slice(start, index + 1)))); } catch { /* Ignore unrelated objects. */ }
      start = -1;
    }
  }
  if (candidates.length !== 1) throw new Error('No unambiguous search interpretation');
  return candidates[0];
}

export function supportsStructuredOutput(baseUrl, model) {
  const hostname = new URL(baseUrl).hostname;
  return !/(^|\.)ollama\.com$/i.test(hostname) && !/(?:[-:]cloud)\b/i.test(model);
}

export async function interpretQuestion(query, { baseUrl, model, apiKey }) {
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  const body = {
    model,
    messages: [
      { role: 'system', content: NL_SEARCH_SYSTEM_PROMPT },
      { role: 'user', content: `${query}\n\nReturn only the JSON object with searchTerms and explanation. Do not include reasoning or markdown.` },
    ],
    options: { temperature: 0 },
    stream: false,
  };
  // Ollama Cloud does not support the format parameter; prompt + validate there.
  if (supportsStructuredOutput(baseUrl, model)) body.format = SEARCH_SCHEMA;
  const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/chat`, {
    method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) throw new Error('AI provider unavailable');
  const data = await response.json();
  return parseSearchInterpretation(data?.message?.content);
}
