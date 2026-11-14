import { useLayoutEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigationType } from 'react-router-dom';
import { useHistory } from './hooks/useHistory';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import Home from './pages/Home';
import Categories from './pages/Categories';
import Sources from './pages/Sources';
import Releases from './pages/Releases';
import Search from './pages/Search';
import SeriesDetail from './pages/SeriesDetail';
import Settings from './pages/Settings';
import './App.css';
import './styles/modern.css';

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
      <ScrollRestoration />
      <div className="app">
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home recentlyViewed={recentlyViewed} clearHistory={clearHistory} />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/categories/:id" element={<Categories />} />
            <Route path="/sources" element={<Sources />} />
            <Route path="/releases" element={<Releases />} />
            <Route path="/release/:id" element={<Releases />} />
            <Route path="/search" element={<Search />} />
            <Route path="/series/:id" element={<SeriesDetail onView={addToHistory} />} />
            <Route path="/settings" element={<Settings clearHistory={clearHistory} />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}
