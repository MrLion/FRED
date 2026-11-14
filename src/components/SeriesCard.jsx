import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

export default function SeriesCard({ series, start }) {
  return <Link className="series-card" to={`/series/${encodeURIComponent(series.id)}${start ? `?start=${start}` : ''}`}>
    <div className="series-card-content"><div className="series-card-header"><span className="series-card-id">{series.id}</span><span className="series-card-freq">{series.frequency}</span></div>
    <h3 className="series-card-title">{series.title}</h3>
    <p className="series-card-units">{series.units}{series.seasonal_adjustment ? ` · ${series.seasonal_adjustment}` : ''}</p>
    {series.observation_end && <p className="series-card-date">Latest observation · {series.observation_end}</p>}</div><ArrowUpRight size={20} className="series-card-arrow" />
  </Link>;
}
