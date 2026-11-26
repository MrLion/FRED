import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import AtlasMap from '../AtlasMap';
import { LAYERS } from '../data';
const regions=[{id:'25',code:'MA',name:'Massachusetts',path:'M0,0L10,0L10,10Z',center:[5,5]}];
describe('map data accessibility',()=>{
  it('exposes the selected region, value and observation date to keyboard and screen-reader users',()=>{
    const html=renderToStaticMarkup(<AtlasMap regions={regions} selected="MA" layer={LAYERS[0]} values={{MA:{date:'2025-01-01',value:'4.2'}}} onSelect={()=>{}}/>);
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('Massachusetts, 4.2%, observation 2025-01-01');
    expect(html).toContain('tabindex="0"');
  });
  it('does not turn a missing value into a fabricated economic indicator',()=>{
    const html=renderToStaticMarkup(<AtlasMap regions={regions} layer={LAYERS[0]} values={{}} onSelect={()=>{}}/>);
    expect(html).toContain('Massachusetts, data not yet available');
    expect(html).not.toContain('0%');
  });
});
