const { useState, useEffect, useRef, useCallback } = React;
import { PROG, cutStepsTarget, DEFAULTS, bl, td, fmt, wkn } from "../../lib/engine.mjs";
import { LOAD_PLAN } from "../../lib/supabase.mjs";
import { ensureNotificationPermission, isStandalone, notifyDevice, scheduleServerPush } from "../core/device.js";
import { useBackClose } from "../core/nav.js";
import { saveNotificationSettings, sb, sv, svSB } from "../core/storage.js";
import { APP_VERSION, C, FD } from "../core/theme.js";
import { B, L, N, S, X } from "../ui/atoms.jsx";
import { ConfirmModal } from "../ui/overlay.jsx";
import { ProgressView } from "../views/Progress.jsx";

// ═══ SETTINGS ═══
const Settings=({data,setData,syncFailures={}})=>{
  const failedTables=Object.keys(syncFailures);
  const hardTables=failedTables.filter(tb=>!syncFailures[tb]?.transient);
  const blipTables=failedTables.filter(tb=>syncFailures[tb]?.transient);
  const syncOk=hardTables.length===0;
  const t=td();
  const st=data.settings||DEFAULTS;
  const [f,setF]=useState({calories:""+st.calories,protein:""+st.protein,water:""+st.water,steps:""+cutStepsTarget(st),sleep:""+st.sleep,fiber:""+(st.fiber||30),
    trainingCal:""+(st.trainingCal??DEFAULTS.trainingCal),wednesdayCal:""+(st.wednesdayCal??DEFAULTS.wednesdayCal),weekendCal:""+(st.weekendCal??DEFAULTS.weekendCal),syncToken:st.syncToken||"",notifyToken:st.notifyToken||""});
  const [saved,setSaved]=useState(false);
  const [editTargets,setEditTargets]=useState(false);
  const [showProgress,setShowProgress]=useState(false);
  useBackClose(showProgress,()=>setShowProgress(false));
  const [showReset,setShowReset]=useState(false);
  const isTravel=!!(data.travelDays||{})[t];
  const lastPhotoDate=(()=>{const e=Object.entries(data.bodyComp||{}).filter(([_,v])=>v).sort((a,b)=>b[0].localeCompare(a[0]));return e[0]?.[0]||null;})();
  const lastPhotoLine=lastPhotoDate?`Last photos ${fmt(lastPhotoDate)}`:"No photos yet · first set is due";
  const integrations=(()=>{
    const lastNut=Object.keys(data.nut||{}).sort().reverse()[0]||null;
    const lastRecRow=Object.entries(data.rec||{}).filter(([_,v])=>v&&v.recoveryScore!=null).sort((a,b)=>b[0].localeCompare(a[0]))[0]||null;
    const lastSteps=Object.keys(data.steps||{}).sort().reverse()[0]||null;
    const daysAgo=d=>d?Math.round((new Date(t+"T12:00:00")-new Date(d+"T12:00:00"))/864e5):null;
    const pushOn=typeof Notification!=="undefined"&&Notification.permission==="granted"&&(data.settings.notifications||{}).enabled;
    return[
      {name:"Cronometer",dot:lastNut&&daysAgo(lastNut)<=1?C.g:C.t3,status:lastNut?`SYNCED ${fmt(lastNut).toUpperCase()}`:"NO DATA"},
      {name:"Oura",dot:lastRecRow&&daysAgo(lastRecRow[0])<=1?C.g:C.t3,status:lastRecRow?(daysAgo(lastRecRow[0])<=1?`SYNCED ${fmt(lastRecRow[0]).toUpperCase()}`:`LAST WORN ${fmt(lastRecRow[0]).toUpperCase()}`):"NO DATA"},
      {name:"HAE · steps & weight",dot:lastSteps&&daysAgo(lastSteps)<=1?C.g:C.t3,status:lastSteps?`LAST ${fmt(lastSteps).toUpperCase()}`:"NO DATA"},
      syncOk?{name:"Supabase sync",dot:C.g,status:blipTables.length?`OK · ${blipTables.length} DROPPED, RETRYING`:"ALL WRITES OK"}:{name:"Supabase sync",dot:C.r,status:`${hardTables[0].toUpperCase()} · MIGRATION`},
      {name:"Push notifications",dot:pushOn?C.g:C.t3,status:pushOn?"REST TIMERS ON":"OFF"},
    ];
  })();

  const toggleTravel=()=>{
    const newVal=!isTravel;
    const nd={...data,travelDays:{...data.travelDays,[t]:newVal}};
    setData(nd);sv(nd);svSB.travelDay(t,newVal);
  };
  if(showProgress)return(<ProgressView data={data} setData={setData} onBack={()=>setShowProgress(false)}/>);

  const saveSettings=()=>{
    // Spread existing settings first so fields not managed by this form
    // (customHabits, reminders, notifications) survive a save.
    const nd={...data,settings:{...DEFAULTS,...data.settings,
      calories:+f.calories||DEFAULTS.calories,protein:+f.protein||DEFAULTS.protein,
      water:+f.water||DEFAULTS.water,steps:+f.steps||DEFAULTS.steps,sleep:+f.sleep||DEFAULTS.sleep,fiber:+f.fiber||DEFAULTS.fiber,
      trainingCal:Number.isFinite(+f.trainingCal)?+f.trainingCal:DEFAULTS.trainingCal,wednesdayCal:Number.isFinite(+f.wednesdayCal)?+f.wednesdayCal:DEFAULTS.wednesdayCal,weekendCal:Number.isFinite(+f.weekendCal)?+f.weekendCal:DEFAULTS.weekendCal,
      syncToken:f.syncToken||"",notifyToken:f.notifyToken||""}};
    setData(nd);sv(nd);svSB.settings(nd.settings);setSaved(true);setTimeout(()=>setSaved(false),2000);
  };

  const exportData=()=>{
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download=`health-hub-export-${td()}.json`;
    document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
  };
  return(<div style={{display:"flex",flexDirection:"column",gap:8}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
      <div style={{fontSize:26,fontWeight:800,color:C.t,fontFamily:FD,textTransform:"uppercase",letterSpacing:"0.03em",lineHeight:1}}>Setup</div>
      <div title={syncOk?"All cloud writes ok this session":`Sync failed: ${failedTables.join(", ")}`}
        style={{display:"flex",alignItems:"center",gap:6,fontSize:11,fontWeight:700,color:syncOk?C.g:C.r}}>
        <span style={{width:10,height:10,borderRadius:5,background:syncOk?C.g:C.r,display:"inline-block"}}/>
        {syncOk?"Sync ok":"Sync failing"}
      </div>
    </div>
    <X style={{padding:"14px 16px"}}>
      <div style={{fontSize:10,fontWeight:700,color:C.t3,letterSpacing:"0.14em",fontFamily:FD}}>TARGETS & DAY TYPES</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7,marginTop:10}}>
        {[{v:(+f.trainingCal||2000).toLocaleString(),l:"TRAIN CAL"},{v:`${f.protein||200}g`,l:"PROTEIN"},{v:f.water||128,l:"WATER OZ"},{v:`${Math.round((+f.steps||15000)/1000)}k`,l:"STEPS"},{v:"0",l:"WED FAST",ember:true},{v:`${(((+f.weekendCal||1800)+100)/1000).toFixed(1)}/${(((+f.weekendCal||1800)-100)/1000).toFixed(1)}k`,l:"SAT/SUN"}].map(x=>(
          <button key={x.l} onClick={()=>setEditTargets(v=>!v)} style={{background:x.ember?C.pl:C.bg,border:"none",borderRadius:8,padding:"9px 6px",textAlign:"center",cursor:"pointer"}}>
            <div style={{fontSize:17,fontWeight:800,fontFamily:FD,color:x.ember?C.p:C.t}}>{x.v}</div>
            <div style={{fontSize:8.5,fontWeight:700,letterSpacing:"0.06em",fontFamily:FD,color:x.ember?C.p:C.t3}}>{x.l}</div>
          </button>))}
      </div>
      <div style={{fontSize:11,color:C.t3,marginTop:8}}>tap any tile to edit · day types drive Food and the fast clock</div>
    </X>
    <div onClick={()=>setShowProgress(true)} style={{background:C.cd,border:`1px solid ${C.p}`,borderRadius:12,padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}}>
      <div>
        <div style={{fontSize:10,fontWeight:700,color:C.p,letterSpacing:"0.14em",fontFamily:FD}}>PROGRESS</div>
        <div style={{fontSize:14,fontWeight:700,color:C.t,marginTop:3}}>Photos · measurements · weekly AI analysis</div>
        <div style={{fontSize:11.5,color:C.t3,marginTop:2}}>{lastPhotoLine}</div>
      </div>
      <div style={{fontSize:18,fontWeight:800,color:C.p,fontFamily:FD}}>→</div>
    </div>
    <X style={{padding:"6px 0"}}>
      {integrations.map((r,i)=>(
        <div key={r.name} style={{padding:"10px 16px",display:"flex",alignItems:"center",gap:10,borderBottom:i<integrations.length-1?`1px solid ${C.bg}`:"none"}}>
          <span style={{width:8,height:8,borderRadius:4,background:r.dot,flexShrink:0}}/>
          <span style={{fontSize:13,fontWeight:600,color:C.t,flex:1}}>{r.name}</span>
          <span style={{fontSize:11,fontWeight:700,fontFamily:FD,color:r.dot===C.r?C.r:C.t3}}>{r.status}</span>
        </div>))}
    </X>
    {!syncOk&&(
      <X style={{padding:10,borderLeft:`3px solid ${C.r}`}}>
        <div style={{fontSize:11,fontWeight:800,color:C.r,marginBottom:4}}>Cloud sync errors this session</div>
        {hardTables.map(tb=>(
          <div key={tb} style={{fontSize:11,color:C.t2,padding:"2px 0",fontFamily:"monospace",wordBreak:"break-word"}}>
            <b style={{color:C.t}}>{tb}</b> ×{syncFailures[tb]?.n||1} · {syncFailures[tb]?.msg||"unknown"}
          </div>
        ))}
        <div style={{fontSize:11,color:C.t3,marginTop:4}}>A message naming a missing column means a migration in /supabase/ hasn't been run yet.</div>
      </X>
    )}
    {blipTables.length>0&&(
      <div style={{fontSize:11,color:C.t3,padding:"0 2px"}}>
        Dropped requests this session (auto-retried, cleared on the next successful write): {blipTables.map(tb=>`${tb} ×${syncFailures[tb]?.n||1}`).join(" · ")}
      </div>
    )}

    {editTargets&&<X style={{borderLeft:`3px solid ${C.bd}`}}>
      <div style={{fontSize:14,fontWeight:700,color:C.t,marginBottom:8}}>Daily Targets</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <div><L>Avg Calories</L><N value={f.calories} onChange={v=>setF({...f,calories:v})} placeholder="1790"/></div>
        <div><L>Protein (g)</L><N value={f.protein} onChange={v=>setF({...f,protein:v})} placeholder="200"/></div>
        <div><L>Water (oz)</L><N value={f.water} onChange={v=>setF({...f,water:v})} placeholder="128"/></div>
        <div><L>Steps</L><N value={f.steps} onChange={v=>setF({...f,steps:v})} placeholder="15000"/></div>
        <div><L>Sleep (hrs)</L><N value={f.sleep} onChange={v=>setF({...f,sleep:v})} placeholder="7.5"/></div>
        <div><L>Fiber (g)</L><N value={f.fiber} onChange={v=>setF({...f,fiber:v})} placeholder="30"/></div>
      </div>
      <div style={{fontSize:12,fontWeight:700,color:C.t2,marginTop:10,marginBottom:4}}>Day-Type Calorie Targets</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
        <div><L>Training</L><N value={f.trainingCal} onChange={v=>setF({...f,trainingCal:v})} placeholder="2000"/></div>
        <div><L>Wednesday</L><N value={f.wednesdayCal} onChange={v=>setF({...f,wednesdayCal:v})} placeholder="900"/></div>
        <div><L>Weekend avg</L><N value={f.weekendCal} onChange={v=>setF({...f,weekendCal:v})} placeholder="1800"/></div>
      </div>
      <div style={{fontSize:11,color:C.t3,marginTop:4}}>Weekend splits Sat +100 / Sun −100 around the average.</div>
      <B full style={{marginTop:10}} onClick={saveSettings} color={saved?C.g:C.p}>{saved?"Saved!":"Save Targets"}</B>
    </X>}

    {/* ═══ NOTIFICATIONS ═══ */}
    <S title="Notifications">
      <X style={{padding:10}}>
        {typeof Notification!=="undefined"&&Notification.permission==="denied"?(
          <div style={{fontSize:12,color:C.r}}>Notifications blocked. Enable in browser settings.</div>
        ):(
          <>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <span style={{fontSize:14,fontWeight:600,color:C.t}}>Enable Notifications</span>
              <button onClick={async()=>{
                const ns=data.settings.notifications||{};
                if(!ns.enabled){
                  const ok=await ensureNotificationPermission();
                  if(!ok)return;
                  notifyDevice("Health Hub notifications on",{body:"Timer alerts are enabled.",tag:"notification-test",requireInteraction:false});
                  scheduleServerPush({title:"Health Hub push test",body:"Server push is enabled for closed-app rest timers.",tag:"server-push-test",dueAt:Date.now()+5000,url:"/"});
                }
                const nextNotifications={...ns,enabled:!ns.enabled};
                saveNotificationSettings(nextNotifications);
                const nd={...data,settings:{...data.settings,notifications:nextNotifications}};
                setData(nd);sv(nd);svSB.settings(nd.settings);
              }} style={{padding:"6px 16px",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
                border:`1px solid ${(data.settings.notifications||{}).enabled?C.g:C.bd}`,
                background:(data.settings.notifications||{}).enabled?C.gl:"transparent",
                color:(data.settings.notifications||{}).enabled?C.g:C.t3}}>
                {(data.settings.notifications||{}).enabled?"On":"Off"}
              </button>
            </div>
            {(data.settings.notifications||{}).enabled&&(
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                {[{key:"restTimer",label:"Rest timer complete"},{key:"timers",label:"All workout timers"},{key:"sound",label:"Sound when the app is open"},{key:"vibrate",label:"Vibration"}].map(n=>{
                  const ns=data.settings.notifications||{};
                  const on=ns[n.key]!==false;
                  return(<div key={n.key} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:`1px solid ${C.bl}`}}>
                    <span style={{fontSize:12,color:C.t}}>{n.label}</span>
                    <button onClick={()=>{
                      const nextNotifications={...ns,[n.key]:!on};
                      saveNotificationSettings(nextNotifications);
                      const nd={...data,settings:{...data.settings,notifications:nextNotifications}};
                      setData(nd);sv(nd);svSB.settings(nd.settings);
                    }} style={{padding:"3px 10px",borderRadius:6,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
                      border:`1px solid ${on?C.g:C.bd}`,background:on?C.gl:"transparent",color:on?C.g:C.t3}}>
                      {on?"On":"Off"}
                    </button>
                  </div>);
                })}
              </div>
            )}
            {(data.settings.notifications||{}).enabled&&(
              <div style={{display:"flex",gap:6,marginTop:8}}>
                <B small outline onClick={()=>{notifyDevice("Health Hub test",{body:"Notifications reach this phone.",tag:"notification-test",requireInteraction:false});}}>Test now</B>
                <B small outline onClick={()=>{scheduleServerPush({title:"Health Hub push test",body:"Closed-app push works. Rest timers will reach you.",tag:"server-push-test",dueAt:Date.now()+8000,url:"/"}).then(ok=>{if(!ok)notifyDevice("Server push unavailable",{body:"VAPID keys or the push token are missing. Rest alerts fire only while the app is open.",tag:"server-push-test",requireInteraction:false});});}}>Test closed-app push in 8s</B>
              </div>
            )}
            {(data.settings.notifications||{}).enabled&&(
              <div style={{marginTop:8}}>
                <L>Push token</L>
                <input value={f.notifyToken} onChange={e=>setF({...f,notifyToken:e.target.value})} placeholder="Same value as Vercel env NOTIFY_TOKEN"
                  style={{width:"100%",padding:"8px 10px",border:`1px solid ${C.bd}`,borderRadius:6,fontSize:13,fontFamily:"inherit",background:C.cd,color:C.t,boxSizing:"border-box"}}/>
                <div style={{fontSize:11,color:C.t3,marginTop:3}}>Authorizes closed-app rest-timer push. Saved with Save Targets.</div>
              </div>
            )}
          </>
        )}
      </X>
    </S>

    {/* ═══ HEALTH SYNC ═══ */}
    <X style={{borderLeft:`3px solid ${C.bd}`}}>
      <div style={{fontSize:14,fontWeight:700,color:C.t,marginBottom:4}}>Steps + Weight Sync (via Apple Health)</div>
      <div style={{fontSize:12,color:C.t3,marginBottom:8}}>Food comes from Cronometer automatically (nightly). Steps and weight sync via Apple Shortcut. Set the same token in Vercel env var SYNC_TOKEN.</div>
      <div><L>Sync Token</L><input value={f.syncToken} onChange={e=>setF({...f,syncToken:e.target.value})} placeholder="Set a secret token"
        style={{width:"100%",padding:"8px 10px",border:`1px solid ${C.bd}`,borderRadius:6,fontSize:13,fontFamily:"inherit",background:C.cd,color:C.t,boxSizing:"border-box"}}/></div>
      <div style={{marginTop:8,padding:8,background:C.pl,borderRadius:6,fontSize:11,color:C.t2,lineHeight:1.6,border:`1px solid ${C.p}`}}>
        <div style={{fontWeight:700,marginBottom:4,color:C.p}}>Steps + Weight Shortcuts:</div>
        Steps: sum today's Step Count samples, round to a whole number, then call:<br/>
        <span style={{fontFamily:"monospace",fontSize:10,wordBreak:"break-all",display:"block",marginTop:4,padding:"4px 6px",background:C.cd,borderRadius:6,border:`1px solid ${C.bd}`}}>
          https://your-domain.vercel.app/api/sync-steps?token=YOUR_TOKEN&amp;date=YYYY-MM-DD&amp;steps=STEP_SUM
        </span>
        Weight: use latest Body Mass, convert to pounds, then call:<br/>
        <span style={{fontFamily:"monospace",fontSize:10,wordBreak:"break-all",display:"block",marginTop:4,padding:"4px 6px",background:C.cd,borderRadius:6,border:`1px solid ${C.bd}`}}>
          https://your-domain.vercel.app/api/sync-weight?token=YOUR_TOKEN&amp;date=YYYY-MM-DD&amp;weight=WEIGHT_LBS
        </span>
      </div>
    </X>

    {/* ═══ TRAVEL DAY ═══ */}
    <X style={{borderLeft:`3px solid ${C.bd}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:14,fontWeight:700,color:C.t}}>Travel Day</div>
          <div style={{fontSize:12,color:C.t3}}>Toggle for travel/social weekends</div>
        </div>
        <button onClick={toggleTravel} style={{padding:"8px 16px",borderRadius:6,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
          background:isTravel?C.pl:"transparent",border:`1px solid ${isTravel?C.p:C.bd}`,color:isTravel?C.p:C.t3}}>{isTravel?"ON":"OFF"}</button>
      </div>
      {isTravel&&(<div style={{marginTop:8,padding:8,background:C.bg,borderRadius:8}}>
        <div style={{fontSize:11,fontWeight:700,color:C.t,marginBottom:4}}>Travel Protocol</div>
        <div style={{fontSize:12,color:C.t2,lineHeight:1.6}}>
          • Hydrate aggressively: 20-32 oz water + electrolytes before bed<br/>
          • Take magnesium glycinate regardless of time<br/>
          • Skip melatonin if drinking<br/>
          • Wake at 6 AM · get sunlight immediately<br/>
          • Prioritize protein when eating. Light movement &gt; nothing<br/>
          • Don't nap past 1 PM. Normal bedtime that night.
        </div>
      </div>)}
    </X>

    {/* ═══ TDEE CALIBRATION ═══ */}
    {(()=>{
      const tc=data.tdeeCal||{};
      const saveCal=(patch)=>{const nd={...data,tdeeCal:{...tc,...patch,answered:true}};setData(nd);sv(nd);};
      const btn=(active)=>({padding:"7px 10px",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",
        background:active?C.pl:"transparent",border:`1px solid ${active?C.p:C.bd}`,color:active?C.p:C.t3});
      return(
      <X style={{borderLeft:`3px solid ${C.bd}`}}>
        <div style={{fontSize:14,fontWeight:700,color:C.t}}>TDEE Calibration</div>
        <div style={{fontSize:12,color:C.t3,marginBottom:10}}>Three answers make the TDEE range much tighter on days you don't log.</div>
        <div style={{fontSize:12,fontWeight:600,color:C.t2,marginBottom:4}}>When you don't log food, it's usually…</div>
        <div style={{display:"flex",gap:6,marginBottom:10}}>
          <button style={btn(tc.unloggedIs==="normal")} onClick={()=>saveCal({unloggedIs:"normal"})}>A normal day</button>
          <button style={btn(tc.unloggedIs==="blowup")} onClick={()=>saveCal({unloggedIs:"blowup"})}>A blow-up</button>
          <button style={btn(tc.unloggedIs==="mixed")} onClick={()=>saveCal({unloggedIs:"mixed"})}>Weekends blow up</button>
        </div>
        {(tc.unloggedIs==="blowup"||tc.unloggedIs==="mixed")&&(<>
          <div style={{fontSize:12,fontWeight:600,color:C.t2,marginBottom:4}}>Typical blow-up day total (food + drinks)</div>
          <div style={{display:"flex",gap:6,marginBottom:10}}>
            {[2500,3000,3500,4000].map(v=>(
              <button key={v} style={btn((tc.socialCal||3000)===v)} onClick={()=>saveCal({socialCal:v})}>{v.toLocaleString()}</button>
            ))}
          </div>
        </>)}
        <div style={{fontSize:12,fontWeight:600,color:C.t2,marginBottom:4}}>Does the Wednesday fast ever slip?</div>
        <div style={{display:"flex",gap:6}}>
          <button style={btn(tc.fastSlips===false)} onClick={()=>saveCal({fastSlips:false})}>Holds</button>
          <button style={btn(tc.fastSlips===true)} onClick={()=>saveCal({fastSlips:true})}>Sometimes slips</button>
        </div>
        {tc.answered&&<div style={{fontSize:11,color:C.g,marginTop:8}}>Calibrated · the TDEE estimate now uses these answers.</div>}
      </X>);
    })()}

    {(data.coachLog||[]).length>0&&(
      <S title="Coach changes" collapsible defaultOpen={false}>
        <X style={{padding:"4px 12px"}}>
          {(data.coachLog||[]).slice(0,12).map((c,i)=>(
            <div key={c.id||i} style={{padding:"8px 0",borderTop:i>0?`1px solid ${C.bl}`:"none"}}>
              <div style={{display:"flex",justifyContent:"space-between",gap:8}}>
                <span style={{fontSize:13,fontWeight:700,color:c.applied?C.t:C.r}}>{c.summary||`${c.type}${c.action?` · ${c.action}`:""}`}</span>
                <span style={{fontSize:10,fontWeight:700,color:C.t3,fontFamily:FD,whiteSpace:"nowrap"}}>{c.at?fmt(String(c.at).slice(0,10)).toUpperCase():""}</span>
              </div>
              {c.reason&&<div style={{fontSize:12,color:C.t2,marginTop:2}}>{c.reason}</div>}
            </div>))}
        </X>
      </S>
    )}
    <X>
      <div style={{fontSize:14,fontWeight:700,color:C.t,marginBottom:8}}>Data</div>
      <div style={{display:"flex",gap:6}}>
        <B full outline onClick={exportData}>Export Data (JSON)</B>
      </div>
      <div style={{fontSize:11,color:C.t3,marginTop:6}}>Download all your health data as a JSON file for backup.</div>
      <S title="Admin data tools" collapsible defaultOpen={false}>
        {showReset&&<ConfirmModal title="Erase everything?" message="Every table on this phone and in Supabase is wiped. There is no undo. Export first." confirmText="Erase all" confirmColor={C.r} onCancel={()=>setShowReset(false)} onConfirm={async()=>{setShowReset(false);const nd=bl();setData(nd);sv(nd);["dhub6_sb_outbox","dhub6_workout","dhub6_variant","dhub6_rest_timer","dhub6_mob_active","dhub6_coach_seen"].forEach(k=>{try{localStorage.removeItem(k);}catch{}});for(const[table]of LOAD_PLAN){await sb.deleteAll(table);}}}/>}
        <button type="button" onClick={()=>setShowReset(true)}
          style={{background:"none",border:"none",color:C.r,cursor:"pointer",fontSize:11,fontFamily:"inherit",marginTop:4,opacity:0.7,padding:"6px 0"}}>
          Reset All Data
        </button>
      </S>
    </X>

    <X>
      <div style={{fontSize:14,fontWeight:700,color:C.t,marginBottom:4}}>Program</div>
      <div style={{fontSize:13,color:C.t2}}>{PROG.name}</div>
      <div style={{fontSize:12,color:C.t3}}>Week {wkn(td())}/{PROG.weeks} · {fmt(PROG.start)} → {fmt(PROG.end)}</div>
      <div style={{fontSize:12,color:C.t3}}>~{PROG.startWeight} → under {PROG.targetWeight} lbs · Checkpoint week {PROG.checkpoint.week} ({fmt(PROG.checkpoint.date)})</div>
    </X>

    <div style={{textAlign:"center",padding:"12px 0",fontSize:11,color:C.t3,opacity:0.6,fontFamily:FD,letterSpacing:"0.06em"}}>HEALTH HUB · BUILD {APP_VERSION}{isStandalone()?" · INSTALLED":""}</div>
  </div>);
};

export { Settings };
