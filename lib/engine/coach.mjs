// ═══ ENGINE · COACH ═══ The coaching brief: one grounded, coverage-aware summary
// that the weekly analysis (api/analyze.js), the Coach (get_snapshot.brief) and the
// eval harness (eval/coach.mjs) all read. A model may only cite numbers that are in
// the brief; groundingCheck() enforces that. Data gaps are stated, never papered over.
import {PROG,exLibById} from "./program.mjs";
import {lds,td,dw,wkn,shiftDate} from "./dates.mjs";
import {e1rm,bestSetByE1rm} from "./progression.mjs";
import {getDayType,getDayCalTarget,getDayProTarget,getTrend,getWeeklyCutSummary,getWeeklyCutRecommendation,getAutoregProposal} from "./analytics.mjs";

const daysBetween=(a,b)=>Math.round((new Date(b+"T12:00:00")-new Date(a+"T12:00:00"))/864e5);
const avg=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:null;
const r1=v=>v==null?null:Math.round(v*10)/10;

// Rules every coach output follows. COACH.md's project instructions quote these.
export const COACH_RULES=[
  "Reason only from the brief. Every number you write must appear in it.",
  "Name data gaps first. If food is logged on fewer than 5 of the eating days, or weigh-ins are not reliable, do not judge calories, TDEE or the deficit; the first lever is logging.",
  "If the recovery feed is stale or missing, say so and do not interpret recovery.",
  "One lever at a time. Do not change calories unless food was logged on 6+ eating days and the trend has been flat for 10+ days.",
  "Rate on pace is 0.6 to 1.5 lb a week down. Faster than 1.5 with strength slipping: add food around training, never more deficit.",
  "Recovery under 60: trim accessory sets. Under 40: a mobility day. Protect sleep before cutting food.",
  "Never remove or swap an anchor lift without asking.",
  "When several things are off, find the cause before the lever. Recovery under 60 on 3+ days: cut training stress first. Lifts slipping while recovery is fine and the rate is faster than 1.5: the deficit is the cause, so add food. Otherwise data gaps (logging) come before the rate.",
  "When you add food, give the amount: 100 to 250 cal a day, placed around training. Never suggest a change under 100 cal.",
];

export const coachBrief=(data,today=td(),days=7)=>{
  const st=data.settings||{};
  const window=[];for(let i=days;i>=1;i--)window.push(shiftDate(today,-i));
  const week=wkn(today);

  // Weight: the one trend (getTrend), plus what the goal needs.
  const trend=getTrend(data.wt,today);
  const wtKeys=Object.keys(data.wt||{}).filter(k=>k<=today).sort();
  const latest=wtKeys.length?{date:wtKeys.at(-1),lbs:Number(data.wt[wtKeys.at(-1)])}:null;
  const daysLeft=Math.max(0,daysBetween(today,PROG.end));
  const from=trend?.reliable?trend.current:latest?.lbs??null;
  const neededRate=from!=null&&daysLeft>=7?r1(-(from-PROG.targetWeight)/(daysLeft/7)):null;

  // Food: averages over logged days only, and how many days that is.
  // Wednesday is the fast (or low-calorie) day; a travel day cancels it.
  const eating=window.filter(k=>getDayType(k,data.travelDays)!=="wednesday");
  const logged=eating.filter(k=>(data.nut?.[k]?.totalCal||0)>0);
  const full=logged.filter(k=>data.nut[k].totalCal>=0.6*(getDayCalTarget(k,st,data.travelDays,data.socialWeekend)||1800));
  const fastDays=window.filter(k=>!eating.includes(k));
  const fastFood=fastDays.map(k=>data.nut?.[k]?.totalCal||0);
  const calT=avg(eating.map(k=>getDayCalTarget(k,st,data.travelDays,data.socialWeekend)||0));
  const proT=avg(eating.map(k=>getDayProTarget(k,st,data.travelDays,data.socialWeekend)||0));
  const food={eatingDays:eating.length,loggedDays:logged.length,fullDays:full.length,
    coverage:full.length>=Math.max(1,eating.length-1)?"good":full.length>=Math.ceil(eating.length/2)?"thin":"too thin to judge",
    avgCal:full.length?Math.round(avg(full.map(k=>data.nut[k].totalCal))):null,
    avgProtein:full.length?Math.round(avg(full.map(k=>data.nut[k].totalProtein||0))):null,
    calTarget:calT==null?null:Math.round(calT),proteinTarget:proT==null?null:Math.round(proT),
    proteinHitDays:full.filter(k=>(data.nut[k].totalProtein||0)>=0.9*(getDayProTarget(k,st,data.travelDays,data.socialWeekend)||200)).length,
    fastDays:fastDays.length,fastDayTarget:st.wednesdayCal??900,fastDayCal:fastFood};

  // Training: sessions vs plan, and anchor lifts' best set first vs last in 4 weeks.
  const planned=window.filter(k=>!!data.program?.[dw(k)]);
  const done=window.filter(k=>!!data.wk?.[k]);
  const since=shiftDate(today,-28);
  const anchorIds=new Set(Object.values(data.program||PROG.days).flatMap(d=>(d.exercises||[]).filter(e=>e.anchor).map(e=>e.id)));
  const anchors=[...anchorIds].map(id=>{
    const pts=Object.keys(data.wk||{}).filter(k=>k>=since&&k<today).sort().map(k=>{const ex=(data.wk[k].exercises||[]).find(e=>e.id===id);const b=ex&&bestSetByE1rm((ex.sets||[]).filter(s=>s.done));return b?{date:k,e1rm:e1rm(b.weight,b.reps),set:`${b.weight}x${b.reps}`,name:ex.slot?.name||exLibById[id]?.name||id}:null;}).filter(p=>p&&p.e1rm>0);
    if(pts.length<2)return null;
    const a=pts[0],b=pts.at(-1);return{name:b.name,first:a.set,last:b.set,changePct:Math.round((b.e1rm-a.e1rm)/a.e1rm*100),sessions:pts.length};
  }).filter(Boolean);
  const summary=getWeeklyCutSummary(data,today);

  // Recovery: only from a live feed, never a stale average.
  const recKeys=Object.keys(data.rec||{}).filter(k=>k<=today&&data.rec[k]?.recoveryScore!=null).sort();
  const recLast=recKeys.at(-1)||null;const recAgo=recLast?daysBetween(recLast,today):null;
  const recWin=window.filter(k=>data.rec?.[k]?.recoveryScore!=null);
  const feed=recLast==null?"missing":recAgo>2?"stale":"live";
  const recovery={feed,lastDate:recLast,daysSinceLast:recAgo,daysInWindow:recWin.length,
    avg:feed==="live"&&recWin.length>=3?Math.round(avg(recWin.map(k=>data.rec[k].recoveryScore))):null,
    lowDays:feed==="live"?recWin.filter(k=>data.rec[k].recoveryScore<60).length:null,
    sleepAvg:feed==="live"&&recWin.length>=3?r1(avg(recWin.map(k=>data.rec[k].sleepHours).filter(v=>v>0))):null,
    today:feed==="live"?getAutoregProposal(data.rec?.[shiftDate(today,-1)]||data.rec?.[today]):null};

  const steps=window.map(k=>data.steps?.[k]).filter(v=>v>0);
  const tdee=summary.tdee||{};
  const trustTdee=tdee.tdee!=null&&food.coverage==="good"&&(tdee.imputedShare??1)<=0.25;
  const engine=getWeeklyCutRecommendation(data,today,summary);

  const gaps=[];
  if(food.coverage!=="good")gaps.push(`Food logged on ${food.fullDays} of ${food.eatingDays} eating days`);
  if(!trend)gaps.push("Fewer than 2 weigh-ins in 14 days");
  else if(!trend.reliable)gaps.push(`Only ${trend.n} weigh-ins over ${trend.spanDays} days, so the rate is not reliable`);
  if(feed!=="live")gaps.push(feed==="missing"?"No recovery data":`Recovery feed stale: last reading ${recLast}, ${recAgo} days ago`);
  if(steps.length<days-2)gaps.push(`Steps synced on ${steps.length} of ${days} days`);

  return{date:today,weekday:dw(today),windowDays:days,
    block:{name:PROG.name,week,weeks:PROG.weeks,daysLeft,end:PROG.end,startWeight:PROG.startWeight,targetWeight:PROG.targetWeight,checkpoint:PROG.checkpoint||null},
    weight:{rate:trend?.rate??null,reliable:!!trend?.reliable,weighIns14:trend?.n??0,trendWeight:trend?.current??null,latest,toGoal:from!=null?r1(from-PROG.targetWeight):null,neededRate,onPaceRange:[-1.5,-0.6]},
    food,
    training:{planned:planned.length,done:done.filter(k=>planned.includes(k)).length,extra:done.filter(k=>!planned.includes(k)).length,anchors,stalls:(summary.stalls||[]).map(s=>s.name||s.id||String(s)).slice(0,5)},
    recovery,
    steps:{avg:steps.length?Math.round(avg(steps)):null,target:st.steps||15000,days:steps.length},
    tdee:trustTdee?{estimate:tdee.tdee,range:[tdee.tdeeLow,tdee.tdeeHigh],imputedShare:tdee.imputedShare}:{estimate:null,why:tdee.tdee==null?"not enough data":`${Math.round((tdee.imputedShare||0)*100)}% of days imputed or food coverage thin`},
    engineCall:{key:engine.key,action:engine.action,why:engine.why,confidence:engine.confidence},
    gaps};
};

// Compact text for a prompt. Plain lines, every number labeled.
export const briefText=b=>{
  const L=[];const f=b.food,w=b.weight,r=b.recovery,t=b.training;
  L.push(`Date ${b.date} (${b.weekday}). Block ${b.block.name}, week ${b.block.week} of ${b.block.weeks}, ${b.block.daysLeft} days left (ends ${b.block.end}). Start ${b.block.startWeight} lb, goal ${b.block.targetWeight} lb.${b.block.checkpoint?` Checkpoint week ${b.block.checkpoint.week} on ${b.block.checkpoint.date}.`:""}`);
  L.push(`DATA GAPS: ${b.gaps.length?b.gaps.join(". "):"none"}.`);
  L.push(`WEIGHT: ${w.rate==null?"no trend":`trend ${w.rate} lb/wk${w.reliable?"":" (NOT reliable)"} from ${w.weighIns14} weigh-ins in 14 days, trend weight ${w.trendWeight}`}. Latest ${w.latest?`${w.latest.lbs} on ${w.latest.date}`:"none"}. ${w.toGoal!=null?`${w.toGoal} lb to goal, needs ${w.neededRate} lb/wk.`:""} On pace means -1.5 to -0.6 lb/wk.`);
  L.push(`FOOD (last ${b.windowDays} days): ${f.fullDays} of ${f.eatingDays} eating days fully logged (coverage: ${f.coverage}).${f.avgCal!=null?` On logged days: ${f.avgCal} cal vs ${f.calTarget} target, ${f.avgProtein} g protein vs ${f.proteinTarget} g; protein hit on ${f.proteinHitDays} of ${f.fullDays}.`:""} ${f.fastDays?`Wednesday fast day (target ${f.fastDayTarget} cal): ${f.fastDayCal.map(c=>c?`${c} cal logged`:"nothing logged").join(", ")}.`:""}`);
  L.push(`TRAINING: ${t.done} of ${t.planned} planned sessions${t.extra?`, ${t.extra} extra`:""}.${t.anchors.length?" Anchor lifts, best set first vs last in 4 weeks: "+t.anchors.map(a=>`${a.name} ${a.first} to ${a.last} (${a.changePct>0?"+":""}${a.changePct}% e1RM, ${a.sessions} sessions)`).join("; ")+".":""}${t.stalls.length?` Stalls: ${t.stalls.join(", ")}.`:""}`);
  L.push(`RECOVERY: feed ${r.feed}${r.lastDate?`, last reading ${r.lastDate}`:""}.${r.avg!=null?` Avg ${r.avg}% over ${r.daysInWindow} days, ${r.lowDays} under 60, sleep ${r.sleepAvg} h.`:" Do not interpret recovery."}${r.today?` Today's proposal: ${r.today.proposals.map(p=>p.label).join(", ")}.`:""}`);
  L.push(`STEPS: ${b.steps.avg!=null?`avg ${b.steps.avg} on ${b.steps.days} days vs ${b.steps.target}`:"no data"}.`);
  L.push(`TDEE: ${b.tdee.estimate!=null?`${b.tdee.estimate} (range ${b.tdee.range[0]} to ${b.tdee.range[1]})`:`not trustworthy (${b.tdee.why})`}.`);
  L.push(`RULE ENGINE SAYS: ${b.engineCall.action} (${b.engineCall.confidence} confidence).`);
  return L.join("\n");
};

// The weekly analysis contract (api/analyze.js). The JSON shape is what Analysis.jsx renders.
export const ANALYSIS_SYSTEM=`You are the strength coach and nutritionist for one athlete on a fat-loss cut who must keep his strength. You get a brief computed by the app's engine. Write the weekly analysis he reads on his phone.

Rules:
${COACH_RULES.map(r=>"- "+r).join("\n")}
- Plain words, short sentences, active voice. No em dashes, no semicolons. Talk to him as "you".
- Be direct about gaps. Do not praise what the data cannot show.

Return ONLY a JSON object:
{"scores":{"overall":0-100,"training":0-100|null,"nutrition":0-100|null,"recovery":0-100|null,"habits":null},
 "confidence":"high"|"medium"|"low",
 "summary":"2-3 sentences: the one thing that matters most this week",
 "dataGaps":["each gap that limits this analysis"],
 "wins":["specific, with the number"],"gaps":["specific, with the number"],
 "trends":["..."],"correlations":[],
 "recommendations":["at most 3, the first is the one lever for this week"],
 "nextWeekFocus":"one sentence",
 "bodyComposition":null}
Use null for a score when its data is missing or too thin to judge.`;

// Every number in a model's output must trace to the brief (within rounding).
// Returns the numbers that do not. Dates, list markers and the rule constants pass.
// `given` is a brief, or the raw prompt text a model was handed.
export const groundingCheck=(text,given)=>{
  const src=(typeof given==="string"?given:JSON.stringify(given)+" "+briefText(given))+" "+COACH_RULES.join(" ");
  const known=new Set();
  for(const m of src.replace(/(\d),(\d{3})/g,"$1$2").matchAll(/-?\d+(?:\.\d+)?/g)){const v=Math.abs(parseFloat(m[0]));known.add(v);known.add(Math.round(v));known.add(r1(v));}
  const derivable=v=>known.has(v)||[...known].some(k=>Math.abs(k-v)<=Math.max(0.15,k*0.01));
  const cleaned=String(text).replace(/\d{4}-\d{2}-\d{2}/g," ").replace(/"(overall|training|nutrition|recovery|habits)":\s*\d+/g," ").replace(/\b\d+(st|nd|rd|th)\b/g," ");
  const nums=[...cleaned.matchAll(/(?<![\w.])-?\d[\d,]*(?:\.\d+)?/g)].map(m=>Math.abs(parseFloat(m[0].replace(/,/g,""))));
  const small=v=>v<=10&&Number.isInteger(v);
  return [...new Set(nums.filter(v=>!small(v)&&!derivable(v)))];
};
