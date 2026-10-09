import { DEFAULTS, bl } from "../../lib/engine.mjs";
import { makeClient, toRow, loadAll } from "../../lib/supabase.mjs";

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
const SB_OUTBOX_KEY="dhub6_sb_outbox";
const readOutbox=()=>{try{return JSON.parse(localStorage.getItem(SB_OUTBOX_KEY)||"[]")}catch{return[]}};
const writeOutbox=(items)=>{try{localStorage.setItem(SB_OUTBOX_KEY,JSON.stringify(items.slice(-200)))}catch{}};
const enqueueOutbox=(job)=>{
  const key=JSON.stringify([job.op,job.table,job.conflict||"",job.col||"",job.val??"",job.data?.date??job.data?.exercise_id??job.data?.id??""]);
  const items=readOutbox().filter(j=>JSON.stringify([j.op,j.table,j.conflict||"",j.col||"",j.val??"",j.data?.date??j.data?.exercise_id??j.data?.id??""])!==key);
  items.push({...job,queuedAt:Date.now()});writeOutbox(items);
};
const trackedUpsert=(table,data,conflict="date")=>sb.upsert(table,data,conflict).then(ok=>{if(!ok&&syncHealth.failures[table]?.transient)enqueueOutbox({op:"upsert",table,data,conflict});return ok;});
const trackedDelete=(table,col,val)=>sb.deleteRow(table,col,val).then(ok=>{if(!ok)enqueueOutbox({op:"delete",table,col,val});return ok;});
const flushOutbox=async()=>{
  const items=readOutbox();if(!items.length)return;
  const keep=[];
  for(const job of items){
    const ok=job.op==="delete"?await sb.deleteRow(job.table,job.col,job.val):await sb.upsert(job.table,job.data,job.conflict||"date");
    if(!ok&&syncHealth.failures[job.table]?.transient)keep.push(job);
    if(!ok&&!syncHealth.failures[job.table]?.transient)keep.push(job); // keep hard failures visible until schema/auth is fixed.
  }
  writeOutbox(keep);
};
const svSB={
  weight:(date,value)=>trackedUpsert("weight",toRow.weight(date,value)),
  steps:(date,value)=>trackedUpsert("steps",toRow.steps(date,value)),
  water:(date,oz)=>{const n=Math.round(Number(oz)||0);return n>0?trackedUpsert("water",toRow.water(date,n)):trackedDelete("water","date",date);},
  lytes:(date,l)=>trackedUpsert("lytes",toRow.lytes(date,l)),
  recovery:(date,r)=>trackedUpsert("recovery",toRow.recovery(date,r)),
  habits:(date,h)=>trackedUpsert("habits",toRow.habits(date,h)),
  workout:(date,w)=>trackedUpsert("workouts",toRow.workout(date,w)),
  nutrition:(date,n)=>trackedUpsert("nutrition",toRow.nutrition(date,n)),
  progression:(exId,p)=>trackedUpsert("progression",toRow.progression(exId,p),"exercise_id"),
  debrief:(date)=>trackedUpsert("debrief",toRow.debrief(date)),
  mobility:(date,durSecs)=>trackedUpsert("mobility",toRow.mobility(date,durSecs)),
  stepper:(date)=>trackedUpsert("stepper",toRow.stepper(date)),
  cardio:(date,c)=>trackedUpsert("cardio",toRow.cardio(date,c)),
  bodyComp:(date,b)=>trackedUpsert("body_comp",toRow.bodyComp(date,b)),
  bodyMeas:(date,m)=>trackedUpsert("body_measurements",toRow.bodyMeas(date,m)),
  travelDay:(date,active)=>active?trackedUpsert("travel_days",toRow.travelDay(date)):trackedDelete("travel_days","date",date),
  tdeeExclude:(date,active)=>active?trackedUpsert("tdee_exclude",toRow.tdeeExclude(date)):trackedDelete("tdee_exclude","date",date),
  settings:(s)=>trackedUpsert("settings",toRow.settings(s),"id"),
  program:(p)=>trackedUpsert("program",toRow.program(p),"id"),
  delWeight:(date)=>trackedDelete("weight","date",date),
  delStepper:(date)=>trackedDelete("stepper","date",date),
  delCardio:(date)=>trackedDelete("cardio","date",date),
  delWorkout:(date)=>trackedDelete("workouts","date",date),
  delMobility:(date)=>trackedDelete("mobility","date",date),
  delWater:(date)=>trackedDelete("water","date",date),
};
const loadFromSB=async()=>{
  try{const d=await loadAll(sb);d.settings={...d.settings,notifications:getNotificationSettings(d.settings?.notifications)};return d;}
  catch(e){console.error("[SB] Load error:",e);const empty=bl();empty.__loadError=e.message||String(e);return empty;}
};

export { REST_TIMER_KEY, ld, syncHealth, onSyncFailure, sv, getNotificationSettings, saveNotificationSettings, sb, flushOutbox, svSB, loadFromSB };
