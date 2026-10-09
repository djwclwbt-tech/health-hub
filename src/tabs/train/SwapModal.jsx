import { rrTxt } from "../../../lib/engine.mjs";
import { C } from "../../core/theme.js";
import { B } from "../../ui/atoms.jsx";
import { Sheet } from "../../ui/overlay.jsx";

// ═══ SWAP MODAL ═══
const SwapModal=({exName,slot,options,onSelect,onClose,getWeight})=>(
  <Sheet open onClose={onClose} title="Swap exercise">
      <div style={{fontSize:13,color:C.t3,marginBottom:6}}>Replacing: <span style={{color:C.t,fontWeight:600}}>{exName}</span></div>
      {slot&&<div style={{fontSize:12,color:C.v,background:C.vl,borderRadius:6,padding:"6px 8px",marginBottom:12}}>Plan slot stays: {slot.sets}×{rrTxt(slot.rr)} · rest {slot.rest}s. Progression is tracked separately for this rep range.</div>}
      {options.length===0&&<div style={{fontSize:13,color:C.t3,textAlign:"center",padding:"12px 0"}}>No plan-safe alternatives found for this lift.</div>}
      {options.map((opt,idx)=>{
        const lw=getWeight(opt,opt.sw,slot);
        const hasHistory=lw!==opt.sw;
        return(<button key={opt.id} onClick={()=>onSelect(opt)} style={{
          display:"block",width:"100%",textAlign:"left",background:idx===0?C.pl:"transparent",
          border:`1px solid ${idx===0?C.p:C.bd}`,borderRadius:6,padding:"12px 14px",marginBottom:8,
          cursor:"pointer",fontFamily:"inherit"}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}>
            <div style={{fontSize:14,fontWeight:700,color:C.t}}>{opt.name}</div>
            {idx===0&&<span style={{fontSize:10,fontWeight:800,color:C.p,background:C.cd,borderRadius:8,padding:"2px 6px"}}>BEST FIT</span>}
          </div>
          <div style={{fontSize:12,color:hasHistory?C.p:C.t3,marginTop:2}}>
            {hasHistory?`This slot: ${lw} ${opt.unit}`:opt.sw>0?`Start: ${opt.sw} ${opt.unit}`:"Bodyweight"} · {opt.region}
          </div>
          <div style={{fontSize:11,color:C.t2,marginTop:3,fontStyle:"italic"}}>{opt.cue}</div>
        </button>);
      })}
      <B full outline onClick={onClose} style={{marginTop:4}}>Cancel</B>
  </Sheet>
);

export { SwapModal };
