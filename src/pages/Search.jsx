import { useAtlasSearchParams as useSearchParams } from '../features/atlas/AtlasNavigation';
import { useState, useEffect, useRef } from 'react';

import { searchSeries } from '../api/fred';
import { interpretSearch, isQuestion, searchSuggestions, questionStartDate } from '../features/search/search';
import SeriesCard from '../components/SeriesCard';
import Loading, { ErrorMessage } from '../components/Loading';
import { Sparkles, Search as SearchIcon, ArrowRight } from 'lucide-react';

export default function Search() {
  const [params, setParams] = useSearchParams();
  const query = (params.get('q') || '').trim();
  const start = questionStartDate(query);
  const keyword = params.get('mode') === 'keyword';
  const input = useRef(null);
  const [state, setState] = useState({ key: '', results: [], total: 0, loading: false });
  const [retry, setRetry] = useState(0);
  const active = useRef(null);
  const pageLock = useRef(false);
  const key = JSON.stringify([query, keyword]);

  useEffect(() => {
    const controller = new AbortController();
    active.current = controller;
    pageLock.current = false;
    if (!query) return () => controller.abort();
    async function run() {
      let next = { key, results: [], total: 0, loading: true, mode: 'keyword', offset: 0 };
      setState(next);
      try {
        if (isQuestion(query) && !keyword) {
          try {
            const interpreted = await interpretSearch(query, controller.signal);
            if (!interpreted.searchTerms.length) throw new Error('No search terms');
            const suggestions = await searchSuggestions(interpreted.searchTerms, controller.signal);
            next = { ...next, results: suggestions.series, total: suggestions.series.length, mode: 'suggested', interpretation: interpreted, notice: suggestions.partial ? 'Some suggested searches are unavailable. Showing the matches we could load.' : null };
          } catch {
            if (controller.signal.aborted) return;
            const data = await searchSeries(query, {}, controller.signal);
            next = { ...next, results: data.series, total: data.count, notice: 'AI interpretation is unavailable. Showing keyword results for your question.' };
          }
        } else {
          const data = await searchSeries(query, {}, controller.signal);
          next = { ...next, results: data.series, total: data.count };
        }
        if (!controller.signal.aborted) setState({ ...next, loading: false });
      } catch (error) {
        if (!controller.signal.aborted) setState({ ...next, loading: false, error: error.message });
      }
    }
    run();
    return () => controller.abort();
  }, [query, keyword, key, retry]);

  const current = state.key === key ? state : { results: [], loading: Boolean(query), total: 0 };
  async function loadMore() {
    if (pageLock.current || current.loading || current.mode !== 'keyword') return;
    pageLock.current = true;
    const controller = active.current;
    setState(prev => ({ ...prev, paging: true, pageError: null }));
    try {
      const offset = current.offset + 50;
      const data = await searchSeries(query, { offset }, controller.signal);
      if (!controller.signal.aborted) setState(prev => ({ ...prev, results: [...new Map([...prev.results, ...data.series].map(s => [s.id, s])).values()], total: data.count, offset, paging: false, exhausted: data.series.length === 0 }));
    } catch (error) {
      if (!controller.signal.aborted) setState(prev => ({ ...prev, paging: false, pageError: error.message }));
    } finally {
      if (!controller.signal.aborted) pageLock.current = false;
    }
  }

  return (
    <div className="page search-page">
      <div className="page-intro"><span className="eyebrow">DISCOVER THE DATA</span><h1 className="page-title">{query ? 'Find the signal.' : 'What would you like to explore?'}</h1><p>Search an indicator, enter a series ID, or ask a question in plain English.</p></div>
      <form className="explore-search" onSubmit={event => { event.preventDefault(); const q = input.current.value.trim(); if (q) setParams({ q }); }}>
        <SearchIcon size={21} /><input ref={input} key={query} defaultValue={query} aria-label="Search economic data or ask a question" placeholder="How has inflation changed since 2020?" /><button type="submit" aria-label="Search"><ArrowRight size={20} /></button>
      </form>
      {!query && <div className="suggested-queries"><span>Try a question</span>{['How has inflation changed since 2020?', 'Unemployment rate', 'GDP'].map(q => <button key={q} onClick={() => setParams({ q })}>{q}<ArrowRight size={15} /></button>)}</div>}
      {query && <>
        {current.loading && <Loading text={isQuestion(query) && !keyword ? 'Interpreting your question and finding relevant series…' : 'Finding economic data…'} />}
        {current.interpretation && <div className="ai-search-banner"><Sparkles size={21} /><div><strong>Understanding your question</strong><p>{current.interpretation.explanation || `Suggested indicators for “${query}”`}</p><div className="ai-search-terms">{start && <span className="ai-search-term">Charts start in {start.slice(0, 4)}</span>}{current.interpretation.searchTerms.map(term => <button key={term} className="ai-search-term" onClick={() => setParams({ q: term, mode: 'keyword' })}>{term}</button>)}</div></div></div>}
        {current.notice && <p className="search-notice" role="status">{current.notice}</p>}
        {current.error && <ErrorMessage message={current.error} onRetry={() => setRetry(n => n + 1)} />}
        {!current.loading && !current.error && <div className="results-heading"><h2>{current.mode === 'suggested' ? 'Suggested series' : `Results for “${query}”`}</h2><span>{current.total.toLocaleString()} {current.mode === 'suggested' ? 'suggested matches' : 'series'}</span></div>}
        <div className="series-list">{current.results.map(series => <SeriesCard key={series.id} series={series} start={start} />)}</div>
        {!current.loading && !current.error && !current.results.length && <div className="empty-state"><SearchIcon size={34} /><h2>No matching series</h2><p>Try a shorter phrase, a series ID, or browse topics.</p></div>}
        {current.mode === 'suggested' && <button className="text-action" onClick={() => setParams({ q: query, mode: 'keyword' })}>Show keyword results <ArrowRight size={16} /></button>}
        {current.pageError && <p role="alert">Could not load more: {current.pageError}</p>}
        {current.mode === 'keyword' && !current.loading && current.results.length > 0 && current.results.length < current.total && !current.exhausted && <button className="btn-secondary load-more" disabled={current.paging} onClick={loadMore}>{current.paging ? 'Loading…' : `Load more · ${current.results.length} of ${current.total.toLocaleString()}`}</button>}
      </>}
    </div>
  );
}
