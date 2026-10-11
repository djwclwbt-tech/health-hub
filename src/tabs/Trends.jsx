const { useState, useRef } = React;
import { PROG, DEFAULTS, fmt, lds, td, okWeight, getTrend, calcAdaptiveTDEE, calcEWMA } from "../../lib/engine.mjs";
import { useBackClose } from "../core/nav.js";
import { useToday } from "../core/hooks.js";
import { sv, svSB } from "../core/storage.js";
import { C } from "../core/theme.js";
import { S } from "../ui/atoms.jsx";
import { ConfirmModal } from "../ui/overlay.jsx";
import { ProgressView } from "../views/Progress.jsx";

// ═══ TRENDS · weight trend first, then history, lifts and body ═══
// The hero number is getTrend()'s smoothed weight, the same one Today shows.
// The chart smooths the whole history with the same EWMA (alpha 0.3) so long
// ranges have a line too. Drag across the chart to read any day.
const NUM={fontVariantNumeric:"tabular-nums"};
const RANGES=[["2W",14],["8W",56],["All",null]];
const shortD=ds=>new Date(ds+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"});

const WeightChart=({pts,goal,rate,onScrub,scrub,startDate})=>{
  const ref=useRef(null);
  const W=360,H=240,pad={l:0,r:40,t:12,b:22};
  // x is days since the range start, so gaps between weigh-ins show as gaps.
  const day=ds=>(new Date(ds+"T12:00:00")-new Date(startDate+"T12:00:00"))/864e5;
  const span=Math.max(1,day(pts[pts.length-1].date));
  const ahead=rate<0?Math.max(3,Math.round(span*0.25)):0;
  const n=span+ahead;
  const vals=[...pts.map(p=>p.raw),...pts.map(p=>p.v)];
  const showGoal=goal!=null&&goal>=Math.min(...vals)-6;
  const lo=Math.floor(Math.min(...vals,showGoal?goal:Infinity)-0.8),hi=Math.ceil(Math.max(...vals)+0.8);
  const x=d=>pad.l+(W-pad.l-pad.r)*d/n;
  const xi=i=>x(day(pts[i].date));
  const y=v=>pad.t+(H-pad.t-pad.b)*(hi-v)/((hi-lo)||1);
  const step=hi-lo>12?5:hi-lo>5?2:1;
  const grid=[];for(let g=Math.ceil(lo/step)*step;g<=hi;g+=step)if(!showGoal||Math.abs(g-goal)>step*0.4)grid.push(g);
  const last=pts.length-1;
  const line=pts.map((p,i)=>`${i?"L":"M"}${xi(i).toFixed(1)},${y(p.v).toFixed(1)}`).join("");
  const projEnd=ahead?Math.max(showGoal?goal:-Infinity,pts[last].v+rate*ahead/7):null;
  const pick=e=>{const r=ref.current?.getBoundingClientRect();if(!r)return;const px=(e.clientX-r.left)/r.width*W;
    let best=0;pts.forEach((p,i)=>{if(Math.abs(xi(i)-px)<Math.abs(xi(best)-px))best=i;});onScrub(best);};
  const s=scrub!=null?pts[scrub]:null;
  const lbl=[[x(0),shortD(startDate),"start"],[xi(last),pts[last].date===td()?"Today":shortD(pts[last].date),"middle"]];
  return(<svg ref={ref} viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Weight trend chart"
    onPointerDown={pick} onPointerMove={e=>{if(e.pointerType==="mouse"||e.buttons)pick(e);}} onPointerLeave={()=>onScrub(null)} onPointerUp={e=>{if(e.pointerType!=="mouse")onScrub(null);}}
    style={{display:"block",overflow:"visible",touchAction:"pan-y",cursor:"crosshair"}}>
    {grid.map(g=><g key={g}><line x1={pad.l} x2={W-pad.r} y1={y(g)} y2={y(g)} stroke={C.bd} strokeWidth="1"/>
      <text x={W-pad.r+6} y={y(g)+4} fontSize="11" fill={C.t4} style={NUM}>{g}</text></g>)}
    {showGoal&&<g><line x1={pad.l} x2={W-pad.r} y1={y(goal)} y2={y(goal)} stroke={C.g} strokeWidth="1" strokeDasharray="3 4"/>
      <text x={W-pad.r+6} y={y(goal)+4} fontSize="11" fill={C.g} style={NUM}>{goal}</text></g>}
    {projEnd!=null&&<path d={`M${xi(last)},${y(pts[last].v)}L${x(n)},${y(projEnd)}`} stroke={C.t} strokeWidth="1.5" strokeDasharray="2 4" fill="none" opacity=".5"/>}
    {pts.map((p,i)=><circle key={p.date} cx={xi(i)} cy={y(p.raw)} r={pts.length>60?1.6:2.2} fill={C.t4} opacity=".75"/>)}
    <path d={line} stroke={C.t} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    {s?<g><line x1={xi(scrub)} x2={xi(scrub)} y1={pad.t-4} y2={H-pad.b} stroke={C.t4} strokeWidth="1"/>
        <circle cx={xi(scrub)} cy={y(s.raw)} r="3" fill={C.t3}/>
        <circle cx={xi(scrub)} cy={y(s.v)} r="4.5" fill={C.bg} stroke={C.t} strokeWidth="2"/></g>
      :<circle cx={xi(last)} cy={y(pts[last].v)} r="4" fill={C.bg} stroke={C.t} strokeWidth="2"/>}
    {lbl.map(([lx,t,a])=><text key={t} x={lx} y={H-4} fontSize="11" fill={C.t4} textAnchor={a}>{t}</text>)}
  </svg>);
};

const Trends=({data,setData})=>{
  const t=useToday();
  const [range,setRange]=useState(14);   // 2W matches getTrend() exactly; longer ranges seed their own EWMA
  const [scrub,setScrub]=useState(null);
  const [delDate,setDelDate]=useState(null);
  const [showProgress,setShowProgress]=useState(false);
  useBackClose(showProgress,()=>setShowProgress(false));
  const st=data.settings||DEFAULTS;
  const trend=getTrend(data.wt,t);
  const tdee=React.useMemo(()=>calcAdaptiveTDEE(data.wt,data.nut,st,data.travelDays,data.tdeeExclude||{},data.tdeeCal),[data.wt,data.nut,st,data.travelDays,data.tdeeExclude,data.tdeeCal,t]);

  if(showProgress)return(<ProgressView data={data} setData={setData} onBack={()=>setShowProgress(false)}/>);

  const all=Object.entries(data.wt||{}).filter(([d,v])=>okWeight(v)&&d<=t).map(([d,v])=>[d,Number(v)]).sort((a,b)=>a[0].localeCompare(b[0]));
  const from=range?(()=>{const d=new Date(t+"T12:00:00");d.setDate(d.getDate()-range+1);return lds(d);})():(all[0]?.[0]||t);
  const inRange=all.filter(([d])=>d>=from);
  const sm=calcEWMA(inRange.map(([,v])=>v),0.3);
  const pts=inRange.map(([d,v],i)=>({date:d,raw:v,v:sm[i]}));
  const goal=PROG.targetWeight;
  const cur=trend?.points?.length?trend.points[trend.points.length-1].v:null;
  const rate=trend?.rate??0;
  const daysToGoal=cur!=null&&rate<-0.05&&cur>goal?(cur-goal)/(-rate)*7:null;
  const goalBy=daysToGoal!=null&&daysToGoal<=180?(()=>{const d=new Date(t+"T12:00:00");d.setDate(d.getDate()+Math.round(daysToGoal));return shortD(lds(d));})():null;
  const pace=!trend?null:rate>=0.1?{txt:`+${rate.toFixed(1)} lb/wk · gaining`,c:C.t2}
    :rate<=-0.6&&rate>-2?{txt:`−${Math.abs(rate).toFixed(1)} lb/wk · on pace${goalBy?` for ${goalBy}`:""}`,c:C.g}
    :rate<=-2?{txt:`−${Math.abs(rate).toFixed(1)} lb/wk · faster than planned`,c:C.t2}
    :rate<=-0.1?{txt:`−${Math.abs(rate).toFixed(1)} lb/wk · slow`,c:C.t2}
    :{txt:"Holding steady",c:C.t2};
  const s=scrub!=null?pts[scrub]:null;
  const week=(()=>{const days=[];for(let i=6;i>=0;i--){const d=new Date(t+"T12:00:00");d.setDate(d.getDate()-i);days.push(lds(d));}return days;})();
  const weighs=week.filter(d=>data.wt?.[d]!=null).length;
  const proDays=week.map(d=>data.nut?.[d]?.totalProtein||0).filter(v=>v>0);
  const proAvg=proDays.length?Math.round(proDays.reduce((a,b)=>a+b,0)/proDays.length):null;
  const cells=[["To goal",cur!=null?`${Math.max(0,cur-goal).toFixed(1)} lb`:"○"],["Burn estimate",tdee?.tdee?Math.round(tdee.tdee).toLocaleString():"○"],["Weigh-ins, week",`${weighs}/7`],["Protein, 7-day",proAvg!=null?`${proAvg} g`:"○"]];
  const entries=all.slice().reverse();
  const del=()=>{const nw={...data.wt};delete nw[delDate];const nd={...data,wt:nw};setData(nd);sv(nd);svSB.delWeight(delDate);setDelDate(null);};

  return(<div style={{paddingTop:12}}>
    {delDate&&<ConfirmModal title="Delete weigh-in?" message={`${Number(data.wt[delDate]).toFixed(1)} lb on ${fmt(delDate)} will be removed.`} onConfirm={del} onCancel={()=>setDelDate(null)} confirmText="Delete" confirmColor={C.r}/>}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:8}}>
      <h1 style={{fontSize:22,fontWeight:600,letterSpacing:"-0.2px"}}>Weight</h1>
      <div role="group" aria-label="Range" style={{display:"flex",gap:2}}>
        {RANGES.map(([l,d])=><button type="button" key={l} aria-pressed={range===d} onClick={()=>{setRange(d);setScrub(null);}} style={{background:"none",border:"none",fontSize:13,color:range===d?C.t:C.t3,fontWeight:range===d?500:400,padding:"8px 6px",minHeight:36,cursor:"pointer"}}>{l}</button>)}
      </div>
    </div>
    {cur!=null?(<>
      <div style={{marginTop:14,display:"flex",alignItems:"baseline",gap:8}}>
        <span style={{fontSize:40,fontWeight:600,letterSpacing:"-0.5px",...NUM}}>{(s?s.v:cur).toFixed(1)}</span>
        <span style={{fontSize:13,color:C.t3,...NUM}}>{s?`lb trend · ${shortD(s.date)} · scale ${s.raw.toFixed(1)}`:"lb trend"}</span>
      </div>
      <div style={{fontSize:13,color:pace.c,marginTop:2,...NUM}}>{pace.txt}</div>
    </>):<div style={{fontSize:14,color:C.t3,marginTop:14}}>Log a couple of weigh-ins to see your trend.</div>}
    {pts.length>=2&&<div style={{marginTop:18}}><WeightChart pts={pts} goal={goal} rate={rate} scrub={scrub} onScrub={setScrub} startDate={from}/></div>}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",borderTop:`1px solid ${C.bd}`,marginTop:16}}>
      {cells.map(([k,v],i)=>(<div key={k} style={{padding:"14px 0",borderBottom:`1px solid ${C.bd}`,...(i%2===0?{paddingRight:12,borderRight:`1px solid ${C.bd}`}:{paddingLeft:16})}}>
        <div style={{fontSize:12,color:C.t3}}>{k}</div><div style={{fontSize:20,fontWeight:500,marginTop:4,...NUM}}>{v}</div>
      </div>))}
    </div>
    <div style={{fontSize:13,color:C.t3,marginTop:14,lineHeight:1.45}}>Scale moves with water. The line is what counts.</div>

    <button type="button" onClick={()=>setShowProgress(true)} style={{marginTop:22,width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",background:C.cd,border:`1px solid ${C.bd}`,borderRadius:12,padding:"14px 16px",cursor:"pointer",textAlign:"left"}}>
      <span><span style={{display:"block",fontSize:15,fontWeight:500}}>Lifts and body</span><span style={{display:"block",fontSize:13,color:C.t3,marginTop:2}}>Photos, measurements, weekly analysis</span></span>
      <span aria-hidden="true" style={{color:C.t4,fontSize:18}}>›</span>
    </button>

    <S title="Weigh-ins" meta={entries.length} collapsible defaultOpen={false}>
      {entries.slice(0,30).map(([d,w],i)=>{const prev=entries[i+1]?.[1];const diff=prev!=null?+(w-prev).toFixed(1):null;
        return(<div key={d} style={{display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:`1px solid ${C.bd}`,fontSize:14,minHeight:44}}>
          <span style={{color:C.t2}}>{fmt(d)}</span>
          <span style={{display:"flex",alignItems:"center",gap:10,...NUM}}>
            {diff?<span style={{fontSize:13,color:C.t3}}>{diff>0?"+":"−"}{Math.abs(diff).toFixed(1)}</span>:null}
            <span style={{fontWeight:500}}>{w.toFixed(1)}</span>
            <button type="button" aria-label={`Delete weigh-in ${fmt(d)}`} onClick={()=>setDelDate(d)} style={{background:"none",border:"none",color:C.t4,fontSize:14,cursor:"pointer",padding:"10px 6px"}}>✕</button>
          </span>
        </div>);})}
    </S>
  </div>);
};

export { Trends };
