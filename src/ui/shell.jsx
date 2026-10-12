const { useState, useEffect, useRef, useCallback } = React;
import { PROG, fmtElapsed } from "../../lib/engine.mjs";
import { haptic } from "../core/device.js";
import { REST_TIMER_KEY } from "../core/storage.js";
import { C, FD } from "../core/theme.js";

// ═══ TAB BAR ═══
// Four text tabs. The active one is ink with a short line above it; ember is
// kept for "now" and the main action, so it never marks a tab. Ids stay the
// old ones so deep links (?tab=training) and notification taps keep working.
const TABS=[{id:"dashboard",l:"Today"},{id:"training",l:"Train"},{id:"weight",l:"Trends"},{id:"settings",l:"You"}];
const TabBar=({active,set,hasActiveWorkout})=>(
  <nav aria-label="Primary" style={{display:"flex",borderTop:`1px solid ${C.bd}`,background:"color-mix(in srgb, var(--bg) 88%, transparent)",backdropFilter:"blur(18px)",WebkitBackdropFilter:"blur(18px)",position:"fixed",bottom:0,left:0,right:0,zIndex:100,maxWidth:520,margin:"0 auto",padding:"0 12px var(--safe-b)"}}>
    {TABS.map(t=>{const on=active===t.id;return(
      <button type="button" key={t.id} aria-current={on?"page":undefined} onClick={()=>{if(!on)haptic(6);set(t.id);}} style={{
        flex:1,background:"transparent",border:"none",cursor:"pointer",color:on?C.t:C.t3,position:"relative",minHeight:"var(--tabbar-h)",
        display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-start",paddingTop:10,gap:8,fontSize:15,fontWeight:500,
      }}>
        <span aria-hidden="true" style={{width:18,height:2,borderRadius:1,background:on?C.t:"transparent"}}/>
        <span style={{position:"relative"}}>{t.l}
          {t.id==="training"&&hasActiveWorkout&&!on&&<span aria-label="Workout in progress" style={{position:"absolute",top:-1,right:-9,width:6,height:6,borderRadius:3,background:C.p}}/>}
        </span>
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
                <span style={{color:C.oa,fontSize:16,fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{sess?.name||"Workout"}</span>
        <span style={{color:"var(--on-accent-dim)",fontSize:15,whiteSpace:"nowrap",fontVariantNumeric:"tabular-nums"}}>{done} of {total} sets</span>
      </div>
      <div style={{display:"flex",alignItems:"baseline",gap:10}}>
        {restLeft>0&&<span style={{color:C.oa,fontSize:15,fontVariantNumeric:"tabular-nums"}}>Rest {Math.floor(restLeft/60)}:{String(restLeft%60).padStart(2,"0")}</span>}
        <span style={{color:C.oa,fontSize:19,fontWeight:500,fontVariantNumeric:"tabular-nums"}}>{fmtElapsed(elapsed)}</span>
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
