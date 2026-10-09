// ═══ ENGINE · MIGRATIONS ═══ One-shot and boot normalizers (history backfill, prune,
// deload repair, block comeback weights). Delete each when its data is gone.
import {PROG} from "./program.mjs";
import {wkn} from "./dates.mjs";
import {progKey,legacyAmbiguousIds} from "./state.mjs";
import {e1rm,calcVolume,completedSets,bestSetByE1rm,setsInRange,nextWeightFromSets} from "./progression.mjs";
export const BACKFILL_VERSION=2;
export const backfillData=(d)=>{
  Object.entries(d.wk||{}).forEach(([date,w])=>{if(!w.volume&&w.exercises){try{w.volume=calcVolume(w.exercises);}catch(e){}}});
  // History replay is a versioned one-shot. It previously ran on every load and
  // paired logged exercises to program exercises BY SLOT INDEX, so any program
  // mutation (swap/add/remove/reorder) wrote historical sets into the wrong lift.
  if((d.backfillVersion||0)>=BACKFILL_VERSION)return d;
  if(d.prog["seated-leg-curl"]&&!d.prog["lying-leg-curl"]){d.prog["lying-leg-curl"]=d.prog["seated-leg-curl"];delete d.prog["seated-leg-curl"];}
  const allDays={...PROG.days,...(d.program||{})};
  const byProgKey={},byId={};
  Object.values(allDays).forEach(day=>(day.exercises||[]).forEach(pe=>{
    const k=progKey(pe,pe);if(!byProgKey[k])byProgKey[k]=pe;if(!byId[pe.id])byId[pe.id]=pe;}));
  Object.entries(d.wk||{}).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([date,w])=>{
    if(!w.exercises)return;
    w.exercises.forEach(ex=>{
      // Identity pairing only: progKey, else exercise id. Unknown -> skip, never guess.
      const pe=(ex.progKey&&byProgKey[ex.progKey])||(ex.id&&byId[ex.id])||null;
      if(!pe||!ex.sets)return;
      const key=ex.progKey||progKey(pe,pe);
      const cs=completedSets(ex.sets);if(!cs.length)return;
      const bestSet=bestSetByE1rm(cs);
      const newE1rm=e1rm(bestSet.weight,bestSet.reps);if(newE1rm<=0)return;
      const nextWeight=nextWeightFromSets(ex.sets,pe);
      if(!d.prog[key])d.prog[key]={currentWeight:nextWeight??bestSet.weight,lastReps:cs.map(s=>s.reps),lastDate:date,progressed:false,exerciseId:pe.id,repRange:pe.rr,name:pe.name};
      if(!d.prog[key].e1rmHistory)d.prog[key].e1rmHistory=[];
      if(!d.prog[key].e1rmHistory.some(h=>h.date===date))d.prog[key].e1rmHistory.push({date,e1rm:newE1rm});
      d.prog[key].e1rmHistory=d.prog[key].e1rmHistory.slice(-12);
      if(nextWeight!=null&&date>=(d.prog[key].lastDate||"")){d.prog[key].currentWeight=nextWeight;d.prog[key].lastReps=cs.map(s=>s.reps);d.prog[key].lastDate=date;d.prog[key].progressed=nextWeight>Number(cs[0].weight);}
      if(!d.prog[key].pr||newE1rm>d.prog[key].pr.e1rm){d.prog[key].pr={name:pe.name,weight:bestSet.weight,reps:bestSet.reps,e1rm:newE1rm,date};}
    });
  });
  d.backfillVersion=BACKFILL_VERSION;
  return d;
};

// Prune orphaned/fossil progression records. Runs every boot (cheap filter) so
// rows the cleanup migration removed server-side can't be resurrected from a
// stale local copy or vice versa. Keeps: current id__rr keys; plain legacy IDs
// of current non-ambiguous exercises that hold real reps (the gw() fallback
// reads those); anything logged during the current block (protects history of
// exercises swapped out mid-block).
export const pruneProgression=(d)=>{
  const days=d.program||PROG.days;
  const currentKeys=new Set(Object.values(days).flatMap(day=>(day.exercises||[]).map(pe=>progKey(pe,pe))));
  const currentIds=new Set(Object.values(days).flatMap(day=>(day.exercises||[]).map(pe=>pe.id)));
  const removed=[];
  for(const[key,p]of Object.entries(d.prog||{})){
    if(currentKeys.has(key))continue;
    if(p?.lastDate&&p.lastDate>=PROG.start)continue;
    const isPlain=!key.includes("__");
    const hasRealReps=(p?.lastReps||[]).some(r=>Number(r)>0);
    if(isPlain&&currentIds.has(key)&&!legacyAmbiguousIds.has(key)&&hasRealReps)continue;
    removed.push(key);delete d.prog[key];
  }
  if(removed.length)console.log(`[prune] Removed ${removed.length} orphaned progression records:`,removed.join(", "));
  return removed.length;
};

export const repairDeloadProgression=(d)=>{
  const allDays={...PROG.days,...(d.program||{})};
  const allEx=Object.values(allDays).flatMap(day=>day.exercises||[]);
  for(const pe of allEx){
    const key=progKey(pe,pe);
    const dates=Object.entries(d.wk||{}).filter(([date])=>wkn(date)!==PROG.deload).sort((a,b)=>b[0].localeCompare(a[0]));
    for(const[date,w]of dates){
      const wex=w.exercises?.find(e=>e.progKey===key)||w.exercises?.find(e=>e.id===pe.id&&setsInRange(completedSets(e.sets),pe.rr).length>0);
      if(!wex)continue;
      const correctWeight=nextWeightFromSets(wex.sets,pe);if(correctWeight==null)continue;
      if(d.prog[key]?.currentWeight&&d.prog[key].currentWeight<correctWeight*0.75){d.prog[key].currentWeight=correctWeight;}
      else if(!d.prog[key]){d.prog[key]={currentWeight:correctWeight,lastReps:completedSets(wex.sets).map(s=>s.reps),lastDate:date,progressed:false,exerciseId:pe.id,repRange:pe.rr,name:pe.name};}
      break;
    }
  }
  return d;
};

// ═══ BOOT NORMALIZATION (name kept: app.jsx and api/mcp.js call applyBlockV2) ═══
// PF Austin wk 1-2 comeback weights (2026-10-05). Lifts last trained before the
// block started at stale summer weights get pulled back once; as soon as a session
// on/after the start date is logged, lastDate moves past it and this stops applying.
export const PF_AUSTIN_START="2026-10-06";
export const PF_AUSTIN_COMEBACK={"leg-press__5-8":330,"lying-leg-curl__5-8":130,"leg-extension__10-12":140,"pec-deck__12-15":90,"low-high-cable-fly__12-15":12.5};
export const applyBlockV2=(d)=>{
  let changed=false;
  for(const[key,w]of Object.entries(PF_AUSTIN_COMEBACK)){
    const p=d.prog?.[key];
    if(p&&p.currentWeight>w&&(!p.lastDate||p.lastDate<PF_AUSTIN_START)){p.currentWeight=w;changed=true;}
  }
  // Stored program belongs to another block version → replace with the code's days.
  // Same version → keep it, so coach edits (swap/add/remove/update) persist.
  if(d.programVersion!==PROG.version||!d.program||!Object.keys(d.program).length){
    d.program=JSON.parse(JSON.stringify(PROG.days));d.programVersion=PROG.version;changed=true;
  }
  return changed;
};
