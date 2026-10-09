// ═══ ENGINE · ANALYTICS ═══ Day targets, recovery, weight trend (the one slope), TDEE,
// insights, weekly cut summary/recommendation, closeout, resolveMode, autoreg proposal.
import {PROG,DEFAULTS} from "./program.mjs";
import {lds,td,shiftDate,okWeight,dw,wkn} from "./dates.mjs";
import {cutStepsTarget,getStalls} from "./progression.mjs";
// ═══ DAY-TYPE HELPERS ═══
export const getDayType=(dateStr,travelDays)=>{
  if(travelDays?.[dateStr])return"travel";
  const day=dw(dateStr);
  if(day==="wednesday")return"wednesday";
  if(["monday","tuesday","thursday","friday"].includes(day))return"training";
  return"weekend";
};
// ═══ SOCIAL WEEKEND ═══
export const getWeekMonday=(dateStr)=>{
  const d=new Date(dateStr+"T12:00:00");const dow=d.getDay();
  const diff=dow===0?-6:1-dow;d.setDate(d.getDate()+diff);return lds(d);
};
export const isSocialWeekendActive=(dateStr,socialWeekend)=>{
  if(!socialWeekend?.active)return false;
  return getWeekMonday(dateStr)===socialWeekend.weekOf;
};
export const SOCIAL_CAL={monday:1700,tuesday:1700,wednesday:800,thursday:1700};

export const getDayCalTarget=(dateStr,settings,travelDays,socialWeekend)=>{
  const dt=getDayType(dateStr,travelDays);
  if(dt==="travel")return settings?.trainingCal??2000;
  const sw=isSocialWeekendActive(dateStr,socialWeekend);
  if(sw){
    const day=dw(dateStr);
    if(["friday","saturday","sunday"].includes(day))return null;
    return SOCIAL_CAL[day]??1700;
  }
  if(dt==="wednesday")return settings?.wednesdayCal??900;
  if(dt==="training")return settings?.trainingCal??2000;
  // weekendCal is the Sat/Sun average · Saturday runs +100, Sunday -100 (e.g. 1800 avg → 1900/1700)
  const wknd=settings?.weekendCal??1800;
  return dw(dateStr)==="saturday"?wknd+100:wknd-100;
};
export const getDayProTarget=(dateStr,settings,travelDays,socialWeekend)=>{
  const dt=getDayType(dateStr,travelDays);
  if(dt==="travel")return settings?.protein??200;
  const sw=isSocialWeekendActive(dateStr,socialWeekend);
  if(sw&&["friday","saturday","sunday"].includes(dw(dateStr)))return 180;
  if(dt==="wednesday")return (settings?.wednesdayCal??900)===0?0:150;
  if(dt==="training")return settings?.protein??200;
  if(["saturday","sunday"].includes(dw(dateStr)))return 180;
  return 150;
};
export const PROTEIN_CHECKPOINTS=[
  {label:"Post-Workout Shake",target:50,time:"~7 AM"},
  {label:"After Meal 1",target:110,time:"~1 PM"},
  {label:"After Meal 2",target:170,time:"~5 PM"},
  {label:"End of Day",target:200,time:"~7:30 PM"},
];

// ═══ AUTOREGULATION ═══
export const getWeeklyRecoveryAvg=(rec,today=td())=>{
  const entries=[];
  for(let i=0;i<7;i++){const ds=shiftDate(today,-i);
    if(rec?.[ds]?.recoveryScore)entries.push(rec[ds].recoveryScore);}
  return entries.length>=3?Math.round(entries.reduce((a,b)=>a+b,0)/entries.length):null;
};
export const getAutoregulation=(avgRec)=>{
  if(avgRec===null)return null;
  if(avgRec>=70)return{level:"green",msg:"Run full plan. Progress only if earned.",action:"All lifts as planned. Keep cardio steady; no extra stress chasing PRs."};
  if(avgRec>=55)return{level:"yellow",msg:"Recovery dipping. Reduce cardio stress first.",action:"Keep lifting. Drop to 1 Peloton session and check sleep/food before changing calories."};
  return{level:"red",msg:"Recovery low. Protect lifting and pull back cardio.",action:"Skip Peloton/stairmaster. Use minimum effective lifting only until recovery rebounds."};
};
export const getConsecutiveRedDays=(rec,today=td())=>{
  let count=0;
  for(let i=0;i<7;i++){const ds=shiftDate(today,-i);
    if(rec[ds]?.recoveryScore&&rec[ds].recoveryScore<34)count++;else break;}
  return count;
};


// ═══ WEIGHT TREND · the one shared engine ═══
// EWMA-smoothed OLS slope over the last 14 calendar days, in lbs/week to one
// decimal. Every trend surface consumes this; do not add another formula.
// lbs/week from dated entries: EWMA(0.3)-smoothed OLS slope. getTrend and the
// TDEE estimator both use this so the phone and the coach never disagree.
export const slopePerWeek=(entries,alpha=0.3)=>{
  const n=entries.length;if(n<2)return 0;
  const smoothed=calcEWMA(entries.map(([,v])=>Number(v)),alpha);
  const base=new Date(entries[0][0]+"T12:00:00");
  const xs=entries.map(([dt])=>(new Date(dt+"T12:00:00")-base)/864e5);
  const mx=xs.reduce((s,v)=>s+v,0)/n,my=smoothed.reduce((s,v)=>s+v,0)/n;
  let num=0,den=0;for(let i=0;i<n;i++){num+=(xs[i]-mx)*(smoothed[i]-my);den+=(xs[i]-mx)**2;}
  return (den?num/den:0)*7;
};
export const getTrend=(wt,today=td())=>{
  const start=(()=>{const d=new Date(today+"T12:00:00");d.setDate(d.getDate()-13);return lds(d);})();
  const entries=Object.entries(wt||{}).filter(([dt,v])=>okWeight(v)&&dt>=start&&dt<=today).map(([dt,v])=>[dt,Number(v)]).sort((a,b)=>a[0].localeCompare(b[0]));
  const n=entries.length;
  if(n<2)return null;
  const smoothed=calcEWMA(entries.map(([,v])=>Number(v)),0.3);
  const rate=+slopePerWeek(entries).toFixed(1);
  const direction=rate<=-0.1?"down":rate>=0.1?"up":"flat";
  const message=direction==="down"?`Down ${Math.abs(rate)} lb/wk`:direction==="up"?`Up ${rate} lb/wk`:"Holding steady";
  const weekAgo=(()=>{const d=new Date(today+"T12:00:00");d.setDate(d.getDate()-6);return lds(d);})();
  const weighIns7=entries.filter(([dt])=>dt>=weekAgo).length;
  return{rate,direction,message,n,weighIns7,
    current:Math.round(entries[n-1][1]),
    points:entries.map(([dt,v],i)=>({d:dt.slice(5),v:+smoothed[i].toFixed(1),raw:v}))};
};

// ═══ DATA INTELLIGENCE ═══
export const getTopProteinMeals=(data,limit=5)=>{
  const map={};
  for(const[d,n] of Object.entries(data.nut||{})){
    for(const m of(n.meals||[])){
      if(!m.description||(m.cal||0)<50)continue;
      const k=m.description.toLowerCase().trim();
      if(!map[k])map[k]={desc:m.description,tp:0,tc:0,n:0};
      map[k].tp+=(m.protein||0);map[k].tc+=(m.cal||0);map[k].n++;
    }
  }
  return Object.values(map).filter(m=>m.tp/m.n>=20)
    .map(m=>({desc:m.desc,pro:Math.round(m.tp/m.n),cal:Math.round(m.tc/m.n),n:m.n}))
    .sort((a,b)=>b.pro-a.pro).slice(0,limit);
};

export const getInsights=(data)=>{
  const ins=[];
  const dates=Object.keys(data.nut||{}).sort().reverse().slice(0,30);
  let pH=0,pD=0;
  for(const d of dates){
    const pt=getDayProTarget(d,data.settings||DEFAULTS,data.travelDays,data.socialWeekend);
    const p=data.nut[d]?.totalProtein||0;
    if(p>0){pD++;if(p>=pt)pH++;}
  }
  if(pD>=5){const r=Math.round(pH/pD*100);
    ins.push({type:r>=70?"win":"gap",text:`Protein target hit ${r}% of tracked days (${pH}/${pD})`});}
  const sr=[];
  for(const[d,r] of Object.entries(data.rec||{})){
    if(r.sleepHours&&r.recoveryScore)sr.push({s:r.sleepHours,r:r.recoveryScore});}
  if(sr.length>=7){
    const gs=sr.filter(x=>x.s>=7.5),ps=sr.filter(x=>x.s<7);
    if(gs.length>=3&&ps.length>=3){
      const ga=Math.round(gs.reduce((s,d)=>s+d.r,0)/gs.length);
      const pa=Math.round(ps.reduce((s,d)=>s+d.r,0)/ps.length);
      if(ga-pa>=5)ins.push({type:"insight",text:`7.5h+ sleep averages ${ga}% recovery vs ${pa}% on <7h nights`});
    }
  }
  let cH=0,cD=0;
  for(const d of dates){
    const ct=getDayCalTarget(d,data.settings||DEFAULTS,data.travelDays,data.socialWeekend);
    if(!ct)continue;
    const c=data.nut[d]?.totalCal||0;
    if(c>0){cD++;if(Math.abs(c-ct)<=ct*0.1)cH++;}
  }
  if(cD>=5){const r=Math.round(cH/cD*100);
    ins.push({type:r>=60?"win":"gap",text:`Calories within 10% of target ${r}% of days`});}
  const recWkPairs=Object.entries(data.rec||{}).filter(([d,r])=>r.recoveryScore&&data.wk[d]).map(([d,r])=>{
    const wk=data.wk[d];const progDay=wk.exercises?wk.exercises.filter(ex=>ex.sets&&ex.sets.some(s=>s.done)).length:0;
    return{rec:r.recoveryScore,trained:progDay>0,volume:wk.volume||0};
  });
  if(recWkPairs.length>=3){
    const highRec=recWkPairs.filter(p=>p.rec>=55);
    const lowRec=recWkPairs.filter(p=>p.rec<55);
    const highVol=highRec.length?Math.round(highRec.reduce((s,p)=>s+p.volume,0)/highRec.length):0;
    const lowVol=lowRec.length?Math.round(lowRec.reduce((s,p)=>s+p.volume,0)/lowRec.length):0;
    if(highVol>0&&lowVol>0){
      const pct=Math.round((highVol-lowVol)/lowVol*100);
      ins.push({type:pct>10?"win":"insight",text:`High recovery days (55+): ${highVol.toLocaleString()} lbs avg volume vs ${lowVol.toLocaleString()} lbs on low days (${pct>0?"+":""}${pct}%)`});
    }
  }
  return ins.slice(0,4);
};

export const getCutRetentionScore=(data)=>{
  const planStart=PROG.start;
  const wEntries=Object.entries(data.wt||{}).filter(([d,v])=>d>=planStart&&okWeight(v)).map(([d,v])=>[d,Number(v)]).sort((a,b)=>a[0].localeCompare(b[0]));
  if(wEntries.length<3)return null;
  const rate=slopePerWeek(wEntries);
  const wkChange=Math.abs(rate);
  const wScore=wkChange<=0.5?100:wkChange<=1?85:wkChange<=1.5?65:wkChange<=2?45:20;
  const progEntries=Object.values(data.prog||{});
  const totalL=progEntries.length;
  const heldL=progEntries.filter(p=>p.lastDate).length;
  const lScore=totalL>0?Math.round(heldL/totalL*100):50;
  const nutDates=Object.keys(data.nut||{}).filter(d=>d>=planStart).sort();
  let pH=0,pDays=0;
  for(const d of nutDates){
    const pt=getDayProTarget(d,data.settings||DEFAULTS,data.travelDays,data.socialWeekend);
    const p=data.nut[d]?.totalProtein||0;
    if(p>0){pDays++;if(p>=pt)pH++;}
  }
  const pScore=pDays>0?Math.round(pH/pDays*100):50;
  const total=Math.round(wScore*0.4+lScore*0.4+pScore*0.2);
  return{score:total,weight:{score:wScore,change:+rate.toFixed(1)},
    lifts:{score:lScore,held:heldL,total:totalL},protein:{score:pScore,hit:pH,days:pDays}};
};

export const calcEWMA=(values,alpha=0.1)=>{
  if(!values.length)return[];
  const result=[values[0]];
  for(let i=1;i<values.length;i++)result.push(alpha*values[i]+(1-alpha)*result[i-1]);
  return result;
};

export const median=(a)=>{if(!a.length)return null;const s=[...a].sort((x,y)=>x-y);const m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2;};

// Imputed TDEE: anchor on weight trend, classify each day (full / partial /
// unlogged), impute the gaps, report a range whose width scales with how much
// of the window is imputed vs measured. Calibration (data.tdeeCal) tightens
// the unlogged-day assumptions.
export const calcAdaptiveTDEE=(wt,nut,settings,travelDays,tdeeExclude={},tdeeCal=null,today=td())=>{
  const planStart=PROG.start;
  const cal=tdeeCal&&tdeeCal.answered?tdeeCal:null;
  // Median full dinner per DAY (Cronometer tags each item "Dinner", so sum per date first)
  const dinnerByDay={};
  Object.entries(nut||{}).forEach(([dt,n])=>{(n?.meals||[]).forEach(m=>{if(/dinner/i.test(m?.mealType||"")){const c=Number(m.cal)||0;if(c>0)dinnerByDay[dt]=(dinnerByDay[dt]||0)+c;}});});
  const medDinner=Math.round(median(Object.values(dinnerByDay).filter(v=>v>150))||650);
  const listDays=(a,b)=>{const out=[];const d=new Date(a+"T12:00:00");const end=new Date(b+"T12:00:00");while(d<=end){out.push(lds(d));d.setDate(d.getDate()+1);}return out;};
  const shiftDay=(s,n)=>{const d=new Date(s+"T12:00:00");d.setDate(d.getDate()+n);return lds(d);};

  const estimate=(startD,endD)=>{
    if(endD<startD)return null;
    const nutDates=Object.keys(nut||{}).filter(dt=>dt>=startD&&dt<=endD&&(nut[dt]?.totalCal||0)>0).sort();
    if(nutDates.length<5)return null;
    const days=listDays(nutDates[0],nutDates[nutDates.length-1]).filter(dt=>!tdeeExclude[dt]&&dt<=today);
    const fullCals=[];const classified=[];
    for(const dt of days){
      const target=getDayCalTarget(dt,settings,travelDays,null)||1800;
      const t=nut[dt]?.totalCal||0;
      if(t>=Math.max(800,target*0.6)){classified.push({dt,cls:"full",t});fullCals.push(t);}
      else if(t>0)classified.push({dt,cls:"partial",t});
      else classified.push({dt,cls:"unlogged",t:0});
    }
    if(fullCals.length<5)return null;
    const medFull=median(fullCals);
    const vals=classified.map(({dt,cls,t})=>{
      if(cls==="full")return t;
      if(cls==="partial")return t+medDinner;
      const wd=new Date(dt+"T12:00:00").getDay();
      if(cal&&(cal.unloggedIs==="blowup"||(cal.unloggedIs==="mixed"&&(wd===5||wd===6))))return cal.socialCal||3000;
      if(cal&&cal.fastSlips&&wd===3)return settings?.trainingCal||1800;
      return medFull;
    });
    const nFull=fullCals.length,nPart=classified.filter(c=>c.cls==="partial").length,nUn=classified.length-nFull-nPart;
    const imputedShare=classified.length?(nPart*0.5+nUn)/classified.length:0;
    const avgCal=Math.round(vals.reduce((s,v)=>s+v,0)/vals.length);
    const wDates=Object.keys(wt||{}).filter(dt=>dt>=days[0]&&dt<=days[days.length-1]&&okWeight(wt[dt])).sort();
    if(wDates.length<3)return null;
    const weights=wDates.map(dt=>Number(wt[dt]));
    const trendW=calcEWMA(weights,0.3);
    // Same slope engine as getTrend: EWMA endpoints lag a steady loss by ~9 days
    // at alpha 0.1 and under-read the rate, which under-estimates TDEE.
    const weeklyChange=slopePerWeek(wDates.map((dt,i)=>[dt,weights[i]]));
    const tdeeRaw=Math.round(avgCal-(weeklyChange*3500/7));
    const tdee=Math.max(Math.round(avgCal*0.5),Math.min(Math.round(avgCal*1.5),tdeeRaw));
    return{tdee,avgCalories:avgCal,weeklyChange,imputedShare,nFull,nPart,nUn,
      trendWeight:+trendW[trendW.length-1].toFixed(1),
      trendWeights:wDates.map((dt,i)=>({d:dt,v:+trendW[i].toFixed(1),raw:weights[i]}))};
  };

  const cur=estimate(planStart,today);
  const hist=estimate("2000-01-01",shiftDay(planStart,-1));
  if(!cur&&!hist)return{daysUsed:0,historyDays:0,daysNeeded:7,phase:"collecting"};

  let source="current",base=cur,historyWeight=0;
  const curFull=cur?cur.nFull:0,histFull=hist?hist.nFull:0;
  if(hist&&(!cur||curFull<7)){
    source="history";base=hist;historyWeight=1;
  }else if(hist&&cur){
    const currentWeight=Math.min(1,curFull/21);
    historyWeight=1-currentWeight;
    source=historyWeight>0.15?"blended":"current";
    base={...cur,tdee:Math.round(hist.tdee*historyWeight+cur.tdee*currentWeight)};
  }

  const imputedShare=base.imputedShare??0;
  const half=Math.round(120+imputedShare*430);
  const confidence=Math.min(95,Math.round(((curFull*5)+(histFull?Math.min(35,histFull*1.5):0))*(1-0.35*imputedShare)));
  const calT=getDayCalTarget(today,settings,travelDays,null);
  const deficit=base.tdee-calT;
  return{tdee:base.tdee,tdeeLow:base.tdee-half,tdeeHigh:base.tdee+half,imputedShare:+imputedShare.toFixed(2),calibrated:!!cal,
    confidence,avgCalories:base.avgCalories,weeklyChange:+base.weeklyChange.toFixed(2),
    daysUsed:curFull,historyDays:histFull,historyTDEE:hist?.tdee,historyWeight:+historyWeight.toFixed(2),source,
    phase:curFull<7?(hist?"seeded":"collecting"):confidence<60?"early":"confident",
    deficit,trendWeight:base.trendWeight,trendWeights:(cur||hist).trendWeights};
};

export const getDailyCutAdherence=(data,date,settings=data.settings||DEFAULTS)=>{
  const nut=data.nut?.[date]||{};
  const calT=getDayCalTarget(date,settings,data.travelDays,data.socialWeekend);
  const proT=getDayProTarget(date,settings,data.travelDays,data.socialWeekend);
  const cal=nut.totalCal||0,pro=nut.totalProtein||0;
  const logged=cal>0||pro>0||(nut.meals||[]).length>0;
  return{date,logged,calTarget:calT,proteinTarget:proT,calories:cal,protein:pro,
    calorieHit:calT===null?logged:(logged&&Math.abs(cal-calT)<=calT*0.12),
    proteinHit:logged&&pro>=proT*0.9,
    weightLogged:data.wt?.[date]!=null,
    workoutDone:!!data.wk?.[date],
    cardioDone:!!data.cardio?.[date]?.done};
};

export const getWeeklyCutSummary=(data,today=td())=>{
  const settings=data.settings||DEFAULTS;
  const dates=[];for(let i=6;i>=0;i--){const d=new Date(today+"T12:00:00");d.setDate(d.getDate()-i);dates.push(lds(d));}
  const adherence=dates.map(d=>getDailyCutAdherence(data,d,settings));
  const loggedDays=adherence.filter(a=>a.logged).length;
  const proteinHits=adherence.filter(a=>a.proteinHit).length;
  const calorieHits=adherence.filter(a=>a.calorieHit).length;
  const weightDays=adherence.filter(a=>a.weightLogged).length;
  const plannedTraining=dates.filter(d=>!!data.program?.[dw(d)]);
  const trainingDone=plannedTraining.filter(d=>!!data.wk?.[d]).length;
  const cardioDone=adherence.filter(a=>a.cardioDone).length;
  const trend=getTrend(data.wt,today);
  const weightTrend=trend===null
    ?{label:"Missing",status:"unknown",weeklyChange:null,days:0}
    :{label:trend.rate<-1.5?"Dropping fast":trend.rate<-0.25?"Dropping":trend.rate<=0.25?"Flat":"Up",
      status:trend.rate<-1.5?"fast":trend.rate<-0.25?"onPace":trend.rate<=0.25?"flat":"up",
      weeklyChange:trend.rate,days:trend.n};
  const recValues=dates.map(d=>data.rec?.[d]?.recoveryScore).filter(v=>v!=null);
  const recoveryAvg=recValues.length>=3?Math.round(recValues.reduce((s,v)=>s+v,0)/recValues.length):getWeeklyRecoveryAvg(data.rec||{},today);
  const tdee=calcAdaptiveTDEE(data.wt||{},data.nut||{},settings,data.travelDays,data.tdeeExclude||{},data.tdeeCal,today);
  return{dates,adherence,loggedDays,proteinHits,calorieHits,weightDays,
    nutritionAdherence:loggedDays?Math.round(((proteinHits+calorieHits)/(loggedDays*2))*100):0,
    proteinRate:loggedDays?Math.round(proteinHits/loggedDays*100):0,
    calorieRate:loggedDays?Math.round(calorieHits/loggedDays*100):0,
    weightTrend,recoveryAvg,recoveryDays:recValues.length,trainingDone,plannedTraining:plannedTraining.length,
    cardioDone,tdee,stalls:getStalls(data.prog||{},data.wk||{},data.program||PROG.days)};
};

export const getWeeklyConsistency=(data,today=td(),pre=null)=>{
  const dates=[];for(let i=6;i>=0;i--){const d=new Date(today+"T12:00:00");d.setDate(d.getDate()-i);dates.push(lds(d));}
  const cut=pre||getWeeklyCutSummary(data,today);
  const days=dates.map(d=>{
    const liftPlanned=!!data.program?.[dw(d)];
    const liftDone=!!data.wk?.[d];
    const cardio=data.cardio?.[d];
    const cardioDone=!!cardio?.done;
    const cardioMinutes=Math.round(Number(cardio?.duration||0));
    const weightLogged=data.wt?.[d]!=null;
    return{date:d,label:["S","M","T","W","T","F","S"][new Date(d+"T12:00:00").getDay()],weightLogged,liftPlanned,liftDone,cardioDone,cardioMinutes};
  });
  const liftsPlanned=days.filter(d=>d.liftPlanned).length;
  const liftsDone=days.filter(d=>d.liftDone).length;
  const cardioSessions=days.filter(d=>d.cardioDone).length;
  const cardioMinutes=days.reduce((s,d)=>s+d.cardioMinutes,0);
  const weightDays=days.filter(d=>d.weightLogged).length;
  const winDays=days.filter(d=>d.weightLogged||d.liftDone||d.cardioDone).length;
  const trend=cut.weightTrend.weeklyChange==null?"Need 2+ weigh-ins":`${cut.weightTrend.weeklyChange>0?"+":""}${cut.weightTrend.weeklyChange} lb/wk`;
  const tone=liftsPlanned&&liftsDone>=liftsPlanned&&cardioSessions>=2&&weightDays>=5?"great":winDays>=5?"good":winDays>=3?"building":"start";
  const message=tone==="great"?"Week is on rails":tone==="good"?"Wins are stacking":tone==="building"?"Keep collecting wins":"One win starts the week";
  return{days,liftsDone,liftsPlanned,cardioSessions,cardioMinutes,weightDays,winDays,trend,tone,message};
};

export const getTonightCloseout=(data,date=td())=>{
  const settings=data.settings||DEFAULTS;
  const a=getDailyCutAdherence(data,date,settings);
  const steps=data.steps?.[date]||0;
  const stepsTarget=cutStepsTarget(settings);
  const rec=data.rec?.[date]?.recoveryScore??null;
  const cardioDone=!!data.cardio?.[date]?.done;
  const workoutDone=!!data.wk?.[date];
  const sess=data.program?.[dw(date)]||null;
  const tomorrow=new Date(date+"T12:00:00");tomorrow.setDate(tomorrow.getDate()+1);
  const tomorrowStr=lds(tomorrow);
  const tomorrowType=getDayType(tomorrowStr,data.travelDays||{});
  const proteinLeft=Math.max(0,(a.proteinTarget||0)-(a.protein||0));
  const caloriesLeft=a.calTarget===null?null:(a.calTarget||0)-(a.calories||0);
  const foodOk=a.logged&&a.proteinHit&&(a.calTarget===null||a.calorieHit);
  const stepsOk=steps>=stepsTarget;
  const liftOk=!sess||workoutDone;
  const recoveryRisk=rec!=null&&rec<55;
  let tomorrowMode="Normal cut day";
  let action="Close habits, then stop adding friction.";
  let tone="good";
  if(!a.logged){tomorrowMode="Data-first morning";action="Log food before changing any target.";tone="warn";}
  else if(proteinLeft>25){tomorrowMode="Protein-first day";action=`Get ${proteinLeft}g protein before bed or make tomorrow protein-first.`;tone="warn";}
  else if(caloriesLeft!=null&&caloriesLeft<-150){tomorrowMode="Tighten food";action="No target change. Keep tomorrow cleaner and hit protein early.";tone="warn";}
  else if(recoveryRisk){tomorrowMode="Recovery-biased";action="Reduce cardio/stress before cutting food. Protect lifting.";tone="bad";}
  else if(!cardioDone){tomorrowMode="Cardio catch-up";action="Do planned Zone 2 tomorrow; don't cut calories to compensate.";tone="warn";}
  else if(!stepsOk){tomorrowMode="Steps bias";action=`Finish steps if practical; otherwise make tomorrow a ${Math.round(stepsTarget/1000)}k step day.`;tone="warn";}
  else if(!liftOk){tomorrowMode="Training priority";action="Lift is the priority before adding extra cardio.";tone="warn";}
  return{tomorrow:tomorrowStr,tomorrowMode,action,tone,foodOk,proteinLeft,caloriesLeft,steps,stepsTarget,stepsOk,cardioDone,liftOk,habitsLogged:!!data.habits?.[date],recovery:rec};
};

export const getWeeklyCutRecommendation=(data,today=td(),pre=null)=>{
  const s=pre||getWeeklyCutSummary(data,today);
  const deload=wkn(today)===PROG.deload;
  const adherencePoor=s.loggedDays<4||s.weightDays<3||s.nutritionAdherence<60;
  const lowRecovery=s.recoveryAvg!=null&&s.recoveryAvg<55;
  const veryLowRecovery=s.recoveryAvg!=null&&s.recoveryAvg<45;
  const stalls=s.stalls.length;
  let rec;
  if(deload){
    rec={key:"deload",action:"Run this as a recovery-biased deload week.",why:"Program cycle says deload, so completion, sleep, mobility, and easy Zone 2 matter more than forcing more deficit.",confidence:s.loggedDays>=3||s.recoveryDays>=3?"Medium":"Low"};
  }else if(adherencePoor){
    rec={key:"adherence",action:"Tighten logging and hit protein before changing targets.",why:`Only ${s.loggedDays}/7 days have nutrition logs and ${s.weightDays}/7 have weigh-ins. The app needs better inputs before recommending calorie/cardio changes.`,confidence:s.loggedDays>=3||s.weightDays>=3?"Medium":"Low"};
  }else if(veryLowRecovery){
    rec={key:"recover",action:"Reduce cardio/stress first; keep food targets steady.",why:`Weekly recovery is ${s.recoveryAvg}%. Protect lifting and sleep before cutting calories further.`,confidence:s.recoveryDays>=3?"High":"Medium"};
  }else if(lowRecovery&&s.weightTrend.status!=="flat"){
    rec={key:"stress",action:"Keep calories steady and make cardio easier this week.",why:`Weight is ${s.weightTrend.label.toLowerCase()} while recovery averages ${s.recoveryAvg}%, so the safer lever is stress/cardio, not less food.`,confidence:s.recoveryDays>=3&&s.weightTrend.days>=4?"High":"Medium"};
  }else if(s.weightTrend.status==="fast"){
    rec={key:"too-fast",action:"Stay fed around training; do not add more deficit.",why:`Trend is about ${Math.abs(s.weightTrend.weeklyChange).toFixed(1)} lb/week down. That is fast enough to threaten recovery/performance on a cut.`,confidence:s.weightTrend.days>=4?"Medium":"Low"};
  }else if(s.weightTrend.status==="flat"||s.weightTrend.status==="up"){
    rec={key:"adjust",action:"Adjust one lever only: add 10–15 min Zone 2 twice this week or trim ~100 calories on rest days.",why:`Adherence is ${s.nutritionAdherence}% and weight is ${s.weightTrend.label.toLowerCase()}, so one small lever is enough. Targets stay unchanged until you choose it.`,confidence:s.weightTrend.days>=4&&s.tdee.phase!=="collecting"?"High":"Medium"};
  }else if(stalls>=2){
    rec={key:"training",action:"Hold the deficit steady and prioritize sleep/carbs around lifting.",why:`${stalls} lifts are showing stalls/drops. Preserve training output before making the cut more aggressive.`,confidence:"Medium"};
  }else{
    rec={key:"stay",action:"Stay the course this week.",why:`Weight trend, nutrition adherence (${s.nutritionAdherence}%), and recovery are good enough. Do not change multiple levers.`,confidence:s.weightTrend.days>=4&&s.loggedDays>=5?"High":"Medium"};
  }
  return{...rec,summary:s,signals:[
    {label:"Weight",value:s.weightTrend.weeklyChange==null?s.weightTrend.label:`${s.weightTrend.weeklyChange>0?"+":""}${s.weightTrend.weeklyChange} lb/wk`,tone:s.weightTrend.status==="onPace"?"good":s.weightTrend.status==="fast"||s.weightTrend.status==="flat"||s.weightTrend.status==="up"?"warn":"muted"},
    {label:"Nutrition adherence",value:s.loggedDays===0?"—":`${s.nutritionAdherence}%`,tone:s.loggedDays===0?"muted":s.nutritionAdherence>=70?"good":s.nutritionAdherence>=60?"warn":"bad"},
    {label:"Recovery",value:s.recoveryAvg==null?"Missing":`${s.recoveryAvg}%`,tone:s.recoveryAvg==null?"muted":s.recoveryAvg>=65?"good":s.recoveryAvg>=55?"warn":"bad"},
    {label:"Training",value:s.plannedTraining?`${s.trainingDone}/${s.plannedTraining}`:"Rest",tone:s.plannedTraining&&s.trainingDone<s.plannedTraining?"warn":"good"},
    {label:"Cardio",value:`${s.cardioDone}/7`,tone:s.cardioDone>=2?"good":s.cardioDone>=1?"warn":"muted"}
  ]};
};

export const resolveMode=(data,t,workout,hm,dayName=dw(t))=>{
  const weightLogged=data.wt?.[t]!=null;
  const isTraining=!!data.program?.[dayName];
  const liftDone=!!data.wk?.[t];
  if(workout)return"session";                                   // active workout always wins
  if(hm>=4.5&&hm<9&&!weightLogged)return"morning";
  if(isTraining&&!liftDone&&hm<13&&hm>=4.5)return"session";
  if(hm>=19.5)return"closeout";
  return"neutral";
};

// Rule-based auto-regulation from Oura recovery · no AI call. Accept mutates
// TODAY'S session plan only (applied at startW), never the stored program.
export const getAutoregProposal=(rec)=>{
  const score=rec?.recoveryScore;
  if(score==null||score>=60)return null;
  const proposals=[{id:"minusOneSet",label:"−1 set on non-anchor accessories today"}];
  if(score<40)proposals.push({id:"mobilitySwap",label:"Swap to mobility session"});
  return{score,proposals};
};
