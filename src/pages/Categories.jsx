import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { getCategoryChildren, getCategorySeries, getCategory } from '../api/fred';
import { useFred } from '../hooks/useFred';
import { usePagedList } from '../features/browse/usePagedList';
import BrowseLayout, { DirectoryFilter, DirectoryRow, MoreResults } from '../features/browse/BrowseLayout';
import SeriesCard from '../components/SeriesCard';
import Loading, { ErrorMessage, EmptyState } from '../components/Loading';
import { Layers, ArrowRight } from 'lucide-react';

export default function Categories() {
  const { id } = useParams();
  return <CategoryBrowser key={id || 'root'} categoryId={id ? Number(id) : 0} />;
}

function CategoryBrowser({ categoryId }) {
  const valid = Number.isInteger(categoryId) && categoryId >= 0;
  const [params, setParams] = useSearchParams();
  const filter = params.get('topic') || '';
  const sort = params.get('sort') === 'title' ? 'title' : 'popularity';
  const [ancestors, setAncestors] = useState([]);
  const loadCategory = useCallback(async signal => {
    if (!valid) throw new Error('This topic could not be found.');
    const [children, info] = await Promise.all([
      getCategoryChildren(categoryId, signal),
      categoryId ? getCategory(categoryId, signal) : Promise.resolve(null),
    ]);
    return { children, category: info?.categories?.[0] };
  }, [categoryId, valid]);
  const metadata = useFred(loadCategory);
  const fetchPage = useCallback(async (offset, signal) => {
    const result = await getCategorySeries(categoryId, { offset, limit: 50, order_by: sort, sort_order: sort === 'title' ? 'asc' : 'desc', signal });
    return { items: result.series, total: result.count, nextOffset: result.series.length && offset + result.series.length < result.count ? offset + result.series.length : null };
  }, [categoryId, sort]);
  const list = usePagedList(fetchPage, valid && categoryId > 0);

  const parentId = metadata.data?.category?.parent_id;
  useEffect(() => {
    const controller = new AbortController();
    async function loadPath() {
      const path = [];
      const seen = new Set([categoryId]);
      let parent = parentId;
      try {
        while (parent && !seen.has(parent) && path.length < 20) {
          seen.add(parent);
          const data = await getCategory(parent, controller.signal);
          const category = data.categories?.[0];
          if (!category) break;
          path.unshift({ label: category.name, to: `/categories/${category.id}` });
          parent = category.parent_id;
        }
        if (!controller.signal.aborted) setAncestors(path);
      } catch { /* The topic remains usable if optional ancestor metadata is unavailable. */ }
    }
    if (parentId) loadPath();
    return () => controller.abort();
  }, [parentId, categoryId]);

  const name = metadata.data?.category?.name || (categoryId ? 'Topic' : 'Explore topics');
  const children = metadata.data?.children || [];
  const visible = children.filter(category => category.name.toLowerCase().includes(filter.toLowerCase()));
  const breadcrumbs = categoryId ? [{ label: 'Topics', to: '/categories' }, ...ancestors, { label: name }] : [{ label: 'Topics' }];
  return <BrowseLayout title={name} description={categoryId ? 'Follow a topic deeper, or explore the economic series collected here.' : 'Start with a subject. Follow the data from the big picture to the details.'} breadcrumbs={breadcrumbs} section="BROWSE BY SUBJECT">
    {metadata.loading && <Loading text="Loading topics…" />}
    {metadata.error && <ErrorMessage message={metadata.error} onRetry={metadata.refetch} />}
    {!metadata.loading && !metadata.error && <>
      {children.length > 0 && <section className="browse-section"><div className="browse-section-heading"><h2>{categoryId ? 'Related topics' : 'Choose a topic'}</h2><span>{children.length} topics</span></div>
        {children.length > 6 && <DirectoryFilter value={filter} label="Filter topics" placeholder="Find a topic…" onChange={value => { const next = new URLSearchParams(params); if (value) next.set('topic', value); else next.delete('topic'); setParams(next, { replace: true }); }} />}
        <div className="topic-directory">{visible.map(category => <DirectoryRow key={category.id} to={`/categories/${category.id}`} title={category.name} subtitle="Explore topic" icon={Layers} />)}</div>
        {!visible.length && <EmptyState headline="No matching topics" body="Try a different topic name." />}
      </section>}
      {categoryId === 0 && <div className="browse-callout"><div><h2>Have a question in mind?</h2><p>Ask in plain English or search for a specific indicator.</p></div><Link to="/search">Search economic data <ArrowRight size={16} /></Link></div>}
    </>}
    {categoryId > 0 && valid && <section className="browse-section"><div className="browse-section-heading"><h2>Series in this topic</h2><label className="browse-sort">Sort by<select value={sort} onChange={event => { const next = new URLSearchParams(params); next.set('sort', event.target.value); setParams(next, { replace: true }); }}><option value="popularity">Most popular</option><option value="title">Title A–Z</option></select></label></div>
      {list.loading ? <Loading text="Loading series…" /> : list.error ? <ErrorMessage message={list.error} onRetry={list.retry} /> : <><p className="browse-count">{list.total.toLocaleString()} series in this topic</p><div className="series-list">{list.items.map(series => <SeriesCard key={series.id} series={series} />)}</div>{!list.items.length && <EmptyState headline="No series directly in this topic" body={children.length ? 'Choose a related topic above to continue exploring.' : 'Try another topic or search for an indicator.'} />}<MoreResults list={list} /></>}
    </section>}
  </BrowseLayout>;
}
