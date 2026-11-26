import { Link, NavLink, useLocation } from 'react-router-dom';
import { ChevronRight, Search, X, ArrowUpRight } from 'lucide-react';

export default function BrowseLayout({ title, description, section, breadcrumbs = [], children }) {
  return <div className="page browse-page">
    <nav className="browse-breadcrumbs" aria-label="Breadcrumb">
      <Link to="/overview">Overview</Link><ChevronRight size={12} /><Link to="/search">Explore</Link>
      {breadcrumbs.map((crumb, index) => <span key={`${crumb.label}:${index}`}><ChevronRight size={12} />{crumb.to ? <Link to={crumb.to}>{crumb.label}</Link> : <span aria-current="page">{crumb.label}</span>}</span>)}
    </nav>
    <div className="page-intro"><span className="eyebrow">{section || 'EXPLORE THE ECONOMY'}</span><h1 className="page-title">{title}</h1><p>{description}</p></div>
    <BrowseTabs />
    {children}
  </div>;
}

export function DirectoryFilter({ value, onChange, label, placeholder }) {
  return <div className="directory-filter"><Search size={18} /><input type="search" aria-label={label} placeholder={placeholder} value={value} onChange={event => onChange(event.target.value)} />{value && <button aria-label="Clear filter" onClick={() => onChange('')}><X size={16} /></button>}</div>;
}

export function DirectoryRow({ to, title, subtitle, icon: Icon }) {
  return <Link className="directory-row" to={to}>{Icon && <span className="directory-icon"><Icon size={20} /></span>}<span className="directory-row-copy"><strong>{title}</strong>{subtitle && <span>{subtitle}</span>}</span><ArrowUpRight size={18} /></Link>;
}

export function MoreResults({ list }) {
  return <>
    {list.pageError && <p className="browse-inline-error" role="alert">Could not load more results. Your current results are still available.</p>}
    {list.nextOffset != null && <button className="btn-secondary load-more" disabled={list.paging} onClick={list.loadMore}>{list.paging ? 'Loading…' : `${list.pageError ? 'Retry loading more' : 'Load more'} · ${list.items.length.toLocaleString()} of ${list.total.toLocaleString()}`}</button>}
  </>;
}

export function BrowseTabs() {
  const { pathname } = useLocation();
  return (
    <nav className="browse-tabs" aria-label="Explore views">
      {[['/search', 'Search'], ['/categories', 'Topics'], ['/sources', 'Sources'], ['/releases', 'Releases']].map(([to, label]) => <NavLink key={to} to={to} className={({ isActive }) => `browse-tab ${(isActive || (to === '/releases' && pathname.startsWith('/release/'))) ? 'active' : ''}`}>{label}</NavLink>)}
    </nav>
  );
}
