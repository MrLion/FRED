import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {enforceRateLimit,clearLocalRateLimits} from '../rate-limit.js';
const req=ip=>({socket:{remoteAddress:ip},headers:{}});
const res=()=>({status:vi.fn(function(code){this.code=code;return this;}),json:vi.fn(),setHeader:vi.fn()});
beforeEach(()=>{clearLocalRateLimits();vi.stubEnv('RATE_LIMIT_REDIS_REST_URL','');vi.stubEnv('RATE_LIMIT_REDIS_REST_TOKEN','');vi.stubEnv('REQUIRE_SHARED_RATE_LIMIT','false');vi.stubEnv('VERCEL','');});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();vi.useRealTimers();});
describe('provider request budgets',()=>{
 it('rejects the seventh AI request from a client and sends a retry delay',async()=>{
  for(let i=0;i<6;i++)expect(await enforceRateLimit(req('a'),res(),'ai')).toBe(true);
  const response=res();expect(await enforceRateLimit(req('a'),response,'ai')).toBe(false);
  expect(response.code).toBe(429);expect(response.setHeader).toHaveBeenCalledWith('Retry-After',expect.any(String));
 });
 it('enforces a global budget across different clients',async()=>{
  vi.stubEnv('AI_GLOBAL_PER_MINUTE','2');
  expect(await enforceRateLimit(req('a'),res(),'ai')).toBe(true);expect(await enforceRateLimit(req('b'),res(),'ai')).toBe(true);
  expect(await enforceRateLimit(req('c'),res(),'ai')).toBe(false);
 });
 it('enforces a daily cap independently of the minute cap',async()=>{
  vi.stubEnv('AI_GLOBAL_PER_DAY','1');expect(await enforceRateLimit(req('a'),res(),'ai')).toBe(true);
  const response=res();expect(await enforceRateLimit(req('b'),response,'ai')).toBe(false);
  expect(response.setHeader).toHaveBeenCalledWith('Retry-After','86400');
 });
 it('expires short windows while retaining the daily count',async()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-01-01'));
  vi.stubEnv('AI_CLIENT_PER_MINUTE','1');expect(await enforceRateLimit(req('a'),res(),'ai')).toBe(true);
  vi.advanceTimersByTime(60001);expect(await enforceRateLimit(req('a'),res(),'ai')).toBe(true);
 });
 it('ignores spoofable forwarded headers outside Vercel',async()=>{
  vi.stubEnv('AI_CLIENT_PER_MINUTE','1');
  const first={...req('same'),headers:{'x-forwarded-for':'a'}},second={...req('same'),headers:{'x-forwarded-for':'b'}};
  expect(await enforceRateLimit(first,res(),'ai')).toBe(true);expect(await enforceRateLimit(second,res(),'ai')).toBe(false);
 });
 it('uses Vercel client identity rather than the shared proxy socket',async()=>{
  vi.stubEnv('VERCEL','1');vi.stubEnv('AI_CLIENT_PER_MINUTE','1');
  expect(await enforceRateLimit({...req('proxy'),headers:{'x-forwarded-for':'a'}},res(),'ai')).toBe(true);
  expect(await enforceRateLimit({...req('proxy'),headers:{'x-forwarded-for':'b'}},res(),'ai')).toBe(true);
 });
 it('uses one atomic Redis operation without storing raw client IPs',async()=>{
  vi.stubEnv('RATE_LIMIT_REDIS_REST_URL','https://redis.example');vi.stubEnv('RATE_LIMIT_REDIS_REST_TOKEN','token');
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({result:[1,0]})}));
  expect(await enforceRateLimit(req('192.0.2.1'),res(),'ai')).toBe(true);
  const command=JSON.parse(fetch.mock.calls[0][1].body);expect(command[0]).toBe('EVAL');expect(command[2]).toBe('3');
  expect(command.slice(3,6).join('')).not.toContain('192.0.2.1');expect(fetch).toHaveBeenCalledTimes(1);
 });
 it('fails closed if shared protection is required but missing',async()=>{
  vi.stubEnv('REQUIRE_SHARED_RATE_LIMIT','true');const response=res();
  expect(await enforceRateLimit(req('a'),response,'ai')).toBe(false);expect(response.code).toBe(503);
 });
 it('never falls back to local counters on a configured Redis failure',async()=>{
  vi.stubEnv('RATE_LIMIT_REDIS_REST_URL','https://redis.example');vi.stubEnv('RATE_LIMIT_REDIS_REST_TOKEN','token');
  vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('offline')));const response=res();
  expect(await enforceRateLimit(req('a'),response,'fred')).toBe(false);expect(response.code).toBe(503);
 });
});
