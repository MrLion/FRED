import { useAtlasSearchParams as useSearchParams } from '../features/atlas/AtlasNavigation';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getSeries, getSeriesObservations, getRecessionPeriods } from '../api/fred';
import Chart from '../components/LazyChart';
import AiNarrator from '../components/AiNarrator';
import Loading, { ErrorMessage } from '../components/Loading';
import { useNationalComparison } from '../features/atlas/useNationalComparison';
import { chartObservations, compatibility, comparisonTakeaway, latestCommonPoint, regionalIndicator, US_SERIES } from '../features/atlas/research';
import { LAYERS } from '../features/atlas/data';
import { TrendingUp, TrendingDown, ExternalLink, Globe2 } from 'lucide-react';

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
  const indicator=regionalIndicator(id);
  const sourceLayer=indicator?.layer||LAYERS.find(layer=>US_SERIES[layer.id]===id);
  const annualGrowth=sourceLayer?.id==='growth'&&params.get('transform')==='yoy';
  const compareSupported=Boolean(indicator)&&(indicator.layer.id!=='growth'||annualGrowth);
  const compareEnabled=compareSupported&&params.get('compare')!=='off';
  const [benchmarkAttempt,setBenchmarkAttempt]=useState(0);
  const benchmark=useNationalComparison(indicator?.layer.id,compareEnabled,benchmarkAttempt);
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

  const plottedObservations=chartObservations(observations,sourceLayer,annualGrowth?'yoy':null);
  const displaySeries=annualGrowth?{...series,title:indicator?`Real GDP growth in ${series.title.split(' in ').at(-1)}`:'Real GDP growth · United States',units:'Percent change from previous year'}:series;
  const filteredObs = (() => {
    const selected = RANGES.find(r => r.label === range);
    if (start) return plottedObservations.filter(o => o.date >= start);
    if (!selected?.years) return plottedObservations;
    const lastObserved=plottedObservations.filter(point=>point.value!=='.'&&Number.isFinite(Number(point.value))).at(-1);
    const cutoff = new Date(lastObserved?.date||Date.now());
    cutoff.setFullYear(cutoff.getFullYear() - selected.years);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    return plottedObservations.filter(o => o.date >= cutoffStr);
  })();

  const valid = plottedObservations.filter(o => o.value !== '.' && Number.isFinite(Number(o.value)));
  const latest = valid.at(-1);
  const prior = valid.at(-2);

  const mismatch=compareEnabled&&benchmark.series?compatibility(series,benchmark.series,indicator.layer,annualGrowth?'yoy':null):null;
  const benchmarkPoints=benchmark.observations?chartObservations(benchmark.observations,indicator?.layer,annualGrowth?'yoy':null):[];
  const comparison=compareEnabled&&!mismatch&&!benchmark.error&&!benchmark.loading&&benchmark.series?{observations:benchmarkPoints,name:'United States'}:null;
  const takeaway=comparison?comparisonTakeaway(latestCommonPoint(filteredObs,benchmarkPoints),indicator.layer,series.title.match(/(?:in|for) (.+)$/)?.[1]||indicator.region):null;
  const setControl=(changes)=>{const next=new URLSearchParams(params);Object.entries(changes).forEach(([key,value])=>value==null?next.delete(key):next.set(key,value));setParams(next);};

  return (
    <div className="page series-detail-page">
      {/* Identity zone */}
      <div className="series-detail-header">
        <span className="eyebrow">SERIES EXPLORER</span><span className="series-detail-id">{series.id}</span>
        <h1 className="series-detail-title">{displaySeries.title}</h1><p className="series-detail-subtitle">{series.frequency} · {series.seasonal_adjustment}{annualGrowth?' · Calculated annual change':''}</p>
      </div>

      {/* Hero number zone */}
      {latest && (
        <div className="series-detail-latest">
          <span className="latest-value">{annualGrowth?`${Number(latest.value).toFixed(1)}%`:Number(latest.value).toLocaleString()}</span>
          {displaySeries.units && <span className="latest-units">{displaySeries.units}</span>}
          <div className="latest-meta">
            {!annualGrowth && <DeltaChip
              current={Number(latest.value)}
              prior={prior ? Number(prior.value) : null}
            />}
            <span className="latest-date">{annualGrowth?'Annual real GDP growth':'vs prior observation'} · Latest observation {latest.date}</span>
          </div>
        </div>
      )}

      {/* Chart zone */}
      <div className="chart-toolbar"><div className="range-selector">{start && <button className="range-btn active" aria-pressed="true" onClick={() => setControl({start:null})}>Since {start.slice(0, 4)} ×</button>}
        {RANGES.map(r => (
          <button
            key={r.label}
            className={`range-btn ${!start && range === r.label ? 'active' : ''}`}
            aria-pressed={!start && range === r.label}
            onClick={() => setControl({range:r.label,start:null})}
          >
            {r.label}
          </button>
        ))}
      </div></div>
      <p className="chart-range-caption">Time ranges end at the latest observation.</p>

      {indicator&&<section className="benchmark-controls" aria-label="National comparison"><div><Globe2 size={17}/><strong>Put this indicator in perspective</strong></div>
        {compareSupported?<label><input type="checkbox" checked={compareEnabled} onChange={event=>setControl({compare:event.target.checked?'us':'off'})}/>Compare with United States</label>:<button onClick={()=>setControl({transform:'yoy',compare:'us'})}>Compare annual GDP growth with the US</button>}
        {annualGrowth&&<button className="benchmark-level-link" onClick={()=>setControl({transform:null,compare:'off'})}>View original GDP levels</button>}
      </section>}
      {compareEnabled&&benchmark.loading&&<p className="benchmark-notice" role="status">Loading the matching US benchmark…</p>}
      {compareEnabled&&benchmark.error&&<div className="benchmark-notice" role="status">{benchmark.error}<button onClick={()=>setBenchmarkAttempt(n=>n+1)}>Retry comparison</button></div>}
      {mismatch&&<p className="benchmark-notice">Comparison unavailable: {mismatch}</p>}
      {takeaway&&<div className="benchmark-takeaway"><strong>{takeaway.text}</strong><span>Same-period comparison · {takeaway.date}</span><p>{takeaway.note}</p></div>}
      {comparison&&!takeaway&&<p className="benchmark-notice">No matching observation dates in this range. No gap has been calculated.</p>}
      <Chart observations={filteredObs} title={displaySeries.title} primaryLabel={indicator?.region} comparison={comparison} recessionPeriods={recessionPeriods} />

      {/* Insight zone */}
      <AiNarrator buttonLabel={comparison?'Explain regional trend':'Explain this chart'} key={`${id}:${range}:${start}:${annualGrowth}:${latest?.date}`} series={displaySeries} observations={filteredObs} />


      {/* Provenance zone */}
      <div className="series-meta">
        <div className="meta-row">
          <span className="meta-label">Units</span>
          <span className="meta-value">{displaySeries.units || 'N/A'}</span>
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
          <span className="meta-label">{annualGrowth?'Source observation range':'Observation Range'}</span>
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
