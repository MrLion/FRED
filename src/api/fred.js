const extractSeries = (d) => d.seriess || [];

async function fredFetch(endpoint, params = {}, signal) {
  const searchParams = new URLSearchParams();
  searchParams.set('endpoint', endpoint);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) searchParams.set(k, String(v));
  });

  const res = await fetch(`/api/fred-proxy?${searchParams.toString()}`, { signal });
  if (!res.ok) {
    if (res.status === 400) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error_message || data?.error || 'Bad request');
    }
    throw new Error(`FRED API error: ${res.status}`);
  }
  return res.json();
}

export async function getCategory(categoryId = 0, signal) {
  return fredFetch('category', { category_id: categoryId }, signal);
}

export async function getCategoryChildren(categoryId = 0, signal) {
  const data = await fredFetch('category/children', { category_id: categoryId }, signal);
  return data.categories || [];
}

export async function getCategorySeries(categoryId, opts = {}) {
  const data = await fredFetch('category/series', {
    category_id: categoryId,
    limit: opts.limit || 100,
    offset: opts.offset || 0,
    order_by: opts.order_by || 'popularity',
    sort_order: opts.sort_order || 'desc',
  }, opts.signal);
  return { series: extractSeries(data), count: data.count || 0 };
}

export async function getSeries(seriesId) {
  const data = await fredFetch('series', { series_id: seriesId });
  return extractSeries(data)[0] || null;
}

export async function getSeriesObservations(seriesId, opts = {}) {
  const limit = opts.limit || 10000;
  let observations = [];
  let offset = 0;
  let count;
  do {
    const data = await fredFetch('series/observations', {
      series_id: seriesId, limit, offset,
      observation_start: opts.start, observation_end: opts.end,
      frequency: opts.frequency, units: opts.units, sort_order: opts.sort_order,
    }, opts.signal);
    const page = data.observations || [];
    observations = observations.concat(page);
    count = data.count ?? observations.length;
    offset += page.length;
    if (!page.length) break;
  } while (opts.all && offset < count);
  return observations;
}

export async function searchSeries(query, opts = {}, signal) {
  const data = await fredFetch('series/search', {
    search_text: query,
    limit: opts.limit || 50,
    offset: opts.offset || 0,
    order_by: opts.order_by || 'search_rank',
  }, signal);
  return { series: extractSeries(data), count: data.count || 0 };
}

async function fredDirectory(endpoint, field, params, signal) {
  const items = [];
  let offset = 0;
  let count;
  do {
    const data = await fredFetch(endpoint, { ...params, limit: 1000, offset }, signal);
    const page = data[field] || [];
    items.push(...page);
    offset += page.length;
    count = data.count ?? offset;
    if (!page.length) break;
  } while (offset < count);
  return [...new Map(items.map(item => [item.id, item])).values()];
}

export async function getSources(opts = {}) {
  return fredDirectory('sources', 'sources', { order_by: 'name' }, opts.signal);
}

export async function getSourceReleases(sourceId, opts = {}) {
  return fredDirectory('source/releases', 'releases', { source_id: sourceId, order_by: 'name' }, opts.signal);
}

export async function getReleases(opts = {}) {
  return fredDirectory('releases', 'releases', { order_by: opts.order_by || 'name' }, opts.signal);
}

export async function getRelease(releaseId, signal) {
  const data = await fredFetch('release', { release_id: releaseId }, signal);
  return data.releases?.[0] || null;
}

export async function getReleaseSeries(releaseId, opts = {}) {
  const data = await fredFetch('release/series', {
    release_id: releaseId, limit: opts.limit || 50, offset: opts.offset || 0,
    order_by: opts.order_by || 'popularity', sort_order: opts.sort_order || 'desc',
  }, opts.signal);
  return { series: extractSeries(data), count: data.count || 0 };
}

let _recessionCache = null;

export async function getRecessionPeriods() {
  if (_recessionCache) return _recessionCache;
  const obs = await getSeriesObservations('USREC', { limit: 10000 });
  const periods = [];
  let start = null;
  for (const o of obs) {
    if (Number(o.value) === 1 && !start) {
      start = o.date;
    } else if (Number(o.value) === 0 && start) {
      periods.push({ start, end: o.date });
      start = null;
    }
  }
  if (start) periods.push({ start, end: new Date().toISOString().split('T')[0] });
  _recessionCache = periods;
  return periods;
}

