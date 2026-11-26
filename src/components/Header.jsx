import { AtlasLink as Link, useAtlasNavigate as useNavigate } from '../features/atlas/AtlasNavigation';
import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { searchSeries } from '../api/fred';
import { Search, X, ArrowUpRight, ChartNoAxesColumnIncreasing, Settings } from 'lucide-react';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const committed = location.pathname === '/search' ? new URLSearchParams(location.search).get('q') || '' : '';
  return <header className="atlas-header"><Link className="atlas-brand" to="/"><span className="atlas-wordmark">FRED</span><span className="atlas-brand-rule"/><span>ECONOMIC<br/>ATLAS</span></Link><SearchInput key={`${location.pathname}:${committed}`} initialQuery={committed} onNavigate={navigate}/><div className="atlas-header-actions"><Link to="/overview"><ChartNoAxesColumnIncreasing size={17}/><span>National overview</span></Link><Link to="/settings" aria-label="Settings"><Settings size={18}/></Link></div></header>;
}

function SearchInput({ initialQuery, onNavigate }) {
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const form = useRef(null);
  const input = useRef(null);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if (query.trim().length < 3) { setSuggestions([]); setLoading(false); return; }
      setLoading(true);
      try {
        const data = await searchSeries(query.trim(), { limit: 6 }, controller.signal);
        if (!controller.signal.aborted) { setSuggestions(data.series); setActive(-1); }
      } catch {
        if (!controller.signal.aborted) setSuggestions([]);
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);
  const go = id => { setOpen(false); onNavigate(`/series/${encodeURIComponent(id)}`); };
  const submit = event => { event.preventDefault(); if (query.trim()) { setOpen(false); onNavigate(`/search?q=${encodeURIComponent(query.trim())}`); } };
  return <form ref={form} className="header-search" onSubmit={submit} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <Search className="search-icon" size={18} />
    <input ref={input} value={query} aria-label="Search economic data" role="combobox" aria-expanded={open && suggestions.length > 0} aria-controls="search-options" aria-autocomplete="list" aria-activedescendant={open && active >= 0 ? `search-option-${active}` : undefined} placeholder="Ask about a place or economic trend…" autoComplete="off" className="search-input"
      onFocus={() => setOpen(true)} onChange={event => { setQuery(event.target.value); setSuggestions([]); setActive(-1); setOpen(true); }}
      onKeyDown={event => {
        if (event.key === 'Escape') setOpen(false);
        if (event.key === 'ArrowDown' && suggestions.length) { event.preventDefault(); setOpen(true); setActive(n => Math.min(n + 1, suggestions.length - 1)); }
        if (event.key === 'ArrowUp' && suggestions.length) { event.preventDefault(); setActive(n => Math.max(n - 1, -1)); }
        if (event.key === 'Enter' && open && active >= 0) { event.preventDefault(); go(suggestions[active].id); }
      }} />
    {query && <button type="button" className="search-clear" aria-label="Clear search" onClick={() => { setQuery(''); setSuggestions([]); setActive(-1); input.current.focus(); }}><X size={16} /></button>}
    {loading && <span className="search-spinner" aria-label="Finding suggestions" />}
    {open && suggestions.length > 0 && <div className="search-dropdown"><div id="search-options" role="listbox" aria-label="Suggested series">{suggestions.map((series, i) => <div id={`search-option-${i}`} role="option" aria-selected={active === i} key={series.id} className={`search-dropdown-item ${active === i ? 'active' : ''}`} onMouseDown={event => event.preventDefault()} onMouseEnter={() => setActive(i)} onClick={() => go(series.id)}><span className="search-dropdown-id">{series.id}</span><span className="search-dropdown-title">{series.title}</span><ArrowUpRight size={15} /></div>)}</div><button type="submit" className="search-dropdown-footer">View all results for “{query.trim()}” <ArrowUpRight size={14} /></button></div>}
  </form>;
}
