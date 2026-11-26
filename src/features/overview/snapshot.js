export const SNAPSHOT = {
  GDP: {name:'Nominal GDP',units:'Billions of current dollars · annualized level',frequency:'Quarterly',note:'Change in nominal output, not real GDP growth.'},
  UNRATE: {name:'Unemployment rate',units:'Percent of the labor force',frequency:'Monthly',note:'Changes shown in percentage points.'},
  CPIAUCSL: {name:'Consumer price index (CPI)',units:'Index · 1982–1984 = 100',frequency:'Monthly',note:'Monthly index change, not annual inflation.'},
  FEDFUNDS: {name:'Effective federal funds rate',units:'Percent · monthly average',frequency:'Monthly',note:'Changes shown in percentage points.'},
};
export function observationLabel(date,id) {
  if(!date)return '';
  if(id==='GDP')return `Q${Math.floor((Number(date.slice(5,7))-1)/3)+1} ${date.slice(0,4)}`;
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US',{month:'short',year:'numeric',timeZone:'UTC'});
}
export function snapshotValue(value,id) {
  return `${Number(value).toLocaleString('en-US',{maximumFractionDigits:id==='GDP'?1:id==='CPIAUCSL'?2:2})}${['UNRATE','FEDFUNDS'].includes(id)?'%':''}`;
}
export function snapshotData(id,info,observations) {
  const valid=[...observations].filter(p=>p.value!=='.'&&p.value!==''&&Number.isFinite(Number(p.value))).sort((a,b)=>b.date.localeCompare(a.date));
  const current=valid[0],prior=valid[1];
  const monthlyIndex=d=>Number(d.slice(0,4))*12+Number(d.slice(5,7));
  const contiguous=current&&prior&&monthlyIndex(current.date)-monthlyIndex(prior.date)===(id==='GDP'?3:1);
  const rate=['UNRATE','FEDFUNDS'].includes(id);
  const delta=contiguous&&(rate||Number(prior.value)!==0)?rate?Number(current.value)-Number(prior.value):(Number(current.value)/Number(prior.value)-1)*100:null;
  return {id,name:SNAPSHOT[id].name,units:SNAPSHOT[id].units,frequency:SNAPSHOT[id].frequency,seasonalAdjustment:info?.seasonal_adjustment,points:[...observations].sort((a,b)=>a.date.localeCompare(b.date)),value:current?Number(current.value):null,date:current?.date,priorDate:delta!=null?prior.date:null,delta,loading:false};
}
export function snapshotChange(delta,id) {
  const rounded=Number(delta.toFixed(2));
  return `${rounded>0?'+':''}${rounded.toLocaleString('en-US',{maximumFractionDigits:2})}${['UNRATE','FEDFUNDS'].includes(id)?' percentage points':'%'}`;
}
