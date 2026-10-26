const { useState, useEffect, useRef } = React;
import { applyChanges } from "../../lib/engine.mjs";
import { sv, svSB } from "../core/storage.js";
import { C } from "../core/theme.js";

// ═══ COACH CHAT ═══ Talk to the Coach (api/coach-chat.js): same persona as Claude.ai, same
// live numbers. Proposed changes show an Apply button; applying runs the engine's
// applyChanges here, syncs, and leaves a dated row under Coach and phone changes.
const KEY="dhub6_coach_chat";
const load=()=>{try{return JSON.parse(localStorage.getItem(KEY))||[];}catch{return[];}};
const save=m=>{try{localStorage.setItem(KEY,JSON.stringify(m.slice(-40)));}catch{}};
const STARTERS=["What should I focus on this week?","Am I on track for Nov 29?","Why is rest different on each day?","How should today's lift go?"];

const CoachChat=({data,setData,addToast})=>{
  const [msgs,setMsgs]=useState(load);
  const [text,setText]=useState("");
  const [busy,setBusy]=useState(false);
  const [err,setErr]=useState("");
  const endRef=useRef(null);
  useEffect(()=>{save(msgs);endRef.current?.scrollIntoView({block:"end"});},[msgs,busy]);

  const send=async(q)=>{
    const ask=(q??text).trim();if(!ask||busy)return;
    const next=[...msgs,{role:"user",content:ask}];setMsgs(next);setText("");setBusy(true);setErr("");
    try{
      const r=await fetch("/api/coach-chat",{method:"POST",headers:{"Content-Type":"application/json","x-sync-token":data.settings?.syncToken||""},
        body:JSON.stringify({messages:next.map(m=>({role:m.role,content:m.content}))})});
      const d=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(d.error||"The Coach is unavailable right now.");
      setMsgs([...next,{role:"assistant",content:d.reply||"",proposals:(d.proposals||[]).filter(p=>p.ok)}]);
    }catch(e){setErr(e.message||"The Coach is unavailable right now.");}
    setBusy(false);
  };

  const apply=(mi,pi)=>{
    const p=msgs[mi].proposals[pi];
    const r=applyChanges([p.change],{settings:data.settings,program:data.program});
    if(!r.applied.length){addToast?.(r.rejected[0]?.error||"Could not apply that change","error");return;}
    const at=new Date().toISOString();
    const nd={...data,settings:r.settings,program:r.program,coachLog:[{type:p.change.type,action:p.change.action||null,payload:p.change,summary:r.applied[0],reason:"Agreed with the Coach in chat",applied:true,source:"coach-chat",at},...(data.coachLog||[])]};
    setData(nd);sv(nd);
    if(p.change.type==="settings")svSB.settings(nd.settings);else svSB.program(nd.program);
    svSB.audit(p.change,{reason:"Agreed with the Coach in chat",source:"coach-chat",summary:r.applied[0]});
    setMsgs(msgs.map((m,i)=>i!==mi?m:{...m,proposals:m.proposals.map((x,j)=>j!==pi?x:{...x,applied:true})}));
    addToast?.(`Applied: ${r.applied[0]}`,"success");
  };

  return(<div>
    <div style={{fontSize:15,color:C.t3,lineHeight:1.45,marginBottom:12}}>Knows your program, today's numbers and why each day is built the way it is. Changes only happen when you tap Apply.</div>
    {msgs.length===0&&<div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
      {STARTERS.map(s=><button key={s} type="button" onClick={()=>send(s)} style={{minHeight:44,textAlign:"left",padding:"10px 12px",border:`1px solid ${C.bd}`,borderRadius:9,background:C.cd,color:C.t,fontSize:16,cursor:"pointer"}}>{s}</button>)}
    </div>}
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {msgs.map((m,mi)=>m.role==="user"
        ?<div key={mi} style={{alignSelf:"flex-end",maxWidth:"85%",background:C.bg,border:`1px solid ${C.bd}`,borderRadius:12,padding:"9px 12px",fontSize:16,color:C.t,whiteSpace:"pre-wrap"}}>{m.content}</div>
        :<div key={mi} style={{fontSize:16,color:C.t,lineHeight:1.5,whiteSpace:"pre-wrap"}}>
          {m.content}
          {(m.proposals||[]).map((p,pi)=><div key={pi} style={{marginTop:10,border:`1px solid ${C.bd}`,borderRadius:12,padding:12,display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
            <span style={{fontSize:15,color:C.t2}}>{p.summary}</span>
            {p.applied?<span style={{fontSize:15,color:C.g,whiteSpace:"nowrap"}}>Applied</span>
              :<button type="button" onClick={()=>apply(mi,pi)} style={{minHeight:44,minWidth:72,border:`1px solid ${C.t}`,borderRadius:8,background:C.cd,color:C.t,fontSize:16,fontWeight:500,cursor:"pointer"}}>Apply</button>}
          </div>)}
        </div>)}
      {busy&&<div style={{fontSize:15,color:C.t3}}>The Coach is thinking. This takes about 20 seconds.</div>}
      {err&&<div style={{fontSize:15,color:C.r}}>{err}</div>}
      <div ref={endRef}/>
    </div>
    <div style={{display:"flex",gap:8,marginTop:14,alignItems:"flex-end"}}>
      <textarea value={text} onChange={e=>setText(e.target.value)} rows={2} placeholder="Ask the Coach" aria-label="Message to the Coach"
        style={{flex:1,minHeight:48,maxHeight:140,resize:"none",border:`1px solid ${C.bd}`,borderRadius:9,padding:"10px 12px",fontSize:16,background:C.cd,color:C.t,fontFamily:"inherit"}}/>
      <button type="button" onClick={()=>send()} disabled={busy||!text.trim()} style={{minHeight:48,minWidth:72,border:"none",borderRadius:9,background:busy||!text.trim()?C.bl:C.p,color:busy||!text.trim()?C.t3:C.oa,fontSize:17,fontWeight:500,cursor:"pointer"}}>Send</button>
    </div>
    {msgs.length>0&&<div style={{textAlign:"center",marginTop:8}}><button type="button" onClick={()=>{setMsgs([]);setErr("");}} style={{background:"none",border:"none",color:C.t3,fontSize:15,minHeight:44,cursor:"pointer"}}>Start a new conversation</button></div>}
  </div>);
};

export { CoachChat };
