export const ENDPOINT_PARAMS = {
  category:['category_id'],
  'category/children':['category_id'],
  'category/series':['category_id','limit','offset','order_by','sort_order'],
  sources:['limit','offset','order_by','sort_order'],
  'source/releases':['source_id','limit','offset','order_by','sort_order'],
  releases:['limit','offset','order_by','sort_order'],
  release:['release_id'],
  'release/series':['release_id','limit','offset','order_by','sort_order'],
  series:['series_id'],
  'series/observations':['series_id','limit','offset','observation_start','observation_end','frequency','units','sort_order'],
  'series/search':['search_text','limit','offset','order_by','sort_order'],
};
export function validateFredQuery(query) {
  const {endpoint,...params}=query||{};
  if(!endpoint)return 'endpoint parameter required';
  if(typeof endpoint!=='string'||!Object.hasOwn(ENDPOINT_PARAMS,endpoint))return 'Invalid endpoint';
  const allowed=new Set(ENDPOINT_PARAMS[endpoint]);
  for(const [key,value] of Object.entries(params)){
    if(!allowed.has(key)||typeof value!=='string'||value.length>1000)return 'Invalid query parameter';
    if(['limit','offset','category_id','source_id','release_id'].includes(key)&&!/^\d+$/.test(value))return 'Invalid query parameter';
    if(key==='limit'&&(Number(value)<1||Number(value)>10000))return 'Invalid limit';
    if(key==='offset'&&Number(value)>1000000)return 'Invalid offset';
  }
  return null;
}
