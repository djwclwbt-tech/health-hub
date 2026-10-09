// ═══ ENGINE · PROGRESSION ═══ Weight caps, e1RM, set rules, stalls, and the workout
// engine: resolveWeight, buildSession, swapOptions, sessionCursor, applyWorkout.
import {PROG,WU,EXERCISE_LIBRARY,exLibById,DEFAULTS} from "./program.mjs";
import {td,wkn} from "./dates.mjs";
import {progKey,legacyAmbiguousIds,saneSet} from "./state.mjs";
export const weightCap=ex=>{
  const p=(exLibById[ex?.id]?.pattern||ex?.pattern||"");
  const unit=ex?.unit||exLibById[ex?.id]?.unit||"";
  if(unit==="BW")return 0;
  if(["chest-fly","lateral-delt","rear-delt"].includes(p))return unit.includes("side")||unit.includes("hand")?60:120;
  if(["biceps","brachialis","triceps","forearms"].includes(p))return unit.includes("hand")?70:120;
  if(["chest-press"].includes(p))return unit.includes("hand")?100:350;
  if(["horizontal-pull","vertical-pull"].includes(p))return unit.includes("hand")?120:300;
  if(["vertical-press"].includes(p))return unit.includes("hand")?100:200;
  if(["leg-curl","knee-extension"].includes(p))return 220;
  if(["calf"].includes(p))return 450;
  if(["squat"].includes(p))return ex?.id==="leg-press"?700:405;
  if(["hinge"].includes(p))return 405;
  return 350;
};
export const saneWeight=(ex,w)=>w==null||Number(w)<=weightCap(ex);
export const cutStepsTarget=(settings)=>Math.max(Number(settings?.steps)||DEFAULTS.steps,DEFAULTS.steps);
export const CUT_HOLD_PROGRESSION=true;
export const matchingProgKeys=(ex)=>{
  if(!ex?.id)return[];
  const keys=[ex.id];
  if(ex.progKey)keys.unshift(ex.progKey);
  if(ex.rr)keys.unshift(progKey(ex,ex));
  return [...new Set(keys)];
};
export const getProgEntry=(prog,ex)=>matchingProgKeys(ex).map(k=>prog?.[k]).find(Boolean)||null;
export const getProgPr=(prog,ex)=>matchingProgKeys(ex).map(k=>prog?.[k]?.pr).filter(Boolean).sort((a,b)=>(b.e1rm||0)-(a.e1rm||0))[0]||null;
export const relatedPatterns={
  "chest-press":["chest-press"],"chest-fly":["chest-fly","chest-press"],
  "horizontal-pull":["horizontal-pull","vertical-pull"],"vertical-pull":["vertical-pull","horizontal-pull"],
  "vertical-press":["vertical-press"],"lateral-delt":["lateral-delt","rear-delt"],"rear-delt":["rear-delt","horizontal-pull"],
  "squat":["squat","knee-extension"],"knee-extension":["knee-extension","squat"],"hinge":["hinge","leg-curl"],"leg-curl":["leg-curl","hinge"],
  "calf":["calf"],"glute":["glute"],"biceps":["biceps","brachialis"],"brachialis":["brachialis","biceps"],"triceps":["triceps"],"forearms":["forearms","brachialis"]
};
// ═══ VOLUME & E1RM ═══
export const e1rm=(w,r)=>{w=Number(w)||0;r=Number(r)||0;return r<=0||w<=0?0:r===1?w:Math.round(w*(1+r/30));};
export const calcVolume=(exercises)=>(exercises||[]).reduce((t,ex)=>t+(ex?.sets||[]).filter(s=>s?.done).reduce((s,set)=>s+(Number(set.weight)||0)*(Number(set.reps)||0),0),0);

export const completedSets=sets=>(sets||[]).filter(saneSet);
// The set with the highest e1RM (one rule for history replay, finish and reports).
export const bestSetByE1rm=cs=>(cs||[]).reduce((best,s)=>best==null||e1rm(s.weight,s.reps)>e1rm(best.weight,best.reps)?s:best,null);
// Sets that count for a rep range: at least the bottom. Reps above the top count too (they beat it).
export const setsInRange=(cs,rr)=>rr?cs.filter(s=>Number(s.reps)>=rr[0]):cs;
// Every planned set done at (or above) the top of the range.
export const hitTopOfRange=(cs,rr,planned=1)=>!!rr&&cs.length>=(planned||1)&&cs.every(s=>Number(s.reps)>=rr[1]);
export const nextWeightFromSets=(sets,pe)=>{const matching=setsInRange(completedSets(sets),pe?.rr);if(!matching.length)return null;const cw=Number(matching[0].weight);return pe?.inc>0&&hitTopOfRange(matching,pe.rr,pe.sets)?cw+pe.inc:cw;};

// ═══ STALL DETECTION ═══
export const getStalls=(prog,wk,programDays)=>{
  // Cut mode: flag when weight DROPS on same lift for 2 consecutive sessions
  const days=programDays||PROG.days;
  const stalls=[];
  const programExIds=new Set(Object.values(days).flatMap(d=>d&&d.exercises||[]).map(e=>e.id));
  // One verdict per lift: id__rr rows go first, so a legacy plain-id row of the same lift is skipped.
  const seen=new Set();
  Object.entries(prog).sort(([a],[b])=>b.includes("__")-a.includes("__")).forEach(([id,p])=>{
    if(!p?.lastDate)return;
    const baseId=p.exerciseId||id.split("__")[0];
    if(!programExIds.has(baseId)||seen.has(baseId))return;
    seen.add(baseId);
    const sessions=Object.entries(wk)
      .filter(([_,w])=>w.exercises?.some(e=>e.id===baseId||e.progKey===id))
      .map(([d,w])=>{const ex=w.exercises.find(e=>e.id===baseId||e.progKey===id);const cs=ex?.sets?.filter(s=>s.done&&Number(s.weight)>0)||[];return cs.length?{date:d,weight:Math.max(...cs.map(s=>Number(s.weight)))}:null;})
      .filter(Boolean).sort((a,b)=>b.date.localeCompare(a.date));
    if(sessions.length<3)return;
    // Check if last 2 sessions both dropped weight vs the session before them
    const baseline=sessions[2].weight;
    if(sessions[0].weight<baseline&&sessions[1].weight<baseline){
      const exDef=Object.values(days).flatMap(d=>d&&d.exercises||[]).find(e=>e.id===baseId);
      const drop=baseline-sessions[0].weight;
      stalls.push({id,name:exDef?.name||p.name||baseId,weeks:2,currentWeight:sessions[0].weight,drop});
    }
  });
  return stalls;
};
// ═══ WORKOUT ENGINE · pure versions of what the Train deck does ═══
// Weight resolution: progression by lift + rep range, then history by progKey,
// then history by id within the rep range, then a legacy plain-id row (only for
// unambiguous lifts), then the program default. Every step is sanity-capped.
// History steps follow the same cut rule as applyWorkout: only anchors (or any
// lift when CUT_HOLD_PROGRESSION is off) add weight after a topped session.
export const resolveWeight=(data,exOrId,def,slot=null)=>{
  const ex=typeof exOrId==="string"?{id:exOrId,sw:def,rr:slot?.rr}:exOrId;
  const key=progKey(ex,slot||ex);
  const pe=slot||ex;const mayProgress=!!(pe.anchor||ex.anchor)||!CUT_HOLD_PROGRESSION;
  // strict: another rep track of the same lift only counts inside this track's range.
  const fromSets=(sets,rr,strict=false)=>{const cs=completedSets(sets);const ms=strict&&rr?cs.filter(s=>Number(s.reps)>=rr[0]&&Number(s.reps)<=rr[1]):setsInRange(cs,rr);if(!ms.length)return null;const w=Number(ms[0].weight);const inc=slot?.inc??ex.inc;return mayProgress&&inc>0&&hitTopOfRange(ms,rr,pe.sets)?w+inc:w;};
  const p=data.prog?.[key]?.currentWeight;
  if(p!=null&&saneWeight(ex,p))return p;
  const dates=Object.keys(data.wk||{}).sort().reverse();
  for(const d of dates){
    const wex=data.wk[d].exercises?.find(e=>e.progKey===key);
    if(wex){const next=fromSets(wex.sets,pe.rr);if(next!=null&&saneWeight(ex,next))return next;}
  }
  const targetRr=(slot?.rr||ex.rr);
  for(const d of dates){
    const wex=data.wk[d].exercises?.find(e=>e.id===ex.id);
    if(wex){const next=fromSets(wex.sets,targetRr,true);if(next!=null&&saneWeight(ex,next))return next;}
  }
  if(!legacyAmbiguousIds.has(ex.id)){
    const lp=data.prog?.[ex.id];
    if((lp?.lastReps||[]).some(r=>Number(r)>0)&&lp?.currentWeight!=null&&saneWeight(ex,lp.currentWeight))return lp.currentWeight;
  }
  return def;
};

// Last session's completed sets for a lift (progKey first, then id) · feeds prefill.
export const lastSessionSets=(data,key,id)=>{
  const dates=Object.keys(data.wk||{}).sort().reverse();
  for(const dt of dates){
    const wex=data.wk[dt]?.exercises?.find(e=>(key&&e.progKey===key)||(id&&e.id===id));
    if(wex?.sets?.some(saneSet))return wex.sets.filter(saneSet);
  }
  return null;
};

// Plan-safe substitutions: same or related movement pattern, not already in the
// session, best fit first (same pattern > same region > has history).
export const swapOptions=(data,workout,slotEx,currentEx)=>{
  const base=exLibById[currentEx.id]||exLibById[slotEx.id]||slotEx;
  const pats=relatedPatterns[base.pattern]||[base.pattern].filter(Boolean);
  const used=new Set((workout?.exercises||[]).map(e=>e.id));
  return EXERCISE_LIBRARY
    .filter(opt=>!opt.off&&opt.id!==currentEx.id&&pats.includes(opt.pattern)&&!used.has(opt.id))
    .map(opt=>{
      const key=progKey(opt,slotEx);
      const hasHistory=data.prog?.[key]?.currentWeight!=null||data.prog?.[opt.id]?.currentWeight!=null||Object.values(data.wk||{}).some(w=>w.exercises?.some(e=>e.progKey===key||e.id===opt.id));
      const score=(opt.pattern===base.pattern?40:20)+(opt.region===base.region?10:0)+(hasHistory?8:0);
      return {...opt,sets:slotEx.sets,rr:slotEx.rr,rest:slotEx.rest,notes:slotEx.notes,progKey:key,recommended:score>=48,score};
    })
    .sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name));
};

const deloadWeight=w=>Math.round(w*0.5/5)*5;
const prefillSets=(count,wt,last,topReps)=>Array.from({length:count},(_,si)=>({weight:wt,
  reps:Number(last?.[si]?.reps)>0?Number(last[si].reps):(topReps||0),
  rir:last?.[si]?.rir??"",prefilled:true,done:false}));

// Build one exercise entry for a live session from a plan slot.
export const buildExerciseEntry=(data,slot,{isDeload=false,withWarmup=true,extra={}}={})=>{
  const key=progKey(slot,slot);
  const cw=resolveWeight(data,{...slot,progKey:key},slot.sw,slot);
  const wt=isDeload?deloadWeight(cw):cw;
  const last=lastSessionSets(data,key,slot.id);
  return{id:slot.id,progKey:key,...extra,
    wu:withWarmup?WU(wt).map(w=>({...w,done:false})):[],
    sets:prefillSets(slot.sets,wt,last,slot.rr?.[1])};
};

// Start-of-session plan. Accepted auto-regulation (−1 set on non-anchor
// accessories) mutates today's plan only; the stored program is never touched.
export const buildSession=(data,day,sess,{date=td(),variant=null,now=Date.now()}={})=>{
  if(!sess)return null;
  const isDeload=wkn(date)===PROG.deload;
  const autoregToday=data.autoregLog?.[date]?.type==="minusOneSet";
  return{day,date,variant,isDeload,start:now,exercises:sess.exercises.map(ex=>{
    const effSets=autoregToday&&!ex.anchor?Math.max(1,ex.sets-1):ex.sets;
    return buildExerciseEntry(data,{...ex,sets:effSets},{isDeload});
  })};
};

// Manual-session slot from a library exercise: 3×8-12, 90 s rest.
export const manualSlot=(opt)=>({id:opt.id,name:opt.name,sets:3,rr:[8,12],rest:90,sw:opt.sw,inc:opt.inc,unit:opt.unit,cue:opt.cue,pattern:opt.pattern,region:opt.region});

// Superset groups: rest:0 chains an exercise to the next (1A → 1B); sets inside a
// group interleave round-robin. Returns index groups and the current (ei,si).
export const sessionCursor=(exs,restOf)=>{
  const groups=[];for(let i=0;i<exs.length;){const grp=[i];while(restOf(grp[grp.length-1])===0&&i+1<exs.length){i++;grp.push(i);}i++;groups.push(grp);}
  let curEi=-1,curSi=-1;
  for(const grp of groups){
    if(curEi>=0)break;
    const maxSets=Math.max(...grp.map(m=>exs[m].sets.length));
    for(let si=0;si<maxSets&&curEi<0;si++)for(const m of grp){const st=exs[m].sets[si];if(st&&!st.done&&!st.skipped){curEi=m;curSi=si;break;}}
  }
  return{groups,curEi,curSi};
};

const progressionStamp=(row)=>row?.lastDate||row?.last_date||row?.updatedAt||row?.updated_at||row?.createdAt||row?.created_at||"";
export const mergeProgression=(local={},cloud={})=>{
  const out={...(cloud||{})};
  Object.entries(local||{}).forEach(([k,localRow])=>{
    const cloudRow=out[k];
    if(!cloudRow){out[k]=localRow;return;}
    const ld=progressionStamp(localRow),cd=progressionStamp(cloudRow);
    if(!cd||(ld&&ld>cd))out[k]=localRow;
  });
  return out;
};

const normalizeWorkoutSession=(log)=>({
  day:log?.day,variant:log?.variant||null,manual:!!log?.manual,exercises:log?.exercises||[],dur:log?.dur||0,volume:log?.volume??calcVolume(log?.exercises||[])
});
const mergeWorkoutLog=(existing,next)=>{
  if(!existing)return next;
  const sessions=[...(existing.sessions||[normalizeWorkoutSession(existing)]),normalizeWorkoutSession(next)];
  return{...next,day:"multi",variant:null,manual:sessions.every(s=>s.manual),sessions,exercises:sessions.flatMap(s=>s.exercises||[]),dur:sessions.reduce((n,s)=>n+(s.dur||0),0),volume:sessions.reduce((n,s)=>n+(s.volume??calcVolume(s.exercises||[])),0)};
};

// Finish: write the log, advance progression per the cut rules (anchors
// progress on a full top-of-range session, accessories hold and take rep PRs,
// deload never moves weight), refresh e1RM history and PRs. Pure: returns the
// new data object plus what changed, so the caller decides what to persist.
export const applyWorkout=(data,workout,sess,date=td(),now=Date.now())=>{
  const nd={...data,prog:{...(data.prog||{})},wk:{...(data.wk||{})}};
  const prs=[];const touched=[];
  const dur=Math.round((now-workout.start)/6e4);
  const sessionLog={day:workout.day,variant:workout.variant||null,manual:workout.manual||false,exercises:workout.exercises,dur};
  sessionLog.volume=calcVolume(workout.exercises);
  nd.wk[date]=mergeWorkoutLog(nd.wk[date],sessionLog);
  workout.exercises.forEach((ex,i)=>{
    const pe=sess?.exercises?.[i]||ex.slot;if(!pe)return;
    const active=ex.swappedTo?{...ex.swappedTo,sets:pe.sets,rr:pe.rr,rest:pe.rest}:pe;
    const aid=ex.progKey||progKey(active,pe);
    const ainc=active.inc??pe.inc;
    const aname=active.name||pe.name;
    const asw=active.sw??pe.sw;
    const cs=ex.sets.filter(saneSet);
    if(!cs.length)return;
    const hit=hitTopOfRange(cs,pe.rr,pe.sets);
    const cw=Number(cs[0].weight)>0?Number(cs[0].weight):Number(resolveWeight(data,active,asw,pe))||0;
    const prev=nd.prog[aid]||{};
    const prevPr=prev.pr;const prevHistory=prev.e1rmHistory||[];
    const prevWeight=prev.currentWeight||resolveWeight(data,active,asw,pe);
    const isAnchor=!!(pe.anchor||active.anchor);
    const shouldProgress=(isAnchor||!CUT_HOLD_PROGRESSION)&&!workout.isDeload&&hit&&ainc>0;
    const newWeight=workout.isDeload?prevWeight:(shouldProgress?cw+ainc:cw);
    const entry={currentWeight:newWeight,lastReps:cs.map(s=>Number(s.reps)),lastDate:date,progressed:shouldProgress,pr:prevPr||null,e1rmHistory:prevHistory,exerciseId:active.id,repRange:pe.rr,name:aname};
    if(!workout.isDeload){
      const bestSet=bestSetByE1rm(cs);const bw=Number(bestSet.weight)||0,br=Number(bestSet.reps)||0;
      const newE1rm=e1rm(bw,br);
      if(newE1rm>0){
        entry.e1rmHistory=[...prevHistory,{date,e1rm:newE1rm}].slice(-12);
        if(!prevPr||newE1rm>prevPr.e1rm){entry.pr={name:aname,weight:bw,reps:br,e1rm:newE1rm,date};if(prevPr)prs.push({name:aname,weight:bw,reps:br,e1rm:newE1rm,prev:prevPr.e1rm});}
      }
    }
    nd.prog[aid]=entry;touched.push(aid);
  });
  return{data:nd,prs,touched,log:nd.wk[date]};
};
