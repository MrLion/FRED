import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowUpRight, Compass, RefreshCw } from 'lucide-react';
import { AtlasLink } from './AtlasNavigation';
import { getSeriesObservations } from '../../api/fred';
import { LAYERS, formatMetric, latestPoint } from './data';
import { indicatorHref, regionalIndicator, US_SERIES } from './research';
const cache=new Map();

export default function ResearchSidebar({region,reference=false}) {
  const {pathname,search}=useLocation();
  const code=region?.code||null,name=region?.name||'United States';
  const [attempt,setAttempt]=useState(0);
  const key=code||'US';
  const [state,setState]=useState({key:'',values:{}});
  const activeId=/^\/series\/([^/]+)$/.exec(pathname)?.[1];
  useEffect(()=>{
    const controller=new AbortController();
    const values={};
    async function load(){
      setState({key,values:{}});
      // Only fetch these four indicators; expanded view no longer loads a nationwide color layer.
      for(const layer of LAYERS){
        if(controller.signal.aborted)return;
        const id=code?`${code}${layer.suffix}`:US_SERIES[layer.id];
        const saved=cache.get(id);
        try {
          const point=saved&&Date.now()-saved.time<30*60*1000&&!attempt?saved.point:latestPoint(await getSeriesObservations(id,{limit:5,sort_order:'desc',signal:controller.signal}),layer);
          cache.set(id,{point,time:Date.now()});values[layer.id]={point};
        }catch {if(controller.signal.aborted)return;values[layer.id]={error:true};}
        if(!controller.signal.aborted)setState({key,values:{...values}});
      }
    }
    load();return ()=>controller.abort();
  },[code,key,attempt]);
  const values=state.key===key?state.values:{};
  return <aside className="research-indicators" aria-label={`${name} research indicators`}><div className="research-indicator-heading"><div><span>RESEARCH INDICATORS</span><h3>{reference?'US reference indicators':name}</h3></div><button aria-label="Refresh research indicators" onClick={()=>setAttempt(n=>n+1)}><RefreshCw size={14}/></button></div>
    <p className="research-sidebar-help">Choose an indicator to update the main chart.</p>
    <div className="research-indicator-list">{LAYERS.map(layer=>{
      const data=values[layer.id],point=data?.point;
      const active=code?regionalIndicator(activeId)?.layer.id===layer.id&&regionalIndicator(activeId)?.region===code:activeId===US_SERIES[layer.id];
      return <AtlasLink key={layer.id} to={indicatorHref(code,layer,search)} className={`research-indicator ${active?'active':''}`} aria-current={active?'page':undefined}><span className="research-indicator-name">{layer.title}<ArrowUpRight size={13}/></span><strong>{point?formatMetric(Number(point.value),layer):data?'Unavailable':'…'}</strong><small>{point?point.date:data?.error?'Could not load · refresh to retry':data?'No observations':'Loading latest value'}</small></AtlasLink>;
    })}</div><div className="research-sidebar-tip"><Compass size={14}/><span>{code?'Use the US comparison in the chart to put this region in perspective.':reference?'US reference series are available here. No state is inferred for the open chart.':'National indicators show the United States, without an unrelated state selection.'}</span></div>
  </aside>;
}
