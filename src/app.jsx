const { useState, useEffect, useRef, useCallback } = React;
import { bl, migrate, seedHistorical, backfillData, pruneProgression, repairDeloadProgression, applyBlockV2, mergeProgression } from "../lib/engine.mjs";
import { KEYS_OF_TABLE } from "../lib/supabase.mjs";
import { flushOutbox, ld, loadFromSB, onSyncFailure, sv, syncHealth } from "./core/storage.js";
import { C } from "./core/theme.js";
import { Moments } from "./tabs/Moments.jsx";
import { Nutrition } from "./tabs/Nutrition.jsx";
import { Settings } from "./tabs/Settings.jsx";
import { Training } from "./tabs/Training.jsx";
import { Weight } from "./tabs/Weight.jsx";
import { ToastStack } from "./ui/overlay.jsx";
import { TabBar, TabPane, TABS, WorkoutTimerBar } from "./ui/shell.jsx";

window.App = function App(){
  const [tab,setTabRaw]=useState(()=>{try{const v=new URLSearchParams(location.search).get("tab");return TABS.some(x=>x.id===v)?v:"dashboard";}catch{return "dashboard";}});
  const scrollPos=useRef({});
  const setTab=useCallback((next)=>{setTabRaw(prev=>{if(prev===next)return prev;scrollPos.current[prev]=window.scrollY;return next;});},[]);
  useEffect(()=>{window.scrollTo(0,scrollPos.current[tab]||0);},[tab]);
  const [data,setData]=useState(()=>{const raw=ld();return seedHistorical(raw?migrate(raw):bl());});
  const [workout,setWorkoutRaw]=useState(()=>{try{const w=localStorage.getItem("dhub6_workout");return w?JSON.parse(w):null;}catch{return null;}});
  const setWorkout=(v)=>{setWorkoutRaw(prev=>{const next=typeof v==="function"?v(prev):v;try{if(next)localStorage.setItem("dhub6_workout",JSON.stringify(next));else localStorage.removeItem("dhub6_workout");}catch{}return next;});};
  const [syncStatus,setSyncStatus]=useState("");
  const [toasts,setToasts]=useState([]);
  const [syncFailures,setSyncFailures]=useState({});
  const dismissToast=useCallback((id)=>setToasts(p=>p.filter(t=>t.id!==id)),[]);
  const addToast=useCallback((message,type="info",action=null)=>{
    const id=Date.now()+Math.random();
    setToasts(p=>[...p.filter(t=>t.message!==message).slice(-2),{id,message,type,action}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),action?8000:3500);
  },[]);
  useEffect(()=>onSyncFailure((table,first)=>{
    setSyncFailures({...syncHealth.failures});
    const f=syncHealth.failures[table];
    if(first&&f&&!f.transient)addToast(`Sync failed: ${table} · not backed up`,"error");
  }),[addToast]);

  useEffect(()=>{
    (async()=>{
      const sbData=await loadFromSB();
      let finalData;
      if(sbData){
        const local=ld();
        if(local){
          const merged=migrate(local);
          const final={...merged};
          // Smart merge: Supabase wins for date-keyed data (external syncs like Oura/Cronometer
          // write directly to Supabase, so it is always authoritative). Local-only dates
          // (offline entries not yet in Supabase) are preserved because sbData won't have that key.
          const dateKeyed=new Set(["wt","nut","wk","rec","steps","water","habits","mob","stp","debrief","cardio","bodyComp","bodyMeas","lytes","travelDays","tdeeExclude"]);
          // A table that failed to load comes back as defaults. Keep this phone's copy for it,
          // or an offline launch would reset settings and the program to the code defaults.
          const failed=new Set(sbData.__loadError?Object.keys(sbData):(sbData.__failed||[]));
          // Keys with no cloud table (socialWeekend…) come back as defaults too; the phone's copy wins.
          const cloudKeys=new Set(Object.values(KEYS_OF_TABLE).flat());
          Object.keys(sbData).forEach(k=>{
            if(failed.has(k)||!cloudKeys.has(k))return;
            if(dateKeyed.has(k)&&typeof sbData[k]==="object"&&!Array.isArray(sbData[k])&&sbData[k]!==null){
              // For date-keyed data: start with local, then overlay Supabase (Supabase wins)
              final[k]={...merged[k],...sbData[k]};
            }else if(k==="prog"&&typeof sbData[k]==="object"&&sbData[k]!==null){
              // Progression: freshest row per lift wins, so stale phone state cannot roll back newer cloud workouts.
              final[k]=mergeProgression(merged[k],sbData[k]);
            }else if(typeof sbData[k]==="object"&&!Array.isArray(sbData[k])&&sbData[k]!==null){
              final[k]={...merged[k],...sbData[k]};
            }else if(Array.isArray(sbData[k])&&sbData[k].length>0){
              final[k]=sbData[k];
            }else if(sbData[k]&&(!merged[k]||Object.keys(merged[k]).length===0)){
              final[k]=sbData[k];
            }
          });
          finalData=final;
          const localHasData=Object.keys(merged.wk).length>0||Object.keys(merged.wt).length>0||Object.keys(merged.nut).length>0;
          const sbEmpty=Object.keys(sbData.wk).length===0&&Object.keys(sbData.wt).length===0;
          if(localHasData&&sbEmpty){
            setSyncStatus("Cloud is empty or unreachable · showing this phone's copy");
            setTimeout(()=>setSyncStatus(""),4000);
          }
        }else{
          finalData=sbData;
        }
      }else{
        finalData=data;
      }
      // Browser boot is read-only: pending program updates and migrations require approved maintenance.
      const updated=finalData;
      backfillData(updated);repairDeloadProgression(updated);
      // Block v2 and progression pruning normalize local render state only; they must not write on view.
      applyBlockV2(updated);
      const pruned=pruneProgression(updated);
      setData(updated);sv(updated);
      if(pruned)console.log(`[prune] Local-only cleanup removed ${pruned} orphaned lift record${pruned===1?"":"s"}`);
      // Coach changes (Claude.ai via /api/mcp, or /api/update) are applied server-side;
      // surface anything new since the last launch, once.
      try{
        const log=(updated.coachLog||[]).filter(c=>c.applied&&c.at);
        const seen=localStorage.getItem("dhub6_coach_seen");
        if(log.length){
          if(seen){log.filter(c=>c.at>seen).slice(0,3).forEach(c=>addToast(`Coach · ${c.summary||c.type}${c.reason?` · ${c.reason}`:""}`,"info",{label:"Setup",fn:()=>setTab("settings")}));}
          localStorage.setItem("dhub6_coach_seen",log[0].at);
        }
      }catch{}
    })();
    // Service worker: offline shell + push display. A new build activates on the
    // next launch; mid-session we only offer a reload so a workout is never cut.
    if('serviceWorker' in navigator){
      const hadController=!!navigator.serviceWorker.controller;
      navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).then(r=>{r.update().catch(()=>{});}).catch(()=>{});
      navigator.serviceWorker.addEventListener('controllerchange',()=>{if(hadController)addToast("Health Hub updated","info",{label:"Reload",fn:()=>location.reload()});});
      navigator.serviceWorker.addEventListener('message',(e)=>{const m=e.data||{};if(m.type==="NAVIGATE"&&m.tab)setTab(m.tab);});
    }
  },[]);

  // Persist: every mutation already writes through sv(); this is the safety net,
  // debounced so a burst of taps serializes once, flushed the moment the app hides.
  const dataRef=useRef(data);dataRef.current=data;
  const saveTimer=useRef(null);
  useEffect(()=>{clearTimeout(saveTimer.current);saveTimer.current=setTimeout(()=>sv(dataRef.current),400);return()=>clearTimeout(saveTimer.current);},[data]);
  useEffect(()=>{const flush=()=>{if(document.visibilityState==="hidden"){clearTimeout(saveTimer.current);sv(dataRef.current);}};
    document.addEventListener("visibilitychange",flush);window.addEventListener("pagehide",flush);
    return()=>{document.removeEventListener("visibilitychange",flush);window.removeEventListener("pagehide",flush);};},[]);

  // Retry only row-level writes that failed in a dead spot. Never do full-object foreground writes.
  useEffect(()=>{
    const flush=()=>{if(navigator.onLine!==false)flushOutbox();};
    const onVisible=()=>{if(document.visibilityState==="visible")flush();};
    flush();
    window.addEventListener("online",flush);
    document.addEventListener("visibilitychange",onVisible);
    return()=>{window.removeEventListener("online",flush);document.removeEventListener("visibilitychange",onVisible);};
  },[]);

  return(
    <div style={{background:C.bg,color:C.t,minHeight:"100dvh",fontFamily:"'Barlow',-apple-system,BlinkMacSystemFont,sans-serif",display:"flex",flexDirection:"column",maxWidth:520,margin:"0 auto"}}>
      {syncStatus&&<div style={{background:C.pl,padding:"6px 14px",fontSize:12,color:C.p,fontWeight:600,textAlign:"center"}}>{syncStatus}</div>}
      {workout&&tab!=="training"&&<div style={{position:"sticky",top:0,zIndex:90}}><WorkoutTimerBar workout={workout} onTap={()=>setTab("training")} programDays={data.program}/></div>}
      <main style={{flex:1,padding:"16px 14px",paddingBottom:"calc(var(--tabbar-h) + var(--safe-b) + 24px)"}}>
        <TabPane active={tab==="dashboard"}><Moments data={data} setData={setData} setTab={setTab} workout={workout} addToast={addToast}/></TabPane>
        <TabPane active={tab==="training"}><Training data={data} setData={setData} workout={workout} setWorkout={setWorkout} setTab={setTab} addToast={addToast} active={tab==="training"}/></TabPane>
        <TabPane active={tab==="nutrition"}><Nutrition data={data} setData={setData} addToast={addToast}/></TabPane>
        <TabPane active={tab==="weight"}><Weight data={data} setData={setData}/></TabPane>
        <TabPane active={tab==="settings"}><Settings data={data} setData={setData} syncFailures={syncFailures} addToast={addToast}/></TabPane>
      </main>
      <TabBar active={tab} set={setTab} hasActiveWorkout={!!workout}/>
      <ToastStack toasts={toasts} dismiss={dismissToast}/>
    </div>
  );
}

class ErrorBoundary extends React.Component{
  constructor(p){super(p);this.state={err:null};}
  static getDerivedStateFromError(err){return{err};}
  componentDidCatch(err,info){console.error("[ErrorBoundary]",err,info);}
  render(){
    if(!this.state.err)return this.props.children;
    const msg=this.state.err&&(this.state.err.message||String(this.state.err))||"Unknown error";
    return React.createElement("div",{style:{padding:20,maxWidth:480,margin:"40px auto",fontFamily:"'Barlow',sans-serif"}},
      React.createElement("h2",{style:{fontSize:18,fontWeight:700,marginBottom:8}},"Something went wrong"),
      React.createElement("p",{style:{fontSize:14,opacity:.7,marginBottom:14}},"The app hit an error while rendering. Your data is safe. Clear the cache and reload."),
      React.createElement("pre",{style:{fontSize:11,padding:10,borderRadius:4,overflow:"auto",whiteSpace:"pre-wrap",border:"1px solid var(--line)",color:"var(--danger)"}},msg),
      React.createElement("button",{onClick:()=>{try{if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister()));}if(window.caches){caches.keys().then(ks=>ks.forEach(k=>caches.delete(k)));}}catch{}setTimeout(()=>location.reload(),300);},
        style:{marginTop:14,padding:"10px 18px",background:"var(--ink)",color:"var(--on-accent)",border:"none",borderRadius:8,fontSize:14,fontWeight:600,cursor:"pointer",textTransform:"uppercase",letterSpacing:"0.04em"}},"Clear cache & reload")
    );
  }
}
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(ErrorBoundary,null,React.createElement(App)));
