import { describe, expect, it } from 'vitest';
import { atlasHref, resolveAtlasContext } from '../navigation';
const context={region:'MA',layer:'income'};
describe('atlas-wide navigation context',()=>{
  it('carries map selection into charts, search, browsing and settings',()=>{
    for(const destination of ['/search?q=inflation','/categories/9','/sources?q=Bureau','/release/10','/settings','/overview']) {
      const url=new URL(atlasHref(destination,context),'https://atlas.invalid');
      expect(url.searchParams.get('region')).toBe('MA');
      expect(url.searchParams.get('layer')).toBe('income');
    }
  });
  it('returns to the same map state and economic layer',()=>{
    expect(atlasHref('/',context)).toBe('/?state=MA&layer=income');
  });
  it('does not discard dates, range, query or hash when adding map context',()=>{
    const url=new URL(atlasHref('/series/MAPCPI?start=2020-01-01&range=5Y#notes',context),'https://atlas.invalid');
    expect(url.searchParams.get('start')).toBe('2020-01-01');
    expect(url.searchParams.get('range')).toBe('5Y');
    expect(url.hash).toBe('#notes');
  });
  it('infers context for regional charts opened directly or selected from search',()=>{
    expect(resolveAtlasContext('/series/CAUR','',context)).toEqual({region:'CA',layer:'unemployment'});
    expect(atlasHref('/series/CAUR',context)).toBe('/series/CAUR?region=CA&layer=unemployment');
  });
  it('does not mistake national series for a state and retains map context while viewing them',()=>{
    expect(resolveAtlasContext('/series/GDP','',context)).toEqual(context);
    expect(resolveAtlasContext('/series/GDP','')).toEqual({region:null,layer:'unemployment'});
  });
  it('allows closing a selected region and rejects invalid region/layer values',()=>{
    expect(resolveAtlasContext('/','?layer=growth',context)).toEqual({region:null,layer:'growth'});
    expect(resolveAtlasContext('/','?state=ZZ&layer=bogus')).toEqual({region:null,layer:'unemployment'});
  });
  it('leaves external destinations intact and respects explicit map selection',()=>{
    expect(atlasHref('https://fred.stlouisfed.org/series/GDP',context)).toBe('https://fred.stlouisfed.org/series/GDP');
    expect(atlasHref('/?state=NY&layer=housing',context)).toBe('/?state=NY&layer=housing');
  });
});
