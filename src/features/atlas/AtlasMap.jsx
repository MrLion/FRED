import { useRef, useState } from 'react';
import { Plus, Minus, RotateCcw } from 'lucide-react';
import { formatMetric, mapColor } from './data';
export default function AtlasMap({regions,selected,layer,values,onSelect}) {
  const [zoom,setZoom] = useState(1);
  const [offset,setOffset] = useState({x:0,y:0});
  const [hover,setHover] = useState(null);
  const drag = useRef(null);
  const dragged = useRef(false);
  return <div className="atlas-map-area">
    <svg className="atlas-map" viewBox="-55 -45 1085 710" aria-label="Interactive map of the United States. Select a state to explore its economic data." onPointerDown={event => {
      if (event.button !== 0) return;
      dragged.current=false;
      drag.current={x:event.clientX,y:event.clientY,origin:offset,moved:false};
    }} onPointerMove={event => {
      if (!drag.current) return;
      const deltaX=event.clientX-drag.current.x,deltaY=event.clientY-drag.current.y;
      if (Math.abs(deltaX)+Math.abs(deltaY)>6) {
        drag.current.moved=true;
        dragged.current=true;
        event.currentTarget.setPointerCapture(event.pointerId);
        const scale=1085/event.currentTarget.getBoundingClientRect().width;
        setOffset({x:drag.current.origin.x+deltaX*scale,y:drag.current.origin.y+deltaY*scale});
      }
    }} onPointerUp={event => {
      const moved=drag.current?.moved;
      drag.current=null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      if (moved) event.preventDefault();
    }} onPointerCancel={() => {drag.current=null;}}>
      <defs>
        <pattern id="atlas-hex" width="32" height="55.425" patternUnits="userSpaceOnUse"><path d="M0 9.237 16 0 32 9.237V27.712L16 36.95 0 27.712ZM0 27.712V46.187L16 55.425 32 46.187V27.712" fill="none" stroke="#507c86" strokeWidth=".5" opacity=".2" /></pattern>
        <pattern id="atlas-forest" width="23" height="29" patternUnits="userSpaceOnUse"><path d="m5 3-4 8h3l-4 6h10l-4-6h3ZM18 18l-3 6h6Z" fill="#5b795c" opacity=".16" /></pattern>
        <pattern id="atlas-paper" width="85" height="75" patternUnits="userSpaceOnUse"><path d="M4 16q25-12 48 0m-30 30q24-11 46-2M0 66q26-8 42 0" fill="none" stroke="#9c9673" opacity=".16" strokeWidth=".6" /></pattern>
        <clipPath id="atlas-land">{regions.map(region=><path key={region.id} d={region.path}/>)}</clipPath>
      </defs>
      <rect x="-3000" y="-3000" width="6000" height="6000" fill="url(#atlas-hex)" pointerEvents="none" />
      <g transform={`translate(${offset.x} ${offset.y}) translate(487 300) scale(${zoom}) translate(-487 -300)`}>
        <g className="atlas-land-base">{regions.map(region=><path key={region.id} d={region.path} fill="#dedcc2" />)}</g>
        <g clipPath="url(#atlas-land)" pointerEvents="none">
          <ellipse cx="160" cy="150" rx="150" ry="150" fill="#8fa58a" opacity=".45"/><ellipse cx="700" cy="200" rx="180" ry="180" fill="#abb58b" opacity=".35"/>
          <path d="M80 0H290L430 440 250 430Z" fill="#b7b499" opacity=".5"/><path d="M0 0H270L400 450H80ZM590 70H1000V500H680Z" fill="url(#atlas-forest)"/>
          <rect width="1000" height="640" fill="url(#atlas-paper)"/>
          {Array.from({length:30},(_,i)=>{const x=160+(i%4)*22+Math.floor(i/4)*9,y=65+Math.floor(i/4)*39;return <g key={i}><path d={`M${x-15} ${y+28} ${x} ${y-9} ${x+20} ${y+28}`} fill="#b7b39d" stroke="#8e927c" strokeWidth=".7"/><path d={`M${x-5} ${y+4} ${x} ${y-9} ${x+7} ${y+5} ${x+1} ${y+1}Z`} fill="#f2efde"/></g>;})}
        </g>
        {regions.map(region=>{
          const point=values[region.code];
          const color=point ? mapColor(Number(point.value),layer) : null;
          const active=region.code===selected;
          return <path key={region.id} d={region.path} className={`atlas-state ${active?'selected':''}`} fill={active?'#356cf0':color||'transparent'} fillOpacity={active ? .9 : color ? .68 : 1} stroke={active?'#fff':'#f8f4df'} strokeWidth={active?2:1} vectorEffect="non-scaling-stroke" tabIndex={0} role="button" aria-pressed={active} aria-label={`${region.name}${point?`, ${formatMetric(Number(point.value),layer)}, observation ${point.date}`:', data not yet available'}`} onFocus={()=>setHover(region)} onBlur={()=>setHover(null)} onPointerEnter={()=>setHover(region)} onPointerLeave={()=>setHover(null)} onClick={event=>{if (!dragged.current && !event.defaultPrevented) onSelect(region.code);}} onKeyDown={event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();onSelect(region.code);}}}><title>{region.name}{point?` · ${formatMetric(Number(point.value),layer)} · ${point.date}`:''}</title></path>;
        })}
        <g className="atlas-map-labels" pointerEvents="none">{regions.filter(region=>!['RI','DE','DC','CT','MA','NJ','MD'].includes(region.code)).map(region=><text key={region.id} x={region.center[0]} y={region.center[1]}>{region.code}</text>)}</g>
        <text className="atlas-ocean-label" x="-5" y="360" transform="rotate(-70 -5 360)">PACIFIC OCEAN</text><text className="atlas-ocean-label" x="925" y="420" transform="rotate(-55 925 420)">ATLANTIC OCEAN</text>
      </g>
    </svg>
    {hover && <div className="atlas-hover" role="status"><strong>{hover.name}</strong><span>{values[hover.code]?`${formatMetric(Number(values[hover.code].value),layer)} · ${values[hover.code].date}`:'Select to explore'}</span></div>}
    <div className="atlas-zoom" aria-label="Map controls"><button aria-label="Zoom in" disabled={zoom>=3} onClick={()=>setZoom(z=>Math.min(3,z+.4))}><Plus size={18}/></button><button aria-label="Zoom out" disabled={zoom<=1} onClick={()=>{setZoom(z=>Math.max(1,z-.4));if(zoom<=1.4)setOffset({x:0,y:0});}}><Minus size={18}/></button><button aria-label="Reset map view" onClick={()=>{setZoom(1);setOffset({x:0,y:0});}}><RotateCcw size={16}/></button></div>
  </div>;
}
