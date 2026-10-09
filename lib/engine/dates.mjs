// ═══ ENGINE · DATES ═══ Day strings, "today" (Austin time on the server), week numbers, formatting.
import {PROG,WU} from "./program.mjs";
export const lds=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
// "Today" is the athlete's day. The browser uses the phone's clock; a server
// (no window: Vercel runs UTC) uses Austin time so 7 pm Central is not tomorrow.
export const SERVER_TZ="America/Chicago";
export const td=(now=new Date())=>{if(typeof window!=="undefined")return lds(now);
  const p=Object.fromEntries(new Intl.DateTimeFormat("en-US",{timeZone:SERVER_TZ,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(now).map(x=>[x.type,x.value]));
  return `${p.year}-${p.month}-${p.day}`;};
export const shiftDate=(s,n)=>{const d=new Date(s+"T12:00:00");d.setDate(d.getDate()+n);return lds(d);};
// A usable scale reading: finite and positive (null, "", 0 and NaN are not weights).
export const okWeight=v=>v!=null&&v!==""&&Number.isFinite(Number(v))&&Number(v)>0;
export const dw=s=>["sunday","monday","tuesday","wednesday","thursday","friday","saturday"][new Date(s+"T12:00:00").getDay()];
export const fmt=s=>new Date(s+"T12:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});
export const wkn=s=>{const a=new Date(PROG.start+"T12:00:00"),b=new Date(s+"T12:00:00");return Math.max(1,Math.floor((b-a)/6048e5)+1);};
export const estTime=(sess)=>{if(!sess)return"";
  const wu=5+(sess.warmup?.moves?.length||0)*1+(sess.warmup?.ramp?3:0);
  const wuSets=(sess.exercises||[]).reduce((t,ex)=>t+(WU(ex.sw).length||0)*0.75,0);
  const work=(sess.exercises||[]).reduce((t,ex)=>t+ex.sets*0.5+(ex.sets-1)*(ex.rest/60),0);
  const stretch=(PROG.mobility?._default||PROG.mobility?.[Object.keys(PROG.mobility)[0]]||[]).reduce((t,s)=>t+((s.dur||60)*(s.sets||2))/60,0);
  return Math.round(wu+wuSets+work+stretch);
};

export const fmtElapsed=(secs)=>{
  const h=Math.floor(secs/3600),m=Math.floor((secs%3600)/60),s=secs%60;
  if(h>0)return `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  return `${m}:${String(s).padStart(2,"0")}`;
};
