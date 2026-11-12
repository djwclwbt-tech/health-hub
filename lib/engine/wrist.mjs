// ═══ ENGINE · WRIST ═══ The Garmin gym app's two messages, as small JSON the watch
// gets parsed for free (Communications.makeWebRequest through Garmin Connect).
// wristPlan turns today's session (buildSession, so weights, reps and rest are the
// app's own) into arrays a 128 KB watch can hold. applyWristLog turns the watch's log
// back into a workout and runs applyWorkout. Format: docs/garmin-2026-11/design.md.
import {PROG,exLibById} from "./program.mjs";
import {td,dw} from "./dates.mjs";
import {buildSession,buildExerciseEntry,manualSlot,restFor,applyWorkout,exerciseName,liftTarget} from "./progression.mjs";

export const WRIST_VERSION=1;
// The watch draws with system fonts: plain ASCII only.
export const wristText=(s,max=40)=>String(s??"").replace(/[·–—]/g,"-").replace(/×/g,"x").replace(/[^\x20-\x7e]/g," ").replace(/\s+/g," ").trim().slice(0,max).trim();
const num=v=>{const n=Number(v);return Number.isFinite(n)?Math.round(n*10)/10:0;};
// Short unit label for a 240 px screen. Weight 0 always means body weight.
export const wristUnit=u=>u==="BW"?"BW":/assist/.test(u||"")?"asst":/hand/.test(u||"")?"ea":/side/.test(u||"")?"side":"";
// Lift names fit one line at the 245's medium font (about 16 characters). Cut at a word.
export const wristName=n=>{const t=wristText(n,60);if(t.length<=18)return t;const cut=t.slice(0,18);const sp=cut.lastIndexOf(" ");return(sp>8?cut.slice(0,sp):cut).trim();};
// FNV-1a: a short, stable id for a plan, so a log can say which plan it followed.
const fnv=s=>{let h=0x811c9dc5;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}return h.toString(36);};

const sessFor=(data,day,variant)=>(variant&&PROG.variants?.[day]?.[variant])||data.program?.[day]||null;

// Set order for the whole session. rest:0 chains a lift to the next one (a superset);
// sets inside a chain go round-robin, the same rule as sessionCursor. rest is what
// to wait after that set: the slot's own number, 0 inside a chain, 0 after the last set.
export const wristSteps=exs=>{
  const restOf=i=>restFor(exs[i].slot);
  const groups=[];for(let i=0;i<exs.length;){const grp=[i];while(restOf(grp[grp.length-1])===0&&i+1<exs.length){i++;grp.push(i);}i++;groups.push(grp);}
  const steps=[];
  groups.forEach(grp=>{const maxSets=Math.max(...grp.map(m=>exs[m].sets.length));
    for(let si=0;si<maxSets;si++)grp.forEach(m=>{if(exs[m].sets[si])steps.push([m,si,restOf(m)]);});});
  if(steps.length)steps[steps.length-1][2]=0;
  return steps;
};

// GET side. A day with no session is a plan with no lifts, so the watch says
// "Rest day" instead of showing yesterday's plan.
//   {v,id,date,day,name,ex:[{i,n,w,u,st,r:[reps],g}],seq:[[exIdx,setIdx,restSec]]}
// i = exercise id, n = name, w = weight (0 = body weight), u = unit, st = weight step,
// g = the engine's goal line (liftTarget), so the wrist and the app say the same thing.
export const wristPlan=(data,{date=td(),day=null,variant=null,now=Date.now()}={})=>{
  const d=day||dw(date);
  const sess=sessFor(data,d,variant);
  const session=sess?.exercises?.length?buildSession(data,d,sess,{date,variant,now}):null;
  const exs=session?.exercises||[];
  const ex=exs.map(e=>{const s=e.slot;
    return{i:wristText(e.id,48),n:wristName(s.name||exerciseName(e.id)),w:num(e.sets[0]?.weight),u:wristUnit(s.unit),st:num(s.inc>0?s.inc:5),
      r:e.sets.map(x=>Number(x.reps)||0),g:wristText(liftTarget(data,s,{isDeload:!!session.isDeload})?.goal,90)};});
  const seq=wristSteps(exs);
  const name=sess?wristText(sess.name,40):"Rest day";
  const id=fnv(JSON.stringify([date,d,variant||"",ex,seq]));
  return{plan:{v:WRIST_VERSION,id,date,day:d,name,ex,seq},session};
};

// Parse the watch's log. Throws on anything malformed: a bad log is refused whole,
// never half applied.
//   {v,id,plan,date,day,t0,t1,d:[[exIdx,exId,setIdx,weight,reps,atSec,hrAvg,hrMax]],k:[[exIdx,setIdx]]}
export const parseWristLog=body=>{
  const b=body&&typeof body==="object"?body:{};
  if(Number(b.v)!==WRIST_VERSION)throw new Error(`unsupported version ${b.v}`);
  const logId=String(b.id??"");
  if(!/^[a-z0-9]{4,32}$/i.test(logId))throw new Error("bad log id");
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(b.date)))throw new Error("bad date");
  if(!/^[a-z]+$/.test(String(b.day)))throw new Error("bad day");
  const s=Number(b.t0),e=Number(b.t1);
  if(!(s>1.5e9)||!(e>=s)||e-s>6*3600)throw new Error("bad times");
  const intIn=(v,lo,hi)=>{const n=Number(v);return Number.isInteger(n)&&n>=lo&&n<=hi?n:null;};
  if(!Array.isArray(b.d||[])||!Array.isArray(b.k||[]))throw new Error("bad set list");
  const done=(b.d||[]).map(r=>{
    const a=Array.isArray(r)?r:[];
    const ei=intIn(a[0],0,40),si=intIn(a[2],0,20),reps=intIn(a[4],1,100),w=Number(a[3]),at=Number(a[5]);
    if(ei==null||si==null||reps==null||!Number.isFinite(w)||w<0||w>1000||!(at>1.5e9))throw new Error(`bad set: ${JSON.stringify(r)}`);
    return{ei,id:wristText(a[1],48),si,weight:Math.round(w*10)/10,reps,at:at*1000,hr:intIn(a[6],30,240),hrMax:intIn(a[7],30,240)};
  });
  const skipped=(b.k||[]).map(r=>({ei:intIn(r?.[0],0,40),si:intIn(r?.[1],0,20)})).filter(k=>k.ei!=null&&k.si!=null);
  return{logId,planId:String(b.plan??""),date:b.date,day:b.day,start:s*1000,end:e*1000,done,skipped};
};

// Already applied? Every set a watch log writes carries its log id, so a resent log
// is recognised from the saved workout itself, with no separate receipt to get out of step.
export const wristLogApplied=(data,logId)=>Object.values(data?.wk||{}).some(w=>(w?.exercises||[]).some(e=>(e?.sets||[]).some(s=>s?.lid===logId)));

// POST side. Rebuilds the session from the program (so slots carry their rules), puts
// the watch's sets on it and runs applyWorkout. A lift is matched by its id, so a
// program edit between fetch and log cannot shift sets onto the wrong lift.
export const applyWristLog=(data,body)=>{
  const log=parseWristLog(body);
  if(wristLogApplied(data,log.logId))return{duplicate:true,parsed:log};
  if(!log.done.length)return{empty:true,parsed:log};
  const sess=sessFor(data,log.day,null)||{exercises:[]};
  const workout=buildSession(data,log.day,sess,{date:log.date,now:log.start})||{day:log.day,date:log.date,exercises:[],isDeload:false};
  workout.start=log.start;workout.backfill=false;
  const exs=workout.exercises;
  // The plan index from the watch is a hint; the id decides.
  const entryFor=(ei,id)=>{
    if(exs[ei]?.id===id)return exs[ei];
    const found=exs.find(x=>x.id===id);if(found)return found;
    const lib=exLibById[id];if(!lib)return null;
    const slot=manualSlot(lib);
    const entry=buildExerciseEntry(data,slot,{isDeload:!!workout.isDeload,withWarmup:false,extra:{slot}});
    entry.sets=[];exs.push(entry);return entry;
  };
  const dropped=[];const byEi={};
  log.done.forEach(st=>{
    const ex=entryFor(st.ei,st.id);if(!ex){dropped.push(st.id);return;}
    byEi[st.ei]=ex;
    const set={weight:st.weight,reps:st.reps,rir:"",done:true,at:st.at,src:"wrist",lid:log.logId};
    if(st.hr)set.hr=st.hr;if(st.hrMax)set.hrMax=st.hrMax;
    if(st.si<ex.sets.length)ex.sets[st.si]=set;else ex.sets.push(set);
  });
  log.skipped.forEach(k=>{const ex=byEi[k.ei]||exs[k.ei];const st=ex?.sets?.[k.si];if(st&&!st.done)ex.sets[k.si]={...st,skipped:true};});
  // Planned sets the watch never reached stay out; applyWorkout reads ex.slot, not position.
  workout.exercises=exs.filter(x=>x.sets.some(s=>s.done)).map(x=>({...x,sets:x.sets.filter(s=>s.done||s.skipped),wu:[]}));
  const res=applyWorkout(data,workout,sess,log.date,log.end);
  return{...res,parsed:log,dropped,workout};
};
