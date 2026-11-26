import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import AtlasProvider from '../AtlasContext';
import Atlas from '../../../pages/Atlas';
import Search from '../../../pages/Search';
import Sources from '../../../pages/Sources';
import Releases from '../../../pages/Releases';
import Categories from '../../../pages/Categories';
import Settings from '../../../pages/Settings';
import SeriesDetail from '../../../pages/SeriesDetail';

describe('one atlas experience across every data route',()=>{
  it.each([
    ['/search',<Search/>],
    ['/sources',<Sources/>],
    ['/releases',<Releases/>],
    ['/categories',<Categories/>],
    ['/settings',<Settings clearHistory={()=>{}}/>],
    ['/series/MAUR',<SeriesDetail onView={()=>{}}/>],
  ])('keeps %s inside the shared map shell with return context',(path,page)=>{
    const html=renderToStaticMarkup(<MemoryRouter initialEntries={[`${path}?region=MA&layer=income`]}><AtlasProvider><Atlas>{page}</Atlas></AtlasProvider></MemoryRouter>);
    expect(html).toContain('aria-label="Atlas research panel"');
    expect(html).toContain('aria-label="Atlas navigation"');
    expect(html).toContain('ECONOMIC');
    expect(html).toContain('Back to map');
    expect(html).toContain('href="/?state=MA&amp;layer=income"');
    expect(html).not.toContain('class="bottom-nav');
  });
});
