import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { LAYERS, REGIONS, formatMetric, latestPoint, mapColor, observationsForLayer, seriesId } from '../data';
const growth=LAYERS.find(layer=>layer.id==='growth');

describe('regional indicator mapping',()=>{
  it('includes exactly 50 states and the District of Columbia with unique Census IDs',()=>{
    expect(REGIONS).toHaveLength(51);
    expect(new Set(REGIONS.map(region=>region.id)).size).toBe(51);
    expect(REGIONS.find(region=>region.id==='11').code).toBe('DC');
  });
  it('uses distinct FRED series for each economic layer',()=>{
    expect(LAYERS.map(layer=>seriesId('MA',layer))).toEqual(['MAUR','MAPCPI','MASTHPI','MARGSP']);
  });
  it('preserves index and currency units instead of calling every measure a percentage',()=>{
    expect(formatMetric(50000,LAYERS[1])).toBe('$50,000');
    expect(formatMetric(450,LAYERS[2])).toBe('450');
    expect(formatMetric(4.2,LAYERS[0])).toBe('4.2%');
  });
  it('does not assign a thematic color to unavailable data',()=>{
    expect(mapColor(NaN,LAYERS[0])).toBeNull();
    expect(mapColor(undefined,LAYERS[0])).toBeNull();
    expect(mapColor(0,LAYERS[0])).not.toBeNull();
  });
});

describe('GDP growth calculations',()=>{
  it('sorts descending API observations before calculating annual growth',()=>{
    const points=observationsForLayer([{date:'2025-01-01',value:'110'},{date:'2024-01-01',value:'100'}],growth);
    expect(Number(points[0].value)).toBeCloseTo(10);
    expect(points[0].date).toBe('2025-01-01');
  });
  it('does not calculate annual growth across missing years or missing values',()=>{
    expect(observationsForLayer([{date:'2022-01-01',value:'100'},{date:'2024-01-01',value:'110'}],growth)[0].value).toBe('.');
    expect(observationsForLayer([{date:'2023-01-01',value:'.'},{date:'2024-01-01',value:'110'}],growth)[0].value).toBe('.');
    expect(observationsForLayer([{date:'2023-01-01',value:'0'},{date:'2024-01-01',value:'110'}],growth)[0].value).toBe('.');
  });
  it('chooses the latest valid observation without converting missing data to zero',()=>{
    expect(latestPoint([{date:'2025-02-01',value:'.'},{date:'2025-01-01',value:'4'}],LAYERS[0])).toEqual({date:'2025-01-01',value:'4'});
  });
});

it('ships real projected outlines for every supported region including Alaska and Hawaii',()=>{
  const shapes=JSON.parse(readFileSync(new URL('../../../../public/maps/us-states.json',import.meta.url),'utf8'));
  expect(shapes).toHaveLength(51);
  expect(shapes.map(shape=>shape.id).sort()).toEqual(REGIONS.map(region=>region.id).sort());
  expect(shapes.every(shape=>shape.path.startsWith('M')&&shape.center.every(Number.isFinite))).toBe(true);
});
