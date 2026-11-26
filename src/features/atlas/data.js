export const REGIONS = Object.entries({
  '01':'AL','02':'AK','04':'AZ','05':'AR','06':'CA','08':'CO','09':'CT','10':'DE','11':'DC','12':'FL','13':'GA','15':'HI','16':'ID','17':'IL','18':'IN','19':'IA','20':'KS','21':'KY','22':'LA','23':'ME','24':'MD','25':'MA','26':'MI','27':'MN','28':'MS','29':'MO','30':'MT','31':'NE','32':'NV','33':'NH','34':'NJ','35':'NM','36':'NY','37':'NC','38':'ND','39':'OH','40':'OK','41':'OR','42':'PA','44':'RI','45':'SC','46':'SD','47':'TN','48':'TX','49':'UT','50':'VT','51':'VA','53':'WA','54':'WV','55':'WI','56':'WY',
}).map(([id, code]) => ({ id, code }));

export const LAYERS = [
  { id: 'unemployment', label: 'Unemployment', title: 'Unemployment rate', suffix: 'UR', units: 'Percent', frequency: 'Monthly', thresholds: [3,4,5,6], legend: ['< 3%','3–4%','4–5%','5–6%','≥ 6%'], note: 'Seasonally adjusted unemployment rates.' },
  { id: 'income', label: 'Income', title: 'Personal income per person', suffix: 'PCPI', units: 'Dollars', frequency: 'Annual', thresholds: [50000,60000,70000,80000], legend: ['< $50k','$50–60k','$60–70k','$70–80k','≥ $80k'], note: 'Personal income per person, in current dollars.' },
  { id: 'housing', label: 'Housing', title: 'House price index', suffix: 'STHPI', units: 'Index 1980:Q1=100', frequency: 'Quarterly', thresholds: [300,450,600,750], legend: ['< 300','300–450','450–600','600–750','≥ 750'], note: 'Index levels measure change from 1980, not dollar prices.' },
  { id: 'growth', label: 'Growth', title: 'Real GDP growth', suffix: 'RGSP', units: 'Percent change from previous year', frequency: 'Annual', thresholds: [0,1,2,3], legend: ['< 0%','0–1%','1–2%','2–3%','≥ 3%'], note: 'Year-over-year change in annual real GDP, calculated from FRED observations.' },
];
export const MAP_COLORS = ['#d9e4cf','#adc9bd','#7fb4b8','#508eaa','#356382'];
export function seriesId(code, layer) { return `${code}${layer.suffix}`; }
export function observationsForLayer(observations, layer) {
  const points = [...observations].sort((a,b) => a.date.localeCompare(b.date));
  if (layer.id !== 'growth') return points;
  return points.slice(1).map((point,index) => {
    const previous = points[index];
    const contiguous = Number(point.date.slice(0,4)) - Number(previous.date.slice(0,4)) === 1;
    const value = point.value !== '.' && previous.value !== '.' && contiguous && Number(previous.value) > 0 ? (Number(point.value) / Number(previous.value) - 1) * 100 : null;
    return { date: point.date, value: value == null ? '.' : String(value) };
  });
}
export function latestPoint(observations, layer) {
  return observationsForLayer(observations, layer).filter(point => point.value !== '.' && Number.isFinite(Number(point.value))).at(-1) || null;
}
export function mapColor(value, layer) {
  if (!Number.isFinite(value)) return null;
  return MAP_COLORS[layer.thresholds.filter(threshold => value >= threshold).length];
}
export function formatMetric(value, layer) {
  if (!Number.isFinite(value)) return 'Unavailable';
  if (layer.id === 'income') return new Intl.NumberFormat('en-US', {style:'currency',currency:'USD',maximumFractionDigits:0}).format(value);
  return `${value.toLocaleString('en-US', {maximumFractionDigits:1})}${['unemployment','growth'].includes(layer.id) ? '%' : ''}`;
}
