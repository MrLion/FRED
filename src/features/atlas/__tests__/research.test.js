import { describe, expect, it } from 'vitest';
import { LAYERS } from '../data';
import { chartObservations, compatibility, comparisonTakeaway, indicatorHref, isNationalResearch, isUnscopedResearch, latestCommonPoint, mergeChartData, regionalIndicator, US_SERIES } from '../research';
const unemployment=LAYERS[0],housing=LAYERS[2],growth=LAYERS[3];
const metadata={frequency:'Monthly',units:'Percent',seasonal_adjustment:'Seasonally Adjusted'};
describe('useful research navigation',()=>{
  it('links regional indicators to main charts while preserving analysis controls',()=>{
    const url=new URL(indicatorHref('CA',growth,'?range=5Y&compare=off&q=unrelated'),'https://atlas.invalid');
    expect(url.pathname).toBe('/series/CARGSP');
    expect(Object.fromEntries(url.searchParams)).toEqual({range:'5Y',compare:'off',transform:'yoy',layer:'growth',region:'CA'});
  });
  it('uses national indicators in national research, rather than a previous state',()=>{
    expect(isNationalResearch('/series/GDP')).toBe(true);
    expect(isNationalResearch('/overview')).toBe(true);
    expect(isNationalResearch('/series/MAUR')).toBe(false);
    expect(indicatorHref(null,LAYERS[1])).toContain(`/series/${US_SERIES.income}`);
    expect(regionalIndicator('MAUR').region).toBe('MA');
    expect(regionalIndicator('UNRATE')).toBeNull();
    expect(isUnscopedResearch('/series/GFDEGDQ188S')).toBe(true);
    expect(isUnscopedResearch('/series/GDP')).toBe(false);
    expect(isUnscopedResearch('/series/MAUR')).toBe(false);
  });
});
describe('like-for-like benchmarks',()=>{
  it('rejects mismatched frequency, seasonality and raw units',()=>{
    expect(compatibility(metadata,{...metadata,frequency:'Annual'},unemployment)).toContain('frequencies');
    expect(compatibility(metadata,{...metadata,seasonal_adjustment:'Not Seasonally Adjusted'},unemployment)).toContain('seasonal');
    expect(compatibility(metadata,{...metadata,units:'Index'},unemployment)).toContain('units');
    expect(compatibility(metadata,metadata,unemployment)).toBeNull();
  });
  it('compares GDP as annual growth instead of incompatible dollar levels',()=>{
    const state={frequency:'Annual',units:'Millions of Chained 2017 Dollars',seasonal_adjustment:'Not Seasonally Adjusted'};
    const us={...state,units:'Billions of Chained 2017 Dollars'};
    expect(compatibility(state,us,growth)).toContain('units');
    expect(compatibility(state,us,growth,'yoy')).toBeNull();
    expect(Number(chartObservations([{date:'2024-01-01',value:'100'},{date:'2025-01-01',value:'104'}],growth,'yoy')[0].value)).toBeCloseTo(4);
  });
  it('uses only a shared observation date, never independently latest values',()=>{
    const regional=[{date:'2024-01-01',value:'4'},{date:'2025-01-01',value:'5'}];
    expect(latestCommonPoint(regional,[{date:'2024-01-01',value:'3'}])).toEqual({date:'2024-01-01',regional:4,national:3});
    expect(latestCommonPoint(regional,[{date:'2025-01-01',value:'.'}])).toBeNull();
    expect(latestCommonPoint(regional,[{date:'2023-01-01',value:'3'}])).toBeNull();
  });
  it('does not connect missing dates or insert out-of-window benchmark observations',()=>{
    const data=mergeChartData([{date:'2025-01-01',value:'4'},{date:'2025-03-01',value:'.'}],[{date:'2024-01-01',value:'1'},{date:'2025-02-01',value:'5'},{date:'2025-03-01',value:'6'}]);
    expect(data).toHaveLength(3);
    expect(data[1]).toMatchObject({value:null,benchmark:5});
    expect(data[2]).toMatchObject({value:null,benchmark:6});
  });
  it('distinguishes percentage-point gaps from percentage changes',()=>{
    const result=comparisonTakeaway({date:'2025-01-01',regional:4.2,national:4.1},unemployment,'MA');
    expect(result.text).toBe('MA was 0.1 percentage points above the United States.');
    expect(result.date).toBe('2025-01-01');
  });
  it('describes housing as index points and income as dollars per person',()=>{
    const point={date:'2025-01-01',regional:600,national:500};
    expect(comparisonTakeaway(point,housing,'MA').text).toContain('100.0 index points');
    expect(comparisonTakeaway(point,housing,'MA').note).toContain('not dollar home prices');
    expect(comparisonTakeaway(point,LAYERS[1],'MA').text).toContain('$100 per person');
  });
});
