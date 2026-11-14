import { useCallback } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { getReleases, getReleaseSeries, getRelease } from '../api/fred';
import { useFred } from '../hooks/useFred';
import { usePagedList } from '../features/browse/usePagedList';
import BrowseLayout, { DirectoryFilter, DirectoryRow, MoreResults } from '../features/browse/BrowseLayout';
import SeriesCard from '../components/SeriesCard';
import Loading, { ErrorMessage, EmptyState } from '../components/Loading';
import { FileText, ExternalLink } from 'lucide-react';

const fetchReleases = signal => getReleases({ signal });
export default function Releases() {
  const { id } = useParams();
  return id ? <ReleaseDetail key={id} releaseId={Number(id)} /> : <ReleaseDirectory />;
}

function ReleaseDirectory() {
  const [params, setParams] = useSearchParams();
  const filter = params.get('q') || '';
  const { data: releases, loading, error, refetch } = useFred(fetchReleases);
  const visible = (releases || []).filter(release => release.name.toLowerCase().includes(filter.toLowerCase()));
  return <BrowseLayout title="Explore the releases." description="Browse the reports and publications that bring economic indicators together." breadcrumbs={[{ label: 'Releases' }]} section="REPORTS & PUBLICATIONS">
    <DirectoryFilter label="Filter releases" placeholder="Find a release, such as Consumer Price Index…" value={filter} onChange={value => setParams(value ? { q: value } : {}, { replace: true })} />
    {loading && <Loading text="Loading releases…" />}
    {error && <ErrorMessage message={error} onRetry={refetch} />}
    {!loading && !error && <><div className="browse-section-heading"><h2>All releases</h2><span>{visible.length} of {releases.length} releases</span></div>
      <div className="release-directory">{visible.map(release => <DirectoryRow key={release.id} to={`/release/${release.id}`} title={release.name} icon={FileText} subtitle="Browse included series" />)}</div>
      {!visible.length && <EmptyState icon={FileText} headline="No matching releases" body="Try a different report name or clear the filter." action={<button className="btn-secondary" onClick={() => setParams({})}>Clear filter</button>} />}
    </>}
  </BrowseLayout>;
}

function ReleaseDetail({ releaseId }) {
  const [params, setParams] = useSearchParams();
  const sort = params.get('sort') === 'title' ? 'title' : 'popularity';
  const valid = Number.isInteger(releaseId) && releaseId > 0;
  const loadInfo = useCallback(async signal => {
    if (!valid) throw new Error('This release could not be found.');
    const release = await getRelease(releaseId, signal);
    if (!release) throw new Error('This release could not be found.');
    return release;
  }, [releaseId, valid]);
  const metadata = useFred(loadInfo);
  const fetchPage = useCallback(async (offset, signal) => {
    const result = await getReleaseSeries(releaseId, { offset, limit: 50, signal, order_by: sort, sort_order: sort === 'title' ? 'asc' : 'desc' });
    return { items: result.series, total: result.count, nextOffset: result.series.length && offset + result.series.length < result.count ? offset + result.series.length : null };
  }, [releaseId, sort]);
  const list = usePagedList(fetchPage, valid);
  const name = metadata.data?.name || 'Release';
  const link = metadata.data?.link;
  const safeLink = typeof link === 'string' && /^https?:\/\//i.test(link) ? link : null;
  return <BrowseLayout title={name} description="Explore the indicators published in this release. Choose a series to open its chart." breadcrumbs={[{ label: 'Releases', to: '/releases' }, { label: name }]} section="INSIDE THE RELEASE">
    {metadata.loading && <Loading text="Loading release details…" />}
    {metadata.error && <ErrorMessage message={metadata.error} onRetry={metadata.refetch} />}
    {safeLink && <a className="release-original" href={safeLink} target="_blank" rel="noopener noreferrer">View original publication <ExternalLink size={14} /></a>}
    {valid && <section className="browse-section"><div className="browse-section-heading"><h2>Included series</h2><label className="browse-sort">Sort by<select value={sort} onChange={event => setParams({ sort: event.target.value }, { replace: true })}><option value="popularity">Most popular</option><option value="title">Title A–Z</option></select></label></div>
      {list.loading ? <Loading text="Loading series…" /> : list.error ? <ErrorMessage message={list.error} onRetry={list.retry} /> : <><p className="browse-count">{list.total.toLocaleString()} series in this release</p><div className="series-list">{list.items.map(series => <SeriesCard key={series.id} series={series} />)}</div>{!list.items.length && <EmptyState headline="No series available" body="Browse another release or search for an indicator." action={<Link to="/releases">Browse releases →</Link>} />}<MoreResults list={list} /></>}
    </section>}
  </BrowseLayout>;
}
