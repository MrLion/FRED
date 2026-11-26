import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceArea } from 'recharts';
import { mergeChartData } from '../features/atlas/research';
const dateLabel = value => new Date(value).toISOString().slice(0, 10);
const numberLabel = value => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(value);

export default function Chart({ observations, title, recessionPeriods = [], showRecessions = true, primaryLabel, comparison }) {
  const data=mergeChartData(observations||[],comparison?.observations||[]);
  const valid=data.filter(point=>Number.isFinite(point.value));
  if(!valid.length)return <p className="chart-empty">No observations available for this period.</p>;
  const values=data.flatMap(point=>[point.value,point.benchmark]).filter(Number.isFinite);
  const min=values.reduce((a,b)=>Math.min(a,b),Infinity),max=values.reduce((a,b)=>Math.max(a,b),-Infinity);
  const padding = (max - min || Math.abs(max) || 1) * 0.1;
  return <div className="chart-container" role="img" aria-label={`${title}. Line chart from ${dateLabel(data[0].time)} to ${dateLabel(data.at(-1).time)}. Values range from ${numberLabel(min)} to ${numberLabel(max)}. ${comparison?'The second dashed line shows the United States for matching units and frequency. ':''}Chart tooltips show observation dates and values.`}>
    {comparison&&<div className="chart-comparison-legend"><span><i/>{primaryLabel||title}</span><span><i/>{comparison.name}</span></div>}
    <ResponsiveContainer width="100%" height={360}>
      <LineChart data={data} margin={{ top: 18, right: 18, bottom: 12, left: 0 }} accessibilityLayer>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        {(showRecessions ? recessionPeriods : []).map((period, i) => {
          const start = Math.max(Date.parse(period.start), data[0].time);
          const end = Math.min(Date.parse(period.end), data.at(-1).time);
          return start < end ? <ReferenceArea key={i} x1={start} x2={end} fill="#64748b" fillOpacity={0.09} stroke="none" /> : null;
        })}
        <XAxis type="number" scale="time" tickCount={6} domain={['dataMin', 'dataMax']} dataKey="time" tickFormatter={time => new Date(time).getUTCFullYear()} minTickGap={45} tick={{ fill: '#596780', fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis domain={[min - padding, max + padding]} tickFormatter={numberLabel} width={65} tick={{ fill: '#596780', fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip labelFormatter={dateLabel} formatter={(value,name) => [Number(value).toLocaleString(),name]} contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-white)', fontSize: 13 }} />
        <Line type="linear" name={primaryLabel||title} dataKey="value" stroke="#365CF5" strokeWidth={2.5} dot={false} connectNulls={false} isAnimationActive={false} activeDot={{ r: 4, stroke: 'white', strokeWidth: 2 }} />
        {comparison&&<Line type="linear" name={comparison.name} dataKey="benchmark" stroke="#927345" strokeDasharray="6 4" strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false}/>}
      </LineChart>
    </ResponsiveContainer><p className="chart-source">Source: FRED{recessionPeriods.length > 0 ? ' · Shaded periods indicate US recessions.' : ''}</p>
  </div>;
}
