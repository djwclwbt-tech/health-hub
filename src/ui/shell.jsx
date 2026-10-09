const { useState, useEffect, useRef, useCallback } = React;
import { PROG, fmtElapsed } from "../../lib/engine.mjs";
import { haptic } from "../core/device.js";
import { REST_TIMER_KEY } from "../core/storage.js";
import { C, FD } from "../core/theme.js";

// ═══ TAB BAR ═══
const TAB_ICONS={
  dashboard:"M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z",
  training:"M4 9v6M7 6v12M17 6v12M20 9v6M7 12h10",
  nutrition:"M3 12h18c0 4.5-3.8 8-9 8s-9-3.5-9-8zM9 12V6M12 12V4M15 12V6",
  weight:"M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM8 12a4 4 0 0 1 8 0M12 11l2-2",
  settings:"M4 7h9M17 7h3M4 17h5M13 17h7M13 4v6M9 14v6",
};
const TABS=[{id:"dashboard",l:"Home"},{id:"training",l:"Train"},{id:"nutrition",l:"Food"},{id:"weight",l:"Scale"},{id:"settings",l:"Setup"}];
const TabBar=({active,set,hasActiveWorkout})=>(
  <nav aria-label="Primary" style={{display:"flex",borderTop:`1px solid ${C.bd}`,background:C.cd,position:"fixed",bottom:0,left:0,right:0,zIndex:100,maxWidth:520,margin:"0 auto",boxShadow:C.sh,paddingBottom:"var(--safe-b)"}}>
    {TABS.map(t=>{const on=active===t.id;return(
      <button type="button" key={t.id} aria-current={on?"page":undefined} onClick={()=>{if(!on)haptic(6);set(t.id);}} style={{
        flex:1,padding:"8px 2px 6px",background:"transparent",border:"none",cursor:"pointer",
        color:on?C.p:C.t3,fontFamily:"inherit",position:"relative",minHeight:"var(--tabbar-h)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3,
      }}>
        <span style={{position:"absolute",top:-1,left:"24%",right:"24%",height:2,background:on?C.p:"transparent",borderRadius:2}}/>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={on?2.2:1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={TAB_ICONS[t.id]}/></svg>
        <span style={{fontSize:11,fontFamily:FD,textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:800}}>{t.l}</span>
        {t.id==="training"&&hasActiveWorkout&&!on&&(
          <span style={{position:"absolute",top:7,right:"50%",marginRight:-20,width:9,height:9,borderRadius:5,background:C.g,border:`2px solid ${C.cd}`}}/>
        )}
      </button>);})}
  </nav>
);

// ═══ WORKOUT TIMER BAR ═══
const readRestTimer=()=>{try{const s=JSON.parse(localStorage.getItem(REST_TIMER_KEY));return s?.endTime>Date.now()?Math.ceil((s.endTime-Date.now())/1000):0;}catch{return 0;}};
const WorkoutTimerBar=({workout,onTap,compact,programDays})=>{
  const [elapsed,setElapsed]=useState(0);
  const [restLeft,setRestLeft]=useState(0);
  useEffect(()=>{
    if(!workout)return;
    const tick=()=>{setElapsed(Math.floor((Date.now()-workout.start)/1000));setRestLeft(readRestTimer());};
    tick();const iv=setInterval(tick,1000);
    return()=>clearInterval(iv);
  },[workout]);
  if(!workout)return null;
  const sess=workout.manual?{name:"Manual Session"}:(programDays||PROG.days)[workout.day];
  const done=workout.exercises.reduce((a,e)=>a+e.sets.filter(x=>x.done).length,0);
  const total=workout.exercises.reduce((a,e)=>a+e.sets.length,0);
  return(
    <div onClick={onTap} role={onTap?"button":undefined} style={{background:C.p,padding:compact?"8px 14px":"9px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:onTap?"pointer":"default",borderRadius:compact?8:0,boxShadow:C.sh}}>
      <div style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}>
        <div style={{width:8,height:8,borderRadius:8,background:C.g,animation:"pulse 2s infinite",flexShrink:0}}/>
        <span style={{color:C.oa,fontSize:14,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{sess?.name||"Workout"}</span>
        <span style={{color:"var(--on-accent-dim)",fontSize:12,fontWeight:700,fontFamily:FD,whiteSpace:"nowrap"}}>{done}/{total} SETS</span>
      </div>
      <div style={{display:"flex",alignItems:"baseline",gap:10}}>
        {restLeft>0&&<span style={{color:C.oa,fontSize:12,fontWeight:800,fontFamily:FD,letterSpacing:"0.06em"}}>REST {Math.floor(restLeft/60)}:{String(restLeft%60).padStart(2,"0")}</span>}
        <span style={{color:C.oa,fontSize:20,fontWeight:700,fontFamily:FD,fontVariantNumeric:"tabular-nums"}}>{fmtElapsed(elapsed)}</span>
      </div>
    </div>
  );
};

// ═══ APP ═══
const TabPane=({active,children})=>{
  // Keep-alive: a tab mounts on first visit and then stays mounted (hidden), so
  // stretch/cardio/rest timers keep running while you glance at Food or Scale.
  const visited=useRef(false);if(active)visited.current=true;
  if(!visited.current)return null;
  return <div hidden={!active} className={active?"hh-fade":undefined}>{children}</div>;
};

export { TABS, TabBar, WorkoutTimerBar, TabPane };
