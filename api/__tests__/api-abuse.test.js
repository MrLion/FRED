import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import fred from '../fred-proxy.js';
import analyze from '../analyze.js';
import search from '../nl-search.js';
import {clearLocalRateLimits} from '../shared/rate-limit.js';
import {ENDPOINT_PARAMS,validateFredQuery} from '../shared/fred-policy.js';
const res=()=>({status:vi.fn(function(code){this.code=code;return this;}),json:vi.fn(),setHeader:vi.fn(),end:vi.fn()});
beforeEach(()=>{clearLocalRateLimits();vi.stubEnv('FRED_API_KEY','private-key');vi.stubEnv('OLLAMA_BASE_URL','https://ollama.example');vi.stubEnv('OLLAMA_MODEL','test');vi.stubEnv('RATE_LIMIT_REDIS_REST_URL','');vi.stubEnv('RATE_LIMIT_REDIS_REST_TOKEN','');vi.stubEnv('REQUIRE_SHARED_RATE_LIMIT','false');vi.stubGlobal('fetch',vi.fn());});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
describe('FRED allowlist',()=>{
 it.each(['series/updates','series?api_key=bad','series#fragment','../series','%2e%2e/series',['series','sources'],{},'toString'])('rejects unsupported or malformed endpoint %j before any provider call',async endpoint=>{
  const response=res();await fred({method:'GET',query:{endpoint}},response);expect(response.code).toBe(400);expect(fetch).not.toHaveBeenCalled();
 });
 it.each([{api_key:'attacker'},{file_type:'xml'},{series_id:['GDP','UNRATE']},{other:'x'}])('rejects query injection %j',async patch=>{
  const response=res();await fred({method:'GET',query:{endpoint:'series',...patch}},response);expect(response.code).toBe(400);expect(fetch).not.toHaveBeenCalled();
 });
 it('allows all eleven app endpoints',()=>{
  expect(Object.keys(ENDPOINT_PARAMS)).toHaveLength(11);
  for(const endpoint of Object.keys(ENDPOINT_PARAMS))expect(validateFredQuery({endpoint})).toBeNull();
 });
 it.each(['0','10001','-1','1e8'])('rejects an invalid page size %s',limit=>expect(validateFredQuery({endpoint:'series/observations',limit})).not.toBeNull());
 it('does not call FRED after the budget is exhausted',async()=>{
  vi.stubEnv('FRED_CLIENT_PER_MINUTE','1');fetch.mockResolvedValue({status:200,text:async()=>'{}'});
  await fred({method:'GET',query:{endpoint:'series',series_id:'GDP'}},res());const response=res();
  await fred({method:'GET',query:{endpoint:'series',series_id:'GDP'}},response);expect(response.code).toBe(429);expect(fetch).toHaveBeenCalledTimes(1);
 });
});
describe('AI budget and payload limits',()=>{
 it.each([{}, {dataSummary:123},{dataSummary:'x'.repeat(12001)},{dataSummary:'ok',seriesTitle:'x'.repeat(501)}])('rejects invalid analysis payload before contacting Ollama',async body=>{
  const response=res();await analyze({method:'POST',body},response);expect(response.code).toBe(400);expect(fetch).not.toHaveBeenCalled();
 });
 it('rejects excessive UTF-8 bytes even if the character count is within the field limit',async()=>{
  const response=res();await analyze({method:'POST',body:{dataSummary:'狮'.repeat(11000)}},response);
  expect(response.code).toBe(413);expect(fetch).not.toHaveBeenCalled();
 });
 it('shares the budget between search and analysis',async()=>{
  vi.stubEnv('AI_CLIENT_PER_MINUTE','1');fetch.mockResolvedValue({ok:true,json:async()=>({message:{content:'{"searchTerms":["GDP"],"explanation":"Growth"}'}})});
  await search({method:'POST',body:{query:'GDP'}},res());const response=res();
  await analyze({method:'POST',body:{dataSummary:'A short summary'}},response);expect(response.code).toBe(429);expect(fetch).toHaveBeenCalledTimes(1);
 });
 it('bounds generation and times out upstream calls',async()=>{
  fetch.mockResolvedValue({ok:true,json:async()=>({message:{content:'Explanation'}})});
  const response=res();await analyze({method:'POST',body:{dataSummary:'A summary'}},response);
  expect(response.code).toBe(200);expect(JSON.parse(fetch.mock.calls[0][1].body).options.num_predict).toBe(800);expect(fetch.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
 });
});
