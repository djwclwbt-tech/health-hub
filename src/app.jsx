const { useState, useEffect, useRef, useCallback } = React;
import {PROG, WU, repTrack, rrTxt, progKey, legacyAmbiguousIds, saneSet, sameRepTrack, WED_SUPERSETS, supersetLabel, EXERCISE_LIBRARY, exLibById, SHORT_FILLER, shortLiftName, STRETCH_POSES, weightCap, saneWeight, cutStepsTarget, CUT_HOLD_PROGRESSION, matchingProgKeys, getProgEntry, getProgHistory, getProgPr, relatedPatterns, DINNERS, CARDIO_PRESETS, CARDIO_TYPES, cardioLabel, intensityLabel, cardioSummary, DEFAULTS, bl, migrate, SEED_DATA, seedHistorical, lds, td, yd, dw, fmt, wkn, estTime, fmtElapsed, getDayType, getWeekMonday, isSocialWeekendActive, SOCIAL_CAL, getDayCalTarget, getDayProTarget, PROTEIN_CHECKPOINTS, getWeeklyRecoveryAvg, getAutoregulation, getConsecutiveRedDays, e1rm, calcVolume, completedSets, nextWeightFromSets, BACKFILL_VERSION, backfillData, pruneProgression, repairDeloadProgression, BLOCK_V2_SEEDS, BLOCK_V2_WEIGHT_FIXES, applyBlockV2, getStalls, getTrend, getTopProteinMeals, getInsights, getCutRetentionScore, calcEWMA, median, calcAdaptiveTDEE, getDailyCutAdherence, getWeeklyCutSummary, getWeeklyConsistency, getTonightCloseout, getWeeklyCutRecommendation, BARBELL_IDS, PLATES, plateMath, resolveMode, getAutoregProposal, resolveWeight, lastSessionSets, swapOptions, buildExerciseEntry, buildSession, manualSlot, sessionCursor, applyWorkout, applyChanges, SETTINGS_FIELDS, exerciseReport, sumMeals} from "../lib/engine.mjs";
import { makeClient, toRow, loadAll } from "../lib/supabase.mjs";

const SK="dhub6";
const REST_TIMER_KEY="dhub6_rest_timer";
const NOTIF_SETTINGS_KEY="dhub6_notification_settings";
const ld=()=>{try{return JSON.parse(localStorage.getItem(SK))}catch{return null}};

// ═══ SYNC HEALTH ═══
// HTTP failures (schema/auth) are loud: logged, counted, toasted once per
// table per session. Network blips (request never left the phone: iOS
// backgrounding, dead spots) are transient: recorded quietly, retried, and
// cleared the moment a later write to that table succeeds.
const syncHealth={failures:{},listeners:new Set()};
const reportSyncFailure=(table,status,body,transient=false)=>{
  console.error(`[SB] Sync failed: ${table}`,status,body);
  const first=!syncHealth.failures[table];
  const prev=syncHealth.failures[table]||{n:0};
  // Keep the server's actual error text so Setup can show WHY, not just that.
  let msg=String(body||"").slice(0,200);
  try{const j=JSON.parse(body);msg=j.message||j.error||msg;}catch{}
  syncHealth.failures[table]={n:prev.n+1,msg:`${status||"network"}: ${msg}`,transient:transient&&(prev.transient??true)};
  syncHealth.listeners.forEach(l=>{try{l(table,first);}catch{}});
};
const reportSyncSuccess=(table)=>{
  if(!syncHealth.failures[table])return;
  delete syncHealth.failures[table];
  syncHealth.listeners.forEach(l=>{try{l(table,false);}catch{}});
};
const onSyncFailure=(l)=>{syncHealth.listeners.add(l);return()=>syncHealth.listeners.delete(l);};

const sv=d=>{try{localStorage.setItem(SK,JSON.stringify(d))}catch(e){reportSyncFailure("localStorage",0,String(e));}};
const getNotificationSettings=(fallback=DEFAULTS.notifications)=>{try{return {...DEFAULTS.notifications,...fallback,...(JSON.parse(localStorage.getItem(NOTIF_SETTINGS_KEY))||{})};}catch{return {...DEFAULTS.notifications,...fallback};}};
const saveNotificationSettings=(settings)=>{try{localStorage.setItem(NOTIF_SETTINGS_KEY,JSON.stringify({...DEFAULTS.notifications,...settings}));}catch{}};

// ═══ SUPABASE CLIENT · column mapping lives in lib/supabase.mjs (shared with the Coach) ═══
const sb=makeClient({onFailure:reportSyncFailure,onSuccess:reportSyncSuccess});
const svSB={
  weight:(date,value)=>sb.upsert("weight",toRow.weight(date,value)),
  steps:(date,value)=>sb.upsert("steps",toRow.steps(date,value)),
  water:(date,oz)=>{const n=Math.round(Number(oz)||0);return n>0?sb.upsert("water",toRow.water(date,n)):sb.deleteRow("water","date",date);},
  lytes:(date,l)=>sb.upsert("lytes",toRow.lytes(date,l)),
  recovery:(date,r)=>sb.upsert("recovery",toRow.recovery(date,r)),
  habits:(date,h)=>sb.upsert("habits",toRow.habits(date,h)),
  workout:(date,w)=>sb.upsert("workouts",toRow.workout(date,w)),
  nutrition:(date,n)=>sb.upsert("nutrition",toRow.nutrition(date,n)),
  progression:(exId,p)=>sb.upsert("progression",toRow.progression(exId,p),"exercise_id"),
  debrief:(date)=>sb.upsert("debrief",toRow.debrief(date)),
  mobility:(date,durSecs)=>sb.upsert("mobility",toRow.mobility(date,durSecs)),
  stepper:(date)=>sb.upsert("stepper",toRow.stepper(date)),
  cardio:(date,c)=>sb.upsert("cardio",toRow.cardio(date,c)),
  bodyComp:(date,b)=>sb.upsert("body_comp",toRow.bodyComp(date,b)),
  bodyMeas:(date,m)=>sb.upsert("body_measurements",toRow.bodyMeas(date,m)),
  travelDay:(date,active)=>active?sb.upsert("travel_days",toRow.travelDay(date)):sb.deleteRow("travel_days","date",date),
  tdeeExclude:(date,active)=>active?sb.upsert("tdee_exclude",toRow.tdeeExclude(date)):sb.deleteRow("tdee_exclude","date",date),
  settings:(s)=>sb.upsert("settings",toRow.settings(s),"id"),
  program:(p)=>sb.upsert("program",toRow.program(p),"id"),
  delWeight:(date)=>sb.deleteRow("weight","date",date),
  delStepper:(date)=>sb.deleteRow("stepper","date",date),
  delCardio:(date)=>sb.deleteRow("cardio","date",date),
  delWorkout:(date)=>sb.deleteRow("workouts","date",date),
  delMobility:(date)=>sb.deleteRow("mobility","date",date),
  delWater:(date)=>sb.deleteRow("water","date",date),
};
const loadFromSB=async()=>{
  try{const d=await loadAll(sb);d.settings={...d.settings,notifications:getNotificationSettings(d.settings?.notifications)};return d;}
  catch(e){console.error("[SB] Load error:",e);const empty=bl();empty.__loadError=e.message||String(e);return empty;}
};

const FD="'Barlow Condensed','Barlow',sans-serif";
const C={bg:"var(--bg)",cd:"var(--surface)",bd:"var(--line)",bl:"var(--line)",
  p:"var(--accent)",pl:"var(--accent-soft)",g:"var(--good)",gl:"var(--good-soft)",r:"var(--danger)",rl:"var(--danger-soft)",
  v:"var(--accent)",vl:"var(--accent-soft)",
  t:"var(--ink)",t2:"var(--ink-2)",t3:"var(--muted)",oa:"var(--on-accent)",scrim:"var(--scrim)",
  sh:"var(--shadow)",sh2:"var(--shadow-2)"};

const APP_VERSION=typeof __BUILD__!=="undefined"?__BUILD__:"dev";
const haptic=(pattern=12)=>{try{if(navigator.vibrate)navigator.vibrate(pattern);}catch{}};
const isStandalone=()=>{try{return window.matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;}catch{return false;}};

// ═══ OVERLAY HISTORY ═══
// Every sheet/modal pushes one history entry while open, so the Android back
// button (and browser back) closes the overlay instead of leaving the app.
// history.back() is asynchronous, so a push requested while a back is in flight
// is queued until that popstate lands; otherwise the browser ends one entry short
// and the next back would leave the page.
const navStack=[];const queuedPushes=[];let navSeq=0,ignorePops=0,flushTimer=null;
const pushEntry=(entry)=>{try{history.pushState({hh:entry.id},"");}catch{}};
const flushQueued=()=>{clearTimeout(flushTimer);flushTimer=null;while(queuedPushes.length){const e=queuedPushes.shift();if(navStack.includes(e))pushEntry(e);}};
const requestPush=(entry)=>{if(ignorePops>0){queuedPushes.push(entry);if(!flushTimer)flushTimer=setTimeout(()=>{ignorePops=0;flushQueued();},500);}else pushEntry(entry);};
window.addEventListener("popstate",()=>{
  if(ignorePops>0){ignorePops--;if(ignorePops===0)flushQueued();return;}
  const top=navStack.pop();if(!top)return;top.closing=true;try{top.close();}catch{}
});
const useBackClose=(open,close)=>{
  const ref=useRef(null);
  useEffect(()=>{if(ref.current)ref.current.close=close;});
  useEffect(()=>{
    const release=()=>{const entry=ref.current;if(!entry)return;ref.current=null;
      const idx=navStack.indexOf(entry);if(idx<0)return;navStack.splice(idx,1);
      const qi=queuedPushes.indexOf(entry);if(qi>=0){queuedPushes.splice(qi,1);return;}
      if(!entry.closing&&idx===navStack.length){ignorePops++;try{history.back();}catch{ignorePops--;}}};
    if(open&&!ref.current){const entry={id:++navSeq,close,closing:false};ref.current=entry;navStack.push(entry);requestPush(entry);}
    else if(!open)release();
    return release;
  },[open]);
};

// ═══ WATER · one mutation helper for every surface ═══
const waterOps=(setData,date)=>({
  add:(oz)=>setData(prev=>{const nv=Math.max(0,Math.round((Number(prev.water?.[date])||0)+oz));const water={...(prev.water||{})};if(nv>0)water[date]=nv;else delete water[date];const nd={...prev,water};sv(nd);svSB.water(date,nv);return nd;}),
  reset:()=>setData(prev=>{const water={...(prev.water||{})};delete water[date];const nd={...prev,water};sv(nd);svSB.delWater(date);return nd;}),
});
const WATER_PRESETS=[{oz:24,l:"SMALL BOTTLE"},{oz:32,l:"BIG BOTTLE"},{oz:64,l:"JUG"}];

// ═══ BASE COMPONENTS ═══
const N=({value,onChange,placeholder,style={},min=0,max})=>{
  const handleChange=(e)=>{
    const v=e.target.value;
    if(v===""||v==="."){onChange(v);return;}
    const num=parseFloat(v);
    if(isNaN(num))return;
    if(num<min)return;
    if(max!==undefined&&num>max)return;
    onChange(v);
  };
  return(
  <input type="text" inputMode="decimal" pattern="[0-9.]*" value={value} onChange={handleChange}
    placeholder={placeholder} style={{background:C.cd,border:`1px solid ${C.bd}`,borderRadius:6,padding:"10px 10px",
    color:C.t,fontSize:16,fontWeight:700,width:"100%",boxSizing:"border-box",outline:"none",textAlign:"center",fontFamily:FD,...style}}/>
);};
const T=({value,onChange,placeholder,style={}})=>(
  <input type="text" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
    style={{background:C.cd,border:`1px solid ${C.bd}`,borderRadius:6,padding:"10px 10px",color:C.t,
    fontSize:14,width:"100%",boxSizing:"border-box",outline:"none",fontFamily:"inherit",...style}}/>
);
const B=({children,onClick,color,disabled,full,small,outline,style={}})=>(
  // Filled = accent (or explicit color). Outline with no explicit color =
  // neutral graphite · secondary actions carry no color of their own.
  <button type="button" onClick={onClick} disabled={disabled} style={{
    background:outline?"transparent":(color||C.p),color:outline?(color||C.t):C.oa,
    border:outline?`1px solid ${color||C.bd}`:"none",borderRadius:9,
    padding:small?"8px 14px":"12px 20px",fontSize:small?13:15,fontWeight:700,fontFamily:FD,textTransform:"uppercase",letterSpacing:"0.05em",
    cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.4:1,boxShadow:outline?"none":C.sh2,
    width:full?"100%":"auto",minHeight:44,...style,
  }}>{children}</button>
);
const X=({children,style={},...p})=>(
  <div style={{background:C.cd,borderRadius:12,padding:16,border:`1px solid ${C.bd}`,boxShadow:C.sh2,...style}} {...p}>{children}</div>
);
const L=({children})=><div style={{fontSize:11,fontWeight:600,color:C.t3,letterSpacing:"0.06em",marginBottom:4}}>{children}</div>;
const S=({title,children,collapsible,defaultOpen=true})=>{
  // Collapsible sections really collapse (tap to expand) · "buried" surfaces
  // like photos/measurements stay reachable instead of being hidden entirely.
  const [open,setOpen]=useState(!collapsible||defaultOpen);
  return(<div style={{marginTop:6}}>
    <div onClick={collapsible?()=>setOpen(o=>!o):undefined}
      style={{fontSize:11,fontWeight:700,color:C.t3,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6,borderBottom:`1px solid ${C.bl}`,paddingBottom:4,display:"flex",justifyContent:"space-between",alignItems:"center",cursor:collapsible?"pointer":"default"}}>
      <span>{title}</span>
      {collapsible&&<span style={{fontSize:10}}>{open?"▴":"▾"}</span>}
    </div>
    {open&&children}
  </div>);
};
const Br=({v,max,color=C.p,h=5})=>(
  <div style={{height:h,background:C.bl,borderRadius:6,overflow:"hidden"}}>
    <div style={{width:`${Math.min(100,(v/(max||1))*100)}%`,height:"100%",background:color,borderRadius:6,transition:"width 0.3s"}}/>
  </div>
);
const ensureNotificationPermission=async()=>{
  if(typeof Notification==="undefined")return false;
  if(Notification.permission==="granted")return true;
  if(Notification.permission==="denied")return false;
  try{return (await Notification.requestPermission())==="granted";}catch{return false;}
};
const notifyViaServiceWorker=async(payload)=>{
  if(!("serviceWorker" in navigator))return false;
  try{
    const reg=await navigator.serviceWorker.ready;
    if(reg?.active){reg.active.postMessage({type:"SHOW_NOTIFICATION",payload});return true;}
    if(reg?.showNotification){await reg.showNotification(payload.title||"Health Hub",payload);return true;}
  }catch{}
  return false;
};
const notifyDevice=async(title,options={})=>{
  if(!(await ensureNotificationPermission()))return false;
  const opts={title,icon:"/icon-192.png",badge:"/icon-192.png",vibrate:[200,100,200,100,200],renotify:true,requireInteraction:true,...options};
  if(await notifyViaServiceWorker(opts))return true;
  try{new Notification(title,opts);return true;}catch{return false;}
};
const scheduleDeviceNotification=async(title,options={},fireAt)=>{
  if(!(await ensureNotificationPermission()))return false;
  const payload={title,icon:"/icon-192.png",badge:"/icon-192.png",vibrate:[200,100,200,100,200],renotify:true,requireInteraction:true,...options,fireAt};
  if("serviceWorker" in navigator){
    try{const reg=await navigator.serviceWorker.ready;if(reg?.active){reg.active.postMessage({type:"SCHEDULE_NOTIFICATION",payload,fireAt});return true;}}catch{}
  }
  const delay=Math.max(0,fireAt-Date.now());
  setTimeout(()=>notifyDevice(title,options),delay);
  return true;
};
const cancelDeviceNotification=async(tag)=>{
  if(!tag||!("serviceWorker" in navigator))return;
  try{const reg=await navigator.serviceWorker.ready;reg?.active?.postMessage({type:"CANCEL_NOTIFICATION",tag});}catch{}
};
let vapidPublicKeyCache=null;
const urlBase64ToUint8Array=(base64String)=>{
  const padding="=".repeat((4-base64String.length%4)%4);
  const base64=(base64String+padding).replace(/-/g,"+").replace(/_/g,"/");
  const raw=atob(base64);
  return Uint8Array.from([...raw].map(ch=>ch.charCodeAt(0)));
};
const getVapidPublicKey=async()=>{
  if(vapidPublicKeyCache)return vapidPublicKeyCache;
  const r=await fetch("/api/push-schedule");
  const d=await r.json();
  if(!r.ok||!d.publicKey)throw new Error(d.error||"Push not configured");
  vapidPublicKeyCache=d.publicKey;
  return vapidPublicKeyCache;
};
const ensurePushSubscription=async()=>{
  if(!("serviceWorker" in navigator)||!("PushManager" in window))return null;
  if(!(await ensureNotificationPermission()))return null;
  const reg=await navigator.serviceWorker.ready;
  let sub=await reg.pushManager.getSubscription();
  if(sub)return sub;
  const key=await getVapidPublicKey();
  return reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(key)});
};
const scheduleServerPush=async({title="Rest complete",body="Next set is ready.",tag,dueAt,url="/"})=>{
  try{
    const sub=await ensurePushSubscription();
    if(!sub)return false;
    const notifyToken=ld()?.settings?.notifyToken||"";
    const r=await fetch("/api/push-schedule",{method:"POST",
      headers:{"Content-Type":"application/json",...(notifyToken?{"x-notify-token":notifyToken}:{})},
      body:JSON.stringify({subscription:sub.toJSON(),title,body,tag,dueAt,url})});
    return r.ok;
  }catch{return false;}
};

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

// CUT TRAJECTORY card · mock 1g. Dotted raw weigh-ins, solid EWMA trend (ember),
// dashed projection to PROG.targetWeight at the current getTrend() rate, goal line,
// checkpoint marker, pace verdict. Same getTrend() engine · presentation only.
const WeightTrendCard=({trend,compact=false,tdee=null})=>{
  if(!trend)return null;
  const goal=PROG.targetWeight,rate=trend.rate,pts=trend.points,lastP=pts[pts.length-1],cur=lastP.v;
  const wkNum=Math.max(1,Math.min(PROG.weeks,Math.floor((new Date(td()+"T12:00:00")-new Date(PROG.start+"T12:00:00"))/6048e5)+1));
  const toGo=Math.max(0,+(cur-goal).toFixed(1));
  const daysToGoal=rate<-0.05&&cur>goal?(cur-goal)/(-rate)*7:null;
  const projDate=daysToGoal!=null&&daysToGoal<=180?(()=>{const d=new Date(td()+"T12:00:00");d.setDate(d.getDate()+Math.round(daysToGoal));return d;})():null;
  const projLabel=projDate?projDate.toLocaleDateString("en-US",{month:"short",day:"numeric"}).toUpperCase():"—";
  const dLbl=ds=>new Date(ds+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"}).toUpperCase();
  const dteEnd=(new Date(PROG.end+"T12:00:00")-new Date(td()+"T12:00:00"))/864e5;
  const wtEnd=rate<-0.05&&dteEnd>0?Math.max(goal,+(cur+rate*(dteEnd/7)).toFixed(1)):null;
  const st=rate>=0.1?{txt:`OFF PACE · +${rate.toFixed(1)} LB/WK`,c:C.r}
    :rate<=-2?{txt:`FAST · −${Math.abs(rate).toFixed(1)} LB/WK`,c:C.t2}
    :rate<=-0.6?{txt:`ON PACE · −${Math.abs(rate).toFixed(1)} LB/WK`,c:C.g}
    :rate<=-0.1?{txt:`SLOW · −${Math.abs(rate).toFixed(1)} LB/WK`,c:C.t2}
    :{txt:"HOLDING",c:C.t2};
  const yr=+td().slice(0,4);
  const dayOf=md=>{let d=new Date(`${yr}-${md}T12:00:00`);if(d-new Date(td()+"T12:00:00")>1728e5)d=new Date(`${yr-1}-${md}T12:00:00`);return d;};
  const d0=dayOf(pts[0].d),dx=p=>(dayOf(p.d)-d0)/864e5,lastX=dx(lastP);
  const endX=Math.max(lastX+10,Math.min(lastX+84,daysToGoal!=null?lastX+daysToGoal:lastX+28));
  const W=358,H=compact?96:120,padT=10,padB=10,padR=4;
  const gx=d=>d/endX*(W-padR);
  const vals=[...pts.map(p=>Number(p.raw)),...pts.map(p=>p.v),goal];
  const mn=Math.min(...vals)-0.6,mx=Math.max(...vals)+0.6;
  const gy=v=>padT+(mx-v)/(mx-mn)*(H-padT-padB);
  const rawLine=pts.map(p=>`${gx(dx(p)).toFixed(1)},${gy(Number(p.raw)).toFixed(1)}`).join(" ");
  const emaLine=pts.map(p=>`${gx(dx(p)).toFixed(1)},${gy(p.v).toFixed(1)}`).join(" ");
  const cx=gx(lastX),cy=gy(cur);
  const projY=daysToGoal!=null?(daysToGoal<=84?gy(goal):gy(cur+rate*((endX-lastX)/7))):null;
  const ckD=PROG.checkpoint?.date?(new Date(PROG.checkpoint.date+"T12:00:00")-d0)/864e5:null;
  const showCk=!compact&&ckD!=null&&ckD>0&&ckD<endX;
  const tagW=76,tagX=cx>W-tagW-14?cx-tagW-10:cx+10,tagY=Math.max(padT,Math.min(H-padB-16,cy-8));
  const delta=+(PROG.startWeight-cur).toFixed(1);
  return(
    <X style={{padding:"12px 14px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:8}}>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.14em",color:C.t3,fontFamily:FD,whiteSpace:"nowrap"}}>CUT TRAJECTORY · WK {wkNum}/{PROG.weeks}</div>
        <div style={{fontSize:12,fontWeight:700,color:compact?st.c:(wtEnd!=null?(wtEnd<=goal+0.75?C.g:C.t2):st.c),fontFamily:FD,letterSpacing:"0.04em",whiteSpace:"nowrap"}}>{compact?st.txt:(wtEnd!=null?`PROJECTED ${wtEnd.toFixed(1)} BY ${dLbl(PROG.end)}`:st.txt)}</div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:H,marginTop:8,display:"block"}}>
        <line x1="0" y1={gy(goal)} x2={W} y2={gy(goal)} stroke={C.g} strokeWidth="1.5" strokeDasharray="5,4" opacity="0.7"/>
        <text x="2" y={gy(goal)-4} fontFamily={FD} fontSize="10" fontWeight="800" fill={C.g}>GOAL {goal}</text>
        <text x="2" y={Math.max(padT+8,gy(pts[0].v)-6)} fontFamily={FD} fontSize="10" fontWeight="700" fill={C.t3}>{Math.round(pts[0].v)}</text>
        {showCk&&<line x1={gx(ckD)} y1={padT-4} x2={gx(ckD)} y2={H-padB+4} stroke={C.bd} strokeWidth="1"/>}
        {showCk&&<text x={gx(ckD)+4} y={padT+4} fontFamily={FD} fontSize="9" fontWeight="700" fill={C.t3}>{`CHECKPOINT ${dLbl(PROG.checkpoint.date)} · DELOAD`}</text>}
        <polyline points={rawLine} fill="none" stroke={C.bd} strokeWidth="1.5" strokeDasharray="2,3"/>
        <polyline points={emaLine} fill="none" stroke={C.p} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        {projY!=null&&<polyline points={`${cx},${cy} ${W-padR},${projY}`} fill="none" stroke={C.p} strokeWidth="1.5" strokeDasharray="5,4" opacity="0.55"/>}
        {!compact&&projY!=null&&daysToGoal!=null&&daysToGoal<=84&&(<g><rect x={W-92} y={Math.max(padT,projY-22)} width="88" height="15" rx="3" fill={C.gl}/><text x={W-48} y={Math.max(padT,projY-22)+11} textAnchor="middle" fontFamily={FD} fontSize="10" fontWeight="800" fill={C.g}>{projLabel} · {goal}</text></g>)}
        <circle cx={cx} cy={cy} r="4.5" fill={C.cd} stroke={C.p} strokeWidth="2.5"/>
        <rect x={tagX} y={tagY} width={tagW} height="16" rx="3" fill={C.t}/>
        <text x={tagX+tagW/2} y={tagY+11.5} textAnchor="middle" fontFamily={FD} fontSize="10" fontWeight="800" fill={C.oa}>{compact?`${cur.toFixed(1)} TODAY`:`${cur.toFixed(1)} · ${delta>=0?"−":"+"}${Math.abs(delta).toFixed(1)}`}</text>
      </svg>
      {!compact&&<div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:9,fontWeight:700,letterSpacing:"0.08em",color:C.t3,fontFamily:FD}}><span>{dLbl(PROG.start)} · {PROG.startWeight}</span><span>CHECKPOINT {dLbl(PROG.checkpoint.date)}</span><span>{dLbl(PROG.end)} · GOAL {goal}</span></div>}
      {compact&&<div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:11,fontWeight:700,color:C.t2,fontFamily:FD,letterSpacing:"0.04em"}}><span>{rate>0?"+":""}{rate.toFixed(1)} LB/WK</span><span>{toGo.toFixed(1)} LBS TO {goal}</span><span>GOAL BY {projLabel}</span></div>}
      {!compact&&<div style={{display:"flex",gap:7,marginTop:10}}>
        {[[rate.toFixed(1),"LB/WK PACE"],[toGo.toFixed(1),"LBS TO GO"],[`${trend.weighIns7}/7`,"WEIGH-INS"],tdee?[Math.round(tdee).toLocaleString(),"TDEE EST"]:[projLabel,"GOAL BY"]].map(([v,l])=>(
          <div key={l} style={{flex:1,background:C.bg,borderRadius:8,padding:"8px 4px",textAlign:"center"}}>
            <div style={{fontSize:18,fontWeight:800,color:C.t,fontFamily:FD}}>{v}</div>
            <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.06em",color:C.t3,fontFamily:FD}}>{l}</div>
          </div>))}
      </div>}
    </X>
  );
};

const Ch=({data,color=C.p,height=52,label,yUnit="",empty})=>{
  if(!data||data.length<2){
    if(!empty)return null;
    return(<X style={{padding:"10px 14px"}}>{label&&<div style={{fontSize:11,fontWeight:600,color:C.t3,letterSpacing:"0.06em",marginBottom:4}}>{label}</div>}
      <div style={{height,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <span style={{fontSize:13,color:C.t3}}>{empty}</span>
      </div></X>);
  }
  const vals=data.map(d=>d.v),mn=Math.min(...vals),mx=Math.max(...vals),rng=mx-mn||1,pad=rng*0.12;
  const w=data.length*32,h=height;
  const pts=data.map((d,i)=>[i*(w/(data.length-1)),h-6-((d.v-(mn-pad))/(rng+pad*2))*(h-16)]);
  const line=pts.map(p=>p.join(",")).join(" ");
  const gid="g"+String(label||color).replace(/[^a-z0-9]/gi,"");
  return(
    <X style={{padding:"10px 14px"}}>
      {label&&<div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
        <span style={{fontSize:11,fontWeight:600,color:C.t3,letterSpacing:"0.06em"}}>{label}</span>
        <span style={{fontSize:13,fontWeight:700,color}}>{vals[vals.length-1]}{yUnit}</span>
      </div>}
      <svg viewBox={`0 0 ${w} ${h}`} style={{width:"100%",height}} preserveAspectRatio="none">
        <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.08"/><stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient></defs>
        <polygon points={`0,${h} ${line} ${w},${h}`} fill={`url(#${gid})`}/>
        <polyline points={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        {pts.map((p,i)=><circle key={i} cx={p[0]} cy={p[1]} r="2" fill={C.cd} stroke={color} strokeWidth="1.5"/>)}
      </svg>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:C.t3,marginTop:2}}>
        <span>{data[0].d||""}</span><span>{data[data.length-1].d||""}</span>
      </div>
    </X>
  );
};

// Overlays render at document.body so no animated ancestor can trap them under the tab bar.
const Portal=({children})=>ReactDOM.createPortal(children,document.body);

// ═══ CONFIRM MODAL ═══
const ConfirmModal=({title,message,onConfirm,onCancel,confirmText="Confirm",confirmColor=C.g})=>{
  useBackClose(true,onCancel);
  return(<Portal><div className="hh-fade" onClick={onCancel} style={{position:"fixed",inset:0,background:C.scrim,zIndex:320,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
    <div className="hh-sheet" role="alertdialog" aria-modal="true" onClick={e=>e.stopPropagation()} style={{background:C.cd,borderRadius:12,padding:20,width:"100%",maxWidth:320,border:`1px solid ${C.bd}`,boxShadow:C.sh}}>
      <div style={{fontSize:16,fontWeight:700,color:C.t,marginBottom:6}}>{title}</div>
      <div style={{fontSize:14,color:C.t2,marginBottom:16}}>{message}</div>
      <div style={{display:"flex",gap:8}}>
        <B full outline onClick={onCancel} style={{flex:1}}>Cancel</B>
        <B full onClick={onConfirm} color={confirmColor} style={{flex:1}}>{confirmText}</B>
      </div>
    </div>
  </div></Portal>);
};

// ═══ BOTTOM SHEET · every overlay uses this: slide-up, scrim tap + back button close ═══
const Sheet=({open,onClose,title,children,right,maxHeight="82vh"})=>{
  useBackClose(!!open,onClose);
  if(!open)return null;
  return(<Portal><div className="hh-fade" onClick={onClose} style={{position:"fixed",inset:0,background:C.scrim,zIndex:300,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
    <div className="hh-sheet" role="dialog" aria-modal="true" onClick={e=>e.stopPropagation()} style={{background:C.cd,borderRadius:"14px 14px 0 0",width:"100%",maxWidth:520,maxHeight,overflowY:"auto",padding:"8px 16px calc(18px + var(--safe-b))",border:`1px solid ${C.bd}`,boxShadow:C.sh}}>
      <div style={{width:36,height:4,borderRadius:2,background:C.bl,margin:"0 auto 10px"}}/>
      {(title||right)&&<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,gap:8}}>
        <div style={{fontSize:17,fontWeight:800,color:C.t,fontFamily:FD,textTransform:"uppercase",letterSpacing:"0.03em"}}>{title}</div>{right}
      </div>}
      {children}
    </div>
  </div></Portal>);
};

// ═══ SCALE PAD · shared by the Scale tab and the morning moment ═══
const ScalePad=({value,onChange,onLog,hint,todayLogged,yesterdayWt,compact=false})=>{
  const ok=!!value&&Number(value)>80&&Number(value)<500;
  return(<X style={{padding:compact?"14px 14px 12px":"18px 16px",textAlign:"center",boxShadow:C.sh2}}>
    <div style={{fontSize:10,fontWeight:700,color:C.t3,letterSpacing:"0.14em",fontFamily:FD}}>{todayLogged!=null?`LOGGED ${Number(todayLogged).toFixed(1)} · LOG AGAIN TO CORRECT`:`TODAY${yesterdayWt?` · YESTERDAY ${Number(yesterdayWt).toFixed(1)}`:""}`}</div>
    <div style={{fontSize:compact?50:58,fontWeight:800,fontFamily:FD,lineHeight:1,marginTop:6,color:value?C.t:C.t3,fontVariantNumeric:"tabular-nums"}}>{value||(yesterdayWt?Number(yesterdayWt).toFixed(1):"185.0")}</div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginTop:12}}>
      {["1","2","3","4","5","6","7","8","9",".","0","⌫"].map(k=>(
        <button type="button" key={k} onClick={()=>{haptic(8);
          if(k==="⌫"){onChange(value.slice(0,-1));return;}
          if(k==="."&&value.includes("."))return;
          if(value.replace(".","").length>=4)return;
          onChange(value+k);
        }} style={{minHeight:compact?44:48,border:`1px solid ${C.bd}`,borderRadius:8,background:C.bg,fontSize:k==="⌫"?17:19,fontWeight:700,color:k==="⌫"?C.t3:C.t,cursor:"pointer",fontFamily:"'Barlow',sans-serif"}}>{k}</button>
      ))}
    </div>
    <button type="button" onClick={onLog} disabled={!ok} style={{width:"100%",marginTop:8,minHeight:52,border:"none",borderRadius:9,background:C.p,opacity:ok?1:0.4,color:C.oa,fontFamily:FD,fontSize:17,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.08em",cursor:"pointer"}}>{value?`Log ${value}`:"Log weight"}</button>
    {hint&&<div style={{fontSize:11,color:C.t3,marginTop:8}}>{hint}</div>}
  </X>);
};

// ═══ PLATE CALCULATOR ═══
const PlateCalc=({weight})=>{
  const m=plateMath(weight);
  if(!m)return <div style={{fontSize:13,color:C.t3}}>Below the bar. Load nothing.</div>;
  return(<div>
    <div style={{fontSize:12,color:C.t2,marginBottom:8}}>{weight} lbs · 45 lb bar · per side</div>
    <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
      {m.perSide.length===0&&<span style={{fontSize:13,color:C.t3}}>Empty bar</span>}
      {m.perSide.map((p,i)=>{const big=p>=25;return <span key={i} style={{display:"inline-flex",alignItems:"center",justifyContent:"center",minWidth:big?52:40,height:big?52:40,borderRadius:8,background:p===45?C.t:p>=25?C.p:C.bg,color:p>=25?C.oa:C.t,border:`1px solid ${p>=25?"transparent":C.bd}`,fontFamily:FD,fontSize:big?16:13,fontWeight:800}}>{p}</span>;})}
    </div>
    {m.leftover>0&&<div style={{fontSize:11,color:C.t3,marginTop:8}}>{m.leftover} lbs per side does not load. Round to {Number(weight)-m.leftover*2}.</div>}
  </div>);
};

// ═══ ANALYSIS SECTION ═══
const AnalysisSection=({data})=>{
  const [range,setRange]=useState("7d");
  const [loading,setLoading]=useState(false);
  const [result,setResult]=useState(null);
  const [error,setError]=useState("");

  const runAnalysis=async()=>{
    setLoading(true);setResult(null);setError("");
    try{
      const days=range==="7d"?7:range==="14d"?14:30;
      const cutoff=new Date();cutoff.setDate(cutoff.getDate()-days);
      const cutStr=lds(cutoff);

      // Summarize data within range
      const wkEntries=Object.entries(data.wk||{}).filter(([d])=>d>=cutStr);
      const nutEntries=Object.entries(data.nut||{}).filter(([d])=>d>=cutStr);
      const recEntries=Object.entries(data.rec||{}).filter(([d])=>d>=cutStr);
      const wtEntries=Object.entries(data.wt||{}).filter(([d])=>d>=cutStr).sort((a,b)=>a[0].localeCompare(b[0]));
      const stepsEntries=Object.entries(data.steps||{}).filter(([d])=>d>=cutStr);
      const habitsEntries=Object.entries(data.habits||{}).filter(([d])=>d>=cutStr);
      const waterEntries=Object.entries(data.water||{}).filter(([d])=>d>=cutStr);

      // Nutrition averages
      const nutAvg=nutEntries.length?{
        cal:Math.round(nutEntries.reduce((s,[,n])=>s+(n.totalCal||0),0)/nutEntries.length),
        protein:Math.round(nutEntries.reduce((s,[,n])=>s+(n.totalProtein||0),0)/nutEntries.length),
        carbs:Math.round(nutEntries.reduce((s,[,n])=>s+(n.totalCarbs||0),0)/nutEntries.length),
        fat:Math.round(nutEntries.reduce((s,[,n])=>s+(n.totalFat||0),0)/nutEntries.length),
        fiber:Math.round(nutEntries.reduce((s,[,n])=>s+(n.totalFiber||0),0)/nutEntries.length),
        days:nutEntries.length,
      }:null;

      // Recovery averages
      const recWithScore=recEntries.filter(([,r])=>r.recoveryScore);
      const recAvg=recWithScore.length?{
        recovery:Math.round(recWithScore.reduce((s,[,r])=>s+r.recoveryScore,0)/recWithScore.length),
        hrv:Math.round(recEntries.filter(([,r])=>r.hrv).reduce((s,[,r])=>s+r.hrv,0)/(recEntries.filter(([,r])=>r.hrv).length||1)),
        rhr:Math.round(recEntries.filter(([,r])=>r.rhr).reduce((s,[,r])=>s+r.rhr,0)/(recEntries.filter(([,r])=>r.rhr).length||1)),
        sleep:+(recEntries.filter(([,r])=>r.sleepHours).reduce((s,[,r])=>s+r.sleepHours,0)/(recEntries.filter(([,r])=>r.sleepHours).length||1)).toFixed(1),
        days:recWithScore.length,
      }:null;

      // Weight trend
      const wtTrend=wtEntries.length>=2?{
        start:wtEntries[0][1],end:wtEntries[wtEntries.length-1][1],
        change:+(wtEntries[wtEntries.length-1][1]-wtEntries[0][1]).toFixed(1),
        entries:wtEntries.length,
      }:wtEntries.length===1?{current:wtEntries[0][1],entries:1}:null;

      // Steps avg
      const stepsAvg=stepsEntries.length?Math.round(stepsEntries.reduce((s,[,v])=>s+v,0)/stepsEntries.length):null;

      // Workout summary
      const wkSummary={count:wkEntries.length,days:wkEntries.map(([d,w])=>w.day),
        progressions:Object.entries(data.prog||{}).filter(([,p])=>p.lastDate&&p.lastDate>=cutStr&&p.progressed).length};

      // Habits summary
      const chLen=(data.settings.customHabits||[]).length;
      const habScores=habitsEntries.map(([,h])=>{if(!h)return null;
        let c=0;const tot=7+chLen;
        if(h.alcohol===false)c++;if(h.cannabis===false)c++;if(h.screensOff===true)c++;
        if(h.sunlight===true)c++;if(h.bedBy1030===true)c++;if(h.readBeforeBed===true)c++;if(h.supplements===true)c++;
        c+=Object.values(h.custom||{}).filter(v=>v).length;
        return c/tot;}).filter(v=>v!==null);
      const habAvg=habScores.length?Math.round(habScores.reduce((a,b)=>a+b,0)/habScores.length*100):null;

      // Water avg
      const waterAvg=waterEntries.length?Math.round(waterEntries.reduce((s,[,v])=>s+v,0)/waterEntries.length):null;

      // Body comp assessments in window
      const bcEntries=Object.entries(data.bodyComp||{}).filter(([d,v])=>d>=cutStr&&v&&typeof v==="object"&&v.analysis).sort((a,b)=>b[0].localeCompare(a[0]));

      const payload={
        range,days,
        workouts:wkSummary,
        nutrition:nutAvg,
        recovery:recAvg,
        weight:wtTrend,
        steps:stepsAvg,
        habits:habAvg,
        water:waterAvg,
        program:{name:PROG.name,week:wkn(td()),totalWeeks:PROG.weeks},
        targets:data.settings||DEFAULTS,
        bodyComp:bcEntries.length?{assessments:bcEntries.map(([d,v])=>({date:d,bfRange:v.analysis.bodyFatRange,muscleDev:v.analysis.muscleDevelopment,progress:v.analysis.areasOfProgress,focus:v.analysis.focusAreas,notes:v.analysis.notes})),count:bcEntries.length,lastPhotoDate:bcEntries[0][0],daysSincePhoto:Math.round((new Date()-new Date(bcEntries[0][0]+"T12:00:00"))/864e5)}:null,
      };

      const r=await fetch("/api/analyze",{method:"POST",headers:{"Content-Type":"application/json","x-sync-token":data.settings?.syncToken||""},body:JSON.stringify(payload)});
      const resp=await r.json();
      if(resp.error)throw new Error(resp.error);
      setResult(resp);
    }catch(e){setError(e.message||"Analysis failed. Check your connection and try again.");}
    setLoading(false);
  };

  const ScoreBar=({label,score,color})=>(
    <div style={{marginBottom:8}}>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:3}}>
        <span style={{color:C.t2,fontWeight:600}}>{label}</span>
        <span style={{color,fontWeight:700}}>{score}/100</span>
      </div>
      <Br v={score} max={100} color={color} h={6}/>
    </div>
  );

  const scoreColor=(s)=>s>=70?C.g:s>=45?C.t2:C.r;

  return(
    <div style={{marginTop:8,borderTop:`1px solid ${C.bl}`,paddingTop:10}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={{fontSize:14,fontWeight:700,color:C.t}}>AI Analysis</div>
        <div style={{display:"flex",gap:3}}>
          {["7d","14d","30d"].map(r=>(
            <button key={r} onClick={()=>setRange(r)} style={{
              padding:"5px 10px",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
              border:`1px solid ${range===r?C.p:C.bd}`,background:range===r?C.pl:"transparent",color:range===r?C.p:C.t3,
            }}>{r}</button>
          ))}
        </div>
      </div>

      <B full onClick={runAnalysis} disabled={loading} color={C.v} style={{marginBottom:8}}>
        {loading?"Analyzing...":"⚡ Run Analysis"}
      </B>

      {error&&<div style={{fontSize:13,color:C.r,padding:"8px 10px",background:C.rl,borderRadius:6,marginBottom:8}}>{error}</div>}

      {result&&(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {/* Scores */}
          {result.scores&&(
            <X style={{padding:12}}>
              <div style={{fontSize:12,fontWeight:700,color:C.t3,letterSpacing:"0.06em",marginBottom:10}}>Scores · Last {range}</div>
              {result.scores.overall!=null&&<ScoreBar label="Overall" score={result.scores.overall} color={scoreColor(result.scores.overall)}/>}
              {result.scores.training!=null&&<ScoreBar label="Training" score={result.scores.training} color={scoreColor(result.scores.training)}/>}
              {result.scores.nutrition!=null&&<ScoreBar label="Nutrition" score={result.scores.nutrition} color={scoreColor(result.scores.nutrition)}/>}
              {result.scores.recovery!=null&&<ScoreBar label="Recovery" score={result.scores.recovery} color={scoreColor(result.scores.recovery)}/>}
              {result.scores.habits!=null&&<ScoreBar label="Habits" score={result.scores.habits} color={scoreColor(result.scores.habits)}/>}
            </X>
          )}

          {/* Summary */}
          {result.summary&&(
            <X style={{padding:12,borderLeft:`3px solid ${C.bd}`}}>
              <div style={{fontSize:13,color:C.t,lineHeight:1.6}}>{result.summary}</div>
            </X>
          )}

          {/* Wins & Gaps */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
            {result.wins&&result.wins.length>0&&(
              <X style={{padding:10,borderTop:`3px solid ${C.g}`}}>
                <div style={{fontSize:11,fontWeight:700,color:C.g,letterSpacing:"0.06em",marginBottom:6}}>Wins</div>
                {result.wins.map((w,i)=>(
                  <div key={i} style={{fontSize:12,color:C.t2,marginBottom:4,paddingLeft:8,borderLeft:`2px solid ${C.gl}`}}>{w}</div>
                ))}
              </X>
            )}
            {result.gaps&&result.gaps.length>0&&(
              <X style={{padding:10,borderTop:`3px solid ${C.r}`}}>
                <div style={{fontSize:11,fontWeight:700,color:C.r,letterSpacing:"0.06em",marginBottom:6}}>Gaps</div>
                {result.gaps.map((g,i)=>(
                  <div key={i} style={{fontSize:12,color:C.t2,marginBottom:4,paddingLeft:8,borderLeft:`2px solid ${C.rl}`}}>{g}</div>
                ))}
              </X>
            )}
          </div>

          {/* Trends */}
          {result.trends&&result.trends.length>0&&(
            <X style={{padding:10}}>
              <div style={{fontSize:11,fontWeight:700,color:C.t3,letterSpacing:"0.06em",marginBottom:6}}>Trends</div>
              {result.trends.map((t,i)=>(
                <div key={i} style={{fontSize:13,color:C.t2,marginBottom:5,display:"flex",gap:6,alignItems:"flex-start"}}>
                  <span style={{color:C.t3,fontWeight:700,minWidth:14}}>→</span>
                  <span>{t}</span>
                </div>
              ))}
            </X>
          )}

          {/* Correlations */}
          {result.correlations&&result.correlations.length>0&&(
            <X style={{padding:10}}>
              <div style={{fontSize:11,fontWeight:700,color:C.t3,letterSpacing:"0.06em",marginBottom:6}}>Correlations</div>
              {result.correlations.map((c,i)=>(
                <div key={i} style={{fontSize:13,color:C.t2,marginBottom:5,display:"flex",gap:6,alignItems:"flex-start"}}>
                  <span style={{color:C.v,fontWeight:700,minWidth:14}}>↔</span>
                  <span>{c}</span>
                </div>
              ))}
            </X>
          )}

          {/* Recommendations */}
          {result.recommendations&&result.recommendations.length>0&&(
            <X style={{padding:10,borderLeft:`3px solid ${C.bd}`}}>
              <div style={{fontSize:11,fontWeight:700,color:C.p,letterSpacing:"0.06em",marginBottom:6}}>Recommendations</div>
              {result.recommendations.map((r,i)=>(
                <div key={i} style={{fontSize:13,color:C.t,marginBottom:6,paddingBottom:6,borderBottom:i<result.recommendations.length-1?`1px solid ${C.bl}`:"none"}}>
                  <span style={{fontWeight:700,color:C.p}}>{i+1}. </span>{r}
                </div>
              ))}
            </X>
          )}

          {/* Next Week Focus */}
          {result.nextWeekFocus&&(
            <X style={{padding:12,background:C.pl,border:`1px solid ${C.p}`}}>
              <div style={{fontSize:11,fontWeight:700,color:C.p,letterSpacing:"0.06em",marginBottom:4}}>Next Week Focus</div>
              <div style={{fontSize:14,color:C.t,fontWeight:600,lineHeight:1.5}}>{result.nextWeekFocus}</div>
            </X>
          )}

          {/* Body Composition */}
          {result.bodyComposition&&(
            <X style={{padding:10,borderLeft:`3px solid ${C.bd}`}}>
              <div style={{fontSize:11,fontWeight:700,color:C.v,letterSpacing:"0.06em",marginBottom:6}}>Body Composition</div>
              {result.bodyComposition.bfTrend&&<div style={{fontSize:13,color:C.t2,marginBottom:4}}>BF% Trend: {result.bodyComposition.bfTrend}</div>}
              {result.bodyComposition.recompSignal&&<div style={{fontSize:13,color:C.t2,marginBottom:4}}>Cut Signal: {result.bodyComposition.recompSignal}</div>}
              {result.bodyComposition.muscleQuality&&<div style={{fontSize:13,color:C.t2,marginBottom:4}}>Muscle Quality: {result.bodyComposition.muscleQuality}</div>}
              {result.bodyComposition.photoReminder&&<div style={{fontSize:13,color:C.t2}}>{"📸"} {result.bodyComposition.photoReminder}</div>}
            </X>
          )}
        </div>
      )}
    </div>
  );
};

// ═══ DASHBOARD ═══
const Dashboard=({data,setData,setTab,allergies,allergyErr})=>{
  const [showMeasForm,setShowMeasForm]=useState(false);
  const [showFullDashboard,setShowFullDashboard]=useState(false);
  useBackClose(showFullDashboard,()=>setShowFullDashboard(false));
  const [measF,setMeasF]=useState({chest:"",waist:"",armL:"",armR:"",thighL:"",thighR:""});
  const [allergyOpen,setAllergyOpen]=useState(false);
  const [todayKey,setTodayKey]=useState(td());
  useEffect(()=>{const iv=setInterval(()=>setTodayKey(td()),60000);return()=>clearInterval(iv);},[]);

  const t=todayKey,dn=dw(t),w=wkn(t);
  const sess=data.program[dn],nut=data.nut[t],rec=data.rec[t];
  const wts=Object.entries(data.wt).sort((a,b)=>b[0].localeCompare(a[0]));
  const lw=wts[0]?.[1];
  const w7ago=(()=>{const d=new Date();d.setDate(d.getDate()-7);const ds=lds(d);
    const near=wts.filter(([k])=>k<=ds);return near.length?near[0][1]:null;})();
  const wc=lw&&w7ago?Math.round(lw-w7ago):null;
  const steps=data.steps?.[t]||0;
  const ws=rec?.recoveryScore;
  const waterToday=data.water?.[t]||0;
  const waterGoal=(data.settings||DEFAULTS).water||DEFAULTS.water;
  const {add:addWater,reset:resetWater}=waterOps(setData,t);

  let streak=0;const sd=new Date();
  for(let i=0;i<60;i++){const ds=lds(sd);const d=dw(ds);
    if(["saturday","sunday"].includes(d)){sd.setDate(sd.getDate()-1);continue;}
    if(data.wk[ds]||data.nut[ds]){streak++;sd.setDate(sd.getDate()-1);}else break;}

  const st=data.settings||DEFAULTS;
  const calT=getDayCalTarget(t,st,data.travelDays,data.socialWeekend),proT=getDayProTarget(t,st,data.travelDays,data.socialWeekend);
  const tCal=nut?.totalCal||0,tPro=nut?.totalProtein||0,tFib=nut?.totalFiber||0;
  const dayType=getDayType(t,data.travelDays);
  // One analytics computation per data change: getWeeklyCutSummary already
  // runs calcAdaptiveTDEE + getStalls internally, so everything derives from it.
  const analytics=React.useMemo(()=>{
    const cutSummary=getWeeklyCutSummary(data,t);
    return{cutSummary,
      weeklyRecommendation:getWeeklyCutRecommendation(data,t,cutSummary),
      weeklyConsistency:getWeeklyConsistency(data,t,cutSummary)};
  },[data,t]);
  const tdeeData=analytics.cutSummary.tdee;
  const weeklyRecAvg=getWeeklyRecoveryAvg(data.rec);
  const autoreg=getAutoregulation(weeklyRecAvg);
  const weeklyRecommendation=analytics.weeklyRecommendation;
  const weeklyConsistency=analytics.weeklyConsistency;
  const tonightCloseout=getTonightCloseout(data,t);
  const redDays=getConsecutiveRedDays(data.rec);
  const fatPct=tCal>0?Math.round(((nut?.totalFat||0)*9/tCal)*100):0;
  const weightTrend=getTrend(data.wt,t);
  const stalls=analytics.cutSummary.stalls;

  const wCh=wts.slice(0,30).reverse().map(([d,v])=>({v,d:d.slice(5)}));
  const recCh=Object.entries(data.rec).filter(([_,v])=>v.recoveryScore).sort((a,b)=>a[0].localeCompare(b[0])).slice(-30).map(([d,v])=>({v:v.recoveryScore,d:d.slice(5)}));
  const rhrCh=Object.entries(data.rec).filter(([_,v])=>v.rhr).sort((a,b)=>a[0].localeCompare(b[0])).slice(-30).map(([d,v])=>({v:v.rhr,d:d.slice(5)}));
  const stCh=Object.entries(data.steps||{}).filter(([_,v])=>v>0).sort((a,b)=>a[0].localeCompare(b[0])).slice(-30).map(([d,v])=>({v,d:d.slice(5)}));
  const slCh=Object.entries(data.rec).filter(([_,v])=>v.sleepHours).sort((a,b)=>a[0].localeCompare(b[0])).slice(-30).map(([d,v])=>({v:v.sleepHours,d:d.slice(5)}));
  const liftsHeld=Object.values(data.prog).filter(p=>p.lastDate).length;
  const totalL=Object.keys(data.prog).length;

  const habitDays=Object.entries(data.habits||{}).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,7);
  const customHLen=(data.settings.customHabits||[]).length;
  const habitScore=habitDays.length?Math.round(habitDays.reduce((s,[_,h])=>{
    if(!h)return s;let c=0;const tot=7+customHLen;
    if(h.alcohol===false)c++;if(h.cannabis===false)c++;if(h.screensOff===true)c++;
    if(h.sunlight===true)c++;if(h.bedBy1030===true)c++;if(h.readBeforeBed===true)c++;if(h.supplements===true)c++;
    c+=Object.values(h.custom||{}).filter(v=>v).length;
    return s+c/tot;},0)/habitDays.length*100):null;

  const hour=new Date().getHours();
  const mealsLogged=(nut?.meals||[]).length;
  const proRemaining=Math.max(0,proT-tPro);
  const calRemaining=calT!==null?Math.max(0,calT-tCal):0;
  const mealSlots=hour<10?4:hour<14?3:hour<17?2:hour<20?1:0;
  const dinnerPro=Math.min(35,proRemaining);
  const preDinnerSlots=Math.max(0,mealSlots-1);
  const perMealPro=preDinnerSlots>0?Math.ceil(Math.max(0,proRemaining-dinnerPro)/preDinnerSlots):0;
  const topProMeals=getTopProteinMeals(data);
  const retention=getCutRetentionScore(data);
  const dataInsights=getInsights(data);

  const dks=["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
  const weightLogged=data.wt?.[t]!=null;
  const nutritionLogged=!!nut?.meals?.length||tCal>0||tPro>0;
  const workoutDone=!!data.wk?.[t];
  const cardioDone=!!data.cardio?.[t]?.done;
  const habitsLogged=!!data.habits?.[t]&&Object.values(data.habits[t]).some(v=>v!==null&&v!==undefined);
  const proteinPct=Math.min(100,Math.round(tPro/(proT||1)*100));
  const calPct=calT?Math.min(120,Math.round(tCal/calT*100)):null;
  const cutStatus=(()=>{
    if(ws!=null&&ws<45)return{label:"Recovery-biased day",color:C.r,msg:"Protect lifting. Reduce cardio before cutting food."};
    if(weightTrend?.direction==="flat"&&nutritionLogged)return{label:"Tighten execution",color:C.t,msg:"Hit protein and log cleanly before changing targets."};
    if(proteinPct>=90&&(calT===null||tCal<=calT))return{label:"On track",color:C.g,msg:"Stay the course. Complete the next task."};
    return{label:"Cut execution",color:C.p,msg:"Protein first. Log the minimum needed to steer today."};
  })();
  const nextAction=(()=>{
    if(!weightLogged)return{label:"Log weight",tab:"weight",hint:"Morning scale anchors the cut."};
    if(!nutritionLogged)return{label:"Log first meal",tab:"nutrition",hint:"Calories/protein drive the adjustment logic."};
    if(sess&&!workoutDone)return{label:"Start workout",tab:"training",hint:sess.name};
    if(!cardioDone)return{label:"Log cardio",tab:"training",hint:"Type, time, zone, optional distance/calories."};
    if(!habitsLogged)return{label:"Mark clean day",tab:"dashboard",hint:"One tap in Tonight closeout below."};
    return{label:"Review details",tab:"dashboard",hint:"Core loops are done."};
  })();
  const allergyTop=(allergies?.summary||[]).slice(0,3);
  const allergyTone=allergyTop.some(x=>/^high|very/i.test(x.level||""))?C.r:allergyTop.some(x=>/^moderate/i.test(x.level||""))?C.t2:C.g;

  if(!showFullDashboard)return(
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div>
        <div style={{fontSize:18,fontWeight:800,color:C.t}}>Cut Command</div>
        <div style={{fontSize:13,color:C.t3}}>{fmt(t)} · Wk {w}/{PROG.weeks}{w===PROG.deload?" · DELOAD":""}{dayType==="travel"?" · TRAVEL DAY":""}</div>
      </div>

      <X style={{padding:16,borderLeft:`4px solid ${cutStatus.color}`}}>
        <div style={{fontSize:11,fontWeight:800,color:cutStatus.color,letterSpacing:"0.08em",marginBottom:4}}>{cutStatus.label}</div>
        <div style={{fontSize:15,fontWeight:700,color:C.t,lineHeight:1.35}}>{cutStatus.msg}</div>
        <button onClick={()=>setTab(nextAction.tab)} style={{marginTop:12,width:"100%",border:"none",borderRadius:8,background:C.p,color:C.oa,padding:"13px 16px",fontSize:15,fontWeight:800,fontFamily:"inherit",boxShadow:C.sh,cursor:"pointer"}}>{nextAction.label}</button>
        <div style={{fontSize:12,color:C.t3,marginTop:6,textAlign:"center"}}>{nextAction.hint}</div>
      </X>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <X style={{padding:12}}>
          <div style={{fontSize:11,fontWeight:800,color:C.t3}}>Protein</div>
          <div style={{fontSize:26,fontWeight:850,color:tPro>=proT?C.g:C.r}}>{tPro}<span style={{fontSize:14,color:C.t3,fontWeight:650}}>/{proT}g</span></div>
          <Br v={tPro} max={proT} color={tPro>=proT?C.g:C.r} h={7}/>
        </X>
        <X style={{padding:12}}>
          <div style={{fontSize:11,fontWeight:800,color:C.t3}}>Calories</div>
          <div style={{fontSize:26,fontWeight:850,color:calT&&tCal>calT?C.r:C.p}}>{calT===null?"Flex":tCal}<span style={{fontSize:14,color:C.t3,fontWeight:650}}>{calT?`/${calT}`:""}</span></div>
          {calT?<Br v={tCal} max={calT} color={tCal>calT?C.r:C.p} h={7}/>:<div style={{fontSize:11,color:C.t3}}>protein floor only</div>}
        </X>
      </div>

      <X style={{padding:12,borderLeft:`4px solid ${waterToday>=waterGoal?C.g:C.p}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:8}}>
          <div>
            <div style={{fontSize:11,fontWeight:800,color:C.t3}}>Water</div>
            <div style={{fontSize:24,fontWeight:850,color:waterToday>=waterGoal?C.g:C.p}}>{waterToday}<span style={{fontSize:14,color:C.t3,fontWeight:650}}>/{waterGoal} oz</span></div>
          </div>
          {waterToday>0&&<button onClick={resetWater} style={{border:"none",background:"transparent",color:C.t3,fontSize:11,fontWeight:800,fontFamily:"inherit"}}>Reset</button>}
        </div>
        <Br v={waterToday} max={waterGoal} color={waterToday>=waterGoal?C.g:C.p} h={7}/>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginTop:9}}>
          {WATER_PRESETS.map(b=><button type="button" key={b.oz} onClick={()=>{haptic();addWater(b.oz);}} style={{border:`1px solid ${C.bd}`,background:C.bg,color:C.t,borderRadius:9,padding:"10px 4px",minHeight:60,cursor:"pointer",fontFamily:FD}}><span style={{display:"block",fontSize:22,fontWeight:800,lineHeight:1}}>+{b.oz}</span><span style={{display:"block",fontSize:9,fontWeight:700,letterSpacing:"0.08em",color:C.t3,marginTop:3}}>{b.l}</span></button>)}
        </div>
      </X>

      <X style={{padding:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div>
            <div style={{fontSize:11,fontWeight:800,color:C.t3}}>Today</div>            <div style={{fontSize:16,fontWeight:800,color:C.t}}>{sess?sess.name:"Rest Day"}</div>
            {sess&&<div style={{fontSize:12,color:C.t2}}>{sess.focus} · ~{estTime(sess)}m</div>}
          </div>
          <button onClick={()=>setTab("training")} style={{border:`1px solid ${C.bd}`,background:"transparent",color:C.t,borderRadius:8,padding:"8px 12px",fontSize:12,fontWeight:800,fontFamily:"inherit"}}>{workoutDone?"Done":"Open"}</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:5}}>
          {[{l:"Scale",ok:weightLogged},{l:"Food",ok:nutritionLogged},{l:"Lift",ok:!sess||workoutDone},{l:"Cardio",ok:cardioDone},{l:"Habits",ok:habitsLogged}].map(x=>(
            <div key={x.l} style={{textAlign:"center",padding:"7px 2px",borderRadius:6,background:"transparent",border:`1px solid ${C.bd}`}}>
              <div style={{fontSize:14,fontWeight:800,color:x.ok?C.g:C.t3}}>{x.ok?"✓":"○"}</div>
              <div style={{fontSize:9,fontWeight:800,color:C.t3}}>{x.l}</div>
            </div>
          ))}
        </div>
      </X>

      {(()=>{const r=data.rec?.[t];if(!r||(r.recoveryScore==null&&r.hrv==null&&r.sleepHours==null))return null;
        const sc=r.recoveryScore;const col=sc==null?C.t2:sc>=60?C.g:sc<40?C.r:C.t2;
        return(<X style={{padding:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:11,fontWeight:800,color:C.t3}}>Recovery{r.source?` · ${String(r.source).toUpperCase()}`:""}</div>
            {sc!=null&&<div style={{fontSize:22,fontWeight:800,color:col,fontFamily:FD}}>{sc}%</div>}
          </div>
          <div style={{display:"flex",gap:16,marginTop:4}}>
            {[["HRV",r.hrv?`${Math.round(r.hrv)}ms`:null],["RHR",r.rhr?`${Math.round(r.rhr)}`:null],["SLEEP",r.sleepHours?`${(+r.sleepHours).toFixed(1)}h`:null]].filter(x=>x[1]).map(([l,v])=>(
              <div key={l}><span style={{fontSize:16,fontWeight:800,color:C.t,fontFamily:FD}}>{v}</span> <span style={{fontSize:9,fontWeight:700,color:C.t3,fontFamily:FD,letterSpacing:"0.06em"}}>{l}</span></div>))}
          </div>
        </X>);})()}

      <WeightTrendCard trend={weightTrend} compact/>

      <X style={{padding:12,borderLeft:`4px solid ${C.bd}`}}>
        <div style={{fontSize:11,fontWeight:800,color:C.t3}}>Tonight closeout</div>
        <div style={{fontSize:15,fontWeight:850,color:C.t,marginTop:2,lineHeight:1.3}}>Tomorrow: {tonightCloseout.tomorrowMode}</div>
        <div style={{fontSize:12,color:C.t2,marginTop:4,lineHeight:1.35}}>{tonightCloseout.action}</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:5,marginTop:9}}>
          {[
            {l:"Food",ok:tonightCloseout.foodOk,v:tonightCloseout.proteinLeft>0?`${tonightCloseout.proteinLeft}g P left`:"OK"},
            {l:"Steps",ok:tonightCloseout.stepsOk,v:`${Math.round(tonightCloseout.steps/1000)}k/${Math.round(tonightCloseout.stepsTarget/1000)}k`},
            {l:"Cardio",ok:tonightCloseout.cardioDone,v:tonightCloseout.cardioDone?"Done":"Open"},
            {l:"Recovery",ok:tonightCloseout.recovery==null||tonightCloseout.recovery>=55,v:tonightCloseout.recovery==null?"—":`${tonightCloseout.recovery}%`}
          ].map(x=>(
            <div key={x.l} style={{padding:"7px 4px",borderRadius:6,textAlign:"center",background:"transparent",border:`1px solid ${C.bd}`}}>
              <div style={{fontSize:9,fontWeight:850,color:C.t3}}>{x.l}</div>
              <div style={{fontSize:11,fontWeight:850,color:x.ok?C.g:C.t3,marginTop:1}}>{x.v}</div>
            </div>
          ))}
        </div>
        <div style={{marginTop:10}}><CloseoutPanel data={data} setData={setData}/></div>
      </X>

      <X style={{padding:12,borderLeft:`4px solid ${C.bd}`}}>
        <div style={{fontSize:11,fontWeight:800,color:C.t3}}>Weekly recommendation</div>
        <div style={{fontSize:15,fontWeight:800,color:C.t,marginTop:2,lineHeight:1.3}}>{weeklyRecommendation.action}</div>
        <div style={{fontSize:12,color:C.t2,marginTop:4,lineHeight:1.35}}>{weeklyRecommendation.why}</div>
        <div style={{fontSize:11,fontWeight:800,color:C.t3,marginTop:8}}>Confidence: {weeklyRecommendation.confidence} · data quality: {weeklyRecommendation.summary.loggedDays}/7 food, {weeklyRecommendation.summary.weightDays}/7 weight, {weeklyRecommendation.summary.recoveryDays}/7 recovery</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:8}}>
          {weeklyRecommendation.signals.map(sig=>{
            const col=sig.tone==="good"?C.g:sig.tone==="bad"?C.r:sig.tone==="warn"?C.t2:C.t3;
            const bg=sig.tone==="good"?C.gl:sig.tone==="bad"?C.rl:sig.tone==="warn"?C.bg:C.bg;
            return <span key={sig.label} style={{fontSize:10,fontWeight:850,color:C.t3,background:"transparent",border:`1px solid ${C.bd}`,borderRadius:6,padding:"5px 7px"}}>{sig.label}: <span style={{color:col}}>{sig.value}</span></span>;
          })}
        </div>
      </X>

      <WeeklyConsistencyCard summary={weeklyConsistency}/>

      {/* Allergies · demoted to a compact expandable line below primary cards */}
      <X style={{padding:"9px 12px",borderLeft:`3px solid ${C.bd}`,cursor:"pointer"}} onClick={()=>setAllergyOpen(o=>!o)}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
          <div style={{fontSize:12,color:C.t2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:allergyOpen?"normal":"nowrap"}}>
            <b style={{color:C.t3,fontSize:11}}>Allergies</b>{" "}
            {allergyTop.length?allergyTop.map(a=>`${a.name} ${a.level||"—"}`).join(" · "):allergyErr||"Loading…"}
          </div>
          <span style={{fontSize:11,color:C.t3}}>{allergyOpen?"▴":"▾"}</span>
        </div>
        {allergyOpen&&(
          <div style={{fontSize:12,color:C.t2,marginTop:6,lineHeight:1.5}}>
            {allergyTop.map(a=><div key={a.name}><b style={{color:C.t}}>{a.name}:</b> {a.level||"—"}{a.count?` · ${a.count}`:""}{a.trend?` · ${a.trend}`:""}</div>)}
            <a href={allergies?.sourceUrl||"https://austinpollen.com/"} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{fontSize:11,fontWeight:800,color:C.p,textDecoration:"none"}}>{allergies?.source||"AustinPollen.com"}</a>
          </div>
        )}
      </X>

      <button onClick={()=>setShowFullDashboard(true)} style={{background:"transparent",border:`1px solid ${C.bd}`,borderRadius:8,padding:"11px",fontSize:13,fontWeight:800,color:C.t2,fontFamily:"inherit"}}>Open review details</button>
    </div>
  );

  return(
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      <div>
        <div style={{fontSize:18,fontWeight:700,color:C.t}}>Review Details</div><button onClick={()=>setShowFullDashboard(false)} style={{background:"transparent",border:`1px solid ${C.bd}`,borderRadius:8,padding:"7px 10px",fontSize:12,fontWeight:800,color:C.t2,fontFamily:"inherit"}}>← Cut Command</button>
        <div style={{fontSize:13,color:C.t3}}>{fmt(t)} · Wk {w}/{PROG.weeks}{w===PROG.deload?" · DELOAD":""}{dayType==="travel"?" · TRAVEL DAY":""}</div>
      </div>

      <X style={{borderLeft:`3px solid ${C.bd}`,padding:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:11,fontWeight:600,color:C.p,letterSpacing:"0.06em"}}>Today</div>
            <div style={{fontSize:16,fontWeight:700,color:C.t,marginTop:1}}>{sess?sess.name:"Rest Day"}</div>
            {sess&&<div style={{fontSize:13,color:C.t2}}>{sess.focus} · {sess.exercises.length} ex · ~{estTime(sess)}m</div>}
          </div>
          {data.wk[t]?<span style={{fontSize:13,fontWeight:600,color:C.g}}>Complete</span>
           :sess?<span style={{fontSize:13,fontWeight:600,color:C.p}}>Ready</span>:null}
        </div>
      </X>

      {/* ═══ MORNING GAME PLAN ═══ */}
      {mealSlots>0&&proRemaining>0&&(
        <X style={{borderLeft:`3px solid ${C.bd}`,padding:12}}>
          <div style={{fontSize:11,fontWeight:700,color:C.p,letterSpacing:"0.06em",marginBottom:6}}>Game Plan</div>
          <div style={{fontSize:13,color:C.t,marginBottom:8}}>
            <span style={{fontWeight:700}}>{proRemaining}g protein</span> remaining across <span style={{fontWeight:700}}>{mealSlots} meal{mealSlots!==1?"s":""}</span>
            {calRemaining>0&&<span style={{color:C.t2}}> / {calRemaining} cal left</span>}
          </div>
          {preDinnerSlots>0&&(
            <div style={{fontSize:12,color:C.t2,marginBottom:4}}>
              {Array.from({length:preDinnerSlots}).map((_,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",borderBottom:`1px solid ${C.bl}`}}>
                  <span>{preDinnerSlots===1?"Next meal":`Meal ${mealsLogged+i+1}`}</span>
                  <span style={{fontWeight:600,color:C.t}}>~{perMealPro}g protein · ~{Math.round(calRemaining/mealSlots)} cal</span>
                </div>
              ))}
            </div>
          )}
          <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0",fontSize:12}}>
            <span style={{color:C.t2}}>Dinner (flexible)</span>
            <span style={{fontWeight:600,color:C.t}}>~{dinnerPro}g protein · eat what you want</span>
          </div>
          {topProMeals.length>0&&(
            <div style={{marginTop:8,paddingTop:6,borderTop:`1px solid ${C.bl}`}}>
              <div style={{fontSize:11,fontWeight:600,color:C.t3,marginBottom:4}}>HIGH-PROTEIN FROM YOUR HISTORY</div>
              {topProMeals.slice(0,3).map((m,i)=>(
                <div key={i} style={{fontSize:12,color:C.t2,padding:"2px 0"}}>
                  {m.desc} · <span style={{fontWeight:600,color:C.g}}>{m.pro}g pro</span>, {m.cal} cal
                </div>
              ))}
            </div>
          )}
          {rec?.recoveryScore!=null&&rec.recoveryScore<55&&(
            <div style={{marginTop:6,padding:"6px 8px",background:C.bg,borderRadius:8,fontSize:11,color:C.t2,fontWeight:600}}>
              Recovery at {rec.recoveryScore}% · add ~25g protein today. Don't cut calories, your body needs fuel to recover.
            </div>
          )}
        </X>
      )}

      {/* ═══ AUTOREGULATION CARD ═══ */}
      {autoreg&&(<X style={{padding:10,borderLeft:`3px solid ${autoreg.level==="green"?C.g:autoreg.level==="yellow"?C.bd:C.r}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
          <div style={{fontSize:11,fontWeight:700,color:autoreg.level==="green"?C.g:autoreg.level==="yellow"?C.t2:C.r,letterSpacing:"0.06em"}}>
            Recovery Gate {weeklyRecAvg!=null?`— ${weeklyRecAvg}% avg`:""}
          </div>
        </div>
        <div style={{fontSize:13,fontWeight:600,color:C.t}}>{autoreg.msg}</div>
        <div style={{fontSize:12,color:C.t2,marginTop:2}}>{autoreg.action}</div>
        {redDays>=2&&<div style={{fontSize:12,color:C.r,fontWeight:700,marginTop:4}}>⚠ {redDays} consecutive red days · take a rest day. Shift the split forward.</div>}
      </X>)}

      {/* ═══ WEIGHT TREND ALERT ═══ */}
      {weightTrend&&Math.abs(weightTrend.rate)>1&&(<X style={{padding:10,borderLeft:`3px solid ${C.bd}`}}>
        <div style={{fontSize:11,fontWeight:700,color:C.r,letterSpacing:"0.06em"}}>Weight Alert · {weightTrend.direction==="up"?"gaining":"losing"} {Math.abs(weightTrend.rate).toFixed(1)} lb/wk</div>
        <div style={{fontSize:12,color:C.t2,marginTop:2}}>{weightTrend.rate>0?"Pull back weekend portions slightly. You are in surplus.":"Add 200 cal to training days from carbs. You are cutting; protect performance."}</div>
      </X>)}

      {/* ═══ DAY TYPE INDICATOR ═══ */}
      <X style={{padding:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:11,fontWeight:700,color:C.t3}}>{isSocialWeekendActive(t,data.socialWeekend)&&calT===null?"Social Weekend":dayType==="wednesday"?"Wednesday (Fast)":dayType==="training"?"Training Day":"Weekend"}</div>
        <div style={{fontSize:12,color:C.t2}}>{calT!==null?`${calT} cal · ${proT}g protein target`:`${proT}g protein floor`}</div>
      </X>

      {/* ═══ SOCIAL WEEKEND TOGGLE ═══ */}
      {(()=>{
        const swActive=isSocialWeekendActive(t,data.socialWeekend);
        const toggleSW=()=>{
          const monday=getWeekMonday(t);
          const nd={...data,socialWeekend:swActive?{active:false,weekOf:null}:{active:true,weekOf:monday}};
          setData(nd);sv(nd);
        };
        return(<X style={{padding:"8px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:swActive?C.p:C.t3,letterSpacing:"0.06em"}}>Social Weekend</div>
            {swActive&&<div style={{fontSize:10,color:C.t2}}>Mon-Thu targets lowered · ~1.5 lbs this week</div>}
          </div>
          <button onClick={toggleSW} style={{background:swActive?C.p:C.bl,color:swActive?C.oa:C.t2,border:`1px solid ${swActive?C.p:C.bd}`,borderRadius:8,padding:"4px 10px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{swActive?"Active":"Off"}</button>
        </X>);
      })()}

      {/* ═══ ADAPTIVE TDEE ═══ */}
      {(()=>{
        const td=tdeeData;
        if(!td)return null;
        const borderColor=td.phase==="confident"?C.g:td.phase==="early"?C.bd:td.phase==="seeded"?C.g:C.p;
        if(td.phase==="collecting")return(
          <X style={{padding:12,borderLeft:`3px solid ${C.bd}`}}>
            <L>Adaptive TDEE</L>
            <div style={{fontSize:14,fontWeight:600,color:C.t2,marginTop:4}}>Collecting data...</div>
            <div style={{fontSize:12,color:C.t3,marginTop:4}}>Log weight + meals for {Math.max(1,7-td.daysUsed)} more day{7-td.daysUsed!==1?"s":""} to unlock your personalized TDEE</div>
            <div style={{marginTop:8}}><Br v={td.daysUsed} max={7} color={C.p} h={6}/></div>
            <div style={{fontSize:10,color:C.t3,marginTop:3,textAlign:"right"}}>{td.daysUsed}/7 days</div>
          </X>
        );
        const deficitLabel=td.deficit>0?"deficit":td.deficit<0?"surplus":"on target";
        const deficitColor=td.deficit>0?C.g:td.deficit<0?C.r:C.t2;
        const paceLabel=td.weeklyChange<0?`~${Math.round(Math.abs(td.weeklyChange))} lbs/wk loss`
          :td.weeklyChange>0?`~${Math.round(td.weeklyChange)} lbs/wk gain`:"weight stable";
        return(
          <X style={{padding:12,borderLeft:`3px solid ${borderColor}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <L>Adaptive TDEE{td.phase==="early"?" · early estimate":td.phase==="seeded"?" · recomp seeded":""}</L>
              <span style={{fontSize:10,color:C.t3}}>{td.daysUsed}d cut{td.historyDays?` + ${td.historyDays}d history`:""}</span>
            </div>
            <div style={{display:"flex",alignItems:"baseline",gap:6,marginBottom:6}}>
              <span style={{fontSize:26,fontWeight:800,color:C.t}}>{td.phase==="early"?"~":""}{td.tdee.toLocaleString()}</span>
              {td.tdeeLow!=null&&<span style={{fontSize:13,fontWeight:600,color:C.t3}}>±{td.tdee-td.tdeeLow}</span>}
              <span style={{fontSize:13,color:C.t3}}>cal/day</span>
            </div>
            <Br v={td.confidence} max={100} color={borderColor} h={5}/>
            <div style={{fontSize:10,color:C.t3,marginTop:2}}>confidence: {td.confidence}%{td.imputedShare!=null?` · ${Math.round((1-td.imputedShare)*100)}% measured`:""}{td.calibrated===false?" · calibrate in Setup to tighten":""}{td.phase==="early"?" · keep logging for accuracy":td.phase==="seeded"?" · seeded from recomp data":""}</div>
            {td.phase==="confident"&&(<>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginTop:10}}>
                <div style={{textAlign:"center",padding:6,background:C.bg,borderRadius:8}}>
                  <div style={{fontSize:14,fontWeight:700,color:td.weeklyChange<0?C.g:td.weeklyChange>0?C.r:C.t2}}>{td.weeklyChange>0?"+":""}{Math.round(td.weeklyChange)}</div>
                  <div style={{fontSize:9,color:C.t3,fontWeight:600}}>lbs/wk</div>
                </div>
                <div style={{textAlign:"center",padding:6,background:C.bg,borderRadius:8}}>
                  <div style={{fontSize:14,fontWeight:700,color:C.t2}}>{td.avgCalories.toLocaleString()}</div>
                  <div style={{fontSize:9,color:C.t3,fontWeight:600}}>avg in</div>
                </div>
                <div style={{textAlign:"center",padding:6,background:C.bg,borderRadius:8}}>
                  <div style={{fontSize:14,fontWeight:700,color:deficitColor}}>{Math.abs(td.deficit)}</div>
                  <div style={{fontSize:9,color:C.t3,fontWeight:600}}>{deficitLabel}</div>
                </div>
              </div>
              <div style={{marginTop:8,padding:"6px 8px",background:C.gl,borderRadius:8,fontSize:11,color:C.g}}>
                Eating {Math.abs(td.deficit)} cal {td.deficit>0?"below":"above"} TDEE · {paceLabel}
              </div>
            </>)}
          </X>
        );
      })()}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
        <X style={{padding:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:4}}>
            <span style={{fontSize:11,fontWeight:600,color:C.t3}}>Weight</span>
            <span style={{fontSize:18,fontWeight:700,color:C.t}}>{lw?Math.round(lw):"—"}</span>
          </div>
          {wc&&<div style={{fontSize:11,fontWeight:600,color:wc<0?C.g:wc>0?C.r:C.t3,marginBottom:4}}>{wc>0?"+":""}{wc} lbs 7d</div>}
          {wCh.length>=2?(
            <svg viewBox={`0 0 ${wCh.length*20} 28`} style={{width:"100%",height:28}} preserveAspectRatio="none">
              {(()=>{const vals=wCh.map(d=>d.v),mn=Math.min(...vals),mx=Math.max(...vals),rng=mx-mn||1;
                const pts=wCh.map((d,i)=>[i*(wCh.length*20/(wCh.length-1)),28-4-((d.v-mn)/rng)*20]);
                const line=pts.map(p=>p.join(",")).join(" ");
                return <polyline points={line} fill="none" stroke={C.p} strokeWidth="2" strokeLinecap="round"/>;
              })()}
            </svg>
          ):<div style={{fontSize:12,color:C.t3,textAlign:"center",padding:"4px 0"}}>No data yet</div>}
        </X>

        <X style={{padding:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:4}}>
            <span style={{fontSize:11,fontWeight:600,color:C.t3}}>Steps</span>
            <span style={{fontSize:18,fontWeight:700,color:C.t}}>{steps?steps.toLocaleString():"—"}</span>
          </div>
          <Br v={steps} max={cutStepsTarget(st)} color={steps>=cutStepsTarget(st)?C.g:C.t3} h={6}/>
          <div style={{fontSize:10,color:C.t3,marginTop:3,textAlign:"right"}}>{steps?Math.round(steps/cutStepsTarget(st)*100):0}% of {(cutStepsTarget(st)/1000).toFixed(0)}k</div>
        </X>
      </div>

      {(()=>{const wt=data.water?.[t]||0;const waterG=st.water||128;return(
      <X style={{padding:10}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
          <span style={{fontSize:11,fontWeight:600,color:C.t3}}>Water</span>
          <span style={{fontSize:16,fontWeight:700,color:wt>=waterG?C.g:C.p}}>{wt} <span style={{fontSize:12,color:C.t3,fontWeight:500}}>/ {waterG} oz</span></span>
        </div>
        <Br v={wt} max={waterG} color={wt>=waterG?C.g:C.p} h={6}/>
      </X>);})()}

      <X style={{padding:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <span style={{fontSize:13,fontWeight:700,color:C.t}}>Nutrition</span>
          <span style={{fontSize:12,color:C.t3}}>{fmt(t)}</span>
        </div>
        {calT!==null?(<>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}>
          <div style={{fontSize:28,fontWeight:700,color:tCal>calT?C.r:C.p}}>{tCal}</div>
          <div style={{fontSize:14,color:C.t3}}>/ {calT} cal</div>
        </div>
        <Br v={tCal} max={calT} color={tCal>calT?C.r:C.p} h={8}/>
        </>):(<>
        <div style={{fontSize:13,color:C.t2,marginBottom:6,fontStyle:"italic"}}>Social weekend · log your food, protein first</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}>
          <div style={{fontSize:28,fontWeight:700,color:tPro>=proT?C.g:C.p}}>{tPro}g</div>
          <div style={{fontSize:14,color:C.t3}}>/ {proT}g protein floor</div>
        </div>
        <Br v={tPro} max={proT} color={tPro>=proT?C.g:C.p} h={8}/>
        </>)}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6,marginTop:10}}>
          {[{l:"Protein",v:tPro,x:proT,u:"g",c:tPro>=proT?C.g:C.r},
            {l:"Carbs",v:nut?.totalCarbs||0,x:null,u:"g",c:C.t2},
            {l:"Fat",v:nut?.totalFat||0,x:null,u:"g",c:fatPct>25?C.r:C.t2},
            {l:"Fiber",v:tFib,x:st.fiber||30,u:"g",c:C.v}].map((m,i)=>(
            <div key={i} style={{textAlign:"center"}}>
              <div style={{fontSize:20,fontWeight:700,color:m.c}}>{m.v}{m.u}</div>
              {m.x?<div style={{fontSize:10,color:C.t3}}>/ {m.x}{m.u}</div>:<div style={{fontSize:10,color:C.t3}}>&nbsp;</div>}
              <div style={{fontSize:10,fontWeight:600,color:C.t3,marginTop:2}}>{m.l}</div>
              {m.x&&<Br v={m.v} max={m.x} color={m.c} h={4}/>}
            </div>
          ))}
        </div>
        {fatPct>25&&tCal>0&&(<div style={{marginTop:6,padding:"6px 8px",background:C.rl,borderRadius:8,fontSize:11,color:C.r,fontWeight:600}}>
          Fat at {fatPct}% of calories (target: 20-25%). Check cooking oil, cheese, sauces.
        </div>)}
        {dayType==="training"&&tPro>0&&tPro<100&&(<div style={{marginTop:4,padding:"6px 8px",background:C.bg,borderRadius:8,fontSize:11,color:C.t2,fontWeight:600}}>
          Protein checkpoint: {tPro}g so far · load remaining meals heavier on lean protein.
        </div>)}
      </X>

      {/* ═══ PROTEIN CHECKPOINTS ═══ */}
      {dayType==="training"&&(<X style={{padding:10}}>
        <div style={{fontSize:11,fontWeight:700,color:C.t3,letterSpacing:"0.06em",marginBottom:6}}>Protein Checkpoints</div>
        {PROTEIN_CHECKPOINTS.map((cp,i)=>{
          const hit=tPro>=cp.target;
          return(<div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 0",borderTop:i>0?`1px solid ${C.bl}`:"none"}}>
            <span style={{fontSize:14,color:hit?C.g:C.t3}}>{hit?"✓":"○"}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:12,fontWeight:600,color:hit?C.g:C.t}}>{cp.label}</div>
              <div style={{fontSize:10,color:C.t3}}>{cp.time} · {cp.target}g</div>
            </div>
            <Br v={Math.min(tPro,cp.target)} max={cp.target} color={hit?C.g:C.t3} h={4}/>
          </div>);
        })}
      </X>)}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
        <X style={{padding:8,textAlign:"center"}}>
          <div style={{fontSize:20,fontWeight:700,color:ws>=67?C.g:ws>=34?C.t2:ws!=null?C.r:C.t3}}>{ws??"-"}{ws!=null?"%":""}</div>
          <div style={{fontSize:10,fontWeight:600,color:C.t3}}>Recovery{rec?.source?` · ${String(rec.source).toUpperCase()}`:""}</div>
          {rec&&<div style={{fontSize:10,color:C.t3,marginTop:3,lineHeight:1.35}}>
            {rec.sleepHours?`${rec.sleepHours}h sleep`:"Sleep —"} · {rec.hrv?`${rec.hrv} HRV`:"HRV —"} · {rec.rhr?`${rec.rhr} RHR`:"RHR —"}
          </div>}
        </X>
        <X style={{padding:8,textAlign:"center"}}>
          <div style={{fontSize:20,fontWeight:700,color:streak>=5?C.g:C.t2}}>{streak}<span style={{fontSize:12,fontWeight:600}}>d</span></div>
          <div style={{fontSize:10,fontWeight:600,color:C.t3}}>Streak</div>
        </X>
      </div>

      {habitScore!=null&&(
        <X style={{padding:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:13}}>
            <span style={{fontWeight:600,color:C.t2}}>Habit Score (7d)</span>
            <span style={{fontWeight:700,color:habitScore>=70?C.g:habitScore>=40?C.t2:C.r}}>{habitScore}%</span>
          </div>
          <Br v={habitScore} max={100} color={habitScore>=70?C.g:habitScore>=40?C.t3:C.r}/>
        </X>
      )}

      {/* ═══ CUT RETENTION SCORE ═══ */}
      {retention&&(
        <X style={{padding:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:C.t3,letterSpacing:"0.06em"}}>Cut Retention Score</div>
              <div style={{fontSize:10,color:C.t3}}>Cut pace + protein + lift retention</div>
            </div>
            <div style={{fontSize:28,fontWeight:800,color:retention.score>=70?C.g:retention.score>=45?C.t2:C.r}}>{retention.score}</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
            <div style={{textAlign:"center",padding:6,background:C.bg,borderRadius:8}}>
              <div style={{fontSize:14,fontWeight:700,color:retention.weight.score>=70?C.g:C.t2}}>{retention.weight.change>0?"+":""}{retention.weight.change}</div>
              <div style={{fontSize:9,color:C.t3,fontWeight:600}}>lbs/wk</div>
            </div>
            <div style={{textAlign:"center",padding:6,background:C.bg,borderRadius:8}}>
              <div style={{fontSize:14,fontWeight:700,color:retention.lifts.score>=50?C.g:C.t2}}>{retention.lifts.held}/{retention.lifts.total}</div>
              <div style={{fontSize:9,color:C.t3,fontWeight:600}}>Lifts Held</div>
            </div>
            <div style={{textAlign:"center",padding:6,background:C.bg,borderRadius:8}}>
              <div style={{fontSize:14,fontWeight:700,color:retention.protein.score>=70?C.g:C.t2}}>{retention.protein.hit}/{retention.protein.days}</div>
              <div style={{fontSize:9,color:C.t3,fontWeight:600}}>Pro Days</div>
            </div>
          </div>
        </X>
      )}

      {/* ═══ BODY MEASUREMENTS ═══ */}
      {(()=>{
        const measEntries=Object.entries(data.bodyMeas||{}).filter(([_,v])=>v&&Object.values(v).some(x=>x)).sort((a,b)=>b[0].localeCompare(a[0]));
        const latest=measEntries[0],prev=measEntries[1];
        const measFields=[{k:"chest",l:"Chest",up:true},{k:"waist",l:"Waist",up:false},{k:"armL",l:"L Arm",up:true},{k:"armR",l:"R Arm",up:true},{k:"thighL",l:"L Thigh",up:true},{k:"thighR",l:"R Thigh",up:true}];
        const saveDashMeas=()=>{
          const vals={};measFields.forEach(f=>{if(measF[f.k])vals[f.k]=parseFloat(measF[f.k]);});
          if(!Object.keys(vals).length)return;
          const nd={...data,bodyMeas:{...data.bodyMeas,[t]:{...(data.bodyMeas[t]||{}),...vals}}};
          setData(nd);sv(nd);svSB.bodyMeas(t,nd.bodyMeas[t]);setShowMeasForm(false);setMeasF({chest:"",waist:"",armL:"",armR:"",thighL:"",thighR:""});
        };
        return(
          <X style={{padding:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <div style={{fontSize:11,fontWeight:700,color:C.t3,letterSpacing:"0.06em"}}>Body Measurements</div>
              <button onClick={()=>setShowMeasForm(!showMeasForm)} style={{background:C.pl,border:`1px solid ${C.p}`,borderRadius:8,padding:"3px 10px",fontSize:11,fontWeight:700,color:C.p,cursor:"pointer",fontFamily:"inherit"}}>Log</button>
            </div>
            {showMeasForm&&(
              <div style={{marginBottom:8,padding:8,background:C.bg,borderRadius:6,border:`1px solid ${C.bd}`}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:6}}>
                  {measFields.map(f=>(
                    <div key={f.k}>
                      <L>{f.l} (in)</L>
                      <N value={measF[f.k]} onChange={v=>setMeasF(p=>({...p,[f.k]:v}))} placeholder="0.0"/>
                    </div>
                  ))}
                </div>
                <B full small onClick={saveDashMeas} disabled={!measFields.some(f=>measF[f.k])}>Save Measurements</B>
              </div>
            )}
            {latest?(
              <div>
                <div style={{fontSize:11,color:C.t3,marginBottom:4}}>{fmt(latest[0])}{prev?` vs ${fmt(prev[0])}`:""}  </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4}}>
                  {measFields.filter(f=>latest[1][f.k]).map(f=>{
                    const d=prev&&prev[1][f.k]?parseFloat((latest[1][f.k]-prev[1][f.k]).toFixed(1)):null;
                    return(<div key={f.k} style={{textAlign:"center",padding:"4px 2px",background:C.bg,borderRadius:8}}>
                      <div style={{fontSize:13,fontWeight:700,color:C.t}}>{latest[1][f.k]}"</div>
                      <div style={{fontSize:9,color:C.t3,fontWeight:600}}>{f.l}</div>
                      {d!==null&&d!==0&&<div style={{fontSize:10,fontWeight:600,color:f.up?(d>0?C.g:C.r):(d<0?C.g:C.r)}}>{d>0?"↑":"↓"}{Math.abs(d)}</div>}
                    </div>);
                  })}
                </div>
              </div>
            ):(
              <div onClick={()=>setShowMeasForm(true)} style={{fontSize:13,color:C.t3,textAlign:"center",padding:"8px 0",cursor:"pointer"}}>
                Log your first measurements → tap to enter
              </div>
            )}
          </X>
        );
      })()}

      {/* ═══ DATA INSIGHTS ═══ */}
      {dataInsights.length>0&&(
        <X style={{padding:10}}>
          <div style={{fontSize:11,fontWeight:700,color:C.t3,letterSpacing:"0.06em",marginBottom:6}}>Insights</div>
          {dataInsights.map((ins,i)=>(
            <div key={i} style={{display:"flex",gap:6,alignItems:"flex-start",padding:"4px 0",borderTop:i>0?`1px solid ${C.bl}`:"none"}}>
              <span style={{fontSize:12,color:ins.type==="win"?C.g:ins.type==="gap"?C.t2:C.p,fontWeight:700,minWidth:14}}>
                {ins.type==="win"?"+":ins.type==="gap"?"!":"~"}
              </span>
              <span style={{fontSize:12,color:C.t2}}>{ins.text}</span>
            </div>
          ))}
        </X>
      )}

      <S title="Trends" collapsible defaultOpen={false}>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          <Ch data={wCh} color={C.p} label="Weight" yUnit=" lbs" empty="Log weight to see trend"/>
          <Ch data={recCh} color={C.g} label="Recovery" yUnit="%" empty="Log recovery to see trend"/>
          <Ch data={rhrCh} color={C.v} label="RHR" yUnit=" bpm" empty="Log RHR to see trend"/>
          <Ch data={stCh} color={C.t2} label="Steps" empty="Log steps to see trend"/>
          <Ch data={slCh} color={C.p} label="Sleep" yUnit=" hrs" empty="Log sleep to see trend"/>
        </div>
      </S>

      {totalL>0&&(
        <X style={{padding:10}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:13}}>
            <span style={{color:C.t2,fontWeight:600}}>Lift Retention Logs</span>
            <span style={{color:C.g,fontWeight:700}}>{liftsHeld}/{totalL}</span>
          </div>
          <Br v={liftsHeld} max={totalL} color={C.g}/>
        </X>
      )}

      {(()=>{
        const last14=Array.from({length:14},(_,i)=>{const d=new Date();d.setDate(d.getDate()-i);return lds(d);}).reverse();
        const last7=last14.slice(-7);
        const volData=last14.map(d=>({v:(data.wk[d]&&data.wk[d].volume)||0,d:d.slice(5)})).filter(x=>x.v>0);
        const thisWk=last7.reduce((s,d)=>s+((data.wk[d]&&data.wk[d].volume)||0),0);
        const prev7=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-7-i);return lds(d);});
        const lastWk=prev7.reduce((s,d)=>s+((data.wk[d]&&data.wk[d].volume)||0),0);
        const pct=lastWk>0?Math.round((thisWk-lastWk)/lastWk*100):0;
        return thisWk>0?(
          <X style={{padding:10,borderLeft:"3px solid "+C.p}}>
            <div style={{fontSize:11,fontWeight:700,color:C.t3,marginBottom:6}}>Weekly Volume</div>
            <div style={{fontSize:22,fontWeight:700}}>{thisWk.toLocaleString()} lbs</div>
            {lastWk>0&&<div style={{fontSize:12,color:pct>=0?C.g:C.r,marginTop:2}}>{pct>=0?"+":""}{pct}% vs last week</div>}
            {volData.length>1&&<Ch data={volData} color={C.p} label="Daily Volume" yUnit=" lbs"/>}
          </X>
        ):null;
      })()}

      {(()=>{
        const prs=Object.entries(data.prog||{}).filter(([_,v])=>v.pr).map(([id,v])=>({id,name:v.pr.name||id.replace(/-/g," "),e1rm:v.pr.e1rm,weight:v.pr.weight,reps:v.pr.reps,date:v.pr.date})).sort((a,b)=>b.e1rm-a.e1rm);
        const recent=prs.filter(p=>{const d=new Date(p.date);const ago=new Date();ago.setDate(ago.getDate()-7);return d>=ago;});
        return prs.length>0?(
          <X style={{padding:10,borderLeft:"3px solid "+C.bd}}>
            <div style={{fontSize:11,fontWeight:700,color:C.t3,marginBottom:6}}>Personal Records{recent.length>0?" ("+recent.length+" new this week)":""}</div>
            {prs.slice(0,8).map(p=>(
              <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:"1px solid "+C.bd}}>
                <div style={{fontSize:13,textTransform:"capitalize"}}>{p.name}</div>
                <div style={{fontSize:13,fontWeight:600}}>{p.weight}x{p.reps} <span style={{color:C.t3,fontSize:11}}>e1RM {p.e1rm}</span></div>
              </div>
            ))}
          </X>
        ):null;
      })()}

      {(()=>{
        const entries=Object.entries(data.bodyMeas||{}).filter(([_,v])=>Object.values(v).some(x=>x)).sort((a,b)=>b[0].localeCompare(a[0]));
        if(entries.length<2)return null;
        const latest=entries[0],prev=entries[1];
        const fields=[{k:"chest",l:"Chest",up:true},{k:"waist",l:"Waist",up:false},{k:"armL",l:"L Arm",up:true},{k:"armR",l:"R Arm",up:true},{k:"thighL",l:"L Thigh",up:true},{k:"thighR",l:"R Thigh",up:true}];
        const deltas=fields.filter(f=>latest[1][f.k]&&prev[1][f.k]).map(f=>({...f,d:parseFloat((latest[1][f.k]-prev[1][f.k]).toFixed(1))})).filter(f=>f.d!==0);
        if(!deltas.length)return null;
        return(
          <X style={{padding:10,borderLeft:"3px solid "+C.v}}>
            <div style={{fontSize:11,fontWeight:700,color:C.t3,marginBottom:6}}>Measurement Changes <span style={{fontWeight:400}}>({fmt(prev[0])} → {fmt(latest[0])})</span></div>
            {deltas.map(f=>(
              <div key={f.k} style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}>
                <span style={{fontSize:13}}>{f.l}</span>
                <span style={{fontSize:13,fontWeight:600,color:f.up?(f.d>0?C.g:C.r):(f.d<0?C.g:C.r)}}>{f.d>0?"+":""}{f.d}"</span>
              </div>
            ))}
          </X>
        );
      })()}

      {(()=>{
        const pairs=Object.entries(data.rec||{}).filter(([d,r])=>r.recoveryScore&&data.wk[d]).map(([d,r])=>({rec:r.recoveryScore,vol:data.wk[d].volume||0}));
        if(pairs.length<5)return null;
        const tiers=[{l:"Green (55+)",min:55,max:999,c:C.g},{l:"Moderate (45-54)",min:45,max:54,c:C.t2},{l:"Red (<45)",min:0,max:44,c:C.r}];
        const tierData=tiers.map(t=>{const p=pairs.filter(x=>x.rec>=t.min&&x.rec<=t.max);return{...t,count:p.length,avgVol:p.length?Math.round(p.reduce((s,x)=>s+x.vol,0)/p.length):0};}).filter(t=>t.count>0);
        return(
          <X style={{padding:10,borderLeft:"3px solid "+C.g}}>
            <div style={{fontSize:11,fontWeight:700,color:C.t3,marginBottom:6}}>Recovery → Performance</div>
            {tierData.map(t=>(
              <div key={t.l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:"1px solid "+C.bd}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <div style={{width:8,height:8,borderRadius:8,background:t.c}}/>
                  <span style={{fontSize:12}}>{t.l}</span>
                  <span style={{fontSize:11,color:C.t3}}>({t.count} sessions)</span>
                </div>
                <span style={{fontSize:13,fontWeight:600}}>{t.avgVol.toLocaleString()} lbs</span>
              </div>
            ))}
            <div style={{fontSize:11,color:C.t2,marginTop:6}}>Average volume output by recovery tier</div>
          </X>
        );
      })()}

      <div style={{display:"flex",gap:3}}>
        {dks.map((dk,i)=>{
          const isToday=dk===dn,done=Object.keys(data.wk).some(ws=>dw(ws)===dk&&wkn(ws)===w);
          return(<div key={dk} style={{flex:1,borderRadius:8,padding:"6px 2px",textAlign:"center",
            background:isToday?C.pl:C.cd,border:`1px solid ${done?C.g:isToday?C.p:C.bd}`}}>
            <div style={{fontSize:11,fontWeight:700,color:isToday?C.p:C.t2}}>{["M","T","W","T","F","S","S"][i]}</div>
            {done&&<div style={{width:6,height:6,borderRadius:6,background:C.g,margin:"2px auto 0"}}/>}
          </div>);
        })}
      </div>

      {/* ═══ AI ANALYSIS ═══ */}
      <AnalysisSection data={data}/>


    </div>
  );
};

// ═══ SWAP MODAL ═══
const SwapModal=({exName,slot,options,onSelect,onClose,getWeight})=>(
  <Sheet open onClose={onClose} title="Swap exercise">
      <div style={{fontSize:13,color:C.t3,marginBottom:6}}>Replacing: <span style={{color:C.t,fontWeight:600}}>{exName}</span></div>
      {slot&&<div style={{fontSize:12,color:C.v,background:C.vl,borderRadius:6,padding:"6px 8px",marginBottom:12}}>Plan slot stays: {slot.sets}×{rrTxt(slot.rr)} · rest {slot.rest}s. Progression is tracked separately for this rep range.</div>}
      {options.length===0&&<div style={{fontSize:13,color:C.t3,textAlign:"center",padding:"12px 0"}}>No plan-safe alternatives found for this lift.</div>}
      {options.map((opt,idx)=>{
        const lw=getWeight(opt,opt.sw,slot);
        const hasHistory=lw!==opt.sw;
        return(<button key={opt.id} onClick={()=>onSelect(opt)} style={{
          display:"block",width:"100%",textAlign:"left",background:idx===0?C.pl:"transparent",
          border:`1px solid ${idx===0?C.p:C.bd}`,borderRadius:6,padding:"12px 14px",marginBottom:8,
          cursor:"pointer",fontFamily:"inherit"}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}>
            <div style={{fontSize:14,fontWeight:700,color:C.t}}>{opt.name}</div>
            {idx===0&&<span style={{fontSize:10,fontWeight:800,color:C.p,background:C.cd,borderRadius:8,padding:"2px 6px"}}>BEST FIT</span>}
          </div>
          <div style={{fontSize:12,color:hasHistory?C.p:C.t3,marginTop:2}}>
            {hasHistory?`This slot: ${lw} ${opt.unit}`:opt.sw>0?`Start: ${opt.sw} ${opt.unit}`:"Bodyweight"} · {opt.region}
          </div>
          <div style={{fontSize:11,color:C.t2,marginTop:3,fontStyle:"italic"}}>{opt.cue}</div>
        </button>);
      })}
      <B full outline onClick={onClose} style={{marginTop:4}}>Cancel</B>
  </Sheet>
);

// ═══ EDITABLE NUMBER · tap the big number to type it ═══
const EditableNum=({value,onCommit,color,fontSize=34,min=0,label})=>{
  const [edit,setEdit]=useState(false);const [v,setV]=useState("");
  const ref=useRef(null);
  useEffect(()=>{if(edit&&ref.current){ref.current.focus();ref.current.select();}},[edit]);
  const commit=()=>{setEdit(false);const n=parseFloat(v);if(!isNaN(n)&&n>=min)onCommit(n);};
  if(edit)return <input ref={ref} type="text" inputMode="decimal" value={v} onChange={e=>setV(e.target.value.replace(/[^0-9.]/g,""))} onBlur={commit} onKeyDown={e=>{if(e.key==="Enter")commit();if(e.key==="Escape")setEdit(false);}} aria-label={label} style={{width:96,fontSize,fontWeight:800,fontFamily:FD,color,textAlign:"center",border:"none",borderBottom:`2px solid ${C.p}`,background:"transparent",outline:"none",padding:0,fontVariantNumeric:"tabular-nums"}}/>;
  return <button type="button" onClick={()=>{setV(String(value));setEdit(true);}} aria-label={`${label}: ${value}. Tap to type`} style={{background:"transparent",border:"none",fontSize,fontWeight:800,color,fontFamily:FD,fontVariantNumeric:"tabular-nums",padding:"0 6px",minHeight:44,cursor:"text",lineHeight:1}}>{value}</button>;
};

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

let restPushWarned=false;
// ═══ TRAINING ═══
const Training=({data,setData,workout,setWorkout,setTab,addToast})=>{
  const t=td(),dn=dw(t);
  const [sel,setSel]=useState(dn);
  const [rl,setRl]=useState(0);
  const [rt,setRt]=useState(0);
  const restEndRef=useRef(0);
  const restTimeoutRef=useRef(null);
  const restNotifiedRef=useRef(false);
  const restAudioCtxRef=useRef(null);
  const [showMob,setShowMob]=useState(false);
  const [showCardio,setShowCardio]=useState(false);
  const [cardioType,setCardioType]=useState("peloton");
  const [cardioDur,setCardioDur]=useState("35");
  const [cardioIntensity,setCardioIntensity]=useState("zone2");
  const [cardioDistance,setCardioDistance]=useState("");
  const [cardioCals,setCardioCals]=useState("");
  const [cardioNotes,setCardioNotes]=useState("");
  const mobEntry=data.mob?.[t];
  const [mobDone,setMobDone]=useState(mobEntry===true||!!mobEntry?.done);
  const [mobRunning,setMobRunning]=useState(false);
  const [mobTimer,setMobTimer]=useState(0);
  const mobStartRef=useRef(null);
  const mobIvRef=useRef(null);
  const [stretchExIdx,setStretchExIdx]=useState(0);
  const [stretchSetIdx,setStretchSetIdx]=useState(0);
  const [stretchTimeLeft,setStretchTimeLeft]=useState(0);
  const [stretchRunning,setStretchRunning]=useState(false);
  const stretchEndRef=useRef(0);
  const stretchIvRef=useRef(null);
  const [stretchDone,setStretchDone]=useState([]);
  useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem("dhub6_mob_active"));
    if(saved?.running&&saved.startedAt&&!mobDone){mobStartRef.current=saved.startedAt;setMobRunning(true);setShowMob(true);
      setMobTimer(Math.floor((Date.now()-saved.startedAt)/1000));
      mobIvRef.current=setInterval(()=>{setMobTimer(Math.floor((Date.now()-mobStartRef.current)/1000));},1000);
    }else{localStorage.removeItem("dhub6_mob_active");}
  }catch{}},[]); // restore in-progress mobility on mount

  const [cardioTimerLeft,setCardioTimerLeft]=useState(0);
  const [cardioTimerRunning,setCardioTimerRunning]=useState(false);
  const [cardioTimerDone,setCardioTimerDone]=useState(false);
  const cardioIvRef=useRef(null);
  const cardioEndRef=useRef(0);
  const getPostLiftCardio=(day)=>{if(day==="monday"||day==="thursday")return{type:"stairs",label:"Stairstepper",duration:20,intensity:"zone2"};if(day==="tuesday"||day==="friday")return{type:"incline-walk",label:"Incline Walk (10-15%)",duration:20,intensity:"zone2"};if(day==="wednesday")return{type:"stairs",label:"Stairstepper (optional)",duration:20,intensity:"zone2"};return null;};
  const startCardioTimer=(dur)=>{const end=Date.now()+dur*60*1000;cardioEndRef.current=end;setCardioTimerLeft(dur*60);setCardioTimerRunning(true);setCardioTimerDone(false);
    cardioIvRef.current=setInterval(()=>{const left=Math.round((cardioEndRef.current-Date.now())/1000);if(left<=0){clearInterval(cardioIvRef.current);setCardioTimerLeft(0);setCardioTimerRunning(false);setCardioTimerDone(true);if(navigator.vibrate)navigator.vibrate([200,100,200,100,200]);}else{setCardioTimerLeft(left);}},500);};
  const stopCardioTimer=()=>{if(cardioIvRef.current)clearInterval(cardioIvRef.current);setCardioTimerRunning(false);setCardioTimerLeft(0);cardioEndRef.current=0;};

  const [showFinishConfirm,setShowFinishConfirm]=useState(false);
  const [showCancelConfirm,setShowCancelConfirm]=useState(false);
  const [swapModal,setSwapModal]=useState(null);
  const [showAddEx,setShowAddEx]=useState(false);
  const [exInfo,setExInfo]=useState(null);          // {ex, progKey} · history sheet
  const [showPlates,setShowPlates]=useState(false);
  const [summary,setSummary]=useState(null);        // post-workout sheet
  const serverPushArmedRef=useRef(false);
  // Screen stays awake while a session is open and visible (Screen Wake Lock API).
  useEffect(()=>{
    if(!workout||!("wakeLock" in navigator))return;
    let lock=null,dead=false;
    const acquire=async()=>{if(dead||document.visibilityState!=="visible")return;try{lock=await navigator.wakeLock.request("screen");}catch{}};
    acquire();
    const onVis=()=>{if(document.visibilityState==="visible")acquire();};
    document.addEventListener("visibilitychange",onVis);
    return()=>{dead=true;document.removeEventListener("visibilitychange",onVis);try{lock?.release();}catch{}};
  },[!!workout]);
  const [liftTab,setLiftTab]=useState("upper");
  const [wuDone,setWuDone]=useState(false);
  const [activeVariant,setActiveVariant]=useState(()=>{try{return JSON.parse(localStorage.getItem("dhub6_variant"))||{};}catch{return {};}});
  const setVariant=(day,variant)=>{const nv=variant?{...activeVariant,[day]:variant}:{...activeVariant};if(!variant)delete nv[day];setActiveVariant(nv);try{localStorage.setItem("dhub6_variant",JSON.stringify(nv));}catch{}};
  const tr=useRef(null);
  const hasVariants=PROG.variants?.[sel];
  const getSess=(day,variant)=>(variant&&PROG.variants?.[day]?.[variant])||data.program[day];
  const sess=getSess(sel,activeVariant[sel]);
  // Manual sessions carry their own slot definitions on each exercise entry;
  // sessOf gives the renderer/finisher a session-shaped object either way.
  const sessOf=w=>w?.manual?{name:"Manual Session",focus:"Ad-hoc · add exercises as you go",exercises:[]}:getSess(w.day,w.variant);

  const gw=(exOrId,def,slot=null)=>resolveWeight(data,exOrId,def,slot);

  const getSwapOptions=(slotEx,currentEx)=>swapOptions(data,workout,slotEx,currentEx);

  const isDeload=wkn(t)===PROG.deload;

  const startW=(day=sel)=>{const startVariant=activeVariant[day]||null;const startSess=getSess(day,startVariant);if(!startSess)return;
    setWorkout(buildSession(data,day,startSess,{date:t,variant:startVariant}));setWuDone(false);};

  // Manual workout: start empty, add exercises from the library mid-session.
  // Weights come from gw() (progression + history), rest timers work as normal.
  const startManualW=()=>{setWorkout({day:sel,manual:true,exercises:[],start:Date.now(),isDeload:false});setWuDone(true);setShowAddEx(true);};
  const addManualEx=(opt)=>{
    const slot=manualSlot(opt);
    setWorkout(p=>({...p,exercises:[...p.exercises,buildExerciseEntry(data,slot,{isDeload:!!p.isDeload,withWarmup:p.exercises.length===0,extra:{slot}})]}));
    setShowAddEx(false);
  };

  const uS=(ei,si,f,v)=>setWorkout(p=>{const n=JSON.parse(JSON.stringify(p));n.exercises[ei].sets[si][f]=v;if(f==="reps"||f==="rir")n.exercises[ei].sets[si].prefilled=false;return n;});
  const dWU=(ei,wi,rest)=>{
    setWorkout(p=>{const n=JSON.parse(JSON.stringify(p));n.exercises[ei].wu[wi].done=true;return n;});
    if(rest&&rest>0){startRestTimer(Math.min(rest,60));}
  };
  const dS=(ei,si,rest)=>{
    const cur=workout?.exercises?.[ei]?.sets?.[si];
    if(!cur||Number(cur.reps)<=0){if(addToast)addToast("Enter reps before logging the set","error");return;}
    haptic(30);
    setWorkout(p=>{const n=JSON.parse(JSON.stringify(p));n.exercises[ei].sets[si].done=true;return n;});
    if(rest>0)startRestTimer(rest);
  };

  const armRestAudio=()=>{
    try{
      const AC=window.AudioContext||window.webkitAudioContext;
      if(!AC)return;
      if(!restAudioCtxRef.current)restAudioCtxRef.current=new AC();
      restAudioCtxRef.current.resume?.();
    }catch{}
  };
  const playRestAlarm=()=>{
    try{
      const ctx=restAudioCtxRef.current;
      if(!ctx)return;
      ctx.resume?.();
      [0,0.22,0.44].forEach((offset)=>{
        const osc=ctx.createOscillator(),gain=ctx.createGain();
        osc.type="sine";osc.frequency.value=880;
        gain.gain.setValueAtTime(0.001,ctx.currentTime+offset);
        gain.gain.exponentialRampToValueAtTime(0.25,ctx.currentTime+offset+0.02);
        gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+offset+0.16);
        osc.connect(gain);gain.connect(ctx.destination);
        osc.start(ctx.currentTime+offset);osc.stop(ctx.currentTime+offset+0.18);
      });
    }catch{}
  };
  const notifyRestDone=()=>{
    if(restNotifiedRef.current)return;
    restNotifiedRef.current=true;
    const ns=getNotificationSettings(data.settings?.notifications);
    if(ns.vibrate!==false)haptic([300,120,300,120,300,120,500]);
    if(ns.sound!==false)playRestAlarm();
    // Server Web Push owns the closed-app notification. If the tab is merely
    // hidden and no push was armed, the service worker shows one locally.
    if(document.visibilityState==="hidden"&&!serverPushArmedRef.current&&(ns.enabled||(typeof Notification!=="undefined"&&Notification.permission==="granted")))notifyDevice("Rest complete",{body:"Next set is ready.",tag:"rest-local",requireInteraction:false});
    if(addToast)addToast("Rest complete. Next set.","success");
  };

  const clearRestTimer=()=>{
    if(tr.current)clearInterval(tr.current);
    if(restTimeoutRef.current)clearTimeout(restTimeoutRef.current);
    tr.current=null;restTimeoutRef.current=null;restEndRef.current=0;restNotifiedRef.current=false;serverPushArmedRef.current=false;
    try{const saved=JSON.parse(localStorage.getItem(REST_TIMER_KEY));if(saved?.tag)cancelDeviceNotification(saved.tag);localStorage.removeItem(REST_TIMER_KEY);}catch{}
    setRt(0);setRl(0);
  };

  const completeRestTimer=()=>{
    if(tr.current)clearInterval(tr.current);
    if(restTimeoutRef.current)clearTimeout(restTimeoutRef.current);
    tr.current=null;restTimeoutRef.current=null;
    try{localStorage.removeItem(REST_TIMER_KEY);}catch{}
    setRt(0);setRl(0);
    notifyRestDone();
    restEndRef.current=0;
  };

  const adjustRestTimer=(delta)=>{
    if(restEndRef.current<=0)return;
    const endTime=restEndRef.current+delta*1000;
    if(endTime<=Date.now()+250){completeRestTimer();return;}
    let old=null;try{old=JSON.parse(localStorage.getItem(REST_TIMER_KEY));}catch{}
    const total=Math.max(1,(old?.total||rt||0)+delta);
    const tag=`rest-timer-${endTime}`;
    try{if(old?.tag)cancelDeviceNotification(old.tag);}catch{}
    try{localStorage.setItem(REST_TIMER_KEY,JSON.stringify({endTime,total,startedAt:old?.startedAt||Date.now(),tag}));}catch{}
    scheduleServerPush({title:"Rest complete",body:"Next set is ready.",tag,dueAt:endTime,url:"/"});
    if(tr.current)clearInterval(tr.current);
    if(restTimeoutRef.current)clearTimeout(restTimeoutRef.current);
    armRestTimer(endTime,total);
  };

  const armRestTimer=(endTime,total)=>{
    restEndRef.current=endTime;
    restNotifiedRef.current=false;
    setRt(total);
    const tick=()=>{
      const left=Math.ceil((restEndRef.current-Date.now())/1000);
      if(left<=0){completeRestTimer();}
      else{setRl(Math.max(0,left));}
    };
    tick();
    if(restEndRef.current>0){
      tr.current=setInterval(tick,500);
      restTimeoutRef.current=setTimeout(completeRestTimer,Math.max(0,endTime-Date.now()));
    }
  };

  const startRestTimer=(rest)=>{
    clearRestTimer();
    armRestAudio();
    const endTime=Date.now()+rest*1000;
    const tag=`rest-timer-${endTime}`;
    try{localStorage.setItem(REST_TIMER_KEY,JSON.stringify({endTime,total:rest,startedAt:Date.now(),tag}));}catch{}
    // Push when the user enabled it in Setup, or when the phone already granted
    // permission (the pre-overhaul behavior); never prompt mid-set otherwise.
    const ns=getNotificationSettings(data.settings?.notifications);
    const pushOk=ns.restTimer!==false&&(ns.enabled||(typeof Notification!=="undefined"&&Notification.permission==="granted"));
    if(pushOk){
      scheduleServerPush({title:"Rest complete",body:"Next set is ready.",tag,dueAt:endTime,url:"/?tab=training"}).then(serverOk=>{
        if(serverOk){serverPushArmedRef.current=true;return;}
        scheduleDeviceNotification("Rest complete",{body:"Next set is ready.",tag,renotify:true,requireInteraction:false,silent:false},endTime).then(localOk=>{
          if(restPushWarned||!addToast)return;restPushWarned=true;
          addToast(localOk?"Closed-app push is off. Rest alerts fire while Health Hub is open.":"Allow notifications in Setup to get rest alerts.","info",{label:"Setup",fn:()=>setTab("settings")});
        });
      });
    }
    armRestTimer(endTime,rest);
  };

  useEffect(()=>{
    const restoreRestTimer=()=>{
      if(restEndRef.current>0)return;
      try{
        const saved=JSON.parse(localStorage.getItem(REST_TIMER_KEY));
        if(saved?.endTime){
          if(saved.endTime<=Date.now()){restEndRef.current=saved.endTime;completeRestTimer();}
          else{armRestTimer(saved.endTime,saved.total||Math.ceil((saved.endTime-(saved.startedAt||Date.now()))/1000));}
        }
      }catch{try{localStorage.removeItem(REST_TIMER_KEY);}catch{}}
    };
    restoreRestTimer();
    const onVis=()=>{
      if(document.visibilityState==="visible"){
        restoreRestTimer();
        if(restEndRef.current>0){
          const left=Math.round((restEndRef.current-Date.now())/1000);
          if(left<=0){completeRestTimer();}
          else{setRl(left);}
        }
        if(stretchEndRef.current>0){
          const left=Math.round((stretchEndRef.current-Date.now())/1000);
          if(left<=0){setStretchTimeLeft(0);}else{setStretchTimeLeft(left);}
        }
      }
    };
    document.addEventListener("visibilitychange",onVis);
    window.addEventListener("focus",onVis);
    return()=>{document.removeEventListener("visibilitychange",onVis);window.removeEventListener("focus",onVis);};
  },[]);
  useEffect(()=>()=>{if(mobIvRef.current)clearInterval(mobIvRef.current);if(stretchIvRef.current)clearInterval(stretchIvRef.current);if(restTimeoutRef.current)clearTimeout(restTimeoutRef.current);},[]);

  const finishWorkout=()=>{
    if(!workout)return;
    const s=sessOf(workout);
    const {data:nd,prs,touched,log}=applyWorkout(data,workout,s,t);
    setData(nd);sv(nd);svSB.workout(t,log);touched.forEach(aid=>svSB.progression(aid,nd.prog[aid]));
    setWorkout(null);clearRestTimer();stopCardioTimer();setCardioTimerDone(false);setShowFinishConfirm(false);
    haptic([40,60,40]);
    setSummary({date:t,name:s?.name||"Session",dur:log.dur,sets:workout.exercises.reduce((a,e)=>a+e.sets.filter(saneSet).length,0),exercises:workout.exercises.filter(e=>e.sets.some(saneSet)).length,volume:log.volume,prs,log});
  };

  const cancelWorkout=()=>{
    setWorkout(null);clearRestTimer();
    stopCardioTimer();setCardioTimerDone(false);setShowCancelConfirm(false);
  };


  const undoCardio=()=>{const nd={...data,cardio:{...data.cardio}};delete nd.cardio[t];setData(nd);sv(nd);svSB.delCardio(t);};
  const applyCardioPreset=p=>{setCardioType(p.type);setCardioDur(String(p.duration));setCardioIntensity(p.intensity||"zone2");};
  const openCardioLog=(preset=null)=>{if(preset)applyCardioPreset(preset);setShowCardio(true);};
  const undoWorkout=()=>{const nd={...data,wk:{...data.wk}};delete nd.wk[t];setData(nd);sv(nd);svSB.delWorkout(t);};
  const mobExercises=PROG.mobility._default||[];
  const totalStretchSets=mobExercises.reduce((t,ex)=>t+ex.sets,0);
  const stretchMins=Math.round(mobExercises.reduce((t,ex)=>t+ex.dur*ex.sets,0)/60);

  const startMob=()=>{const st=Date.now();mobStartRef.current=st;setMobRunning(true);setMobTimer(0);setShowMob(true);
    try{localStorage.setItem("dhub6_mob_active",JSON.stringify({running:true,startedAt:st}));}catch{}
    mobIvRef.current=setInterval(()=>{setMobTimer(Math.floor((Date.now()-mobStartRef.current)/1000));},1000);};

  const startStretchTimer=(dur)=>{
    if(stretchIvRef.current)clearInterval(stretchIvRef.current);
    const endTime=Date.now()+dur*1000;
    stretchEndRef.current=endTime;
    setStretchTimeLeft(dur);setStretchRunning(true);
    stretchIvRef.current=setInterval(()=>{
      const left=Math.round((stretchEndRef.current-Date.now())/1000);
      if(left<=0){
        clearInterval(stretchIvRef.current);
        setStretchTimeLeft(0);setStretchRunning(false);
        if(navigator.vibrate)navigator.vibrate([200,100,200]);
        advanceStretch(true);
      }else{setStretchTimeLeft(left);}
    },500);
  };

  const advanceStretch=(markDone)=>{
    if(stretchIvRef.current)clearInterval(stretchIvRef.current);
    setStretchTimeLeft(0);setStretchRunning(false);stretchEndRef.current=0;
    const key=`${stretchExIdx}-${stretchSetIdx}`;
    if(markDone)setStretchDone(p=>p.includes(key)?p:[...p,key]);
    const curEx=mobExercises[stretchExIdx];
    if(stretchSetIdx<(curEx?.sets||1)-1){setStretchSetIdx(stretchSetIdx+1);return;}
    if(stretchExIdx<mobExercises.length-1){setStretchExIdx(stretchExIdx+1);setStretchSetIdx(0);}
  };

  const skipStretchTimer=()=>advanceStretch(false);
  const skipMob=()=>{if(stretchIvRef.current)clearInterval(stretchIvRef.current);if(mobIvRef.current)clearInterval(mobIvRef.current);
    const nd={...data,mob:{...data.mob,[t]:{done:true,skipped:true,dur:0,exercises:0}}};
    setData(nd);sv(nd);svSB.mobility(t,0);
    setMobDone(true);setMobRunning(false);setShowMob(false);localStorage.removeItem("dhub6_mob_active");
    setStretchExIdx(0);setStretchSetIdx(0);setStretchDone([]);setStretchTimeLeft(0);setStretchRunning(false);
  };

  const finishMob=()=>{if(stretchIvRef.current)clearInterval(stretchIvRef.current);
    if(mobIvRef.current)clearInterval(mobIvRef.current);
    const dur=Math.floor((Date.now()-mobStartRef.current)/1000);
    const nd={...data,mob:{...data.mob,[t]:{done:true,dur,exercises:stretchDone.length}}};
    setData(nd);sv(nd);svSB.mobility(t,dur);
    setMobDone(true);setMobRunning(false);setShowMob(false);
    localStorage.removeItem("dhub6_mob_active");
    setStretchExIdx(0);setStretchSetIdx(0);setStretchDone([]);setStretchTimeLeft(0);setStretchRunning(false);
  };
  const undoMob=()=>{const nd={...data,mob:{...data.mob}};delete nd.mob[t];setData(nd);sv(nd);svSB.delMobility(t);
    try{localStorage.removeItem("dhub6_mob_active");}catch{}
    setMobDone(false);setMobRunning(false);setShowMob(false);
    setStretchExIdx(0);setStretchSetIdx(0);setStretchDone([]);setStretchTimeLeft(0);setStretchRunning(false);};
  const logCardio=async(overrides={})=>{
    const c={type:overrides.type||cardioType,duration:+(overrides.duration??cardioDur)||20,intensity:overrides.intensity||cardioIntensity,
      distance:cardioDistance?+cardioDistance:null,calories:cardioCals?+cardioCals:null,notes:cardioNotes.trim()||"",done:true};
    const nd={...data,cardio:{...data.cardio,[t]:c}};setData(nd);sv(nd);
    const saved=await svSB.cardio(t,c);
    if(!saved)addToast?.("Cardio saved locally only · Supabase cardio table/schema needs migration", "warning");
    setShowCardio(false);
    setCardioDistance("");setCardioCals("");setCardioNotes("");
  };
  const renderCardioForm=()=>showCardio&&!data.cardio?.[t]?.done&&(<div style={{marginTop:10,display:"flex",flexDirection:"column",gap:8}}>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:4}}>
      {CARDIO_PRESETS.map(p=>(<button key={p.type} onClick={()=>applyCardioPreset(p)} style={{
        padding:"7px 4px",borderRadius:6,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
        border:`1px solid ${cardioType===p.type?C.p:C.bd}`,background:cardioType===p.type?C.pl:C.cd,color:cardioType===p.type?C.p:C.t3}}>{p.label}<br/><span style={{fontWeight:500}}>{p.duration}m</span></button>))}
    </div>
    <div style={{display:"flex",gap:4,overflowX:"auto"}}>
      {CARDIO_TYPES.map(ct=>(<button key={ct} onClick={()=>setCardioType(ct)} style={{
        padding:"6px 9px",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",
        border:`1px solid ${cardioType===ct?C.p:C.bd}`,background:cardioType===ct?C.pl:"transparent",color:cardioType===ct?C.p:C.t3}}>{cardioLabel(ct)}</button>))}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
      <label style={{fontSize:11,color:C.t3,fontWeight:600}}>Duration min<N value={cardioDur} onChange={setCardioDur} placeholder="20"/></label>
      <label style={{fontSize:11,color:C.t3,fontWeight:600}}>Distance mi<N value={cardioDistance} onChange={setCardioDistance} placeholder="optional"/></label>
      <label style={{fontSize:11,color:C.t3,fontWeight:600}}>Calories<N value={cardioCals} onChange={setCardioCals} placeholder="optional"/></label>
      <label style={{fontSize:11,color:C.t3,fontWeight:600}}>Intensity
        <select value={cardioIntensity} onChange={e=>setCardioIntensity(e.target.value)} style={{width:"100%",background:C.cd,border:`1px solid ${C.bd}`,borderRadius:6,padding:"8px",fontSize:14,color:C.t,fontFamily:"inherit"}}>
          {["easy","zone2","tempo","hard","hiit"].map(i=><option key={i} value={i}>{intensityLabel(i)}</option>)}
        </select>
      </label>
    </div>
    <input value={cardioNotes} onChange={e=>setCardioNotes(e.target.value)} placeholder="Notes: HR, incline, class, how it felt..." style={{background:C.cd,border:`1px solid ${C.bd}`,borderRadius:6,padding:"9px 10px",fontSize:14,color:C.t,fontFamily:"inherit",outline:"none"}}/>
    <div style={{display:"flex",gap:6,alignItems:"center"}}>
      <B small onClick={()=>logCardio()}>Log Cardio</B>
      <B small outline onClick={()=>setShowCardio(false)}>Cancel</B>
    </div>
  </div>);

  const dks=["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
  const [viewW,setViewW]=useState(null);
  useBackClose(!!viewW,()=>setViewW(null));
  const allWk=Object.entries(data.wk).sort((a,b)=>b[0].localeCompare(a[0]));
  const todayWorkout=data.wk?.[t];
  const todaySess=getSess(dn,activeVariant[dn]);
  const todayCardioPlan=getPostLiftCardio(dn);
  const todayCardioDone=!!data.cardio?.[t]?.done;
  const todayLiftDone=!!todayWorkout;
  const now=new Date();
  const [calMonth,setCalMonth]=useState(now.getMonth());
  const [calYear,setCalYear]=useState(now.getFullYear());

  if(workout){
    const s=sessOf(workout);
    const slotAt=ei=>s.exercises?.[ei]||workout.exercises[ei]?.slot;
    const swapExercise=(ei,newEx)=>{const oldEx=slotAt(ei);const slot={...oldEx};const key=progKey(newEx,slot);const newW=gw({...newEx,progKey:key},newEx.sw,slot);const wt=workout.isDeload?Math.round(newW*0.5/5)*5:newW;setWorkout(p=>{const n=JSON.parse(JSON.stringify(p));const wkEx=n.exercises[ei];wkEx.swappedFrom={id:oldEx.id,name:oldEx.name,progKey:progKey(oldEx,oldEx)};wkEx.id=newEx.id;wkEx.progKey=key;wkEx.swappedTo={id:newEx.id,name:newEx.name,unit:newEx.unit,sw:newEx.sw,cue:newEx.cue,inc:newEx.inc,progKey:key,pattern:newEx.pattern,region:newEx.region};wkEx.wu=WU(wt).map(w=>({...w,done:false}));wkEx.sets=wkEx.sets.map(s=>({...s,weight:wt,done:false,reps:0,rir:""}));return n;});setSwapModal(null);};
    return(<div style={{display:"flex",flexDirection:"column",gap:6}}>
      {showFinishConfirm&&<ConfirmModal title="Finish Workout?" message="This will log your workout and save all set data." onConfirm={finishWorkout} onCancel={()=>setShowFinishConfirm(false)} confirmText="Finish" confirmColor={C.g}/>}
      {showCancelConfirm&&<ConfirmModal title="Cancel Workout?" message="This will discard all data from this session. Nothing will be logged." onConfirm={cancelWorkout} onCancel={()=>setShowCancelConfirm(false)} confirmText="Discard" confirmColor={C.r}/>}
      {swapModal&&<SwapModal exName={swapModal.exName} slot={slotAt(swapModal.ei)} options={getSwapOptions(slotAt(swapModal.ei),workout.exercises[swapModal.ei])} onSelect={opt=>swapExercise(swapModal.ei,opt)} onClose={()=>setSwapModal(null)} getWeight={gw}/>}
      <Sheet open={showAddEx} onClose={()=>setShowAddEx(false)} title="Add exercise" right={<B small outline onClick={()=>setShowAddEx(false)}>Close</B>}>
          {(()=>{const used=new Set(workout.exercises.map(e=>e.id));
            const groups={};EXERCISE_LIBRARY.filter(o=>!used.has(o.id)).forEach(o=>{(groups[o.region]=groups[o.region]||[]).push(o);});
            return Object.entries(groups).map(([rg,opts])=>(<div key={rg} style={{marginBottom:8}}>
              <div style={{fontSize:10,fontWeight:800,color:C.t3,letterSpacing:"0.08em",textTransform:"uppercase",fontFamily:FD,padding:"4px 0"}}>{rg}</div>
              {opts.map(o=>(<button type="button" key={o.id} onClick={()=>addManualEx(o)} style={{display:"flex",width:"100%",justifyContent:"space-between",alignItems:"center",minHeight:44,padding:"4px 8px",borderTop:`1px solid ${C.bl}`,border:"none",borderTopStyle:"solid",background:"transparent",cursor:"pointer",textAlign:"left"}}>
                <span style={{fontSize:14,fontWeight:600,color:C.t}}>{o.name}</span>
                <span style={{fontSize:12,color:C.t3,whiteSpace:"nowrap"}}>{gw(o,o.sw)} {o.unit}</span>
              </button>))}
            </div>));})()}
      </Sheet>
      {exInfo&&<ExerciseHistory data={data} ex={exInfo.ex} progKeyStr={exInfo.progKey} onClose={()=>setExInfo(null)}/>}

      <WorkoutTimerBar workout={workout} compact/>

      {workout.isDeload&&(<div style={{background:C.bg,border:`1px solid ${C.bd}`,padding:"8px 12px",borderRadius:6,marginBottom:4}}>
        <div style={{fontSize:13,fontWeight:700,color:C.t}}>DELOAD WEEK · All weights at 50%. Keep reps the same. Focus on form.</div>
      </div>)}

      {rt>0&&(()=>{const pct=rt?Math.min(100,Math.round((1-rl/Math.max(rt,1))*100)):0;const done=rl<=0;
        return(<Portal><div style={{position:"fixed",left:0,right:0,bottom:"calc(var(--tabbar-h) + var(--safe-b))",zIndex:95,maxWidth:520,margin:"0 auto",padding:"0 8px 6px"}}>
          <div className="hh-sheet" role="timer" aria-live="off" style={{background:done?C.g:C.t,borderRadius:12,boxShadow:C.sh,padding:"8px 8px 8px 14px",display:"flex",alignItems:"center",gap:8,position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",left:0,top:0,bottom:0,width:`${pct}%`,background:"var(--on-accent-line)",opacity:0.35,transition:"width .5s linear"}}/>
            <div style={{position:"relative",flex:1,minWidth:0}}>
              <div style={{fontSize:9,letterSpacing:"0.14em",color:"var(--on-accent-dim)",fontFamily:FD,fontWeight:700}}>{done?"REST DONE · GO":"REST"}</div>
              <div style={{fontSize:30,fontWeight:800,color:C.oa,fontFamily:FD,fontVariantNumeric:"tabular-nums",lineHeight:1}}>{done?"0:00":`${Math.floor(rl/60)}:${String(rl%60).padStart(2,"0")}`}</div>
            </div>
            {!done&&<button type="button" onClick={()=>adjustRestTimer(-30)} style={{position:"relative",minHeight:44,minWidth:52,background:"transparent",border:"1px solid var(--on-accent-line)",color:C.oa,borderRadius:8,fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:FD,letterSpacing:"0.04em"}}>−30</button>}
            {!done&&<button type="button" onClick={()=>adjustRestTimer(30)} style={{position:"relative",minHeight:44,minWidth:52,background:"transparent",border:"1px solid var(--on-accent-line)",color:C.oa,borderRadius:8,fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:FD,letterSpacing:"0.04em"}}>+30</button>}
            <button type="button" onClick={clearRestTimer} style={{position:"relative",minHeight:44,minWidth:64,background:C.cd,border:"none",color:C.t,borderRadius:8,fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:FD,letterSpacing:"0.06em",textTransform:"uppercase"}}>{done?"Dismiss":"Skip"}</button>
          </div>
        </div></Portal>);})()}

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:17,fontWeight:700,color:C.t}}>{s.name}</div>
          <div style={{fontSize:13,color:C.t3}}>{s.focus}</div>
        </div>
        <div style={{display:"flex",gap:6}}>
          <B small outline onClick={()=>setShowCancelConfirm(true)} color={C.r}>Cancel</B>
          <B small onClick={()=>setShowFinishConfirm(true)} color={C.g}>Finish</B>
        </div>
      </div>

      {s.warmup&&!wuDone&&(<X style={{padding:10,borderLeft:`3px solid ${C.bd}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <div style={{fontSize:14,fontWeight:700,color:C.t}}>Warm-Up</div>
          <B small onClick={()=>setWuDone(true)} color={C.g}>Done</B>
        </div>
        <div style={{fontSize:13,fontWeight:600,color:C.p,marginBottom:s.warmup.moves.length?6:0}}>{s.warmup.cardio}</div>
        {s.warmup.note&&<div style={{fontSize:12,color:C.t2,marginBottom:4}}>{s.warmup.note}</div>}
        {/mobility/i.test(s.name||"")&&mobExercises.map((m,i)=>(
          <div key={m.id} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"5px 0",borderTop:i>0?`1px solid ${C.bl}`:"none"}}>
            <div style={{marginRight:8}}>
              <div style={{fontSize:13,fontWeight:600,color:C.t}}>{m.name}</div>
              <div style={{fontSize:11,color:C.t3,marginTop:1}}>{m.cue}</div>
            </div>
            <span style={{fontSize:12,color:C.t3,whiteSpace:"nowrap",fontFamily:FD,fontWeight:700}}>{m.sets}×{m.dur}s{m.sides?` · ${m.sides.map(x=>x[0]).join("/")}`:""}</span>
          </div>
        ))}
        {s.warmup.moves.map((m,i)=>(
          <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderTop:i>0?`1px solid ${C.bl}`:"none"}}>
            <span style={{fontSize:13,fontWeight:600,color:C.t}}>{m.name}</span>
            <span style={{fontSize:12,color:C.t3}}>{m.rx}</span>
          </div>
        ))}
        {s.warmup.ramp&&<div style={{fontSize:12,color:C.v,fontWeight:600,marginTop:4}}>{s.warmup.ramp}</div>}
      </X>)}
      {s.warmup&&wuDone&&(<X style={{padding:"8px 10px",display:"flex",justifyContent:"space-between",alignItems:"center",opacity:0.6}}>
        <span style={{fontSize:13,fontWeight:600,color:C.t}}>Warm-Up</span>
        <span style={{fontSize:13,fontWeight:600,color:C.g}}>Done ✓</span>
      </X>)}

      {(()=>{ // ═══ SET DECK · mock 3a · one set at a time ═══
        const exs=workout.exercises;
        // Supersets: rest:0 chains an exercise to the next one (1A → 1B). Sets
        // inside a group interleave round-robin (A1, B1, A2, B2 …) so the pair
        // actually alternates; the last member's rest runs the timer.
        const restOf=i=>slotAt(i)?.rest;
        const {groups,curEi,curSi:curSi0}=sessionCursor(exs,restOf);
        const curGrp=curEi>=0?groups.find(g=>g.includes(curEi)):null;
        const ssMates=curGrp&&curGrp.length>1?curGrp.filter(m=>m!==curEi).map(m=>exs[m].swappedTo?.name||slotAt(m)?.name).filter(Boolean):[];
        const ssLetter=curGrp&&curGrp.length>1?String.fromCharCode(65+curGrp.indexOf(curEi)):null;
        const allDone=exs.length>0&&curEi<0;
        const segs=exs.map((e,i)=>{const done=e.sets.filter(x=>x.done).length;
          return{k:i,short:shortLiftName(e.swappedTo?.name||slotAt(i)?.name||""),pct:Math.round(done/Math.max(1,e.sets.length)*100),cur:i===curEi};});
        const wkEx=curEi>=0?exs[curEi]:null,ex=curEi>=0?slotAt(curEi):null;
        const curSi=curSi0;
        const cs=wkEx?wkEx.sets[curSi]:null;
        const dispName=wkEx?.swappedTo?.name||ex?.name||"";
        const dispCue=wkEx?.swappedTo?.cue||ex?.cue||"";
        const inc=(wkEx?.swappedTo?.inc??ex?.inc)||5;
        const prevLift=wkEx?(()=>{const dates=Object.keys(data.wk).sort().reverse();for(const d of dates){if(d===t)continue;const wex=data.wk[d].exercises?.find(e=>e.id===wkEx.id);if(wex){const ds=wex.sets?.filter(x=>x.done&&(x.weight>0||x.reps>0));if(ds?.length)return{date:d,weight:ds[0].weight,reps:ds.map(x=>x.reps)};}}return null;})():null;
        const goal=(!prevLift||workout.isDeload||!ex?.rr)?null:(()=>{const top=ex.rr[1],bot=ex.rr[0];const reps=prevLift.reps||[];if(!reps.length)return null;const allTop=reps.every(r=>r>=top);const best=Math.max(...reps);
          return allTop?{chip:"ADD WEIGHT",bg:C.p,txt:`You topped the range at ${prevLift.weight}. Today: ${cs?.weight} for ${bot}+ each set.`}
            :best>=bot?{chip:"ADD A REP",bg:C.t,txt:`Last time ${reps.join(", ")} at ${prevLift.weight}. Beat one of those sets today.`}
            :{chip:"MATCH IT",bg:C.t3,txt:`Last time ${reps.join(", ")} at ${prevLift.weight}. Match it before adding.`};})();
        const undoLastSet=()=>{setWorkout(p=>{const n=JSON.parse(JSON.stringify(p));for(let i=n.exercises.length-1;i>=0;i--){const ss=n.exercises[i].sets;for(let j=ss.length-1;j>=0;j--){if(ss[j].done){ss[j].done=false;return n;}}}return n;});};
        const anyLogged=exs.some(e=>e.sets.some(x=>x.done));
        const upNext=exs.map((e,i)=>({e,i})).filter(o=>o.i>curEi&&curEi>=0).slice(0,4).map(o=>{const sl=slotAt(o.i);return{k:o.i,name:o.e.swappedTo?.name||sl?.name,meta:`${o.e.sets.length}×${rrTxt(sl?.rr)} · ${o.e.sets[0]?.weight||"BW"}`};});
        return(<>
        {exs.length>1&&<div style={{display:"flex",gap:4}}>
          {segs.map(sg=>(<div key={sg.k} style={{flex:1,display:"flex",flexDirection:"column",gap:4}}>
            <div style={{height:4,borderRadius:2,background:C.bl,overflow:"hidden"}}><div style={{height:"100%",background:sg.pct>=100?C.g:C.p,width:`${sg.pct}%`}}/></div>
            <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.05em",textTransform:"uppercase",color:sg.cur?C.p:sg.pct>=100?C.g:C.t3,textAlign:"center",whiteSpace:"nowrap",overflow:"hidden",fontFamily:FD}}>{sg.short}</div>
          </div>))}
        </div>}
        {exs.length===0&&(<X style={{padding:"22px 16px",textAlign:"center"}}>
          <div style={{fontSize:15,fontWeight:700,color:C.t}}>Empty session</div>
          <div style={{fontSize:12,color:C.t3,marginTop:3}}>Add your first exercise to start logging.</div>
        </X>)}
        {allDone&&(<X style={{padding:"26px 20px",textAlign:"center"}}>
          <div style={{fontSize:28,fontWeight:800,color:C.g,fontFamily:FD,textTransform:"uppercase"}}>Session complete</div>
          <div style={{fontSize:13,color:C.t2,marginTop:6}}>{exs.reduce((a,e)=>a+e.sets.filter(x=>x.done).length,0)} sets logged · hit Finish to save.</div>
          <B style={{marginTop:12}} color={C.g} onClick={()=>setShowFinishConfirm(true)}>Finish workout</B>
        </X>)}
        {wkEx&&cs&&(<X style={{padding:16,boxShadow:C.sh2}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"}}>
                <button type="button" onClick={()=>setExInfo({ex:{...(ex||{}),...(wkEx.swappedTo||{}),name:dispName},progKey:wkEx.progKey})} aria-label={`${dispName} history`} style={{background:"transparent",border:"none",padding:0,textAlign:"left",fontSize:21,fontWeight:800,color:C.t,fontFamily:FD,textTransform:"uppercase",letterSpacing:"0.03em",cursor:"pointer",lineHeight:1.15}}>{dispName}<span style={{fontSize:12,color:C.t3,marginLeft:6,verticalAlign:"middle"}}>›</span></button>
                {ex?.anchor&&<div style={{fontSize:10,fontWeight:800,letterSpacing:"0.08em",background:C.t,color:C.oa,borderRadius:4,padding:"2px 6px",fontFamily:FD}}>ANCHOR</div>}
                {ssLetter&&<div style={{fontSize:10,fontWeight:800,letterSpacing:"0.08em",background:C.pl,color:C.p,borderRadius:4,padding:"2px 6px",fontFamily:FD}}>SUPERSET {ssLetter}</div>}
                {wkEx.swappedTo&&<div style={{fontSize:10,background:C.bg,color:C.t2,fontWeight:700,borderRadius:4,padding:"2px 6px",fontFamily:FD}}>SWAPPED</div>}
              </div>
              <div style={{fontSize:12,color:C.t3,marginTop:3}}>Set <b style={{color:C.t}}>{curSi+1}</b> of {wkEx.sets.length}{prevLift?<> · last {fmt(prevLift.date)}: <span style={{fontWeight:600,color:C.t2}}>{prevLift.weight>0?prevLift.weight:"BW"} × {prevLift.reps.join("/")}</span></>:null}</div>
              {ssMates.length>0&&<div style={{fontSize:11,color:C.t3,marginTop:2}}>{restOf(curEi)===0?`No rest · straight to ${ssMates[0]}`:`Rest after this · then back to ${ssMates[0]}`}</div>}
            </div>
            <div style={{display:"flex",gap:6,flexShrink:0}}>
              {BARBELL_IDS.has(wkEx.id)&&<button type="button" title="Plates" aria-label="Plate calculator" onClick={()=>setShowPlates(true)} style={{border:`1px solid ${C.bd}`,background:"transparent",borderRadius:6,padding:"6px 9px",fontSize:11,fontWeight:800,color:C.t2,cursor:"pointer",minHeight:40,fontFamily:FD,letterSpacing:"0.06em"}}>PLATES</button>}
              {getSwapOptions(ex,wkEx).length>0&&!wkEx.sets.some(x=>x.done)&&<button type="button" title="Swap exercise" aria-label="Swap exercise" onClick={()=>setSwapModal({ei:curEi,exName:dispName})} style={{border:`1px solid ${C.bd}`,background:"transparent",borderRadius:6,padding:"8px 10px",fontSize:14,color:C.t2,cursor:"pointer",minHeight:40,fontFamily:"inherit"}}>⇄</button>}
            </div>
          </div>
          <Sheet open={showPlates} onClose={()=>setShowPlates(false)} title="Plates"><PlateCalc weight={cs.weight||0}/></Sheet>
          {goal&&(<div style={{marginTop:10,background:C.pl,borderRadius:8,padding:"9px 11px",display:"flex",gap:9,alignItems:"flex-start"}}>
            <span style={{flexShrink:0,fontSize:10,fontWeight:800,letterSpacing:"0.08em",background:goal.bg,color:C.oa,borderRadius:4,padding:"3px 7px",marginTop:1,fontFamily:FD}}>{goal.chip}</span>
            <span style={{fontSize:12,fontWeight:600,color:C.t,lineHeight:1.45}}>{goal.txt}</span>
          </div>)}
          {workout.isDeload&&<div style={{fontSize:11,color:C.t2,fontWeight:600,marginTop:8}}>DELOAD · 50% weight, same reps</div>}
          {curSi===0&&wkEx.wu.some(w=>!w.done)&&(<div style={{marginTop:10,paddingTop:8,borderTop:`1px dashed ${C.bl}`}}>
            <div style={{fontSize:10,fontWeight:700,color:C.t3,marginBottom:3,fontFamily:FD,letterSpacing:"0.08em"}}>WARM-UP</div>
            {wkEx.wu.map((wu,wi)=>(<div key={wi} style={{display:"flex",alignItems:"center",gap:6,padding:"3px 0",opacity:wu.done?0.35:0.85,fontSize:14}}>
              <span style={{color:C.t3,width:32}}>{wu.l}</span><span style={{color:C.t2,flex:1}}>{wu.w} × {wu.r}</span>
              {!wu.done?<B small outline onClick={()=>dWU(curEi,wi,ex?.rest)} color={C.t3}>✓</B>:<span style={{color:C.g,fontSize:16}}>✓</span>}
            </div>))}
          </div>)}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:12}}>
            {[{k:"weight",l:`WEIGHT · ${(wkEx.swappedTo?.unit||ex?.unit||"LBS").toUpperCase()}`,v:cs.weight||0,dn:()=>uS(curEi,curSi,"weight",Math.max(0,(Number(cs.weight)||0)-inc)),up:()=>uS(curEi,curSi,"weight",(Number(cs.weight)||0)+inc),set:n=>uS(curEi,curSi,"weight",n),vc:C.t},
              {k:"reps",l:"REPS",v:cs.reps||0,dn:()=>uS(curEi,curSi,"reps",Math.max(0,(Number(cs.reps)||0)-1)),up:()=>uS(curEi,curSi,"reps",(Number(cs.reps)||0)+1),set:n=>uS(curEi,curSi,"reps",Math.round(n)),vc:C.p}].map(sp=>(
              <div key={sp.k} style={{background:C.bg,borderRadius:8,padding:"8px 6px"}}>
                <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",color:C.t3,textAlign:"center",fontFamily:FD}}>{sp.l}</div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:4}}>
                  <button type="button" aria-label={`${sp.k} down`} onClick={()=>{haptic(6);sp.dn();}} style={{width:48,height:48,borderRadius:8,border:`1px solid ${C.bd}`,background:C.cd,fontSize:22,fontWeight:700,color:C.t,cursor:"pointer",fontFamily:"inherit"}}>−</button>
                  <EditableNum value={sp.v} onCommit={sp.set} color={sp.vc} label={sp.k}/>
                  <button type="button" aria-label={`${sp.k} up`} onClick={()=>{haptic(6);sp.up();}} style={{width:48,height:48,borderRadius:8,border:`1px solid ${C.bd}`,background:C.cd,fontSize:22,fontWeight:700,color:C.t,cursor:"pointer",fontFamily:"inherit"}}>+</button>
                </div>
              </div>))}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:10}}>
            <span style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",color:C.t3,marginRight:2,fontFamily:FD}}>RIR</span>
            {[0,1,2,3].map(v=>{const on=String(cs.rir)===String(v);return(<button key={v} onClick={()=>uS(curEi,curSi,"rir",on?"":v)} style={{flex:1,minHeight:40,borderRadius:6,border:`1px solid ${on?C.p:C.bd}`,background:on?C.p:C.cd,color:on?C.oa:C.t,fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:FD}}>{v}</button>);})}
          </div>
          <div style={{fontSize:12,lineHeight:1.5,color:C.t2,marginTop:10,borderTop:`1px dashed ${C.bl}`,paddingTop:9}}>{dispCue}</div>
        </X>)}
        {wkEx&&cs&&(<button type="button" onClick={()=>dS(curEi,curSi,ex?.rest)} style={{border:"none",background:C.p,color:C.oa,borderRadius:10,padding:"18px 20px",fontSize:20,fontWeight:800,fontFamily:FD,textTransform:"uppercase",letterSpacing:"0.1em",cursor:"pointer",width:"100%",boxShadow:"var(--accent-glow)",minHeight:60}}>Log set · {cs.weight||0} × {cs.reps||0}</button>)}
        {anyLogged&&!allDone&&<button type="button" onClick={undoLastSet} style={{background:"transparent",border:"none",fontSize:12,color:C.t3,fontWeight:700,textAlign:"center",cursor:"pointer",padding:"8px 0",minHeight:36,fontFamily:FD,letterSpacing:"0.08em",textTransform:"uppercase"}}>Undo last set</button>}
        <div>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.12em",color:C.t3,marginBottom:6,fontFamily:FD}}>UP NEXT</div>
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            {upNext.map(u=>(<div key={u.k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:C.cd,border:`1px solid ${C.bd}`,borderRadius:8,padding:"9px 12px"}}>
              <span style={{fontSize:13,fontWeight:600,color:C.t2}}>{u.name}</span>
              <span style={{fontSize:12,fontWeight:700,color:C.t3,fontFamily:FD}}>{u.meta}</span>
            </div>))}
            <B full outline onClick={()=>setShowAddEx(true)}>+ Add exercise</B>
          </div>
        </div>
        {rt>0&&<div style={{height:64}} aria-hidden="true"/>}
        </>);
      })()}

      {(()=>{const plc=workout.manual?null:getPostLiftCardio(workout.day);if(!plc)return null;
        return(<X style={{padding:12,borderLeft:`3px solid ${C.bd}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:C.t}}>{plc.label}</div>
              <div style={{fontSize:12,color:C.t3}}>{plc.duration} min · {intensityLabel(plc.intensity)} post-lift cardio</div>
            </div>
            {cardioTimerDone?<div style={{display:"flex",gap:6,alignItems:"center"}}><span style={{fontSize:14,fontWeight:700,color:C.g}}>Done ✓</span><B small outline onClick={()=>openCardioLog(plc)}>Details</B><B small onClick={()=>logCardio(plc)} color={C.g}>Quick Log</B></div>
              :cardioTimerRunning?<B small outline onClick={stopCardioTimer} color={C.r}>Stop</B>
              :<div style={{display:"flex",gap:6}}><B small outline onClick={()=>openCardioLog(plc)}>Log</B><B small onClick={()=>startCardioTimer(plc.duration)}>Start</B></div>}
          </div>
          {cardioTimerRunning&&(<div style={{marginTop:10,textAlign:"center"}}>
            <div style={{fontSize:42,fontWeight:700,color:C.t,fontVariantNumeric:"tabular-nums"}}>{Math.floor(cardioTimerLeft/60)}:{String(cardioTimerLeft%60).padStart(2,"0")}</div>
            <div style={{fontSize:11,color:C.t3,marginTop:2}}>remaining</div>
          </div>)}
          {cardioTimerDone&&(<div style={{marginTop:6,fontSize:12,color:C.g,fontWeight:600}}>Post-lift cardio complete · use Details for distance/calories/intensity or Quick Log for just time.</div>)}
          {renderCardioForm()}
        </X>);
      })()}

    </div>);
  }

  const calDays=()=>{
    const first=new Date(calYear,calMonth,1);
    const last=new Date(calYear,calMonth+1,0);
    const startPad=first.getDay();
    const days=[];
    for(let i=0;i<startPad;i++)days.push(null);
    for(let d=1;d<=last.getDate();d++)days.push(d);
    return days;
  };
  const calKey=(d)=>`${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  const monthNames=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  if(viewW){
    const [vDate,vData]=viewW;
    const vSess=getSess(vData.day,vData.variant);
    return(<div style={{display:"flex",flexDirection:"column",gap:6}}>
      <button type="button" onClick={()=>setViewW(null)} style={{background:"none",border:"none",color:C.p,cursor:"pointer",fontSize:14,fontWeight:700,textAlign:"left",padding:"4px 0",minHeight:32}}>← Back</button>
      <X style={{borderLeft:`3px solid ${C.bd}`}}>
        <div style={{fontSize:17,fontWeight:700,color:C.t}}>{vSess?.name||vData.day}</div>
        <div style={{fontSize:13,color:C.t2}}>{fmt(vDate)} · {vData.dur||"?"}min</div>
      </X>
      {vData.exercises?.map((ex,ei)=>{
        const pe=vSess?.exercises[ei];
        return(<X key={ei} style={{padding:10}}>
          <div style={{fontSize:15,fontWeight:700,color:C.t,marginBottom:ex.swappedFrom?2:4}}>{ex.swappedTo?.name||pe?.name||ex.id}</div>
          {ex.swappedFrom&&<div style={{fontSize:10,color:C.t3,fontStyle:"italic",marginBottom:4}}>swapped from {ex.swappedFrom.name}</div>}
          {ex.sets?.map((s,si)=>(
            <div key={si} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 0",borderTop:si>0?`1px solid ${C.bl}`:"none",fontSize:14}}>
              <span style={{fontSize:12,color:C.t3,width:18,fontWeight:600}}>{si+1}</span>
              <span style={{fontWeight:600,color:C.t}}>{s.weight||"BW"}</span>
              <span style={{color:C.t3}}>×</span>
              <span style={{fontWeight:600,color:s.reps>=((pe?.rr||[])[1]||999)?C.g:C.t}}>{s.reps}</span>
              {s.rir!=null&&s.rir!==""&&<span style={{fontSize:11,color:C.v,fontWeight:600,marginLeft:4}}>RIR {s.rir}</span>}
              {s.done?<span style={{color:C.g,marginLeft:"auto"}}>✓</span>:<span style={{color:C.r,marginLeft:"auto",fontSize:12}}>skipped</span>}
            </div>
          ))}
        </X>);
      })}
    </div>);
  }

  return(<div style={{display:"flex",flexDirection:"column",gap:6}}>
    {exInfo&&<ExerciseHistory data={data} ex={exInfo.ex} progKeyStr={exInfo.progKey} onClose={()=>setExInfo(null)}/>}
    <Sheet open={!!summary} onClose={()=>setSummary(null)} title="Session logged">
      {summary&&(<div>
        <div style={{fontSize:14,fontWeight:700,color:C.t2}}>{summary.name} · {fmt(summary.date)}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7,marginTop:10}}>
          {[[summary.dur?`${summary.dur}m`:"○","DURATION"],[String(summary.sets),`SETS · ${summary.exercises} EX`],[summary.volume?summary.volume.toLocaleString():"○","LBS VOLUME"]].map(([v,l])=>(
            <div key={l} style={{background:C.bg,borderRadius:8,padding:"10px 6px",textAlign:"center"}}><div style={{fontSize:20,fontWeight:800,color:C.t,fontFamily:FD}}>{v}</div><div style={{fontSize:8.5,fontWeight:700,letterSpacing:"0.08em",color:C.t3,fontFamily:FD}}>{l}</div></div>))}
        </div>
        {summary.prs.length>0?(<div style={{marginTop:12}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.12em",color:C.g,fontFamily:FD}}>NEW RECORDS</div>
          {summary.prs.map(p=>(<div key={p.name} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderTop:`1px solid ${C.bl}`}}>
            <span style={{fontSize:14,fontWeight:700,color:C.t}}>{p.name}</span>
            <span style={{fontSize:13,fontWeight:700,color:C.g,fontFamily:FD}}>{p.weight}×{p.reps} · e1RM {p.e1rm} <span style={{color:C.t3}}>was {p.prev}</span></span>
          </div>))}
        </div>):<div style={{fontSize:12,color:C.t3,marginTop:10}}>No new e1RM records. On a cut, holding is the win.</div>}
        <div style={{display:"flex",gap:8,marginTop:14}}>
          <B full outline onClick={()=>{setViewW([summary.date,summary.log]);setSummary(null);}}>View log</B>
          <B full onClick={()=>setSummary(null)} color={C.g}>Done</B>
        </div>
      </div>)}
    </Sheet>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div style={{fontSize:17,fontWeight:700,color:C.t}}>Training</div>
      <div style={{fontSize:11,fontWeight:800,color:todayLiftDone?C.g:todaySess?C.p:C.t3,letterSpacing:"0.06em"}}>{todayLiftDone?"After lift":todaySess?"Before lift":"Recovery day"}</div>
    </div>

    <X style={{padding:12,borderLeft:`3px solid ${C.bd}`}}>
      {todayLiftDone?(
        <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center"}}>
          <div>
            <div style={{fontSize:16,fontWeight:800,color:C.t}}>Lift complete</div>
            <div style={{fontSize:13,color:C.t2}}>{todaySess?.name||todayWorkout.day}{todayWorkout.dur?` · ${todayWorkout.dur} min`:""}</div>
            <div style={{fontSize:12,color:C.t3,marginTop:3}}>{todayCardioPlan&&!todayCardioDone?`Next: ${todayCardioPlan.duration} min ${todayCardioPlan.label} or mark recovery.`:"Next: recovery, food, water, and sleep."}</div>
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"}}>
            <B small outline onClick={()=>setViewW([t,todayWorkout])}>Summary</B>
            {todayCardioPlan&&!todayCardioDone?<B small onClick={()=>openCardioLog(todayCardioPlan)}>Log cardio</B>:null}
          </div>
        </div>
      ):todaySess?(
        <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center"}}>
          <div>
            <div style={{fontSize:16,fontWeight:800,color:C.t}}>{todaySess.name}</div>
            <div style={{fontSize:13,color:C.t2}}>{todaySess.focus} · {todaySess.exercises.length} exercises · ~{estTime(todaySess)}m</div>
            <div style={{fontSize:12,color:C.t3,marginTop:3}}>{todayCardioPlan?`After: ${todayCardioPlan.duration} min ${todayCardioPlan.label}.`:"After: recovery and evening closeout."}</div>
          </div>
          <B onClick={()=>{setSel(dn);startW(dn);}}>Start workout</B>
        </div>
      ):(
        <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center"}}>
          <div>
            <div style={{fontSize:16,fontWeight:800,color:C.t}}>No lift today</div>
            <div style={{fontSize:13,color:C.t2}}>Keep cardio, mobility, protein, and sleep on track.</div>
          </div>
          {!todayCardioDone?<B small onClick={()=>openCardioLog()}>Log cardio</B>:<span style={{fontSize:13,fontWeight:700,color:C.g}}>Cardio done</span>}
          <B small outline onClick={startManualW}>Empty session</B>
        </div>
      )}
    </X>

    <X style={{padding:10}}>
      <div style={{fontSize:11,fontWeight:800,color:C.t3,letterSpacing:"0.06em",marginBottom:6}}>Week plan</div>
      <div style={{display:"flex",gap:3}}>
        {dks.map(dk=>(<button key={dk} onClick={()=>setSel(dk)} style={{flex:1,padding:"8px 2px",borderRadius:6,
          border:`1px solid ${sel===dk?C.p:C.bd}`,background:sel===dk?C.pl:"transparent",color:sel===dk?C.p:C.t3,
          fontSize:11,cursor:"pointer",fontWeight:800,fontFamily:"inherit"}}>{dk.slice(0,3)}</button>))}
      </div>
    </X>

    <div style={{display:"flex",flexDirection:"column",gap:6}}>
    <X style={{padding:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div><div style={{fontSize:14,fontWeight:600,color:C.t}}>Evening Stretch</div><div style={{fontSize:12,color:C.t3}}>{mobRunning?fmtElapsed(mobTimer):`~${stretchMins} min · hip & spine recovery`}</div></div>
      {mobDone?<div style={{display:"flex",gap:8,alignItems:"center"}}>
          <span style={{fontSize:13,fontWeight:600,color:data.mob?.[t]?.skipped?C.t3:C.g}}>{data.mob?.[t]?.skipped?"Skipped":"Done"}{(()=>{const d=data.mob?.[t];return d&&typeof d==="object"&&d.dur?` · ${fmtElapsed(d.dur)}`:""})()}</span>
          <B small outline onClick={undoMob}>Undo</B></div>
        :mobRunning?<B small color={C.g} onClick={finishMob}>Done</B>
        :<div style={{display:"flex",gap:6}}>{!showMob&&<B small outline onClick={()=>setShowMob(true)}>View stretch</B>}<B small onClick={startMob}>Start stretch</B></div>}
    </X>
    {showMob&&(<div style={{marginTop:8}}>
      {!mobRunning&&!mobDone?(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <X style={{padding:10,borderLeft:`3px solid ${C.bd}`}}>
            <div style={{fontSize:12,color:C.t2,marginBottom:8}}>Tonight's sequence · start when ready, or skip today to stop the reminder.</div>
            {mobExercises.map((ex,i)=>(
              <div key={`${ex.id}-${i}`} style={{padding:"7px 0",borderBottom:`1px solid ${C.bl}`}}>
                <div style={{fontSize:13,fontWeight:750,color:C.t}}>{ex.name}</div>
                <div style={{fontSize:11,color:C.t3}}>{ex.sets}×{ex.dur}s · {ex.sides.join(" / ")}</div>
                <div style={{fontSize:11,color:C.t2,marginTop:2}}>{ex.cue}</div>
              </div>
            ))}
          </X>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
            <B full onClick={startMob} color={C.v}>Start stretch</B>
            <B full outline onClick={skipMob}>Skip today</B>
          </div>
        </div>
      ):mobRunning?(
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
            <span style={{fontSize:11,fontWeight:700,color:C.t3}}>
              {stretchDone.length}/{totalStretchSets} sets complete
            </span>
            <span style={{fontSize:12,color:C.t3}}>{fmtElapsed(mobTimer)}</span>
          </div>
          <Br v={stretchDone.length} max={totalStretchSets} color={C.v} h={4}/>
          {mobExercises.map((ex,ei)=>{
            const isCurrent=ei===stretchExIdx;
            const exDoneSets=ex.sides.filter((_,si)=>stretchDone.includes(`${ei}-${si}`)).length;
            const exComplete=exDoneSets===ex.sets;
            return(<X key={`${ex.id}-${ei}`} style={{padding:isCurrent?12:8,
              borderLeft:`3px solid ${exComplete?C.g:isCurrent?C.v:C.bd}`,
              opacity:exComplete?0.5:1}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:isCurrent?15:13,fontWeight:700,color:exComplete?C.g:C.t}}>{ex.name}</div>
                  {isCurrent&&<div style={{fontSize:11,color:C.t2,marginTop:2}}>{ex.cue}</div>}
                  {isCurrent&&ex.notes&&<div style={{fontSize:10,color:C.t3,marginTop:2}}>{ex.notes}</div>}
                </div>
                {exComplete&&<span style={{fontSize:16,color:C.g}}>✓</span>}
              </div>
              {isCurrent&&(
                <div style={{marginTop:8}}>
                  {STRETCH_POSES[ex.id]&&(()=>{const P=STRETCH_POSES[ex.id];return(
                    <div style={{textAlign:"center"}}>
                      <svg viewBox="0 0 72 56" style={{width:108,height:84}}>
                        <line x1="4" y1="52" x2="68" y2="52" stroke={C.bd} strokeWidth="2" strokeLinecap="round"/>
                        {P.prop&&<path d={P.prop} fill={C.bl} stroke="none"/>}
                        <path d={P.pose} fill="none" stroke={C.t} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                        {P.hl&&<path d={P.hl} fill="none" stroke={C.p} strokeWidth="4" strokeLinecap="round"/>}
                        <circle cx={P.hx} cy={P.hy} r="4.5" fill={C.t}/>
                      </svg>
                    </div>);})()}
                  <div style={{textAlign:"center",marginBottom:6}}>
                    <span style={{fontSize:13,fontWeight:700,color:C.v}}>
                      {ex.sides[stretchSetIdx]} · Step {stretchSetIdx+1}/{ex.sets}
                    </span>
                  </div>
                  {stretchRunning?(
                    <div style={{textAlign:"center",padding:12,background:stretchTimeLeft<=0?C.gl:C.vl,borderRadius:8}}>
                      <div style={{fontSize:42,fontWeight:800,color:stretchTimeLeft<=0?C.g:C.v,fontVariantNumeric:"tabular-nums"}}>
                        {stretchTimeLeft<=0?"Done!":
                         `${Math.floor(stretchTimeLeft/60)}:${String(stretchTimeLeft%60).padStart(2,"0")}`}
                      </div>
                      <button onClick={skipStretchTimer} style={{marginTop:6,background:"none",border:`1px solid ${C.bd}`,
                        borderRadius:8,padding:"4px 16px",fontSize:11,fontWeight:600,color:C.t3,cursor:"pointer",fontFamily:"inherit"}}>
                        {stretchTimeLeft<=0?"Next":"Skip"}
                      </button>
                    </div>
                  ):(
                    <B full onClick={()=>startStretchTimer(ex.dur)} color={C.v}>
                      Start ({ex.dur}s)
                    </B>
                  )}
                  <div style={{display:"flex",justifyContent:"center",gap:4,marginTop:6}}>
                    {ex.sides.map((side,si)=>(
                      <div key={si} style={{width:24,height:24,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",
                        fontSize:10,fontWeight:700,
                        background:stretchDone.includes(`${ei}-${si}`)?C.g:si===stretchSetIdx?C.v:"transparent",
                        color:stretchDone.includes(`${ei}-${si}`)?C.oa:si===stretchSetIdx?C.oa:C.t3,
                        border:`1px solid ${stretchDone.includes(`${ei}-${si}`)?C.g:si===stretchSetIdx?C.v:C.bd}`}}>
                        {side[0]}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </X>);
          })}
          <B full onClick={finishMob} color={stretchDone.length>=totalStretchSets?C.g:C.t3}>
            {stretchDone.length>=totalStretchSets?"Finish Stretch ✓":"End Early"}
          </B>
        </div>
      ):(
        <div style={{textAlign:"center",padding:8}}>
          <span style={{fontSize:13,fontWeight:600,color:C.g}}>Stretch Complete ✓</span>
        </div>
      )}
    </div>)}

    {/* ═══ DELOAD BANNER ═══ */}
    {isDeload&&(<X style={{padding:10}}>
      <div style={{fontSize:13,fontWeight:700,color:C.t}}>DELOAD WEEK {PROG.deload}</div>
      <div style={{fontSize:12,color:C.t2}}>All weights cut to 50%. Keep reps the same. Resume full weight next week.</div>
    </X>)}

    {/* ═══ LIFTS VS PROGRAM · mock 2b card · replaces the stall warning ═══ */}
    {(()=>{
      const wkStartD=new Date(PROG.start+"T12:00:00");
      const weekOf=d=>Math.floor((new Date(d+"T12:00:00")-wkStartD)/6048e5);
      const nowWk=Math.max(0,Math.min(PROG.weeks-1,weekOf(t)));
      const isLowerPat=p=>["squat","hinge","leg-curl","calf"].includes(p);
      const pool={upper:[],lower:[]};
      Object.values(data.program||{}).forEach(day=>{(day.exercises||[]).forEach(e=>{
        const pat=exLibById[e.id]?.pattern||e.pattern||"";
        const g=isLowerPat(pat)?"lower":"upper";
        if(!pool[g].some(x=>x.id===e.id))pool[g].push(e);
      });});
      const picks=(pool[liftTab]||[]).sort((a,b)=>(b.anchor?1:0)-(a.anchor?1:0)||(b.sets||0)-(a.sets||0)).slice(0,3);
      const shortName=shortLiftName;
      const rows=picks.map(ex=>{
        const byWk={};
        Object.entries(data.wk||{}).forEach(([d,w])=>{const wn=weekOf(d);if(wn<0||wn>nowWk)return;
          const wex=w.exercises?.find(e=>e.id===ex.id);if(!wex)return;
          const best=Math.max(0,...(wex.sets||[]).filter(saneSet).map(s=>Number(s.weight)||0));
          if(best>0)byWk[wn]=Math.max(byWk[wn]||0,best);});
        const wks=Object.keys(byWk).map(Number).sort((a,b)=>a-b);
        if(!wks.length)return{name:shortName(ex.name),vals:[],status:"NO LOGS YET",sc:C.t3,stroke:C.t3,pts:"",exp:""};
        const vals=wks.map(w=>byWk[w]);
        const inc=ex.inc||5;
        const expVals=wks.map((w,i)=>ex.anchor?vals[0]+inc*(w-wks[0]):vals[0]);
        const all=[...vals,...expVals];const mn=Math.min(...all),mx=Math.max(...all),rng=(mx-mn)||1;
        const px=w=>wks.length>1?(w-wks[0])/(wks[wks.length-1]-wks[0])*120:60;
        const py=v=>22-((v-mn)/rng)*18;
        const pts=wks.map((w,i)=>`${px(w).toFixed(1)},${py(vals[i]).toFixed(1)}`).join(" ");
        const exp=wks.map((w,i)=>`${px(w).toFixed(1)},${py(expVals[i]).toFixed(1)}`).join(" ");
        const last=vals[vals.length-1],first=vals[0];
        let trail=1;for(let i=vals.length-1;i>0&&vals[i]<=vals[i-1];i--)trail++;
        let status,sc,stroke;
        if(vals.length<2){status="LOGGING";sc=C.t3;stroke=C.p;}
        else if(last<first&&trail>=3){status=`DOWN · ${trail} WKS`;sc=C.r;stroke=C.r;}
        else if(last>first){stroke=C.p;sc=C.g;status=ex.anchor?(last>=expVals[expVals.length-1]?`AHEAD · +${inc} NEXT WK`:"ON PACE"):"ON PACE";}
        else{stroke=C.t2;sc=C.t2;status=`HOLDING · ${trail} WK${trail>1?"S":""}`;}
        return{name:shortName(ex.name),status,sc,stroke,pts,exp,vals};
      });
      return(<X style={{padding:"14px 16px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.14em",color:C.t3,fontFamily:FD}}>LIFTS VS PROGRAM · WK {nowWk+1}</div>
          <div style={{display:"flex",gap:4}}>
            {["upper","lower"].map(tb=>{const on=liftTab===tb;return(<button key={tb} onClick={()=>setLiftTab(tb)} style={{border:`1px solid ${on?C.t:C.bd}`,background:on?C.t:C.cd,color:on?C.oa:C.t3,borderRadius:5,padding:"4px 10px",fontSize:10,fontWeight:800,letterSpacing:"0.08em",cursor:"pointer",minHeight:26,fontFamily:FD,textTransform:"uppercase"}}>{tb}</button>);})}
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:10}}>
          {rows.map(r=>(<div key={r.name} style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:58,fontSize:12,fontWeight:800,letterSpacing:"0.04em",color:C.t,fontFamily:FD}}>{r.name}</div>
            <svg viewBox="0 0 120 26" style={{flex:1,height:26}}>
              {r.exp&&<polyline points={r.exp} fill="none" stroke={C.bd} strokeWidth="1" strokeDasharray="3,3"/>}
              {r.pts&&<polyline points={r.pts} fill="none" stroke={r.stroke} strokeWidth="2" strokeLinecap="round"/>}
            </svg>
            <div style={{fontSize:11,fontWeight:700,color:r.sc,whiteSpace:"nowrap",fontFamily:FD}}>{r.status}</div>
          </div>))}
        </div>
        <div style={{fontSize:11.5,lineHeight:1.5,color:C.t3,marginTop:10,borderTop:`1px dashed ${C.bl}`,paddingTop:8}}>Solid is your best set each week. Dashed is the program's line. It re-plots after every logged session. On a cut, <b style={{color:C.t}}>holding means keeping muscle</b>. Ember flags a lift only after three stalled weeks.</div>
      </X>);})()}

    {/* ═══ CARDIO ═══ */}
    {(()=>{const cardioToday=data.cardio?.[t];
      return(<X style={{padding:10,borderLeft:`3px solid ${cardioToday?.done?C.g:C.bd}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><div style={{fontSize:14,fontWeight:700,color:C.t}}>Cardio</div><div style={{fontSize:12,color:C.t3}}>{cardioToday?.done?cardioSummary(cardioToday):"Log Zone 2, stairs, Peloton, walks, or conditioning"}</div></div>
          {cardioToday?.done?<div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{fontSize:13,fontWeight:700,color:C.g}}>Done</span><B small outline onClick={undoCardio}>Undo</B></div>
            :showCardio?null:<B small onClick={()=>openCardioLog()}>Log</B>}
        </div>
        {renderCardioForm()}
      </X>);
    })()}
    </div>

    {(!todayLiftDone&&sel===dn)?null:sess?(<>
      <X style={{borderLeft:`3px solid ${C.bd}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><div style={{fontSize:16,fontWeight:700,color:C.t}}>{sess.name}</div>
            <div style={{fontSize:13,color:C.t2}}>{sess.focus} · {sess.exercises.length} ex · ~{estTime(sess)}m</div></div>
          {data.wk[t]&&sel===dn?<div style={{display:"flex",gap:8,alignItems:"center"}}>
            <span style={{fontSize:13,fontWeight:600,color:C.g,cursor:"pointer",textDecoration:"underline",textUnderlineOffset:2}} onClick={()=>setViewW([t,data.wk[t]])}>Done{data.wk[t].dur?` · ${data.wk[t].dur}m`:""}</span>
            <B small outline onClick={undoWorkout}>Undo</B></div>:<div style={{display:"flex",gap:6}}><B outline onClick={startManualW}>Empty</B><B onClick={()=>startW(sel)}>Start workout</B></div>}
        </div>
      </X>
      {hasVariants&&!workout&&(<X style={{padding:8,display:"flex",gap:4,flexWrap:"wrap"}}>
        <button onClick={()=>setVariant(sel,null)} style={{padding:"6px 10px",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",
          border:`1px solid ${!activeVariant[sel]?C.p:C.bd}`,background:!activeVariant[sel]?C.pl:"transparent",color:!activeVariant[sel]?C.p:C.t3}}>Standard</button>
        {Object.entries(hasVariants).map(([k,v])=>(<button key={k} onClick={()=>setVariant(sel,k)} style={{padding:"6px 10px",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",
          border:`1px solid ${activeVariant[sel]===k?C.p:C.bd}`,background:activeVariant[sel]===k?C.pl:"transparent",color:activeVariant[sel]===k?C.p:C.t3}}>{v.name.replace(data.program[sel]?.name+" ","").replace(/[()]/g,"")}</button>))}
      </X>)}
      {sess.warmup&&(<S title="Warm-Up" collapsible defaultOpen={false}>
        <X style={{padding:10}}>
          <div style={{fontSize:13,fontWeight:600,color:C.p,marginBottom:sess.warmup.moves.length?6:0}}>{sess.warmup.cardio}</div>
          {sess.warmup.note&&<div style={{fontSize:12,color:C.t2,marginBottom:4}}>{sess.warmup.note}</div>}
          {sess.warmup.moves.map((m,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderTop:i>0?`1px solid ${C.bl}`:"none"}}>
              <span style={{fontSize:13,fontWeight:600,color:C.t}}>{m.name}</span>
              <span style={{fontSize:12,color:C.t3}}>{m.rx}</span>
            </div>
          ))}
          {sess.warmup.ramp&&<div style={{fontSize:12,color:C.v,fontWeight:600,marginTop:4}}>{sess.warmup.ramp}</div>}
        </X>
      </S>)}
      {sel==="wednesday"&&<X style={{padding:10,borderLeft:`4px solid ${C.bd}`}}>
        <div style={{fontSize:12,fontWeight:850,color:C.v,letterSpacing:"0.06em"}}>Superset day</div>
        <div style={{fontSize:12,color:C.t2,marginTop:3,lineHeight:1.4}}>Do A then B back-to-back. Rest only after the B move: 1B 60s, 2B 60s, 3B 45s.</div>
      </X>}
      <S title="Exercises" collapsible defaultOpen={false}>
        {sess.exercises.map(ex=>{const prog=getProgEntry(data.prog,ex),cw=gw(ex,ex.sw,ex),ss=supersetLabel(sel,ex);
          const lastWk=(()=>{const dates=Object.keys(data.wk).sort().reverse();
            for(const d of dates){const wex=data.wk[d].exercises?.find(e=>e.id===ex.id);
              if(wex){const ds=wex.sets?.filter(saneSet);if(ds?.length)return{date:d,weight:ds[0].weight,reps:ds.map(s=>s.reps)};}}return null;})();
          const hit=lastWk&&lastWk.reps.length===ex.sets&&lastWk.reps.every(r=>r>=ex.rr[1]);
          return(<X key={ex.id} onClick={()=>setExInfo({ex,progKey:progKey(ex,ex)})} style={{padding:10,marginBottom:3,borderLeft:ss?`4px solid ${C.v}`:undefined,cursor:"pointer"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                  <div style={{fontSize:14,fontWeight:600,color:C.t}}>{ex.name}</div>
                  {ex.anchor&&<div style={{fontSize:10,background:C.pl,color:C.p,fontWeight:700,borderRadius:8,padding:"1px 5px"}}>ANCHOR</div>}
                </div>
                {ss&&<div style={{fontSize:11,color:C.v,fontWeight:850,marginTop:2,letterSpacing:"0.04em"}}>Superset {ss}</div>}
                <div style={{fontSize:12,color:C.t3}}>{ex.sets}×{rrTxt(ex.rr)} · {ex.rest?`Rest ${ex.rest}s after this`:"No rest · go straight to paired move"}</div>
                <div style={{fontSize:12,color:C.p,marginTop:1}}>{ex.cue}</div>
                {lastWk&&<div style={{fontSize:11,color:C.t3,marginTop:3}}>
                  <span style={{color:C.t2,fontWeight:600}}>Last:</span>{" "}
                  <span style={{color:hit?C.g:C.t2}}>{lastWk.weight}{ex.unit!=="BW"?" lbs":""} × {lastWk.reps.join("/")}</span>
                  {hit&&<span style={{color:C.g,fontWeight:700}}> ✓</span>}
                  <span style={{color:C.t3,marginLeft:4}}>{fmt(lastWk.date)}</span>
                </div>}
              </div>
              <div style={{textAlign:"right",minWidth:48}}>
                <div style={{fontSize:20,fontWeight:700,color:C.p}}>{cw>0?cw:"BW"}</div>
                <div style={{fontSize:10,color:C.t3}}>{ex.unit}</div>
                {hit&&(ex.anchor||!CUT_HOLD_PROGRESSION)&&<div style={{fontSize:10,color:C.g,fontWeight:600}}>↑ +{ex.inc}</div>}
                {hit&&!ex.anchor&&CUT_HOLD_PROGRESSION&&<div style={{fontSize:10,color:C.g,fontWeight:600}}>rep PR ✓</div>}
              </div>
            </div>
          </X>);})}
      </S>
    </>):<X style={{padding:14}}><div style={{textAlign:"center",color:C.t3,fontSize:14,marginBottom:10}}>Rest Day</div><B full outline onClick={startManualW}>Start empty session</B></X>}

    <S title="Training calendar" collapsible defaultOpen={false}>
    <X style={{padding:10}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <button onClick={()=>{if(calMonth===0){setCalMonth(11);setCalYear(calYear-1);}else setCalMonth(calMonth-1);}}
          style={{background:"none",border:"none",color:C.t2,cursor:"pointer",fontSize:18,padding:"4px 8px"}}>‹</button>
        <span style={{fontSize:14,fontWeight:700,color:C.t}}>{monthNames[calMonth]} {calYear}</span>
        <button onClick={()=>{if(calMonth===11){setCalMonth(0);setCalYear(calYear+1);}else setCalMonth(calMonth+1);}}
          style={{background:"none",border:"none",color:C.t2,cursor:"pointer",fontSize:18,padding:"4px 8px"}}>›</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,textAlign:"center"}}>
        {["S","M","T","W","T","F","S"].map((d,i)=>(
          <div key={i} style={{fontSize:10,fontWeight:700,color:C.t3,padding:"2px 0"}}>{d}</div>
        ))}
        {calDays().map((d,i)=>{
          if(!d)return <div key={`e${i}`}/>;
          const dk=calKey(d);
          const isToday=dk===t;
          const hasWorkout=!!data.wk[dk];
          const hasMob=!!(data.mob?.[dk]?.done||data.mob?.[dk]===true);
          const dayName=dw(dk);
          const isRestDay=["saturday","sunday"].includes(dayName);
          return(
            <div key={dk} onClick={hasWorkout?()=>setViewW([dk,data.wk[dk]]):undefined}
              style={{padding:"4px 2px",borderRadius:8,cursor:hasWorkout?"pointer":"default",
                background:isToday?C.pl:hasWorkout?C.gl:"transparent",
                border:isToday?`1px solid ${C.p}`:"1px solid transparent",
                position:"relative",minHeight:28,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
              <span style={{fontSize:12,fontWeight:isToday?700:400,color:isRestDay?C.t3:C.t}}>{d}</span>
              {hasWorkout&&<div style={{width:5,height:5,borderRadius:6,background:C.g,marginTop:1}}/>}
              {hasMob&&<div style={{width:5,height:5,borderRadius:6,background:C.v,marginTop:1}}/>}
            </div>
          );
        })}
      </div>
    </X>
    </S>

    <S title={`Workout History (${allWk.length})`} collapsible defaultOpen={false}>
      {allWk.length===0?<div style={{color:C.t3,fontSize:13,padding:8,textAlign:"center"}}>No workouts logged yet</div>
      :allWk.slice(0,15).map(([d,w])=>{
        const wSess=data.program[w.day];
        const totalSets=w.exercises?w.exercises.reduce((s,e)=>s+(e.sets?.filter(s=>s.done).length||0),0):0;
        return(
          <X key={d} onClick={()=>setViewW([d,w])} style={{padding:10,marginBottom:3,cursor:"pointer"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:14,fontWeight:600,color:C.t}}>{wSess?.name||w.day}</div>
                <div style={{fontSize:12,color:C.t2}}>{fmt(d)} · {w.dur||"?"}min · {totalSets} sets</div>
              </div>
              <span style={{color:C.t3,fontSize:13}}>→</span>
            </div>
          </X>
        );
      })}
    </S>

  </div>);
};

// ═══ NUTRITION ═══
const MEAL_TYPES=["Breakfast","Lunch","Dinner","Snack"];

const getWeekDates = (dateStr) => {
  const d = new Date(dateStr + "T12:00:00");
  const dow = d.getDay(); // 0=Sun
  const mon = new Date(d);
  mon.setDate(d.getDate() - ((dow + 6) % 7)); // back to Monday
  return Array.from({length:7}, (_,i) => {
    const dd = new Date(mon);
    dd.setDate(mon.getDate() + i);
    return lds(dd);
  });
};

const Nutrition=({data,setData})=>{
  const [todayKey,setTodayKey]=useState(td());
  useEffect(()=>{const iv=setInterval(()=>setTodayKey(td()),60000);return()=>clearInterval(iv);},[]);
  const t=todayKey,dn=dw(t);
  const [selM,setSelM]=useState(null);
  const [editing,setEditing]=useState(null);
  useBackClose(selM!==null,()=>{setSelM(null);setEditing(null);});

  const [showWaterHist,setShowWaterHist]=useState(false);
  const [quickDesc,setQuickDesc]=useState("");
  const [quickCal,setQuickCal]=useState("");
  const [quickPro,setQuickPro]=useState("");
  const [viewDate,setViewDate]=useState(t);
  const viewNut=data.nut[viewDate]||{meals:[],totalCal:0,totalProtein:0,totalCarbs:0,totalFat:0,totalFiber:0};
  const tl=viewNut;
  const isViewingToday=viewDate===t;
  const st=data.settings||DEFAULTS;
  const calT=getDayCalTarget(viewDate,st,data.travelDays,data.socialWeekend),proT=getDayProTarget(viewDate,st,data.travelDays,data.socialWeekend);
  const weekDates=getWeekDates(viewDate);
  const weekCals=weekDates.reduce((s,d)=>s+(data.nut[d]?.totalCal||0),0);
  const weekTarget=weekDates.reduce((s,d)=>s+(getDayCalTarget(d,st,data.travelDays,data.socialWeekend)||0),0);
  const weekRemaining=weekTarget-weekCals;
  const weekDayLabels=["M","T","W","T","F","S","S"];
  const viewDayType=getDayType(viewDate,data.travelDays);
  const viewFatPct=tl.totalCal>0?Math.round(((tl.totalFat||0)*9/tl.totalCal)*100):0;
  const waterToday=data.water?.[viewDate]||0;
  const waterGoal=st.water||128;
  const navDate=(dir)=>{const d=new Date(viewDate+"T12:00:00");d.setDate(d.getDate()+dir);const ds=lds(d);if(ds<=t)setViewDate(ds);};

  const rc=sumMeals;
  const rm=i=>{const nl=rc(tl.meals.filter((_,j)=>j!==i));const nd={...data,nut:{...data.nut,[viewDate]:nl}};setData(nd);sv(nd);svSB.nutrition(viewDate,nl);setSelM(null);};
  const {add:addWater,reset:resetWater}=waterOps(setData,viewDate);

  const [showTDEEAdjust,setShowTDEEAdjust]=useState(false);
  const [tdeeGoal,setTdeeGoal]=useState("moderate_cut");
  const nutTDEE=React.useMemo(()=>calcAdaptiveTDEE(data.wt,data.nut,st,data.travelDays,data.tdeeExclude||{},data.tdeeCal),[data,st]);

  const calRemaining=calT===null?null:Math.max(0,calT-(tl.totalCal||0));
  const proRemaining=Math.max(0,proT-(tl.totalProtein||0));
  const needText=proRemaining>0
    ?`${proRemaining}g protein left${calRemaining!==null?` · ${calRemaining} cal flex`:""}`
    :calRemaining!==null&&calRemaining>0
      ?`Protein hit · ${calRemaining} cal flex left`
      :calT!==null&&tl.totalCal>calT
        ?`Protein hit · ${tl.totalCal-calT} cal over, keep next meal lean`
        :"Protein covered · keep logging simple";
  const quickMealType=(()=>{const h=new Date().getHours();return h<11?"Breakfast":h<15?"Lunch":h<20?"Dinner":"Snack";})();
  const addQuickMeal=(preset)=>{
    const cal=+(preset?.cal??quickCal)||0, protein=+(preset?.protein??quickPro)||0;
    if(!cal&&!protein)return;
    const meal={
      description:(preset?.description||quickDesc.trim()||"Quick log"),
      cal,protein,carbs:0,fat:0,fiber:0,mealType:quickMealType,source:"quick"
    };
    const nl=rc([...(tl.meals||[]),meal]);
    const nd={...data,nut:{...data.nut,[viewDate]:nl}};
    setData(nd);sv(nd);svSB.nutrition(viewDate,nl);
    if(!preset){setQuickDesc("");setQuickCal("");setQuickPro("");}
  };

  const updateMeal=(idx,updates)=>{
    const newMeals=tl.meals.map((m,i)=>i===idx?{...m,...updates}:m);
    const nl=rc(newMeals);const nd={...data,nut:{...data.nut,[viewDate]:nl}};setData(nd);sv(nd);svSB.nutrition(viewDate,nl);
  };

  if(selM!==null){
    const meal=tl.meals[selM];if(!meal){setSelM(null);return null;}
    const mt=(meal.protein||0)*4+(meal.carbs||0)*4+(meal.fat||0)*9;
    const pp=mt?Math.round(((meal.protein||0)*4/mt)*100):0,cp=mt?Math.round(((meal.carbs||0)*4/mt)*100):0,fp=100-pp-cp;
    return(<div style={{display:"flex",flexDirection:"column",gap:8}}>
      <button onClick={()=>{setSelM(null);setEditing(null);}} style={{background:"none",border:"none",color:C.p,cursor:"pointer",fontSize:14,fontWeight:600,textAlign:"left",padding:0}}>← Back</button>
      <X><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:16,fontWeight:700,color:C.t}}>{meal.description}</div>
          <div style={{display:"flex",gap:4,alignItems:"center"}}>
            {meal.source&&<span style={{fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:6,
              color:meal.source==="mfp"?C.g:C.t3,
              background:meal.source==="mfp"?C.gl:"transparent",
            }}>{meal.source==="mfp"?"Sync":meal.source}</span>}
            {meal.mealType&&<span style={{fontSize:11,fontWeight:600,color:C.p,background:C.pl,padding:"2px 8px",borderRadius:8}}>{meal.mealType}</span>}
          </div>
        </div>
        {editing==="macros"?(<div style={{margin:"8px 0"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:3}}>
            {[{k:"protein",l:"Pro"},{k:"carbs",l:"Carb"},{k:"fat",l:"Fat"},{k:"fiber",l:"Fib"}].map(f=>(
              <div key={f.k}><N value={meal[f.k]||0} onChange={v=>{const updated={...meal,[f.k]:+v||0};const cal=(updated.protein||0)*4+(updated.carbs||0)*4+(updated.fat||0)*9;updateMeal(selM,{[f.k]:+v||0,cal});}} placeholder={f.l}/><div style={{fontSize:9,color:C.t3,textAlign:"center",fontWeight:600,marginTop:2}}>{f.l}</div></div>))}
          </div>
          <B full small style={{marginTop:6}} onClick={()=>setEditing(null)}>Done</B>
        </div>):(<div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr",gap:3,textAlign:"center",margin:"10px 0"}}>
            {[{l:"Cal",v:meal.cal,c:C.p},{l:"Pro",v:`${meal.protein}g`,c:C.g},{l:"Carb",v:`${meal.carbs}g`,c:C.t2},
              {l:"Fat",v:`${meal.fat}g`,c:C.r},{l:"Fib",v:`${meal.fiber||0}g`,c:C.v}].map((m,i)=>(
              <div key={i}><div style={{fontSize:17,fontWeight:700,color:m.c}}>{m.v}</div><div style={{fontSize:9,color:C.t3,fontWeight:600}}>{m.l}</div></div>))}
          </div>
        </div>)}
        <div style={{display:"flex",height:6,borderRadius:6,overflow:"hidden",marginTop:6,marginBottom:2}}>
          <div style={{width:`${pp}%`,background:C.g}}/><div style={{width:`${cp}%`,background:C.t3}}/><div style={{width:`${fp}%`,background:C.r}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.t3}}><span>P {pp}%</span><span>C {cp}%</span><span>F {fp}%</span></div>
      </X>
      {(meal.source==="cronometer"||meal.source==="mfp")?(
        <div style={{fontSize:12,color:C.t3,textAlign:"center",padding:"6px 0"}}>Synced from Cronometer · read-only here; edit in Cronometer.</div>
      ):(
      <div style={{display:"flex",gap:6}}>
        <B full outline onClick={()=>setEditing(editing==="macros"?null:"macros")}>Edit Macros</B>
        <B full outline onClick={()=>rm(selM)} color={C.r}>Remove</B>
      </div>
      )}
    </div>);
  }

  const grouped={};
  MEAL_TYPES.forEach(mt=>{grouped[mt]=[];});
  tl.meals.forEach((m,i)=>{const mt=m.mealType||"Snack";if(!grouped[mt])grouped[mt]=[];grouped[mt].push({...m,_idx:i});});

  const isExcluded=!!(data.tdeeExclude||{})[viewDate];
  const toggleExclude=()=>{const newVal=!isExcluded;const nd={...data,tdeeExclude:{...data.tdeeExclude,[viewDate]:newVal||undefined}};if(!newVal)delete nd.tdeeExclude[viewDate];setData(nd);sv(nd);svSB.tdeeExclude(viewDate,newVal);};

  return(<div style={{display:"flex",flexDirection:"column",gap:6}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div style={{fontSize:17,fontWeight:700,color:C.t}}>Food</div>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <button type="button" aria-label="Previous day" onClick={()=>navDate(-1)} style={{background:"none",border:`1px solid ${C.bd}`,borderRadius:8,color:C.t2,cursor:"pointer",fontSize:18,minWidth:40,minHeight:36}}>‹</button>
        <button type="button" onClick={()=>setViewDate(t)} style={{background:"none",border:"none",fontSize:13,fontWeight:700,color:isViewingToday?C.p:C.t2,minWidth:84,textAlign:"center",cursor:"pointer",fontFamily:"inherit"}}>{isViewingToday?"Today":fmt(viewDate)}</button>
        <button type="button" aria-label="Next day" onClick={()=>navDate(1)} disabled={isViewingToday} style={{background:"none",border:`1px solid ${C.bd}`,borderRadius:8,color:isViewingToday?C.bd:C.t2,cursor:isViewingToday?"default":"pointer",fontSize:18,minWidth:40,minHeight:36}}>›</button>
        <button onClick={toggleExclude} title={isExcluded?"Excluded from TDEE · click to include":"Include in TDEE calc"} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,padding:"2px 4px",color:isExcluded?C.r:C.t3,opacity:isExcluded?1:0.5}}>{isExcluded?"⊘":"◎"}</button>
      </div>
    </div>
    {isExcluded&&<div style={{fontSize:10,fontWeight:600,color:C.r,textAlign:"right",marginTop:-4,letterSpacing:"0.04em"}}>Excluded from TDEE</div>}

    {(()=>{const dn=DINNERS[dw(viewDate)];if(!dn)return null;return(<X style={{padding:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
        <div style={{fontSize:10,fontWeight:700,color:C.p,letterSpacing:"0.14em",fontFamily:FD}}>TONIGHT · {dn.name.toUpperCase()}</div>
        <div style={{fontSize:10,fontWeight:700,color:C.t3,letterSpacing:"0.04em",fontFamily:FD}}>{dn.tag}</div>
      </div>
      <div style={{fontSize:14,fontWeight:600,color:C.t,marginTop:6,lineHeight:1.4}}>{dn.how}</div>
      <div style={{display:"flex",gap:7,marginTop:9}}>
        <div style={{flex:1,background:C.bg,borderRadius:8,padding:"8px 10px"}}><div style={{fontSize:15,fontWeight:800,color:C.t,fontFamily:FD}}>{dn.you}</div><div style={{fontSize:9,fontWeight:700,letterSpacing:"0.08em",color:C.t3,fontFamily:FD}}>YOUR PLATE</div></div>
        <div style={{flex:1,background:C.bg,borderRadius:8,padding:"8px 10px"}}><div style={{fontSize:15,fontWeight:800,color:C.t,fontFamily:FD}}>{dn.dani}</div><div style={{fontSize:9,fontWeight:700,letterSpacing:"0.08em",color:C.t3,fontFamily:FD}}>DANIELLE</div></div>
      </div>
      <div style={{fontSize:11,color:C.t3,marginTop:7}}>Saved as a Cronometer recipe. Logging it takes two taps there.</div>
    </X>);})()}

    <X style={{padding:12,borderLeft:`3px solid ${C.bd}`}}>
      <L>What do I need next?</L>
      <div style={{fontSize:18,fontWeight:800,color:C.t,marginBottom:4}}>{needText}</div>
      <div style={{fontSize:12,color:C.t2,marginBottom:10}}>Rough logs are useful. Get calories + protein in, perfect macros can wait.</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:8}}>
        {[{description:"Shake: whey + banana",cal:435,protein:52},{description:"Nurri",cal:150,protein:30},{description:"Prepped protein + veg + fruit",cal:420,protein:52},{description:"Greek yogurt",cal:130,protein:18}].map(p=>(
          <button key={p.description} onClick={()=>addQuickMeal(p)} style={{padding:"9px 4px",borderRadius:8,border:`1px solid ${C.bd}`,background:C.bg,color:C.t,fontSize:11,fontWeight:800,fontFamily:"inherit",minHeight:44}}>
            {p.description}<br/><span style={{color:C.t3,fontWeight:700}}>{p.cal} cal · {p.protein}g</span>
          </button>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1.5fr .8fr .8fr",gap:6}}>
        <T value={quickDesc} onChange={setQuickDesc} placeholder="Quick meal"/>
        <N value={quickCal} onChange={setQuickCal} placeholder="cal"/>
        <N value={quickPro} onChange={setQuickPro} placeholder="pro"/>
      </div>
      <B full small style={{marginTop:6}} disabled={!quickCal&&!quickPro} onClick={()=>addQuickMeal()}>Log rough meal</B>
    </X>

    <S title={`Week view · ${weekRemaining>=0?`${weekRemaining.toLocaleString()} cal left`:`${Math.abs(weekRemaining).toLocaleString()} cal over`}`} collapsible defaultOpen={false}>
      <X style={{padding:10,marginBottom:4}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:4}}>
          <span style={{fontSize:11,fontWeight:700,color:C.t3,letterSpacing:"0.06em"}}>Week Total</span>
          <span style={{fontSize:13,fontWeight:700,color:weekRemaining>=0?C.t:C.r}}>{weekCals.toLocaleString()} / {weekTarget.toLocaleString()}</span>
        </div>
        <Br v={weekCals} max={weekTarget} color={weekCals>weekTarget?C.r:C.p} h={4}/>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginTop:6}}>
          {weekDates.map((d,i)=>{
            const dc=data.nut[d]?.totalCal||0;
            const dt=getDayCalTarget(d,st,data.travelDays,data.socialWeekend);
            const isView=d===viewDate;
            const isFuture=d>td();
            const logged=dc>0;
            return(<div key={d} style={{textAlign:"center",padding:"3px 0",borderRadius:6,
              background:isView?C.pl:"transparent",border:isView?`1px solid ${C.p}`:"1px solid transparent"}}>
              <div style={{fontSize:9,fontWeight:600,color:C.t3}}>{weekDayLabels[i]}</div>
              <div style={{fontSize:10,fontWeight:700,color:logged?(dt===null?C.t:dc>dt?C.r:C.g):isFuture?C.t3:C.r}}>
                {logged?Math.round(dc/100)*100:isFuture?"—":"0"}
              </div>
            </div>);
          })}
        </div>
        {isSocialWeekendActive(viewDate,data.socialWeekend)&&(
          <div style={{fontSize:10,fontWeight:600,color:C.t3,marginTop:4,textAlign:"center",fontStyle:"italic"}}>Social weekend active · ~1.5 lbs expected this week</div>
        )}
      </X>
    </S>

    <X style={{padding:12}}>
      {calT!==null?(<>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}>
        <div style={{fontSize:26,fontWeight:700,color:tl.totalCal>calT?C.r:C.p}}>{tl.totalCal}</div>
        <div style={{fontSize:13,color:C.t3}}>/ {calT} cal</div>
      </div>
      <Br v={tl.totalCal} max={calT} color={tl.totalCal>calT?C.r:C.p} h={7}/>
      </>):(<>
      <div style={{fontSize:13,color:C.t2,marginBottom:6,fontStyle:"italic"}}>Social weekend · log your food, protein first</div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}>
        <div style={{fontSize:26,fontWeight:700,color:tl.totalProtein>=proT?C.g:C.p}}>{tl.totalProtein}g</div>
        <div style={{fontSize:13,color:C.t3}}>/ {proT}g protein floor</div>
      </div>
      <Br v={tl.totalProtein} max={proT} color={tl.totalProtein>=proT?C.g:C.p} h={7}/>
      </>)}
      <div style={{display:"flex",justifyContent:"space-between",marginTop:10,fontSize:13,fontWeight:700}}>
        <span style={{color:tl.totalProtein>=proT?C.g:C.r}}>{tl.totalProtein}g / {proT}g protein</span>
        <span style={{color:C.t2}}>{tl.totalCal} cal</span>
        <span style={{color:C.v}}>{tl.totalFiber||0}g / {st.fiber||30}g fiber</span>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.t3,marginTop:4}}>
        <span style={{fontWeight:600,color:viewDayType==="travel"?C.t2:calT===null?C.t2:C.t2}}>{calT===null?"Social Weekend":viewDayType==="travel"?"Travel Day":viewDayType==="wednesday"?"Wednesday (Fast)":viewDayType==="training"?"Training Day":"Weekend"}</span>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          {tl.meals?.length>0&&tl.meals.every(m=>!m.source||m.source==="mfp"||m.source==="cronometer")&&(
            <span style={{fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:6,background:C.gl,color:C.g}}>Cronometer</span>
          )}
          <span>{calT} cal · {proT}g pro target</span>
        </div>
      </div>
      {viewFatPct>25&&tl.totalCal>0&&(<div style={{marginTop:6,padding:"6px 8px",background:C.rl,borderRadius:8,fontSize:11,color:C.r,fontWeight:600}}>
        Fat at {viewFatPct}% of calories (target: 20-25%). Watch cooking oil, cheese, and sauces.
      </div>)}
    </X>

    {tl.totalCal>0&&(
      <div style={{display:"flex",justifyContent:"space-around",padding:"6px 0",marginBottom:4}}>
        <span style={{fontSize:11,fontWeight:600,color:proT-tl.totalProtein>0?C.r:C.g}}>
          {Math.max(0,proT-tl.totalProtein)}g protein left
        </span>
        <span style={{fontSize:11,fontWeight:600,color:calT-tl.totalCal>0?C.t2:C.r}}>
          {Math.max(0,calT-tl.totalCal)} cal left
        </span>
      </div>
    )}

    {/* ═══ TDEE SMART BANNER ═══ */}
    {nutTDEE&&nutTDEE.phase!=="collecting"&&nutTDEE.confidence>=60&&isViewingToday&&(
      <S title="Target logic" collapsible defaultOpen={false}>
        <div style={{padding:"8px 12px",background:C.pl,borderRadius:6,display:"flex",justifyContent:"space-between",alignItems:"center",border:`1px solid ${C.bd}`}}>
          <div style={{fontSize:11,color:C.t2}}>
            <span style={{fontWeight:600}}>TDEE: {nutTDEE.tdee.toLocaleString()}{nutTDEE.tdeeLow!=null?`±${nutTDEE.tdee-nutTDEE.tdeeLow}`:""}</span> · Target: {calT} · <span style={{fontWeight:600,color:nutTDEE.deficit>0?C.g:C.r}}>{Math.abs(nutTDEE.deficit)} cal {nutTDEE.deficit>0?"deficit":"surplus"}</span>
          </div>
          <button onClick={()=>setShowTDEEAdjust(true)} style={{background:C.p,color:C.oa,border:"none",borderRadius:8,padding:"4px 10px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>Adjust</button>
        </div>
      </S>
    )}

    {/* ═══ TDEE ADJUST MODAL ═══ */}
    {showTDEEAdjust&&nutTDEE&&nutTDEE.tdee&&(
      <X style={{padding:14,borderLeft:`3px solid ${C.bd}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <L>Adjust Targets Based on TDEE</L>
          <button onClick={()=>setShowTDEEAdjust(false)} style={{background:"none",border:"none",color:C.t3,cursor:"pointer",fontSize:16}}>✕</button>
        </div>
        <div style={{fontSize:12,color:C.t2,marginBottom:10}}>Your adaptive TDEE: <span style={{fontWeight:700,color:C.t}}>{nutTDEE.tdee.toLocaleString()} cal/day</span></div>
        {[
          {id:"aggressive_cut",label:"Aggressive cut",offset:-500,desc:"~1 lb/wk loss"},
          {id:"moderate_cut",label:"Moderate cut",offset:-250,desc:"~0.5 lb/wk loss"},
          {id:"maintenance",label:"Maintenance hold",offset:0,desc:"pause loss if recovery demands it"}
        ].map(opt=>(
          <div key={opt.id} onClick={()=>setTdeeGoal(opt.id)} style={{
            display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",marginBottom:4,
            background:tdeeGoal===opt.id?C.pl:C.bg,borderRadius:6,cursor:"pointer",
            border:tdeeGoal===opt.id?`2px solid ${C.p}`:`2px solid transparent`
          }}>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:C.t}}>{opt.label} <span style={{fontWeight:400,color:C.t3}}>({opt.offset>0?"+":""}{opt.offset})</span></div>
              <div style={{fontSize:11,color:C.t3}}>{opt.desc}</div>
            </div>
            <div style={{fontSize:15,fontWeight:700,color:tdeeGoal===opt.id?C.p:C.t2}}>{(nutTDEE.tdee+opt.offset).toLocaleString()}</div>
          </div>
        ))}
        <B full color={C.p} onClick={()=>{
          const opt={aggressive_cut:-500,moderate_cut:-250,maintenance:0}[tdeeGoal]||0;
          const newCal=nutTDEE.tdee+opt;
          const ratio=newCal/(st.calories||DEFAULTS.calories);
          const nd={...data,settings:{...st,
            calories:Math.round(newCal),
            trainingCal:Math.round((st.trainingCal||DEFAULTS.trainingCal)*ratio),
            wednesdayCal:Math.round((st.wednesdayCal||DEFAULTS.wednesdayCal)*ratio),
            weekendCal:Math.round((st.weekendCal||DEFAULTS.weekendCal)*ratio)
          }};
          setData(nd);sv(nd);svSB.settings(nd.settings);setShowTDEEAdjust(false);
        }} style={{marginTop:8}}>Apply to Settings</B>
      </X>
    )}

    <S title={`Water · ${waterToday}/${waterGoal} oz`} collapsible defaultOpen={false}>
    <X style={{padding:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
        <div>
          <span style={{fontSize:13,fontWeight:700,color:C.t}}>Water </span>
          <span style={{fontSize:18,fontWeight:700,color:waterToday>=waterGoal?C.g:C.p}}>{waterToday}</span>
          <span style={{fontSize:13,color:C.t3}}> / {waterGoal} oz</span>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {waterToday>0&&<button onClick={resetWater} style={{background:"none",border:"none",color:C.t3,cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>Reset</button>}
          {Object.keys(data.water||{}).length>1&&<button onClick={()=>setShowWaterHist(!showWaterHist)} style={{background:"none",border:"none",color:C.p,cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"inherit"}}>{showWaterHist?"Hide":"7d"}</button>}
        </div>
      </div>
      <Br v={waterToday} max={waterGoal} color={waterToday>=waterGoal?C.g:C.p} h={8}/>
      <div style={{display:"flex",gap:6,marginTop:8}}>
        {[24,32,64].map(oz=>(
          <button key={oz} onClick={()=>addWater(oz)} style={{
            flex:1,padding:"10px 4px",borderRadius:6,fontSize:15,fontWeight:700,cursor:"pointer",
            background:"transparent",border:`1px solid ${C.bd}`,color:C.t,fontFamily:"inherit",minHeight:44,
          }}>+{oz}oz</button>
        ))}
      </div>
      {showWaterHist&&(()=>{
        const entries=Object.entries(data.water||{}).filter(([d])=>d!==viewDate).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,7);
        const avg=entries.length?Math.round(entries.reduce((s,[_,v])=>s+v,0)/entries.length):0;
        return(<div style={{marginTop:8,borderTop:`1px solid ${C.bl}`,paddingTop:6}}>
          <div style={{fontSize:11,fontWeight:700,color:C.t3,marginBottom:4}}>Last 7 days · avg {avg} oz</div>
          {entries.map(([d,v])=>(<div key={d} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"3px 0"}}>
            <span style={{fontSize:12,color:C.t2}}>{fmt(d)}</span>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:60}}><Br v={v} max={waterGoal} color={v>=waterGoal?C.g:C.p} h={4}/></div>
              <span style={{fontSize:12,fontWeight:600,color:v>=waterGoal?C.g:C.t,width:40,textAlign:"right"}}>{v}oz</span>
            </div>
          </div>))}
        </div>);
      })()}
    </X>
    </S>

    {MEAL_TYPES.map(mt=>{
      const meals=grouped[mt];
      if(meals.length===0)return null;
      const mtCal=meals.reduce((s,m)=>s+(m.cal||0),0);
      return(
        <S key={mt} title={`${mt} (${meals.length}) · ${mtCal} cal`}>
          {meals.map((m)=>(<X key={m._idx} onClick={()=>setSelM(m._idx)} style={{padding:10,marginBottom:3,cursor:"pointer"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{flex:1,minWidth:0}}><div style={{display:"flex",gap:4,alignItems:"center"}}><span style={{fontSize:14,fontWeight:600,color:C.t,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.description}</span>
                {(m.source==="mfp"||m.source==="cronometer")&&<span style={{fontSize:8,fontWeight:700,color:C.g,background:C.gl,padding:"1px 4px",borderRadius:8,flexShrink:0}}>{m.source==="mfp"?"SYNC":"CRON"}</span>}
              </div>
                <div style={{fontSize:12,color:C.t2,marginTop:1}}>{m.cal} cal · {m.protein}g protein{m.fiber?` · ${m.fiber}g fiber`:""}</div></div>
              <span style={{color:C.t3,fontSize:13}}>→</span>
            </div>
          </X>))}
        </S>
      );
    })}
    {tl.meals.length===0&&<div style={{color:C.t3,fontSize:13,padding:12,textAlign:"center"}}>No meals logged today</div>}
  </div>);
};

// ═══ WEIGHT ═══
const Weight=({data,setData})=>{
  const [nw,setNw]=useState("");const t=td();
  const [delDate,setDelDate]=useState(null);
  const st=data.settings||DEFAULTS;
  const entries=Object.entries(data.wt).sort((a,b)=>b[0].localeCompare(a[0]));
  const latest=entries[0]?.[1],oldest=entries[entries.length-1]?.[1];
  const tc=latest&&oldest?Math.round(latest-oldest):null;
  const ch=entries.slice(0,14).reverse().map(([d,v])=>({v,d:d.slice(5)}));
  const wTrend=getTrend(data.wt,t);
  const wtTDEE=React.useMemo(()=>calcAdaptiveTDEE(data.wt,data.nut,st,data.travelDays,data.tdeeExclude||{},data.tdeeCal),[data,st]);
  const trendWeights=wtTDEE&&wtTDEE.trendWeights?wtTDEE.trendWeights.slice(-14):null;
  const todayLogged=data.wt[t]!=null;
  const yesterdayWt=(()=>{const e=Object.entries(data.wt||{}).filter(([d])=>d<t).sort((a,b)=>b[0].localeCompare(a[0]));return e[0]?.[1]||null;})();
  const add=()=>{if(!nw)return;const v=Number(nw);const nd={...data,wt:{...data.wt,[t]:v}};setData(nd);sv(nd);svSB.weight(t,v);setNw("");haptic(20);};
  return(<div style={{display:"flex",flexDirection:"column",gap:8}}>
    {delDate&&<ConfirmModal title="Delete weigh-in?" message={`${Number(data.wt[delDate]).toFixed(1)} lbs on ${fmt(delDate)} will be removed from this phone and the cloud.`} confirmText="Delete" confirmColor={C.r} onCancel={()=>setDelDate(null)} onConfirm={()=>{const nwt={...data.wt};delete nwt[delDate];const nd={...data,wt:nwt};setData(nd);sv(nd);svSB.delWeight(delDate);setDelDate(null);}}/>}
    <div>
      <div style={{fontSize:18,fontWeight:800,color:C.t}}>Morning scale</div>
      <div style={{fontSize:13,color:C.t3}}>Log the number, then watch the trend.</div>
    </div>

    <ScalePad value={nw} onChange={setNw} onLog={add} hint="type it like the scale shows it" todayLogged={todayLogged?data.wt[t]:null} yesterdayWt={yesterdayWt}/>

    <WeightTrendCard trend={wTrend} tdee={wtTDEE&&wtTDEE.tdee}/>

    {wTrend&&Math.abs(wTrend.rate)>1&&(<X style={{padding:12,borderLeft:`3px solid ${C.bd}`}}>
      <div style={{fontSize:11,fontWeight:800,color:C.t3,letterSpacing:"0.06em"}}>Cut pace</div>
      <div style={{fontSize:14,color:C.t,fontWeight:750,marginTop:2}}>{wTrend.direction==="up"?"Gaining":"Losing"} {Math.abs(wTrend.rate).toFixed(1)} lb/wk</div>
      <div style={{fontSize:12,color:C.t2,marginTop:3}}>{wTrend.rate>0?"Pull back weekend portions slightly. You are in surplus.":"Add 200 cal to training days from carbs. You are cutting; protect performance."}</div>
    </X>)}

    <S title="Scale review" collapsible defaultOpen={false}>
      <div style={{display:"grid",gridTemplateColumns:trendWeights?"1fr 1fr 1fr 1fr":"1fr 1fr 1fr",gap:4}}>
        <X style={{padding:8,textAlign:"center"}}><div style={{fontSize:19,fontWeight:700,color:C.t}}>{latest?Math.round(latest):"—"}</div><div style={{fontSize:10,color:C.t3,fontWeight:600}}>Current</div></X>
        {trendWeights&&<X style={{padding:8,textAlign:"center"}}><div style={{fontSize:19,fontWeight:700,color:C.g}}>{Math.round(wtTDEE.trendWeight)}</div><div style={{fontSize:10,color:C.t3,fontWeight:600}}>Trend</div></X>}
        <X style={{padding:8,textAlign:"center"}}><div style={{fontSize:19,fontWeight:700,color:tc&&tc<0?C.g:C.r}}>{tc?`${tc>0?"+":""}${tc}`:"—"}</div><div style={{fontSize:10,color:C.t3,fontWeight:600}}>Total</div></X>
        <X style={{padding:8,textAlign:"center"}}><div style={{fontSize:19,fontWeight:700,color:C.v}}>{entries.length}</div><div style={{fontSize:10,color:C.t3,fontWeight:600}}>Entries</div></X>
      </div>
      {trendWeights&&trendWeights.length>=2?(()=>{
        const rawPts=trendWeights.map(tw=>({v:tw.raw,d:tw.d.slice(5)}));
        const trendPts=trendWeights.map(tw=>({v:tw.v,d:tw.d.slice(5)}));
        const allVals=[...rawPts.map(p=>p.v),...trendPts.map(p=>p.v)];
        const mn=Math.min(...allVals),mx=Math.max(...allVals),rng=mx-mn||1,pad=rng*0.12;
        const w=rawPts.length*32,h=52;
        const toY=v=>h-6-((v-(mn-pad))/(rng+pad*2))*(h-16);
        const rawLine=rawPts.map((p,i)=>`${i*(w/(rawPts.length-1))},${toY(p.v)}`).join(" ");
        const trendLine=trendPts.map((p,i)=>`${i*(w/(trendPts.length-1))},${toY(p.v)}`).join(" ");
        return(
          <X style={{padding:"10px 14px",marginTop:8}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
              <span style={{fontSize:11,fontWeight:600,color:C.t3,letterSpacing:"0.06em"}}>Weight + Trend</span>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <span style={{fontSize:10,color:C.t3}}>· raw</span>
                <span style={{fontSize:10,color:C.g}}>— trend</span>
                <span style={{fontSize:13,fontWeight:700,color:C.g}}>{Math.round(wtTDEE.trendWeight)} lbs</span>
              </div>
            </div>
            <svg viewBox={`0 0 ${w} ${h}`} style={{width:"100%",height:h}} preserveAspectRatio="none">
              <polyline points={rawLine} fill="none" stroke={C.bd} strokeWidth="1" strokeDasharray="3,3" strokeLinecap="round"/>
              {rawPts.map((p,i)=><circle key={i} cx={i*(w/(rawPts.length-1))} cy={toY(p.v)} r="2.5" fill={C.cd} stroke={C.t3} strokeWidth="1"/>)}
              <polyline points={trendLine} fill="none" stroke={C.g} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:C.t3,marginTop:2}}>
              <span>{rawPts[0]?.d}</span><span>{rawPts[rawPts.length-1]?.d}</span>
            </div>
            {wtTDEE.weeklyChange!==0&&(
              <div style={{marginTop:6,fontSize:11,color:wtTDEE.weeklyChange<0?C.g:C.r,fontWeight:600}}>
                Trend: {wtTDEE.weeklyChange>0?"+":""}{Math.round(wtTDEE.weeklyChange)} lbs/wk
              </div>
            )}
          </X>
        );
      })():<Ch data={ch} color={C.p} label="Trend" yUnit=" lbs" empty="Log weight to see trend"/>}
    </S>

    <S title="Weight history" collapsible defaultOpen={false}>
      {entries.slice(0,20).map(([d,w],i)=>{const prev=entries[i+1]?.[1];const diff=prev?Math.round(w-prev):null;
        const del=()=>setDelDate(d);
        return(<div key={d} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${C.bl}`,fontSize:14,alignItems:"center"}}>
          <span style={{color:C.t2}}>{fmt(d)}</span>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontWeight:600,color:C.t}}>{Math.round(w)} {diff!==null&&diff!==0&&<span style={{color:diff>0?C.r:C.g,fontSize:12}}>{diff>0?"+":""}{diff}</span>}</span>
            <button type="button" aria-label="Delete" onClick={del} style={{background:"none",border:"none",color:C.r,fontSize:14,cursor:"pointer",padding:"6px 8px",opacity:0.6}}>✕</button>
          </div>
        </div>);})}
    </S>
  </div>);
};

// ═══ CLOSEOUT PANEL ═══
// "Mark clean day" + compact quick metrics. Lives in the evening/closeout
// surface (Habits tab removed 2026-07-11; same habit record shape is written
// so the weekly analyze payload keeps its input).
const SYSTEM_HABITS=[
  {field:"alcohol",target:false},{field:"cannabis",target:false},{field:"screensOff",target:true},
  {field:"bedBy1030",target:true},{field:"supplements",target:true},{field:"sunlight",target:true},{field:"readBeforeBed",target:true},
];
const CloseoutPanel=({data,setData})=>{
  const t=td();
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
    const rec={...tr,recoveryScore:+f.rs||null,hrv:+f.hrv||null,rhr:+f.rhr||null,sleepHours:+f.sh||null};
    const nd={...data,rec:{...data.rec,[t]:rec},steps:{...data.steps,...(f.steps?{[t]:+f.steps}:{})},wt:{...data.wt,...(f.wt?{[t]:+f.wt}:{})}};
    setData(nd);sv(nd);svSB.recovery(t,rec);if(f.steps)svSB.steps(t,+f.steps);if(f.wt)svSB.weight(t,+f.wt);
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

// ═══ PROGRESS · photos, measurements, weekly AI analysis (mock 6c) ═══
const ProgressView=({data,setData,onBack})=>{
  const t=td();
  const fileRef=useRef(null);
  const [pendingSlot,setPendingSlot]=useState(null);
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState("");
  const slots=data.photoSlots||{};
  const SLOTS=["front","side","back"];
  const daysAgo=d=>d?Math.round((new Date(t+"T12:00:00")-new Date(d+"T12:00:00"))/864e5):null;
  const takePhoto=(slot)=>{setPendingSlot(slot);setErr("");if(fileRef.current)fileRef.current.click();};
  const onFile=async(e)=>{
    const file=e.target.files?.[0];if(!file||!pendingSlot)return;
    setLoading(true);
    try{
      const reader=new FileReader();
      const base64=await new Promise((resolve)=>{reader.onload=()=>resolve(reader.result);reader.readAsDataURL(file);});
      const [header,dataStr]=base64.split(",");
      const mediaType=header.match(/data:(.*?);/)?.[1]||"image/jpeg";
      const prevEntries=Object.entries(data.bodyComp||{}).filter(([d,v])=>d!==t&&v&&typeof v==="object"&&v.analysis).sort((a,b)=>b[0].localeCompare(a[0]));
      const prev=prevEntries[0];
      const context={currentWeight:data.wt[t]||Object.entries(data.wt).sort((a,b)=>b[0].localeCompare(a[0]))[0]?.[1]};
      if(prev){context.previousAssessment=prev[1].analysis;context.previousDate=prev[0];}
      const resp=await fetch("/api/bodycomp",{method:"POST",headers:{"Content-Type":"application/json","x-sync-token":data.settings?.syncToken||""},body:JSON.stringify({image:{mediaType,data:dataStr},context})});
      const result=await resp.json();
      if(resp.ok){
        const nd={...data,bodyComp:{...data.bodyComp,[t]:{photoTaken:true,analysis:result}},photoSlots:{...slots,[pendingSlot]:t}};
        setData(nd);sv(nd);svSB.bodyComp(t,{analysis:result});
      }else setErr(result.error||"Analysis failed");
    }catch(e2){setErr(e2.message);}
    setLoading(false);setPendingSlot(null);if(fileRef.current)fileRef.current.value="";
  };
  const baseMeas=(()=>{const e=Object.entries(data.bodyMeas||{}).filter(([_,v])=>v&&Object.values(v).some(x=>x)).sort((a,b)=>a[0].localeCompare(b[0]));return e.find(([d])=>d>=PROG.start)||e[0]||null;})();
  const curMeas=(()=>{const e=Object.entries(data.bodyMeas||{}).filter(([_,v])=>v&&Object.values(v).some(x=>x)).sort((a,b)=>b[0].localeCompare(a[0]));return e[0]||null;})();
  const arm=m=>m?((m.armL&&m.armR)?(m.armL+m.armR)/2:(m.armL||m.armR||null)):null;
  const MEAS=[{l:"WAIST",cur:curMeas?.[1]?.waist,base:baseMeas?.[1]?.waist,goodDown:true},{l:"CHEST",cur:curMeas?.[1]?.chest,base:baseMeas?.[1]?.chest,goodDown:false},{l:"ARM",cur:arm(curMeas?.[1]),base:arm(baseMeas?.[1]),goodDown:false}];
  const measLine=(()=>{
    const w=MEAS[0],a=MEAS[2];
    if(w.cur==null||w.base==null)return "Log measurements every 2 weeks to see the trend.";
    const wd=w.cur-w.base;const ad=a.cur!=null&&a.base!=null?a.cur-a.base:null;
    if(wd<0&&(ad==null||ad>=-0.2))return "Waist down, arm holding. Fat is leaving. Muscle is not.";
    if(wd<0)return "Waist down. Watch the arm number, protein protects it.";
    return "Waist is holding. The trend chart decides, not one tape day.";
  })();
  const shortDate=d=>fmt(d).toUpperCase().replace(/^[A-Z]+, /,"");
  return(<div style={{display:"flex",flexDirection:"column",gap:10}}>
    <button onClick={onBack} style={{background:"none",border:"none",color:C.p,cursor:"pointer",fontSize:14,fontWeight:700,textAlign:"left",padding:0,fontFamily:"inherit"}}>← Setup</button>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
      <div>
        <div style={{fontSize:26,fontWeight:800,color:C.t,fontFamily:FD,textTransform:"uppercase",letterSpacing:"0.03em",lineHeight:1}}>Progress</div>
        <div style={{fontSize:12,color:C.t3,fontWeight:600,marginTop:3}}>Week {wkn(t)} of {PROG.weeks} · photos every 2 weeks</div>
      </div>
      <button onClick={()=>takePhoto(SLOTS.find(s=>!slots[s]||daysAgo(slots[s])>=14)||"front")} disabled={loading} style={{border:"none",background:C.p,color:C.oa,borderRadius:8,padding:"11px 14px",fontFamily:FD,fontSize:13,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",cursor:"pointer",minHeight:44,opacity:loading?0.5:1}}>{loading?"Analyzing…":"New photos"}</button>
    </div>
    <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{display:"none"}}/>
    {err&&<div style={{fontSize:12,color:C.r}}>{err}</div>}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7}}>
      {SLOTS.map(s=>{const d=slots[s];const due=!d||daysAgo(d)>=14;return(
        <button key={s} onClick={()=>takePhoto(s)} style={{aspectRatio:"3/4",border:due?`1px dashed ${C.p}`:"none",background:due?C.pl:C.bl,borderRadius:10,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,cursor:"pointer"}}>
          <span style={{fontSize:15,fontWeight:800,fontFamily:FD,color:due?C.p:C.t3}}>{due?"DUE":s.toUpperCase()}</span>
          <span style={{fontSize:10,fontWeight:700,fontFamily:FD,color:due?C.p:C.t3}}>{due?(d?"RETAKE":"TODAY"):shortDate(d)}</span>
        </button>);})}
    </div>
    <X style={{padding:"14px 16px"}}>
      <div style={{fontSize:10,fontWeight:700,color:C.t3,letterSpacing:"0.14em",fontFamily:FD}}>MEASUREMENTS{baseMeas?` · VS ${shortDate(baseMeas[0])}`:""}</div>
      {curMeas?(<React.Fragment>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7,marginTop:10}}>
          {MEAS.map(m=>{const d=m.cur!=null&&m.base!=null?m.cur-m.base:null;const good=d!=null&&(m.goodDown?d<0:d>0);return(
            <div key={m.l} style={{background:C.bg,borderRadius:8,padding:"9px 6px",textAlign:"center"}}>
              <div style={{fontSize:17,fontWeight:800,fontFamily:FD,color:C.t}}>{m.cur!=null?`${m.cur.toFixed(1)}"`:"○"}</div>
              <div style={{fontSize:8.5,fontWeight:700,letterSpacing:"0.06em",fontFamily:FD,color:good?C.g:C.t3}}>{m.l}{d!=null?` ${d>0?"+":""}${d.toFixed(1)}`:""}</div>
            </div>);})}
        </div>
        <div style={{fontSize:11.5,lineHeight:1.5,color:C.t3,marginTop:9}}>{measLine}</div>
      </React.Fragment>):(<div style={{fontSize:12,color:C.t3,marginTop:8}}>No measurements yet. Log the first set below.</div>)}
      <S title="Update measurements" collapsible defaultOpen={false}>
        {(()=>{
          const cur=data.bodyMeas&&data.bodyMeas[t]||{};
          const fields=[{k:"chest",l:"Chest"},{k:"waist",l:"Waist"},{k:"armL",l:"Left Arm"},{k:"armR",l:"Right Arm"},{k:"thighL",l:"Left Thigh"},{k:"thighR",l:"Right Thigh"}];
          const saveMeas=(k,v)=>{const nd={...data,bodyMeas:{...data.bodyMeas,[t]:{...(data.bodyMeas[t]||{}),[k]:v?parseFloat(v):null}}};setData(nd);sv(nd);svSB.bodyMeas(t,nd.bodyMeas[t]);};
          return(<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {fields.map(fd=>(<div key={fd.k}><L>{fd.l}</L><N value={cur[fd.k]||""} onChange={v=>saveMeas(fd.k,v)} placeholder="in"/></div>))}
          </div>);
        })()}
      </S>
    </X>
    <X style={{padding:"14px 16px"}}>
      <div style={{fontSize:10,fontWeight:700,color:C.p,letterSpacing:"0.14em",fontFamily:FD}}>WEEK {wkn(t)} AI ANALYSIS</div>
      <AnalysisSection data={data}/>
    </X>
  </div>);
};

// ═══ SETTINGS ═══
const Settings=({data,setData,syncFailures={}})=>{
  const failedTables=Object.keys(syncFailures);
  const hardTables=failedTables.filter(tb=>!syncFailures[tb]?.transient);
  const blipTables=failedTables.filter(tb=>syncFailures[tb]?.transient);
  const syncOk=hardTables.length===0;
  const t=td();
  const st=data.settings||DEFAULTS;
  const [f,setF]=useState({calories:""+st.calories,protein:""+st.protein,water:""+st.water,steps:""+cutStepsTarget(st),sleep:""+st.sleep,fiber:""+(st.fiber||30),
    trainingCal:""+(st.trainingCal||DEFAULTS.trainingCal),wednesdayCal:""+(st.wednesdayCal||DEFAULTS.wednesdayCal),weekendCal:""+(st.weekendCal||DEFAULTS.weekendCal),syncToken:st.syncToken||"",notifyToken:st.notifyToken||""});
  const [saved,setSaved]=useState(false);
  const [editTargets,setEditTargets]=useState(false);
  const [showProgress,setShowProgress]=useState(false);
  useBackClose(showProgress,()=>setShowProgress(false));
  const [showReset,setShowReset]=useState(false);
  const isTravel=!!(data.travelDays||{})[t];
  const lastPhotoDate=(()=>{const e=Object.entries(data.bodyComp||{}).filter(([_,v])=>v).sort((a,b)=>b[0].localeCompare(a[0]));return e[0]?.[0]||null;})();
  const lastPhotoLine=lastPhotoDate?`Last photos ${fmt(lastPhotoDate)}`:"No photos yet · first set is due";
  const integrations=(()=>{
    const lastNut=Object.keys(data.nut||{}).sort().reverse()[0]||null;
    const lastRecRow=Object.entries(data.rec||{}).filter(([_,v])=>v&&v.recoveryScore!=null).sort((a,b)=>b[0].localeCompare(a[0]))[0]||null;
    const lastSteps=Object.keys(data.steps||{}).sort().reverse()[0]||null;
    const daysAgo=d=>d?Math.round((new Date(t+"T12:00:00")-new Date(d+"T12:00:00"))/864e5):null;
    const pushOn=typeof Notification!=="undefined"&&Notification.permission==="granted"&&(data.settings.notifications||{}).enabled;
    return[
      {name:"Cronometer",dot:lastNut&&daysAgo(lastNut)<=1?C.g:C.t3,status:lastNut?`SYNCED ${fmt(lastNut).toUpperCase()}`:"NO DATA"},
      {name:"Oura",dot:lastRecRow&&daysAgo(lastRecRow[0])<=1?C.g:C.t3,status:lastRecRow?(daysAgo(lastRecRow[0])<=1?`SYNCED ${fmt(lastRecRow[0]).toUpperCase()}`:`LAST WORN ${fmt(lastRecRow[0]).toUpperCase()}`):"NO DATA"},
      {name:"HAE · steps & weight",dot:lastSteps&&daysAgo(lastSteps)<=1?C.g:C.t3,status:lastSteps?`LAST ${fmt(lastSteps).toUpperCase()}`:"NO DATA"},
      syncOk?{name:"Supabase sync",dot:C.g,status:blipTables.length?`OK · ${blipTables.length} DROPPED, RETRYING`:"ALL WRITES OK"}:{name:"Supabase sync",dot:C.r,status:`${hardTables[0].toUpperCase()} · MIGRATION`},
      {name:"Push notifications",dot:pushOn?C.g:C.t3,status:pushOn?"REST TIMERS ON":"OFF"},
    ];
  })();

  const toggleTravel=()=>{
    const newVal=!isTravel;
    const nd={...data,travelDays:{...data.travelDays,[t]:newVal}};
    setData(nd);sv(nd);svSB.travelDay(t,newVal);
  };
  if(showProgress)return(<ProgressView data={data} setData={setData} onBack={()=>setShowProgress(false)}/>);

  const saveSettings=()=>{
    // Spread existing settings first so fields not managed by this form
    // (customHabits, reminders, notifications) survive a save.
    const nd={...data,settings:{...DEFAULTS,...data.settings,
      calories:+f.calories||DEFAULTS.calories,protein:+f.protein||DEFAULTS.protein,
      water:+f.water||DEFAULTS.water,steps:+f.steps||DEFAULTS.steps,sleep:+f.sleep||DEFAULTS.sleep,fiber:+f.fiber||DEFAULTS.fiber,
      trainingCal:+f.trainingCal||DEFAULTS.trainingCal,wednesdayCal:+f.wednesdayCal||DEFAULTS.wednesdayCal,weekendCal:+f.weekendCal||DEFAULTS.weekendCal,
      syncToken:f.syncToken||"",notifyToken:f.notifyToken||""}};
    setData(nd);sv(nd);svSB.settings(nd.settings);setSaved(true);setTimeout(()=>setSaved(false),2000);
  };

  const exportData=()=>{
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download=`health-hub-export-${td()}.json`;
    document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
  };
  return(<div style={{display:"flex",flexDirection:"column",gap:8}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
      <div style={{fontSize:26,fontWeight:800,color:C.t,fontFamily:FD,textTransform:"uppercase",letterSpacing:"0.03em",lineHeight:1}}>Setup</div>
      <div title={syncOk?"All cloud writes ok this session":`Sync failed: ${failedTables.join(", ")}`}
        style={{display:"flex",alignItems:"center",gap:6,fontSize:11,fontWeight:700,color:syncOk?C.g:C.r}}>
        <span style={{width:10,height:10,borderRadius:5,background:syncOk?C.g:C.r,display:"inline-block"}}/>
        {syncOk?"Sync ok":"Sync failing"}
      </div>
    </div>
    <X style={{padding:"14px 16px"}}>
      <div style={{fontSize:10,fontWeight:700,color:C.t3,letterSpacing:"0.14em",fontFamily:FD}}>TARGETS & DAY TYPES</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7,marginTop:10}}>
        {[{v:(+f.trainingCal||2000).toLocaleString(),l:"TRAIN CAL"},{v:`${f.protein||200}g`,l:"PROTEIN"},{v:f.water||128,l:"WATER OZ"},{v:`${Math.round((+f.steps||15000)/1000)}k`,l:"STEPS"},{v:"0",l:"WED FAST",ember:true},{v:`${(((+f.weekendCal||1800)+100)/1000).toFixed(1)}/${(((+f.weekendCal||1800)-100)/1000).toFixed(1)}k`,l:"SAT/SUN"}].map(x=>(
          <button key={x.l} onClick={()=>setEditTargets(v=>!v)} style={{background:x.ember?C.pl:C.bg,border:"none",borderRadius:8,padding:"9px 6px",textAlign:"center",cursor:"pointer"}}>
            <div style={{fontSize:17,fontWeight:800,fontFamily:FD,color:x.ember?C.p:C.t}}>{x.v}</div>
            <div style={{fontSize:8.5,fontWeight:700,letterSpacing:"0.06em",fontFamily:FD,color:x.ember?C.p:C.t3}}>{x.l}</div>
          </button>))}
      </div>
      <div style={{fontSize:11,color:C.t3,marginTop:8}}>tap any tile to edit · day types drive Food and the fast clock</div>
    </X>
    <div onClick={()=>setShowProgress(true)} style={{background:C.cd,border:`1px solid ${C.p}`,borderRadius:12,padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}}>
      <div>
        <div style={{fontSize:10,fontWeight:700,color:C.p,letterSpacing:"0.14em",fontFamily:FD}}>PROGRESS</div>
        <div style={{fontSize:14,fontWeight:700,color:C.t,marginTop:3}}>Photos · measurements · weekly AI analysis</div>
        <div style={{fontSize:11.5,color:C.t3,marginTop:2}}>{lastPhotoLine}</div>
      </div>
      <div style={{fontSize:18,fontWeight:800,color:C.p,fontFamily:FD}}>→</div>
    </div>
    <X style={{padding:"6px 0"}}>
      {integrations.map((r,i)=>(
        <div key={r.name} style={{padding:"10px 16px",display:"flex",alignItems:"center",gap:10,borderBottom:i<integrations.length-1?`1px solid ${C.bg}`:"none"}}>
          <span style={{width:8,height:8,borderRadius:4,background:r.dot,flexShrink:0}}/>
          <span style={{fontSize:13,fontWeight:600,color:C.t,flex:1}}>{r.name}</span>
          <span style={{fontSize:11,fontWeight:700,fontFamily:FD,color:r.dot===C.r?C.r:C.t3}}>{r.status}</span>
        </div>))}
    </X>
    {!syncOk&&(
      <X style={{padding:10,borderLeft:`3px solid ${C.r}`}}>
        <div style={{fontSize:11,fontWeight:800,color:C.r,marginBottom:4}}>Cloud sync errors this session</div>
        {hardTables.map(tb=>(
          <div key={tb} style={{fontSize:11,color:C.t2,padding:"2px 0",fontFamily:"monospace",wordBreak:"break-word"}}>
            <b style={{color:C.t}}>{tb}</b> ×{syncFailures[tb]?.n||1} · {syncFailures[tb]?.msg||"unknown"}
          </div>
        ))}
        <div style={{fontSize:11,color:C.t3,marginTop:4}}>A message naming a missing column means a migration in /supabase/ hasn't been run yet.</div>
      </X>
    )}
    {blipTables.length>0&&(
      <div style={{fontSize:11,color:C.t3,padding:"0 2px"}}>
        Dropped requests this session (auto-retried, cleared on the next successful write): {blipTables.map(tb=>`${tb} ×${syncFailures[tb]?.n||1}`).join(" · ")}
      </div>
    )}

    {editTargets&&<X style={{borderLeft:`3px solid ${C.bd}`}}>
      <div style={{fontSize:14,fontWeight:700,color:C.t,marginBottom:8}}>Daily Targets</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <div><L>Avg Calories</L><N value={f.calories} onChange={v=>setF({...f,calories:v})} placeholder="1790"/></div>
        <div><L>Protein (g)</L><N value={f.protein} onChange={v=>setF({...f,protein:v})} placeholder="200"/></div>
        <div><L>Water (oz)</L><N value={f.water} onChange={v=>setF({...f,water:v})} placeholder="128"/></div>
        <div><L>Steps</L><N value={f.steps} onChange={v=>setF({...f,steps:v})} placeholder="15000"/></div>
        <div><L>Sleep (hrs)</L><N value={f.sleep} onChange={v=>setF({...f,sleep:v})} placeholder="7.5"/></div>
        <div><L>Fiber (g)</L><N value={f.fiber} onChange={v=>setF({...f,fiber:v})} placeholder="30"/></div>
      </div>
      <div style={{fontSize:12,fontWeight:700,color:C.t2,marginTop:10,marginBottom:4}}>Day-Type Calorie Targets</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
        <div><L>Training</L><N value={f.trainingCal} onChange={v=>setF({...f,trainingCal:v})} placeholder="2000"/></div>
        <div><L>Wednesday</L><N value={f.wednesdayCal} onChange={v=>setF({...f,wednesdayCal:v})} placeholder="900"/></div>
        <div><L>Weekend avg</L><N value={f.weekendCal} onChange={v=>setF({...f,weekendCal:v})} placeholder="1800"/></div>
      </div>
      <div style={{fontSize:11,color:C.t3,marginTop:4}}>Weekend splits Sat +100 / Sun −100 around the average.</div>
      <B full style={{marginTop:10}} onClick={saveSettings} color={saved?C.g:C.p}>{saved?"Saved!":"Save Targets"}</B>
    </X>}

    {/* ═══ NOTIFICATIONS ═══ */}
    <S title="Notifications">
      <X style={{padding:10}}>
        {typeof Notification!=="undefined"&&Notification.permission==="denied"?(
          <div style={{fontSize:12,color:C.r}}>Notifications blocked. Enable in browser settings.</div>
        ):(
          <>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <span style={{fontSize:14,fontWeight:600,color:C.t}}>Enable Notifications</span>
              <button onClick={async()=>{
                const ns=data.settings.notifications||{};
                if(!ns.enabled){
                  const ok=await ensureNotificationPermission();
                  if(!ok)return;
                  notifyDevice("Health Hub notifications on",{body:"Timer alerts are enabled.",tag:"notification-test",requireInteraction:false});
                  scheduleServerPush({title:"Health Hub push test",body:"Server push is enabled for closed-app rest timers.",tag:"server-push-test",dueAt:Date.now()+5000,url:"/"});
                }
                const nextNotifications={...ns,enabled:!ns.enabled};
                saveNotificationSettings(nextNotifications);
                const nd={...data,settings:{...data.settings,notifications:nextNotifications}};
                setData(nd);sv(nd);svSB.settings(nd.settings);
              }} style={{padding:"6px 16px",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
                border:`1px solid ${(data.settings.notifications||{}).enabled?C.g:C.bd}`,
                background:(data.settings.notifications||{}).enabled?C.gl:"transparent",
                color:(data.settings.notifications||{}).enabled?C.g:C.t3}}>
                {(data.settings.notifications||{}).enabled?"On":"Off"}
              </button>
            </div>
            {(data.settings.notifications||{}).enabled&&(
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                {[{key:"restTimer",label:"Rest timer complete"},{key:"timers",label:"All workout timers"},{key:"sound",label:"Sound when the app is open"},{key:"vibrate",label:"Vibration"}].map(n=>{
                  const ns=data.settings.notifications||{};
                  const on=ns[n.key]!==false;
                  return(<div key={n.key} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:`1px solid ${C.bl}`}}>
                    <span style={{fontSize:12,color:C.t}}>{n.label}</span>
                    <button onClick={()=>{
                      const nextNotifications={...ns,[n.key]:!on};
                      saveNotificationSettings(nextNotifications);
                      const nd={...data,settings:{...data.settings,notifications:nextNotifications}};
                      setData(nd);sv(nd);svSB.settings(nd.settings);
                    }} style={{padding:"3px 10px",borderRadius:6,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
                      border:`1px solid ${on?C.g:C.bd}`,background:on?C.gl:"transparent",color:on?C.g:C.t3}}>
                      {on?"On":"Off"}
                    </button>
                  </div>);
                })}
              </div>
            )}
            {(data.settings.notifications||{}).enabled&&(
              <div style={{display:"flex",gap:6,marginTop:8}}>
                <B small outline onClick={()=>{notifyDevice("Health Hub test",{body:"Notifications reach this phone.",tag:"notification-test",requireInteraction:false});}}>Test now</B>
                <B small outline onClick={()=>{scheduleServerPush({title:"Health Hub push test",body:"Closed-app push works. Rest timers will reach you.",tag:"server-push-test",dueAt:Date.now()+8000,url:"/"}).then(ok=>{if(!ok)notifyDevice("Server push unavailable",{body:"VAPID keys or the push token are missing. Rest alerts fire only while the app is open.",tag:"server-push-test",requireInteraction:false});});}}>Test closed-app push in 8s</B>
              </div>
            )}
            {(data.settings.notifications||{}).enabled&&(
              <div style={{marginTop:8}}>
                <L>Push token</L>
                <input value={f.notifyToken} onChange={e=>setF({...f,notifyToken:e.target.value})} placeholder="Same value as Vercel env NOTIFY_TOKEN"
                  style={{width:"100%",padding:"8px 10px",border:`1px solid ${C.bd}`,borderRadius:6,fontSize:13,fontFamily:"inherit",background:C.cd,color:C.t,boxSizing:"border-box"}}/>
                <div style={{fontSize:11,color:C.t3,marginTop:3}}>Authorizes closed-app rest-timer push. Saved with Save Targets.</div>
              </div>
            )}
          </>
        )}
      </X>
    </S>

    {/* ═══ HEALTH SYNC ═══ */}
    <X style={{borderLeft:`3px solid ${C.bd}`}}>
      <div style={{fontSize:14,fontWeight:700,color:C.t,marginBottom:4}}>Steps + Weight Sync (via Apple Health)</div>
      <div style={{fontSize:12,color:C.t3,marginBottom:8}}>Food comes from Cronometer automatically (nightly). Steps and weight sync via Apple Shortcut. Set the same token in Vercel env var SYNC_TOKEN.</div>
      <div><L>Sync Token</L><input value={f.syncToken} onChange={e=>setF({...f,syncToken:e.target.value})} placeholder="Set a secret token"
        style={{width:"100%",padding:"8px 10px",border:`1px solid ${C.bd}`,borderRadius:6,fontSize:13,fontFamily:"inherit",background:C.cd,color:C.t,boxSizing:"border-box"}}/></div>
      <div style={{marginTop:8,padding:8,background:C.pl,borderRadius:6,fontSize:11,color:C.t2,lineHeight:1.6,border:`1px solid ${C.p}`}}>
        <div style={{fontWeight:700,marginBottom:4,color:C.p}}>Steps + Weight Shortcuts:</div>
        Steps: sum today's Step Count samples, round to a whole number, then call:<br/>
        <span style={{fontFamily:"monospace",fontSize:10,wordBreak:"break-all",display:"block",marginTop:4,padding:"4px 6px",background:C.cd,borderRadius:6,border:`1px solid ${C.bd}`}}>
          https://your-domain.vercel.app/api/sync-steps?token=YOUR_TOKEN&amp;date=YYYY-MM-DD&amp;steps=STEP_SUM
        </span>
        Weight: use latest Body Mass, convert to pounds, then call:<br/>
        <span style={{fontFamily:"monospace",fontSize:10,wordBreak:"break-all",display:"block",marginTop:4,padding:"4px 6px",background:C.cd,borderRadius:6,border:`1px solid ${C.bd}`}}>
          https://your-domain.vercel.app/api/sync-weight?token=YOUR_TOKEN&amp;date=YYYY-MM-DD&amp;weight=WEIGHT_LBS
        </span>
      </div>
    </X>

    {/* ═══ TRAVEL DAY ═══ */}
    <X style={{borderLeft:`3px solid ${C.bd}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:14,fontWeight:700,color:C.t}}>Travel Day</div>
          <div style={{fontSize:12,color:C.t3}}>Toggle for travel/social weekends</div>
        </div>
        <button onClick={toggleTravel} style={{padding:"8px 16px",borderRadius:6,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
          background:isTravel?C.pl:"transparent",border:`1px solid ${isTravel?C.p:C.bd}`,color:isTravel?C.p:C.t3}}>{isTravel?"ON":"OFF"}</button>
      </div>
      {isTravel&&(<div style={{marginTop:8,padding:8,background:C.bg,borderRadius:8}}>
        <div style={{fontSize:11,fontWeight:700,color:C.t,marginBottom:4}}>Travel Protocol</div>
        <div style={{fontSize:12,color:C.t2,lineHeight:1.6}}>
          • Hydrate aggressively: 20-32 oz water + electrolytes before bed<br/>
          • Take magnesium glycinate regardless of time<br/>
          • Skip melatonin if drinking<br/>
          • Wake at 6 AM · get sunlight immediately<br/>
          • Prioritize protein when eating. Light movement &gt; nothing<br/>
          • Don't nap past 1 PM. Normal bedtime that night.
        </div>
      </div>)}
    </X>

    {/* ═══ TDEE CALIBRATION ═══ */}
    {(()=>{
      const tc=data.tdeeCal||{};
      const saveCal=(patch)=>{const nd={...data,tdeeCal:{...tc,...patch,answered:true}};setData(nd);sv(nd);};
      const btn=(active)=>({padding:"7px 10px",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",
        background:active?C.pl:"transparent",border:`1px solid ${active?C.p:C.bd}`,color:active?C.p:C.t3});
      return(
      <X style={{borderLeft:`3px solid ${C.bd}`}}>
        <div style={{fontSize:14,fontWeight:700,color:C.t}}>TDEE Calibration</div>
        <div style={{fontSize:12,color:C.t3,marginBottom:10}}>Three answers make the TDEE range much tighter on days you don't log.</div>
        <div style={{fontSize:12,fontWeight:600,color:C.t2,marginBottom:4}}>When you don't log food, it's usually…</div>
        <div style={{display:"flex",gap:6,marginBottom:10}}>
          <button style={btn(tc.unloggedIs==="normal")} onClick={()=>saveCal({unloggedIs:"normal"})}>A normal day</button>
          <button style={btn(tc.unloggedIs==="blowup")} onClick={()=>saveCal({unloggedIs:"blowup"})}>A blow-up</button>
          <button style={btn(tc.unloggedIs==="mixed")} onClick={()=>saveCal({unloggedIs:"mixed"})}>Weekends blow up</button>
        </div>
        {(tc.unloggedIs==="blowup"||tc.unloggedIs==="mixed")&&(<>
          <div style={{fontSize:12,fontWeight:600,color:C.t2,marginBottom:4}}>Typical blow-up day total (food + drinks)</div>
          <div style={{display:"flex",gap:6,marginBottom:10}}>
            {[2500,3000,3500,4000].map(v=>(
              <button key={v} style={btn((tc.socialCal||3000)===v)} onClick={()=>saveCal({socialCal:v})}>{v.toLocaleString()}</button>
            ))}
          </div>
        </>)}
        <div style={{fontSize:12,fontWeight:600,color:C.t2,marginBottom:4}}>Does the Wednesday fast ever slip?</div>
        <div style={{display:"flex",gap:6}}>
          <button style={btn(tc.fastSlips===false)} onClick={()=>saveCal({fastSlips:false})}>Holds</button>
          <button style={btn(tc.fastSlips===true)} onClick={()=>saveCal({fastSlips:true})}>Sometimes slips</button>
        </div>
        {tc.answered&&<div style={{fontSize:11,color:C.g,marginTop:8}}>Calibrated · the TDEE estimate now uses these answers.</div>}
      </X>);
    })()}

    {(data.coachLog||[]).length>0&&(
      <S title="Coach changes" collapsible defaultOpen={false}>
        <X style={{padding:"4px 12px"}}>
          {(data.coachLog||[]).slice(0,12).map((c,i)=>(
            <div key={c.id||i} style={{padding:"8px 0",borderTop:i>0?`1px solid ${C.bl}`:"none"}}>
              <div style={{display:"flex",justifyContent:"space-between",gap:8}}>
                <span style={{fontSize:13,fontWeight:700,color:c.applied?C.t:C.r}}>{c.summary||`${c.type}${c.action?` · ${c.action}`:""}`}</span>
                <span style={{fontSize:10,fontWeight:700,color:C.t3,fontFamily:FD,whiteSpace:"nowrap"}}>{c.at?fmt(String(c.at).slice(0,10)).toUpperCase():""}</span>
              </div>
              {c.reason&&<div style={{fontSize:12,color:C.t2,marginTop:2}}>{c.reason}</div>}
            </div>))}
        </X>
      </S>
    )}
    <X>
      <div style={{fontSize:14,fontWeight:700,color:C.t,marginBottom:8}}>Data</div>
      <div style={{display:"flex",gap:6}}>
        <B full outline onClick={exportData}>Export Data (JSON)</B>
      </div>
      <div style={{fontSize:11,color:C.t3,marginTop:6}}>Download all your health data as a JSON file for backup.</div>
      <S title="Admin data tools" collapsible defaultOpen={false}>
        {showReset&&<ConfirmModal title="Erase everything?" message="Every table on this phone and in Supabase is wiped. There is no undo. Export first." confirmText="Erase all" confirmColor={C.r} onCancel={()=>setShowReset(false)} onConfirm={async()=>{setShowReset(false);const nd=bl();setData(nd);sv(nd);const tables=["weight","steps","water","recovery","habits","workouts","nutrition","progression","mobility","stepper","debrief","cardio","body_comp","travel_days","settings","program"];for(const t of tables){await sb.deleteAll(t);}}}/>}
        <button type="button" onClick={()=>setShowReset(true)}
          style={{background:"none",border:"none",color:C.r,cursor:"pointer",fontSize:11,fontFamily:"inherit",marginTop:4,opacity:0.7,padding:"6px 0"}}>
          Reset All Data
        </button>
      </S>
    </X>

    <X>
      <div style={{fontSize:14,fontWeight:700,color:C.t,marginBottom:4}}>Program</div>
      <div style={{fontSize:13,color:C.t2}}>{PROG.name}</div>
      <div style={{fontSize:12,color:C.t3}}>Week {wkn(td())}/{PROG.weeks} · {fmt(PROG.start)} → {fmt(PROG.end)}</div>
      <div style={{fontSize:12,color:C.t3}}>~{PROG.startWeight} → under {PROG.targetWeight} lbs · Checkpoint week {PROG.checkpoint.week} ({fmt(PROG.checkpoint.date)})</div>
    </X>

    <div style={{textAlign:"center",padding:"12px 0",fontSize:11,color:C.t3,opacity:0.6,fontFamily:FD,letterSpacing:"0.06em"}}>HEALTH HUB · BUILD {APP_VERSION}{isStandalone()?" · INSTALLED":""}</div>
  </div>);
};

// ═══ TOAST ═══
const ToastStack=({toasts,dismiss})=>{
  if(!toasts.length)return null;
  return(<Portal><div role="status" aria-live="polite" style={{position:"fixed",bottom:"calc(var(--tabbar-h) + var(--safe-b) + 10px)",left:"50%",transform:"translateX(-50%)",zIndex:9999,display:"flex",flexDirection:"column",gap:6,maxWidth:440,width:"92%",pointerEvents:"none"}}>
    {toasts.map(t=>(<div key={t.id} className="hh-toast" onClick={()=>{if(t.action){t.action.fn();}dismiss(t.id);}} style={{pointerEvents:"auto",background:t.type==="success"?C.g:t.type==="error"?C.r:C.t,color:C.oa,padding:"11px 14px",borderRadius:9,fontSize:13,fontWeight:600,boxShadow:C.sh,display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,cursor:"pointer"}}>
      <span>{t.message}</span>
      {t.action&&<span style={{fontFamily:FD,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.06em",fontSize:12,whiteSpace:"nowrap",borderBottom:"1px solid var(--on-accent-line)"}}>{t.action.label}</span>}
    </div>))}
  </div></Portal>);
};

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
        {(allergies?.summary||[]).slice(0,3).length?(allergies.summary.slice(0,3).map(a=>`${a.name} ${a.level||"—"}`).join(" · ")):allergyErr||"Loading…"}
      </div>
    </X>
    <button type="button" onClick={()=>setShowClassic(true)} style={{background:"none",border:`1px solid ${C.bd}`,borderRadius:8,color:C.t2,fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:FD,textTransform:"uppercase",letterSpacing:"0.08em",minHeight:40}}>Full dashboard</button>
  </div>);
};

// ═══ APP ═══
const TabPane=({active,children})=>{
  // Keep-alive: a tab mounts on first visit and then stays mounted (hidden), so
  // stretch/cardio/rest timers keep running while you glance at Food or Scale.
  const visited=useRef(false);if(active)visited.current=true;
  if(!visited.current)return null;
  return <div hidden={!active} className={active?"hh-fade":undefined}>{children}</div>;
};
window.App = function App(){
  const [tab,setTabRaw]=useState(()=>{try{const v=new URLSearchParams(location.search).get("tab");return TABS.some(x=>x.id===v)?v:"dashboard";}catch{return "dashboard";}});
  const scrollPos=useRef({});
  const setTab=useCallback((next)=>{setTabRaw(prev=>{if(prev===next)return prev;scrollPos.current[prev]=window.scrollY;return next;});},[]);
  useEffect(()=>{window.scrollTo(0,scrollPos.current[tab]||0);},[tab]);
  const [data,setData]=useState(()=>{const raw=ld();return seedHistorical(raw?migrate(raw):bl());});
  const [workout,setWorkoutRaw]=useState(()=>{try{const w=localStorage.getItem("dhub6_workout");return w?JSON.parse(w):null;}catch{return null;}});
  const setWorkout=(v)=>{setWorkoutRaw(prev=>{const next=typeof v==="function"?v(prev):v;try{if(next)localStorage.setItem("dhub6_workout",JSON.stringify(next));else localStorage.removeItem("dhub6_workout");}catch{}return next;});};
  const [syncStatus,setSyncStatus]=useState("");
  const [toasts,setToasts]=useState([]);
  const [syncFailures,setSyncFailures]=useState({});
  const dismissToast=useCallback((id)=>setToasts(p=>p.filter(t=>t.id!==id)),[]);
  const addToast=useCallback((message,type="info",action=null)=>{
    const id=Date.now()+Math.random();
    setToasts(p=>[...p.filter(t=>t.message!==message).slice(-2),{id,message,type,action}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),action?8000:3500);
  },[]);
  useEffect(()=>onSyncFailure((table,first)=>{
    setSyncFailures({...syncHealth.failures});
    const f=syncHealth.failures[table];
    if(first&&f&&!f.transient)addToast(`Sync failed: ${table} · not backed up`,"error");
  }),[addToast]);

  useEffect(()=>{
    (async()=>{
      const sbData=await loadFromSB();
      let finalData;
      if(sbData){
        const local=ld();
        if(local){
          const merged=migrate(local);
          const final={...merged};
          // Smart merge: Supabase wins for date-keyed data (external syncs like Oura/Cronometer
          // write directly to Supabase, so it is always authoritative). Local-only dates
          // (offline entries not yet in Supabase) are preserved because sbData won't have that key.
          const dateKeyed=new Set(["wt","nut","wk","rec","steps","water","habits","mob","stp","debrief","cardio","bodyComp","bodyMeas","lytes","travelDays","tdeeExclude"]);
          Object.keys(sbData).forEach(k=>{
            if(dateKeyed.has(k)&&typeof sbData[k]==="object"&&!Array.isArray(sbData[k])&&sbData[k]!==null){
              // For date-keyed data: start with local, then overlay Supabase (Supabase wins)
              final[k]={...merged[k],...sbData[k]};
            }else if(k==="prog"&&typeof sbData[k]==="object"&&sbData[k]!==null){
              // Progression: local wins (most recent workout actions)
              final[k]={...sbData[k],...merged[k]};
            }else if(typeof sbData[k]==="object"&&!Array.isArray(sbData[k])&&sbData[k]!==null){
              final[k]={...merged[k],...sbData[k]};
            }else if(Array.isArray(sbData[k])&&sbData[k].length>0){
              final[k]=sbData[k];
            }else if(sbData[k]&&(!merged[k]||Object.keys(merged[k]).length===0)){
              final[k]=sbData[k];
            }
          });
          finalData=final;
          const localHasData=Object.keys(merged.wk).length>0||Object.keys(merged.wt).length>0||Object.keys(merged.nut).length>0;
          const sbEmpty=Object.keys(sbData.wk).length===0&&Object.keys(sbData.wt).length===0;
          if(localHasData&&sbEmpty){
            setSyncStatus("Cloud is empty or unreachable · showing this phone's copy");
            setTimeout(()=>setSyncStatus(""),4000);
          }
        }else{
          finalData=sbData;
        }
      }else{
        finalData=data;
      }
      // Browser boot is read-only: pending program updates and migrations require approved maintenance.
      const updated=finalData;
      backfillData(updated);repairDeloadProgression(updated);
      // Block v2 and progression pruning normalize local render state only; they must not write on view.
      applyBlockV2(updated);
      const pruned=pruneProgression(updated);
      setData(updated);sv(updated);
      if(pruned)console.log(`[prune] Local-only cleanup removed ${pruned} orphaned lift record${pruned===1?"":"s"}`);
      // Coach changes (Claude.ai via /api/mcp, or /api/update) are applied server-side;
      // surface anything new since the last launch, once.
      try{
        const log=(updated.coachLog||[]).filter(c=>c.applied&&c.at);
        const seen=localStorage.getItem("dhub6_coach_seen");
        if(log.length){
          if(seen){log.filter(c=>c.at>seen).slice(0,3).forEach(c=>addToast(`Coach · ${c.summary||c.type}${c.reason?` · ${c.reason}`:""}`,"info",{label:"Setup",fn:()=>setTab("settings")}));}
          localStorage.setItem("dhub6_coach_seen",log[0].at);
        }
      }catch{}
    })();
    // Service worker: offline shell + push display. A new build activates on the
    // next launch; mid-session we only offer a reload so a workout is never cut.
    if('serviceWorker' in navigator){
      const hadController=!!navigator.serviceWorker.controller;
      navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).then(r=>{r.update().catch(()=>{});}).catch(()=>{});
      navigator.serviceWorker.addEventListener('controllerchange',()=>{if(hadController)addToast("Health Hub updated","info",{label:"Reload",fn:()=>location.reload()});});
      navigator.serviceWorker.addEventListener('message',(e)=>{const m=e.data||{};if(m.type==="NAVIGATE"&&m.tab)setTab(m.tab);});
    }
  },[]);

  // Persist: every mutation already writes through sv(); this is the safety net,
  // debounced so a burst of taps serializes once, flushed the moment the app hides.
  const dataRef=useRef(data);dataRef.current=data;
  const saveTimer=useRef(null);
  useEffect(()=>{clearTimeout(saveTimer.current);saveTimer.current=setTimeout(()=>sv(dataRef.current),400);return()=>clearTimeout(saveTimer.current);},[data]);
  useEffect(()=>{const flush=()=>{if(document.visibilityState==="hidden"){clearTimeout(saveTimer.current);sv(dataRef.current);}};
    document.addEventListener("visibilitychange",flush);window.addEventListener("pagehide",flush);
    return()=>{document.removeEventListener("visibilitychange",flush);window.removeEventListener("pagehide",flush);};},[]);

  // Browser self-heal must not perform full-object writes on foreground/online.
  // Failed targeted writes remain visible in Setup via syncFailures; retry happens
  // through the next explicit user action for that table.

  return(
    <div style={{background:C.bg,color:C.t,minHeight:"100dvh",fontFamily:"'Barlow',-apple-system,BlinkMacSystemFont,sans-serif",display:"flex",flexDirection:"column",maxWidth:520,margin:"0 auto"}}>
      {syncStatus&&<div style={{background:C.pl,padding:"6px 14px",fontSize:12,color:C.p,fontWeight:600,textAlign:"center"}}>{syncStatus}</div>}
      {workout&&tab!=="training"&&<div style={{position:"sticky",top:0,zIndex:90}}><WorkoutTimerBar workout={workout} onTap={()=>setTab("training")} programDays={data.program}/></div>}
      <main style={{flex:1,padding:"16px 14px",paddingBottom:"calc(var(--tabbar-h) + var(--safe-b) + 24px)"}}>
        <TabPane active={tab==="dashboard"}><Moments data={data} setData={setData} setTab={setTab} workout={workout} addToast={addToast}/></TabPane>
        <TabPane active={tab==="training"}><Training data={data} setData={setData} workout={workout} setWorkout={setWorkout} setTab={setTab} addToast={addToast} active={tab==="training"}/></TabPane>
        <TabPane active={tab==="nutrition"}><Nutrition data={data} setData={setData} addToast={addToast}/></TabPane>
        <TabPane active={tab==="weight"}><Weight data={data} setData={setData}/></TabPane>
        <TabPane active={tab==="settings"}><Settings data={data} setData={setData} syncFailures={syncFailures} addToast={addToast}/></TabPane>
      </main>
      <TabBar active={tab} set={setTab} hasActiveWorkout={!!workout}/>
      <ToastStack toasts={toasts} dismiss={dismissToast}/>
    </div>
  );
}

class ErrorBoundary extends React.Component{
  constructor(p){super(p);this.state={err:null};}
  static getDerivedStateFromError(err){return{err};}
  componentDidCatch(err,info){console.error("[ErrorBoundary]",err,info);}
  render(){
    if(!this.state.err)return this.props.children;
    const msg=this.state.err&&(this.state.err.message||String(this.state.err))||"Unknown error";
    return React.createElement("div",{style:{padding:20,maxWidth:480,margin:"40px auto",fontFamily:"'Barlow',sans-serif"}},
      React.createElement("h2",{style:{fontSize:18,fontWeight:700,marginBottom:8}},"Something went wrong"),
      React.createElement("p",{style:{fontSize:14,opacity:.7,marginBottom:14}},"The app hit an error while rendering. Your data is safe — clear the cache and reload."),
      React.createElement("pre",{style:{fontSize:11,padding:10,borderRadius:4,overflow:"auto",whiteSpace:"pre-wrap",border:"1px solid var(--line)",color:"var(--danger)"}},msg),
      React.createElement("button",{onClick:()=>{try{if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister()));}if(window.caches){caches.keys().then(ks=>ks.forEach(k=>caches.delete(k)));}}catch{}setTimeout(()=>location.reload(),300);},
        style:{marginTop:14,padding:"10px 18px",background:"var(--ink)",color:"var(--on-accent)",border:"none",borderRadius:8,fontSize:14,fontWeight:600,cursor:"pointer",textTransform:"uppercase",letterSpacing:"0.04em"}},"Clear cache & reload")
    );
  }
}
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(ErrorBoundary,null,React.createElement(App)));
