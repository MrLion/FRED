import { LAYERS, REGIONS } from './data';
const validRegion = code => REGIONS.some(region => region.code === code) ? code : null;
const validLayer = value => LAYERS.some(layer => layer.id === value) ? value : null;

export function resolveAtlasContext(pathname, search, previous = {}) {
  const params = new URLSearchParams(search);
  const regionalSeries = /^\/series\/([A-Z]{2})(UR|PCPI|STHPI|RGSP)$/.exec(pathname);
  const inferredRegion = regionalSeries && validRegion(regionalSeries[1]);
  const inferredLayer = regionalSeries && LAYERS.find(layer => layer.suffix === regionalSeries[2])?.id;
  return {
    region: pathname === '/' ? validRegion(params.get('state')) : validRegion(params.get('region')) || inferredRegion || previous.region || null,
    layer: validLayer(params.get('layer')) || inferredLayer || previous.layer || 'unemployment',
  };
}

export function atlasHref(to, context) {
  if (typeof to !== 'string' || !to.startsWith('/') || to.startsWith('//')) return to;
  const url = new URL(to, 'https://atlas.invalid');
  const destination = url.pathname === '/' ? context : resolveAtlasContext(url.pathname,url.search,context);
  const regionKey = url.pathname === '/' ? 'state' : 'region';
  if (destination.region && !url.searchParams.has(regionKey)) url.searchParams.set(regionKey, destination.region);
  if (!url.searchParams.has('layer')) url.searchParams.set('layer', destination.layer || 'unemployment');
  return `${url.pathname}${url.search}${url.hash}`;
}
