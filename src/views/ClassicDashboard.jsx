const { useState, useEffect, useRef, useCallback } = React;
import { PROG, cutStepsTarget, DEFAULTS, lds, dw, fmt, wkn, estTime, getDayType, getWeekMonday, isSocialWeekendActive, getDayCalTarget, getDayProTarget, PROTEIN_CHECKPOINTS, getWeeklyRecoveryAvg, getAutoregulation, getConsecutiveRedDays, getTrend, getTopProteinMeals, getInsights, getCutRetentionScore, getWeeklyCutSummary, getWeeklyConsistency, getTonightCloseout, getWeeklyCutRecommendation } from "../../lib/engine.mjs";
import { CloseoutPanel } from "../cards/CloseoutPanel.jsx";
import { WeeklyConsistencyCard } from "../cards/WeeklyConsistencyCard.jsx";
import { WeightTrendCard } from "../cards/WeightTrendCard.jsx";
import { haptic } from "../core/device.js";
import { useToday, WATER_PRESETS, waterOps } from "../core/hooks.js";
import { useBackClose } from "../core/nav.js";
import { sv, svSB } from "../core/storage.js";
import { C, FD } from "../core/theme.js";
import { B, Br, Ch, L, N, S, X } from "../ui/atoms.jsx";
import { AnalysisSection } from "./Analysis.jsx";

// ═══ DASHBOARD ═══
const Dashboard=({data,setData,setTab,allergies,allergyErr})=>{
  const [showMeasForm,setShowMeasForm]=useState(false);
  const [showFullDashboard,setShowFullDashboard]=useState(false);
  useBackClose(showFullDashboard,()=>setShowFullDashboard(false));
  const [measF,setMeasF]=useState({chest:"",waist:"",armL:"",armR:"",thighL:"",thighR:""});
  const [allergyOpen,setAllergyOpen]=useState(false);
  const todayKey=useToday();

  const t=todayKey,dn=dw(t),w=wkn(t);
  const sess=data.program[dn],nut=data.nut[t],rec=data.rec[t];
  const wts=Object.entries(data.wt).sort((a,b)=>b[0].localeCompare(a[0]));
  const lw=wts[0]?.[1];
  const w7ago=(()=>{const d=new Date();d.setDate(d.getDate()-7);const ds=lds(d);
    const near=wts.filter(([k])=>k<=ds);return near.length?near[0][1]:null;})();
  const wc=lw&&w7ago?Math.round(lw-w7ago):null;
  const steps=data.steps?.[t]||0;
  const ws=rec?.recoveryScore;
  const waterToday=data.water?.[t]||0;
  const waterGoal=(data.settings||DEFAULTS).water||DEFAULTS.water;
  const {add:addWater,reset:resetWater}=waterOps(setData,t);

  let streak=0;const sd=new Date();
  for(let i=0;i<60;i++){const ds=lds(sd);const d=dw(ds);
    if(["saturday","sunday"].includes(d)){sd.setDate(sd.getDate()-1);continue;}
    if(data.wk[ds]||data.nut[ds]){streak++;sd.setDate(sd.getDate()-1);}else break;}

  const st=data.settings||DEFAULTS;
  const calT=getDayCalTarget(t,st,data.travelDays,data.socialWeekend),proT=getDayProTarget(t,st,data.travelDays,data.socialWeekend);
  const tCal=nut?.totalCal||0,tPro=nut?.totalProtein||0,tFib=nut?.totalFiber||0;
  const dayType=getDayType(t,data.travelDays);
  // One analytics computation per data change: getWeeklyCutSummary already
  // runs calcAdaptiveTDEE + getStalls internally, so everything derives from it.
  const analytics=React.useMemo(()=>{
    const cutSummary=getWeeklyCutSummary(data,t);
    return{cutSummary,
      weeklyRecommendation:getWeeklyCutRecommendation(data,t,cutSummary),
      weeklyConsistency:getWeeklyConsistency(data,t,cutSummary)};
  },[data,t]);
  const tdeeData=analytics.cutSummary.tdee;
  const weeklyRecAvg=getWeeklyRecoveryAvg(data.rec);
  const autoreg=getAutoregulation(weeklyRecAvg);
  const weeklyRecommendation=analytics.weeklyRecommendation;
  const weeklyConsistency=analytics.weeklyConsistency;
  const tonightCloseout=getTonightCloseout(data,t);
  const redDays=getConsecutiveRedDays(data.rec);
  const fatPct=tCal>0?Math.round(((nut?.totalFat||0)*9/tCal)*100):0;
  const weightTrend=getTrend(data.wt,t);

  const wCh=wts.slice(0,30).reverse().map(([d,v])=>({v,d:d.slice(5)}));
  const recCh=Object.entries(data.rec).filter(([_,v])=>v.recoveryScore).sort((a,b)=>a[0].localeCompare(b[0])).slice(-30).map(([d,v])=>({v:v.recoveryScore,d:d.slice(5)}));
  const rhrCh=Object.entries(data.rec).filter(([_,v])=>v.rhr).sort((a,b)=>a[0].localeCompare(b[0])).slice(-30).map(([d,v])=>({v:v.rhr,d:d.slice(5)}));
  const stCh=Object.entries(data.steps||{}).filter(([_,v])=>v>0).sort((a,b)=>a[0].localeCompare(b[0])).slice(-30).map(([d,v])=>({v,d:d.slice(5)}));
  const slCh=Object.entries(data.rec).filter(([_,v])=>v.sleepHours).sort((a,b)=>a[0].localeCompare(b[0])).slice(-30).map(([d,v])=>({v:v.sleepHours,d:d.slice(5)}));
  const liftsHeld=Object.values(data.prog).filter(p=>p.lastDate).length;
  const totalL=Object.keys(data.prog).length;

  const habitDays=Object.entries(data.habits||{}).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,7);
  const customHLen=(data.settings.customHabits||[]).length;
  const habitScore=habitDays.length?Math.round(habitDays.reduce((s,[_,h])=>{
    if(!h)return s;let c=0;const tot=7+customHLen;
    if(h.alcohol===false)c++;if(h.cannabis===false)c++;if(h.screensOff===true)c++;
    if(h.sunlight===true)c++;if(h.bedBy1030===true)c++;if(h.readBeforeBed===true)c++;if(h.supplements===true)c++;
    c+=Object.values(h.custom||{}).filter(v=>v).length;
    return s+c/tot;},0)/habitDays.length*100):null;

  const hour=new Date().getHours();
  const mealsLogged=(nut?.meals||[]).length;
  const proRemaining=Math.max(0,proT-tPro);
  const calRemaining=calT!==null?Math.max(0,calT-tCal):0;
  const mealSlots=hour<10?4:hour<14?3:hour<17?2:hour<20?1:0;
  const dinnerPro=Math.min(35,proRemaining);
  const preDinnerSlots=Math.max(0,mealSlots-1);
  const perMealPro=preDinnerSlots>0?Math.ceil(Math.max(0,proRemaining-dinnerPro)/preDinnerSlots):0;
  const topProMeals=getTopProteinMeals(data);
  const retention=getCutRetentionScore(data);
  const dataInsights=getInsights(data);

  const dks=["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
  const weightLogged=data.wt?.[t]!=null;
  const nutritionLogged=!!nut?.meals?.length||tCal>0||tPro>0;
  const workoutDone=!!data.wk?.[t];
  const cardioDone=!!data.cardio?.[t]?.done;
  const habitsLogged=!!data.habits?.[t]&&Object.values(data.habits[t]).some(v=>v!==null&&v!==undefined);
  const proteinPct=Math.min(100,Math.round(tPro/(proT||1)*100));
  const cutStatus=(()=>{
    if(ws!=null&&ws<45)return{label:"Recovery-biased day",color:C.r,msg:"Protect lifting. Reduce cardio before cutting food."};
    if(weightTrend?.direction==="flat"&&nutritionLogged)return{label:"Tighten execution",color:C.t,msg:"Hit protein and log cleanly before changing targets."};
    if(proteinPct>=90&&(calT===null||tCal<=calT))return{label:"On track",color:C.g,msg:"Stay the course. Complete the next task."};
    return{label:"Cut execution",color:C.p,msg:"Protein first. Log the minimum needed to steer today."};
  })();
  const nextAction=(()=>{
    if(!weightLogged)return{label:"Log weight",tab:"weight",hint:"Morning scale anchors the cut."};
    if(!nutritionLogged)return{label:"Log first meal",tab:"nutrition",hint:"Calories/protein drive the adjustment logic."};
    if(sess&&!workoutDone)return{label:"Start workout",tab:"training",hint:sess.name};
    if(!cardioDone)return{label:"Log cardio",tab:"training",hint:"Type, time, zone, optional distance/calories."};
    if(!habitsLogged)return{label:"Mark clean day",tab:"dashboard",hint:"One tap in Tonight closeout below."};
    return{label:"Review details",tab:"dashboard",hint:"Core loops are done."};
  })();
  const allergyTop=(allergies?.summary||[]).slice(0,3);

  if(!showFullDashboard)return(
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div>
        <div style={{fontSize:18,fontWeight:800,color:C.t}}>Cut Command</div>
        <div style={{fontSize:13,color:C.t3}}>{fmt(t)} · Wk {w}/{PROG.weeks}{w===PROG.deload?" · DELOAD":""}{dayType==="travel"?" · TRAVEL DAY":""}</div>
      </div>

      <X style={{padding:16,borderLeft:`4px solid ${cutStatus.color}`}}>
        <div style={{fontSize:11,fontWeight:800,color:cutStatus.color,letterSpacing:"0.08em",marginBottom:4}}>{cutStatus.label}</div>
        <div style={{fontSize:15,fontWeight:700,color:C.t,lineHeight:1.35}}>{cutStatus.msg}</div>
        <button onClick={()=>setTab(nextAction.tab)} style={{marginTop:12,width:"100%",border:"none",borderRadius:8,background:C.p,color:C.oa,padding:"13px 16px",fontSize:15,fontWeight:800,fontFamily:"inherit",boxShadow:C.sh,cursor:"pointer"}}>{nextAction.label}</button>
        <div style={{fontSize:12,color:C.t3,marginTop:6,textAlign:"center"}}>{nextAction.hint}</div>
      </X>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <X style={{padding:12}}>
          <div style={{fontSize:11,fontWeight:800,color:C.t3}}>Protein</div>
          <div style={{fontSize:26,fontWeight:850,color:tPro>=proT?C.g:C.r}}>{tPro}<span style={{fontSize:14,color:C.t3,fontWeight:650}}>/{proT}g</span></div>
          <Br v={tPro} max={proT} color={tPro>=proT?C.g:C.r} h={7}/>
        </X>
        <X style={{padding:12}}>
          <div style={{fontSize:11,fontWeight:800,color:C.t3}}>Calories</div>
          <div style={{fontSize:26,fontWeight:850,color:calT&&tCal>calT?C.r:C.p}}>{calT===null?"Flex":tCal}<span style={{fontSize:14,color:C.t3,fontWeight:650}}>{calT?`/${calT}`:""}</span></div>
          {calT?<Br v={tCal} max={calT} color={tCal>calT?C.r:C.p} h={7}/>:<div style={{fontSize:11,color:C.t3}}>protein floor only</div>}
        </X>
      </div>

      <X style={{padding:12,borderLeft:`4px solid ${waterToday>=waterGoal?C.g:C.p}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:8}}>
          <div>
            <div style={{fontSize:11,fontWeight:800,color:C.t3}}>Water</div>
            <div style={{fontSize:24,fontWeight:850,color:waterToday>=waterGoal?C.g:C.p}}>{waterToday}<span style={{fontSize:14,color:C.t3,fontWeight:650}}>/{waterGoal} oz</span></div>
          </div>
          {waterToday>0&&<button onClick={resetWater} style={{border:"none",background:"transparent",color:C.t3,fontSize:11,fontWeight:800,fontFamily:"inherit"}}>Reset</button>}
        </div>
        <Br v={waterToday} max={waterGoal} color={waterToday>=waterGoal?C.g:C.p} h={7}/>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginTop:9}}>
          {WATER_PRESETS.map(b=><button type="button" key={b.oz} onClick={()=>{haptic();addWater(b.oz);}} style={{border:`1px solid ${C.bd}`,background:C.bg,color:C.t,borderRadius:9,padding:"10px 4px",minHeight:60,cursor:"pointer",fontFamily:FD}}><span style={{display:"block",fontSize:22,fontWeight:800,lineHeight:1}}>+{b.oz}</span><span style={{display:"block",fontSize:9,fontWeight:700,letterSpacing:"0.08em",color:C.t3,marginTop:3}}>{b.l}</span></button>)}
        </div>
      </X>

      <X style={{padding:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div>
            <div style={{fontSize:11,fontWeight:800,color:C.t3}}>Today</div>            <div style={{fontSize:16,fontWeight:800,color:C.t}}>{sess?sess.name:"Rest Day"}</div>
            {sess&&<div style={{fontSize:12,color:C.t2}}>{sess.focus} · ~{estTime(sess)}m</div>}
          </div>
          <button onClick={()=>setTab("training")} style={{border:`1px solid ${C.bd}`,background:"transparent",color:C.t,borderRadius:8,padding:"8px 12px",fontSize:12,fontWeight:800,fontFamily:"inherit"}}>{workoutDone?"Done":"Open"}</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:5}}>
          {[{l:"Scale",ok:weightLogged},{l:"Food",ok:nutritionLogged},{l:"Lift",ok:!sess||workoutDone},{l:"Cardio",ok:cardioDone},{l:"Habits",ok:habitsLogged}].map(x=>(
            <div key={x.l} style={{textAlign:"center",padding:"7px 2px",borderRadius:6,background:"transparent",border:`1px solid ${C.bd}`}}>
              <div style={{fontSize:14,fontWeight:800,color:x.ok?C.g:C.t3}}>{x.ok?"✓":"○"}</div>
              <div style={{fontSize:9,fontWeight:800,color:C.t3}}>{x.l}</div>
            </div>
          ))}
        </div>
      </X>

      {(()=>{const r=data.rec?.[t];if(!r||(r.recoveryScore==null&&r.hrv==null&&r.sleepHours==null))return null;
        const sc=r.recoveryScore;const col=sc==null?C.t2:sc>=60?C.g:sc<40?C.r:C.t2;
        return(<X style={{padding:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:11,fontWeight:800,color:C.t3}}>Recovery{r.source?` · ${String(r.source).toUpperCase()}`:""}</div>
            {sc!=null&&<div style={{fontSize:22,fontWeight:800,color:col,fontFamily:FD}}>{sc}%</div>}
          </div>
          <div style={{display:"flex",gap:16,marginTop:4}}>
            {[["HRV",r.hrv?`${Math.round(r.hrv)}ms`:null],["RHR",r.rhr?`${Math.round(r.rhr)}`:null],["SLEEP",r.sleepHours?`${(+r.sleepHours).toFixed(1)}h`:null]].filter(x=>x[1]).map(([l,v])=>(
              <div key={l}><span style={{fontSize:16,fontWeight:800,color:C.t,fontFamily:FD}}>{v}</span> <span style={{fontSize:9,fontWeight:700,color:C.t3,fontFamily:FD,letterSpacing:"0.06em"}}>{l}</span></div>))}
          </div>
        </X>);})()}

      <WeightTrendCard trend={weightTrend} compact/>

      <X style={{padding:12,borderLeft:`4px solid ${C.bd}`}}>
        <div style={{fontSize:11,fontWeight:800,color:C.t3}}>Tonight closeout</div>
        <div style={{fontSize:15,fontWeight:850,color:C.t,marginTop:2,lineHeight:1.3}}>Tomorrow: {tonightCloseout.tomorrowMode}</div>
        <div style={{fontSize:12,color:C.t2,marginTop:4,lineHeight:1.35}}>{tonightCloseout.action}</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:5,marginTop:9}}>
          {[
            {l:"Food",ok:tonightCloseout.foodOk,v:tonightCloseout.proteinLeft>0?`${tonightCloseout.proteinLeft}g P left`:"OK"},
            {l:"Steps",ok:tonightCloseout.stepsOk,v:`${Math.round(tonightCloseout.steps/1000)}k/${Math.round(tonightCloseout.stepsTarget/1000)}k`},
            {l:"Cardio",ok:tonightCloseout.cardioDone,v:tonightCloseout.cardioDone?"Done":"Open"},
            {l:"Recovery",ok:tonightCloseout.recovery==null||tonightCloseout.recovery>=55,v:tonightCloseout.recovery==null?"○":`${tonightCloseout.recovery}%`}
          ].map(x=>(
            <div key={x.l} style={{padding:"7px 4px",borderRadius:6,textAlign:"center",background:"transparent",border:`1px solid ${C.bd}`}}>
              <div style={{fontSize:9,fontWeight:850,color:C.t3}}>{x.l}</div>
              <div style={{fontSize:11,fontWeight:850,color:x.ok?C.g:C.t3,marginTop:1}}>{x.v}</div>
            </div>
          ))}
        </div>
        <div style={{marginTop:10}}><CloseoutPanel data={data} setData={setData}/></div>
      </X>

      <X style={{padding:12,borderLeft:`4px solid ${C.bd}`}}>
        <div style={{fontSize:11,fontWeight:800,color:C.t3}}>Weekly recommendation</div>
        <div style={{fontSize:15,fontWeight:800,color:C.t,marginTop:2,lineHeight:1.3}}>{weeklyRecommendation.action}</div>
        <div style={{fontSize:12,color:C.t2,marginTop:4,lineHeight:1.35}}>{weeklyRecommendation.why}</div>
        <div style={{fontSize:11,fontWeight:800,color:C.t3,marginTop:8}}>Confidence: {weeklyRecommendation.confidence} · data quality: {weeklyRecommendation.summary.loggedDays}/7 food, {weeklyRecommendation.summary.weightDays}/7 weight, {weeklyRecommendation.summary.recoveryDays}/7 recovery</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:8}}>
          {weeklyRecommendation.signals.map(sig=>{
            const col=sig.tone==="good"?C.g:sig.tone==="bad"?C.r:sig.tone==="warn"?C.t2:C.t3;
            const bg=sig.tone==="good"?C.gl:sig.tone==="bad"?C.rl:sig.tone==="warn"?C.bg:C.bg;
            return <span key={sig.label} style={{fontSize:10,fontWeight:850,color:C.t3,background:"transparent",border:`1px solid ${C.bd}`,borderRadius:6,padding:"5px 7px"}}>{sig.label}: <span style={{color:col}}>{sig.value}</span></span>;
          })}
        </div>
      </X>

      <WeeklyConsistencyCard summary={weeklyConsistency}/>

      {/* Allergies · demoted to a compact expandable line below primary cards */}
      <X style={{padding:"9px 12px",borderLeft:`3px solid ${C.bd}`,cursor:"pointer"}} onClick={()=>setAllergyOpen(o=>!o)}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
          <div style={{fontSize:12,color:C.t2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:allergyOpen?"normal":"nowrap"}}>
            <b style={{color:C.t3,fontSize:11}}>Allergies</b>{" "}
            {allergyTop.length?allergyTop.map(a=>`${a.name} ${a.level||"○"}`).join(" · "):allergyErr||"Loading…"}
          </div>
          <span style={{fontSize:11,color:C.t3}}>{allergyOpen?"▴":"▾"}</span>
        </div>
        {allergyOpen&&(
          <div style={{fontSize:12,color:C.t2,marginTop:6,lineHeight:1.5}}>
            {allergyTop.map(a=><div key={a.name}><b style={{color:C.t}}>{a.name}:</b> {a.level||"○"}{a.count?` · ${a.count}`:""}{a.trend?` · ${a.trend}`:""}</div>)}
            <a href={allergies?.sourceUrl||"https://austinpollen.com/"} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{fontSize:11,fontWeight:800,color:C.p,textDecoration:"none"}}>{allergies?.source||"AustinPollen.com"}</a>
          </div>
        )}
      </X>

      <button onClick={()=>setShowFullDashboard(true)} style={{background:"transparent",border:`1px solid ${C.bd}`,borderRadius:8,padding:"11px",fontSize:13,fontWeight:800,color:C.t2,fontFamily:"inherit"}}>Open review details</button>
    </div>
  );

  return(
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      <div>
        <div style={{fontSize:18,fontWeight:700,color:C.t}}>Review Details</div><button onClick={()=>setShowFullDashboard(false)} style={{background:"transparent",border:`1px solid ${C.bd}`,borderRadius:8,padding:"7px 10px",fontSize:12,fontWeight:800,color:C.t2,fontFamily:"inherit"}}>← Cut Command</button>
        <div style={{fontSize:13,color:C.t3}}>{fmt(t)} · Wk {w}/{PROG.weeks}{w===PROG.deload?" · DELOAD":""}{dayType==="travel"?" · TRAVEL DAY":""}</div>
      </div>

      <X style={{borderLeft:`3px solid ${C.bd}`,padding:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:11,fontWeight:600,color:C.p,letterSpacing:"0.06em"}}>Today</div>
            <div style={{fontSize:16,fontWeight:700,color:C.t,marginTop:1}}>{sess?sess.name:"Rest Day"}</div>
            {sess&&<div style={{fontSize:13,color:C.t2}}>{sess.focus} · {sess.exercises.length} ex · ~{estTime(sess)}m</div>}
          </div>
          {data.wk[t]?<span style={{fontSize:13,fontWeight:600,color:C.g}}>Complete</span>
           :sess?<span style={{fontSize:13,fontWeight:600,color:C.p}}>Ready</span>:null}
        </div>
      </X>

      {/* ═══ MORNING GAME PLAN ═══ */}
      {mealSlots>0&&proRemaining>0&&(
        <X style={{borderLeft:`3px solid ${C.bd}`,padding:12}}>
          <div style={{fontSize:11,fontWeight:700,color:C.p,letterSpacing:"0.06em",marginBottom:6}}>Game Plan</div>
          <div style={{fontSize:13,color:C.t,marginBottom:8}}>
            <span style={{fontWeight:700}}>{proRemaining}g protein</span> remaining across <span style={{fontWeight:700}}>{mealSlots} meal{mealSlots!==1?"s":""}</span>
            {calRemaining>0&&<span style={{color:C.t2}}> / {calRemaining} cal left</span>}
          </div>
          {preDinnerSlots>0&&(
            <div style={{fontSize:12,color:C.t2,marginBottom:4}}>
              {Array.from({length:preDinnerSlots}).map((_,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",borderBottom:`1px solid ${C.bl}`}}>
                  <span>{preDinnerSlots===1?"Next meal":`Meal ${mealsLogged+i+1}`}</span>
                  <span style={{fontWeight:600,color:C.t}}>~{perMealPro}g protein · ~{Math.round(calRemaining/mealSlots)} cal</span>
                </div>
              ))}
            </div>
          )}
          <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0",fontSize:12}}>
            <span style={{color:C.t2}}>Dinner (flexible)</span>
            <span style={{fontWeight:600,color:C.t}}>~{dinnerPro}g protein · eat what you want</span>
          </div>
          {topProMeals.length>0&&(
            <div style={{marginTop:8,paddingTop:6,borderTop:`1px solid ${C.bl}`}}>
              <div style={{fontSize:11,fontWeight:600,color:C.t3,marginBottom:4}}>HIGH-PROTEIN FROM YOUR HISTORY</div>
              {topProMeals.slice(0,3).map((m,i)=>(
                <div key={i} style={{fontSize:12,color:C.t2,padding:"2px 0"}}>
                  {m.desc} · <span style={{fontWeight:600,color:C.g}}>{m.pro}g pro</span>, {m.cal} cal
                </div>
              ))}
            </div>
          )}
          {rec?.recoveryScore!=null&&rec.recoveryScore<55&&(
            <div style={{marginTop:6,padding:"6px 8px",background:C.bg,borderRadius:8,fontSize:11,color:C.t2,fontWeight:600}}>
              Recovery at {rec.recoveryScore}% · add ~25g protein today. Don't cut calories, your body needs fuel to recover.
            </div>
          )}
        </X>
      )}

      {/* ═══ AUTOREGULATION CARD ═══ */}
      {autoreg&&(<X style={{padding:10,borderLeft:`3px solid ${autoreg.level==="green"?C.g:autoreg.level==="yellow"?C.bd:C.r}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
          <div style={{fontSize:11,fontWeight:700,color:autoreg.level==="green"?C.g:autoreg.level==="yellow"?C.t2:C.r,letterSpacing:"0.06em"}}>
            Recovery Gate {weeklyRecAvg!=null?`· ${weeklyRecAvg}% avg`:""}
          </div>
        </div>
        <div style={{fontSize:13,fontWeight:600,color:C.t}}>{autoreg.msg}</div>
        <div style={{fontSize:12,color:C.t2,marginTop:2}}>{autoreg.action}</div>
        {redDays>=2&&<div style={{fontSize:12,color:C.r,fontWeight:700,marginTop:4}}>⚠ {redDays} consecutive red days · take a rest day. Shift the split forward.</div>}
      </X>)}

      {/* ═══ WEIGHT TREND ALERT ═══ */}
      {weightTrend&&Math.abs(weightTrend.rate)>1&&(<X style={{padding:10,borderLeft:`3px solid ${C.bd}`}}>
        <div style={{fontSize:11,fontWeight:700,color:C.r,letterSpacing:"0.06em"}}>Weight Alert · {weightTrend.direction==="up"?"gaining":"losing"} {Math.abs(weightTrend.rate).toFixed(1)} lb/wk</div>
        <div style={{fontSize:12,color:C.t2,marginTop:2}}>{weightTrend.rate>0?"Pull back weekend portions slightly. You are in surplus.":"Add 200 cal to training days from carbs. You are cutting; protect performance."}</div>
      </X>)}

      {/* ═══ DAY TYPE INDICATOR ═══ */}
      <X style={{padding:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:11,fontWeight:700,color:C.t3}}>{isSocialWeekendActive(t,data.socialWeekend)&&calT===null?"Social Weekend":dayType==="wednesday"?"Wednesday (Fast)":dayType==="training"?"Training Day":"Weekend"}</div>
        <div style={{fontSize:12,color:C.t2}}>{calT!==null?`${calT} cal · ${proT}g protein target`:`${proT}g protein floor`}</div>
      </X>

      {/* ═══ SOCIAL WEEKEND TOGGLE ═══ */}
      {(()=>{
        const swActive=isSocialWeekendActive(t,data.socialWeekend);
        const toggleSW=()=>{
          const monday=getWeekMonday(t);
          const nd={...data,socialWeekend:swActive?{active:false,weekOf:null}:{active:true,weekOf:monday}};
          setData(nd);sv(nd);
        };
        return(<X style={{padding:"8px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:swActive?C.p:C.t3,letterSpacing:"0.06em"}}>Social Weekend</div>
            {swActive&&<div style={{fontSize:10,color:C.t2}}>Mon-Thu targets lowered · ~1.5 lbs this week</div>}
          </div>
          <button onClick={toggleSW} style={{background:swActive?C.p:C.bl,color:swActive?C.oa:C.t2,border:`1px solid ${swActive?C.p:C.bd}`,borderRadius:8,padding:"4px 10px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{swActive?"Active":"Off"}</button>
        </X>);
      })()}

      {/* ═══ ADAPTIVE TDEE ═══ */}
      {(()=>{
        const td=tdeeData;
        if(!td)return null;
        const borderColor=td.phase==="confident"?C.g:td.phase==="early"?C.bd:td.phase==="seeded"?C.g:C.p;
        if(td.phase==="collecting")return(
          <X style={{padding:12,borderLeft:`3px solid ${C.bd}`}}>
            <L>Adaptive TDEE</L>
            <div style={{fontSize:14,fontWeight:600,color:C.t2,marginTop:4}}>Collecting data...</div>
            <div style={{fontSize:12,color:C.t3,marginTop:4}}>Log weight + meals for {Math.max(1,7-td.daysUsed)} more day{7-td.daysUsed!==1?"s":""} to unlock your personalized TDEE</div>
            <div style={{marginTop:8}}><Br v={td.daysUsed} max={7} color={C.p} h={6}/></div>
            <div style={{fontSize:10,color:C.t3,marginTop:3,textAlign:"right"}}>{td.daysUsed}/7 days</div>
          </X>
        );
        const deficitLabel=td.deficit>0?"deficit":td.deficit<0?"surplus":"on target";
        const deficitColor=td.deficit>0?C.g:td.deficit<0?C.r:C.t2;
        const paceLabel=td.weeklyChange<0?`~${Math.round(Math.abs(td.weeklyChange))} lbs/wk loss`
          :td.weeklyChange>0?`~${Math.round(td.weeklyChange)} lbs/wk gain`:"weight stable";
        return(
          <X style={{padding:12,borderLeft:`3px solid ${borderColor}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <L>Adaptive TDEE{td.phase==="early"?" · early estimate":td.phase==="seeded"?" · recomp seeded":""}</L>
              <span style={{fontSize:10,color:C.t3}}>{td.daysUsed}d cut{td.historyDays?` + ${td.historyDays}d history`:""}</span>
            </div>
            <div style={{display:"flex",alignItems:"baseline",gap:6,marginBottom:6}}>
              <span style={{fontSize:26,fontWeight:800,color:C.t}}>{td.phase==="early"?"~":""}{td.tdee.toLocaleString()}</span>
              {td.tdeeLow!=null&&<span style={{fontSize:13,fontWeight:600,color:C.t3}}>±{td.tdee-td.tdeeLow}</span>}
              <span style={{fontSize:13,color:C.t3}}>cal/day</span>
            </div>
            <Br v={td.confidence} max={100} color={borderColor} h={5}/>
            <div style={{fontSize:10,color:C.t3,marginTop:2}}>confidence: {td.confidence}%{td.imputedShare!=null?` · ${Math.round((1-td.imputedShare)*100)}% measured`:""}{td.calibrated===false?" · calibrate in Setup to tighten":""}{td.phase==="early"?" · keep logging for accuracy":td.phase==="seeded"?" · seeded from recomp data":""}</div>
            {td.phase==="confident"&&(<>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginTop:10}}>
                <div style={{textAlign:"center",padding:6,background:C.bg,borderRadius:8}}>
                  <div style={{fontSize:14,fontWeight:700,color:td.weeklyChange<0?C.g:td.weeklyChange>0?C.r:C.t2}}>{td.weeklyChange>0?"+":""}{Math.round(td.weeklyChange)}</div>
                  <div style={{fontSize:9,color:C.t3,fontWeight:600}}>lbs/wk</div>
                </div>
                <div style={{textAlign:"center",padding:6,background:C.bg,borderRadius:8}}>
                  <div style={{fontSize:14,fontWeight:700,color:C.t2}}>{td.avgCalories.toLocaleString()}</div>
                  <div style={{fontSize:9,color:C.t3,fontWeight:600}}>avg in</div>
                </div>
                <div style={{textAlign:"center",padding:6,background:C.bg,borderRadius:8}}>
                  <div style={{fontSize:14,fontWeight:700,color:deficitColor}}>{Math.abs(td.deficit)}</div>
                  <div style={{fontSize:9,color:C.t3,fontWeight:600}}>{deficitLabel}</div>
                </div>
              </div>
              <div style={{marginTop:8,padding:"6px 8px",background:C.gl,borderRadius:8,fontSize:11,color:C.g}}>
                Eating {Math.abs(td.deficit)} cal {td.deficit>0?"below":"above"} TDEE · {paceLabel}
              </div>
            </>)}
          </X>
        );
      })()}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
        <X style={{padding:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:4}}>
            <span style={{fontSize:11,fontWeight:600,color:C.t3}}>Weight</span>
            <span style={{fontSize:18,fontWeight:700,color:C.t}}>{lw?Math.round(lw):"○"}</span>
          </div>
          {wc&&<div style={{fontSize:11,fontWeight:600,color:wc<0?C.g:wc>0?C.r:C.t3,marginBottom:4}}>{wc>0?"+":""}{wc} lbs 7d</div>}
          {wCh.length>=2?(
            <svg viewBox={`0 0 ${wCh.length*20} 28`} style={{width:"100%",height:28}} preserveAspectRatio="none">
              {(()=>{const vals=wCh.map(d=>d.v),mn=Math.min(...vals),mx=Math.max(...vals),rng=mx-mn||1;
                const pts=wCh.map((d,i)=>[i*(wCh.length*20/(wCh.length-1)),28-4-((d.v-mn)/rng)*20]);
                const line=pts.map(p=>p.join(",")).join(" ");
                return <polyline points={line} fill="none" stroke={C.p} strokeWidth="2" strokeLinecap="round"/>;
              })()}
            </svg>
          ):<div style={{fontSize:12,color:C.t3,textAlign:"center",padding:"4px 0"}}>No data yet</div>}
        </X>

        <X style={{padding:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:4}}>
            <span style={{fontSize:11,fontWeight:600,color:C.t3}}>Steps</span>
            <span style={{fontSize:18,fontWeight:700,color:C.t}}>{steps?steps.toLocaleString():"○"}</span>
          </div>
          <Br v={steps} max={cutStepsTarget(st)} color={steps>=cutStepsTarget(st)?C.g:C.t3} h={6}/>
          <div style={{fontSize:10,color:C.t3,marginTop:3,textAlign:"right"}}>{steps?Math.round(steps/cutStepsTarget(st)*100):0}% of {(cutStepsTarget(st)/1000).toFixed(0)}k</div>
        </X>
      </div>

      {(()=>{const wt=data.water?.[t]||0;const waterG=st.water||128;return(
      <X style={{padding:10}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
          <span style={{fontSize:11,fontWeight:600,color:C.t3}}>Water</span>
          <span style={{fontSize:16,fontWeight:700,color:wt>=waterG?C.g:C.p}}>{wt} <span style={{fontSize:12,color:C.t3,fontWeight:500}}>/ {waterG} oz</span></span>
        </div>
        <Br v={wt} max={waterG} color={wt>=waterG?C.g:C.p} h={6}/>
      </X>);})()}

      <X style={{padding:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <span style={{fontSize:13,fontWeight:700,color:C.t}}>Nutrition</span>
          <span style={{fontSize:12,color:C.t3}}>{fmt(t)}</span>
        </div>
        {calT!==null?(<>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}>
          <div style={{fontSize:28,fontWeight:700,color:tCal>calT?C.r:C.p}}>{tCal}</div>
          <div style={{fontSize:14,color:C.t3}}>/ {calT} cal</div>
        </div>
        <Br v={tCal} max={calT} color={tCal>calT?C.r:C.p} h={8}/>
        </>):(<>
        <div style={{fontSize:13,color:C.t2,marginBottom:6,fontStyle:"italic"}}>Social weekend · log your food, protein first</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}>
          <div style={{fontSize:28,fontWeight:700,color:tPro>=proT?C.g:C.p}}>{tPro}g</div>
          <div style={{fontSize:14,color:C.t3}}>/ {proT}g protein floor</div>
        </div>
        <Br v={tPro} max={proT} color={tPro>=proT?C.g:C.p} h={8}/>
        </>)}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6,marginTop:10}}>
          {[{l:"Protein",v:tPro,x:proT,u:"g",c:tPro>=proT?C.g:C.r},
            {l:"Carbs",v:nut?.totalCarbs||0,x:null,u:"g",c:C.t2},
            {l:"Fat",v:nut?.totalFat||0,x:null,u:"g",c:fatPct>25?C.r:C.t2},
            {l:"Fiber",v:tFib,x:st.fiber||30,u:"g",c:C.v}].map((m,i)=>(
            <div key={i} style={{textAlign:"center"}}>
              <div style={{fontSize:20,fontWeight:700,color:m.c}}>{m.v}{m.u}</div>
              {m.x?<div style={{fontSize:10,color:C.t3}}>/ {m.x}{m.u}</div>:<div style={{fontSize:10,color:C.t3}}>&nbsp;</div>}
              <div style={{fontSize:10,fontWeight:600,color:C.t3,marginTop:2}}>{m.l}</div>
              {m.x&&<Br v={m.v} max={m.x} color={m.c} h={4}/>}
            </div>
          ))}
        </div>
        {fatPct>25&&tCal>0&&(<div style={{marginTop:6,padding:"6px 8px",background:C.rl,borderRadius:8,fontSize:11,color:C.r,fontWeight:600}}>
          Fat at {fatPct}% of calories (target: 20-25%). Check cooking oil, cheese, sauces.
        </div>)}
        {dayType==="training"&&tPro>0&&tPro<100&&(<div style={{marginTop:4,padding:"6px 8px",background:C.bg,borderRadius:8,fontSize:11,color:C.t2,fontWeight:600}}>
          Protein checkpoint: {tPro}g so far · load remaining meals heavier on lean protein.
        </div>)}
      </X>

      {/* ═══ PROTEIN CHECKPOINTS ═══ */}
      {dayType==="training"&&(<X style={{padding:10}}>
        <div style={{fontSize:11,fontWeight:700,color:C.t3,letterSpacing:"0.06em",marginBottom:6}}>Protein Checkpoints</div>
        {PROTEIN_CHECKPOINTS.map((cp,i)=>{
          const hit=tPro>=cp.target;
          return(<div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 0",borderTop:i>0?`1px solid ${C.bl}`:"none"}}>
            <span style={{fontSize:14,color:hit?C.g:C.t3}}>{hit?"✓":"○"}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:12,fontWeight:600,color:hit?C.g:C.t}}>{cp.label}</div>
              <div style={{fontSize:10,color:C.t3}}>{cp.time} · {cp.target}g</div>
            </div>
            <Br v={Math.min(tPro,cp.target)} max={cp.target} color={hit?C.g:C.t3} h={4}/>
          </div>);
        })}
      </X>)}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
        <X style={{padding:8,textAlign:"center"}}>
          <div style={{fontSize:20,fontWeight:700,color:ws>=67?C.g:ws>=34?C.t2:ws!=null?C.r:C.t3}}>{ws??"-"}{ws!=null?"%":""}</div>
          <div style={{fontSize:10,fontWeight:600,color:C.t3}}>Recovery{rec?.source?` · ${String(rec.source).toUpperCase()}`:""}</div>
          {rec&&<div style={{fontSize:10,color:C.t3,marginTop:3,lineHeight:1.35}}>
            {rec.sleepHours?`${rec.sleepHours}h sleep`:"Sleep ○"} · {rec.hrv?`${rec.hrv} HRV`:"HRV ○"} · {rec.rhr?`${rec.rhr} RHR`:"RHR ○"}
          </div>}
        </X>
        <X style={{padding:8,textAlign:"center"}}>
          <div style={{fontSize:20,fontWeight:700,color:streak>=5?C.g:C.t2}}>{streak}<span style={{fontSize:12,fontWeight:600}}>d</span></div>
          <div style={{fontSize:10,fontWeight:600,color:C.t3}}>Streak</div>
        </X>
      </div>

      {habitScore!=null&&(
        <X style={{padding:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:13}}>
            <span style={{fontWeight:600,color:C.t2}}>Habit Score (7d)</span>
            <span style={{fontWeight:700,color:habitScore>=70?C.g:habitScore>=40?C.t2:C.r}}>{habitScore}%</span>
          </div>
          <Br v={habitScore} max={100} color={habitScore>=70?C.g:habitScore>=40?C.t3:C.r}/>
        </X>
      )}

      {/* ═══ CUT RETENTION SCORE ═══ */}
      {retention&&(
        <X style={{padding:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:C.t3,letterSpacing:"0.06em"}}>Cut Retention Score</div>
              <div style={{fontSize:10,color:C.t3}}>Cut pace + protein + lift retention</div>
            </div>
            <div style={{fontSize:28,fontWeight:800,color:retention.score>=70?C.g:retention.score>=45?C.t2:C.r}}>{retention.score}</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
            <div style={{textAlign:"center",padding:6,background:C.bg,borderRadius:8}}>
              <div style={{fontSize:14,fontWeight:700,color:retention.weight.score>=70?C.g:C.t2}}>{retention.weight.change>0?"+":""}{retention.weight.change}</div>
              <div style={{fontSize:9,color:C.t3,fontWeight:600}}>lbs/wk</div>
            </div>
            <div style={{textAlign:"center",padding:6,background:C.bg,borderRadius:8}}>
              <div style={{fontSize:14,fontWeight:700,color:retention.lifts.score>=50?C.g:C.t2}}>{retention.lifts.held}/{retention.lifts.total}</div>
              <div style={{fontSize:9,color:C.t3,fontWeight:600}}>Lifts Held</div>
            </div>
            <div style={{textAlign:"center",padding:6,background:C.bg,borderRadius:8}}>
              <div style={{fontSize:14,fontWeight:700,color:retention.protein.score>=70?C.g:C.t2}}>{retention.protein.hit}/{retention.protein.days}</div>
              <div style={{fontSize:9,color:C.t3,fontWeight:600}}>Pro Days</div>
            </div>
          </div>
        </X>
      )}

      {/* ═══ BODY MEASUREMENTS ═══ */}
      {(()=>{
        const measEntries=Object.entries(data.bodyMeas||{}).filter(([_,v])=>v&&Object.values(v).some(x=>x)).sort((a,b)=>b[0].localeCompare(a[0]));
        const latest=measEntries[0],prev=measEntries[1];
        const measFields=[{k:"chest",l:"Chest",up:true},{k:"waist",l:"Waist",up:false},{k:"armL",l:"L Arm",up:true},{k:"armR",l:"R Arm",up:true},{k:"thighL",l:"L Thigh",up:true},{k:"thighR",l:"R Thigh",up:true}];
        const saveDashMeas=()=>{
          const vals={};measFields.forEach(f=>{if(measF[f.k])vals[f.k]=parseFloat(measF[f.k]);});
          if(!Object.keys(vals).length)return;
          const nd={...data,bodyMeas:{...data.bodyMeas,[t]:{...(data.bodyMeas[t]||{}),...vals}}};
          setData(nd);sv(nd);svSB.bodyMeas(t,nd.bodyMeas[t]);setShowMeasForm(false);setMeasF({chest:"",waist:"",armL:"",armR:"",thighL:"",thighR:""});
        };
        return(
          <X style={{padding:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <div style={{fontSize:11,fontWeight:700,color:C.t3,letterSpacing:"0.06em"}}>Body Measurements</div>
              <button onClick={()=>setShowMeasForm(!showMeasForm)} style={{background:C.pl,border:`1px solid ${C.p}`,borderRadius:8,padding:"3px 10px",fontSize:11,fontWeight:700,color:C.p,cursor:"pointer",fontFamily:"inherit"}}>Log</button>
            </div>
            {showMeasForm&&(
              <div style={{marginBottom:8,padding:8,background:C.bg,borderRadius:6,border:`1px solid ${C.bd}`}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:6}}>
                  {measFields.map(f=>(
                    <div key={f.k}>
                      <L>{f.l} (in)</L>
                      <N value={measF[f.k]} onChange={v=>setMeasF(p=>({...p,[f.k]:v}))} placeholder="0.0"/>
                    </div>
                  ))}
                </div>
                <B full small onClick={saveDashMeas} disabled={!measFields.some(f=>measF[f.k])}>Save Measurements</B>
              </div>
            )}
            {latest?(
              <div>
                <div style={{fontSize:11,color:C.t3,marginBottom:4}}>{fmt(latest[0])}{prev?` vs ${fmt(prev[0])}`:""}  </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4}}>
                  {measFields.filter(f=>latest[1][f.k]).map(f=>{
                    const d=prev&&prev[1][f.k]?parseFloat((latest[1][f.k]-prev[1][f.k]).toFixed(1)):null;
                    return(<div key={f.k} style={{textAlign:"center",padding:"4px 2px",background:C.bg,borderRadius:8}}>
                      <div style={{fontSize:13,fontWeight:700,color:C.t}}>{latest[1][f.k]}"</div>
                      <div style={{fontSize:9,color:C.t3,fontWeight:600}}>{f.l}</div>
                      {d!==null&&d!==0&&<div style={{fontSize:10,fontWeight:600,color:f.up?(d>0?C.g:C.r):(d<0?C.g:C.r)}}>{d>0?"↑":"↓"}{Math.abs(d)}</div>}
                    </div>);
                  })}
                </div>
              </div>
            ):(
              <div onClick={()=>setShowMeasForm(true)} style={{fontSize:13,color:C.t3,textAlign:"center",padding:"8px 0",cursor:"pointer"}}>
                Log your first measurements → tap to enter
              </div>
            )}
          </X>
        );
      })()}

      {/* ═══ DATA INSIGHTS ═══ */}
      {dataInsights.length>0&&(
        <X style={{padding:10}}>
          <div style={{fontSize:11,fontWeight:700,color:C.t3,letterSpacing:"0.06em",marginBottom:6}}>Insights</div>
          {dataInsights.map((ins,i)=>(
            <div key={i} style={{display:"flex",gap:6,alignItems:"flex-start",padding:"4px 0",borderTop:i>0?`1px solid ${C.bl}`:"none"}}>
              <span style={{fontSize:12,color:ins.type==="win"?C.g:ins.type==="gap"?C.t2:C.p,fontWeight:700,minWidth:14}}>
                {ins.type==="win"?"+":ins.type==="gap"?"!":"~"}
              </span>
              <span style={{fontSize:12,color:C.t2}}>{ins.text}</span>
            </div>
          ))}
        </X>
      )}

      <S title="Trends" collapsible defaultOpen={false}>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          <Ch data={wCh} color={C.p} label="Weight" yUnit=" lbs" empty="Log weight to see trend"/>
          <Ch data={recCh} color={C.g} label="Recovery" yUnit="%" empty="Log recovery to see trend"/>
          <Ch data={rhrCh} color={C.v} label="RHR" yUnit=" bpm" empty="Log RHR to see trend"/>
          <Ch data={stCh} color={C.t2} label="Steps" empty="Log steps to see trend"/>
          <Ch data={slCh} color={C.p} label="Sleep" yUnit=" hrs" empty="Log sleep to see trend"/>
        </div>
      </S>

      {totalL>0&&(
        <X style={{padding:10}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:13}}>
            <span style={{color:C.t2,fontWeight:600}}>Lift Retention Logs</span>
            <span style={{color:C.g,fontWeight:700}}>{liftsHeld}/{totalL}</span>
          </div>
          <Br v={liftsHeld} max={totalL} color={C.g}/>
        </X>
      )}

      {(()=>{
        const last14=Array.from({length:14},(_,i)=>{const d=new Date();d.setDate(d.getDate()-i);return lds(d);}).reverse();
        const last7=last14.slice(-7);
        const volData=last14.map(d=>({v:(data.wk[d]&&data.wk[d].volume)||0,d:d.slice(5)})).filter(x=>x.v>0);
        const thisWk=last7.reduce((s,d)=>s+((data.wk[d]&&data.wk[d].volume)||0),0);
        const prev7=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-7-i);return lds(d);});
        const lastWk=prev7.reduce((s,d)=>s+((data.wk[d]&&data.wk[d].volume)||0),0);
        const pct=lastWk>0?Math.round((thisWk-lastWk)/lastWk*100):0;
        return thisWk>0?(
          <X style={{padding:10,borderLeft:"3px solid "+C.p}}>
            <div style={{fontSize:11,fontWeight:700,color:C.t3,marginBottom:6}}>Weekly Volume</div>
            <div style={{fontSize:22,fontWeight:700}}>{thisWk.toLocaleString()} lbs</div>
            {lastWk>0&&<div style={{fontSize:12,color:pct>=0?C.g:C.r,marginTop:2}}>{pct>=0?"+":""}{pct}% vs last week</div>}
            {volData.length>1&&<Ch data={volData} color={C.p} label="Daily Volume" yUnit=" lbs"/>}
          </X>
        ):null;
      })()}

      {(()=>{
        const prs=Object.entries(data.prog||{}).filter(([_,v])=>v.pr).map(([id,v])=>({id,name:v.pr.name||id.replace(/-/g," "),e1rm:v.pr.e1rm,weight:v.pr.weight,reps:v.pr.reps,date:v.pr.date})).sort((a,b)=>b.e1rm-a.e1rm);
        const recent=prs.filter(p=>{const d=new Date(p.date);const ago=new Date();ago.setDate(ago.getDate()-7);return d>=ago;});
        return prs.length>0?(
          <X style={{padding:10,borderLeft:"3px solid "+C.bd}}>
            <div style={{fontSize:11,fontWeight:700,color:C.t3,marginBottom:6}}>Personal Records{recent.length>0?" ("+recent.length+" new this week)":""}</div>
            {prs.slice(0,8).map(p=>(
              <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:"1px solid "+C.bd}}>
                <div style={{fontSize:13,textTransform:"capitalize"}}>{p.name}</div>
                <div style={{fontSize:13,fontWeight:600}}>{p.weight}x{p.reps} <span style={{color:C.t3,fontSize:11}}>e1RM {p.e1rm}</span></div>
              </div>
            ))}
          </X>
        ):null;
      })()}

      {(()=>{
        const entries=Object.entries(data.bodyMeas||{}).filter(([_,v])=>Object.values(v).some(x=>x)).sort((a,b)=>b[0].localeCompare(a[0]));
        if(entries.length<2)return null;
        const latest=entries[0],prev=entries[1];
        const fields=[{k:"chest",l:"Chest",up:true},{k:"waist",l:"Waist",up:false},{k:"armL",l:"L Arm",up:true},{k:"armR",l:"R Arm",up:true},{k:"thighL",l:"L Thigh",up:true},{k:"thighR",l:"R Thigh",up:true}];
        const deltas=fields.filter(f=>latest[1][f.k]&&prev[1][f.k]).map(f=>({...f,d:parseFloat((latest[1][f.k]-prev[1][f.k]).toFixed(1))})).filter(f=>f.d!==0);
        if(!deltas.length)return null;
        return(
          <X style={{padding:10,borderLeft:"3px solid "+C.v}}>
            <div style={{fontSize:11,fontWeight:700,color:C.t3,marginBottom:6}}>Measurement Changes <span style={{fontWeight:400}}>({fmt(prev[0])} → {fmt(latest[0])})</span></div>
            {deltas.map(f=>(
              <div key={f.k} style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}>
                <span style={{fontSize:13}}>{f.l}</span>
                <span style={{fontSize:13,fontWeight:600,color:f.up?(f.d>0?C.g:C.r):(f.d<0?C.g:C.r)}}>{f.d>0?"+":""}{f.d}"</span>
              </div>
            ))}
          </X>
        );
      })()}

      {(()=>{
        const pairs=Object.entries(data.rec||{}).filter(([d,r])=>r.recoveryScore&&data.wk[d]).map(([d,r])=>({rec:r.recoveryScore,vol:data.wk[d].volume||0}));
        if(pairs.length<5)return null;
        const tiers=[{l:"Green (55+)",min:55,max:999,c:C.g},{l:"Moderate (45-54)",min:45,max:54,c:C.t2},{l:"Red (<45)",min:0,max:44,c:C.r}];
        const tierData=tiers.map(t=>{const p=pairs.filter(x=>x.rec>=t.min&&x.rec<=t.max);return{...t,count:p.length,avgVol:p.length?Math.round(p.reduce((s,x)=>s+x.vol,0)/p.length):0};}).filter(t=>t.count>0);
        return(
          <X style={{padding:10,borderLeft:"3px solid "+C.g}}>
            <div style={{fontSize:11,fontWeight:700,color:C.t3,marginBottom:6}}>Recovery → Performance</div>
            {tierData.map(t=>(
              <div key={t.l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:"1px solid "+C.bd}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <div style={{width:8,height:8,borderRadius:8,background:t.c}}/>
                  <span style={{fontSize:12}}>{t.l}</span>
                  <span style={{fontSize:11,color:C.t3}}>({t.count} sessions)</span>
                </div>
                <span style={{fontSize:13,fontWeight:600}}>{t.avgVol.toLocaleString()} lbs</span>
              </div>
            ))}
            <div style={{fontSize:11,color:C.t2,marginTop:6}}>Average volume output by recovery tier</div>
          </X>
        );
      })()}

      <div style={{display:"flex",gap:3}}>
        {dks.map((dk,i)=>{
          const isToday=dk===dn,done=Object.keys(data.wk).some(ws=>dw(ws)===dk&&wkn(ws)===w);
          return(<div key={dk} style={{flex:1,borderRadius:8,padding:"6px 2px",textAlign:"center",
            background:isToday?C.pl:C.cd,border:`1px solid ${done?C.g:isToday?C.p:C.bd}`}}>
            <div style={{fontSize:11,fontWeight:700,color:isToday?C.p:C.t2}}>{["M","T","W","T","F","S","S"][i]}</div>
            {done&&<div style={{width:6,height:6,borderRadius:6,background:C.g,margin:"2px auto 0"}}/>}
          </div>);
        })}
      </div>

      {/* ═══ AI ANALYSIS ═══ */}
      <AnalysisSection data={data}/>


    </div>
  );
};

export { Dashboard };
