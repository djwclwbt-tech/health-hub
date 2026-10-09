const { useState, useEffect, useRef, useCallback } = React;
import { PROG, WU, rrTxt, progKey, saneSet, supersetLabel, EXERCISE_LIBRARY, exLibById, shortLiftName, STRETCH_POSES, CUT_HOLD_PROGRESSION, getProgEntry, CARDIO_PRESETS, CARDIO_TYPES, cardioLabel, intensityLabel, cardioSummary, dw, fmt, wkn, estTime, fmtElapsed, BARBELL_IDS, resolveWeight, swapOptions, buildExerciseEntry, buildSession, manualSlot, sessionCursor, applyWorkout } from "../../lib/engine.mjs";
import { PlateCalc } from "../cards/PlateCalc.jsx";
import { cancelDeviceNotification, haptic, notifyDevice, scheduleDeviceNotification, scheduleServerPush } from "../core/device.js";
import { useToday } from "../core/hooks.js";
import { useBackClose } from "../core/nav.js";
import { getNotificationSettings, REST_TIMER_KEY, sv, svSB } from "../core/storage.js";
import { C, FD } from "../core/theme.js";
import { ExerciseHistory } from "./train/ExerciseHistory.jsx";
import { SwapModal } from "./train/SwapModal.jsx";
import { B, Br, EditableNum, N, S, X } from "../ui/atoms.jsx";
import { ConfirmModal, Portal, Sheet } from "../ui/overlay.jsx";
import { WorkoutTimerBar } from "../ui/shell.jsx";

let restPushWarned=false;
// ═══ TRAINING ═══
const Training=({data,setData,workout,setWorkout,setTab,addToast})=>{
  const t=useToday(),dn=dw(t);
  const [sel,setSel]=useState(dn);
  useEffect(()=>{setSel(dn);},[dn]);
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
  const startCardioTimer=(dur)=>{if(cardioIvRef.current)clearInterval(cardioIvRef.current);const end=Date.now()+dur*60*1000;cardioEndRef.current=end;setCardioTimerLeft(dur*60);setCardioTimerRunning(true);setCardioTimerDone(false);
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
  const startManualW=()=>{setWorkout({day:sel,date:t,manual:true,exercises:[],start:Date.now(),isDeload:false});setWuDone(true);setShowAddEx(true);};
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
  useEffect(()=>()=>{if(mobIvRef.current)clearInterval(mobIvRef.current);if(cardioIvRef.current)clearInterval(cardioIvRef.current);if(stretchIvRef.current)clearInterval(stretchIvRef.current);if(restTimeoutRef.current)clearTimeout(restTimeoutRef.current);},[]);

  const finishWorkout=()=>{
    if(!workout)return;
    const s=sessOf(workout);
    // Log under the day the session started, so a session that crosses midnight
    // (or is finished from a stale tab) cannot overwrite the next day's workout.
    const d=workout.date||t;
    const {data:nd,prs,touched,log}=applyWorkout(data,workout,s,d);
    setData(nd);sv(nd);svSB.workout(d,log);touched.forEach(aid=>svSB.progression(aid,nd.prog[aid]));
    setWorkout(null);clearRestTimer();stopCardioTimer();setCardioTimerDone(false);setShowFinishConfirm(false);
    haptic([40,60,40]);
    setSummary({date:d,name:s?.name||"Session",dur:log.dur,sets:workout.exercises.reduce((a,e)=>a+e.sets.filter(saneSet).length,0),exercises:workout.exercises.filter(e=>e.sets.some(saneSet)).length,volume:log.volume,prs,log});
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
            const groups={};EXERCISE_LIBRARY.filter(o=>!o.off&&!used.has(o.id)).forEach(o=>{(groups[o.region]=groups[o.region]||[]).push(o);});
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

export { Training };
