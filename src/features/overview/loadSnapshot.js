import {getSeriesObservations} from '../../api/fred';
import {snapshotData} from './snapshot';
const KEY='fred_snapshot_cache_v5';
const TTL=5*60*1000;
const pending=new Map();
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export function readSnapshot(id){
  try{const entry=JSON.parse(localStorage.getItem(KEY)||'{}')[id];return entry?.data?.value!=null?{...entry.data,stale:Date.now()-entry.updatedAt>=TTL}:null;}catch{return null;}
}
function remember(id,data){
  if(data.value==null)return;
  try{const entries=JSON.parse(localStorage.getItem(KEY)||'{}');entries[id]={data,updatedAt:Date.now()};localStorage.setItem(KEY,JSON.stringify(entries));}catch{/* Storage is optional. */}
}
// A transient error in one indicator must not erase the others or trigger a full reload.
export async function fetchSnapshot(id,{fetchObservations=getSeriesObservations,wait=sleep}={}){
  for(let attempt=0;attempt<3;attempt++){
    try{
      const observations=await fetchObservations(id,{limit:90,sort_order:'desc'});
      const data=snapshotData(id,null,observations);remember(id,data);return data;
    }catch(error){
      const transient=error.status==null||[429,500,502,503,504].includes(error.status);
      const delay=Math.max(error.retryAfterMs||0,1000*2**attempt);
      if(!transient||attempt===2||delay>60000)throw error;
      await wait(delay);
    }
  }
}
export function loadSnapshot(id){
  const cached=readSnapshot(id);
  if(cached&&!cached.stale)return Promise.resolve(cached);
  if(!pending.has(id))pending.set(id,fetchSnapshot(id).finally(()=>pending.delete(id)));
  return pending.get(id);
}
