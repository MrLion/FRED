import { AtlasLink as Link, useAtlasSearchParams as useSearchParams } from '../features/atlas/AtlasNavigation';
import { useCallback } from 'react';

import { getSources, getSourceReleases } from '../api/fred';
import { useFred } from '../hooks/useFred';
import BrowseLayout, { DirectoryFilter, DirectoryRow } from '../features/browse/BrowseLayout';
import Loading, { ErrorMessage, EmptyState } from '../components/Loading';
import { ChevronDown, Database, ExternalLink } from 'lucide-react';

const fetchSources = signal => getSources({ signal });
function safeLink(value) {
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : null; } catch { return null; }
}

export default function Sources() {
  const [params, setParams] = useSearchParams();
  const filter = params.get('q') || '';
  const expanded = params.get('source');
  const { data: sources, loading, error, refetch } = useFred(fetchSources);
  const visible = (sources || []).filter(source => source.name.toLowerCase().includes(filter.toLowerCase()));
  function update(key, value, replace = false) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace });
  }
  return <BrowseLayout title="Meet the sources." description="Find the institutions behind the numbers, then explore the data they publish." breadcrumbs={[{ label: 'Sources' }]} section="FOLLOW THE SOURCE">
    <DirectoryFilter label="Filter data sources" placeholder="Find a source, such as Bureau of Labor Statistics…" value={filter} onChange={value => update('q', value, true)} />
    {loading && <Loading text="Loading data sources…" />}
    {error && <ErrorMessage message={error} onRetry={refetch} />}
    {!loading && !error && <>
      <div className="browse-section-heading"><h2>Data sources</h2><span>{visible.length} of {sources.length} sources</span></div>
      <div className="source-directory">{visible.map(source => {
        const open = expanded === String(source.id);
        const href = safeLink(source.link);
        return <section key={source.id} className={`source-panel ${open ? 'is-open' : ''}`}>
          <h3><button className="source-toggle" aria-expanded={open} aria-controls={`source-${source.id}-releases`} onClick={() => update('source', open ? '' : String(source.id))}><span className="directory-icon"><Database size={20} /></span><span><strong>{source.name}</strong><span className="source-toggle-caption">Explore published releases</span></span><ChevronDown size={18} /></button></h3>
          <div id={`source-${source.id}-releases`} className="source-panel-content" hidden={!open}>{open && <><div className="source-panel-heading"><span>Published releases</span>{href && <a href={href} target="_blank" rel="noopener noreferrer">Visit source <ExternalLink size={13} /></a>}</div><SourceReleases sourceId={source.id} /></>}</div>
        </section>;
      })}</div>
      {!visible.length && <EmptyState icon={Database} headline="No matching sources" body="Try a shorter name or clear the filter." action={<button className="btn-secondary" onClick={() => update('q', '', true)}>Clear filter</button>} />}
      <p className="directory-footnote">Looking for an indicator instead? <Link to="/search">Search all economic data →</Link></p>
    </>}
  </BrowseLayout>;
}

function SourceReleases({ sourceId }) {
  const load = useCallback(signal => getSourceReleases(sourceId, { signal }), [sourceId]);
  const { data, loading, error, refetch } = useFred(load);
  if (loading) return <Loading text="Loading published releases…" />;
  if (error) return <ErrorMessage message="This source’s releases could not be loaded. Please try again." onRetry={refetch} />;
  if (!data?.length) return <EmptyState headline="No releases listed" body="This source has no releases available through FRED." />;
  return <div className="source-release-list">{data.map(release => <DirectoryRow key={release.id} to={`/release/${release.id}`} title={release.name} />)}</div>;
}
