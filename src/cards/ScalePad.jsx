import { haptic } from "../core/device.js";
import { C, FD } from "../core/theme.js";
import { X } from "../ui/atoms.jsx";

// ═══ SCALE PAD · shared by the Scale tab and the morning moment ═══
const ScalePad=({value,onChange,onLog,hint,todayLogged,yesterdayWt,compact=false})=>{
  const ok=!!value&&Number(value)>80&&Number(value)<500;
  return(<X style={{padding:compact?"14px 14px 12px":"18px 16px",textAlign:"center",boxShadow:C.sh2}}>
    <div style={{fontSize:10,fontWeight:700,color:C.t3,letterSpacing:"0.14em",fontFamily:FD}}>{todayLogged!=null?`LOGGED ${Number(todayLogged).toFixed(1)} · LOG AGAIN TO CORRECT`:`TODAY${yesterdayWt?` · YESTERDAY ${Number(yesterdayWt).toFixed(1)}`:""}`}</div>
    <div style={{fontSize:compact?50:58,fontWeight:800,fontFamily:FD,lineHeight:1,marginTop:6,color:value?C.t:C.t3,fontVariantNumeric:"tabular-nums"}}>{value||(yesterdayWt?Number(yesterdayWt).toFixed(1):"185.0")}</div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginTop:12}}>
      {["1","2","3","4","5","6","7","8","9",".","0","⌫"].map(k=>(
        <button type="button" key={k} onClick={()=>{haptic(8);
          if(k==="⌫"){onChange(value.slice(0,-1));return;}
          if(k==="."&&value.includes("."))return;
          if(value.replace(".","").length>=4)return;
          onChange(value+k);
        }} style={{minHeight:compact?44:48,border:`1px solid ${C.bd}`,borderRadius:8,background:C.bg,fontSize:k==="⌫"?17:19,fontWeight:700,color:k==="⌫"?C.t3:C.t,cursor:"pointer",fontFamily:"'Barlow',sans-serif"}}>{k}</button>
      ))}
    </div>
    <button type="button" onClick={onLog} disabled={!ok} style={{width:"100%",marginTop:8,minHeight:52,border:"none",borderRadius:9,background:C.p,opacity:ok?1:0.4,color:C.oa,fontFamily:FD,fontSize:17,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.08em",cursor:"pointer"}}>{value?`Log ${value}`:"Log weight"}</button>
    {hint&&<div style={{fontSize:11,color:C.t3,marginTop:8}}>{hint}</div>}
  </X>);
};

export { ScalePad };
