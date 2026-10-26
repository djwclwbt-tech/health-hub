const { useState, useEffect, useRef } = React;
import { STRETCH_POSES, fmtElapsed } from "../../../lib/engine.mjs";
import { haptic } from "../../core/device.js";
import { C } from "../../core/theme.js";

// ═══ STRETCH PLAYER · one pose at a time, timer drives the flow ═══
// Phases: ready (waiting for Start) → hold (timer) → prep (5 s get-ready) →
// hold … Once you start, it keeps going on its own; pause, +15 s, skip side,
// skip pose and previous are always one tap away. Progress (pose, side,
// marks) is merged into the dhub6_mob_active key so a reload resumes it.
const MOB_KEY="dhub6_mob_active";
const PREP_S=5;
const NUM={fontVariantNumeric:"tabular-nums"};
const readSaved=()=>{try{return JSON.parse(localStorage.getItem(MOB_KEY))||{};}catch{return {};}};
const fmtS=s=>s>=60?`${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`:`${s}`;

const Pose=({id,size=168})=>{
  const P=STRETCH_POSES[id];if(!P)return null;
  return(<svg viewBox="0 0 72 56" width={size} height={size*0.78} aria-hidden="true" style={{display:"block",margin:"0 auto"}}>
    <line x1="4" y1="52" x2="68" y2="52" stroke={C.bd} strokeWidth="1.5" strokeLinecap="round"/>
    {P.prop&&<path d={P.prop} fill={C.bl} stroke="none"/>}
    <path d={P.pose} fill="none" stroke={C.t} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    {P.hl&&<path d={P.hl} fill="none" stroke={C.p} strokeWidth="3.5" strokeLinecap="round"/>}
    <circle cx={P.hx} cy={P.hy} r="4" fill={C.t}/>
  </svg>);
};

const StretchPlayer=({exercises,startedAt,onFinish,onSkipDay,onHide})=>{
  const saved=readSaved();
  const [pos,setPos]=useState({ex:saved.ex||0,side:saved.side||0});
  const [marks,setMarks]=useState(saved.marks||{});       // "ex-side" → "done" | "skip"
  const [phase,setPhase]=useState("ready");
  const [left,setLeft]=useState(0);
  const [, setTick]=useState(0);
  const endRef=useRef(0),pausedRef=useRef(0);

  const ex=exercises[pos.ex];
  const key=(e,s)=>`${e}-${s}`;
  const allSides=exercises.flatMap((e,ei)=>e.sides.map((_,si)=>key(ei,si)));
  const handled=allSides.filter(k=>marks[k]).length;
  const doneCount=allSides.filter(k=>marks[k]==="done").length;
  const finished=handled>=allSides.length;
  const secsLeft=exercises.reduce((a,e,ei)=>a+e.sides.reduce((b,_,si)=>b+(marks[key(ei,si)]?0:e.dur),0),0);

  useEffect(()=>{try{localStorage.setItem(MOB_KEY,JSON.stringify({...readSaved(),ex:pos.ex,side:pos.side,marks}));}catch{}},[pos,marks]);
  // Keep the screen on while the player is open.
  useEffect(()=>{if(!("wakeLock" in navigator))return;let lock=null,dead=false;
    const get=async()=>{if(dead||document.visibilityState!=="visible")return;try{lock=await navigator.wakeLock.request("screen");}catch{}};
    get();const onVis=()=>{if(document.visibilityState==="visible")get();};document.addEventListener("visibilitychange",onVis);
    return()=>{dead=true;document.removeEventListener("visibilitychange",onVis);try{lock?.release();}catch{}};},[]);

  const nextOpen=(from,m)=>{ // first unhandled side after `from`, wrapping to any earlier gap
    const flat=exercises.flatMap((e,ei)=>e.sides.map((_,si)=>({ex:ei,side:si})));
    const at=flat.findIndex(p=>p.ex===from.ex&&p.side===from.side);
    return flat.slice(at+1).find(p=>!m[key(p.ex,p.side)])||flat.find(p=>!m[key(p.ex,p.side)])||null;
  };
  const hold=(p=pos)=>{endRef.current=Date.now()+exercises[p.ex].dur*1000;setLeft(exercises[p.ex].dur);setPhase("hold");};
  const prep=()=>{endRef.current=Date.now()+PREP_S*1000;setLeft(PREP_S);setPhase("prep");};
  const move=(m,keepGoing)=>{const nx=nextOpen(pos,m);setMarks(m);
    if(!nx){setPhase("ready");return;}
    setPos(nx);if(keepGoing)prep();else setPhase("ready");};

  // The clock reads wall time each tick, so a locked phone catches up on wake.
  const live=useRef({});live.current={phase,finishSide:()=>move({...marks,[key(pos.ex,pos.side)]:"done"},true),hold};
  useEffect(()=>{const iv=setInterval(()=>{setTick(x=>x+1);const L=live.current;
    if((L.phase!=="hold"&&L.phase!=="prep")||!endRef.current)return;
    const l=Math.ceil((endRef.current-Date.now())/1000);
    if(l>0){setLeft(l);return;}
    endRef.current=0;
    if(L.phase==="prep")L.hold();else{haptic([200,100,200]);L.finishSide();}
  },250);return()=>clearInterval(iv);},[]);

  const running=phase==="hold"||phase==="prep";
  const skipSide=()=>{haptic(8);move({...marks,[key(pos.ex,pos.side)]:"skip"},running);};
  const skipPose=()=>{haptic(8);const m={...marks};ex.sides.forEach((_,si)=>{if(!m[key(pos.ex,si)])m[key(pos.ex,si)]="skip";});
    const nx=exercises.findIndex((e,ei)=>ei>pos.ex&&e.sides.some((_,si)=>!m[key(ei,si)]));
    setMarks(m);if(nx<0){move(m,false);return;}setPos({ex:nx,side:0});if(running)prep();else setPhase("ready");};
  const prev=()=>{const flat=exercises.flatMap((e,ei)=>e.sides.map((_,si)=>({ex:ei,side:si})));
    const at=flat.findIndex(p=>p.ex===pos.ex&&p.side===pos.side);if(at<=0)return;const p=flat[at-1];
    const m={...marks};delete m[key(p.ex,p.side)];setMarks(m);setPos(p);setPhase("ready");endRef.current=0;};
  const jump=(ei)=>{const si=exercises[ei].sides.findIndex((_,s)=>!marks[key(ei,s)]);
    const m={...marks};if(si<0)exercises[ei].sides.forEach((_,s)=>delete m[key(ei,s)]);setMarks(m);
    setPos({ex:ei,side:Math.max(0,si)});setPhase("ready");endRef.current=0;};
  const pause=()=>{pausedRef.current=phase==="hold"?left:0;endRef.current=0;setPhase(phase==="hold"?"paused":"ready");};
  const resume=()=>{endRef.current=Date.now()+pausedRef.current*1000;setPhase("hold");};
  const plus=()=>{if(phase==="hold")endRef.current+=15000;else if(phase==="paused")pausedRef.current+=15;setLeft(l=>l+15);};

  const quiet={minHeight:48,border:`1px solid ${C.bd}`,borderRadius:9,background:C.cd,color:C.t,fontSize:17,fontWeight:500,cursor:"pointer",flex:1,...NUM};
  const main={...quiet,border:"none",background:C.p,color:C.oa};
  const link={background:"none",border:"none",color:C.t3,fontSize:15,cursor:"pointer",padding:"10px 8px",minHeight:40};
  const elapsed=Math.max(0,Math.floor((Date.now()-(startedAt||Date.now()))/1000));
  const holdPct=phase==="hold"||phase==="paused"?1-left/Math.max(1,ex?.dur||1):0;

  return(<div style={{paddingTop:12}}>
    <button type="button" onClick={onHide} style={{...link,padding:"0 0 8px",minHeight:32,color:C.t2,fontSize:16}}>‹ Train</button>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:8}}>
      <h1 style={{fontSize:26,fontWeight:600,letterSpacing:"-0.2px"}}>Evening stretch</h1>
      <span style={{fontSize:17,fontWeight:500,color:C.p,...NUM}}>{fmtElapsed(elapsed)}</span>
    </div>
    <div style={{fontSize:15,color:C.t3,marginTop:4,...NUM}}>{finished?"All poses handled":`Pose ${pos.ex+1} of ${exercises.length} · about ${Math.max(1,Math.round(secsLeft/60))} min left`}</div>
    <div aria-hidden="true" style={{display:"flex",gap:3,marginTop:12}}>
      {exercises.map((e,ei)=>{const st=e.sides.map((_,si)=>marks[key(ei,si)]);const all=st.every(Boolean);const anyDone=st.includes("done");
        return <span key={ei} style={{flex:e.sides.length,height:3,borderRadius:2,background:ei===pos.ex&&!finished?C.p:all?(anyDone?C.t:C.t4):C.bd}}/>;})}
    </div>

    {!finished&&ex&&(<div style={{background:C.cd,border:`1px solid ${C.bd}`,borderRadius:12,padding:"18px 16px 16px",marginTop:16}}>
      <Pose id={ex.id}/>
      <div style={{fontSize:22,fontWeight:600,marginTop:STRETCH_POSES[ex.id]?14:0}}>{ex.name}</div>
      <div style={{fontSize:15,color:C.t3,marginTop:2,...NUM}}>{ex.sides[pos.side]}{ex.sides.length>1?` · ${pos.side+1} of ${ex.sides.length}`:""} · {ex.dur} s</div>
      <div style={{fontSize:16,color:C.t2,marginTop:8,lineHeight:1.5}}>{ex.cue}</div>
      {ex.notes&&<details style={{marginTop:4}}><summary style={{fontSize:15,color:C.t3,cursor:"pointer",padding:"6px 0"}}>Note</summary><div style={{fontSize:15,color:C.t2,lineHeight:1.5}}>{ex.notes}</div></details>}

      <div style={{textAlign:"center",marginTop:14}}>
        <div style={{fontSize:13,color:C.t3,height:16}}>{phase==="prep"?"Get ready":phase==="paused"?"Paused":""}</div>
        <div role="timer" aria-live="off" style={{fontSize:60,fontWeight:500,letterSpacing:"-1px",lineHeight:1.05,color:phase==="ready"?C.t3:C.t,...NUM}}>{fmtS(phase==="ready"?ex.dur:left)}</div>
        <div style={{height:3,background:C.bl,borderRadius:2,marginTop:10,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.round(holdPct*100)}%`,background:C.t,transition:"width .25s linear"}}/></div>
      </div>

      <div style={{display:"flex",gap:8,marginTop:14}}>
        {phase==="ready"&&<button type="button" style={main} onClick={()=>hold()}>Start {ex.dur} s</button>}
        {phase==="hold"&&<><button type="button" style={quiet} onClick={pause}>Pause</button><button type="button" style={quiet} onClick={plus}>+15 s</button></>}
        {phase==="paused"&&<><button type="button" style={main} onClick={resume}>Resume</button><button type="button" style={quiet} onClick={plus}>+15 s</button></>}
        {phase==="prep"&&<><button type="button" style={main} onClick={()=>hold()}>Start now</button><button type="button" style={quiet} onClick={pause}>Pause</button></>}
      </div>
      <div style={{display:"flex",justifyContent:"center",flexWrap:"wrap",marginTop:4}}>
        <button type="button" style={link} onClick={prev}>Previous</button>
        {ex.sides.length>1&&<button type="button" style={link} onClick={skipSide}>Skip {/^(left|right)/i.test(ex.sides[pos.side])?"side":"set"}</button>}
        <button type="button" style={{...link,color:C.t2}} onClick={skipPose}>Skip pose</button>
      </div>
    </div>)}

    <div style={{marginTop:18}}>
      {exercises.map((e,ei)=>{const st=e.sides.map((_,si)=>marks[key(ei,si)]);const all=st.every(Boolean);
        const skipped=all&&!st.includes("done");const cur=ei===pos.ex&&!finished;
        return(<button type="button" key={`${e.id}-${ei}`} onClick={()=>jump(ei)} style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,minHeight:46,borderTop:`1px solid ${C.bd}`,borderLeft:"none",borderRight:"none",borderBottom:ei===exercises.length-1?`1px solid ${C.bd}`:"none",background:"none",cursor:"pointer",textAlign:"left",padding:"0 2px"}}>
          <span style={{fontSize:17,fontWeight:cur?500:400,color:skipped?C.t4:all?C.t3:C.t,textDecoration:skipped?"line-through":"none"}}>{e.name}</span>
          <span style={{fontSize:15,color:all&&!skipped?C.g:cur?C.p:C.t3,whiteSpace:"nowrap",...NUM}}>{skipped?"Skipped":all?"Done":cur?"Now":`${e.sets>1?`${e.sets} × `:""}${e.dur} s`}</span>
        </button>);})}
    </div>

    <button type="button" style={{...(finished?main:quiet),width:"100%",marginTop:18}} onClick={()=>onFinish(doneCount)}>{finished?"Finish stretch":"End early and log"}</button>
    {doneCount===0&&<div style={{textAlign:"center"}}><button type="button" style={link} onClick={onSkipDay}>Skip stretching today</button></div>}
  </div>);
};

export { StretchPlayer, Pose };
