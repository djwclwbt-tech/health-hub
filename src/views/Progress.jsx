const { useState, useEffect, useRef, useCallback } = React;
import { PROG, td, fmt, wkn } from "../../lib/engine.mjs";
import { sv, svSB } from "../core/storage.js";
import { C, FD } from "../core/theme.js";
import { L, N, S, X } from "../ui/atoms.jsx";
import { AnalysisSection } from "./Analysis.jsx";

// ═══ PROGRESS · photos, measurements, weekly AI analysis (mock 6c) ═══
const ProgressView=({data,setData,onBack})=>{
  const t=td();
  const fileRef=useRef(null);
  const [pendingSlot,setPendingSlot]=useState(null);
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState("");
  const slots=data.photoSlots||{};
  const SLOTS=["front","side","back"];
  const daysAgo=d=>d?Math.round((new Date(t+"T12:00:00")-new Date(d+"T12:00:00"))/864e5):null;
  const takePhoto=(slot)=>{setPendingSlot(slot);setErr("");if(fileRef.current)fileRef.current.click();};
  const onFile=async(e)=>{
    const file=e.target.files?.[0];if(!file||!pendingSlot)return;
    setLoading(true);
    try{
      const reader=new FileReader();
      const base64=await new Promise((resolve)=>{reader.onload=()=>resolve(reader.result);reader.readAsDataURL(file);});
      const [header,dataStr]=base64.split(",");
      const mediaType=header.match(/data:(.*?);/)?.[1]||"image/jpeg";
      const prevEntries=Object.entries(data.bodyComp||{}).filter(([d,v])=>d!==t&&v&&typeof v==="object"&&v.analysis).sort((a,b)=>b[0].localeCompare(a[0]));
      const prev=prevEntries[0];
      const context={currentWeight:data.wt[t]||Object.entries(data.wt).sort((a,b)=>b[0].localeCompare(a[0]))[0]?.[1]};
      if(prev){context.previousAssessment=prev[1].analysis;context.previousDate=prev[0];}
      const resp=await fetch("/api/bodycomp",{method:"POST",headers:{"Content-Type":"application/json","x-sync-token":data.settings?.syncToken||""},body:JSON.stringify({image:{mediaType,data:dataStr},context})});
      const result=await resp.json();
      if(resp.ok){
        // The analysis takes seconds; build on the latest state so entries logged meanwhile survive.
        setData(p=>{const nd={...p,bodyComp:{...p.bodyComp,[t]:{photoTaken:true,analysis:result}},photoSlots:{...(p.photoSlots||{}),[pendingSlot]:t}};sv(nd);return nd;});
        svSB.bodyComp(t,{analysis:result});
      }else setErr(result.error||"Analysis failed");
    }catch(e2){setErr(e2.message);}
    setLoading(false);setPendingSlot(null);if(fileRef.current)fileRef.current.value="";
  };
  const baseMeas=(()=>{const e=Object.entries(data.bodyMeas||{}).filter(([_,v])=>v&&Object.values(v).some(x=>x)).sort((a,b)=>a[0].localeCompare(b[0]));return e.find(([d])=>d>=PROG.start)||e[0]||null;})();
  const curMeas=(()=>{const e=Object.entries(data.bodyMeas||{}).filter(([_,v])=>v&&Object.values(v).some(x=>x)).sort((a,b)=>b[0].localeCompare(a[0]));return e[0]||null;})();
  const arm=m=>m?((m.armL&&m.armR)?(m.armL+m.armR)/2:(m.armL||m.armR||null)):null;
  const MEAS=[{l:"WAIST",cur:curMeas?.[1]?.waist,base:baseMeas?.[1]?.waist,goodDown:true},{l:"CHEST",cur:curMeas?.[1]?.chest,base:baseMeas?.[1]?.chest,goodDown:false},{l:"ARM",cur:arm(curMeas?.[1]),base:arm(baseMeas?.[1]),goodDown:false}];
  const measLine=(()=>{
    const w=MEAS[0],a=MEAS[2];
    if(w.cur==null||w.base==null)return "Log measurements every 2 weeks to see the trend.";
    const wd=w.cur-w.base;const ad=a.cur!=null&&a.base!=null?a.cur-a.base:null;
    if(wd<0&&(ad==null||ad>=-0.2))return "Waist down, arm holding. Fat is leaving. Muscle is not.";
    if(wd<0)return "Waist down. Watch the arm number, protein protects it.";
    return "Waist is holding. The trend chart decides, not one tape day.";
  })();
  const shortDate=d=>fmt(d).toUpperCase().replace(/^[A-Z]+, /,"");
  return(<div style={{display:"flex",flexDirection:"column",gap:10}}>
    <button onClick={onBack} style={{background:"none",border:"none",color:C.p,cursor:"pointer",fontSize:14,fontWeight:700,textAlign:"left",padding:0,fontFamily:"inherit"}}>← Setup</button>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
      <div>
        <div style={{fontSize:26,fontWeight:800,color:C.t,fontFamily:FD,textTransform:"uppercase",letterSpacing:"0.03em",lineHeight:1}}>Progress</div>
        <div style={{fontSize:12,color:C.t3,fontWeight:600,marginTop:3}}>Week {wkn(t)} of {PROG.weeks} · photos every 2 weeks</div>
      </div>
      <button onClick={()=>takePhoto(SLOTS.find(s=>!slots[s]||daysAgo(slots[s])>=14)||"front")} disabled={loading} style={{border:"none",background:C.p,color:C.oa,borderRadius:8,padding:"11px 14px",fontFamily:FD,fontSize:13,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",cursor:"pointer",minHeight:44,opacity:loading?0.5:1}}>{loading?"Analyzing…":"New photos"}</button>
    </div>
    <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{display:"none"}}/>
    {err&&<div style={{fontSize:12,color:C.r}}>{err}</div>}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7}}>
      {SLOTS.map(s=>{const d=slots[s];const due=!d||daysAgo(d)>=14;return(
        <button key={s} onClick={()=>takePhoto(s)} style={{aspectRatio:"3/4",border:due?`1px dashed ${C.p}`:"none",background:due?C.pl:C.bl,borderRadius:10,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,cursor:"pointer"}}>
          <span style={{fontSize:15,fontWeight:800,fontFamily:FD,color:due?C.p:C.t3}}>{due?"DUE":s.toUpperCase()}</span>
          <span style={{fontSize:10,fontWeight:700,fontFamily:FD,color:due?C.p:C.t3}}>{due?(d?"RETAKE":"TODAY"):shortDate(d)}</span>
        </button>);})}
    </div>
    <X style={{padding:"14px 16px"}}>
      <div style={{fontSize:10,fontWeight:700,color:C.t3,letterSpacing:"0.14em",fontFamily:FD}}>MEASUREMENTS{baseMeas?` · VS ${shortDate(baseMeas[0])}`:""}</div>
      {curMeas?(<React.Fragment>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7,marginTop:10}}>
          {MEAS.map(m=>{const d=m.cur!=null&&m.base!=null?m.cur-m.base:null;const good=d!=null&&(m.goodDown?d<0:d>0);return(
            <div key={m.l} style={{background:C.bg,borderRadius:8,padding:"9px 6px",textAlign:"center"}}>
              <div style={{fontSize:17,fontWeight:800,fontFamily:FD,color:C.t}}>{m.cur!=null?`${m.cur.toFixed(1)}"`:"○"}</div>
              <div style={{fontSize:8.5,fontWeight:700,letterSpacing:"0.06em",fontFamily:FD,color:good?C.g:C.t3}}>{m.l}{d!=null?` ${d>0?"+":""}${d.toFixed(1)}`:""}</div>
            </div>);})}
        </div>
        <div style={{fontSize:11.5,lineHeight:1.5,color:C.t3,marginTop:9}}>{measLine}</div>
      </React.Fragment>):(<div style={{fontSize:12,color:C.t3,marginTop:8}}>No measurements yet. Log the first set below.</div>)}
      <S title="Update measurements" collapsible defaultOpen={false}>
        {(()=>{
          const cur=data.bodyMeas&&data.bodyMeas[t]||{};
          const fields=[{k:"chest",l:"Chest"},{k:"waist",l:"Waist"},{k:"armL",l:"Left Arm"},{k:"armR",l:"Right Arm"},{k:"thighL",l:"Left Thigh"},{k:"thighR",l:"Right Thigh"}];
          const saveMeas=(k,v)=>{const nd={...data,bodyMeas:{...data.bodyMeas,[t]:{...(data.bodyMeas[t]||{}),[k]:v?parseFloat(v):null}}};setData(nd);sv(nd);svSB.bodyMeas(t,nd.bodyMeas[t]);};
          return(<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {fields.map(fd=>(<div key={fd.k}><L>{fd.l}</L><N value={cur[fd.k]||""} onChange={v=>saveMeas(fd.k,v)} placeholder="in"/></div>))}
          </div>);
        })()}
      </S>
    </X>
    <X style={{padding:"14px 16px"}}>
      <div style={{fontSize:10,fontWeight:700,color:C.p,letterSpacing:"0.14em",fontFamily:FD}}>WEEK {wkn(t)} AI ANALYSIS</div>
      <AnalysisSection data={data}/>
    </X>
  </div>);
};

export { ProgressView };
