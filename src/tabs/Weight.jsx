const { useState, useEffect, useRef, useCallback } = React;
import { DEFAULTS, fmt, getTrend, calcAdaptiveTDEE } from "../../lib/engine.mjs";
import { ScalePad } from "../cards/ScalePad.jsx";
import { WeightTrendCard } from "../cards/WeightTrendCard.jsx";
import { haptic } from "../core/device.js";
import { useToday } from "../core/hooks.js";
import { sv, svSB } from "../core/storage.js";
import { C } from "../core/theme.js";
import { Ch, S, X } from "../ui/atoms.jsx";
import { ConfirmModal } from "../ui/overlay.jsx";

// ═══ WEIGHT ═══
const Weight=({data,setData})=>{
  const [nw,setNw]=useState("");const t=useToday();
  const [delDate,setDelDate]=useState(null);
  const st=data.settings||DEFAULTS;
  const entries=Object.entries(data.wt).sort((a,b)=>b[0].localeCompare(a[0]));
  const latest=entries[0]?.[1],oldest=entries[entries.length-1]?.[1];
  const tc=latest&&oldest?Math.round(latest-oldest):null;
  const ch=entries.slice(0,14).reverse().map(([d,v])=>({v,d:d.slice(5)}));
  const wTrend=getTrend(data.wt,t);
  const wtTDEE=React.useMemo(()=>calcAdaptiveTDEE(data.wt,data.nut,st,data.travelDays,data.tdeeExclude||{},data.tdeeCal),[data.wt,data.nut,st,data.travelDays,data.tdeeExclude,data.tdeeCal,t]);
  const trendWeights=wtTDEE&&wtTDEE.trendWeights?wtTDEE.trendWeights.slice(-14):null;
  const todayLogged=data.wt[t]!=null;
  const yesterdayWt=(()=>{const e=Object.entries(data.wt||{}).filter(([d])=>d<t).sort((a,b)=>b[0].localeCompare(a[0]));return e[0]?.[1]||null;})();
  const add=()=>{if(!nw)return;const v=Number(nw);const nd={...data,wt:{...data.wt,[t]:v}};setData(nd);sv(nd);svSB.weight(t,v);setNw("");haptic(20);};
  return(<div style={{display:"flex",flexDirection:"column",gap:8}}>
    {delDate&&<ConfirmModal title="Delete weigh-in?" message={`${Number(data.wt[delDate]).toFixed(1)} lbs on ${fmt(delDate)} will be removed from this phone and the cloud.`} confirmText="Delete" confirmColor={C.r} onCancel={()=>setDelDate(null)} onConfirm={()=>{const nwt={...data.wt};delete nwt[delDate];const nd={...data,wt:nwt};setData(nd);sv(nd);svSB.delWeight(delDate);setDelDate(null);}}/>}
    <div>
      <div style={{fontSize:18,fontWeight:800,color:C.t}}>Morning scale</div>
      <div style={{fontSize:13,color:C.t3}}>Log the number, then watch the trend.</div>
    </div>

    <ScalePad value={nw} onChange={setNw} onLog={add} hint="type it like the scale shows it" todayLogged={todayLogged?data.wt[t]:null} yesterdayWt={yesterdayWt}/>

    <WeightTrendCard trend={wTrend} tdee={wtTDEE&&wtTDEE.tdee}/>

    {wTrend&&Math.abs(wTrend.rate)>1&&(<X style={{padding:12,borderLeft:`3px solid ${C.bd}`}}>
      <div style={{fontSize:11,fontWeight:800,color:C.t3,letterSpacing:"0.06em"}}>Cut pace</div>
      <div style={{fontSize:14,color:C.t,fontWeight:750,marginTop:2}}>{wTrend.direction==="up"?"Gaining":"Losing"} {Math.abs(wTrend.rate).toFixed(1)} lb/wk</div>
      <div style={{fontSize:12,color:C.t2,marginTop:3}}>{wTrend.rate>0?"Pull back weekend portions slightly. You are in surplus.":"Add 200 cal to training days from carbs. You are cutting; protect performance."}</div>
    </X>)}

    <S title="Scale review" collapsible defaultOpen={false}>
      <div style={{display:"grid",gridTemplateColumns:trendWeights?"1fr 1fr 1fr 1fr":"1fr 1fr 1fr",gap:4}}>
        <X style={{padding:8,textAlign:"center"}}><div style={{fontSize:19,fontWeight:700,color:C.t}}>{latest?Math.round(latest):"○"}</div><div style={{fontSize:10,color:C.t3,fontWeight:600}}>Current</div></X>
        {trendWeights&&<X style={{padding:8,textAlign:"center"}}><div style={{fontSize:19,fontWeight:700,color:C.g}}>{Math.round(wtTDEE.trendWeight)}</div><div style={{fontSize:10,color:C.t3,fontWeight:600}}>Trend</div></X>}
        <X style={{padding:8,textAlign:"center"}}><div style={{fontSize:19,fontWeight:700,color:tc&&tc<0?C.g:C.r}}>{tc?`${tc>0?"+":""}${tc}`:"○"}</div><div style={{fontSize:10,color:C.t3,fontWeight:600}}>Total</div></X>
        <X style={{padding:8,textAlign:"center"}}><div style={{fontSize:19,fontWeight:700,color:C.v}}>{entries.length}</div><div style={{fontSize:10,color:C.t3,fontWeight:600}}>Entries</div></X>
      </div>
      {trendWeights&&trendWeights.length>=2?(()=>{
        const rawPts=trendWeights.map(tw=>({v:tw.raw,d:tw.d.slice(5)}));
        const trendPts=trendWeights.map(tw=>({v:tw.v,d:tw.d.slice(5)}));
        const allVals=[...rawPts.map(p=>p.v),...trendPts.map(p=>p.v)];
        const mn=Math.min(...allVals),mx=Math.max(...allVals),rng=mx-mn||1,pad=rng*0.12;
        const w=rawPts.length*32,h=52;
        const toY=v=>h-6-((v-(mn-pad))/(rng+pad*2))*(h-16);
        const rawLine=rawPts.map((p,i)=>`${i*(w/(rawPts.length-1))},${toY(p.v)}`).join(" ");
        const trendLine=trendPts.map((p,i)=>`${i*(w/(trendPts.length-1))},${toY(p.v)}`).join(" ");
        return(
          <X style={{padding:"10px 14px",marginTop:8}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
              <span style={{fontSize:11,fontWeight:600,color:C.t3,letterSpacing:"0.06em"}}>Weight + Trend</span>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <span style={{fontSize:10,color:C.t3}}>· raw</span>
                <span style={{fontSize:10,color:C.g}}>· trend</span>
                <span style={{fontSize:13,fontWeight:700,color:C.g}}>{Math.round(wtTDEE.trendWeight)} lbs</span>
              </div>
            </div>
            <svg viewBox={`0 0 ${w} ${h}`} style={{width:"100%",height:h}} preserveAspectRatio="none">
              <polyline points={rawLine} fill="none" stroke={C.bd} strokeWidth="1" strokeDasharray="3,3" strokeLinecap="round"/>
              {rawPts.map((p,i)=><circle key={i} cx={i*(w/(rawPts.length-1))} cy={toY(p.v)} r="2.5" fill={C.cd} stroke={C.t3} strokeWidth="1"/>)}
              <polyline points={trendLine} fill="none" stroke={C.g} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:C.t3,marginTop:2}}>
              <span>{rawPts[0]?.d}</span><span>{rawPts[rawPts.length-1]?.d}</span>
            </div>
            {wtTDEE.weeklyChange!==0&&(
              <div style={{marginTop:6,fontSize:11,color:wtTDEE.weeklyChange<0?C.g:C.r,fontWeight:600}}>
                Trend: {wtTDEE.weeklyChange>0?"+":""}{Math.round(wtTDEE.weeklyChange)} lbs/wk
              </div>
            )}
          </X>
        );
      })():<Ch data={ch} color={C.p} label="Trend" yUnit=" lbs" empty="Log weight to see trend"/>}
    </S>

    <S title="Weight history" collapsible defaultOpen={false}>
      {entries.slice(0,20).map(([d,w],i)=>{const prev=entries[i+1]?.[1];const diff=prev?Math.round(w-prev):null;
        const del=()=>setDelDate(d);
        return(<div key={d} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${C.bl}`,fontSize:14,alignItems:"center"}}>
          <span style={{color:C.t2}}>{fmt(d)}</span>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontWeight:600,color:C.t}}>{Math.round(w)} {diff!==null&&diff!==0&&<span style={{color:diff>0?C.r:C.g,fontSize:12}}>{diff>0?"+":""}{diff}</span>}</span>
            <button type="button" aria-label="Delete" onClick={del} style={{background:"none",border:"none",color:C.r,fontSize:14,cursor:"pointer",padding:"6px 8px",opacity:0.6}}>✕</button>
          </div>
        </div>);})}
    </S>
  </div>);
};

export { Weight };
