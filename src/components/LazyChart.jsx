import { lazy, Suspense } from 'react';
const Chart = lazy(() => import('./Chart'));

export default function LazyChart(props) {
  return <Suspense fallback={<div className="chart-loading" role="status">Preparing chart…</div>}><Chart {...props} /></Suspense>;
}
