import { C } from "../core/theme.js";
import { X } from "../ui/atoms.jsx";

// ═══ CHART ═══
const WeeklyConsistencyCard=({summary})=>{
  if(!summary)return null;
  const toneColor=summary.tone==="great"?C.g:summary.tone==="good"?C.p:summary.tone==="building"?C.t2:C.t3;
  const toneBg=summary.tone==="great"?C.gl:summary.tone==="good"?C.pl:summary.tone==="building"?C.bg:C.bg;
  return(
    <X style={{padding:12,borderLeft:`4px solid ${C.bd}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
        <div>
          <div style={{fontSize:11,fontWeight:800,color:C.t3}}>Weekly wins</div>
          <div style={{fontSize:16,fontWeight:850,color:C.t,marginTop:2}}>{summary.message}</div>
        </div>
        <div style={{fontSize:11,fontWeight:850,color:C.t3,background:"transparent",border:`1px solid ${C.bd}`,borderRadius:6,padding:"5px 8px",whiteSpace:"nowrap"}}>Trend <span style={{color:toneColor}}>{summary.trend}</span></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginTop:10}}>
        {[
          {l:"Lift",v:summary.liftsPlanned?`${summary.liftsDone}/${summary.liftsPlanned}`:`${summary.liftsDone}`,ok:summary.liftsPlanned?summary.liftsDone>=summary.liftsPlanned:summary.liftsDone>0},
          {l:"Cardio",v:`${summary.cardioSessions} · ${summary.cardioMinutes}m`,ok:summary.cardioSessions>=2},
          {l:"Scale",v:`${summary.weightDays}/7`,ok:summary.weightDays>=5}
        ].map(x=>{
          const col=x.ok?C.g:C.t3;
          return <div key={x.l} style={{padding:"8px 6px",borderRadius:8,textAlign:"center",background:"transparent",border:`1px solid ${C.bd}`}}>
            <div style={{fontSize:9,fontWeight:850,color:C.t3}}>{x.l}</div>
            <div style={{fontSize:13,fontWeight:900,color:col,marginTop:1}}>{x.v}</div>
          </div>;
        })}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:5,marginTop:10}}>
        {summary.days.map(d=>{
          const wins=(d.weightLogged?1:0)+(d.liftDone?1:0)+(d.cardioDone?1:0);
          const bg="transparent";
          const bd=C.bd;
          return <div key={d.date} style={{border:`1px solid ${bd}`,background:bg,borderRadius:6,padding:"6px 2px",textAlign:"center",minHeight:48}}>
            <div style={{fontSize:10,fontWeight:900,color:C.t2}}>{d.label}</div>
            <div style={{display:"flex",justifyContent:"center",gap:2,marginTop:4,flexWrap:"wrap"}}>
              {[{k:"W",ok:d.weightLogged},{k:"L",ok:d.liftDone,hide:!d.liftPlanned},{k:"C",ok:d.cardioDone}].filter(x=>!x.hide).map(x=><span key={x.k} style={{fontSize:8,fontWeight:900,color:x.ok?C.g:C.t3,background:x.ok?C.gl:"transparent",borderRadius:8,padding:"1px 2px"}}>{x.ok?x.k:"·"}</span>)}
            </div>
          </div>;
        })}
      </div>
    </X>
  );
};

export { WeeklyConsistencyCard };
