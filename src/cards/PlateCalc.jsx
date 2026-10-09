import { plateMath } from "../../lib/engine.mjs";
import { C, FD } from "../core/theme.js";

// ═══ PLATE CALCULATOR ═══
const PlateCalc=({weight})=>{
  const m=plateMath(weight);
  if(!m)return <div style={{fontSize:13,color:C.t3}}>Below the bar. Load nothing.</div>;
  return(<div>
    <div style={{fontSize:12,color:C.t2,marginBottom:8}}>{weight} lbs · 45 lb bar · per side</div>
    <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
      {m.perSide.length===0&&<span style={{fontSize:13,color:C.t3}}>Empty bar</span>}
      {m.perSide.map((p,i)=>{const big=p>=25;return <span key={i} style={{display:"inline-flex",alignItems:"center",justifyContent:"center",minWidth:big?52:40,height:big?52:40,borderRadius:8,background:p===45?C.t:p>=25?C.p:C.bg,color:p>=25?C.oa:C.t,border:`1px solid ${p>=25?"transparent":C.bd}`,fontFamily:FD,fontSize:big?16:13,fontWeight:800}}>{p}</span>;})}
    </div>
    {m.leftover>0&&<div style={{fontSize:11,color:C.t3,marginTop:8}}>{m.leftover} lbs per side does not load. Round to {Number(weight)-m.leftover*2}.</div>}
  </div>);
};

export { PlateCalc };
