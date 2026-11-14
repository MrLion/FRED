import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { getSeries, getSeriesObservations, getRecessionPeriods } from '../api/fred';
import Chart from '../components/LazyChart';
import AiNarrator from '../components/AiNarrator';
import Loading, { ErrorMessage } from '../components/Loading';
import { TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';

const RANGES = [
  { label: '1Y', years: 1 },
  { label: '5Y', years: 5 },
  { label: '10Y', years: 10 },
  { label: 'Max', years: null },
];

function DeltaChip({ current, prior }) {
  if (prior === 0 || prior == null || current == null) {
    return <span className="delta-chip delta-na">N/A</span>;
  }
  const delta = ((current - prior) / Math.abs(prior)) * 100;
  const isPositive = delta >= 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  return (
    <span className={`delta-chip ${isPositive ? 'delta-positive' : 'delta-negative'}`}>
      <Icon size={14} />
      {isPositive ? '+' : ''}{delta.toFixed(1)}%
    </span>
  );
}

export default function SeriesDetail({ onView }) {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const range = params.get('range') || 'Max';
  const start = /^\d{4}-\d{2}-\d{2}$/.test(params.get('start') || '') ? params.get('start') : null;
  const [series, setSeries] = useState(null);
  const [observations, setObservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recessionPeriods, setRecessionPeriods] = useState([]);

  useEffect(() => {
    let cancelled = false;
    getRecessionPeriods().then(periods => { if (!cancelled) setRecessionPeriods(periods); }).catch(() => {});
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [seriesData, obsData] = await Promise.all([
          getSeries(id),
          getSeriesObservations(id, { all: true }),
        ]);
        if (cancelled) return;
        setSeries(seriesData);
        setObservations(obsData);
        if (seriesData) {
          onView({ id: seriesData.id, title: seriesData.title, frequency: seriesData.frequency });
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id, onView]);

  if (loading || (series && series.id !== id)) return <Loading text="Loading series data..." />;
  if (error) return <ErrorMessage message={error} />;
  if (!series) return <ErrorMessage message="Series not found" />;

  const filteredObs = (() => {
    const selected = RANGES.find(r => r.label === range);
    if (start) return observations.filter(o => o.date >= start);
    if (!selected?.years) return observations;
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - selected.years);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    return observations.filter(o => o.date >= cutoffStr);
  })();

  const valid = observations.filter(o => o.value !== '.' && Number.isFinite(Number(o.value)));
  const latest = valid.at(-1);
  const prior = valid.at(-2);

  return (
    <div className="page series-detail-page">
      {/* Identity zone */}
      <div className="series-detail-header">
        <span className="eyebrow">SERIES EXPLORER</span><span className="series-detail-id">{series.id}</span>
        <h1 className="series-detail-title">{series.title}</h1><p className="series-detail-subtitle">{series.frequency} · {series.seasonal_adjustment}</p>
      </div>

      {/* Hero number zone */}
      {latest && (
        <div className="series-detail-latest">
          <span className="latest-value">{Number(latest.value).toLocaleString()}</span>
          {series.units && <span className="latest-units">{series.units}</span>}
          <div className="latest-meta">
            <DeltaChip
              current={Number(latest.value)}
              prior={prior ? Number(prior.value) : null}
            />
            <span className="latest-date">vs prior observation · Latest observation {latest.date}</span>
          </div>
        </div>
      )}

      {/* Chart zone */}
      <div className="chart-toolbar"><div className="range-selector">{start && <button className="range-btn active" aria-pressed="true" onClick={() => setParams({})}>Since {start.slice(0, 4)} ×</button>}
        {RANGES.map(r => (
          <button
            key={r.label}
            className={`range-btn ${!start && range === r.label ? 'active' : ''}`}
            aria-pressed={!start && range === r.label}
            onClick={() => setParams({ range: r.label })}
          >
            {r.label}
          </button>
        ))}
      </div></div>

      <Chart observations={filteredObs} title={series.title} recessionPeriods={recessionPeriods} />

      {/* Insight zone */}
      <AiNarrator key={`${id}:${range}:${start}:${latest?.date}`} series={series} observations={filteredObs} />


      {/* Provenance zone */}
      <div className="series-meta">
        <div className="meta-row">
          <span className="meta-label">Units</span>
          <span className="meta-value">{series.units || 'N/A'}</span>
        </div>
        <div className="meta-row">
          <span className="meta-label">Frequency</span>
          <span className="meta-value">{series.frequency || 'N/A'}</span>
        </div>
        <div className="meta-row">
          <span className="meta-label">Seasonal Adjustment</span>
          <span className="meta-value">{series.seasonal_adjustment || 'N/A'}</span>
        </div>
        <div className="meta-row">
          <span className="meta-label">Last Updated</span>
          <span className="meta-value">{series.last_updated || 'N/A'}</span>
        </div>
        <div className="meta-row">
          <span className="meta-label">Observation Range</span>
          <span className="meta-value">{series.observation_start} to {series.observation_end}</span>
        </div>
      </div>

      {series.notes && (
        <div className="series-notes">
          <h3>Notes</h3>
          <p>{series.notes}</p>
        </div>
      )}

      <a
        className="fred-link"
        href={`https://fred.stlouisfed.org/series/${series.id}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <ExternalLink size={14} />
        View on FRED
      </a>
    </div>
  );
}
