const { useState, useEffect, useRef, useCallback } = React;
import { useToday } from "../core/hooks.js";
import { sv, svSB } from "../core/storage.js";
import { C } from "../core/theme.js";
import { B, N } from "../ui/atoms.jsx";

// ═══ CLOSEOUT PANEL ═══
// "Type a missing number": recovery, sleep, steps and weight for today.
// Habits are tapped in the Close row on Today, so this panel holds numbers only.
const SYSTEM_HABITS=[
  {field:"alcohol",target:false},{field:"cannabis",target:false},{field:"screensOff",target:true},
  {field:"bedBy1030",target:true},{field:"supplements",target:true},{field:"sunlight",target:true},{field:"readBeforeBed",target:true},
];
const CloseoutPanel=({data,setData})=>{
  const t=useToday();
  const tr=data.rec?.[t]||{};
  // Boxes show what is stored now (an Oura or Shortcut sync can land while the app stays open).
  // Only boxes the user typed in are saved, so a stale number never overwrites newer data.
  const stored={rs:tr.recoveryScore??"",hrv:tr.hrv??"",rhr:tr.rhr??"",sh:tr.sleepHours??"",steps:data.steps?.[t]??"",wt:data.wt?.[t]??""};
  const [typed,setTyped]=useState({});
  const [saved,setSaved]=useState(false);
  useEffect(()=>{setTyped({});},[t]);
  const val=k=>k in typed?typed[k]:stored[k];
  const num=k=>{const v=typed[k];return v!==""&&v!=null&&Number.isFinite(+v)?+v:null;};
  const saveMetrics=()=>{
    const map={rs:"recoveryScore",hrv:"hrv",rhr:"rhr",sh:"sleepHours"};
    const rec={...tr};let recChanged=false;
    for(const k in map){const v=num(k);if(v!=null&&v!==tr[map[k]]){rec[map[k]]=v;recChanged=true;}}
    const steps=num("steps"),wt=num("wt");
    setData(prev=>{const nd={...prev,rec:{...prev.rec,[t]:{...(prev.rec?.[t]||{}),...rec}},steps:{...prev.steps,...(steps!=null?{[t]:steps}:{})},wt:{...prev.wt,...(wt!=null?{[t]:wt}:{})}};sv(nd);return nd;});
    if(recChanged)svSB.recovery(t,rec);if(steps!=null)svSB.steps(t,steps);if(wt!=null)svSB.weight(t,wt);
    setTyped({});setSaved(true);setTimeout(()=>setSaved(false),1500);
  };
  const dirty=Object.keys(typed).some(k=>num(k)!=null);
  return(<div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginTop:8}}>
      {[["rs","Recovery %","72"],["sh","Sleep h","7.5"],["steps","Steps","15000"],["wt","Weight","185"],["hrv","HRV","68"],["rhr","RHR","42"]].map(([k,l,ph])=>(
        <div key={k}>
          <div style={{fontSize:13,fontWeight:500,color:C.t3,marginBottom:4}}>{l}</div>
          <N value={val(k)} onChange={v=>setTyped(p=>({...p,[k]:v}))} placeholder={ph} style={{textAlign:"center"}}/>
        </div>
      ))}
    </div>
    <B full small outline style={{marginTop:10,minHeight:44}} onClick={saveMetrics} disabled={!dirty&&!saved} color={saved?C.g:undefined}>{saved?"Saved":"Save numbers"}</B>
  </div>);
};

export { SYSTEM_HABITS, CloseoutPanel };
