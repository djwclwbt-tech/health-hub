const { useState, useEffect, useRef, useCallback } = React;
import { PROG, shortLiftName, cutStepsTarget, DEFAULTS, lds, td, dw, fmt, wkn, estTime, getDayCalTarget, getTrend, resolveMode, getAutoregProposal } from "../../lib/engine.mjs";
import { CloseoutPanel, SYSTEM_HABITS } from "../cards/CloseoutPanel.jsx";
import { ScalePad } from "../cards/ScalePad.jsx";
import { WeightTrendCard } from "../cards/WeightTrendCard.jsx";
import { haptic } from "../core/device.js";
import { WATER_PRESETS, waterOps } from "../core/hooks.js";
import { useBackClose } from "../core/nav.js";
import { sv, svSB } from "../core/storage.js";
import { C, FD } from "../core/theme.js";
import { B, Br, S, X } from "../ui/atoms.jsx";
import { Dashboard } from "../views/ClassicDashboard.jsx";

// ═══ THREE MOMENTS SHELL ═══
// Boot resolves a mode from the clock + today's state. ?clock=07:00 simulates
// the time and &day=monday the weekday (mode logic only) for testing.
const clockParam=()=>{try{const v=new URLSearchParams(location.search).get("clock");const m=v&&v.match(/^(\d{1,2}):(\d{2})$/);return m?+m[1]+(+m[2])/60:null;}catch{return null;}};
const dayParam=()=>{try{const v=new URLSearchParams(location.search).get("day");return ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"].includes(v)?v:null;}catch{return null;}};
const nowHM=()=>{const c=clockParam();if(c!=null)return c;const d=new Date();return d.getHours()+d.getMinutes()/60;};

const MODE_LABELS={morning:"Morning",session:"Session",closeout:"Closeout",neutral:"Home"};
const Moments=({data,setData,setTab,workout,addToast})=>{
  const [nowTick,setNowTick]=useState(0);
  useEffect(()=>{const iv=setInterval(()=>setNowTick(x=>x+1),60000);return()=>clearInterval(iv);},[]);
  const [override,setOverride]=useState(null);
  const [showClassic,setShowClassic]=useState(false);
  useBackClose(showClassic,()=>setShowClassic(false));
  const [wIn,setWIn]=useState("");
  const [allergies,setAllergies]=useState(null);
  const [allergyErr,setAllergyErr]=useState("");
  useEffect(()=>{let dead=false;(async()=>{try{const r=await fetch("/api/allergies");const d=await r.json();if(dead)return;if(r.ok)setAllergies(d);else setAllergyErr(d.error||"unavailable");}catch(e){if(!dead)setAllergyErr("unavailable");}})();return()=>{dead=true};},[]);
  const t=td();
  const dayName=dayParam()||dw(t);
  const mode=override||resolveMode(data,t,workout,nowHM(),dayName);
  const trend=getTrend(data.wt,t);
  const rec=data.rec?.[t];
  const sess=data.program?.[dayName];
  const st=data.settings||DEFAULTS;
  const yesterdayWt=(()=>{const e=Object.entries(data.wt||{}).filter(([d])=>d<t).sort((a,b)=>b[0].localeCompare(a[0]));return e[0]?.[1]||null;})();
  const waterToday=data.water?.[t]||0;
  const {add:addWater}=waterOps(setData,t);
  const logWeight=()=>{if(!wIn)return;const v=Number(wIn);const nd={...data,wt:{...data.wt,[t]:v}};setData(nd);sv(nd);svSB.weight(t,v);setWIn("");setOverride(null);haptic(20);if(addToast)addToast(`Logged ${v.toFixed(1)}`,"success");};

  const autoreg=getAutoregProposal(rec);
  const adj=data.autoregLog?.[t];
  const decideAutoreg=(type)=>{
    const entry={type,recovery:autoreg?.score??null,at:new Date().toISOString()};
    const nd={...data,autoregLog:{...(data.autoregLog||{}),[t]:entry},debrief:{...data.debrief,[t]:true}};
    setData(nd);sv(nd);svSB.debrief(t);
    if(addToast&&type!=="dismissed")addToast(type==="minusOneSet"?"Today: −1 set on non-anchor accessories":"Today: mobility session instead","success");
  };

  const dayNameToday=dayParam()||["sunday","monday","tuesday","wednesday","thursday","friday","saturday"][new Date().getDay()];
  const isFastDay=dayNameToday==="wednesday";
  const [fastNow,setFastNow]=useState(Date.now());
  useEffect(()=>{if(!isFastDay)return;const iv=setInterval(()=>setFastNow(Date.now()),30000);return()=>clearInterval(iv);},[isFastDay]);
  const ly=(data.lytes||{})[t]||{na:0,k:0,mg:0};
  const addLyte=(na,k,mg)=>setData(prev=>{const cur=(prev.lytes||{})[t]||{na:0,k:0,mg:0};const nl={na:(cur.na||0)+na,k:(cur.k||0)+k,mg:(cur.mg||0)+mg};const nd={...prev,lytes:{...(prev.lytes||{}),[t]:nl}};sv(nd);svSB.lytes(t,nl);return nd;});
  const lyBtn={border:`1px solid ${C.bd}`,background:C.bg,color:C.t,borderRadius:9,padding:"9px 4px",minHeight:54,cursor:"pointer",fontFamily:FD,fontSize:12,fontWeight:800,lineHeight:1.3,textAlign:"center"};
  const fastCard=isFastDay?(()=>{
    const start=(()=>{const d=new Date(t+"T20:00:00");d.setDate(d.getDate()-1);return d.getTime();})();
    const el=Math.max(0,fastNow-start);
    const hrs=Math.floor(el/3600000),mins=Math.floor((el%3600000)/60000);
    const pct=Math.min(100,Math.round(el/(36*3600000)*100));
    const LY=[{k:"na",l:"SODIUM",target:5000},{k:"k",l:"POTASSIUM",target:3500},{k:"mg",l:"MAGNESIUM",target:400}];
    return(<X style={{padding:16}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:10,fontWeight:700,color:C.t3,letterSpacing:"0.14em",fontFamily:FD}}>FASTED FOR</div>
        <div style={{fontSize:52,fontWeight:800,color:C.p,fontFamily:FD,lineHeight:1.05,fontVariantNumeric:"tabular-nums"}}>{hrs}:{String(mins).padStart(2,"0")}</div>
        <div style={{fontSize:12,color:C.t3,fontWeight:600,marginTop:2}}>Tue dinner to Thu breakfast. 36 hours, zero calories.</div>
        <div style={{height:6,borderRadius:3,background:C.bl,overflow:"hidden",marginTop:10}}><div style={{height:"100%",background:C.p,width:`${pct}%`}}/></div>
        <div style={{display:"flex",gap:5,marginTop:8}}>
          {[{h:12,l:"KETOSIS"},{h:16,l:"DEEP FAST"},{h:24,l:"FULL DAY"},{h:36,l:"REFEED"}].map(m=>{const hit=hrs>=m.h;return(<div key={m.h} style={{flex:1,borderRadius:6,padding:"6px 2px",background:hit?C.gl:C.bg,border:`1px solid ${hit?C.g:C.bd}`}}>
            <div style={{fontSize:13,fontWeight:800,color:hit?C.g:C.t3,fontFamily:FD}}>{m.h}h</div>
            <div style={{fontSize:8,fontWeight:700,letterSpacing:"0.05em",color:hit?C.g:C.t3,fontFamily:FD}}>{m.l}</div>
          </div>);})}
        </div>
      </div>
      <div style={{marginTop:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
          <div style={{fontSize:10,fontWeight:700,color:C.t3,letterSpacing:"0.14em",fontFamily:FD}}>ELECTROLYTES</div>
          <div style={{fontSize:9,fontWeight:700,color:C.t3,fontFamily:FD,letterSpacing:"0.04em"}}>ZERO CALORIES, SO SALT IS THE JOB</div>
        </div>
        {LY.map(x=>{const v=ly[x.k]||0;const full=v>=x.target;return(<div key={x.k} style={{marginTop:7}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,fontWeight:700,color:C.t2,marginBottom:3}}><span style={{fontFamily:FD,letterSpacing:"0.06em"}}>{x.l}</span><span style={{color:full?C.g:C.t,fontVariantNumeric:"tabular-nums",whiteSpace:"nowrap"}}>{v.toLocaleString()} / {x.target.toLocaleString()} mg</span></div>
          <Br v={v} max={x.target} color={full?C.g:C.p} h={6}/>
        </div>);})}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginTop:10}}>
          <button onClick={()=>addLyte(810,400,50)} style={lyBtn}>RE-LYTE<br/><span style={{fontSize:9,color:C.t3,fontWeight:700}}>810 · 400 · 50</span></button>
          <button onClick={()=>addLyte(1150,0,0)} style={lyBtn}>½ TSP SALT<br/><span style={{fontSize:9,color:C.t3,fontWeight:700}}>+1150 SODIUM</span></button>
          <button onClick={()=>addLyte(0,0,120)} style={lyBtn}>MG GLYC.<br/><span style={{fontSize:9,color:C.t3,fontWeight:700}}>+120 MAGNESIUM</span></button>
        </div>
      </div>
    </X>);})():null;
  const ModeChip=({m})=>(
    <button onClick={()=>setOverride(m===mode?null:m)} style={{border:"none",borderBottom:`2px solid ${m===mode?C.p:"transparent"}`,background:"transparent",color:m===mode?C.t:C.t3,padding:"5px 8px",fontSize:11,fontWeight:700,fontFamily:FD,textTransform:"uppercase",letterSpacing:"0.06em",cursor:"pointer"}}>{MODE_LABELS[m]}</button>
  );
  const header=(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:6}}>
      <div style={{fontSize:13,color:C.t3,fontWeight:700}}>{fmt(t)} · Wk {wkn(t)}/{PROG.weeks}</div>
      <div style={{display:"flex",gap:4}}>{["morning","session","closeout","neutral"].map(m=><ModeChip key={m} m={m}/>)}</div>
    </div>
  );

  if(showClassic)return(<div style={{display:"flex",flexDirection:"column",gap:8}}>
    <button type="button" onClick={()=>setShowClassic(false)} style={{background:"none",border:"none",color:C.p,cursor:"pointer",fontSize:14,fontWeight:700,textAlign:"left",padding:"4px 0",minHeight:32}}>← Back to today</button>
    <Dashboard data={data} setData={setData} setTab={setTab} allergies={allergies} allergyErr={allergyErr}/>
  </div>);

  // ── MORNING: full-screen scale pad, ~10 seconds ──
  if(mode==="morning")return(<div style={{display:"flex",flexDirection:"column",gap:10,minHeight:"70vh"}}>
    {header}
    {fastCard}
    <ScalePad compact value={wIn} onChange={setWIn} onLog={logWeight} todayLogged={data.wt?.[t]!=null?data.wt[t]:null} yesterdayWt={yesterdayWt}
      hint={trend?<span style={{fontSize:13,fontWeight:700,color:trend.direction==="down"?C.g:trend.direction==="up"?C.r:C.t2}}>{trend.message} · {trend.n} weigh-ins in 14d</span>:"type it like the scale shows it"}/>
    <X style={{padding:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:13,fontWeight:700,color:C.t}}>Water <span style={{color:C.p,fontWeight:800}}>{waterToday}</span><span style={{color:C.t3}}> / {st.water} oz</span></div>
        <div style={{display:"flex",gap:6}}>{[24,32,64].map(oz=><button type="button" key={oz} onClick={()=>{haptic();addWater(oz);}} style={{background:"transparent",border:`1px solid ${C.bd}`,color:C.t,borderRadius:8,padding:"7px 12px",minHeight:40,fontSize:13,fontWeight:800,fontFamily:FD,cursor:"pointer"}}>+{oz}</button>)}</div>
      </div>
    </X>
  </div>);

  // ── SESSION: today's workout only + auto-regulation ──
  if(mode==="session"){
    const nonAnchor=(sess?.exercises||[]).filter(e=>!e.anchor).length;
    return(<div style={{display:"flex",flexDirection:"column",gap:10}}>
      {header}
    {fastCard}
      <X style={{padding:12,borderLeft:`4px solid ${rec?.recoveryScore!=null?(rec.recoveryScore>=60?C.g:rec.recoveryScore>=40?C.bd:C.r):C.bd}`}}>
        <div style={{fontSize:12,fontWeight:700,color:C.t3}}>Recovery{rec?.source==="oura"?" · Oura":""}</div>
        {rec?.recoveryScore!=null?(
          <div style={{fontSize:14,fontWeight:800,color:C.t,marginTop:2}}>{rec.recoveryScore}%{rec.hrv?` · HRV ${rec.hrv}`:""}{rec.rhr?` · RHR ${rec.rhr}`:""}{rec.sleepHours?` · ${rec.sleepHours}h sleep`:""}</div>
        ):<div style={{fontSize:13,color:C.t3,marginTop:2}}>No recovery data yet today.</div>}
        {autoreg&&!adj&&(()=>{
          const accs=(sess?.exercises||[]).filter(e=>!e.anchor);
          const anchors=(sess?.exercises||[]).filter(e=>e.anchor);
          const before=(sess?.exercises||[]).reduce((s,e)=>s+e.sets,0);
          const after=before-accs.length;
          const names=accs.map(e=>shortLiftName(e.name).toLowerCase()).join(", ");
          const mob=autoreg.score<40;
          return(
          <div style={{marginTop:10,padding:16,borderRadius:12,background:C.cd,border:`1px solid ${C.p}`,boxShadow:C.sh2}}>
            <div style={{fontSize:10,fontWeight:700,color:C.p,letterSpacing:"0.14em",fontFamily:FD}}>{mob?"RECOVERY UNDER 40 · PROPOSAL":"RECOVERY UNDER 60 · PROPOSAL"}</div>
            {mob?(<React.Fragment>
              <div style={{fontSize:14,fontWeight:600,color:C.t,marginTop:6,lineHeight:1.5}}>Swap today's session for the 12 minute mobility routine and a walk.</div>
              <div style={{fontSize:11.5,color:C.t3,marginTop:4,lineHeight:1.5}}>Recovery is deep in the red. Lifting waits one day. The program is untouched.</div>
              <div style={{display:"flex",gap:8,marginTop:12}}>
                <button onClick={()=>decideAutoreg("mobilitySwap")} style={{flex:1,minHeight:48,border:"none",background:C.p,color:C.oa,borderRadius:9,fontFamily:FD,fontSize:15,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.06em",cursor:"pointer"}}>Take the swap</button>
                <button onClick={()=>decideAutoreg("dismissed")} style={{flex:1,minHeight:48,border:`1px solid ${C.bd}`,background:C.cd,color:C.t3,borderRadius:9,fontFamily:FD,fontSize:14,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",cursor:"pointer"}}>As written</button>
              </div>
            </React.Fragment>):(<React.Fragment>
              <div style={{fontSize:14,fontWeight:600,color:C.t,marginTop:6,lineHeight:1.5}}>Drop 1 set from each accessory{names?`: ${names}`:""}.{anchors.length?` ${anchors.map(e=>shortLiftName(e.name)).join(" and ")} stays as written.`:""}</div>
              <div style={{fontSize:11.5,color:C.t3,marginTop:4,lineHeight:1.5}}>{before} sets become {after}. Same weights, same goals. Today only. The program is untouched.</div>
              {accs.length>0&&<div style={{display:"flex",flexDirection:"column",gap:5,marginTop:10}}>
                {(sess?.exercises||[]).map(e=>{const rr=e.rr||[8,12];return(
                  <div key={e.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,background:C.bg,borderRadius:8,padding:"8px 10px"}}>
                    <span style={{fontSize:12.5,fontWeight:600,color:C.t}}>{e.name}{e.anchor?<span style={{fontSize:9,fontWeight:800,fontFamily:FD,background:C.t,color:C.cd,borderRadius:3,padding:"2px 5px",marginLeft:5}}>ANCHOR</span>:null}</span>
                    <span style={{fontSize:12,fontWeight:700,fontFamily:FD,color:C.t3,whiteSpace:"nowrap"}}>{e.anchor?`${e.sets} × ${rr[0]}${rr[1]>rr[0]?"-"+rr[1]:""}`:<React.Fragment><s style={{opacity:0.5}}>{e.sets}</s> {e.sets-1} × {rr[0]}{rr[1]>rr[0]?"-"+rr[1]:""}</React.Fragment>}</span>
                  </div>);})}
              </div>}
              <div style={{display:"flex",gap:8,marginTop:12}}>
                <button onClick={()=>decideAutoreg("minusOneSet")} style={{flex:1,minHeight:48,border:"none",background:C.p,color:C.oa,borderRadius:9,fontFamily:FD,fontSize:15,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.06em",cursor:"pointer"}}>Take the cut</button>
                <button onClick={()=>decideAutoreg("dismissed")} style={{flex:1,minHeight:48,border:`1px solid ${C.bd}`,background:C.cd,color:C.t3,borderRadius:9,fontFamily:FD,fontSize:14,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",cursor:"pointer"}}>As written</button>
              </div>
            </React.Fragment>)}
          </div>);})()}
        {adj&&adj.type!=="dismissed"&&(
          <div style={{marginTop:8,fontSize:12,fontWeight:700,color:C.p}}>{adj.type==="minusOneSet"?`Accepted: −1 set on ${nonAnchor} non-anchor accessories (today only)`:"Accepted: mobility session today"}</div>
        )}
      </X>
      {adj?.type==="mobilitySwap"?(
        <X style={{padding:16,borderLeft:`4px solid ${C.bd}`}}>
          <div style={{fontSize:16,fontWeight:800,color:C.t}}>Mobility session</div>
          <div style={{fontSize:13,color:C.t2,marginTop:4}}>Recovery-biased day: full stretch block instead of lifting.</div>
          <B full style={{marginTop:10}} onClick={()=>setTab("training")}>Open stretch player</B>
        </X>
      ):sess?(
        <X style={{padding:16,borderLeft:`4px solid ${C.bd}`}}>
          <div style={{fontSize:12,fontWeight:700,color:C.t3}}>Today</div>
          <div style={{fontSize:20,fontWeight:850,color:C.t,marginTop:2}}>{sess.name}</div>
          <div style={{fontSize:13,color:C.t2,marginTop:2}}>{sess.exercises.length} exercises · ~{estTime(sess)} min{data.wk?.[t]?" · logged ✓":""}</div>
          <B full style={{marginTop:12}} onClick={()=>setTab("training")}>{workout?"Resume session":data.wk?.[t]?"View in Train":"Start session"}</B>
        </X>
      ):(
        <X style={{padding:16}}><div style={{fontSize:14,fontWeight:700,color:C.t}}>Rest day · no lift scheduled.</div>
        <B full outline style={{marginTop:10}} onClick={()=>setTab("training")}>Open Train anyway</B></X>
      )}
      <button type="button" onClick={()=>setShowClassic(true)} style={{background:"none",border:`1px solid ${C.bd}`,borderRadius:8,color:C.t2,fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:FD,textTransform:"uppercase",letterSpacing:"0.08em",minHeight:40}}>Full dashboard</button>
    </div>);
  }

  // ── CLOSEOUT: habit chips, tonight's numbers, honest Oura, weekly readout (mocks 2d+3c) ──
  if(mode==="closeout"){
    const tomorrow=(()=>{const d=new Date(t+"T12:00:00");d.setDate(d.getDate()+1);return lds(d);})();
    const tmrSess=data.program?.[dw(tomorrow)];
    const stretchDone=!!(data.mob?.[t]?.done||data.mob?.[t]===true);
    const h=data.habits?.[t]||{};
    const HABIT_LABELS={alcohol:"No alcohol",cannabis:"No cannabis",screensOff:"Screens off",bedBy1030:"Bed by 10:30",supplements:"Supplements",sunlight:"Sunlight",readBeforeBed:"Read in bed"};
    const held=SYSTEM_HABITS.filter(x=>h[x.field]===x.target).length;
    const toggleHabit=(x)=>{
      const nh={...h,[x.field]:h[x.field]===x.target?null:x.target};
      const nd={...data,habits:{...data.habits,[t]:nh}};setData(nd);sv(nd);svSB.habits(t,nh);
    };
    const streak=(()=>{let n=0;for(let i=1;i<60;i++){const d=new Date(t+"T12:00:00");d.setDate(d.getDate()-i);const hd=data.habits?.[lds(d)];if(hd&&SYSTEM_HABITS.every(x=>hd[x.field]===x.target))n++;else break;}return n+(held===7?1:0);})();
    const closed=!!data.debrief?.[t];
    const closeDay=()=>{const nd={...data,debrief:{...data.debrief,[t]:true}};setData(nd);sv(nd);svSB.debrief(t);};
    const st2=data.settings||DEFAULTS;
    const nutT=data.nut?.[t];const calNow=Math.round(nutT?.totalCal||0);const proNow=Math.round(nutT?.totalProtein||0);
    const stepsNow=data.steps?.[t]||0;
    const calTarget=getDayCalTarget(t,st2,data.travelDays,data.socialWeekend);const proTarget=st2.protein||200;const stepsTarget=cutStepsTarget(st2);
    const lastRec=(()=>{const e=Object.entries(data.rec||{}).filter(([_,v])=>v&&v.recoveryScore!=null).sort((a,b)=>b[0].localeCompare(a[0]));return e[0]||null;})();
    const recStale=!lastRec||lastRec[0]<t;
    const rv=lastRec?lastRec[1]:null;
    const week=(()=>{
      const days=[];for(let i=6;i>=0;i--){const d=new Date(t+"T12:00:00");d.setDate(d.getDate()-i);days.push(lds(d));}
      const liftPlanned=days.filter(ds=>{const s=data.program?.[dw(ds)];return s&&(s.exercises||[]).length>0;}).length;
      const liftDone=days.filter(ds=>data.wk?.[ds]).length;
      const proDays=days.filter(ds=>Math.round(data.nut?.[ds]?.totalProtein||0)>=proTarget).length;
      const weighs=days.filter(ds=>data.wt?.[ds]!=null).length;
      const stepMisses=days.filter(ds=>(data.steps?.[ds]||0)>0&&(data.steps?.[ds]||0)<stepsTarget).map(ds=>dw(ds).slice(0,3));
      return{liftPlanned,liftDone,proDays,weighs,stepMisses};
    })();
    const wkTrend=trend?`${trend.rate>0?"+":""}${trend.rate} lb/wk`:null;
    const verdict=(()=>{
      const pace=trend?(trend.rate<-0.4?`A ${Math.abs(trend.rate).toFixed(1)} lb/wk drop`:trend.rate<=0?"Weight is holding":"Weight ticked up"):"Not enough weigh-ins yet";
      const lift=week.liftDone>=week.liftPlanned&&week.liftPlanned>0?"with every lift logged":week.liftDone>0?`with ${week.liftDone} of ${week.liftPlanned} lifts in`:"";
      const leak=week.stepMisses.length?"Steps are the leak.":week.proDays<5?"Protein is the leak.":"No leaks this week.";
      return `${pace} ${lift}. ${leak}`.replace(/\s+/g," ").trim();
    })();
    return(<div style={{display:"flex",flexDirection:"column",gap:10}}>
      {header}
    {fastCard}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
        <div>
          <div style={{fontSize:26,fontWeight:800,color:C.t,fontFamily:FD,textTransform:"uppercase",letterSpacing:"0.03em",lineHeight:1}}>Close the day</div>
          <div style={{fontSize:12,color:C.t3,fontWeight:600,marginTop:3}}>{fmt(t)}{stretchDone?" · stretch done ✓":""}</div>
        </div>
        {streak>0&&<div style={{textAlign:"right"}}><div style={{fontSize:22,fontWeight:800,color:C.g,fontFamily:FD,lineHeight:1}}>{streak}</div><div style={{fontSize:9,fontWeight:700,letterSpacing:"0.1em",color:C.t3,fontFamily:FD}}>CLEAN-DAY STREAK</div></div>}
      </div>
      <X style={{padding:16,boxShadow:C.sh2}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
          <div style={{fontSize:10,fontWeight:700,color:C.t3,letterSpacing:"0.14em",fontFamily:FD}}>CLEAN DAY · {held}/7</div>
          <div style={{fontSize:11,fontWeight:700,color:C.t3,fontFamily:FD}}>tap what held</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginTop:11}}>
          {SYSTEM_HABITS.map(x=>{const on=h[x.field]===x.target;return(
            <button key={x.field} onClick={()=>toggleHabit(x)} style={{minHeight:44,borderRadius:8,border:`1px solid ${on?C.g:C.bd}`,background:on?C.gl:C.cd,color:on?C.g:C.t3,fontFamily:FD,fontSize:13,fontWeight:700,letterSpacing:"0.04em",textTransform:"uppercase",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 12px"}}><span>{HABIT_LABELS[x.field]}</span><span>{on?"✓":"○"}</span></button>
          );})}
        </div>
        <button onClick={closeDay} disabled={closed||held<6} style={{marginTop:12,width:"100%",border:"none",background:closed?C.g:held>=6?C.p:C.bl,color:closed||held>=6?C.oa:C.t3,borderRadius:9,padding:15,fontFamily:FD,fontSize:16,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.08em",cursor:closed||held<6?"default":"pointer"}}>{closed?"Day closed ✓":held>=6?"Close the day":`${held}/7 · tap what held`}</button>
      </X>
      <X style={{padding:16}}>
        <div style={{fontSize:10,fontWeight:700,color:C.t3,letterSpacing:"0.14em",fontFamily:FD}}>TONIGHT'S NUMBERS</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7,marginTop:10}}>
          {[{v:stepsNow?`${(stepsNow/1000).toFixed(1)}k`:"○",l:"STEPS",ok:stepsNow>=stepsTarget},
            {v:calNow?calNow.toLocaleString():"○",l:"CAL",ok:calNow>0&&(calTarget==null||calNow<=calTarget)},
            {v:proNow?`${proNow}g`:"○",l:"PROTEIN",ok:proNow>=proTarget}].map(x=>(
            <div key={x.l} style={{background:C.bg,borderRadius:8,padding:"10px 6px",textAlign:"center"}}>
              <div style={{fontSize:20,fontWeight:800,color:C.t,fontFamily:FD}}>{x.v}</div>
              <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.08em",color:x.ok?C.g:C.t3,fontFamily:FD}}>{x.l}{x.ok?" ✓":""}</div>
            </div>))}
        </div>
        <div style={{fontSize:11.5,color:C.t3,marginTop:9}}>Cronometer and HAE fill these overnight. Type only what is missing.</div>
        <S title="Manual entry" collapsible defaultOpen={false}><CloseoutPanel data={data} setData={setData}/></S>
      </X>
      <X style={{padding:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
          <div style={{fontSize:10,fontWeight:700,color:C.t3,letterSpacing:"0.14em",fontFamily:FD}}>RECOVERY · OURA</div>
          {recStale&&lastRec?<div style={{fontSize:11,fontWeight:700,color:C.t3,fontFamily:FD}}>LAST WORN {fmt(lastRec[0]).toUpperCase()}</div>:null}
        </div>
        {rv?(<React.Fragment>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:7,marginTop:10,opacity:recStale?0.55:1}}>
            {[[rv.recoveryScore!=null?`${rv.recoveryScore}%`:"○","RECOVERY"],[rv.hrv?Math.round(rv.hrv):"○","HRV"],[rv.rhr?Math.round(rv.rhr):"○","RHR"],[rv.sleepHours?`${Math.floor(rv.sleepHours)}:${String(Math.round((rv.sleepHours%1)*60)).padStart(2,"0")}`:"○","SLEEP"]].map(([v,l])=>(
              <div key={l} style={{background:C.bg,borderRadius:8,padding:"9px 4px",textAlign:"center"}}><div style={{fontSize:19,fontWeight:800,color:C.t,fontFamily:FD}}>{v}</div><div style={{fontSize:9,fontWeight:700,letterSpacing:"0.06em",color:C.t3,fontFamily:FD}}>{l}</div></div>))}
          </div>
          {recStale&&<div style={{fontSize:11.5,lineHeight:1.5,color:C.t3,marginTop:9}}>The ring is off. The numbers dim and pause. Nothing breaks. Wear it tonight and tomorrow's session adjusts to recovery again.</div>}
        </React.Fragment>):(<div style={{fontSize:12,color:C.t3,marginTop:8}}>No recovery data yet.</div>)}
      </X>
      <X style={{padding:16}}>
        <div style={{fontSize:10,fontWeight:700,color:C.t3,letterSpacing:"0.14em",fontFamily:FD}}>WEEK {wkn(t)} · WHAT THE LOG SAYS</div>
        <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:10}}>
          {[
            {ok:week.liftPlanned>0&&week.liftDone>=week.liftPlanned,txt:`Lifts ${week.liftDone}/${week.liftPlanned||0} logged this week`},
            {ok:week.proDays>=5,txt:`Protein floor hit ${week.proDays} of 7 days`},
            {ok:week.weighs>=5,txt:`Weigh-ins ${week.weighs}/7${wkTrend?` · trend ${wkTrend}`:""}`},
            {ok:week.stepMisses.length===0,txt:week.stepMisses.length?`Steps under ${Math.round(stepsTarget/1000)}k ${week.stepMisses.join(" & ")}`:"Steps target held all week"},
          ].map((x,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:9}}>
              <span style={{flexShrink:0,width:20,fontSize:14,fontWeight:800,fontFamily:FD,color:x.ok?C.g:C.t3,textAlign:"center"}}>{x.ok?"✓":"○"}</span>
              <span style={{fontSize:12.5,fontWeight:600,color:x.ok?C.t:C.t3,flex:1}}>{x.txt}</span>
            </div>))}
        </div>
        <div style={{marginTop:11,background:C.pl,borderRadius:8,padding:"10px 12px",fontSize:12.5,lineHeight:1.5,fontWeight:600,color:C.t}}>{verdict}</div>
      </X>
      <X style={{padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:10,fontWeight:700,color:C.t3,letterSpacing:"0.14em",fontFamily:FD}}>TOMORROW</div>
          <div style={{fontSize:15,fontWeight:700,color:C.t,marginTop:3}}>{tmrSess?tmrSess.name:"Rest day · steps + protein floor"}</div>
        </div>
        <div style={{fontSize:13,fontWeight:800,color:C.p,fontFamily:FD,textTransform:"uppercase"}}>{dw(tomorrow).slice(0,3)}</div>
      </X>
      {!stretchDone&&<X style={{padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:13,fontWeight:700,color:C.t}}>Evening stretch · ~12 min</div>
        <B small onClick={()=>setTab("training")}>Start</B>
      </X>}
      <button type="button" onClick={()=>setShowClassic(true)} style={{background:"none",border:`1px solid ${C.bd}`,borderRadius:8,color:C.t2,fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:FD,textTransform:"uppercase",letterSpacing:"0.08em",minHeight:40}}>Full dashboard</button>
    </div>);
  }

  // ── NEUTRAL: full home. One NOW card, loop strip, water, trend. ──
  const nowAction=(()=>{
    const weightLogged=!!data.wt?.[t];
    const nutLogged=!!(data.nut?.[t]?.meals?.length);
    const liftPlanned=!!sess,liftDone=!!data.wk?.[t];
    const cardioDone=!!data.cardio?.[t]?.done;
    const closed=!!data.habits?.[t];
    const na=!weightLogged?{label:"Log weight",ov:"morning",hint:"Morning scale anchors the cut."}
      :!nutLogged?{label:"Log first meal",tab:"nutrition",hint:"Protein floor first. Rough logs count."}
      :(liftPlanned&&!liftDone)?{label:"Start session",tab:"training",hint:sess.name}
      :!cardioDone?{label:"Log cardio",tab:"training",hint:"Zone 2 or a walk keeps the deficit honest."}
      :!closed?{label:"Close the day",ov:"closeout",hint:"Habits, then done."}
      :{label:"Day closed",ov:"closeout",hint:"Everything is logged. Go live your life."};
    return {...na,loops:[{l:"SCALE",ok:weightLogged},{l:"FOOD",ok:nutLogged},{l:"LIFT",ok:!liftPlanned||liftDone},{l:"CARDIO",ok:cardioDone},{l:"CLOSE",ok:closed}]};
  })();
  return(<div style={{display:"flex",flexDirection:"column",gap:10}}>
    {header}
    {fastCard}
    <X style={{padding:16,boxShadow:C.sh}}>
      <div style={{fontSize:10,fontWeight:700,color:C.p,letterSpacing:"0.14em",fontFamily:FD}}>NOW</div>
      <div style={{fontSize:22,fontWeight:800,color:C.t,marginTop:3,fontFamily:FD,textTransform:"uppercase",letterSpacing:"0.02em"}}>{nowAction.label}</div>
      <div style={{fontSize:13,color:C.t2,marginTop:2}}>{nowAction.hint}</div>
      <button onClick={()=>nowAction.tab?setTab(nowAction.tab):setOverride(nowAction.ov)} style={{marginTop:12,width:"100%",border:"none",borderRadius:9,background:C.p,color:C.oa,padding:"15px 16px",fontSize:16,fontWeight:800,fontFamily:FD,textTransform:"uppercase",letterSpacing:"0.06em",boxShadow:C.sh2,cursor:"pointer",minHeight:52}}>{nowAction.label}</button>
    </X>
    <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:5}}>
      {nowAction.loops.map(x=>(
        <div key={x.l} style={{textAlign:"center",padding:"9px 2px",borderRadius:8,background:C.cd,border:`1px solid ${C.bd}`}}>
          <div style={{fontSize:15,fontWeight:800,color:x.ok?C.g:C.t3}}>{x.ok?"✓":"○"}</div>
          <div style={{fontSize:9,fontWeight:800,color:C.t3,fontFamily:FD,letterSpacing:"0.08em"}}>{x.l}</div>
        </div>
      ))}
    </div>
    <X style={{padding:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:7}}>
        <div style={{fontSize:11,fontWeight:800,color:C.t3,fontFamily:FD,letterSpacing:"0.1em"}}>WATER</div>
        <div style={{fontSize:20,fontWeight:800,color:waterToday>=st.water?C.g:C.p,fontFamily:FD}}>{waterToday}<span style={{fontSize:13,color:C.t3,fontWeight:700}}> / {st.water} oz</span></div>
      </div>
      <Br v={waterToday} max={st.water} color={waterToday>=st.water?C.g:C.p} h={7}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginTop:9}}>
        {WATER_PRESETS.map(b=><button type="button" key={b.oz} onClick={()=>{haptic();addWater(b.oz);}} style={{border:`1px solid ${C.bd}`,background:C.bg,color:C.t,borderRadius:9,padding:"10px 4px",minHeight:58,cursor:"pointer",fontFamily:FD}}><span style={{display:"block",fontSize:21,fontWeight:800,lineHeight:1}}>+{b.oz}</span><span style={{display:"block",fontSize:9,fontWeight:700,letterSpacing:"0.08em",color:C.t3,marginTop:3}}>{b.l}</span></button>)}
      </div>
    </X>
    {trend?<WeightTrendCard trend={trend} compact/>:(
      <X style={{padding:14}}><div style={{fontSize:13,color:C.t3}}>Log a couple of weigh-ins to see your trend.</div></X>
    )}
    <X style={{padding:"9px 12px"}}>
      <div style={{fontSize:12,color:C.t2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
        <b style={{color:C.t3,fontSize:11}}>Allergies</b>{" "}
        {(allergies?.summary||[]).slice(0,3).length?(allergies.summary.slice(0,3).map(a=>`${a.name} ${a.level||"○"}`).join(" · ")):allergyErr||"Loading…"}
      </div>
    </X>
    <button type="button" onClick={()=>setShowClassic(true)} style={{background:"none",border:`1px solid ${C.bd}`,borderRadius:8,color:C.t2,fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:FD,textTransform:"uppercase",letterSpacing:"0.08em",minHeight:40}}>Full dashboard</button>
  </div>);
};

export { Moments };
