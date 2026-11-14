import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCategoryChildren, getSeriesObservations, getSeries } from '../api/fred';
import { useFred } from '../hooks/useFred';
import Chart from '../components/LazyChart';
import Loading, { ErrorMessage } from '../components/Loading';
import { Landmark, Briefcase, BarChart3, Factory, TrendingUp, TrendingDown, Globe, MapPin, GraduationCap } from 'lucide-react';

const fetchCategories = () => getCategoryChildren(0);
const categoryIconMap = {
  32991: Landmark,       // Money, Banking, & Finance
  10:    Briefcase,      // Population, Employment, & Labor Markets
  32992: BarChart3,      // National Accounts
  33060: Factory,        // Production & Business Activity
  32455: TrendingUp,     // Prices
  32263: Globe,          // International Data
  3008:  MapPin,         // U.S. Regional Data
  33287: GraduationCap,  // Academic Data
};

function getCategoryIcon(id) {
  return categoryIconMap[id] || BarChart3;
}

const KEY_INDICATOR_IDS = ['GDP', 'UNRATE', 'CPIAUCSL', 'FEDFUNDS'];
const INDICATOR_NAMES = { GDP: 'Gross domestic product', UNRATE: 'Unemployment', CPIAUCSL: 'Consumer prices', FEDFUNDS: 'Fed funds rate' };
const INDICATORS_CACHE_KEY = 'fred_indicators_cache_v3';
const INDICATORS_TTL = 5 * 60 * 1000;

function readIndicatorsCache() {
  try {
    const raw = localStorage.getItem(INDICATORS_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (!Array.isArray(cached.indicators) || Date.now() - cached.updatedAt > INDICATORS_TTL) return null;
    return cached.indicators;
  } catch {
    return null;
  }
}

function writeIndicatorsCache(indicators) {
  if (indicators.some(ind => ind.value == null)) return; // don't cache partial results
  try {
    localStorage.setItem(INDICATORS_CACHE_KEY, JSON.stringify({ indicators, updatedAt: Date.now() }));
  } catch {
    // quota exceeded — skip silently
  }
}

function useKeyIndicators() {
  const [indicators, setIndicators] = useState(() =>
    readIndicatorsCache() ||
    KEY_INDICATOR_IDS.map(id => ({ id, name: null, value: null, delta: null, date: null, loading: true }))
  );

  useEffect(() => {
    if (readIndicatorsCache()) return;

    let cancelled = false;

    async function fetchAll() {
      const results = await Promise.allSettled(
        KEY_INDICATOR_IDS.map(async (id) => {
          const [info, obs] = await Promise.all([
            getSeries(id),
            getSeriesObservations(id, { limit: 90, sort_order: 'desc' }),
          ]);
          const valid = obs.filter(o => o.value !== '.' && Number.isFinite(Number(o.value)));
          const current = valid.length > 0 ? Number(valid[0].value) : null;
          const prior = valid.length > 1 ? Number(valid[1].value) : null;
          const delta = prior && prior !== 0 ? ((current - prior) / Math.abs(prior)) * 100 : null;
          return { id, name: INDICATOR_NAMES[id], units: info?.units, points: [...obs].reverse(), value: current, delta, date: obs.length > 0 ? obs[0].date : null, loading: false };
        })
      );

      if (cancelled) return;

      const next = results.map((result, i) =>
        result.status === 'fulfilled'
          ? result.value
          : { id: KEY_INDICATOR_IDS[i], name: KEY_INDICATOR_IDS[i], value: null, delta: null, date: null, loading: false }
      );

      setIndicators(next);
      writeIndicatorsCache(next);
    }

    fetchAll();
    return () => { cancelled = true; };
  }, []);

  return indicators;
}

function Sparkline({ points }) {
  const values = (points || []).filter(o => o.value !== '.').map(o => Number(o.value)).filter(Number.isFinite);
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  return <svg className="indicator-sparkline" viewBox="0 0 160 36" aria-hidden="true"><polyline points={values.map((value, i) => `${i / (values.length - 1) * 160},${32 - (value - min) / span * 28}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>;
}

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

export default function Home({ recentlyViewed, clearHistory }) {
  const [showAllRecent, setShowAllRecent] = useState(false);
  const { data: categories, loading, error, refetch } = useFred(
    fetchCategories
  );
  const indicators = useKeyIndicators();

  return (
    <div className="page home-page">

      <div className="page-intro"><span className="eyebrow">YOUR ECONOMIC PERSPECTIVE</span><h1>The economy, at a glance.</h1><p>Explore the numbers behind the headlines.</p><Link to="/search" className="overview-explore">Ask a question or explore data →</Link></div>
      {/* Key Indicators */}
      <div className="key-indicators-label">Key Indicators</div>
      <div className="key-indicators-grid">
        {indicators.map(ind => (
          <Link key={ind.id} className="key-indicator-card" to={`/series/${ind.id}`}>
            <div className="ki-name">{ind.name || INDICATOR_NAMES[ind.id]}</div>
            <div className="ki-value">
              {ind.loading ? '…' : ind.value != null ? Number(ind.value).toLocaleString() : '—'}
            </div>
            <div className="ki-units">{ind.units || "Economic indicator"}</div>
            {ind.delta != null && (
              <span className={`delta-chip ${ind.delta >= 0 ? 'delta-positive' : 'delta-negative'}`}>
                {ind.delta >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {ind.delta >= 0 ? '+' : ''}{ind.delta.toFixed(1)}% <span className="delta-period">vs prior observation</span>
              </span>
            )}
            <Sparkline points={ind.points} />
            {ind.date && <div className="ki-date">As of {ind.date}</div>}
          </Link>
        ))}
      </div>

      {indicators.find(ind => ind.id === 'UNRATE')?.points?.length > 0 && <section className="overview-chart"><div className="home-section-header"><div><span className="eyebrow">IN FOCUS</span><h2>Unemployment rate</h2><p>Percent of the labor force · Recent observations</p></div><Link to="/series/UNRATE">Explore series →</Link></div><Chart observations={indicators.find(ind => ind.id === 'UNRATE').points} title="Unemployment rate" /></section>}

      {/* Two-column: Recently Viewed + Browse Categories */}
      <div className="home-two-col">

        {/* Recently Viewed */}
        <section className="home-section">
          <div className="home-section-header">
            <h2>Recently Viewed</h2>
            {recentlyViewed.length > 0 && (
              <button className="recent-clear-btn" onClick={clearHistory}>Clear</button>
            )}
          </div>
          {recentlyViewed.length === 0 ? (
            <div className="history-empty"><BarChart3 size={27} /><h3>Your research starts here.</h3><p>Open a series and it will appear here for an easy return.</p><Link to="/search">Find your first indicator →</Link></div>
          ) : (
            <>
              <div className="recent-mini-grid">
                {(showAllRecent ? recentlyViewed : recentlyViewed.slice(0, 6)).map(item => (
                  <Link key={item.id} className="recent-mini-card" to={`/series/${item.id}`}>
                    <div className="recent-card-top">
                      <span className="recent-card-id">{item.id}</span>
                      {item.viewedAt && <span className="recent-card-time">{timeAgo(item.viewedAt)}</span>}
                    </div>
                    <p className="recent-card-title">{item.title}</p>
                    {item.frequency && <span className="recent-card-freq">{item.frequency}</span>}
                  </Link>
                ))}
              </div>
              {recentlyViewed.length > 6 && (
                <button className="recent-see-all" onClick={() => setShowAllRecent(v => !v)}>
                  {showAllRecent ? 'Show less' : `+${recentlyViewed.length - 6} more`}
                </button>
              )}
            </>
          )}
        </section>

        {/* Browse Categories */}
        <section className="home-section">
          <div className="home-section-header"><h2>Explore topics</h2><Link to="/categories">All topics →</Link></div>
          {loading && <Loading text="Loading categories..." />}
          {error && <ErrorMessage message={error} onRetry={refetch} />}
          {categories && (
            <div className="category-grid">
              {categories.map(cat => {
                const Icon = getCategoryIcon(cat.id);
                return (
                  <Link key={cat.id} className="category-card" to={`/categories/${cat.id}`}>
                    <Icon size={24} className="category-icon" />
                    <span className="category-name">{cat.name}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
