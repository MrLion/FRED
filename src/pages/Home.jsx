import { AtlasLink as Link } from '../features/atlas/AtlasNavigation';
import { useState, useEffect } from 'react';

import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';

import { SNAPSHOT, snapshotValue, snapshotChange, observationLabel } from '../features/overview/snapshot';

import { readSnapshot, loadSnapshot } from '../features/overview/loadSnapshot';

const KEY_INDICATOR_IDS = ['GDP', 'UNRATE', 'CPIAUCSL', 'FEDFUNDS'];
const INDICATOR_NAMES = Object.fromEntries(Object.entries(SNAPSHOT).map(([id,details])=>[id,details.name]));
function useKeyIndicators() {
  const [indicators,setIndicators]=useState(()=>KEY_INDICATOR_IDS.map(id=>readSnapshot(id)||{id,name:INDICATOR_NAMES[id],value:null,loading:true}));
  const [retries,setRetries]=useState({});
  useEffect(()=>{
    let cancelled=false;
    KEY_INDICATOR_IDS.forEach(id=>{
      const cached=readSnapshot(id);
      if(cached&&!cached.stale&&!retries[id])return;
      loadSnapshot(id).then(data=>{
        if(!cancelled)setIndicators(items=>items.map(item=>item.id===id?{...data,error:false}:item));
      }).catch(()=>{
        if(!cancelled)setIndicators(items=>items.map(item=>item.id===id?{...item,name:INDICATOR_NAMES[id],loading:false,error:true}:item));
      });
    });
    return ()=>{cancelled=true;};
  },[retries]);
  const retry=id=>{
    setIndicators(items=>items.map(item=>item.id===id?{...item,error:false,loading:true}:item));
    setRetries(previous=>({...previous,[id]:(previous[id]||0)+1}));
  };
  return {indicators,retry};
}

function Sparkline({ points, title }) {
  const all = (points || []).filter(p => p.value !== '.' && Number.isFinite(Number(p.value)));
  if (all.length < 2) return null;
  const end = Date.parse(all.at(-1).date);
  const cutoff = new Date(end); cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 5);
  const recent = (points || []).filter(p => Date.parse(p.date) >= cutoff.getTime());
  const valid = recent.filter(p => p.value !== '.' && Number.isFinite(Number(p.value)));
  if (valid.length < 2) return null;
  const min = Math.min(...valid.map(p => Number(p.value)));
  const max = Math.max(...valid.map(p => Number(p.value)));
  const start = Date.parse(valid[0].date);
  let path = '', gap = true;
  recent.forEach(p => {
    if (p.value === '.' || !Number.isFinite(Number(p.value))) { gap = true; return; }
    const x = 4 + (Date.parse(p.date) - start) / (end - start || 1) * 472;
    const y = 86 - (Number(p.value) - min) / (max - min || 1) * 70;
    path += `${gap ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)} `; gap = false;
  });
  return <div className="snapshot-trend"><svg className="indicator-sparkline" viewBox="0 0 480 100" preserveAspectRatio="none" role="img" aria-label={`${title}, ${valid[0].date} to ${valid.at(-1).date}. Values ${min.toLocaleString()} to ${max.toLocaleString()}.`}>
    {[16,51,86].map(y=><line key={y} x1="4" x2="476" y1={y} y2={y} stroke="currentColor" opacity=".1" vectorEffect="non-scaling-stroke"/>)}
    <path d={path} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke"/>
  </svg><div className="snapshot-trend-dates"><span>{valid[0].date.slice(0,4)}</span><span>{valid.at(-1).date.slice(0,4)}</span></div></div>;
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
  const {indicators,retry} = useKeyIndicators();

  return (
    <div className="page home-page">

      <div className="page-intro"><span className="eyebrow">YOUR ECONOMIC PERSPECTIVE</span><h1>The economy, at a glance.</h1><p>Explore the numbers behind the headlines.</p><Link to="/search" className="overview-explore">Ask a question or explore data →</Link></div>
      {/* Key Indicators */}
      <div className="key-indicators-label">National snapshot</div>
      <div className="key-indicators-grid">
        {indicators.map(ind => (
          <div key={ind.id} className="key-indicator-card"><Link className="snapshot-card-link" to={`/series/${ind.id}`}>
            <div className="snapshot-card-heading"><div className="ki-name">{ind.name || INDICATOR_NAMES[ind.id]}</div>{ind.date&&<span className="ki-date">{observationLabel(ind.date,ind.id)}</span>}</div>
            <div className="snapshot-value-row"><div className="ki-value">{ind.value != null ? snapshotValue(ind.value,ind.id) : ind.loading ? '…' : 'Unavailable'}</div>
              {ind.delta != null && <span className={`delta-chip ${ind.delta>0?'delta-positive':ind.delta<0?'delta-negative':'delta-na'}`} title={`${snapshotChange(ind.delta,ind.id)} versus ${observationLabel(ind.priorDate,ind.id)}`}>
                {ind.delta>0?<TrendingUp size={13}/>:ind.delta<0?<TrendingDown size={13}/>:null}
                {snapshotChange(ind.delta,ind.id).replace(' percentage points',' pp')}
                <span className="delta-period">vs {observationLabel(ind.priorDate,ind.id)}</span>
              </span>}
            </div>
            <div className="ki-units" title={`${SNAPSHOT[ind.id].note} ${ind.seasonalAdjustment||''}`}>{SNAPSHOT[ind.id].units}</div>
            <Sparkline points={ind.points} title={INDICATOR_NAMES[ind.id]}/>

          </Link>{ind.error&&<div className="snapshot-recovery"><span>{ind.value!=null?'Could not refresh':'Temporarily unavailable'}</span><button className="text-action" aria-label={`Retry ${INDICATOR_NAMES[ind.id]}`} onClick={()=>retry(ind.id)}>Retry</button></div>}</div>
        ))}
      </div>


      {/* Recently viewed */}
      <div className="home-recent-section">

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


      </div>
    </div>
  );
}
