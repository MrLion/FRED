import { lazy, Suspense, useLayoutEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigationType } from 'react-router-dom';
import { useHistory } from './hooks/useHistory';
import Home from './pages/Home';
import Categories from './pages/Categories';
import Sources from './pages/Sources';
import Releases from './pages/Releases';
import Search from './pages/Search';
import SeriesDetail from './pages/SeriesDetail';
import Settings from './pages/Settings';
import AtlasProvider from './features/atlas/AtlasContext';
import './App.css';
import './styles/modern.css';
const Atlas = lazy(() => import('./pages/Atlas'));
function AppFrame({ children }) {
  const { pathname } = useLocation();
  return <Suspense fallback={<div className="atlas-boot">Unfolding the Economic Atlas…</div>}><Atlas>{pathname !== '/' ? children : null}</Atlas></Suspense>;
}

// One-time cleanup of legacy localStorage keys
try { localStorage.removeItem('fred_api_key'); } catch { /* ignore */ }

const scrollPositions = new Map();
function ScrollRestoration() {
  const location = useLocation();
  const navigation = useNavigationType();
  const previous = useRef(null);
  useLayoutEffect(() => {
    const preserveScroll = previous.current?.pathname === location.pathname && location.pathname !== '/search' && navigation !== 'POP';
    if (!preserveScroll) window.scrollTo(0, navigation === 'POP' ? scrollPositions.get(location.key) || 0 : 0);
    previous.current = location;
    const remember = () => scrollPositions.set(location.key, window.scrollY);
    window.addEventListener('scroll', remember, { passive: true });
    return () => window.removeEventListener('scroll', remember);
  }, [location, navigation]);
  return null;
}

export default function App() {
  const { recentlyViewed, addToHistory, clearHistory } = useHistory();

  return (
    <BrowserRouter>
      <AtlasProvider>
      <ScrollRestoration />
      <AppFrame>
          <Routes>
            <Route path="/overview" element={<Home recentlyViewed={recentlyViewed} clearHistory={clearHistory} />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/categories/:id" element={<Categories />} />
            <Route path="/sources" element={<Sources />} />
            <Route path="/releases" element={<Releases />} />
            <Route path="/release/:id" element={<Releases />} />
            <Route path="/search" element={<Search />} />
            <Route path="/series/:id" element={<SeriesDetail onView={addToHistory} />} />
            <Route path="/settings" element={<Settings clearHistory={clearHistory} />} />
            <Route path="*" element={<div className="page"><h1>Place not found</h1><p>Return to the map to continue exploring.</p></div>} />
          </Routes>
      </AppFrame>
      </AtlasProvider>
    </BrowserRouter>
  );
}
