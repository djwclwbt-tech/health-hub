const { useState, useEffect, useRef, useCallback } = React;
import { DINNERS, DEFAULTS, lds, td, dw, fmt, getDayType, isSocialWeekendActive, getDayCalTarget, getDayProTarget, calcAdaptiveTDEE, sumMeals } from "../../lib/engine.mjs";
import { useToday, waterOps } from "../core/hooks.js";
import { useBackClose } from "../core/nav.js";
import { sv, svSB } from "../core/storage.js";
import { C, FD } from "../core/theme.js";
import { B, Br, L, N, S, T, X } from "../ui/atoms.jsx";

// ═══ NUTRITION ═══
const MEAL_TYPES=["Breakfast","Lunch","Dinner","Snack"];

const getWeekDates = (dateStr) => {
  const d = new Date(dateStr + "T12:00:00");
  const dow = d.getDay(); // 0=Sun
  const mon = new Date(d);
  mon.setDate(d.getDate() - ((dow + 6) % 7)); // back to Monday
  return Array.from({length:7}, (_,i) => {
    const dd = new Date(mon);
    dd.setDate(mon.getDate() + i);
    return lds(dd);
  });
};

const Nutrition=({data,setData})=>{
  const todayKey=useToday();
  const t=todayKey,dn=dw(t);
  const [selM,setSelM]=useState(null);
  const [editing,setEditing]=useState(null);
  useBackClose(selM!==null,()=>{setSelM(null);setEditing(null);});

  const [showWaterHist,setShowWaterHist]=useState(false);
  const [quickDesc,setQuickDesc]=useState("");
  const [quickCal,setQuickCal]=useState("");
  const [quickPro,setQuickPro]=useState("");
  const [viewDate,setViewDate]=useState(t);
  const viewNut=data.nut[viewDate]||{meals:[],totalCal:0,totalProtein:0,totalCarbs:0,totalFat:0,totalFiber:0};
  const tl=viewNut;
  const isViewingToday=viewDate===t;
  const st=data.settings||DEFAULTS;
  const calT=getDayCalTarget(viewDate,st,data.travelDays,data.socialWeekend),proT=getDayProTarget(viewDate,st,data.travelDays,data.socialWeekend);
  const weekDates=getWeekDates(viewDate);
  const weekCals=weekDates.reduce((s,d)=>s+(data.nut[d]?.totalCal||0),0);
  const weekTarget=weekDates.reduce((s,d)=>s+(getDayCalTarget(d,st,data.travelDays,data.socialWeekend)||0),0);
  const weekRemaining=weekTarget-weekCals;
  const weekDayLabels=["M","T","W","T","F","S","S"];
  const viewDayType=getDayType(viewDate,data.travelDays);
  const viewFatPct=tl.totalCal>0?Math.round(((tl.totalFat||0)*9/tl.totalCal)*100):0;
  const waterToday=data.water?.[viewDate]||0;
  const waterGoal=st.water||128;
  const navDate=(dir)=>{const d=new Date(viewDate+"T12:00:00");d.setDate(d.getDate()+dir);const ds=lds(d);if(ds<=t)setViewDate(ds);};

  const rc=sumMeals;
  const rm=i=>{const nl=rc(tl.meals.filter((_,j)=>j!==i));const nd={...data,nut:{...data.nut,[viewDate]:nl}};setData(nd);sv(nd);svSB.nutrition(viewDate,nl);setSelM(null);};
  const {add:addWater,reset:resetWater}=waterOps(setData,viewDate);

  const [showTDEEAdjust,setShowTDEEAdjust]=useState(false);
  const [tdeeGoal,setTdeeGoal]=useState("moderate_cut");
  const nutTDEE=React.useMemo(()=>calcAdaptiveTDEE(data.wt,data.nut,st,data.travelDays,data.tdeeExclude||{},data.tdeeCal),[data.wt,data.nut,st,data.travelDays,data.tdeeExclude,data.tdeeCal,t]);

  const calRemaining=calT===null?null:Math.max(0,calT-(tl.totalCal||0));
  const proRemaining=Math.max(0,proT-(tl.totalProtein||0));
  const needText=proRemaining>0
    ?`${proRemaining}g protein left${calRemaining!==null?` · ${calRemaining} cal flex`:""}`
    :calRemaining!==null&&calRemaining>0
      ?`Protein hit · ${calRemaining} cal flex left`
      :calT!==null&&tl.totalCal>calT
        ?`Protein hit · ${tl.totalCal-calT} cal over, keep next meal lean`
        :"Protein covered · keep logging simple";
  const quickMealType=(()=>{const h=new Date().getHours();return h<11?"Breakfast":h<15?"Lunch":h<20?"Dinner":"Snack";})();
  const addQuickMeal=(preset)=>{
    const cal=+(preset?.cal??quickCal)||0, protein=+(preset?.protein??quickPro)||0;
    if(!cal&&!protein)return;
    const meal={
      description:(preset?.description||quickDesc.trim()||"Quick log"),
      cal,protein,carbs:0,fat:0,fiber:0,mealType:quickMealType,source:"quick"
    };
    const nl=rc([...(tl.meals||[]),meal]);
    const nd={...data,nut:{...data.nut,[viewDate]:nl}};
    setData(nd);sv(nd);svSB.nutrition(viewDate,nl);
    if(!preset){setQuickDesc("");setQuickCal("");setQuickPro("");}
  };

  const updateMeal=(idx,updates)=>{
    const newMeals=tl.meals.map((m,i)=>i===idx?{...m,...updates}:m);
    const nl=rc(newMeals);const nd={...data,nut:{...data.nut,[viewDate]:nl}};setData(nd);sv(nd);svSB.nutrition(viewDate,nl);
  };

  if(selM!==null){
    const meal=tl.meals[selM];if(!meal){setSelM(null);return null;}
    const mt=(meal.protein||0)*4+(meal.carbs||0)*4+(meal.fat||0)*9;
    const pp=mt?Math.round(((meal.protein||0)*4/mt)*100):0,cp=mt?Math.round(((meal.carbs||0)*4/mt)*100):0,fp=100-pp-cp;
    return(<div style={{display:"flex",flexDirection:"column",gap:8}}>
      <button onClick={()=>{setSelM(null);setEditing(null);}} style={{background:"none",border:"none",color:C.p,cursor:"pointer",fontSize:14,fontWeight:600,textAlign:"left",padding:0}}>← Back</button>
      <X><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:16,fontWeight:700,color:C.t}}>{meal.description}</div>
          <div style={{display:"flex",gap:4,alignItems:"center"}}>
            {meal.source&&<span style={{fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:6,
              color:meal.source==="mfp"?C.g:C.t3,
              background:meal.source==="mfp"?C.gl:"transparent",
            }}>{meal.source==="mfp"?"Sync":meal.source}</span>}
            {meal.mealType&&<span style={{fontSize:11,fontWeight:600,color:C.p,background:C.pl,padding:"2px 8px",borderRadius:8}}>{meal.mealType}</span>}
          </div>
        </div>
        {editing==="macros"?(<div style={{margin:"8px 0"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:3}}>
            {[{k:"protein",l:"Pro"},{k:"carbs",l:"Carb"},{k:"fat",l:"Fat"},{k:"fiber",l:"Fib"}].map(f=>(
              <div key={f.k}><N value={meal[f.k]||0} onChange={v=>{const updated={...meal,[f.k]:+v||0};const cal=(updated.protein||0)*4+(updated.carbs||0)*4+(updated.fat||0)*9;updateMeal(selM,{[f.k]:+v||0,cal});}} placeholder={f.l}/><div style={{fontSize:9,color:C.t3,textAlign:"center",fontWeight:600,marginTop:2}}>{f.l}</div></div>))}
          </div>
          <B full small style={{marginTop:6}} onClick={()=>setEditing(null)}>Done</B>
        </div>):(<div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr",gap:3,textAlign:"center",margin:"10px 0"}}>
            {[{l:"Cal",v:meal.cal,c:C.p},{l:"Pro",v:`${meal.protein}g`,c:C.g},{l:"Carb",v:`${meal.carbs}g`,c:C.t2},
              {l:"Fat",v:`${meal.fat}g`,c:C.r},{l:"Fib",v:`${meal.fiber||0}g`,c:C.v}].map((m,i)=>(
              <div key={i}><div style={{fontSize:17,fontWeight:700,color:m.c}}>{m.v}</div><div style={{fontSize:9,color:C.t3,fontWeight:600}}>{m.l}</div></div>))}
          </div>
        </div>)}
        <div style={{display:"flex",height:6,borderRadius:6,overflow:"hidden",marginTop:6,marginBottom:2}}>
          <div style={{width:`${pp}%`,background:C.g}}/><div style={{width:`${cp}%`,background:C.t3}}/><div style={{width:`${fp}%`,background:C.r}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.t3}}><span>P {pp}%</span><span>C {cp}%</span><span>F {fp}%</span></div>
      </X>
      {(meal.source==="cronometer"||meal.source==="mfp")?(
        <div style={{fontSize:12,color:C.t3,textAlign:"center",padding:"6px 0"}}>Synced from Cronometer · read-only here; edit in Cronometer.</div>
      ):(
      <div style={{display:"flex",gap:6}}>
        <B full outline onClick={()=>setEditing(editing==="macros"?null:"macros")}>Edit Macros</B>
        <B full outline onClick={()=>rm(selM)} color={C.r}>Remove</B>
      </div>
      )}
    </div>);
  }

  const grouped={};
  MEAL_TYPES.forEach(mt=>{grouped[mt]=[];});
  tl.meals.forEach((m,i)=>{const mt=m.mealType||"Snack";if(!grouped[mt])grouped[mt]=[];grouped[mt].push({...m,_idx:i});});

  const isExcluded=!!(data.tdeeExclude||{})[viewDate];
  const toggleExclude=()=>{const newVal=!isExcluded;const nd={...data,tdeeExclude:{...data.tdeeExclude,[viewDate]:newVal||undefined}};if(!newVal)delete nd.tdeeExclude[viewDate];setData(nd);sv(nd);svSB.tdeeExclude(viewDate,newVal);};

  return(<div style={{display:"flex",flexDirection:"column",gap:6}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div style={{fontSize:17,fontWeight:700,color:C.t}}>Food</div>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <button type="button" aria-label="Previous day" onClick={()=>navDate(-1)} style={{background:"none",border:`1px solid ${C.bd}`,borderRadius:8,color:C.t2,cursor:"pointer",fontSize:18,minWidth:40,minHeight:36}}>‹</button>
        <button type="button" onClick={()=>setViewDate(t)} style={{background:"none",border:"none",fontSize:13,fontWeight:700,color:isViewingToday?C.p:C.t2,minWidth:84,textAlign:"center",cursor:"pointer",fontFamily:"inherit"}}>{isViewingToday?"Today":fmt(viewDate)}</button>
        <button type="button" aria-label="Next day" onClick={()=>navDate(1)} disabled={isViewingToday} style={{background:"none",border:`1px solid ${C.bd}`,borderRadius:8,color:isViewingToday?C.bd:C.t2,cursor:isViewingToday?"default":"pointer",fontSize:18,minWidth:40,minHeight:36}}>›</button>
        <button onClick={toggleExclude} title={isExcluded?"Excluded from TDEE · click to include":"Include in TDEE calc"} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,padding:"2px 4px",color:isExcluded?C.r:C.t3,opacity:isExcluded?1:0.5}}>{isExcluded?"⊘":"◎"}</button>
      </div>
    </div>
    {isExcluded&&<div style={{fontSize:10,fontWeight:600,color:C.r,textAlign:"right",marginTop:-4,letterSpacing:"0.04em"}}>Excluded from TDEE</div>}

    {(()=>{const dn=DINNERS[dw(viewDate)];if(!dn)return null;return(<X style={{padding:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
        <div style={{fontSize:10,fontWeight:700,color:C.p,letterSpacing:"0.14em",fontFamily:FD}}>TONIGHT · {dn.name.toUpperCase()}</div>
        <div style={{fontSize:10,fontWeight:700,color:C.t3,letterSpacing:"0.04em",fontFamily:FD}}>{dn.tag}</div>
      </div>
      <div style={{fontSize:14,fontWeight:600,color:C.t,marginTop:6,lineHeight:1.4}}>{dn.how}</div>
      <div style={{display:"flex",gap:7,marginTop:9}}>
        <div style={{flex:1,background:C.bg,borderRadius:8,padding:"8px 10px"}}><div style={{fontSize:15,fontWeight:800,color:C.t,fontFamily:FD}}>{dn.you}</div><div style={{fontSize:9,fontWeight:700,letterSpacing:"0.08em",color:C.t3,fontFamily:FD}}>YOUR PLATE</div></div>
        <div style={{flex:1,background:C.bg,borderRadius:8,padding:"8px 10px"}}><div style={{fontSize:15,fontWeight:800,color:C.t,fontFamily:FD}}>{dn.dani}</div><div style={{fontSize:9,fontWeight:700,letterSpacing:"0.08em",color:C.t3,fontFamily:FD}}>DANIELLE</div></div>
      </div>
      <div style={{fontSize:11,color:C.t3,marginTop:7}}>Saved as a Cronometer recipe. Logging it takes two taps there.</div>
    </X>);})()}

    <X style={{padding:12,borderLeft:`3px solid ${C.bd}`}}>
      <L>What do I need next?</L>
      <div style={{fontSize:18,fontWeight:800,color:C.t,marginBottom:4}}>{needText}</div>
      <div style={{fontSize:12,color:C.t2,marginBottom:10}}>Rough logs are useful. Get calories + protein in, perfect macros can wait.</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:8}}>
        {[{description:"Shake: whey + banana",cal:435,protein:52},{description:"Nurri",cal:150,protein:30},{description:"Prepped protein + veg + fruit",cal:420,protein:52},{description:"Greek yogurt",cal:130,protein:18}].map(p=>(
          <button key={p.description} onClick={()=>addQuickMeal(p)} style={{padding:"9px 4px",borderRadius:8,border:`1px solid ${C.bd}`,background:C.bg,color:C.t,fontSize:11,fontWeight:800,fontFamily:"inherit",minHeight:44}}>
            {p.description}<br/><span style={{color:C.t3,fontWeight:700}}>{p.cal} cal · {p.protein}g</span>
          </button>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1.5fr .8fr .8fr",gap:6}}>
        <T value={quickDesc} onChange={setQuickDesc} placeholder="Quick meal"/>
        <N value={quickCal} onChange={setQuickCal} placeholder="cal"/>
        <N value={quickPro} onChange={setQuickPro} placeholder="pro"/>
      </div>
      <B full small style={{marginTop:6}} disabled={!quickCal&&!quickPro} onClick={()=>addQuickMeal()}>Log rough meal</B>
    </X>

    <S title={`Week view · ${weekRemaining>=0?`${weekRemaining.toLocaleString()} cal left`:`${Math.abs(weekRemaining).toLocaleString()} cal over`}`} collapsible defaultOpen={false}>
      <X style={{padding:10,marginBottom:4}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:4}}>
          <span style={{fontSize:11,fontWeight:700,color:C.t3,letterSpacing:"0.06em"}}>Week Total</span>
          <span style={{fontSize:13,fontWeight:700,color:weekRemaining>=0?C.t:C.r}}>{weekCals.toLocaleString()} / {weekTarget.toLocaleString()}</span>
        </div>
        <Br v={weekCals} max={weekTarget} color={weekCals>weekTarget?C.r:C.p} h={4}/>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginTop:6}}>
          {weekDates.map((d,i)=>{
            const dc=data.nut[d]?.totalCal||0;
            const dt=getDayCalTarget(d,st,data.travelDays,data.socialWeekend);
            const isView=d===viewDate;
            const isFuture=d>td();
            const logged=dc>0;
            return(<div key={d} style={{textAlign:"center",padding:"3px 0",borderRadius:6,
              background:isView?C.pl:"transparent",border:isView?`1px solid ${C.p}`:"1px solid transparent"}}>
              <div style={{fontSize:9,fontWeight:600,color:C.t3}}>{weekDayLabels[i]}</div>
              <div style={{fontSize:10,fontWeight:700,color:logged?(dt===null?C.t:dc>dt?C.r:C.g):isFuture?C.t3:C.r}}>
                {logged?Math.round(dc/100)*100:isFuture?"○":"0"}
              </div>
            </div>);
          })}
        </div>
        {isSocialWeekendActive(viewDate,data.socialWeekend)&&(
          <div style={{fontSize:10,fontWeight:600,color:C.t3,marginTop:4,textAlign:"center",fontStyle:"italic"}}>Social weekend active · ~1.5 lbs expected this week</div>
        )}
      </X>
    </S>

    <X style={{padding:12}}>
      {calT!==null?(<>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}>
        <div style={{fontSize:26,fontWeight:700,color:tl.totalCal>calT?C.r:C.p}}>{tl.totalCal}</div>
        <div style={{fontSize:13,color:C.t3}}>/ {calT} cal</div>
      </div>
      <Br v={tl.totalCal} max={calT} color={tl.totalCal>calT?C.r:C.p} h={7}/>
      </>):(<>
      <div style={{fontSize:13,color:C.t2,marginBottom:6,fontStyle:"italic"}}>Social weekend · log your food, protein first</div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}>
        <div style={{fontSize:26,fontWeight:700,color:tl.totalProtein>=proT?C.g:C.p}}>{tl.totalProtein}g</div>
        <div style={{fontSize:13,color:C.t3}}>/ {proT}g protein floor</div>
      </div>
      <Br v={tl.totalProtein} max={proT} color={tl.totalProtein>=proT?C.g:C.p} h={7}/>
      </>)}
      <div style={{display:"flex",justifyContent:"space-between",marginTop:10,fontSize:13,fontWeight:700}}>
        <span style={{color:tl.totalProtein>=proT?C.g:C.r}}>{tl.totalProtein}g / {proT}g protein</span>
        <span style={{color:C.t2}}>{tl.totalCal} cal</span>
        <span style={{color:C.v}}>{tl.totalFiber||0}g / {st.fiber||30}g fiber</span>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.t3,marginTop:4}}>
        <span style={{fontWeight:600,color:viewDayType==="travel"?C.t2:calT===null?C.t2:C.t2}}>{calT===null?"Social Weekend":viewDayType==="travel"?"Travel Day":viewDayType==="wednesday"?"Wednesday (Fast)":viewDayType==="training"?"Training Day":"Weekend"}</span>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          {tl.meals?.length>0&&tl.meals.every(m=>!m.source||m.source==="mfp"||m.source==="cronometer")&&(
            <span style={{fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:6,background:C.gl,color:C.g}}>Cronometer</span>
          )}
          <span>{calT} cal · {proT}g pro target</span>
        </div>
      </div>
      {viewFatPct>25&&tl.totalCal>0&&(<div style={{marginTop:6,padding:"6px 8px",background:C.rl,borderRadius:8,fontSize:11,color:C.r,fontWeight:600}}>
        Fat at {viewFatPct}% of calories (target: 20-25%). Watch cooking oil, cheese, and sauces.
      </div>)}
    </X>

    {tl.totalCal>0&&(
      <div style={{display:"flex",justifyContent:"space-around",padding:"6px 0",marginBottom:4}}>
        <span style={{fontSize:11,fontWeight:600,color:proT-tl.totalProtein>0?C.r:C.g}}>
          {Math.max(0,proT-tl.totalProtein)}g protein left
        </span>
        <span style={{fontSize:11,fontWeight:600,color:calT-tl.totalCal>0?C.t2:C.r}}>
          {Math.max(0,calT-tl.totalCal)} cal left
        </span>
      </div>
    )}

    {/* ═══ TDEE SMART BANNER ═══ */}
    {nutTDEE&&nutTDEE.phase!=="collecting"&&nutTDEE.confidence>=60&&isViewingToday&&(
      <S title="Target logic" collapsible defaultOpen={false}>
        <div style={{padding:"8px 12px",background:C.pl,borderRadius:6,display:"flex",justifyContent:"space-between",alignItems:"center",border:`1px solid ${C.bd}`}}>
          <div style={{fontSize:11,color:C.t2}}>
            <span style={{fontWeight:600}}>TDEE: {nutTDEE.tdee.toLocaleString()}{nutTDEE.tdeeLow!=null?`±${nutTDEE.tdee-nutTDEE.tdeeLow}`:""}</span> · Target: {calT} · <span style={{fontWeight:600,color:nutTDEE.deficit>0?C.g:C.r}}>{Math.abs(nutTDEE.deficit)} cal {nutTDEE.deficit>0?"deficit":"surplus"}</span>
          </div>
          <button onClick={()=>setShowTDEEAdjust(true)} style={{background:C.p,color:C.oa,border:"none",borderRadius:8,padding:"4px 10px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>Adjust</button>
        </div>
      </S>
    )}

    {/* ═══ TDEE ADJUST MODAL ═══ */}
    {showTDEEAdjust&&nutTDEE&&nutTDEE.tdee&&(
      <X style={{padding:14,borderLeft:`3px solid ${C.bd}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <L>Adjust Targets Based on TDEE</L>
          <button onClick={()=>setShowTDEEAdjust(false)} style={{background:"none",border:"none",color:C.t3,cursor:"pointer",fontSize:16}}>✕</button>
        </div>
        <div style={{fontSize:12,color:C.t2,marginBottom:10}}>Your adaptive TDEE: <span style={{fontWeight:700,color:C.t}}>{nutTDEE.tdee.toLocaleString()} cal/day</span></div>
        {[
          {id:"aggressive_cut",label:"Aggressive cut",offset:-500,desc:"~1 lb/wk loss"},
          {id:"moderate_cut",label:"Moderate cut",offset:-250,desc:"~0.5 lb/wk loss"},
          {id:"maintenance",label:"Maintenance hold",offset:0,desc:"pause loss if recovery demands it"}
        ].map(opt=>(
          <div key={opt.id} onClick={()=>setTdeeGoal(opt.id)} style={{
            display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",marginBottom:4,
            background:tdeeGoal===opt.id?C.pl:C.bg,borderRadius:6,cursor:"pointer",
            border:tdeeGoal===opt.id?`2px solid ${C.p}`:`2px solid transparent`
          }}>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:C.t}}>{opt.label} <span style={{fontWeight:400,color:C.t3}}>({opt.offset>0?"+":""}{opt.offset})</span></div>
              <div style={{fontSize:11,color:C.t3}}>{opt.desc}</div>
            </div>
            <div style={{fontSize:15,fontWeight:700,color:tdeeGoal===opt.id?C.p:C.t2}}>{(nutTDEE.tdee+opt.offset).toLocaleString()}</div>
          </div>
        ))}
        <B full color={C.p} onClick={()=>{
          const opt={aggressive_cut:-500,moderate_cut:-250,maintenance:0}[tdeeGoal]||0;
          const newCal=nutTDEE.tdee+opt;
          const ratio=newCal/(st.calories||DEFAULTS.calories);
          const nd={...data,settings:{...st,
            calories:Math.round(newCal),
            trainingCal:Math.round((st.trainingCal||DEFAULTS.trainingCal)*ratio),
            wednesdayCal:Math.round((st.wednesdayCal??DEFAULTS.wednesdayCal)*ratio),
            weekendCal:Math.round((st.weekendCal||DEFAULTS.weekendCal)*ratio)
          }};
          setData(nd);sv(nd);svSB.settings(nd.settings);setShowTDEEAdjust(false);
        }} style={{marginTop:8}}>Apply to Settings</B>
      </X>
    )}

    <S title={`Water · ${waterToday}/${waterGoal} oz`} collapsible defaultOpen={false}>
    <X style={{padding:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
        <div>
          <span style={{fontSize:13,fontWeight:700,color:C.t}}>Water </span>
          <span style={{fontSize:18,fontWeight:700,color:waterToday>=waterGoal?C.g:C.p}}>{waterToday}</span>
          <span style={{fontSize:13,color:C.t3}}> / {waterGoal} oz</span>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {waterToday>0&&<button onClick={resetWater} style={{background:"none",border:"none",color:C.t3,cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>Reset</button>}
          {Object.keys(data.water||{}).length>1&&<button onClick={()=>setShowWaterHist(!showWaterHist)} style={{background:"none",border:"none",color:C.p,cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"inherit"}}>{showWaterHist?"Hide":"7d"}</button>}
        </div>
      </div>
      <Br v={waterToday} max={waterGoal} color={waterToday>=waterGoal?C.g:C.p} h={8}/>
      <div style={{display:"flex",gap:6,marginTop:8}}>
        {[24,32,64].map(oz=>(
          <button key={oz} onClick={()=>addWater(oz)} style={{
            flex:1,padding:"10px 4px",borderRadius:6,fontSize:15,fontWeight:700,cursor:"pointer",
            background:"transparent",border:`1px solid ${C.bd}`,color:C.t,fontFamily:"inherit",minHeight:44,
          }}>+{oz}oz</button>
        ))}
      </div>
      {showWaterHist&&(()=>{
        const entries=Object.entries(data.water||{}).filter(([d])=>d!==viewDate).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,7);
        const avg=entries.length?Math.round(entries.reduce((s,[_,v])=>s+v,0)/entries.length):0;
        return(<div style={{marginTop:8,borderTop:`1px solid ${C.bl}`,paddingTop:6}}>
          <div style={{fontSize:11,fontWeight:700,color:C.t3,marginBottom:4}}>Last 7 days · avg {avg} oz</div>
          {entries.map(([d,v])=>(<div key={d} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"3px 0"}}>
            <span style={{fontSize:12,color:C.t2}}>{fmt(d)}</span>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:60}}><Br v={v} max={waterGoal} color={v>=waterGoal?C.g:C.p} h={4}/></div>
              <span style={{fontSize:12,fontWeight:600,color:v>=waterGoal?C.g:C.t,width:40,textAlign:"right"}}>{v}oz</span>
            </div>
          </div>))}
        </div>);
      })()}
    </X>
    </S>

    {MEAL_TYPES.map(mt=>{
      const meals=grouped[mt];
      if(meals.length===0)return null;
      const mtCal=meals.reduce((s,m)=>s+(m.cal||0),0);
      return(
        <S key={mt} title={`${mt} (${meals.length}) · ${mtCal} cal`}>
          {meals.map((m)=>(<X key={m._idx} onClick={()=>setSelM(m._idx)} style={{padding:10,marginBottom:3,cursor:"pointer"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{flex:1,minWidth:0}}><div style={{display:"flex",gap:4,alignItems:"center"}}><span style={{fontSize:14,fontWeight:600,color:C.t,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.description}</span>
                {(m.source==="mfp"||m.source==="cronometer")&&<span style={{fontSize:8,fontWeight:700,color:C.g,background:C.gl,padding:"1px 4px",borderRadius:8,flexShrink:0}}>{m.source==="mfp"?"SYNC":"CRON"}</span>}
              </div>
                <div style={{fontSize:12,color:C.t2,marginTop:1}}>{m.cal} cal · {m.protein}g protein{m.fiber?` · ${m.fiber}g fiber`:""}</div></div>
              <span style={{color:C.t3,fontSize:13}}>→</span>
            </div>
          </X>))}
        </S>
      );
    })}
    {tl.meals.length===0&&<div style={{color:C.t3,fontSize:13,padding:12,textAlign:"center"}}>No meals logged today</div>}
  </div>);
};

export { Nutrition };
