// ═══ ENGINE · MIGRATIONS ═══ One-shot and boot normalizers (history backfill, prune,
// deload repair, block comeback weights). Delete each when its data is gone.
import {PROG} from "./program.mjs";
import {wkn,dw} from "./dates.mjs";
import {progKey,legacyAmbiguousIds} from "./state.mjs";
import {e1rm,calcVolume,completedSets,bestSetByE1rm,setsInRange,nextWeightFromSets,foldDayLog,prBefore} from "./progression.mjs";
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

// One-shot: a day logged on both the watch and the phone before foldLiftCopies existed
// (2026-11-12). Folds the copies (foldDayLog), applies typo fixes, and repairs the
// progression rows the watch copy touched. Pure: returns the new row, the progression
// rows to write, and a plain list of what changed. The script is
// scripts/fix-wrist-double.mjs; it writes only with --apply.
//   fixes: [{id, from, to}] weight typos on that day (id = lift id, every done set at from → to)
export const foldDoubleDay=(data,date,{fixes=[]}={})=>{
  const row=data.wk?.[date];const notes=[];
  if(!row?.exercises?.length)return{row:null,prog:{},notes:["No workout on "+date+"."]};
  const {log,folded}=foldDayLog(row,{otherDay:dw(date)});
  if(!folded.length)notes.push("No watch and phone copies of one lift to fold.");
  const exs=log.exercises.map(e=>{const fx=fixes.filter(f=>f.id===e.id);if(!fx.length)return e;
    return{...e,sets:e.sets.map(s=>{const f=fx.find(f=>s?.done&&Number(s.weight)===f.from);if(!f)return s;notes.push(`${e.id}: set at ${f.from} → ${f.to}.`);return{...s,weight:f.to};})};});
  const out={...log,exercises:exs,volume:calcVolume(exs)};
  folded.forEach(f=>notes.push(`${f.out.id}: kept the phone's ${f.out.sets.filter(s=>s.done).length} sets, added the watch's times and heart rate${f.wrist.id!==f.out.id?` (the watch logged ${f.wrist.id}; the phone's swap wins)`:""}.`));
  // Progression. Each folded lift: today's e1RM point and a PR set today come from the
  // folded sets. A lift only the watch logged and the phone swapped away: undo what
  // the watch copy did to its row (weight back to what the plan prefilled, today's
  // point and PR gone, last session back to the one before when the log has one; with
  // none, lastDate stays so the cloud row still wins the phone's prog merge).
  const prog={};
  folded.forEach(f=>{
    const ex=exs.find(e=>e.progKey===f.out.progKey)||f.out;
    const key=ex.progKey;const row0=data.prog?.[key];
    if(row0?.lastDate===date){
      const cs=completedSets(ex.sets);const best=bestSetByE1rm(cs);const pt=best?e1rm(best.weight,best.reps):0;
      const hist=(row0.e1rmHistory||[]).filter(p=>p.date!==date);
      if(pt>0)hist.push({date,e1rm:pt});hist.sort((a,b)=>a.date.localeCompare(b.date));
      let pr=row0.pr;
      if(pr?.date===date){const was=prBefore(data,key,date,hist.filter(p=>p.date<date),pr);pr=!was||pt>=was.e1rm?{name:pr.name,weight:Number(best.weight)||0,reps:Number(best.reps)||0,e1rm:pt,date}:was;}
      const next={...row0,lastReps:cs.map(s=>Number(s.reps)),e1rmHistory:hist.slice(-12),pr};
      if(JSON.stringify(next)!==JSON.stringify(row0)){prog[key]=next;notes.push(`${key}: today's e1RM point and PR from the kept sets.`);}
    }
    const wkey=f.wrist.progKey;
    if(wkey&&wkey!==key&&data.prog?.[wkey]?.lastDate===date&&!exs.some(e=>e.progKey===wkey)){
      const r=data.prog[wkey];
      const prevDates=Object.keys(data.wk||{}).filter(d=>d<date&&(data.wk[d].exercises||[]).some(e=>e.progKey===wkey&&completedSets(e.sets).length)).sort();
      const pd=prevDates.at(-1);const pe=pd?data.wk[pd].exercises.find(e=>e.progKey===wkey):null;
      const hist=(r.e1rmHistory||[]).filter(p=>p.date!==date);
      const was=Number(doneW(f.wrist));
      prog[wkey]={...r,currentWeight:was>0?was:r.currentWeight,progressed:false,lastDate:pd||r.lastDate,lastReps:pe?completedSets(pe.sets).map(s=>Number(s.reps)):r.lastReps,
        e1rmHistory:hist,pr:r.pr?.date===date?prBefore(data,wkey,date,hist,r.pr):r.pr};
      notes.push(`${wkey}: the watch logged it, the phone swapped it away. Weight back to ${prog[wkey].currentWeight}, last session ${pd||"none"}.`);
    }
  });
  return{row:out,prog,notes};
};
const doneW=e=>(e?.sets||[]).find(s=>s?.done)?.weight;
