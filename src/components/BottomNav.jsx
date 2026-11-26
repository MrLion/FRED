import { NavLink, useLocation } from 'react-router-dom';
import { Map, Home, Search, Database, FileText, Settings, ChartNoAxesColumnIncreasing } from 'lucide-react';
const items = [
  { to: '/', label: 'Atlas', icon: Map },
  { to: '/overview', label: 'Overview', icon: Home },
  { to: '/search', label: 'Explore', icon: Search },
  { to: '/sources', label: 'Sources', icon: Database },
  { to: '/releases', label: 'Releases', icon: FileText },
];
export default function BottomNav() {
  const { pathname } = useLocation();
  return <nav className="bottom-nav" aria-label="Main navigation">
    <NavLink to="/" className="sidebar-brand"><ChartNoAxesColumnIncreasing size={25} /><span>FRED<span className="brand-caption">ECONOMIC DATA</span></span></NavLink>
    <span className="nav-section-label">WORKSPACE</span>
    {items.map(item => { const { to, label } = item; const Icon = item.icon; return <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `bottom-nav-item ${(isActive || (to === '/search' && pathname.startsWith('/categories')) || (to === '/releases' && pathname.startsWith('/release/'))) ? 'active' : ''}`}><Icon size={20} /><span>{label}</span></NavLink>; })}
    <NavLink to="/settings" className="bottom-nav-item nav-settings"><Settings size={19} /><span>Settings</span></NavLink>
    <p className="sidebar-footnote">A clearer view<br />of the economy.</p>
  </nav>;
}
