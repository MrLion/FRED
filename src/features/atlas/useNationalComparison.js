import { useEffect, useState } from 'react';
import { getSeries, getSeriesObservations } from '../../api/fred';
import { US_SERIES } from './research';
const cache=new Map();
export function useNationalComparison(layerId,enabled,attempt) {
  const [state,setState]=useState({key:'',loading:true});
  useEffect(()=>{
    const controller=new AbortController();
    if(!enabled||!layerId)return ()=>controller.abort();
    const id=US_SERIES[layerId];
    async function load(){
      setState({key:layerId,loading:true});
      try {
        let data=cache.get(id);
        if(!data||Date.now()-data.time>30*60*1000||attempt){
          const [series,observations]=await Promise.all([getSeries(id,controller.signal),getSeriesObservations(id,{all:true,signal:controller.signal})]);
          if(!series)throw new Error('National series unavailable');
          data={series,observations,time:Date.now()};cache.set(id,data);
        }
        if(!controller.signal.aborted)setState({key:layerId,loading:false,...data});
      }catch {if(!controller.signal.aborted)setState({key:layerId,loading:false,error:'The US benchmark could not be loaded. Your regional chart is still available.'});}
    }
    load();return ()=>controller.abort();
  },[layerId,enabled,attempt]);
  if(!enabled)return {};
  return state.key===layerId?state:{loading:true};
}
