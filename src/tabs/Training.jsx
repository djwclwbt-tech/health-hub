const { useState, useEffect, useRef, useCallback } = React;
import { liftTarget, PROG, WU, rrTxt, progKey, saneSet, supersetLabel, EXERCISE_LIBRARY, exLibById, shortLiftName, STRETCH_POSES, CUT_HOLD_PROGRESSION, getProgEntry, CARDIO_PRESETS, CARDIO_TYPES, cardioLabel, intensityLabel, cardioSummary, dw, lds, fmt, wkn, estTime, fmtElapsed, BARBELL_IDS, resolveWeight, swapOptions, restFor, buildExerciseEntry, buildSession, manualSlot, sessionCursor, applyWorkout, workoutLabel, exerciseName, cleanDur } from "../../lib/engine.mjs";
import { PlateCalc } from "../cards/PlateCalc.jsx";
import { cancelDeviceNotification, cancelServerPush, haptic, notifyDevice, scheduleDeviceNotification, scheduleServerPush } from "../core/device.js";
import { useToday } from "../core/hooks.js";
import { useBackClose } from "../core/nav.js";
import { getNotificationSettings, REST_TIMER_KEY, sv, svSB } from "../core/storage.js";
import { C, FD } from "../core/theme.js";
import { ExerciseHistory } from "./train/ExerciseHistory.jsx";
import { SwapModal } from "./train/SwapModal.jsx";
import { StretchPlayer } from "./train/StretchPlayer.jsx";
import { B, Br, EditableNum, N, S, X } from "../ui/atoms.jsx";
import { ConfirmModal, Portal, Sheet } from "../ui/overlay.jsx";

let restPushWarned=false;
const AUTO_END_MS=90*6e4;
// ═══ TRAINING ═══
// Train home building blocks (module level so they keep identity across renders).
const NUMS_T={fontVariantNumeric:"tabular-nums"};
const H2=({children,right})=>(<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:28,minHeight:40}}><h2 style={{fontSize:15,fontWeight:500,color:C.t3}}>{children}</h2>{right}</div>);
const Row=({title,sub,right,onClick,last})=>(<div onClick={onClick} role={onClick?"button":undefined} tabIndex={onClick?0:undefined}
        style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,minHeight:56,padding:"10px 0",borderTop:`1px solid ${C.bd}`,borderBottom:last?`1px solid ${C.bd}`:"none",cursor:onClick?"pointer":"default"}}>
        <div style={{minWidth:0}}><div style={{fontSize:17,fontWeight:500,color:C.t}}>{title}</div>{sub&&<div style={{fontSize:15,color:C.t3,marginTop:2,...NUMS_T}}>{sub}</div>}</div>
        <div style={{flexShrink:0,display:"flex",alignItems:"center",gap:4,fontSize:15,color:C.t3,...NUMS_T}}>{right}</div>
      </div>);

// Session clock in the workout header.
const Elapsed=({start})=>{const [now,setNow]=useState(Date.now());useEffect(()=>{const iv=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(iv);},[]);
  return <span style={{fontSize:17,color:C.t2,fontWeight:500,fontVariantNumeric:"tabular-nums"}}>{fmtElapsed(Math.max(0,Math.floor((now-start)/1000)))}</span>;};

const Training=({data,setData,workout,setWorkout,setTab,addToast,active})=>{
  const t=useToday(),dn=dw(t);
  const [sel,setSel]=useState(dn);
  useEffect(()=>{setSel(dn);},[dn]);
  // Train home: the day picked in the week strip (any date), the strip page
  // (0 = this week) and the session picker ({date} or null).
  const [selDate,setSelDate]=useState(t);
  useEffect(()=>{setSelDate(t);},[t]);
  useEffect(()=>{setSel(dw(selDate));},[selDate]);
  const [weekOff,setWeekOff]=useState(0);
  const [picker,setPicker]=useState(null);
  const stripRef=useRef(null);
  useBackClose(!!picker,()=>setPicker(null));
  const [rl,setRl]=useState(0);
  const [rt,setRt]=useState(0);
  const restEndRef=useRef(0);
  const restTimeoutRef=useRef(null);
  const restNotifiedRef=useRef(false);
  const restAudioCtxRef=useRef(null);
  const [showMob,setShowMob]=useState(false);
  const [showCardio,setShowCardio]=useState(false);
  const [cardioType,setCardioType]=useState("incline-walk");
  const [cardioDur,setCardioDur]=useState("20");
  const [cardioIntensity,setCardioIntensity]=useState("zone2");
  const [cardioDistance,setCardioDistance]=useState("");
  const [cardioCals,setCardioCals]=useState("");
  const [cardioNotes,setCardioNotes]=useState("");
  const [cardioHr,setCardioHr]=useState("");
  const [editW,setEditW]=useState(null);
  const mobEntry=data.mob?.[t];
  const mobDone=mobEntry===true||!!mobEntry?.done;
  const setMobDone=()=>{};   // derived from data.mob; writers update data
  const [mobRunning,setMobRunning]=useState(false);
  const [mobTimer,setMobTimer]=useState(0);
  const mobStartRef=useRef(null);
  const mobIvRef=useRef(null);
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
  const cardioRunRef=useRef(false);
  const cardioEndRef=useRef(0);
  const getPostLiftCardio=(day)=>{if(day==="monday"||day==="thursday")return{type:"stairs",label:"Stairstepper",duration:20,intensity:"zone2"};if(day==="tuesday"||day==="friday")return{type:"incline-walk",label:"Incline Walk (10-15%)",duration:20,intensity:"zone2"};if(day==="wednesday")return{type:"stairs",label:"Stairstepper (optional)",duration:20,intensity:"zone2"};return null;};
  const startCardioTimer=(dur)=>{if(cardioIvRef.current)clearInterval(cardioIvRef.current);const end=Date.now()+dur*60*1000;cardioEndRef.current=end;setCardioTimerLeft(dur*60);setCardioTimerRunning(true);setCardioTimerDone(false);
    cardioIvRef.current=setInterval(()=>{const left=Math.round((cardioEndRef.current-Date.now())/1000);if(left<=0){clearInterval(cardioIvRef.current);setCardioTimerLeft(0);setCardioTimerRunning(false);setCardioTimerDone(true);if(navigator.vibrate)navigator.vibrate([200,100,200,100,200]);}else{setCardioTimerLeft(left);}},500);};
  cardioRunRef.current=cardioTimerRunning||cardioTimerDone;
  const stopCardioTimer=()=>{if(cardioIvRef.current)clearInterval(cardioIvRef.current);setCardioTimerRunning(false);setCardioTimerLeft(0);cardioEndRef.current=0;};

  const [showFinishConfirm,setShowFinishConfirm]=useState(false);
  const [showCancelConfirm,setShowCancelConfirm]=useState(false);
  const [swapModal,setSwapModal]=useState(null);
  const [showAddEx,setShowAddEx]=useState(false);
  const [exInfo,setExInfo]=useState(null);          // {ex, progKey} · history sheet
  const [showPlates,setShowPlates]=useState(false);
  const [focusEi,setFocusEi]=useState(null);       // a lift opened by tap; null = follow the cursor
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
  // A backfill is chosen at start, not inferred from the clock, so a session that runs past midnight keeps its timers.
  const isBackfill=w=>!!w&&(w.backfill??(!!w.date&&w.date<lds(new Date(w.start||Date.now()))));

  const getSwapOptions=(slotEx,currentEx)=>swapOptions(data,workout,slotEx,currentEx);

  const isDeload=wkn(t)===PROG.deload;

  // date: the day the log belongs to. Today by default; a past date backfills a
  // missed day (its duration is not recorded, the clock would be meaningless).
  const startW=(day=sel,opts={})=>{const startVariant=opts.variant!==undefined?opts.variant:(activeVariant[day]||null);const startSess=getSess(day,startVariant);if(!startSess)return;
    setWorkout(buildSession(data,day,startSess,{date:opts.date||t,variant:startVariant}));setWuDone(false);setPicker(null);};

  // Manual workout: start empty, add exercises from the library mid-session.
  // Weights come from gw() (progression + history), rest timers work as normal.
  const startManualW=(date=t)=>{setWorkout({day:dw(date),date,backfill:date<t,manual:true,exercises:[],start:Date.now(),isDeload:false});setWuDone(true);setShowAddEx(true);setPicker(null);};
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
    // Blank weight = bodyweight (0). Anything that is not a number is refused, never logged as BW.
    const w=cur.weight===""||cur.weight==null?0:Number(cur.weight);
    if(!Number.isFinite(w)||w<0){if(addToast)addToast("Check the weight before logging the set","error");return;}
    haptic(30);setFocusEi(null);
    setWorkout(p=>{const n=JSON.parse(JSON.stringify(p));const x=n.exercises[ei].sets[si];x.weight=w;x.done=true;x.at=Date.now();return n;});
    if(rest>0&&!isBackfill(workout))startRestTimer(rest);   // no rest timer while backfilling a past day
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
    try{const saved=JSON.parse(localStorage.getItem(REST_TIMER_KEY));if(saved?.tag){cancelDeviceNotification(saved.tag);cancelServerPush(saved.tag);}localStorage.removeItem(REST_TIMER_KEY);}catch{}
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
    if(endTime<=Date.now()+250){try{const sv0=JSON.parse(localStorage.getItem(REST_TIMER_KEY));if(sv0?.tag){cancelDeviceNotification(sv0.tag);cancelServerPush(sv0.tag);}}catch{}completeRestTimer();return;}
    let old=null;try{old=JSON.parse(localStorage.getItem(REST_TIMER_KEY));}catch{}
    const total=Math.max(1,(old?.total||rt||0)+delta);
    const tag=`rest-timer-${endTime}`;
    try{if(old?.tag)cancelDeviceNotification(old.tag);}catch{}
    try{localStorage.setItem(REST_TIMER_KEY,JSON.stringify({endTime,total,startedAt:old?.startedAt||Date.now(),tag}));}catch{}
    // The new alert replaces the old one on the server (latest wins), so only one buzzes.
    // Same opt-in rule as startRestTimer: no push unless rest alerts are on.
    const ns=getNotificationSettings(data.settings?.notifications);
    const pushOk=ns.restTimer!==false&&(ns.enabled||(typeof Notification!=="undefined"&&Notification.permission==="granted"));
    if(pushOk)scheduleServerPush({title:"Rest complete",body:"Next set is ready.",tag,dueAt:endTime,url:"/?tab=training"});
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
      }
    };
    document.addEventListener("visibilitychange",onVis);
    window.addEventListener("focus",onVis);
    return()=>{document.removeEventListener("visibilitychange",onVis);window.removeEventListener("focus",onVis);};
  },[]);
  useEffect(()=>()=>{if(mobIvRef.current)clearInterval(mobIvRef.current);if(cardioIvRef.current)clearInterval(cardioIvRef.current);if(restTimeoutRef.current)clearTimeout(restTimeoutRef.current);},[]);

  const finishWorkout=(opts)=>{
    if(!workout)return;
    const endAt=typeof opts?.endAt==="number"?opts.endAt:Date.now();
    const s=sessOf(workout);
    // Log under the day the session started, so a session that crosses midnight
    // (or is finished from a stale tab) cannot overwrite the next day's workout.
    const d=workout.date||t;
    const {data:nd,prs,touched,log}=applyWorkout(data,workout,s,d,endAt);
    if(isBackfill(workout)){log.dur=null;if(nd.wk?.[d])nd.wk[d]={...nd.wk[d],dur:null};}  // backfilled: no real duration
    // Remember the lift rows this finish replaced, so "Undo today's log" can put them back.
    try{localStorage.setItem("dhub6_undo_prog",JSON.stringify({date:d,rows:Object.fromEntries(touched.map(a=>[a,data.prog?.[a]??null]))}));}catch{}
    setData(nd);sv(nd);svSB.workout(d,log);touched.forEach(aid=>svSB.progression(aid,nd.prog[aid]));
    setWorkout(null);clearRestTimer();stopCardioTimer();setCardioTimerDone(false);setShowFinishConfirm(false);
    haptic([40,60,40]);
    setSummary({date:d,name:s?.name||"Session",dur:log.dur,sets:workout.exercises.reduce((a,e)=>a+e.sets.filter(saneSet).length,0),exercises:workout.exercises.filter(e=>e.sets.some(saneSet)).length,volume:log.volume,prs,log});
  };

  // Forgot to hit Finish: once 90 min have passed since the start and no set was
  // logged in the last 15 min, log it automatically. Duration ends at the last
  // logged set (+2 min), not at whenever the app was reopened.
  useEffect(()=>{
    if(!workout?.start)return;
    const check=()=>{
      const now=Date.now();
      if(now-workout.start<AUTO_END_MS)return;
      if(cardioRunRef.current)return;   // post-lift cardio in progress or not yet logged
      const lastAt=Math.max(0,...workout.exercises.flatMap(e=>(e.sets||[]).filter(x=>x.done&&x.at).map(x=>x.at)));
      if(lastAt&&now-lastAt<15*6e4)return;
      const anyDone=workout.exercises.some(e=>(e.sets||[]).some(saneSet));
      if(!anyDone){cancelWorkout();addToast?.("Workout closed after 90 min. Nothing was logged.","info");return;}
      const endAt=lastAt?Math.min(now,lastAt+2*6e4):workout.start+AUTO_END_MS;
      finishWorkout({endAt});
      addToast?.("Workout ended on its own. Open it to fix anything.","info");
    };
    check();const iv=setInterval(check,60000);
    document.addEventListener("visibilitychange",check);
    return()=>{clearInterval(iv);document.removeEventListener("visibilitychange",check);};
  },[workout,data]);

  const cancelWorkout=()=>{
    setWorkout(null);clearRestTimer();
    stopCardioTimer();setCardioTimerDone(false);setShowCancelConfirm(false);
  };


  const undoCardio=()=>{const nd={...data,cardio:{...data.cardio}};delete nd.cardio[t];setData(nd);sv(nd);svSB.delCardio(t);};
  const applyCardioPreset=p=>{setCardioType(p.type);setCardioDur(String(p.duration));setCardioIntensity(p.intensity||"zone2");};
  const openCardioLog=(preset=null)=>{if(preset)applyCardioPreset(preset);setShowCardio(true);};
  const editCardio=()=>{const c=data.cardio?.[t];if(!c)return;setCardioType(c.type||"incline-walk");setCardioDur(String(c.duration||20));setCardioIntensity(c.intensity||"zone2");
    setCardioDistance(c.distance?String(c.distance):"");setCardioCals(c.calories?String(c.calories):"");
    const m=/^Avg HR (\d+)/.exec(c.notes||"");setCardioHr(c.hr?String(c.hr):m?m[1]:"");setCardioNotes((c.notes||"").replace(/^Avg HR \d+( · )?/,""));setShowCardio(true);};
  const undoWorkout=()=>{const nd={...data,wk:{...data.wk}};delete nd.wk[t];
    // Roll the weights back too, or re-logging would stack a second increase.
    let snap=null;try{snap=JSON.parse(localStorage.getItem("dhub6_undo_prog"));}catch{}
    const back=snap?.date===t?Object.entries(snap.rows||{}).filter(([,r])=>r):[];
    if(back.length){nd.prog={...nd.prog};back.forEach(([a,r])=>{nd.prog[a]=r;});}
    setData(nd);sv(nd);svSB.delWorkout(t);back.forEach(([a,r])=>svSB.progression(a,r));
    try{localStorage.removeItem("dhub6_undo_prog");}catch{}};
  const mobExercises=PROG.mobility._default||[];
  const stretchMins=Math.round(mobExercises.reduce((t,ex)=>t+ex.dur*ex.sets,0)/60);

  const startMob=()=>{const st=Date.now();mobStartRef.current=st;setMobRunning(true);setMobTimer(0);setShowMob(true);
    try{localStorage.setItem("dhub6_mob_active",JSON.stringify({running:true,startedAt:st}));}catch{}
    mobIvRef.current=setInterval(()=>{setMobTimer(Math.floor((Date.now()-mobStartRef.current)/1000));},1000);};

  const skipMob=()=>{if(mobIvRef.current)clearInterval(mobIvRef.current);
    const nd={...data,mob:{...data.mob,[t]:{done:true,skipped:true,dur:0,exercises:0}}};
    setData(nd);sv(nd);svSB.mobility(t,0);
    setMobDone(true);setMobRunning(false);setShowMob(false);localStorage.removeItem("dhub6_mob_active");
  };

  const finishMob=(count)=>{
    if(mobIvRef.current)clearInterval(mobIvRef.current);
    const dur=Math.floor((Date.now()-mobStartRef.current)/1000);
    const nd={...data,mob:{...data.mob,[t]:{done:true,dur,exercises:typeof count==="number"?count:0}}};
    setData(nd);sv(nd);svSB.mobility(t,dur);
    setMobDone(true);setMobRunning(false);setShowMob(false);
    localStorage.removeItem("dhub6_mob_active");
  };
  // Today's stretch buttons set this flag, then switch here: open the player.
  const openStretchRef=useRef(null);openStretchRef.current=()=>{if(mobDone)return;if(!mobRunning)startMob();setShowMob(true);};
  useEffect(()=>{if(!active)return;try{if(sessionStorage.getItem("hh_open_stretch")){sessionStorage.removeItem("hh_open_stretch");openStretchRef.current();}}catch{}},[active]);
  const undoMob=()=>{const nd={...data,mob:{...data.mob}};delete nd.mob[t];setData(nd);sv(nd);svSB.delMobility(t);
    try{localStorage.removeItem("dhub6_mob_active");}catch{}
    setMobDone(false);setMobRunning(false);setShowMob(false);
};
  const logCardio=async(overrides={})=>{
    const hr=cardioHr?Math.round(+cardioHr):null;
    const userNotes=cardioNotes.trim().replace(/^Avg HR \d+( · )?/,"");
    const c={type:overrides.type||cardioType,duration:+(overrides.duration??cardioDur)||20,intensity:overrides.intensity||cardioIntensity,
      distance:cardioDistance?+cardioDistance:null,calories:cardioCals?+cardioCals:null,hr,notes:[hr?`Avg HR ${hr}`:"",userNotes].filter(Boolean).join(" · "),done:true};
    const nd={...data,cardio:{...data.cardio,[t]:c}};setData(nd);sv(nd);
    const saved=await svSB.cardio(t,c);
    if(!saved)addToast?.("Cardio saved locally only · Supabase cardio table/schema needs migration", "warning");
    setShowCardio(false);
    setCardioDistance("");setCardioCals("");setCardioNotes("");setCardioHr("");
  };
  const renderCardioForm=()=>showCardio&&(<div style={{marginTop:10,display:"flex",flexDirection:"column",gap:8}}>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:4}}>
      {CARDIO_PRESETS.map(p=>(<button key={p.type} onClick={()=>applyCardioPreset(p)} style={{
        padding:"7px 4px",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
        border:`1px solid ${cardioType===p.type?C.t:C.bd}`,background:cardioType===p.type?C.bg:C.cd,color:cardioType===p.type?C.t:C.t3}}>{p.label}<br/><span style={{fontWeight:500}}>{p.duration}m</span></button>))}
    </div>
    <div style={{display:"flex",gap:4,overflowX:"auto"}}>
      {CARDIO_TYPES.map(ct=>(<button key={ct} onClick={()=>setCardioType(ct)} style={{
        padding:"6px 9px",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",
        border:`1px solid ${cardioType===ct?C.t:C.bd}`,background:cardioType===ct?C.bg:"transparent",color:cardioType===ct?C.t:C.t3}}>{cardioLabel(ct)}</button>))}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
      <label style={{fontSize:12,color:C.t3,fontWeight:600}}>Duration min<N value={cardioDur} onChange={setCardioDur} placeholder="20"/></label>
      <label style={{fontSize:12,color:C.t3,fontWeight:600}}>Distance mi<N value={cardioDistance} onChange={setCardioDistance} placeholder="optional"/></label>
      <label style={{fontSize:12,color:C.t3,fontWeight:600}}>Avg heart rate<N value={cardioHr} onChange={setCardioHr} placeholder="from Watch" max={230}/></label>
      <label style={{fontSize:12,color:C.t3,fontWeight:600}}>Calories<N value={cardioCals} onChange={setCardioCals} placeholder="optional"/></label>
      <label style={{fontSize:12,color:C.t3,fontWeight:600}}>Intensity
        <select value={cardioIntensity} onChange={e=>setCardioIntensity(e.target.value)} style={{width:"100%",background:C.cd,border:`1px solid ${C.bd}`,borderRadius:6,padding:"8px",fontSize:16,color:C.t,fontFamily:"inherit"}}>
          {["easy","zone2","tempo","hard","hiit"].map(i=><option key={i} value={i}>{intensityLabel(i)}</option>)}
        </select>
      </label>
    </div>
    <input value={cardioNotes} onChange={e=>setCardioNotes(e.target.value)} placeholder="Notes: incline, speed, how it felt..." style={{background:C.cd,border:`1px solid ${C.bd}`,borderRadius:6,padding:"9px 10px",fontSize:16,color:C.t,fontFamily:"inherit",outline:"none"}}/>
    <div style={{display:"flex",gap:6,alignItems:"center"}}>
      <B small onClick={()=>logCardio()}>{data.cardio?.[t]?.done?"Save changes":"Log cardio"}</B>
      <B small outline onClick={()=>setShowCardio(false)}>Cancel</B>
    </div>
  </div>);

  const dks=["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
  const [viewW,setViewW]=useState(null);
  useBackClose(!!viewW,()=>{if(editW)setEditW(null);else setViewW(null);});
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
    // Rest comes from the lift actually on the bar: a swap gets its own rest, not the old lift's.
    const restAt=ei=>restFor(slotAt(ei),workout.exercises[ei]?.swappedTo);
    const swapExercise=(ei,newEx)=>{const oldEx=slotAt(ei);const slot={...oldEx};const key=progKey(newEx,slot);const newW=gw({...newEx,progKey:key},newEx.sw,slot);const wt=workout.isDeload?Math.round(newW*0.5/5)*5:newW;setWorkout(p=>{const n=JSON.parse(JSON.stringify(p));const wkEx=n.exercises[ei];wkEx.swappedFrom={id:oldEx.id,name:oldEx.name,progKey:progKey(oldEx,oldEx)};wkEx.id=newEx.id;wkEx.progKey=key;wkEx.swappedTo={id:newEx.id,name:newEx.name,unit:newEx.unit,sw:newEx.sw,cue:newEx.cue,inc:newEx.inc,progKey:key,pattern:newEx.pattern,region:newEx.region};wkEx.wu=WU(wt).map(w=>({...w,done:false}));const lastReps=data.prog?.[key]?.lastReps||[];wkEx.sets=wkEx.sets.map((s,si)=>({...s,weight:wt,done:false,reps:lastReps[si]||lastReps[0]||slot.rr?.[0]||0,prefilled:true,rir:""}));return n;});setSwapModal(null);};
    return(<div style={{display:"flex",flexDirection:"column",gap:6}}>
      {showFinishConfirm&&<ConfirmModal title="Finish the workout?" message="This will log your workout and save all set data." onConfirm={finishWorkout} onCancel={()=>setShowFinishConfirm(false)} confirmText="Finish" confirmColor={C.g}/>}
      {showCancelConfirm&&<ConfirmModal title="Discard this workout?" message="This will discard all data from this session. Nothing will be logged." onConfirm={cancelWorkout} onCancel={()=>setShowCancelConfirm(false)} confirmText="Discard" confirmColor={C.r}/>}
      {swapModal&&<SwapModal exName={swapModal.exName} slot={slotAt(swapModal.ei)} options={getSwapOptions(slotAt(swapModal.ei),workout.exercises[swapModal.ei])} onSelect={opt=>swapExercise(swapModal.ei,opt)} onClose={()=>setSwapModal(null)} getWeight={gw}/>}
      <Sheet open={showAddEx} onClose={()=>setShowAddEx(false)} title="Add exercise" right={<B small outline onClick={()=>setShowAddEx(false)}>Close</B>}>
          {(()=>{const used=new Set(workout.exercises.map(e=>e.id));
            const groups={};EXERCISE_LIBRARY.filter(o=>!o.off&&!used.has(o.id)).forEach(o=>{(groups[o.region]=groups[o.region]||[]).push(o);});
            return Object.entries(groups).map(([rg,opts])=>(<div key={rg} style={{marginBottom:8}}>
              <div style={{fontSize:12,fontWeight:800,color:C.t3,fontFamily:FD,padding:"4px 0"}}>{rg}</div>
              {opts.map(o=>(<button type="button" key={o.id} onClick={()=>addManualEx(o)} style={{display:"flex",width:"100%",justifyContent:"space-between",alignItems:"center",minHeight:44,padding:"4px 8px",borderTop:`1px solid ${C.bl}`,border:"none",borderTopStyle:"solid",background:"transparent",cursor:"pointer",textAlign:"left"}}>
                <span style={{fontSize:16,fontWeight:600,color:C.t}}>{o.name}</span>
                <span style={{fontSize:13,color:C.t3,whiteSpace:"nowrap"}}>{gw(o,o.sw)} {o.unit}</span>
              </button>))}
            </div>));})()}
      </Sheet>
      {exInfo&&<ExerciseHistory data={data} ex={exInfo.ex} progKeyStr={exInfo.progKey} onClose={()=>setExInfo(null)}/>}

      {(()=>{const exs=workout.exercises;const {curEi}=sessionCursor(exs,restAt);
        return(<div style={{paddingTop:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:8}}>
            <h1 style={{fontSize:26,fontWeight:600,letterSpacing:"-0.2px",minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.name}</h1>
            {!isBackfill(workout)&&<Elapsed start={workout.start}/>}
          </div>
          <div style={{fontSize:15,color:C.t3,marginTop:4,fontVariantNumeric:"tabular-nums"}}>
            {exs.length?(curEi>=0?`Lift ${curEi+1} of ${exs.length}`:"All sets done"):"Empty session"}
            {rt>0&&rl>0?` · rest ${Math.floor(rl/60)}:${String(rl%60).padStart(2,"0")} left`:""}
            {workout.isDeload?" · deload, half weight":""}
            {isBackfill(workout)?<div style={{color:C.t2,marginTop:2}}>Logging for {fmt(workout.date)}. The clock is ignored.</div>:null}
          </div>
        </div>);})()}

      {rt>0&&(()=>{const pct=rt?Math.min(100,Math.round((1-rl/Math.max(rt,1))*100)):0;const done=rl<=0;
        return(<Portal><div className="hh-dock" style={{position:"fixed",left:0,right:0,bottom:"calc(var(--tabbar-h) + var(--safe-b))",zIndex:95,maxWidth:520,margin:"0 auto",padding:"0 8px 6px"}}>
          <div className="hh-sheet" role="timer" aria-live="off" style={{background:done?C.g:C.t,borderRadius:12,boxShadow:C.sh,padding:"8px 8px 8px 14px",display:"flex",alignItems:"center",gap:8,position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",left:0,top:0,bottom:0,width:`${pct}%`,background:"var(--on-accent-line)",opacity:0.35,transition:"width .5s linear"}}/>
            <div style={{position:"relative",flex:1,minWidth:0}}>
              <div style={{fontSize:13,color:"var(--on-accent-dim)"}}>{done?"Rest done. Go.":"Rest"}</div>
              <div style={{fontSize:30,fontWeight:500,color:C.oa,fontVariantNumeric:"tabular-nums",lineHeight:1.1}}>{done?"0:00":`${Math.floor(rl/60)}:${String(rl%60).padStart(2,"0")}`}</div>
            </div>
            {!done&&<button type="button" onClick={()=>adjustRestTimer(-30)} style={{position:"relative",minHeight:44,minWidth:52,background:"transparent",border:"1px solid var(--on-accent-line)",color:C.oa,borderRadius:8,fontSize:16,fontWeight:500,cursor:"pointer",fontVariantNumeric:"tabular-nums"}}>−30</button>}
            {!done&&<button type="button" onClick={()=>adjustRestTimer(30)} style={{position:"relative",minHeight:44,minWidth:52,background:"transparent",border:"1px solid var(--on-accent-line)",color:C.oa,borderRadius:8,fontSize:16,fontWeight:500,cursor:"pointer",fontVariantNumeric:"tabular-nums"}}>+30</button>}
            <button type="button" onClick={clearRestTimer} style={{position:"relative",minHeight:44,minWidth:64,background:C.cd,border:"none",color:C.t,borderRadius:8,fontSize:16,fontWeight:500,cursor:"pointer"}}>{done?"Dismiss":"Skip"}</button>
          </div>
        </div></Portal>);})()}


      {s.warmup&&!wuDone&&(<X style={{padding:14,marginTop:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <div style={{fontSize:17,fontWeight:500,color:C.t}}>Warm-up</div>
          <B small outline onClick={()=>setWuDone(true)}>Done</B>
        </div>
        <div style={{fontSize:15,color:C.t2,marginBottom:s.warmup.moves.length?6:0}}>{s.warmup.cardio}</div>
        {s.warmup.note&&<div style={{fontSize:13,color:C.t2,marginBottom:4}}>{s.warmup.note}</div>}
        {/mobility/i.test(s.name||"")&&mobExercises.map((m,i)=>(
          <div key={m.id} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"5px 0",borderTop:i>0?`1px solid ${C.bl}`:"none"}}>
            <div style={{marginRight:8}}>
              <div style={{fontSize:15,fontWeight:600,color:C.t}}>{m.name}</div>
              <div style={{fontSize:12,color:C.t3,marginTop:1}}>{m.cue}</div>
            </div>
            <span style={{fontSize:13,color:C.t3,whiteSpace:"nowrap",fontFamily:FD,fontWeight:700}}>{m.sets}×{m.dur}s{m.sides?` · ${m.sides.map(x=>x[0]).join("/")}`:""}</span>
          </div>
        ))}
        {s.warmup.moves.map((m,i)=>(
          <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderTop:i>0?`1px solid ${C.bl}`:"none"}}>
            <span style={{fontSize:15,fontWeight:600,color:C.t}}>{m.name}</span>
            <span style={{fontSize:13,color:C.t3}}>{m.rx}</span>
          </div>
        ))}
        {s.warmup.ramp&&<div style={{fontSize:15,color:C.t3,marginTop:4}}>{s.warmup.ramp}</div>}
      </X>)}
      {s.warmup&&wuDone&&(<div style={{fontSize:15,color:C.t3,marginTop:14}}>Warm-up <span style={{color:C.g}}>done</span></div>)}

      {(()=>{ // ═══ SET TABLE · Strong/Hevy style: Set, Last, lb, Reps, check ═══
        const exs=workout.exercises;
        // Supersets: rest:0 chains an exercise to the next one (1A → 1B). Sets
        // inside a group interleave round-robin (A1, B1, A2, B2 …); the cursor
        // follows that order and the last member's rest runs the timer.
        const restOf=restAt;
        const {groups,curEi,curSi}=sessionCursor(exs,restOf);
        const allDone=exs.length>0&&curEi<0;
        const openEi=focusEi!=null&&exs[focusEi]?focusEi:curEi;
        const nameOf=i=>exs[i]?.swappedTo?.name||slotAt(i)?.name||"";
        const prevOf=i=>{const id=exs[i]?.id;const dates=Object.keys(data.wk).sort().reverse();for(const d of dates){if(d===t)continue;const wex=data.wk[d].exercises?.find(e=>e.id===id);if(wex){const ds=wex.sets?.filter(x=>x.done&&(x.weight>0||x.reps>0));if(ds?.length)return{date:d,sets:ds,weight:ds[0].weight,reps:ds.map(x=>x.reps)};}}return null;};
        const undoLastSet=()=>{setWorkout(p=>{const n=JSON.parse(JSON.stringify(p));let best=null;n.exercises.forEach(e=>e.sets.forEach(x=>{if((x.done||x.skipped)&&(!best||(x.at||0)>=(best.at||0)))best=x;}));if(best){best.done=false;best.skipped=false;delete best.at;}return n;});};
        const undoSet=(ei,si)=>setWorkout(p=>{const n=JSON.parse(JSON.stringify(p));const x=n.exercises[ei].sets[si];x.done=false;x.skipped=false;delete x.at;return n;});
        const skipSets=(ei,which)=>{haptic(10);setWorkout(p=>{const n=JSON.parse(JSON.stringify(p));const now=Date.now();n.exercises[ei].sets.forEach((x,si)=>{if(!x.done&&!x.skipped&&(which==='all'||si===which)){x.skipped=true;x.at=now;}});return n;});};
        const unskipEx=(ei)=>setWorkout(p=>{const n=JSON.parse(JSON.stringify(p));n.exercises[ei].sets.forEach(x=>{if(x.skipped){x.skipped=false;delete x.at;}});return n;});
        const anyLogged=exs.some(e=>e.sets.some(x=>x.done||x.skipped));
        const NUMS={fontVariantNumeric:"tabular-nums"};
        const link={background:"none",border:"none",color:C.t3,fontSize:15,cursor:"pointer",padding:"10px 8px",minHeight:44};
        const cell={height:40,display:"flex",alignItems:"center",justifyContent:"center",marginRight:6,fontSize:17,...NUMS};
        const inp={width:"100%",height:44,border:`1.5px solid ${C.p}`,borderRadius:8,background:C.cd,textAlign:"center",fontSize:20,fontWeight:500,outline:"none",...NUMS};
        const Chk=({on,onClick,label,dim})=>(<button type="button" onClick={onClick} aria-label={label} aria-pressed={!!on} style={{width:44,height:44,display:"flex",alignItems:"center",justifyContent:"center",background:"none",border:"none",cursor:"pointer",padding:0}}>
          <span style={{width:22,height:22,borderRadius:6,border:`1.5px solid ${on?C.t:dim?C.bd:C.t4}`,background:on?C.t:"transparent",color:C.oa,fontSize:15,lineHeight:"19px",textAlign:"center"}}>{on?"✓":""}</span>
        </button>);
        const summaryOf=i=>{const e=exs[i];const done=e.sets.filter(x=>x.done).length;const w=e.sets[0]?.weight;
          return done===e.sets.length?`${done} of ${done} done`:`${e.sets.length} × ${w>0?w:"BW"}`;};

        const liftView=(ei)=>{
          const e=exs[ei],sl=slotAt(ei),open=ei===openEi;
          const fully=e.sets.length>0&&e.sets.every(x=>x.done||x.skipped);
          const skippedAll=fully&&e.sets.some(x=>x.skipped)&&!e.sets.some(x=>x.done);
          const name=nameOf(ei);
          const grp=groups.find(g=>g.includes(ei));
          const ssTag=grp&&grp.length>1?`Superset ${String.fromCharCode(65+grp.indexOf(ei))}`:null;
          if(!open)return(<div style={{borderTop:`1px solid ${C.bd}`,display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
            <button type="button" onClick={()=>setFocusEi(ei)} style={{flex:1,minWidth:0,display:"flex",justifyContent:"space-between",gap:10,background:"none",border:"none",padding:"14px 0",cursor:"pointer",textAlign:"left"}}>
              <span style={{fontSize:17,fontWeight:500,color:skippedAll?C.t4:fully?C.t3:C.t,textDecoration:skippedAll?"line-through":"none",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{name}</span>
              {!skippedAll&&<span style={{fontSize:15,color:fully?C.g:C.t3,whiteSpace:"nowrap",...NUMS}}>{summaryOf(ei)}</span>}
            </button>
            {skippedAll&&<button type="button" onClick={()=>unskipEx(ei)} style={{...link,color:C.t2}}>Undo skip</button>}
          </div>);
          const prev=prevOf(ei);
          const edSi=ei===curEi?curSi:e.sets.findIndex(x=>!x.done&&!x.skipped);
          const inc=(e.swappedTo?.inc??sl?.inc)||5;
          const unit=(e.swappedTo?.unit||sl?.unit||"lb").toLowerCase().replace("lbs","lb");
          const rr=sl?.rr;
          // One rule for "what am I aiming for", shared with Today and the Train plan (anchors move up; the rest hold on the cut).
          const goal=sl?liftTarget(data,{...sl,...(e.swappedTo||{}),sets:e.sets.length},{isDeload:workout.isDeload}).goal:null;
          const cue=e.swappedTo?.cue||sl?.cue||"";
          const showWu=edSi===0&&e.wu?.some(w=>!w.done);
          return(<div style={{borderTop:`1px solid ${C.bd}`,padding:"14px 0 6px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:10}}>
              <button type="button" onClick={()=>setExInfo({ex:{...(sl||{}),...(e.swappedTo||{}),name},progKey:e.progKey})} aria-label={`${name} history`} style={{background:"none",border:"none",padding:"6px 0",minHeight:44,textAlign:"left",fontSize:19,fontWeight:500,color:C.t,cursor:"pointer"}}>{name}</button>
              {rr&&<span style={{fontSize:15,color:C.t3,whiteSpace:"nowrap",...NUMS}}>{rrTxt(rr)} reps</span>}
            </div>
            <div style={{fontSize:15,color:C.t3,marginTop:3,lineHeight:1.45,...NUMS}}>
              {[sl?.anchor?"Anchor":null,ssTag,e.swappedTo?"Swapped":null].filter(Boolean).join(" · ")}{(sl?.anchor||ssTag||e.swappedTo)&&prev?" · ":""}
              {prev?<>Last {prev.weight>0?prev.weight:"BW"} × {prev.reps.join(", ")}</>:null}
            </div>
            {goal&&<div style={{fontSize:15,color:C.t2,marginTop:2,lineHeight:1.45}}>{goal}</div>}
            {ssTag&&ei===curEi&&<div style={{fontSize:15,color:C.t3,marginTop:2}}>{restOf(ei)===0?`No rest, straight to ${nameOf(grp[grp.indexOf(ei)+1])}`:`Rest after this, then back to ${nameOf(grp[0])}`}</div>}
            <div style={{display:"grid",gridTemplateColumns:"28px 1fr 1fr 1fr 44px",alignItems:"center",marginTop:10,rowGap:2}}>
              {["Set","Last",unit,"Reps",""].map((h,i)=><span key={i} style={{fontSize:13,color:C.t3,textAlign:i>=2?"center":"left",paddingBottom:2}}>{h}</span>)}
              {showWu&&<span style={{gridColumn:"1 / -1",fontSize:13,color:C.t3,paddingTop:4}}>Warm-up sets (W). Light, they don't count. Tick them as you go.</span>}
              {showWu&&e.wu.map((w,wi)=>(<React.Fragment key={`w${wi}`}>
                <span style={{fontSize:15,color:C.t3}}>W</span><span style={{fontSize:15,color:C.t3}}>{w.l}</span>
                <span style={{...cell,color:w.done?C.t3:C.t2}}>{w.w}</span><span style={{...cell,color:w.done?C.t3:C.t2}}>{w.r}</span>
                <Chk on={w.done} dim label={`Warm-up ${wi+1} done`} onClick={()=>!w.done&&dWU(ei,wi,restAt(ei))}/>
              </React.Fragment>))}
              {e.sets.map((x,si)=>{const isEd=si===edSi;const isNow=isEd&&ei===curEi;const pv=prev?.sets?.[si];
                const tone=x.skipped?C.t4:x.done?C.t:C.t3;
                return(<React.Fragment key={si}>
                  <span style={{fontSize:16,color:isNow?C.p:C.t3,fontWeight:isNow?500:400,...NUMS}}>{si+1}</span>
                  <span style={{fontSize:15,color:C.t3,...NUMS}}>{pv?`${pv.weight>0?pv.weight:"BW"}×${pv.reps}`:"–"}</span>
                  {isEd?(<>
                    <span style={{marginRight:6}}><input aria-label={`Set ${si+1} weight`} inputMode="decimal" value={x.weight??""} onFocus={ev=>ev.target.select()} onChange={ev=>{const v=ev.target.value.replace(/[^0-9.]/g,"").replace(/(\..*)\./g,"$1");uS(ei,si,"weight",/^\d+$/.test(v)?Number(v):v);}} style={inp}/></span>
                    <span style={{marginRight:6}}><input aria-label={`Set ${si+1} reps`} inputMode="numeric" value={x.reps??""} onFocus={ev=>ev.target.select()} onChange={ev=>{const v=ev.target.value.replace(/[^0-9]/g,"");uS(ei,si,"reps",v===""?"":Number(v));}} style={inp}/></span>
                  </>):(<>
                    <span style={{...cell,color:tone,textDecoration:x.skipped?"line-through":"none"}}>{x.weight>0?x.weight:"BW"}</span>
                    <span style={{...cell,color:tone,textDecoration:x.skipped?"line-through":"none"}}>{x.reps||"○"}</span>
                  </>)}
                  <Chk on={x.done} label={x.done?`Undo set ${si+1}`:x.skipped?`Unskip set ${si+1}`:`Log set ${si+1}`} onClick={()=>{if(x.done||x.skipped)undoSet(ei,si);else dS(ei,si,restAt(ei));}}/>
                </React.Fragment>);})}
            </div>
            {/* Two labeled rows: RIR alone was a mystery, and the weight steppers looked like part of it. */}
            {edSi>=0&&<div style={{display:"flex",justifyContent:"space-between",fontSize:13,color:C.t3,marginTop:12,...NUMS}}><span>Reps left in the tank (RIR)</span><span>Weight ±{inc}</span></div>}
            {edSi>=0&&(<div style={{display:"flex",alignItems:"center",gap:6,marginTop:4}}>
              {[0,1,2,3].map(v=>{const on=String(e.sets[edSi].rir)===String(v);return(<button type="button" key={v} aria-pressed={on} onClick={()=>uS(ei,edSi,"rir",on?"":v)} style={{flex:1,minHeight:44,borderRadius:8,border:`1px solid ${on?C.t:C.bd}`,background:on?C.t:C.cd,color:on?C.oa:C.t,fontSize:17,cursor:"pointer",...NUMS}}>{v}</button>);})}
              <span style={{display:"flex",gap:6,marginLeft:8}}>
                <button type="button" aria-label={`Weight down ${inc}`} onClick={()=>{haptic(6);uS(ei,edSi,"weight",Math.max(0,(Number(e.sets[edSi].weight)||0)-inc));}} style={{width:44,minHeight:44,borderRadius:8,border:`1px solid ${C.bd}`,background:C.cd,fontSize:20,cursor:"pointer"}}>−</button>
                <button type="button" aria-label={`Weight up ${inc}`} onClick={()=>{haptic(6);uS(ei,edSi,"weight",(Number(e.sets[edSi].weight)||0)+inc);}} style={{width:44,minHeight:44,borderRadius:8,border:`1px solid ${C.bd}`,background:C.cd,fontSize:20,cursor:"pointer"}}>+</button>
              </span>
            </div>)}
            {ei===curEi&&e.sets[curSi]&&(<button type="button" onClick={()=>dS(curEi,curSi,restAt(curEi))} style={{marginTop:12,width:"100%",minHeight:48,border:"none",borderRadius:9,background:C.p,color:C.oa,fontSize:17,fontWeight:500,cursor:"pointer",...NUMS}}>Log set {curSi+1} · {e.sets[curSi].weight||0} × {e.sets[curSi].reps||0}</button>)}
            <div style={{display:"flex",justifyContent:"center",flexWrap:"wrap",gap:4,marginTop:4}}>
              {edSi>=0&&<button type="button" style={link} onClick={()=>skipSets(ei,edSi)}>Skip set</button>}
              {edSi>=0&&<button type="button" style={link} onClick={()=>skipSets(ei,'all')}>Skip lift</button>}
              {getSwapOptions(sl,e).length>0&&!e.sets.some(x=>x.done)&&<button type="button" style={link} onClick={()=>setSwapModal({ei,exName:name})}>Swap lift</button>}
              {BARBELL_IDS.has(e.id)&&<button type="button" style={link} onClick={()=>setShowPlates(true)}>Plates</button>}
            </div>
            {cue&&<details style={{marginTop:2}}><summary style={{fontSize:15,color:C.t3,cursor:"pointer",padding:"6px 0"}}>Form cue</summary><div style={{fontSize:15,color:C.t2,lineHeight:1.5,paddingBottom:6}}>{cue}</div></details>}
            <Sheet open={showPlates} onClose={()=>setShowPlates(false)} title="Plates"><PlateCalc weight={e.sets[Math.max(0,edSi)]?.weight||0}/></Sheet>
          </div>);
        };

        return(<div style={{marginTop:14}}>
          {exs.length===0&&<div style={{borderTop:`1px solid ${C.bd}`,padding:"18px 0",fontSize:16,color:C.t3}}>Add your first exercise to start logging.</div>}
          {exs.map((_,ei)=><React.Fragment key={ei}>{liftView(ei)}</React.Fragment>)}
          <div style={{borderTop:`1px solid ${C.bd}`}}/>
          {allDone&&<div style={{fontSize:16,color:C.g,marginTop:14}}>All sets done. {exs.reduce((a,e)=>a+e.sets.filter(x=>x.done).length,0)} logged.</div>}
          <button type="button" onClick={()=>setShowFinishConfirm(true)} style={{marginTop:14,width:"100%",minHeight:48,borderRadius:9,fontSize:17,fontWeight:500,cursor:"pointer",
            border:allDone?"none":`1px solid ${C.bd}`,background:allDone?C.p:C.cd,color:allDone?C.oa:C.t}}>Finish workout</button>
          <div style={{display:"flex",justifyContent:"center",flexWrap:"wrap",gap:4,marginTop:6}}>
            <button type="button" style={link} onClick={()=>setShowAddEx(true)}>Add exercise</button>
            {anyLogged&&<button type="button" style={link} onClick={undoLastSet}>Undo last set</button>}
            <button type="button" style={{...link,color:C.r}} onClick={()=>setShowCancelConfirm(true)}>Discard workout</button>
          </div>
          {rt>0&&<div style={{height:72}} aria-hidden="true"/>}
        </div>);
      })()}

      {(()=>{const plc=workout.manual?null:getPostLiftCardio(workout.day);if(!plc)return null;
        return(<X style={{padding:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:16,fontWeight:700,color:C.t}}>{plc.label}</div>
              <div style={{fontSize:13,color:C.t3}}>{plc.duration} min · {intensityLabel(plc.intensity)} post-lift cardio</div>
            </div>
            {cardioTimerDone?<div style={{display:"flex",gap:6,alignItems:"center"}}><span style={{fontSize:16,fontWeight:700,color:C.g}}>Done ✓</span><B small outline onClick={()=>openCardioLog(plc)}>Details</B><B small onClick={()=>logCardio(plc)} color={C.g}>Quick log</B></div>
              :cardioTimerRunning?<B small outline onClick={stopCardioTimer} color={C.r}>Stop</B>
              :<div style={{display:"flex",gap:6}}><B small outline onClick={()=>openCardioLog(plc)}>Log</B><B small outline onClick={()=>startCardioTimer(plc.duration)}>Start</B></div>}
          </div>
          {cardioTimerRunning&&(<div style={{marginTop:10,textAlign:"center"}}>
            <div style={{fontSize:44,fontWeight:700,color:C.t,fontVariantNumeric:"tabular-nums"}}>{Math.floor(cardioTimerLeft/60)}:{String(cardioTimerLeft%60).padStart(2,"0")}</div>
            <div style={{fontSize:12,color:C.t3,marginTop:2}}>remaining</div>
          </div>)}
          {cardioTimerDone&&(<div style={{marginTop:6,fontSize:13,color:C.g,fontWeight:600}}>Cardio done. Use Details for distance and calories, or Quick log for time only.</div>)}
          {renderCardioForm()}
        </X>);
      })()}

    </div>);
  }

  const monthNames=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  if(viewW){
    // A logged workout. Names come from the log's own exercise ids (the program
    // may have changed since), the goal range only when the lift still matches.
    const [vDate,vData]=viewW;
    const vSess=getSess(vData.day,vData.variant);
    const title=workoutLabel(vData,data.program);
    const rrOf=ex=>{const pe=vSess?.exercises?.find(p=>p.id===ex.id);return pe?.rr||null;};
    const nameOf=ex=>ex.swappedTo?.name||exerciseName(ex.id);
    const NUMS={fontVariantNumeric:"tabular-nums"};
    const back=<button type="button" onClick={()=>{setEditW(null);setViewW(null);}} style={{background:"none",border:"none",color:C.t2,cursor:"pointer",fontSize:16,textAlign:"left",padding:"8px 0",minHeight:40}}>‹ Train</button>;
    const grid={display:"grid",gridTemplateColumns:"32px 1fr 1fr 64px",alignItems:"center",columnGap:8};
    if(editW){
      const upd=(fn)=>setEditW(p=>{const n=JSON.parse(JSON.stringify(p));fn(n);return n;});
      const saveEdit=()=>{
        const w={...editW,dur:+editW.dur||vData.dur||0};w.volume=w.exercises.reduce((a,e)=>a+(e.sets||[]).filter(x=>x.done).reduce((b,x)=>b+(+x.weight||0)*(+x.reps||0),0),0);
        const nd={...data,wk:{...data.wk,[vDate]:w}};setData(nd);sv(nd);svSB.workout(vDate,w);
        setViewW([vDate,w]);setEditW(null);addToast?.("Workout updated","success");};
      return(<div style={{paddingTop:4}}>
        {back}
        <h1 style={{fontSize:26,fontWeight:600,letterSpacing:"-0.2px"}}>Edit {title}</h1>
        <div style={{display:"flex",alignItems:"center",gap:10,marginTop:8,fontSize:15,color:C.t3}}>{fmt(vDate)} · minutes
          <N value={String(editW.dur??"")} onChange={v=>upd(n=>{n.dur=v;})} style={{width:72}}/></div>
        {editW.exercises?.map((ex,ei)=>(<div key={ei} style={{borderTop:`1px solid ${C.bd}`,marginTop:14,paddingTop:12}}>
          <div style={{fontSize:17,fontWeight:500}}>{nameOf(ex)}</div>
          <div style={{...grid,marginTop:6}}>{["Set","lb","Reps",""].map((h,i)=><span key={i} style={{fontSize:13,color:C.t3}}>{h}</span>)}</div>
          {ex.sets?.map((st,si)=>(<div key={si} style={{...grid,padding:"3px 0"}}>
            <span style={{fontSize:16,color:C.t3,...NUMS}}>{si+1}</span>
            <N value={String(st.weight??"")} onChange={v=>upd(n=>{n.exercises[ei].sets[si].weight=v===""?"":+v||v;})} placeholder="lb"/>
            <N value={String(st.reps??"")} onChange={v=>upd(n=>{n.exercises[ei].sets[si].reps=v===""?"":+v||v;})} placeholder="reps"/>
            <button type="button" aria-pressed={!!st.done} onClick={()=>upd(n=>{n.exercises[ei].sets[si].done=!st.done;})} style={{minHeight:40,border:`1px solid ${C.bd}`,background:C.cd,color:st.done?C.t:C.t3,borderRadius:8,fontSize:15,cursor:"pointer"}}>{st.done?"Done":"Skipped"}</button>
          </div>))}
        </div>))}
        <div style={{display:"flex",gap:8,marginTop:18}}>
          <B full outline onClick={()=>setEditW(null)}>Cancel</B>
          <B full onClick={saveEdit}>Save</B>
        </div>
        <div style={{fontSize:13,color:C.t3,textAlign:"center",marginTop:8}}>Edits fix the log. Next session's weights still follow the plan.</div>
      </div>);
    }
    const doneSets=(vData.exercises||[]).reduce((a,e)=>a+(e.sets||[]).filter(saneSet).length,0);
    const vol=vData.volume||(vData.exercises||[]).reduce((a,e)=>a+(e.sets||[]).filter(saneSet).reduce((b,x)=>b+(+x.weight||0)*(+x.reps||0),0),0);
    const dur=cleanDur(vData.dur);
    return(<div style={{paddingTop:4}}>
      {back}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:8}}>
        <h1 style={{fontSize:26,fontWeight:600,letterSpacing:"-0.2px"}}>{title}</h1>
        <button type="button" onClick={()=>setEditW(JSON.parse(JSON.stringify(vData)))} style={{background:"none",border:"none",color:C.t2,fontSize:16,cursor:"pointer",padding:"8px 0",minHeight:40}}>Edit</button>
      </div>
      <div style={{fontSize:15,color:C.t3,marginTop:2,...NUMS}}>{fmt(vDate)}{dur?` · ${dur} min`:""} · {doneSets} sets{vol>0?` · ${Math.round(vol).toLocaleString()} lb moved`:""}</div>
      {(vData.exercises||[]).map((ex,ei)=>{const rr=rrOf(ex);return(<div key={ei} style={{borderTop:`1px solid ${C.bd}`,marginTop:14,paddingTop:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:8}}>
          <span style={{fontSize:17,fontWeight:500}}>{nameOf(ex)}</span>
          {rr&&<span style={{fontSize:15,color:C.t3,...NUMS}}>{rrTxt(rr)} reps</span>}
        </div>
        {ex.swappedFrom&&<div style={{fontSize:15,color:C.t3,marginTop:2}}>Swapped from {ex.swappedFrom.name}</div>}
        <div style={{...grid,gridTemplateColumns:"32px 1fr 1fr 1fr",marginTop:6}}>
          {["Set","lb","Reps","RIR"].map((h,i)=><span key={i} style={{fontSize:13,color:C.t3,textAlign:i?"center":"left"}}>{h}</span>)}
          {(ex.sets||[]).map((x,si)=>{const ok=x.done;const top=rr&&ok&&+x.reps>=rr[1];const c=ok?C.t:C.t3;return(<React.Fragment key={si}>
            <span style={{fontSize:16,color:C.t3,padding:"7px 0",...NUMS}}>{si+1}</span>
            <span style={{fontSize:17,color:c,textAlign:"center",textDecoration:ok?"none":"line-through",...NUMS}}>{+x.weight>0?x.weight:"BW"}</span>
            <span style={{fontSize:17,color:top?C.g:c,textAlign:"center",textDecoration:ok?"none":"line-through",...NUMS}}>{x.reps||"○"}</span>
            <span style={{fontSize:15,color:C.t3,textAlign:"center",...NUMS}}>{ok?(x.rir!=null&&x.rir!==""?x.rir:""):"skipped"}</span>
          </React.Fragment>);})}
        </div>
      </div>);})}
      <div style={{fontSize:13,color:C.t3,marginTop:16}}>Green reps hit the top of the range.</div>
    </div>);
  }

  if(mobRunning&&showMob)return(<StretchPlayer exercises={mobExercises} startedAt={mobStartRef.current} onFinish={finishMob} onSkipDay={skipMob} onHide={()=>setShowMob(false)}/>);

  return(<div style={{display:"flex",flexDirection:"column"}}>
    {exInfo&&<ExerciseHistory data={data} ex={exInfo.ex} progKeyStr={exInfo.progKey} onClose={()=>setExInfo(null)}/>}
    <Sheet open={!!summary} onClose={()=>setSummary(null)} title="Session logged">
      {summary&&(<div>
        <div style={{fontSize:16,fontWeight:700,color:C.t2}}>{summary.name} · {fmt(summary.date)}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7,marginTop:10}}>
          {[[summary.dur?`${summary.dur}m`:"○","Duration"],[String(summary.sets),`sets · ${summary.exercises} lifts`],[summary.volume?summary.volume.toLocaleString():"○","Lbs volume"]].map(([v,l])=>(
            <div key={l} style={{background:C.bg,borderRadius:8,padding:"10px 6px",textAlign:"center"}}><div style={{fontSize:22,fontWeight:800,color:C.t,fontFamily:FD}}>{v}</div><div style={{fontSize:12,fontWeight:700,color:C.t3,fontFamily:FD}}>{l}</div></div>))}
        </div>
        {summary.prs.length>0?(<div style={{marginTop:12}}>
          <div style={{fontSize:12,fontWeight:700,color:C.g,fontFamily:FD}}>New records</div>
          {summary.prs.map(p=>(<div key={p.name} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderTop:`1px solid ${C.bl}`}}>
            <span style={{fontSize:16,fontWeight:700,color:C.t}}>{p.name}</span>
            <span style={{fontSize:15,fontWeight:700,color:C.g,fontFamily:FD}}>{p.weight}×{p.reps} · e1RM {p.e1rm} <span style={{color:C.t3}}>was {p.prev}</span></span>
          </div>))}
        </div>):<div style={{fontSize:13,color:C.t3,marginTop:10}}>No new e1RM records. On a cut, holding is the win.</div>}
        <div style={{display:"flex",gap:8,marginTop:14}}>
          <B full outline onClick={()=>{setViewW([summary.date,summary.log]);setSummary(null);}}>View log</B>
          <B full onClick={()=>setSummary(null)}>Done</B>
        </div>
      </div>)}
    </Sheet>
    {(()=>{ // ═══ TRAIN HOME · week strip, the selected day's session, also today, progress, history ═══
      const NUMS={fontVariantNumeric:"tabular-nums"};
      const link={background:"none",border:"none",color:C.t3,fontSize:15,cursor:"pointer",padding:"10px 8px",minHeight:40};
      // ── Week strip: 12 weeks back to 1 ahead, swipe sideways (snaps per week).
      const dsOf=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
      const PAST_WEEKS=12;
      const mon0=(()=>{const d=new Date(t+"T12:00:00");d.setDate(d.getDate()-(d.getDay()+6)%7);return d;})();
      const weekOf=off=>dks.map((dk,i)=>{const d=new Date(mon0);d.setDate(d.getDate()+off*7+i);const ds=dsOf(d);
        return{dk,ds,n:d.getDate(),lift:!!data.program?.[dk]?.exercises?.length,done:!!data.wk?.[ds],today:ds===t,future:ds>t};});
      const pages=Array.from({length:PAST_WEEKS+2},(_,i)=>i-PAST_WEEKS);
      const shortD=ds=>new Date(ds+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"});
      const wk=weekOf(weekOff);
      const weekLabel=weekOff===0?"This week":weekOff===-1?"Last week":weekOff===1?"Next week":`${shortD(wk[0].ds)} – ${shortD(wk[6].ds)}`;
      const jumpToday=()=>{setSelDate(t);const el=stripRef.current;if(el)el.scrollTo({left:el.clientWidth*PAST_WEEKS,behavior:"smooth"});};
      const selDow=dw(selDate);
      const selLog=data.wk?.[selDate];
      // Before this block started there was no plan for that day; offer the picker instead.
      const selPlan=selDate<PROG.start?null:getSess(selDow,activeVariant[selDow]);
      const isToday=selDate===t,isPast=selDate<t;
      const selLabel=isToday?"Today":fmt(selDate);
      const todayLogged=!!data.wk?.[t];
      const cardioToday=data.cardio?.[t];
      const mobEntry=data.mob?.[t];
      const bigBtn=(primary)=>({marginTop:14,width:"100%",minHeight:48,borderRadius:9,fontSize:17,fontWeight:500,cursor:"pointer",border:primary?"none":`1px solid ${C.bd}`,background:primary?C.p:C.cd,color:primary?C.oa:C.t});
      const liftRows=(exs,dim)=>(<div style={{marginTop:12,borderTop:`1px solid ${C.bd}`}}>
        {exs.map(ex=>{const lt=liftTarget(data,ex);const cw=lt.weight;const ss=supersetLabel(selDow,ex);return(
          <button type="button" key={ex.id} onClick={()=>setExInfo({ex,progKey:progKey(ex,ex)})} style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,minHeight:52,padding:"8px 0",background:"none",border:"none",borderBottom:`1px solid ${C.bd}`,cursor:"pointer",textAlign:"left"}}>
            <span style={{minWidth:0}}>
              <span style={{display:"block",fontSize:17,color:dim?C.t2:C.t}}>{ex.name}</span>
              <span style={{display:"block",fontSize:15,color:C.t3,marginTop:1,...NUMS}}>{[ss?`Superset ${ss}`:null,ex.anchor?"Anchor":null,`${ex.sets} × ${rrTxt(ex.rr)}`,lt.last&&!dim?`last ${lt.last}`:null].filter(Boolean).join(" · ")}</span>
              {!dim&&<span style={{display:"block",fontSize:15,color:C.t2,marginTop:2}}>{lt.goal}</span>}
            </span>
            <span style={{fontSize:17,fontWeight:500,color:dim?C.t2:C.t,whiteSpace:"nowrap",...NUMS}}>{cw>0?<>{cw}<span style={{fontSize:13,color:C.t3,fontWeight:400}}> lb</span></>:"BW"}</span>
          </button>);})}
      </div>);
      return(<>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",paddingTop:12}}>
          <h1 style={{fontSize:26,fontWeight:600,letterSpacing:"-0.2px"}}>Train</h1>
          <span style={{fontSize:15,color:C.t3,...NUMS}}>Week {wkn(t)} of {PROG.weeks}{isDeload?" · deload":""}</span>
        </div>

        {/* Week strip. Swipe for other weeks. Green dot = logged, ember dot = today. */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:12,minHeight:32}}>
          <span style={{fontSize:15,color:C.t3,...NUMS}}>{weekLabel}</span>
          {(weekOff!==0||selDate!==t)&&<button type="button" onClick={jumpToday} style={{background:"none",border:"none",fontSize:15,color:C.t2,cursor:"pointer",padding:"6px 0",minHeight:32}}>Back to today</button>}
        </div>
        <div ref={el=>{stripRef.current=el;if(el&&!el.dataset.init&&el.clientWidth>0){
            // Land on this week. A single assignment can be clamped or snapped back before layout
            // settles (fresh launch, iOS), so re-apply for a few frames; scroll events are ignored until then.
            el.dataset.init="pending";const want=()=>el.clientWidth*(PAST_WEEKS+weekOff);let n=0;
            const pin=()=>{el.scrollLeft=want();if(++n<6&&Math.abs(el.scrollLeft-want())>1)requestAnimationFrame(pin);else requestAnimationFrame(()=>{el.dataset.init="1";});};pin();}}}
          onScroll={e=>{const el=e.currentTarget;if(el.dataset.init!=="1")return;const off=Math.round(el.scrollLeft/Math.max(1,el.clientWidth))-PAST_WEEKS;if(off!==weekOff)setWeekOff(off);}}
          style={{display:"flex",overflowX:"auto",scrollSnapType:"x mandatory",scrollbarWidth:"none",WebkitOverflowScrolling:"touch",marginTop:4}}>
          {pages.map(off=>(<div key={off} role="tablist" aria-label={off===0?"This week":`Week ${off>0?"+":""}${off}`} style={{flex:"0 0 100%",scrollSnapAlign:"start",display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
            {weekOf(off).map(w=>{const on=w.ds===selDate;return(
              <button type="button" role="tab" aria-selected={on} key={w.ds} onClick={()=>setSelDate(w.ds)} aria-label={`${fmt(w.ds)}${w.done?", logged":""}`}
                style={{minHeight:58,borderRadius:9,border:`1px solid ${on?C.t:"transparent"}`,background:on?C.cd:"transparent",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3,padding:0}}>
                <span style={{fontSize:13,color:C.t3}}>{w.dk.charAt(0).toUpperCase()+w.dk.slice(1,3)}</span>
                <span style={{fontSize:18,fontWeight:w.done||w.today?500:400,color:w.done||w.today||(!w.future&&w.lift)?C.t:C.t3,...NUMS}}>{w.n}</span>
                <span aria-hidden="true" style={{width:5,height:5,borderRadius:3,background:w.done?C.g:w.today?C.p:"transparent"}}/>
              </button>);})}
          </div>))}
        </div>

        {/* The selected day. Logged → what you did. Today → the plan and Start.
            A past day with no log → log it for that date or do it today. Future → preview. */}
        <section style={{marginTop:20}}>
          {selLog?(()=>{const n=(selLog.exercises||[]).reduce((a,e)=>a+(e.sets||[]).filter(saneSet).length,0);const du=cleanDur(selLog.dur);return(<>
            <div style={{fontSize:15,color:C.g,...NUMS}}>Logged · {selLabel}{du?` · ${du} min`:""} · {n} sets</div>
            <div style={{fontSize:22,fontWeight:600,marginTop:4}}>{workoutLabel(selLog,data.program)}</div>
            <div style={{marginTop:10,borderTop:`1px solid ${C.bd}`}}>
              {(selLog.exercises||[]).filter(e=>(e.sets||[]).some(saneSet)).map((e,i)=>{const ds=(e.sets||[]).filter(saneSet);const top=Math.max(...ds.map(x=>+x.weight||0));return(
                <div key={i} style={{display:"flex",justifyContent:"space-between",gap:12,minHeight:44,alignItems:"center",borderBottom:`1px solid ${C.bd}`}}>
                  <span style={{fontSize:17,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.swappedTo?.name||exerciseName(e.id)}</span>
                  <span style={{fontSize:15,color:C.t3,whiteSpace:"nowrap",...NUMS}}>{top>0?`${top} × `:"BW × "}{ds.map(x=>x.reps).join(", ")}</span>
                </div>);})}
            </div>
            <button type="button" style={bigBtn(false)} onClick={()=>setViewW([selDate,selLog])}>Open workout</button>
            {isToday&&<div style={{textAlign:"center"}}><button type="button" style={link} onClick={undoWorkout}>Undo today's log</button></div>}
          </>);})()
          :selPlan?(<>
            <div style={{fontSize:15,color:C.t3,...NUMS}}>{isToday?"Today's plan":isPast?`Nothing logged · ${selLabel}`:`Planned · ${selLabel}`}</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:8,marginTop:4}}>
              <div style={{fontSize:22,fontWeight:600,color:isPast?C.t2:C.t}}>{selPlan.name}</div>
              <span style={{fontSize:15,color:C.t3,whiteSpace:"nowrap",...NUMS}}>{selPlan.exercises.length} lifts · {estTime(selPlan)} min</span>
            </div>
            {PROG.variants?.[selDow]&&<div role="group" aria-label="Version" style={{display:"flex",flexWrap:"wrap",marginTop:6,marginLeft:-6}}>
              {[[null,"Standard"],...Object.entries(PROG.variants[selDow]).map(([k,v])=>[k,v.name.replace(data.program[selDow]?.name+" ","").replace(/[()]/g,"")])].map(([k,l])=>{const on=(activeVariant[selDow]||null)===k;return(
                <button type="button" key={l} aria-pressed={on} onClick={()=>setVariant(selDow,k)} style={{background:"none",border:"none",fontSize:15,color:on?C.t:C.t3,fontWeight:on?500:400,padding:"8px 6px",minHeight:36,cursor:"pointer"}}>{l}</button>);})}
            </div>}
            {selDow==="wednesday"&&<div style={{fontSize:15,color:C.t3,marginTop:4}}>Superset day. Do A then B back to back, rest after B.</div>}
            {liftRows(selPlan.exercises,isPast)}
            {selPlan.warmup&&!isPast&&<details style={{marginTop:2}}><summary style={{fontSize:15,color:C.t3,cursor:"pointer",padding:"10px 0"}}>Warm-up · {selPlan.warmup.cardio}</summary>
              {selPlan.warmup.moves.map((m,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:15,padding:"5px 0"}}><span style={{color:C.t2}}>{m.name}</span><span style={{color:C.t3}}>{m.rx}</span></div>))}
              {selPlan.warmup.ramp&&<div style={{fontSize:15,color:C.t3,padding:"5px 0"}}>{selPlan.warmup.ramp}</div>}
            </details>}
            {isToday&&<button type="button" style={bigBtn(true)} onClick={()=>startW(selDow)}>Start workout</button>}
            {isPast&&<>
              <button type="button" style={bigBtn(!todayLogged)} onClick={()=>startW(selDow)}>Do {selPlan.name} today</button>
              <button type="button" style={{...bigBtn(false),marginTop:8}} onClick={()=>startW(selDow,{date:selDate})}>Log it for {selLabel}</button>
            </>}
            {!isToday&&!isPast&&<button type="button" style={bigBtn(false)} onClick={()=>startW(selDow)}>Do it today instead</button>}
            <div style={{textAlign:"center"}}><button type="button" style={link} onClick={()=>setPicker({date:isPast?selDate:t})}>Pick a different session</button></div>
          </>):(<>
            <div style={{fontSize:15,color:C.t3}}>{isPast?`Nothing logged · ${selLabel}`:selLabel}</div>
            <div style={{fontSize:22,fontWeight:600,marginTop:4}}>{selDate<PROG.start?"Before this block":"Rest day"}</div>
            <div style={{fontSize:15,color:C.t3,marginTop:2}}>{selDate<PROG.start?`${PROG.name} started ${fmt(PROG.start)}.`:"No lift on the plan. Steps, stretch and protein still count."}</div>
            {isPast?<>
              <button type="button" style={bigBtn(false)} onClick={()=>setPicker({date:selDate})}>Log a session for {selLabel}</button>
            </>:<button type="button" style={bigBtn(false)} onClick={()=>setPicker({date:t})}>Start a session</button>}
          </>)}
        </section>

        {/* Session picker: any program session or a blank one, for today or the picked past day. */}
        <Sheet open={!!picker} onClose={()=>setPicker(null)} title={picker?.date===t?"Start a session":`Log a session for ${picker?fmt(picker.date):""}`}>
          {picker&&(()=>{const taken=data.wk?.[picker.date];const opts=[];
            dks.forEach(dk=>{const base=data.program?.[dk];if(!base?.exercises?.length)return;opts.push({dk,variant:null,s:base});
              Object.entries(PROG.variants?.[dk]||{}).forEach(([k,v])=>opts.push({dk,variant:k,s:v}));});
            return(<div>
              {taken&&<div style={{fontSize:15,color:C.t2,background:C.bg,borderRadius:8,padding:"10px 12px",marginBottom:10}}>{picker.date===t?"Today":fmt(picker.date)} already has {workoutLabel(taken,data.program)}. Finishing this one adds it to that day.</div>}
              {picker.date!==t&&<div style={{fontSize:15,color:C.t3,marginBottom:8}}>Type the sets you did. The clock is ignored for a past day.</div>}
              <div style={{borderTop:`1px solid ${C.bd}`}}>
                {opts.map(o=>(<button type="button" key={`${o.dk}-${o.variant||"std"}`} onClick={()=>startW(o.dk,{date:picker.date,variant:o.variant})}
                  style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,minHeight:56,background:"none",border:"none",borderBottom:`1px solid ${C.bd}`,cursor:"pointer",textAlign:"left",padding:"8px 2px"}}>
                  <span><span style={{display:"block",fontSize:17,fontWeight:500}}>{o.s.name}</span>
                    <span style={{display:"block",fontSize:15,color:C.t3,marginTop:2,...NUMS}}>{o.dk.charAt(0).toUpperCase()+o.dk.slice(1)}'s session · {o.s.exercises.length} lifts · {estTime(o.s)} min</span></span>
                  <span aria-hidden="true" style={{color:C.t4,fontSize:20}}>›</span>
                </button>))}
                <button type="button" onClick={()=>startManualW(picker.date)} style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",minHeight:56,background:"none",border:"none",borderBottom:`1px solid ${C.bd}`,cursor:"pointer",textAlign:"left",padding:"8px 2px"}}>
                  <span><span style={{display:"block",fontSize:17,fontWeight:500}}>Blank session</span><span style={{display:"block",fontSize:15,color:C.t3,marginTop:2}}>Add lifts as you go</span></span>
                  <span aria-hidden="true" style={{color:C.t4,fontSize:20}}>›</span>
                </button>
              </div>
            </div>);})()}
        </Sheet>
        {/* Also today */}
        <H2>Also today</H2>
        <div style={{marginTop:6}}>
          <Row title="Evening stretch"
            sub={mobDone?(mobEntry?.skipped?"Skipped today":`Done${mobEntry?.dur?` · ${fmtElapsed(mobEntry.dur)}`:""}`):mobRunning?`In progress · ${fmtElapsed(mobTimer)}`:`${stretchMins} min · ${mobExercises.length} poses`}
            onClick={mobDone?undefined:()=>{if(!mobRunning)startMob();setShowMob(true);}}
            right={mobDone?<button type="button" style={link} onClick={e=>{e.stopPropagation();undoMob();}}>Undo</button>
              :<><button type="button" style={link} onClick={e=>{e.stopPropagation();skipMob();}}>Skip</button><span style={{color:mobRunning?C.p:C.t2,fontWeight:500,fontSize:16}}>{mobRunning?"Resume":"Start"} ›</span></>}/>
          <Row last={!showCardio} title={cardioToday?.done?"Cardio":todayCardioPlan?todayCardioPlan.label:"Cardio"}
            sub={cardioToday?.done?cardioSummary(cardioToday):todayCardioPlan?`${todayCardioPlan.duration} min · ${intensityLabel(todayCardioPlan.intensity)}`:"Treadmill, stairs, bike or a walk"}
            onClick={showCardio||cardioToday?.done?undefined:()=>openCardioLog(todayCardioPlan||undefined)}
            right={cardioToday?.done?<><span style={{color:C.g}}>Done</span><button type="button" style={link} onClick={editCardio}>Edit</button><button type="button" style={link} onClick={undoCardio}>Undo</button></>
              :showCardio?null:<span style={{color:C.t2,fontWeight:500,fontSize:16}}>Log ›</span>}/>
          {showCardio&&<div style={{borderBottom:`1px solid ${C.bd}`,paddingBottom:12}}>{renderCardioForm()}</div>}
        </div>

    {/* ═══ LIFT PROGRESS · best set per week vs the plan ═══ */}
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
        if(!wks.length)return{name:shortName(ex.name),vals:[],status:"No logs yet",sc:C.t3,stroke:C.t3,pts:"",exp:""};
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
        if(vals.length<2){status="Logging";sc=C.t3;stroke=C.t;}
        else if(last<first&&trail>=3){status=`Down ${trail} weeks`;sc=C.t2;stroke=C.t2;}
        else if(last>first){stroke=C.t;sc=C.g;status=ex.anchor?(last>=expVals[expVals.length-1]?`Ahead · +${inc} next week`:"On pace"):"On pace";}
        else{stroke=C.t2;sc=C.t2;status=`Holding ${trail} week${trail>1?"s":""}`;}
        return{name:shortName(ex.name),status,sc,stroke,pts,exp,vals};
      });
      if(!rows.some(r=>(r.vals||[]).length>=2))return null;
      return(<section style={{marginTop:28}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
          <h2 style={{fontSize:15,fontWeight:500,color:C.t3}}>Lift progress · week {nowWk+1}</h2>
          <div role="group" aria-label="Lift group" style={{display:"flex"}}>
            {["upper","lower"].map(tb=>{const on=liftTab===tb;return(<button type="button" key={tb} aria-pressed={on} onClick={()=>setLiftTab(tb)} style={{background:"none",border:"none",color:on?C.t:C.t3,fontWeight:on?500:400,fontSize:15,padding:"8px 6px",minHeight:36,cursor:"pointer"}}>{tb==="upper"?"Upper":"Lower"}</button>);})}
          </div>
        </div>
        <div style={{borderTop:`1px solid ${C.bd}`}}>
          {rows.map(r=>(<div key={r.name} style={{display:"flex",alignItems:"center",gap:12,minHeight:48,borderBottom:`1px solid ${C.bd}`}}>
            <div style={{width:72,fontSize:16,color:C.t}}>{r.name}</div>
            <svg viewBox="0 0 120 26" preserveAspectRatio="none" style={{flex:1,height:26}} aria-hidden="true">
              {r.exp&&<polyline points={r.exp} fill="none" stroke={C.t4} strokeWidth="1" strokeDasharray="3,3" vectorEffect="non-scaling-stroke"/>}
              {r.pts&&<polyline points={r.pts} fill="none" stroke={r.stroke} strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>}
            </svg>
            <div style={{fontSize:15,color:r.sc,whiteSpace:"nowrap",minWidth:84,textAlign:"right"}}>{r.status}</div>
          </div>))}
        </div>
        <div style={{fontSize:13,color:C.t3,marginTop:8}}>Solid line is your best set each week. Dashed is the plan. On a cut, holding is a win.</div>
      </section>);})()}

        {/* History: one month at a time. Calendar on top (Monday first, like the
            week strip), that month's workouts listed under it. */}
        {(()=>{
          const mk=`${calYear}-${String(calMonth+1).padStart(2,"0")}`;
          const monthWk=allWk.filter(([d])=>d.startsWith(mk));
          const first=new Date(calYear,calMonth,1),days=new Date(calYear,calMonth+1,0).getDate();
          const pad=(first.getDay()+6)%7;
          const cells=[...Array(pad).fill(null),...Array.from({length:days},(_,i)=>i+1)];
          const step=dir=>{let m=calMonth+dir,y=calYear;if(m<0){m=11;y--;}if(m>11){m=0;y++;}setCalMonth(m);setCalYear(y);};
          const atNow=calYear===now.getFullYear()&&calMonth===now.getMonth();
          const navBtn={background:"none",border:"none",color:C.t2,fontSize:20,cursor:"pointer",minWidth:44,minHeight:44};
          return(<>
            <H2 right={<div style={{display:"flex",alignItems:"center"}}>
              <button type="button" aria-label="Previous month" style={navBtn} onClick={()=>step(-1)}>‹</button>
              <span style={{fontSize:16,fontWeight:500,color:C.t,minWidth:72,textAlign:"center"}}>{monthNames[calMonth]} {calYear}</span>
              <button type="button" aria-label="Next month" style={{...navBtn,opacity:atNow?0.3:1}} disabled={atNow} onClick={()=>step(1)}>›</button>
            </div>}>History</H2>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",rowGap:2,marginTop:6,textAlign:"center"}}>
              {["M","T","W","T","F","S","S"].map((d,i)=><div key={i} style={{fontSize:13,color:C.t3,padding:"4px 0"}}>{d}</div>)}
              {cells.map((d,i)=>{if(!d)return <div key={`e${i}`}/>;
                const dk=`${mk}-${String(d).padStart(2,"0")}`;const w=data.wk?.[dk];const mob=!!(data.mob?.[dk]?.done&&!data.mob?.[dk]?.skipped)||data.mob?.[dk]===true;const isT=dk===t;
                return(<button type="button" key={dk} disabled={!w} onClick={()=>w&&setViewW([dk,w])} aria-label={`${fmt(dk)}${w?`, ${workoutLabel(w,data.program)}`:""}`}
                  style={{minHeight:44,background:"none",border:isT?`1px solid ${C.p}`:"1px solid transparent",borderRadius:8,cursor:w?"pointer":"default",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3,padding:0}}>
                  <span style={{fontSize:16,color:w?C.t:C.t3,fontWeight:w?500:400,fontVariantNumeric:"tabular-nums"}}>{d}</span>
                  <span style={{display:"flex",gap:2,height:5}}>{w&&<span style={{width:5,height:5,borderRadius:3,background:C.g}}/>}{mob&&<span style={{width:5,height:5,borderRadius:3,background:C.t4}}/>}</span>
                </button>);})}
            </div>
            <div style={{fontSize:13,color:C.t3,marginTop:4,display:"flex",gap:14}}><span><span style={{display:"inline-block",width:6,height:6,borderRadius:3,background:C.g,marginRight:5}}/>Workout</span><span><span style={{display:"inline-block",width:6,height:6,borderRadius:3,background:C.t4,marginRight:5}}/>Stretch</span></div>
            <div style={{marginTop:10}}>
              {monthWk.length===0&&<div style={{fontSize:16,color:C.t3,padding:"12px 0",borderTop:`1px solid ${C.bd}`}}>No workouts this month.</div>}
              {monthWk.map(([d,w],i)=>{const n=(w.exercises||[]).reduce((s,e)=>s+(e.sets||[]).filter(saneSet).length,0);const du=cleanDur(w.dur);return(
                <Row key={d} last={i===monthWk.length-1} title={workoutLabel(w,data.program)} sub={`${fmt(d)}${du?` · ${du} min`:""} · ${n} sets`} onClick={()=>setViewW([d,w])} right={<span aria-hidden="true" style={{color:C.t4,fontSize:20}}>›</span>}/>);})}
            </div>
          </>);})()}
      </>);
    })()}

  </div>);
};

export { Training };
