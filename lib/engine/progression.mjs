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
export const nextWeightFromSets=(sets,pe)=>{const matching=setsInRange(completedSets(sets),pe?.rr);if(!matching.length)return null;const cw=Number(matching[0].weight);// Same rule as applyWorkout: on a cut only anchors move up; everything else holds.
  const may=!!pe?.anchor||!CUT_HOLD_PROGRESSION;return may&&pe?.inc>0&&hitTopOfRange(matching,pe.rr,pe.sets)?cw+pe.inc:cw;};

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

// ── Rest between sets ── One rule, from the lift actually done and the slot's rep
// range (the day's objective): compounds rest longest, lower body longer than upper,
// a 5-8 range longer than 8-12+; isolation rests 60 s, 90 s for leg isolation or a
// heavy (5-8) range. Longer rest keeps reps and load up, which is what holds muscle
// on a cut. A slot rest of 0 chains a superset and always stays 0.
const UPPER_COMPOUND=["chest-press","horizontal-pull","vertical-pull","vertical-press"];
const LOWER_COMPOUND=["squat","hinge"];
const LEG_ISOLATION=["leg-curl","knee-extension","glute"];
export const ruleRest=(ex,rr=ex?.rr)=>{
  const p=exLibById[ex?.id]?.pattern||ex?.pattern||"";
  const heavy=(rr?.[0]??8)<=6;
  if(LOWER_COMPOUND.includes(p))return heavy?180:150;
  if(UPPER_COMPOUND.includes(p))return heavy?150:120;
  if(LEG_ISOLATION.includes(p)||heavy)return 90;
  return p?60:(ex?.rest??90);
};
// Rest for a session slot. The plan's (or Coach's) number stands for the planned
// lift; a swapped-in lift gets the rule for itself, never the old lift's rest.
export const restFor=(slot,swappedTo)=>{
  if(slot?.rest===0)return 0;
  if(swappedTo&&swappedTo.id!==slot?.id)return ruleRest(swappedTo,slot?.rr);
  return Number.isFinite(slot?.rest)?slot.rest:ruleRest(slot);
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
      return {...opt,sets:slotEx.sets,rr:slotEx.rr,rest:restFor(slotEx,opt),notes:slotEx.notes,progKey:key,recommended:score>=48,score};
    })
    .sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name));
};

const deloadWeight=w=>Math.round(w*0.5/5)*5;
// Target reps per set: what a coach would write on the card, not a copy of last time.
// Same weight → one more rep than last time on that set, up to the top of the range.
// Weight just went up → two under the top (room to build). Weight came down → the top.
// No history, deload, or a stray set below the range → the bottom of the range.
export const targetReps=(slot,weight,last,{isDeload=false}={})=>{
  const n=slot?.sets||1;const [lo,hi]=slot?.rr?.length===2?slot.rr:[8,12];
  const lastW=Number(last?.[0]?.weight)||0,w=Number(weight)||0;
  if(isDeload||!last?.length)return Array(n).fill(lo);
  if(w>lastW)return Array(n).fill(Math.max(lo,hi-2));
  if(w<lastW)return Array(n).fill(hi);
  return Array.from({length:n},(_,i)=>{const r=Number((last[i]||last[last.length-1])?.reps)||0;return r>=lo?Math.min(hi,r+1):lo;});
};
// RIR starts empty: last time's effort is not today's.
const prefillSets=(count,wt,reps)=>Array.from({length:count},(_,si)=>({weight:wt,reps:reps[si],rir:"",prefilled:true,done:false}));

// Build one exercise entry for a live session from a plan slot.
export const buildExerciseEntry=(data,slot,{isDeload=false,withWarmup=true,extra={}}={})=>{
  const key=progKey(slot,slot);
  const cw=resolveWeight(data,{...slot,progKey:key},slot.sw,slot);
  const wt=isDeload?deloadWeight(cw):cw;
  const last=lastSessionSets(data,key,slot.id);
  return{id:slot.id,progKey:key,...extra,
    wu:withWarmup?WU(wt).map(w=>({...w,done:false})):[],
    sets:prefillSets(slot.sets,wt,targetReps(slot,wt,last,{isDeload}))};
};

// Start-of-session plan. Accepted auto-regulation (−1 set on non-anchor
// accessories) mutates today's plan only; the stored program is never touched.
export const buildSession=(data,day,sess,{date=td(),variant=null,now=Date.now()}={})=>{
  if(!sess)return null;
  const isDeload=wkn(date)===PROG.deload;
  const autoregToday=data.autoregLog?.[date]?.type==="minusOneSet";
  return{day,date,variant,isDeload,start:now,backfill:date<td(),exercises:sess.exercises.map(ex=>{
    const effSets=autoregToday&&!ex.anchor?Math.max(1,ex.sets-1):ex.sets;
    const slot={...ex,sets:effSets};
    return buildExerciseEntry(data,slot,{isDeload,extra:{slot}});
  })};
};

// Manual-session slot from a library exercise: 3×8-12, rest by the rule.
export const manualSlot=(opt)=>({id:opt.id,name:opt.name,sets:3,rr:[8,12],rest:ruleRest(opt,[8,12]),sw:opt.sw,inc:opt.inc,unit:opt.unit,cue:opt.cue,pattern:opt.pattern,region:opt.region});

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
    const pe=ex.slot||sess?.exercises?.[i];if(!pe)return;
    const active=ex.swappedTo?{...ex.swappedTo,sets:pe.sets,rr:pe.rr,rest:restFor(pe,ex.swappedTo)}:pe;
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
    if(prev.lastDate&&prev.lastDate>date){
      // An older session logged late: keep the newer current weight and last session,
      // only file its e1RM point (and PR) in date order.
      const hist=entry.e1rmHistory.slice().sort((a,b)=>a.date.localeCompare(b.date)).slice(-12);
      nd.prog[aid]={...prev,e1rmHistory:hist,pr:entry.pr};touched.push(aid);return;
    }
    nd.prog[aid]=entry;touched.push(aid);
  });
  return{data:nd,prs,touched,log:nd.wk[date]};
};

// ═══ WORKOUT HISTORY LABELS ═══
// A saved workout stores only its weekday and exercise ids. Programs change
// block to block, so a name must come from the log itself, never from the
// current program by position.
const LOWER_PAT=new Set(["squat","hinge","leg-curl","calf","glute","knee-extension"]);
const ARM_PAT=new Set(["biceps","triceps","brachialis","forearms"]);
export const exerciseName=id=>exLibById[id]?.name||String(id||"").replace(/-/g," ").replace(/^./,c=>c.toUpperCase());
// Name a logged workout. Uses the stored name if any; else the program day it
// matches (at least half its lifts in common); else Upper/Lower/Arms/Full body
// from the lift patterns; else "Workout".
export const workoutLabel=(log,program)=>{
  if(log?.name)return log.name;
  const ids=(log?.exercises||[]).map(e=>e.id).filter(Boolean);
  if(!ids.length)return"Workout";
  const day=program?.[log.day];
  if(day?.exercises?.length){const want=new Set(day.exercises.map(e=>e.id));const hit=ids.filter(id=>want.has(id)).length;
    if(hit>=Math.ceil(Math.max(ids.length,want.size)/2))return day.name;}
  const pats=ids.map(id=>exLibById[id]?.pattern).filter(Boolean);
  if(!pats.length)return"Workout";
  const lower=pats.filter(p=>LOWER_PAT.has(p)).length,arms=pats.filter(p=>ARM_PAT.has(p)).length,upper=pats.length-lower-arms;
  if(arms>pats.length/2)return"Arms";
  if(lower>=pats.length*0.6)return"Lower body";
  if(upper+arms>=pats.length*0.6)return"Upper body";
  return"Full body";
};
// Durations over 4 hours are a forgotten Finish, not a workout. Show nothing.
export const cleanDur=d=>{const n=Number(d);return n>0&&n<=240?Math.round(n):null;};

// What to lift today, in plain words, for one program slot. Today, the Train plan and the
// session all show this, so "what weight?" has one answer. weight is what the session prefills.
export const liftTarget=(data,slot,{isDeload=false}={})=>{
  const key=progKey(slot,slot);
  const cw=resolveWeight(data,{...slot,progKey:key},slot.sw,slot);
  const weight=isDeload?deloadWeight(cw):cw;
  const bw=!(weight>0);
  const top=slot.rr?.[1],bottom=slot.rr?.[0];
  const last=lastSessionSets(data,key,slot.id);
  const lastTxt=last?.length?`${Number(last[0].weight)>0?Number(last[0].weight):"BW"} × ${last.map(s=>s.reps).join(", ")}`:null;
  const mayProgress=!!slot.anchor||!CUT_HOLD_PROGRESSION;
  // The prefilled reps (targetReps) and this sentence say the same thing.
  const reps=targetReps(slot,weight,last,{isDeload});
  const lastW=Number(last?.[0]?.weight)||0;
  const upRule=mayProgress&&slot.inc>0&&top?` Get ${top} on ${slot.sets===2?"both sets":`all ${slot.sets} sets`} and it goes up ${slot.inc} lb.`:"";
  const goal=isDeload?"Deload: lighter, stop well short of failure."
    :!last?.length?`First time at this weight: ${bottom} reps a set, clean form.${upRule}`
    :!bw&&weight>lastW?`New weight, up from ${lastW}. Start at ${reps[0]} reps and build.${upRule}`
    :reps.every(r=>r>=top)&&last.every(x=>Number(x.reps)>=top)?(upRule?`You hit ${top} on every set last time.${upRule}`:`Same weight. You hit ${top} on every set last time, so match it with clean reps.`)
    :`${bw?"Body weight":"Same weight"}. One more rep than last time on each set, up to ${top}.${upRule}`;
  const aim=reps.every(r=>r===reps[0])?`${slot.sets} × ${reps[0]}`:reps.join(", ");
  return{reps,aim,weight:bw?0:weight,unit:bw?"BW":(/^lbs?$/i.test(slot.unit||"lb")?"lb":slot.unit),sets:slot.sets,rr:slot.rr,rangeTxt:bottom!=null?(bottom===top?`${bottom}`:`${bottom}–${top}`):"",last:lastTxt,goal,anchor:!!slot.anchor};
};
