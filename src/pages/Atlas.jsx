import { useMemo, useRef, useLayoutEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AtlasLink as Link, AtlasNavLink as NavLink } from '../features/atlas/AtlasNavigation';
import { useAtlasContext } from '../features/atlas/AtlasContext';
import Header from '../components/Header';
import { ArrowLeft, ArrowRight, Compass, ExternalLink, MapPinned, X } from 'lucide-react';
import { useFred } from '../hooks/useFred';
import AtlasMap from '../features/atlas/AtlasMap';
import ResearchSidebar from '../features/atlas/ResearchSidebar';
import { indicatorHref, isNationalResearch, isUnscopedResearch, regionalIndicator } from '../features/atlas/research';
import { LAYERS, MAP_COLORS, REGIONS, formatMetric } from '../features/atlas/data';
import { useMapValues, useRegionDetails } from '../features/atlas/useAtlasData';
import { ErrorMessage } from '../components/Loading';
import '../styles/atlas.css';
import '../styles/atlas-workspace.css';

const loadGeography = async signal => {
  const response = await fetch('/maps/us-states.json', {signal});
  if (!response.ok) throw new Error('The map could not be loaded.');
  const data = await response.json();
  return data.map(state=>({...state,code:REGIONS.find(region=>region.id===state.id)?.code})).filter(state=>state.code).sort((a,b)=>a.name.localeCompare(b.name));
};
const NO_REGIONS = [];

export default function Atlas({children}) {
  const context=useAtlasContext();
  const location=useLocation();
  const workspace=useRef(null);
  const researchQuery=new URLSearchParams(location.search).get('q');
  useLayoutEffect(()=>{ if(workspace.current)workspace.current.scrollTop=0; },[location.pathname,researchQuery]);
  const navigate = useNavigate();
  const [params,setParams] = useSearchParams();
  const geography = useFred(loadGeography);
  const regions = geography.data || NO_REGIONS;
  const layer = LAYERS.find(item=>item.id===context.layer) || LAYERS[0];
  const nationalResearch=Boolean(children)&&isNationalResearch(location.pathname);
  const referenceResearch=Boolean(children)&&isUnscopedResearch(location.pathname);
  const selected = nationalResearch||referenceResearch?undefined:regions.find(region=>region.code===context.region);
  const map = useMapValues(regions,layer,!children);
  const setSelection = code=>{
    const activeIndicator=regionalIndicator(/^\/series\/([^/]+)$/.exec(location.pathname)?.[1]);
    if(children&&code&&activeIndicator){navigate(indicatorHref(code,activeIndicator.layer,location.search));return;}
    const next=new URLSearchParams({layer:layer.id});
    if(code)next.set('state',code);
    navigate(`/?${next}`,{replace:!children});
  };
  const available=Object.values(map.values).filter(Boolean).length;
  return <div className="economic-atlas">
    <a className="atlas-skip" href={children?'#atlas-research-content':'#atlas-world'}>Skip to content</a>
    <Header/>
    <nav className="atlas-navigation" aria-label="Atlas navigation">{[['/','Map'],['/overview','National indicators'],['/search','Search'],['/categories','Topics'],['/sources','Sources'],['/releases','Releases']].map(([to,label])=><NavLink key={to} to={to} end={to==='/'} className={({isActive})=>(isActive||(to==='/releases'&&location.pathname.startsWith('/release/')))?'active':''}>{label}</NavLink>)}</nav>
    <main id="atlas-world" tabIndex={-1} className={`atlas-world ${selected?'has-region':''} ${children?'has-workspace':''}`}>
      <div className="atlas-world-heading"><span>THE UNITED STATES</span>{!children&&<h1>A new perspective<br/>on the economy.</h1>}{children&&<h2>{selected?.name||(referenceResearch?'Research explorer':'United States')}</h2>}<p>Explore a place. Follow the numbers.</p></div>
      {!children&&<div className="atlas-layer-toolbar"><span>MAP LAYER</span><div role="group" aria-label="Economic map layer">{LAYERS.map(item=><button key={item.id} aria-pressed={item.id===layer.id} className={item.id===layer.id?'active':''} onClick={()=>{const next=new URLSearchParams(params);next.set('layer',item.id);if(children&&context.region)next.set('region',context.region);setParams(next,{replace:true});}}>{item.label}</button>)}</div></div>}
      {geography.loading && <div className="atlas-loading" role="status"><Compass size={30}/><span>Unfolding the atlas…</span></div>}
      {geography.error && <div className="atlas-loading"><ErrorMessage message={geography.error} onRetry={geography.refetch}/></div>}
      {geography.data && <AtlasMap contextOnly={Boolean(children)} keyboardEnabled={!children} regions={regions} selected={selected?.code} layer={layer} values={children?{}:map.values} onSelect={setSelection} onReset={()=>setSelection('')}/>}
      <div className="atlas-region-picker"><MapPinned size={17}/><select aria-label="Choose a state or district" value={selected?.code||''} onChange={event=>setSelection(event.target.value)}><option value="">Choose a state or district</option>{regions.map(region=><option key={region.code} value={region.code}>{region.name}</option>)}</select></div>
      {!children && (selected ? <RegionPanel key={`${selected.code}:${layer.id}`} region={selected} layer={layer} onClose={()=>setSelection('')}/> : <aside className="atlas-welcome"><Compass size={28}/><span className="atlas-kicker">EVERY PLACE TELLS A STORY</span><h2>Discover the economy,<br/>state by state.</h2><p>Select a region to explore its jobs, income, housing, and growth.</p><button onClick={()=>setSelection('MA')}>Explore Massachusetts <ArrowRight size={16}/></button><Link to="/search">Or ask a question in plain English</Link></aside>)}
      {children&&geography.data&&<ResearchSidebar region={selected} reference={referenceResearch}/>}
      {children&&<section id="atlas-research-content" tabIndex={-1} className="atlas-workspace" ref={workspace} aria-label="Atlas research panel"><div className="atlas-workspace-bar"><Link to="/"><ArrowLeft size={16}/>Back to map</Link><span>{selected?`Research · ${selected.name}`:referenceResearch?'Data explorer · US reference indicators':'National data explorer'}</span><Link className="atlas-workspace-close" to="/" aria-label="Close research panel"><X size={18}/></Link></div>{children}</section>}
      {!children&&<div className="atlas-legend"><div className="atlas-legend-title"><strong>{layer.title}</strong></div><div className="atlas-color-key">{MAP_COLORS.map((color,index)=><div key={color}><span style={{background:color}}/><small>{layer.legend[index]}</small></div>)}</div><p>{layer.note}</p><p className="atlas-no-data-key">Uncolored regions: loading or unavailable</p><div className="atlas-map-status" role="status">{map.completed<regions.length?`Mapping regions · ${map.completed}/${regions.length}`:`${available} of ${regions.length} regions available`}<span>Latest available · dates vary by region</span></div></div>}
      <div className="atlas-map-hint"><MapPinned size={15}/><span>Choose a state to explore · Drag to pan</span></div>
      <footer className="atlas-attribution"><a href="https://github.com/topojson/us-atlas" target="_blank" rel="noopener noreferrer">Census-derived boundaries</a><span>Data: FRED</span><span>Alaska & Hawaii shown as insets</span></footer>
    </main>
  </div>;
}

function RegionPanel({region,layer,onClose}) {
  const [attempt,setAttempt]=useState(0);
  const data=useRegionDetails(region,layer,attempt);
  const chartPoints=useMemo(()=>data.points?.slice(-30)||[],[data.points]);
  return <aside className="atlas-region-panel" aria-label={`${region.name} economic indicators`}>
    <div className="atlas-panel-breadcrumb"><span>United States <span>/</span> <strong>{region.name}</strong></span><button onClick={onClose} aria-label="Close region details"><X size={19}/></button></div>
    <span className="atlas-kicker">{region.name.toUpperCase()}</span><h2>A closer look<br/>at the economy.</h2>
    <div className="atlas-indicator-card"><span className="atlas-indicator-title">{layer.title}</span>
      {data.loading?<div className="atlas-value-loading" role="status">Loading regional data…</div>:data.error?<ErrorMessage message={data.error} onRetry={()=>setAttempt(n=>n+1)}/>:<>
        <div className="atlas-metric">{data.latest?formatMetric(Number(data.latest.value),layer):'Unavailable'}</div>
        <p className="atlas-observation-date">{data.latest?`Observation · ${data.latest.date}`:'No recent observations available'}</p>
        <p className="atlas-measurement">{layer.units} · {layer.frequency}</p>
        <MiniTrend points={chartPoints} title={`${layer.title} in ${region.name}`}/>
        <Link className="atlas-open-chart" to={indicatorHref(region.code,layer)}>Open source chart <ExternalLink size={14}/></Link>
        {layer.id==='growth' && <p className="atlas-growth-note">Chart opens with annual GDP growth, matching this indicator.</p>}
      </>}
    </div>
    <Link className="atlas-explore-region" to={`/search?q=${encodeURIComponent(`${region.name} economic indicators`)}`}><span>More data for {region.name}</span><ArrowRight size={17}/></Link>
    <p className="atlas-panel-source">{data.series?`${data.series.seasonal_adjustment} · ${data.series.id}`:'Federal Reserve Economic Data'}</p>
  </aside>;
}

function MiniTrend({points,title}) {
  const valid=points.filter(point=>point.value!=='.'&&Number.isFinite(Number(point.value)));
  if(valid.length<2)return <p className="atlas-trend-empty">Not enough observations to draw a trend.</p>;
  const min=Math.min(...valid.map(point=>Number(point.value))), max=Math.max(...valid.map(point=>Number(point.value)));
  const start=Date.parse(points[0].date),end=Date.parse(points.at(-1).date);
  const x=point=>18+(Date.parse(point.date)-start)/(end-start||1)*284;
  const y=point=>110-(Number(point.value)-min)/(max-min||1)*80;
  let segments='',gap=true;
  points.forEach(point=>{if(point.value==='.'||!Number.isFinite(Number(point.value))){gap=true;return;}segments+=`${gap?'M':'L'}${x(point).toFixed(1)},${y(point).toFixed(1)} `;gap=false;});
  return <svg className="atlas-mini-trend" viewBox="0 0 320 150" role="img" aria-label={`${title}, ${valid[0].date} through ${valid.at(-1).date}. Values from ${min.toFixed(1)} to ${max.toFixed(1)}.`}>{[30,70,110].map(row=><line key={row} x1="18" x2="302" y1={row} y2={row} stroke="#e2e1d8"/>)}<path d={segments} fill="none" stroke="#356cf0" strokeWidth="2.4" strokeLinecap="round"/><text x="18" y="140">{valid[0].date.slice(0,4)}</text><text x="302" y="140" textAnchor="end">{valid.at(-1).date.slice(0,4)}</text><text x="302" y="18" textAnchor="end">Recent {points.length} observations</text></svg>;
}
