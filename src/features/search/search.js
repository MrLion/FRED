import { searchSeries } from '../../api/fred';

export function isQuestion(query) {
  return /\?|^(how|what|why|when|show|compare|tell|explain|find|which|where|has|have|did|does|can)\b/i.test(query.trim()) || query.trim().split(/\s+/).length >= 6;
}

export async function interpretSearch(query, signal) {
  const response = await fetch('/api/nl-search', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }), signal,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Question interpretation is unavailable.');
  if (!Array.isArray(data.searchTerms) || !data.searchTerms.every(term => typeof term === 'string')) {
    throw new Error('The search interpretation was invalid.');
  }
  return { searchTerms: [...new Set(data.searchTerms.map(s => s.trim()).filter(Boolean))].slice(0, 3), explanation: typeof data.explanation === 'string' ? data.explanation : '' };
}

export async function searchSuggestions(terms, signal) {
  const responses = await Promise.allSettled(terms.map(term => searchSeries(term, { limit: 20 }, signal)));
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
  const successful = responses.filter(result => result.status === 'fulfilled');
  if (!successful.length) throw new Error('Suggested series could not be loaded.');
  const unique = new Map();
  successful.forEach(result => result.value.series.forEach(series => {
    if (!unique.has(series.id)) unique.set(series.id, series);
  }));
  return { series: [...unique.values()], partial: successful.length !== responses.length };
}

export function questionStartDate(query) {
  const match = /\b(?:since|from)\s+((?:19|20)\d{2})\b/i.exec(query);
  return match && Number(match[1]) <= new Date().getUTCFullYear() ? `${match[1]}-01-01` : null;
}
