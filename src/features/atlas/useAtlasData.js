import { useEffect, useRef, useState } from 'react';
import { getSeries, getSeriesObservations } from '../../api/fred';
import { latestPoint, seriesId, observationsForLayer } from './data';
const cache = new Map();
const TTL = 30 * 60 * 1000;

export function useMapValues(regions, layer, refresh) {
  const [state, setState] = useState({ key: '', values: {}, completed: 0 });
  const previousRefresh = useRef(refresh);
  useEffect(() => {
    const controller = new AbortController();
    if (previousRefresh.current !== refresh) {
      regions.forEach(region => cache.delete(seriesId(region.code, layer)));
      previousRefresh.current = refresh;
    }
    async function load() {
      const values = {};
      let completed = 0;
      setState({ key: layer.id, values: {}, completed });
      for (const region of regions) {
        if (controller.signal.aborted) return;
        const id = seriesId(region.code, layer);
        const cached = cache.get(id);
        const fromCache = cached && Date.now() - cached.time < TTL;
        let entry = fromCache ? cached : null;
        if (!entry) {
          try {
            const points = await getSeriesObservations(id, {limit: 5, sort_order: 'desc', signal: controller.signal});
            entry = { point: latestPoint(points, layer), time: Date.now() };
            cache.set(id, entry);
          } catch {
            if (controller.signal.aborted) return;
            entry = { point: null };
          }
        }
        values[region.code] = entry.point;
        completed++;
        setState({ key: layer.id, values: {...values}, completed });
        // Pace uncached state requests to respect FRED limits. Cached states are immediate.
        if (!fromCache) await new Promise(resolve => {
          const done = () => { clearTimeout(timer); controller.signal.removeEventListener('abort', done); resolve(); };
          const timer = setTimeout(done, 850);
          controller.signal.addEventListener('abort', done, { once: true });
        });
      }
    }
    load();
    return () => controller.abort();
  }, [regions, layer, refresh]);
  return state.key === layer.id ? state : { values: {}, completed: 0 };
}

export function useRegionDetails(region, layer, attempt) {
  const key = `${region.code}:${layer.id}`;
  const [state, setState] = useState({key:'',loading:true});
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setState({key,loading:true});
      try {
        const id = seriesId(region.code, layer);
        const [series, raw] = await Promise.all([
          getSeries(id, controller.signal),
          getSeriesObservations(id, {limit:60,sort_order:'desc',signal:controller.signal}),
        ]);
        if (!series) throw new Error('This indicator is not available for this region.');
        if (!controller.signal.aborted) setState({key,loading:false,series,points:observationsForLayer(raw,layer),latest:latestPoint(raw,layer)});
      } catch {
        if (!controller.signal.aborted) setState({key,loading:false,error:'This region’s data could not be loaded. Please try again.'});
      }
    }
    load();
    return () => controller.abort();
  }, [region,layer,key,attempt]);
  return state.key === key ? state : {loading:true};
}
