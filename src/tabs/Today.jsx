const { useState, useEffect } = React;
import { PROG, shortLiftName, cutStepsTarget, DEFAULTS, lds, td, dw, fmt, wkn, estTime, getDayCalTarget, getDayProTarget, getTrend, getAutoregProposal } from "../../lib/engine.mjs";
import { CloseoutPanel, SYSTEM_HABITS } from "../cards/CloseoutPanel.jsx";
import { ScalePad } from "../cards/ScalePad.jsx";
import { haptic } from "../core/device.js";
import { waterOps } from "../core/hooks.js";
import { sv, svSB } from "../core/storage.js";
import { C } from "../core/theme.js";
import { Br } from "../ui/atoms.jsx";
import { Sheet } from "../ui/overlay.jsx";
import { Nutrition } from "./Nutrition.jsx";

// ═══ TODAY · the Day line ═══
// One timeline per day. Done items are one quiet line, the "Now" item is open
// with its button, later items wait below. Which item is "now" comes from the
// clock and today's logs (see nowId below). ?clock=HH:MM and &day=weekday simulate.
const clockParam=()=>{try{const v=new URLSearchParams(location.search).get("clock");const m=v&&v.match(/^(\d{1,2}):(\d{2})$/);return m?+m[1]+(+m[2])/60:null;}catch{return null;}};
const dayParam=()=>{try{const v=new URLSearchParams(location.search).get("day");return ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"].includes(v)?v:null;}catch{return null;}};
const nowHM=()=>{const c=clockParam();if(c!=null)return c;const d=new Date();return d.getHours()+d.getMinutes()/60;};
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
const hm=h=>`${Math.floor(h)}:${String(Math.round((h%1)*60)).padStart(2,"0")}`;
const n=v=>Math.round(v).toLocaleString();
const NUM={fontVariantNumeric:"tabular-nums"};

const HABIT_LABELS={alcohol:"No alcohol",cannabis:"No cannabis",screensOff:"Screens off",bedBy1030:"Bed by 10:30",supplements:"Supplements",sunlight:"Sunlight",readBeforeBed:"Read in bed"};

// The main action. Ember only here and on the "now" dot.
const Main=({children,onClick,disabled})=>(
  <button type="button" onClick={onClick} disabled={disabled} style={{width:"100%",minHeight:48,border:"none",borderRadius:9,background:disabled?C.bl:C.p,color:disabled?C.t3:C.oa,fontSize:15,fontWeight:500,cursor:disabled?"default":"pointer",marginTop:12}}>{children}</button>
);
const Quiet=({children,onClick,style})=>(
  <button type="button" onClick={onClick} style={{minHeight:40,border:`1px solid ${C.bd}`,borderRadius:8,background:C.cd,color:C.t,fontSize:14,fontWeight:500,cursor:"pointer",padding:"0 12px",...NUM,...style}}>{children}</button>
);
const Card=({children,style})=><div style={{background:C.cd,border:`1px solid ${C.bd}`,borderRadius:12,padding:16,marginTop:10,...style}}>{children}</div>;
const KV=({k,v,dim})=>(
  <div style={{display:"flex",justifyContent:"space-between",gap:12,fontSize:13,padding:"6px 0"}}>
    <span style={{color:C.t3}}>{k}</span><span style={{color:dim?C.t3:C.t,...NUM,whiteSpace:"nowrap"}}>{v}</span>
  </div>
);

// One row on the line. state: done | now | later.
const Ev=({time,state,title,sub,open,onToggle,children,last})=>{
  const isNow=state==="now";
  return(<div style={{position:"relative",paddingLeft:58,paddingBottom:last?0:22}}>
    <span style={{position:"absolute",left:0,top:1,width:34,textAlign:"right",fontSize:12,color:isNow?C.p:C.t4,fontWeight:isNow?500:400,...NUM}}>{time}</span>
    <span aria-hidden="true" style={{position:"absolute",left:41,top:6,width:7,height:7,borderRadius:"50%",boxSizing:"border-box",
      background:isNow?C.p:state==="done"?C.t:C.bg,border:`1.5px solid ${isNow?C.p:state==="done"?C.t:C.t4}`,
      boxShadow:isNow?"0 0 0 4px var(--accent-soft)":"none"}}/>
    <button type="button" onClick={onToggle} aria-expanded={children?!!open:undefined} style={{display:"block",width:"100%",textAlign:"left",background:"none",border:"none",padding:0,cursor:onToggle?"pointer":"default",color:"inherit"}}>
      <div style={{fontSize:15,fontWeight:500,color:state==="later"?C.t2:C.t}}>{title}</div>
      {sub&&<div style={{fontSize:13,color:C.t3,marginTop:2,lineHeight:1.4}}>{sub}</div>}
    </button>
    {open&&children}
  </div>);
};

const Today=({data,setData,setTab,workout,addToast})=>{
  const [,setTick]=useState(0);
  useEffect(()=>{const iv=setInterval(()=>setTick(x=>x+1),60000);return()=>clearInterval(iv);},[]);
  const [openId,setOpenId]=useState(null);   // a tapped row; null = follow "now"
  const [foodOpen,setFoodOpen]=useState(false);
  const [wIn,setWIn]=useState("");
  const [allergies,setAllergies]=useState(null);
  useEffect(()=>{let dead=false;(async()=>{try{const r=await fetch("/api/allergies");const d=await r.json();if(!dead&&r.ok)setAllergies(d);}catch{}})();return()=>{dead=true};},[]);

  const t=td();
  const dayName=dayParam()||dw(t);
  const h=nowHM();
  const st=data.settings||DEFAULTS;
  const sess=data.program?.[dayName];
  const trend=getTrend(data.wt,t);
  const rec=data.rec?.[t];
  const wt=data.wt?.[t];
  const lifted=!!data.wk?.[t];
  const cardioDone=!!data.cardio?.[t]?.done;
  const habits=data.habits?.[t]||{};
  const held=SYSTEM_HABITS.filter(x=>habits[x.field]===x.target).length;
  const closed=!!data.debrief?.[t]&&held>=6;
  const stretchDone=!!(data.mob?.[t]?.done||data.mob?.[t]===true);
  const isFast=dayName==="wednesday";
  const nut=data.nut?.[t];
  const calNow=Math.round(nut?.totalCal||0),proNow=Math.round(nut?.totalProtein||0);
  const calT=getDayCalTarget(t,st,data.travelDays,data.socialWeekend);
  const proT=getDayProTarget(t,st,data.travelDays,data.socialWeekend)||st.protein||200;
  const water=data.water?.[t]||0;
  const {add:addWater}=waterOps(setData,t);
  const yesterdayWt=(()=>{const e=Object.entries(data.wt||{}).filter(([d])=>d<t).sort((a,b)=>b[0].localeCompare(a[0]));return e[0]?.[1]||null;})();

  const logWeight=()=>{if(!wIn)return;const v=Number(wIn);const nd={...data,wt:{...data.wt,[t]:v}};setData(nd);sv(nd);svSB.weight(t,v);setWIn("");setOpenId(null);haptic(20);if(addToast)addToast(`Logged ${v.toFixed(1)}`,"success");};

  const autoreg=getAutoregProposal(rec);
  const adj=data.autoregLog?.[t];
  const decideAutoreg=(type)=>{
    const entry={type,recovery:autoreg?.score??null,at:new Date().toISOString()};
    const nd={...data,autoregLog:{...(data.autoregLog||{}),[t]:entry}};
    setData(nd);sv(nd);
    if(addToast&&type!=="dismissed")addToast(type==="minusOneSet"?"Today: one set less on each accessory":"Today: mobility instead of lifting","success");
  };
  const toggleHabit=(x)=>{const nh={...habits,[x.field]:habits[x.field]===x.target?null:x.target};const nd={...data,habits:{...data.habits,[t]:nh}};setData(nd);sv(nd);svSB.habits(t,nh);};
  const closeDay=()=>{const nd={...data,debrief:{...data.debrief,[t]:true},habits:{...data.habits,[t]:habits}};setData(nd);sv(nd);svSB.debrief(t);svSB.habits(t,habits);haptic(20);};

  // Which row is "now". Order matters: scale, then lift, then evening close.
  const nowId=closed?null
    :wt==null&&h>=4.5&&h<12?"scale"
    :workout?"lift"
    :sess&&!lifted&&adj?.type!=="mobilitySwap"&&h<19.5?"lift"
    :h>=19.5?"close"
    :isFast?"fast"
    :"food";
  const isOpen=id=>openId==null?nowId===id:openId===id;
  const toggle=id=>()=>setOpenId(isOpen(id)?"__none":id);
  const stateOf=(id,done)=>nowId===id?"now":done?"done":"later";

  const rows=[];

  // ── Scale ──
  const trendV=trend?.points?.length?trend.points[trend.points.length-1].v:null;
  // Green only inside the planned cut pace (same band as Trends).
  const pace=trend?(trend.rate<=-0.6&&trend.rate>-2?<span style={{color:C.g}}>{trend.message}, on pace</span>:trend.message):null;
  rows.push(<Ev key="scale" time={nowId==="scale"?"Now":"AM"} state={stateOf("scale",wt!=null)}
    title={wt!=null?<>Weighed in <span style={NUM}>{Number(wt).toFixed(1)}</span></>:"Weigh in"}
    sub={trendV!=null?<>Trend <span style={NUM}>{trendV.toFixed(1)}</span>{pace?<> · {pace}</>:null}</>:"A couple of weigh-ins start the trend"}
    open={isOpen("scale")} onToggle={toggle("scale")}>
    <div style={{marginTop:10}}>
      <ScalePad compact value={wIn} onChange={setWIn} onLog={logWeight} todayLogged={wt!=null?wt:null} yesterdayWt={yesterdayWt}/>
    </div>
  </Ev>);

  // ── Recovery (info only) ──
  if(rec?.recoveryScore!=null){
    const bits=[rec.hrv?`HRV ${Math.round(rec.hrv)}`:null,rec.sleepHours?`sleep ${hm(rec.sleepHours)}`:null,rec.rhr?`RHR ${Math.round(rec.rhr)}`:null].filter(Boolean);
    rows.push(<Ev key="rec" time="AM" state="done" title={<>Recovery <span style={NUM}>{rec.recoveryScore}%</span></>} sub={<span style={NUM}>{bits.join(" · ")}{autoreg?null:sess?" · full session":""}</span>}/>);
  }

  // ── Lift ──
  if(adj?.type==="mobilitySwap"){
    rows.push(<Ev key="lift" time="AM" state={stretchDone?"done":"later"} title="Mobility instead of lifting" sub="Recovery was low. The program is untouched." open={isOpen("lift")} onToggle={toggle("lift")}>
      <Card><div style={{fontSize:13,color:C.t2}}>The 12 minute stretch block and a walk.</div><Main onClick={()=>setTab("training")}>Open stretch</Main></Card>
    </Ev>);
  }else if(sess){
    const exs=sess.exercises||[];
    const cut=adj?.type==="minusOneSet";
    rows.push(<Ev key="lift" time={nowId==="lift"?"Now":"AM"} state={stateOf("lift",lifted)}
      title={lifted?<>Lifted · {sess.name}</>:sess.name}
      sub={lifted?"Logged":workout?"In progress":<span style={NUM}>{exs.length} lifts · about {estTime(sess)} min{cut?" · one set less on accessories":""}</span>}
      open={isOpen("lift")} onToggle={toggle("lift")}>
      {autoreg&&!adj&&!lifted&&!workout&&(()=>{
        const accs=exs.filter(e=>!e.anchor);const mob=autoreg.score<40;
        const before=exs.reduce((s,e)=>s+e.sets,0),after=before-accs.length;
        return(<Card>
          <div style={{fontSize:15,fontWeight:500}}>Recovery is <span style={NUM}>{autoreg.score}%</span></div>
          <div style={{fontSize:13,color:C.t2,marginTop:4,lineHeight:1.45}}>{mob?"Swap today for the 12 minute stretch and a walk. Lifting waits a day.":<>Drop one set from each accessory. <span style={NUM}>{before}</span> sets become <span style={NUM}>{after}</span>. Anchors stay as written.</>}</div>
          <div style={{display:"flex",gap:8,marginTop:12}}>
            <Quiet style={{flex:1}} onClick={()=>decideAutoreg(mob?"mobilitySwap":"minusOneSet")}>{mob?"Take the swap":"Take the cut"}</Quiet>
            <Quiet style={{flex:1,color:C.t3}} onClick={()=>decideAutoreg("dismissed")}>As written</Quiet>
          </div>
        </Card>);})()}
      {!lifted&&<Card>
        {exs.map(e=>{const rr=e.rr||[8,12];const s=cut&&!e.anchor?e.sets-1:e.sets;return(
          <KV key={e.id} k={e.name} v={`${s} × ${rr[0]}${rr[1]>rr[0]?"–"+rr[1]:""}`}/>);})}
        <Main onClick={()=>setTab("training")}>{workout?"Resume session":"Start session"}</Main>
      </Card>}
      {lifted&&<Card style={{padding:"4px 16px"}}><KV k="Session" v="Open in Train"/><Quiet style={{width:"100%",marginBottom:12}} onClick={()=>setTab("training")}>View workout</Quiet></Card>}
    </Ev>);
  }

  // ── Wednesday fast ──
  if(isFast){
    const start=(()=>{const d=new Date(t+"T20:00:00");d.setDate(d.getDate()-1);return d.getTime();})();
    const el=Math.max(0,Date.now()-start);const hrs=Math.floor(el/36e5),mins=Math.floor((el%36e5)/6e4);
    const ly=(data.lytes||{})[t]||{na:0,k:0,mg:0};
    const addLyte=(na,k,mg)=>setData(prev=>{const cur=(prev.lytes||{})[t]||{na:0,k:0,mg:0};const nl={na:(cur.na||0)+na,k:(cur.k||0)+k,mg:(cur.mg||0)+mg};const nd={...prev,lytes:{...(prev.lytes||{}),[t]:nl}};sv(nd);svSB.lytes(t,nl);return nd;});
    const LY=[{k:"na",l:"Sodium",target:5000},{k:"k",l:"Potassium",target:3500},{k:"mg",l:"Magnesium",target:400}];
    rows.push(<Ev key="fast" time={nowId==="fast"?"Now":"Day"} state={stateOf("fast",false)}
      title={<>Fasted <span style={NUM}>{hrs}:{String(mins).padStart(2,"0")}</span> of 36 h</>}
      sub="Tuesday dinner to Thursday breakfast. Salt is the job today."
      open={isOpen("fast")} onToggle={toggle("fast")}>
      <Card>
        <Br v={hrs} max={36} color={C.t} h={4}/>
        <div style={{marginTop:12}}>{LY.map(x=>{const v=ly[x.k]||0;return <KV key={x.k} k={x.l} v={<span style={{color:v>=x.target?C.g:C.t}}>{n(v)} of {n(x.target)} mg</span>}/>;})}</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginTop:10}}>
          <Quiet onClick={()=>addLyte(810,400,50)}>Re-Lyte</Quiet>
          <Quiet onClick={()=>addLyte(1150,0,0)}>½ tsp salt</Quiet>
          <Quiet onClick={()=>addLyte(0,0,120)}>Magnesium</Quiet>
        </div>
      </Card>
    </Ev>);
  }

  // ── Food and water (Cronometer fills it; quick-log lives in the sheet) ──
  if(!isFast){
    rows.push(<Ev key="food" time={nowId==="food"?"Now":"Day"} state={stateOf("food",proNow>=proT)}
      title={<>Food <span style={NUM}>{proNow}</span> of <span style={NUM}>{proT}</span> g protein</>}
      sub={<span style={NUM}>{n(calNow)}{calT?` of ${n(calT)}`:""} cal · water {water} of {st.water||128} oz</span>}
      open={isOpen("food")} onToggle={toggle("food")}>
      <Card>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
          <span style={{fontSize:13,color:C.t3}}>Water</span>
          <div style={{display:"flex",gap:6}}>{[24,32,64].map(oz=><Quiet key={oz} onClick={()=>{haptic();addWater(oz);}}>+{oz}</Quiet>)}</div>
        </div>
        {nowId==="food"?<Main onClick={()=>setFoodOpen(true)}>Log food</Main>:<Quiet style={{width:"100%",marginTop:12}} onClick={()=>setFoodOpen(true)}>Log food</Quiet>}
        <div style={{fontSize:12,color:C.t3,marginTop:8}}>Cronometer fills this in through the day.</div>
      </Card>
    </Ev>);
  }else{
    rows.push(<Ev key="water" time="Day" state={water>=(st.water||128)?"done":"later"} title={<>Water <span style={NUM}>{water}</span> of <span style={NUM}>{st.water||128}</span> oz</>} open={isOpen("water")} onToggle={toggle("water")}>
      <div style={{display:"flex",gap:6,marginTop:10}}>{[24,32,64].map(oz=><Quiet key={oz} onClick={()=>{haptic();addWater(oz);}}>+{oz}</Quiet>)}</div>
    </Ev>);
  }

  // ── Cardio ──
  rows.push(<Ev key="cardio" time="Day" state={cardioDone?"done":"later"} title={cardioDone?"Cardio done":"Cardio or a walk"}
    sub={<span style={NUM}>Steps {n(data.steps?.[t]||0)} of {n(cutStepsTarget(st))}</span>} onToggle={cardioDone?undefined:()=>setTab("training")}/>);

  // ── Close the day ──
  const tomorrow=(()=>{const d=new Date(t+"T12:00:00");d.setDate(d.getDate()+1);return lds(d);})();
  const tmrSess=data.program?.[dw(tomorrow)];
  const stepsNow=data.steps?.[t]||0,stepsT=cutStepsTarget(st);
  rows.push(<Ev key="close" last time={nowId==="close"?"Now":"19:30"} state={closed?"done":stateOf("close",false)}
    title={closed?"Day closed":"Close the day"}
    sub={closed?`Clean day ${held} of 7`:`Stretch${stretchDone?" done":""} · clean day check`}
    open={isOpen("close")} onToggle={toggle("close")}>
    <Card>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:13}}><span style={{color:C.t3}}>What held today</span><span style={{...NUM}}>{held} of 7</span></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginTop:10}}>
        {SYSTEM_HABITS.map(x=>{const on=habits[x.field]===x.target;return(
          <button type="button" key={x.field} onClick={()=>toggleHabit(x)} aria-pressed={on} style={{minHeight:42,borderRadius:8,border:`1px solid ${on?C.g:C.bd}`,background:on?C.gl:C.cd,color:on?C.g:C.t2,fontSize:13,fontWeight:500,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 12px"}}><span>{HABIT_LABELS[x.field]}</span><span>{on?"✓":""}</span></button>);})}
      </div>
      {closed?<div style={{fontSize:13,color:C.g,marginTop:12}}>Closed. See you tomorrow.</div>
        :<Main onClick={closeDay} disabled={held<6}>{held>=6?"Close the day":`Tap what held · ${held} of 7`}</Main>}
      <div style={{borderTop:`1px solid ${C.bd}`,marginTop:14,paddingTop:6}}>
        <KV k="Steps" v={<span style={{color:stepsNow>=stepsT?C.g:C.t}}>{stepsNow?n(stepsNow):"○"}</span>}/>
        <KV k="Calories" v={calNow?n(calNow):"○"}/>
        <KV k="Protein" v={<span style={{color:proNow>=proT?C.g:C.t}}>{proNow?`${proNow} g`:"○"}</span>}/>
        <KV k="Tomorrow" v={tmrSess?tmrSess.name:"Rest day"}/>
      </div>
      {!stretchDone&&<Quiet style={{width:"100%",marginTop:8}} onClick={()=>setTab("training")}>Evening stretch · 12 min</Quiet>}
      <details style={{marginTop:10}}><summary style={{fontSize:13,color:C.t3,cursor:"pointer",padding:"6px 0"}}>Type a missing number</summary><CloseoutPanel data={data} setData={setData}/></details>
    </Card>
  </Ev>);

  const pollen=(allergies?.summary||[]).slice(0,3);

  return(<div style={{paddingTop:12}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:8}}>
      <h1 style={{fontSize:22,fontWeight:600,letterSpacing:"-0.2px"}}>{cap(dayName)}</h1>
      <span style={{fontSize:13,color:C.t3,...NUM}}>{fmt(t)} · Week {wkn(t)} of {PROG.weeks}</span>
    </div>
    <div style={{position:"relative",marginTop:22}}>
      <span aria-hidden="true" style={{position:"absolute",left:44,top:6,bottom:6,width:1,background:C.bd}}/>
      {rows}
    </div>
    {pollen.length>0&&<div style={{fontSize:12,color:C.t3,marginTop:28,textAlign:"center"}}>Pollen · {pollen.map(a=>`${a.name} ${a.level||"○"}`).join(" · ")}</div>}
    <Sheet open={foodOpen} onClose={()=>setFoodOpen(false)} maxHeight="90vh">
      {foodOpen&&<Nutrition data={data} setData={setData} addToast={addToast}/>}
    </Sheet>
  </div>);
};

export { Today };
