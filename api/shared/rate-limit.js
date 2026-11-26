import { createHash } from 'node:crypto';

const memory = new Map();
const MAX_KEYS = 10000;
const POLICIES = {
  fred: { client: 90, global: 100, day: 20000 },
  ai: { client: 6, global: 20, day: 500 },
};
// All counters are checked and consumed in one operation across function instances.
const SCRIPT = `
for i,key in ipairs(KEYS) do
  local n = tonumber(redis.call('GET',key) or '0')
  if n >= tonumber(ARGV[i*2-1]) then return {0,math.max(redis.call('TTL',key),1)} end
end
for i,key in ipairs(KEYS) do
  local n = redis.call('INCR',key)
  if n == 1 then redis.call('EXPIRE',key,tonumber(ARGV[i*2])) end
end
return {1,0}`;

function positive(value, fallback) {
  return /^\d+$/.test(value || '') && Number(value) > 0 && Number.isSafeInteger(Number(value)) ? Number(value) : fallback;
}
function rules(req, group) {
  const policy=POLICIES[group];
  // Vercel overwrites this header. Other hosts use the socket, not client-supplied headers.
  const forwarded=process.env.VERCEL==='1'?req.headers?.['x-forwarded-for']:null;
  const ip=(typeof forwarded==='string'?forwarded.split(',')[0].trim():req.socket?.remoteAddress)||'unknown';
  const identity=createHash('sha256').update(ip).digest('hex').slice(0,32);
  const prefix=`fred-app:${group}`;
  return [
    {key:`${prefix}:client:${identity}`,limit:positive(process.env[`${group.toUpperCase()}_CLIENT_PER_MINUTE`],policy.client),seconds:60},
    {key:`${prefix}:global`,limit:positive(process.env[`${group.toUpperCase()}_GLOBAL_PER_MINUTE`],policy.global),seconds:60},
    {key:`${prefix}:day`,limit:positive(process.env[`${group.toUpperCase()}_GLOBAL_PER_DAY`],policy.day),seconds:86400},
  ];
}
function localLimit(entries,now) {
  for(const [key,value] of memory)if(value.until<=now)memory.delete(key);
  for(const entry of entries){
    const value=memory.get(entry.key);
    if(value&&value.count>=entry.limit)return [0,Math.max(1,Math.ceil((value.until-now)/1000))];
  }
  const newKeys=entries.filter(e=>!memory.has(e.key)).length;
  if(memory.size+newKeys>MAX_KEYS)return [0,60];
  entries.forEach(e=>{const value=memory.get(e.key)||{count:0,until:now+e.seconds*1000};value.count++;memory.set(e.key,value);});
  return [1,0];
}
export function clearLocalRateLimits(){memory.clear();}
export async function enforceRateLimit(req,res,group) {
  const entries=rules(req,group);
  const url=process.env.RATE_LIMIT_REDIS_REST_URL,token=process.env.RATE_LIMIT_REDIS_REST_TOKEN;
  let result;
  try{
    if(url&&token){
      if(new URL(url).protocol!=='https:')throw new Error('HTTPS required');
      const response=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(['EVAL',SCRIPT,String(entries.length),...entries.map(e=>e.key),...entries.flatMap(e=>[String(e.limit),String(e.seconds)])]),signal:AbortSignal.timeout(3000)});
      if(!response.ok)throw new Error('Limiter unavailable');
      const data=await response.json();
      if(data.error||!Array.isArray(data.result)||![0,1].includes(data.result[0])||!Number.isFinite(data.result[1]))throw new Error('Invalid limiter response');
      result=data.result;
    }else{
      if(url||token||process.env.REQUIRE_SHARED_RATE_LIMIT==='true')throw new Error('Shared limiter not configured');
      result=localLimit(entries,Date.now());
    }
  }catch{
    res.setHeader?.('Retry-After','60');res.setHeader?.('Cache-Control','no-store');
    res.status(503).json({error:'Request protection is temporarily unavailable. Please try again later.'});return false;
  }
  if(result[0]===1)return true;
  res.setHeader?.('Retry-After',String(Math.max(1,Math.ceil(result[1]))));res.setHeader?.('Cache-Control','no-store');
  res.status(429).json({error:'Too many requests. Please try again later.'});return false;
}
