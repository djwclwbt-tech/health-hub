// ═══ ENGINE · WATCH ═══ What the daily watchdog (api/watchdog.js) checks, as pure
// rules: is each data feed still delivering, and has today's food been logged.
// The app shows the same alerts, so a dead feed is never silent.
import {fmt,shiftDate,dw} from "./dates.mjs";
import {getDayType} from "./analytics.mjs";

const daysBetween=(a,b)=>Math.round((new Date(b+"T12:00:00")-new Date(a+"T12:00:00"))/864e5);
const lastKey=(o,today,pred=()=>true)=>Object.keys(o||{}).filter(k=>k<=today&&pred(o[k])).sort().at(-1)||null;

// Feeds that stopped. `today` is the athlete's date (America/Chicago).
export const feedAlerts=(data,today)=>{
  const out=[];
  const rec=lastKey(data.rec,today,r=>r?.recoveryScore!=null);
  if(!rec||daysBetween(rec,today)>2)out.push({id:"oura",text:rec?`Oura has no readings since ${fmt(rec)}. Wear the ring at night and open the Oura app so it syncs.`:"Oura has never sent recovery data."});
  const steps=lastKey(data.steps,today,v=>v>0);
  if(!steps||daysBetween(steps,today)>2)out.push({id:"steps",text:steps?`Steps stopped syncing after ${fmt(steps)}.`:"Steps have never synced."});
  const wt=lastKey(data.wt,today);
  if(wt&&daysBetween(wt,today)>3)out.push({id:"weight",text:`No weigh-in for ${daysBetween(wt,today)} days. The trend goes stale.`});
  // Food on the last three eating days before today (Wednesday is the fast day).
  const eat=[];for(let i=1;eat.length<3&&i<10;i++){const k=shiftDate(today,-i);if(getDayType(k,data.travelDays)!=="wednesday")eat.push(k);}
  const missing=eat.filter(k=>!((data.nut?.[k]?.totalCal||0)>0));
  if(missing.length>=2)out.push({id:"food",text:`Food is missing on ${missing.length===3?"all":missing.length} of the last 3 eating days. The coach can't judge calories without it.`});
  return out;
};

// Evening nudge: an eating day with nothing logged yet.
export const foodNudge=(data,today)=>{
  if(getDayType(today,data.travelDays)==="wednesday")return null;
  if((data.nut?.[today]?.totalCal||0)>0)return null;
  return{title:"No food logged today",body:"Log today in Cronometer before bed so the coach can count it."};
};

// Sunday review, or Monday's if the Sunday run failed.
export const isReviewDay=(today)=>dw(today)==="sunday";
