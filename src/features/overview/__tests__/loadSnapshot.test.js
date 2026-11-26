import {describe,it,expect,vi,beforeEach,afterEach} from 'vitest';
import {fetchSnapshot,loadSnapshot,readSnapshot} from '../loadSnapshot';
import {getSeriesObservations} from '../../../api/fred';
vi.mock('../../../api/fred',()=>({getSeriesObservations:vi.fn()}));
const observations=[{date:'2026-10-01',value:'3.88'},{date:'2026-09-01',value:'3.75'}];
beforeEach(()=>{const values=new Map();vi.stubGlobal('localStorage',{getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)});vi.clearAllMocks();});
afterEach(()=>vi.unstubAllGlobals());
describe('snapshot recovery',()=>{
 it('recovers a temporary provider error without a page reload',async()=>{
  const fetchObservations=vi.fn().mockRejectedValueOnce(Object.assign(new Error('temporary'),{status:502})).mockResolvedValue(observations),wait=vi.fn().mockResolvedValue();
  const result=await fetchSnapshot('FEDFUNDS',{fetchObservations,wait});
  expect(result.value).toBe(3.88);expect(result.name).toBe('Effective federal funds rate');expect(fetchObservations).toHaveBeenCalledTimes(2);expect(wait).toHaveBeenCalledWith(1000);
 });
 it('honors a server-provided Retry-After delay',async()=>{
  const fetchObservations=vi.fn().mockRejectedValueOnce(Object.assign(new Error('limited'),{status:429,retryAfterMs:5000})).mockResolvedValue(observations),wait=vi.fn().mockResolvedValue();
  await fetchSnapshot('FEDFUNDS',{fetchObservations,wait});expect(wait).toHaveBeenCalledWith(5000);
 });
 it('does not spin on an exhausted daily budget',async()=>{
  const fetchObservations=vi.fn().mockRejectedValue(Object.assign(new Error('limited'),{status:429,retryAfterMs:86400000})),wait=vi.fn();
  await expect(fetchSnapshot('FEDFUNDS',{fetchObservations,wait})).rejects.toThrow();expect(wait).not.toHaveBeenCalled();expect(fetchObservations).toHaveBeenCalledTimes(1);
 });
 it('stops after three transient failures',async()=>{
  const fetchObservations=vi.fn().mockRejectedValue(Object.assign(new Error('offline'),{status:503})),wait=vi.fn().mockResolvedValue();
  await expect(fetchSnapshot('FEDFUNDS',{fetchObservations,wait})).rejects.toThrow();expect(fetchObservations).toHaveBeenCalledTimes(3);expect(wait).toHaveBeenCalledTimes(2);
 });
 it('does not retry permanent validation failures',async()=>{
  const fetchObservations=vi.fn().mockRejectedValue(Object.assign(new Error('bad request'),{status:400})),wait=vi.fn();
  await expect(fetchSnapshot('FEDFUNDS',{fetchObservations,wait})).rejects.toThrow();expect(fetchObservations).toHaveBeenCalledTimes(1);expect(wait).not.toHaveBeenCalled();
 });
 it('caches each successful indicator even when another fails',async()=>{
  await fetchSnapshot('UNRATE',{fetchObservations:vi.fn().mockResolvedValue(observations)});
  await expect(fetchSnapshot('FEDFUNDS',{fetchObservations:vi.fn().mockRejectedValue(Object.assign(new Error('bad request'),{status:400}))})).rejects.toThrow();
  expect(readSnapshot('UNRATE').value).toBe(3.88);expect(readSnapshot('FEDFUNDS')).toBeNull();
 });
 it('shares in-flight requests across mounts and reuses cached observations',async()=>{
  let finish;getSeriesObservations.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
  const first=loadSnapshot('FEDFUNDS'),second=loadSnapshot('FEDFUNDS');finish(observations);
  await Promise.all([first,second]);await loadSnapshot('FEDFUNDS');expect(getSeriesObservations).toHaveBeenCalledTimes(1);
 });
});
