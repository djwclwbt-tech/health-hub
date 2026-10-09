import { exLibById, fmt, exerciseReport } from "../../../lib/engine.mjs";
import { C, FD } from "../../core/theme.js";
import { Sheet } from "../../ui/overlay.jsx";

// ═══ EXERCISE HISTORY SHEET · last sessions + e1RM line, tap any lift name ═══
const ExerciseHistory=({data,ex,progKeyStr,onClose})=>{
  const {sessions,pr}=exerciseReport(data,ex,progKeyStr);
  const hist=sessions.slice(0,12).reverse();
  const W=320,H=90,padL=6,padR=6,padT=10,padB=16;
  const vals=hist.map(h=>h.e1rm);const mn=Math.min(...vals),mx=Math.max(...vals),rng=(mx-mn)||1;
  const xOf=i=>padL+i*((W-padL-padR)/Math.max(hist.length-1,1));const yOf=v=>padT+(H-padT-padB)-((v-mn)/rng)*(H-padT-padB);
  const prIdx=pr?hist.findIndex(h=>h.date===pr.date):-1;
  const lib=exLibById[ex.id];
  return(<Sheet open onClose={onClose} title={ex.name} right={pr?<span style={{fontSize:11,fontWeight:800,color:C.g,fontFamily:FD,whiteSpace:"nowrap"}}>PR {pr.weight}×{pr.reps} · e1RM {pr.e1rm}</span>:null}>
    {(lib?.cue||ex.cue)&&<div style={{fontSize:12,color:C.t2,lineHeight:1.5,marginBottom:10}}>{ex.cue||lib.cue}</div>}
    {hist.length>=2?(<div style={{marginBottom:10}}>
      <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.12em",color:C.t3,fontFamily:FD}}>E1RM · LAST {hist.length} SESSIONS</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:H,display:"block"}}>
        <polyline points={hist.map((h,i)=>`${xOf(i).toFixed(1)},${yOf(h.e1rm).toFixed(1)}`).join(" ")} fill="none" stroke={C.p} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        {hist.map((h,i)=><circle key={h.date} cx={xOf(i)} cy={yOf(h.e1rm)} r={i===prIdx?4.5:2.5} fill={i===prIdx?C.g:C.cd} stroke={i===prIdx?C.g:C.p} strokeWidth="1.5"/>)}
        <text x={padL} y={H-3} fontFamily={FD} fontSize="9" fontWeight="700" fill={C.t3}>{fmt(hist[0].date).toUpperCase()}</text>
        <text x={W-padR} y={H-3} textAnchor="end" fontFamily={FD} fontSize="9" fontWeight="700" fill={C.t3}>{fmt(hist[hist.length-1].date).toUpperCase()}</text>
        <text x={xOf(hist.length-1)} y={Math.max(padT+2,yOf(hist[hist.length-1].e1rm)-8)} textAnchor="end" fontFamily={FD} fontSize="10" fontWeight="800" fill={C.t}>{hist[hist.length-1].e1rm}</text>
      </svg>
    </div>):<div style={{fontSize:12,color:C.t3,marginBottom:10}}>{hist.length===1?"One session logged. The line starts after the next.":"No sessions logged yet for this lift."}</div>}
    {sessions.slice(0,8).map(h=>(<div key={h.date} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderTop:`1px solid ${C.bl}`,gap:8}}>
      <span style={{fontSize:12,color:C.t3,width:76,flexShrink:0}}>{fmt(h.date)}</span>
      <span style={{fontSize:14,fontWeight:700,color:C.t,flex:1,fontFamily:FD}}>{h.sets[0].weight>0?h.sets[0].weight:"BW"} × {h.sets.map(x=>x.reps).join("/")}</span>
      <span style={{fontSize:11,fontWeight:700,color:pr&&pr.date===h.date?C.g:C.t3,fontFamily:FD,whiteSpace:"nowrap"}}>e1RM {h.e1rm}{pr&&pr.date===h.date?" · PR":""}</span>
    </div>))}
  </Sheet>);
};

export { ExerciseHistory };
