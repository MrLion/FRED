import { LAYERS, REGIONS, observationsForLayer } from './data';

export const US_SERIES = {unemployment:'UNRATE',income:'A792RC0A052NBEA',housing:'USSTHPI',growth:'GDPCA'};
const NATIONAL_IDS = new Set([...Object.values(US_SERIES),'GDP','GDPC1','CPIAUCSL','CPILFESL','SP500','FEDFUNDS','PAYEMS','PCEPI','PCEPILFE']);
export function regionalIndicator(id) {
  for(const region of REGIONS)for(const layer of LAYERS)if(id===`${region.code}${layer.suffix}`)return {region:region.code,layer};
  return null;
}
export function isNationalResearch(pathname) {
  const id=/^\/series\/([^/]+)$/.exec(pathname)?.[1];
  return pathname==='/overview'||NATIONAL_IDS.has(id);
}
export function isUnscopedResearch(pathname) {
  const id=/^\/series\/([^/]+)$/.exec(pathname)?.[1];
  return Boolean(id)&&!regionalIndicator(id)&&!NATIONAL_IDS.has(id);
}
export function indicatorHref(code,layer,currentSearch='') {
  const current=new URLSearchParams(currentSearch),params=new URLSearchParams();
  for(const key of ['range','start','compare'])if(current.has(key))params.set(key,current.get(key));
  if(layer.id==='growth')params.set('transform','yoy');
  params.set('layer',layer.id);
  if(code)params.set('region',code);
  const id=code?`${code}${layer.suffix}`:US_SERIES[layer.id];
  return `/series/${id}?${params}`;
}
export function chartObservations(points,layer,transform) {
  return layer?.id==='growth'&&transform==='yoy'?observationsForLayer(points,layer):points;
}
export function compatibility(primary,benchmark,layer,transform) {
  if(primary.frequency!==benchmark.frequency)return 'The series use different observation frequencies.';
  if(primary.seasonal_adjustment!==benchmark.seasonal_adjustment)return 'The series use different seasonal adjustments.';
  if(layer.id==='growth'&&transform==='yoy') {
    if(primary.frequency!=='Annual')return 'Annual observations are required to compare GDP growth.';
  } else if(primary.units!==benchmark.units)return 'The series use different units.';
  return null;
}
export function latestCommonPoint(primary,benchmark) {
  const available=new Map(benchmark.filter(point=>point.value!=='.'&&Number.isFinite(Number(point.value))).map(point=>[point.date,Number(point.value)]));
  const common=primary.filter(point=>point.value!=='.'&&Number.isFinite(Number(point.value))&&available.has(point.date)).sort((a,b)=>a.date.localeCompare(b.date)).at(-1);
  return common?{date:common.date,regional:Number(common.value),national:available.get(common.date)}:null;
}
export function comparisonTakeaway(point,layer,region) {
  if(!point)return null;
  const gap=point.regional-point.national;
  const direction=gap>0?'above':'below';
  const magnitude=Math.abs(gap);
  let difference;
  if(layer.id==='income')difference=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(magnitude)+' per person';
  else if(layer.id==='housing')difference=`${magnitude.toFixed(1)} index points`;
  else difference=`${magnitude.toFixed(1)} percentage points`;
  const text=magnitude<0.00001?`${region} matched the United States.`:`${region} was ${difference} ${direction} the United States.`;
  return {text,date:point.date,note:layer.id==='housing'?'This compares index levels from the same base period, not dollar home prices.':'Both values refer to the same observation period.'};
}
export function mergeChartData(primary,benchmark=[]) {
  const rows=new Map(primary.map(point=>[point.date,{time:Date.parse(point.date),value:point.value==='.'?null:Number(point.value)}]));
  const dates=primary.map(point=>point.date).sort();
  for(const point of benchmark) {
    if(point.date<dates[0]||point.date>dates.at(-1))continue;
    const row=rows.get(point.date)||{time:Date.parse(point.date),value:null};
    row.benchmark=point.value==='.'?null:Number(point.value);rows.set(point.date,row);
  }
  return [...rows.values()].sort((a,b)=>a.time-b.time);
}
