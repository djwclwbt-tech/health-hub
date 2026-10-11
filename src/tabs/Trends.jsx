const { useState, useRef } = React;
import { PROG, DEFAULTS, fmt, lds, td, okWeight, getTrend, calcAdaptiveTDEE, calcEWMA } from "../../lib/engine.mjs";
import { useBackClose } from "../core/nav.js";
import { useToday } from "../core/hooks.js";
import { sv, svSB } from "../core/storage.js";
import { C } from "../core/theme.js";
import { S } from "../ui/atoms.jsx";
import { ConfirmModal, Sheet } from "../ui/overlay.jsx";
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
  const [edit,setEdit]=useState(null);           // {date,value,isNew} · the weigh-in sheet
  const [showMonths,setShowMonths]=useState(3);
  useBackClose(!!edit,()=>setEdit(null));
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
  const reliable=!!trend?.reliable;
  const rate=reliable?trend.rate:0;   // no rate, no projection, until there are enough weigh-ins
  const daysToGoal=cur!=null&&rate<-0.05&&cur>goal?(cur-goal)/(-rate)*7:null;
  const goalBy=daysToGoal!=null&&daysToGoal<=180?(()=>{const d=new Date(t+"T12:00:00");d.setDate(d.getDate()+Math.round(daysToGoal));return shortD(lds(d));})():null;
  const pace=!trend?null:!reliable?{txt:`${trend.n} weigh-ins in 2 weeks. A rate needs 4 across a week.`,c:C.t3}:rate>=0.1?{txt:`+${rate.toFixed(1)} lb/wk · gaining`,c:C.t2}
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
  // Weigh-ins by month. The change shows only against a weigh-in in the 7 days
  // before; after a longer gap a "+7.0" would be a month of drift, not a day.
  const dayGap=(a,b)=>Math.round((new Date(a+"T12:00:00")-new Date(b+"T12:00:00"))/864e5);
  const months=(()=>{const out=[];entries.forEach(([d,w],i)=>{const prev=entries[i+1];const gap=prev?dayGap(d,prev[0]):null;
      const row={d,w,gap:gap>7?gap:null,diff:prev&&gap<=7?+(w-prev[1]).toFixed(1):null};
      const key=d.slice(0,7);let m=out[out.length-1];if(!m||m.key!==key){m={key,label:new Date(d+"T12:00:00").toLocaleDateString("en-US",{month:"long",year:"numeric"}),rows:[]};out.push(m);}m.rows.push(row);});
    out.forEach(m=>{m.avg=m.rows.reduce((a,r)=>a+r.w,0)/m.rows.length;});return out;})();
  const saveEdit=(date,v)=>{const nd={...data,wt:{...data.wt,[date]:v}};setData(nd);sv(nd);svSB.weight(date,v);setEdit(null);};
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
      <button type="button" onClick={()=>setEdit({date:"",value:"",isNew:true})} style={{width:"100%",minHeight:44,border:`1px solid ${C.bd}`,borderRadius:9,background:C.cd,color:C.t,fontSize:14,fontWeight:500,cursor:"pointer",margin:"4px 0 6px"}}>Add a missed weigh-in</button>
      {months.slice(0,showMonths).map(m=>(<div key={m.key}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",padding:"14px 2px 6px"}}>
          <span style={{fontSize:13,fontWeight:500,color:C.t2}}>{m.label}</span>
          <span style={{fontSize:13,color:C.t3,...NUM}}>{m.rows.length} weigh-in{m.rows.length===1?"":"s"} · avg {m.avg.toFixed(1)}</span>
        </div>
        {m.rows.map(r=>(<button type="button" key={r.d} onClick={()=>setEdit({date:r.d,value:String(r.w)})} style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",minHeight:44,background:"none",border:"none",borderTop:`1px solid ${C.bd}`,cursor:"pointer",padding:"0 2px",fontSize:14}}>
          <span style={{color:C.t2}}>{fmt(r.d)}</span>
          <span style={{display:"flex",alignItems:"baseline",gap:12,...NUM}}>
            <span style={{fontSize:13,color:C.t3}}>{r.diff==null?(r.gap?`${r.gap} days since last`:""):r.diff===0?"same":`${r.diff>0?"+":"−"}${Math.abs(r.diff).toFixed(1)}`}</span>
            <span style={{fontWeight:500,color:C.t,minWidth:44,textAlign:"right"}}>{r.w.toFixed(1)}</span>
          </span>
        </button>))}
      </div>))}
      {months.length>showMonths&&<button type="button" onClick={()=>setShowMonths(n=>n+3)} style={{width:"100%",minHeight:44,background:"none",border:"none",borderTop:`1px solid ${C.bd}`,color:C.t2,fontSize:14,cursor:"pointer"}}>Show older months</button>}
    </S>
    <Sheet open={!!edit} onClose={()=>setEdit(null)} title={edit?.isNew?"Add a weigh-in":edit?`Weigh-in · ${fmt(edit.date)}`:""}>
      {edit&&(()=>{const v=Number(edit.value);const ok=edit.date&&edit.date<=t&&v>80&&v<500;const exists=edit.isNew&&edit.date&&data.wt?.[edit.date]!=null;
        const inp={width:"100%",height:48,border:`1px solid ${C.bd}`,borderRadius:8,padding:"0 12px",fontSize:17,background:C.cd,...NUM};
        return(<div>
          {edit.isNew&&<label style={{display:"block",fontSize:13,color:C.t3}}>Date<input type="date" max={t} value={edit.date} onChange={e=>setEdit({...edit,date:e.target.value})} style={{...inp,marginTop:4}}/></label>}
          <label style={{display:"block",fontSize:13,color:C.t3,marginTop:edit.isNew?12:0}}>Weight, lb<input inputMode="decimal" value={edit.value} onChange={e=>setEdit({...edit,value:e.target.value.replace(/[^0-9.]/g,"")})} style={{...inp,marginTop:4}}/></label>
          {exists&&<div style={{fontSize:13,color:C.t2,marginTop:8}}>{fmt(edit.date)} already has {Number(data.wt[edit.date]).toFixed(1)}. Saving replaces it.</div>}
          <button type="button" disabled={!ok} onClick={()=>saveEdit(edit.date,v)} style={{width:"100%",minHeight:48,marginTop:14,border:"none",borderRadius:9,background:ok?C.p:C.bl,color:ok?C.oa:C.t3,fontSize:15,fontWeight:500,cursor:ok?"pointer":"default"}}>Save</button>
          {!edit.isNew&&<button type="button" onClick={()=>{setDelDate(edit.date);setEdit(null);}} style={{width:"100%",minHeight:44,marginTop:6,background:"none",border:"none",color:C.r,fontSize:14,cursor:"pointer"}}>Delete this weigh-in</button>}
        </div>);})()}
    </Sheet>
  </div>);
};

export { Trends };
