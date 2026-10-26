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
  const proRemaining=Math.max(0,Math.round(proT-(tl.totalProtein||0)));
  // One plain line: protein left or hit, calories left or over.
  const needText=(()=>{
    const pro=proRemaining>0?`${proRemaining} g protein left`:"Protein hit";
    if(calT===null)return`${pro} · no calorie cap today`;
    const over=Math.round((tl.totalCal||0)-calT);
    return`${pro} · ${over>0?`${over.toLocaleString()} cal over`:`${Math.round(calRemaining).toLocaleString()} cal left`}`;
  })();
  const quickMealType=!isViewingToday?"Snack":(()=>{const h=new Date().getHours();return h<11?"Breakfast":h<15?"Lunch":h<20?"Dinner":"Snack";})();
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
      <button type="button" onClick={()=>{setSelM(null);setEditing(null);}} style={{background:"none",border:"none",color:C.t2,cursor:"pointer",fontSize:16,textAlign:"left",padding:"8px 0",minHeight:40}}>‹ Food</button>
      <div><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
          <div style={{fontSize:19,fontWeight:500,color:C.t,lineHeight:1.35}}>{meal.description}</div>
          <div style={{display:"flex",gap:4,alignItems:"center"}}>
            {meal.source&&<span style={{fontSize:12,fontWeight:700,padding:"2px 6px",borderRadius:6,
              color:meal.source==="mfp"?C.g:C.t3,
              background:meal.source==="mfp"?C.gl:"transparent",
            }}>{meal.source==="mfp"||meal.source==="cronometer"?"Cronometer":meal.source==="coach"?"Coach":meal.source==="quick"?"Quick log":meal.source}</span>}
            {meal.mealType&&<span style={{fontSize:13,color:C.t3}}>{meal.mealType}</span>}
          </div>
        </div>
        {editing==="macros"?(<div style={{margin:"8px 0"}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:4}}>
            {[{k:"cal",l:"Cal"},{k:"protein",l:"Pro"},{k:"carbs",l:"Carb"},{k:"fat",l:"Fat"},{k:"fiber",l:"Fib"}].map(f=>(
              <div key={f.k}><N value={meal[f.k]||0} onChange={v=>{const updated={...meal,[f.k]:+v||0};
                // Calories follow the macros only when carbs or fat are known; a quick log keeps its typed calories.
                const derive=f.k!=="cal"&&f.k!=="fiber"&&((updated.carbs||0)+(updated.fat||0))>0;
                updateMeal(selM,derive?{[f.k]:+v||0,cal:(updated.protein||0)*4+(updated.carbs||0)*4+(updated.fat||0)*9}:{[f.k]:+v||0});}} placeholder={f.l}/><div style={{fontSize:13,color:C.t3,textAlign:"center",fontWeight:500,marginTop:2}}>{f.l}</div></div>))}
          </div>
          <B full small style={{marginTop:6}} onClick={()=>setEditing(null)}>Done</B>
        </div>):(<div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr",gap:3,textAlign:"center",margin:"10px 0"}}>
            {[{l:"Cal",v:meal.cal,c:C.t},{l:"Pro",v:`${meal.protein}g`,c:C.g},{l:"Carb",v:`${meal.carbs}g`,c:C.t2},
              {l:"Fat",v:`${meal.fat}g`,c:C.t2},{l:"Fib",v:`${meal.fiber||0}g`,c:C.t2}].map((m,i)=>(
              <div key={i}><div style={{fontSize:19,fontWeight:700,color:m.c}}>{m.v}</div><div style={{fontSize:12,color:C.t3,fontWeight:600}}>{m.l}</div></div>))}
          </div>
        </div>)}
        <div style={{display:"flex",height:6,borderRadius:6,overflow:"hidden",marginTop:6,marginBottom:2}}>
          <div style={{width:`${pp}%`,background:C.g}}/><div style={{width:`${cp}%`,background:C.t3}}/><div style={{width:`${fp}%`,background:C.t2}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.t3}}><span>P {pp}%</span><span>C {cp}%</span><span>F {fp}%</span></div>
      </div>
      {(meal.source==="cronometer"||meal.source==="mfp")?(
        <div style={{fontSize:13,color:C.t3,textAlign:"center",padding:"6px 0"}}>Synced from Cronometer · read-only here; edit in Cronometer.</div>
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

  // ── Main page. Order follows a normal day: where am I, what did I eat, log
  // something, then the reference folds (dinner plan, week, targets, water).
  const NUMS={fontVariantNumeric:"tabular-nums"};
  const hasLog=d=>(data.nut?.[d]?.meals?.length||0)>0||(data.nut?.[d]?.totalCal||0)>0;
  const lastSynced=Object.entries(data.nut||{}).filter(([d,v])=>(v?.meals||[]).some(m=>m.source==="cronometer"||m.source==="mfp")).map(([d])=>d).sort().pop()||null;
  const viewLogged=hasLog(viewDate);
  const dayTypeLabel=calT===null?"Social weekend":viewDayType==="travel"?"Travel day":viewDayType==="wednesday"?"Fast day":viewDayType==="training"?"Training day":"Weekend";
  // Week: count only days that have food logged. An unsynced day is unknown, not zero.
  const wk=weekDates.map(d=>({d,logged:hasLog(d),cal:Math.round(data.nut?.[d]?.totalCal||0),pro:Math.round(data.nut?.[d]?.totalProtein||0),calT:getDayCalTarget(d,st,data.travelDays,data.socialWeekend),proT:getDayProTarget(d,st,data.travelDays,data.socialWeekend),future:d>t,today:d===t}));
  const wkDone=wk.filter(x=>x.logged&&!x.today);
  const wkCal=wkDone.reduce((a,x)=>a+x.cal,0),wkCalT=wkDone.reduce((a,x)=>a+(x.calT||0),0);
  const wkMissing=wk.filter(x=>!x.logged&&!x.future&&!x.today&&getDayType(x.d,data.travelDays)!=="wednesday").length;
  const proHitDays=wkDone.filter(x=>x.pro>=(x.proT||proT)).length;
  const link={background:"none",border:"none",color:C.t2,fontSize:16,cursor:"pointer",padding:"8px 0",minHeight:40};
  const navBtn={background:"none",border:`1px solid ${C.bd}`,borderRadius:8,color:C.t2,cursor:"pointer",fontSize:20,minWidth:44,minHeight:44};
  const Stat=({label,v,target,unit,good})=>(<div style={{flex:1,minWidth:0}}>
    <div style={{fontSize:15,color:C.t3}}>{label}</div>
    <div style={{marginTop:2,...NUMS}}><span style={{fontSize:30,fontWeight:600,letterSpacing:"-0.3px",color:good?C.g:C.t}}>{viewLogged||isViewingToday?Math.round(v).toLocaleString():"○"}</span>{target!=null&&<span style={{fontSize:16,color:C.t3}}> / {Math.round(target).toLocaleString()}{unit}</span>}</div>
    {target!=null&&<div style={{marginTop:6}}><Br v={v} max={target} color={good?C.g:C.t} h={3}/></div>}
  </div>);
  const quickOk=!!(quickCal||quickPro);
  return(<div style={{display:"flex",flexDirection:"column"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
      <h1 style={{fontSize:26,fontWeight:600,letterSpacing:"-0.2px"}}>Food</h1>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <button type="button" aria-label="Previous day" onClick={()=>navDate(-1)} style={navBtn}>‹</button>
        <button type="button" onClick={()=>setViewDate(t)} style={{background:"none",border:"none",fontSize:16,fontWeight:500,color:C.t,minWidth:92,textAlign:"center",cursor:"pointer"}}>{isViewingToday?"Today":fmt(viewDate)}</button>
        <button type="button" aria-label="Next day" onClick={()=>navDate(1)} disabled={isViewingToday} style={{...navBtn,opacity:isViewingToday?0.35:1}}>›</button>
      </div>
    </div>

    {/* Where the day stands */}
    <div style={{display:"flex",gap:20,marginTop:16}}>
      <Stat label="Protein" v={tl.totalProtein||0} target={proT} unit=" g" good={(tl.totalProtein||0)>=proT}/>
      {calT!==null?<Stat label="Calories" v={tl.totalCal||0} target={calT} unit=""/>:<Stat label="Calories" v={tl.totalCal||0}/>}
    </div>
    <div style={{fontSize:15,color:C.t2,marginTop:10,lineHeight:1.45,...NUMS}}>
      {!viewLogged&&!isViewingToday?`Nothing logged.${lastSynced&&lastSynced<viewDate?` Cronometer last synced ${fmt(lastSynced)}.`:""}`:needText}
    </div>
    <div style={{fontSize:13,color:C.t3,marginTop:2,...NUMS}}>{dayTypeLabel} · fiber {Math.round(tl.totalFiber||0)} of {st.fiber||30} g{viewFatPct>25&&tl.totalCal>0?` · fat ${viewFatPct}% of calories, aim for 20 to 25`:""}</div>

    {/* What you ate */}
    <h2 style={{fontSize:15,fontWeight:500,color:C.t3,marginTop:24}}>Meals</h2>
    <div style={{marginTop:6,borderTop:`1px solid ${C.bd}`}}>
      {tl.meals.length===0&&<div style={{fontSize:16,color:C.t3,padding:"14px 0",borderBottom:`1px solid ${C.bd}`}}>{isViewingToday?"Nothing yet. Cronometer fills this through the day, or log below.":"No meals this day."}</div>}
      {MEAL_TYPES.map(mt=>{const ms=grouped[mt];if(!ms?.length)return null;const mtCal=ms.reduce((s,m)=>s+(m.cal||0),0),mtPro=ms.reduce((s,m)=>s+(m.protein||0),0);return(<div key={mt}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:15,color:C.t3,padding:"10px 2px 4px",...NUMS}}><span style={{color:C.t2,fontWeight:500}}>{mt}</span><span>{Math.round(mtCal)} cal · {Math.round(mtPro)} g</span></div>
        {ms.map(m=>(<button type="button" key={m._idx} onClick={()=>setSelM(m._idx)} style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,minHeight:48,background:"none",border:"none",borderBottom:`1px solid ${C.bd}`,cursor:"pointer",textAlign:"left",padding:"6px 2px"}}>
          <span style={{fontSize:17,color:C.t,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.description}</span>
          <span style={{fontSize:15,color:C.t3,whiteSpace:"nowrap",...NUMS}}>{Math.round(m.cal||0)} cal · {Math.round(m.protein||0)} g</span>
        </button>))}
      </div>);})}
      {tl.meals.length>0&&<div style={{fontSize:13,color:C.t3,padding:"8px 2px"}}>{tl.meals.every(m=>m.source==="cronometer"||m.source==="mfp")?"All from Cronometer. Edit them there.":"Quick logs can be edited here. Cronometer meals are edited in Cronometer."}</div>}
    </div>

    {/* Quick log */}
    <h2 style={{fontSize:15,fontWeight:500,color:C.t3,marginTop:24}}>Quick log</h2>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginTop:8}}>
      {[{description:"Shake: whey + banana",cal:435,protein:52},{description:"Nurri",cal:150,protein:30},{description:"Prepped protein + veg + fruit",cal:420,protein:52},{description:"Greek yogurt",cal:130,protein:18}].map(p=>(
        <button type="button" key={p.description} onClick={()=>addQuickMeal(p)} style={{padding:"8px 10px",borderRadius:9,border:`1px solid ${C.bd}`,background:C.cd,color:C.t,minHeight:56,textAlign:"left",cursor:"pointer"}}>
          <span style={{display:"block",fontSize:16,fontWeight:500,lineHeight:1.25}}>{p.description}</span>
          <span style={{display:"block",fontSize:13,color:C.t3,marginTop:2,...NUMS}}>{p.cal} cal · {p.protein} g</span>
        </button>))}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1.6fr .8fr .8fr",gap:6,marginTop:8}}>
      <T value={quickDesc} onChange={setQuickDesc} placeholder="What was it"/>
      <N value={quickCal} onChange={setQuickCal} placeholder="cal"/>
      <N value={quickPro} onChange={setQuickPro} placeholder="g"/>
    </div>
    <button type="button" disabled={!quickOk} onClick={()=>addQuickMeal()} style={{marginTop:8,minHeight:48,border:"none",borderRadius:9,background:quickOk?C.p:C.bl,color:quickOk?C.oa:C.t3,fontSize:17,fontWeight:500,cursor:quickOk?"pointer":"default"}}>Log {isViewingToday?"it":`for ${fmt(viewDate)}`}</button>

    {/* Reference folds */}
    <div style={{marginTop:20}}>
      {(()=>{const dn2=DINNERS[dw(viewDate)];if(!dn2)return null;return(
        <S title="Tonight's dinner" meta={dn2.name} collapsible defaultOpen={false}>
          <div style={{fontSize:16,color:C.t,lineHeight:1.45,paddingTop:2}}>{dn2.how}</div>
          <div style={{display:"flex",gap:20,marginTop:10,...NUMS}}>
            <div><div style={{fontSize:13,color:C.t3}}>Your plate</div><div style={{fontSize:18,fontWeight:500,marginTop:2}}>{dn2.you}</div></div>
            <div><div style={{fontSize:13,color:C.t3}}>Danielle</div><div style={{fontSize:18,fontWeight:500,marginTop:2}}>{dn2.dani}</div></div>
          </div>
          <div style={{fontSize:13,color:C.t3,marginTop:8}}>{dn2.tag}. Saved as a Cronometer recipe, two taps to log there.</div>
        </S>);})()}

      <S title="This week" meta={wkDone.length?`${wkDone.length} days logged${wkMissing?` · ${wkMissing} missing`:""}`:"No days logged"} collapsible defaultOpen={false}>
        <div style={{display:"grid",gridTemplateColumns:"48px 1fr 1fr",columnGap:8,fontSize:13,color:C.t3,padding:"4px 2px"}}><span>Day</span><span style={{textAlign:"right"}}>Calories</span><span style={{textAlign:"right"}}>Protein</span></div>
        {wk.map((x,i)=>(<button type="button" key={x.d} disabled={x.future} onClick={()=>setViewDate(x.d)} style={{width:"100%",display:"grid",gridTemplateColumns:"48px 1fr 1fr",columnGap:8,alignItems:"center",minHeight:44,background:x.d===viewDate?C.cd:"none",border:"none",borderTop:`1px solid ${C.bd}`,cursor:x.future?"default":"pointer",padding:"0 2px",fontSize:16,textAlign:"left",...NUMS}}>
          <span style={{color:x.future?C.t3:C.t2}}>{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i]}</span>
          {x.future?<span style={{gridColumn:"2 / 4",textAlign:"right",color:C.t3}}>○</span>
            :!x.logged&&!x.today?<span style={{gridColumn:"2 / 4",textAlign:"right",color:C.t3}}>{getDayType(x.d,data.travelDays)==="wednesday"?"Fast day, nothing logged":"Not synced"}</span>
            :<><span style={{textAlign:"right",color:C.t}}>{x.cal.toLocaleString()}<span style={{color:C.t3}}>{x.calT?` / ${x.calT.toLocaleString()}`:""}</span></span>
              <span style={{textAlign:"right",color:x.pro>=(x.proT||proT)?C.g:C.t}}>{x.pro} g</span></>}
        </button>))}
        <div style={{fontSize:15,color:C.t2,marginTop:8,lineHeight:1.45,...NUMS}}>
          {wkDone.length?<>On the {wkDone.length} logged day{wkDone.length>1?"s":""} before today: {wkCal.toLocaleString()} of {wkCalT.toLocaleString()} cal ({wkCal<=wkCalT?`${(wkCalT-wkCal).toLocaleString()} under`:`${(wkCal-wkCalT).toLocaleString()} over`}), protein hit on {proHitDays}.</>:"No full days logged yet this week."}
          {wkMissing?` ${wkMissing} day${wkMissing>1?"s are":" is"} not synced, so they are left out.`:""}
        </div>
        {isSocialWeekendActive(viewDate,data.socialWeekend)&&<div style={{fontSize:13,color:C.t3,marginTop:4}}>Social weekend is on. Expect about 1.5 lb on the scale this week.</div>}
      </S>

      {nutTDEE&&nutTDEE.tdee&&(<S title="Target logic" meta={`burn ≈ ${nutTDEE.tdee.toLocaleString()}`} collapsible defaultOpen={false}>
        <div style={{fontSize:16,color:C.t2,lineHeight:1.5,...NUMS}}>Estimated burn {nutTDEE.tdee.toLocaleString()}{nutTDEE.tdeeLow!=null?` ± ${nutTDEE.tdee-nutTDEE.tdeeLow}`:""} cal a day. {calT!=null?<>{isViewingToday?"Today's":"That day's"} target {calT.toLocaleString()} is a {Math.abs(nutTDEE.tdee-calT).toLocaleString()} cal {nutTDEE.tdee>=calT?"deficit":"surplus"}.</>:null}</div>
        {!showTDEEAdjust&&<button type="button" style={link} onClick={()=>setShowTDEEAdjust(true)}>Change targets from this estimate</button>}
        {showTDEEAdjust&&(<div style={{marginTop:8}}>
          {[{id:"aggressive_cut",label:"Faster cut",offset:-500,desc:"about 1 lb a week"},{id:"moderate_cut",label:"Steady cut",offset:-250,desc:"about 0.5 lb a week"},{id:"maintenance",label:"Hold",offset:0,desc:"pause loss if recovery needs it"}].map(opt=>{const on=tdeeGoal===opt.id;return(
            <button type="button" key={opt.id} aria-pressed={on} onClick={()=>setTdeeGoal(opt.id)} style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",minHeight:52,padding:"6px 12px",marginBottom:6,background:C.cd,borderRadius:9,cursor:"pointer",border:`1px solid ${on?C.t:C.bd}`,textAlign:"left"}}>
              <span><span style={{display:"block",fontSize:16,fontWeight:500}}>{opt.label}</span><span style={{display:"block",fontSize:13,color:C.t3}}>{opt.desc}</span></span>
              <span style={{fontSize:17,fontWeight:500,...NUMS}}>{(nutTDEE.tdee+opt.offset).toLocaleString()}</span>
            </button>);})}
          <div style={{display:"flex",gap:8,marginTop:4}}>
            <button type="button" onClick={()=>setShowTDEEAdjust(false)} style={{flex:1,minHeight:48,border:`1px solid ${C.bd}`,borderRadius:9,background:C.cd,fontSize:17,cursor:"pointer"}}>Cancel</button>
            <button type="button" onClick={()=>{
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
            }} style={{flex:1,minHeight:48,border:"none",borderRadius:9,background:C.p,color:C.oa,fontSize:17,fontWeight:500,cursor:"pointer"}}>Apply</button>
          </div>
        </div>)}
        <label style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,minHeight:48,borderTop:`1px solid ${C.bd}`,marginTop:8,fontSize:16,color:C.t,cursor:"pointer"}}>
          <span>Leave {isViewingToday?"today":fmt(viewDate)} out of the estimate<span style={{display:"block",fontSize:13,color:C.t3}}>For days the log is incomplete</span></span>
          <input type="checkbox" checked={isExcluded} onChange={toggleExclude} style={{width:22,height:22,accentColor:"var(--ink)"}}/>
        </label>
      </S>)}

      <S title="Water" meta={`${waterToday} of ${waterGoal} oz`} collapsible defaultOpen={false}>
        <div style={{display:"flex",gap:6,paddingTop:2}}>
          {[24,32,64].map(oz=>(<button type="button" key={oz} onClick={()=>addWater(oz)} style={{flex:1,minHeight:44,borderRadius:9,border:`1px solid ${C.bd}`,background:C.cd,fontSize:17,cursor:"pointer",...NUMS}}>+{oz}</button>))}
        </div>
        {waterToday>0&&<button type="button" style={{...link,color:C.t3}} onClick={resetWater}>Reset to 0</button>}
        {(()=>{const es=Object.entries(data.water||{}).filter(([d])=>d<viewDate).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,7);if(!es.length)return null;
          const avg=Math.round(es.reduce((s,[_,v])=>s+v,0)/es.length);
          return(<div style={{marginTop:6}}>
            <div style={{fontSize:13,color:C.t3,padding:"4px 2px",...NUMS}}>Last {es.length} days with water logged · avg {avg} oz</div>
            {es.map(([d,v])=>(<div key={d} style={{display:"flex",justifyContent:"space-between",minHeight:36,alignItems:"center",borderTop:`1px solid ${C.bd}`,fontSize:16,padding:"0 2px",...NUMS}}>
              <span style={{color:C.t2}}>{fmt(d)}</span><span style={{color:v>=waterGoal?C.g:C.t}}>{v} oz</span></div>))}
          </div>);})()}
      </S>
    </div>
  </div>);
};

export { Nutrition };
