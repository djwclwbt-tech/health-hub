const { useState, useEffect, useRef, useCallback } = React;
import { DEFAULTS } from "../../lib/engine.mjs";
import { useToday } from "../core/hooks.js";
import { sv, svSB } from "../core/storage.js";
import { C } from "../core/theme.js";
import { B, N } from "../ui/atoms.jsx";

// ═══ CLOSEOUT PANEL ═══
// "Mark clean day" + compact quick metrics. Lives in the evening/closeout
// surface (Habits tab removed 2026-07-11; same habit record shape is written
// so the weekly analyze payload keeps its input).
const SYSTEM_HABITS=[
  {field:"alcohol",target:false},{field:"cannabis",target:false},{field:"screensOff",target:true},
  {field:"bedBy1030",target:true},{field:"supplements",target:true},{field:"sunlight",target:true},{field:"readBeforeBed",target:true},
];
const CloseoutPanel=({data,setData})=>{
  const t=useToday();
  const tr=data.rec[t]||{};
  const h=data.habits[t]||{};
  const st=data.settings||DEFAULTS;
  const customHabits=st.customHabits||[];
  const [f,setF]=useState({rs:tr.recoveryScore||"",hrv:tr.hrv||"",rhr:tr.rhr||"",sh:tr.sleepHours||"",steps:data.steps?.[t]||"",wt:data.wt?.[t]||""});
  const [saved,setSaved]=useState(false);
  const clean=SYSTEM_HABITS.every(x=>h[x.field]===x.target);
  const markCleanDay=()=>{
    const nh={...h};SYSTEM_HABITS.forEach(x=>nh[x.field]=x.target);customHabits.forEach(x=>{nh.custom={...(nh.custom||{}),[x.id]:true};});
    const nd={...data,habits:{...data.habits,[t]:nh}};setData(nd);sv(nd);svSB.habits(t,nh);
  };
  const saveMetrics=()=>{
    // A blank box keeps whatever is stored now (an Oura sync may have landed after this panel
    // opened), so saving steps alone can never null out today's recovery numbers.
    const keep=(v,cur)=>v===""||v==null?(cur??null):(Number.isFinite(+v)?+v:(cur??null));
    const rec={...tr,recoveryScore:keep(f.rs,tr.recoveryScore),hrv:keep(f.hrv,tr.hrv),rhr:keep(f.rhr,tr.rhr),sleepHours:keep(f.sh,tr.sleepHours)};
    const recChanged=["recoveryScore","hrv","rhr","sleepHours"].some(k=>(rec[k]??null)!==(tr[k]??null));
    const nd={...data,rec:{...data.rec,[t]:rec},steps:{...data.steps,...(f.steps?{[t]:+f.steps}:{})},wt:{...data.wt,...(f.wt?{[t]:+f.wt}:{})}};
    setData(nd);sv(nd);if(recChanged)svSB.recovery(t,rec);if(f.steps)svSB.steps(t,+f.steps);if(f.wt)svSB.weight(t,+f.wt);
    setSaved(true);setTimeout(()=>setSaved(false),1500);
  };
  return(<div>
    <B full color={clean?C.g:C.p} onClick={markCleanDay}>{clean?"Clean day ✓":"Mark clean day"}</B>
    <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:4,marginTop:8}}>
      {[["rs","Rec %","72"],["sh","Sleep","7.5"],["steps","Steps","15000"],["wt","Weight","185"],["hrv","HRV","68"],["rhr","RHR","42"]].map(([k,l,ph])=>(
        <div key={k}>
          <div style={{fontSize:8,fontWeight:700,color:C.t3,marginBottom:2,textAlign:"center"}}>{l}</div>
          <N value={f[k]} onChange={v=>setF({...f,[k]:v})} placeholder={ph} style={{fontSize:12,padding:"7px 2px",textAlign:"center"}}/>
        </div>
      ))}
    </div>
    <B full small outline style={{marginTop:6}} onClick={saveMetrics} color={saved?C.g:undefined}>{saved?"Saved":"Save metrics"}</B>
  </div>);
};

export { SYSTEM_HABITS, CloseoutPanel };
