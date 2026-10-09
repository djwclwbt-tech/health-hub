const { useState, useEffect, useRef, useCallback } = React;
import { C, FD } from "../core/theme.js";

// ═══ BASE COMPONENTS ═══
const N=({value,onChange,placeholder,style={},min=0,max})=>{
  const handleChange=(e)=>{
    const v=e.target.value;
    if(v===""||v==="."){onChange(v);return;}
    const num=parseFloat(v);
    if(isNaN(num))return;
    if(num<min)return;
    if(max!==undefined&&num>max)return;
    onChange(v);
  };
  return(
  <input type="text" inputMode="decimal" pattern="[0-9.]*" value={value} onChange={handleChange}
    placeholder={placeholder} style={{background:C.cd,border:`1px solid ${C.bd}`,borderRadius:6,padding:"10px 10px",
    color:C.t,fontSize:16,fontWeight:700,width:"100%",boxSizing:"border-box",outline:"none",textAlign:"center",fontFamily:FD,...style}}/>
);};
const T=({value,onChange,placeholder,style={}})=>(
  <input type="text" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
    style={{background:C.cd,border:`1px solid ${C.bd}`,borderRadius:6,padding:"10px 10px",color:C.t,
    fontSize:14,width:"100%",boxSizing:"border-box",outline:"none",fontFamily:"inherit",...style}}/>
);
const B=({children,onClick,color,disabled,full,small,outline,style={}})=>(
  // Filled = accent (or explicit color). Outline with no explicit color =
  // neutral graphite · secondary actions carry no color of their own.
  <button type="button" onClick={onClick} disabled={disabled} style={{
    background:outline?"transparent":(color||C.p),color:outline?(color||C.t):C.oa,
    border:outline?`1px solid ${color||C.bd}`:"none",borderRadius:9,
    padding:small?"8px 14px":"12px 20px",fontSize:small?13:15,fontWeight:700,fontFamily:FD,textTransform:"uppercase",letterSpacing:"0.05em",
    cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.4:1,boxShadow:outline?"none":C.sh2,
    width:full?"100%":"auto",minHeight:44,...style,
  }}>{children}</button>
);
const X=({children,style={},...p})=>(
  <div style={{background:C.cd,borderRadius:12,padding:16,border:`1px solid ${C.bd}`,boxShadow:C.sh2,...style}} {...p}>{children}</div>
);
const L=({children})=><div style={{fontSize:11,fontWeight:600,color:C.t3,letterSpacing:"0.06em",marginBottom:4}}>{children}</div>;
const S=({title,children,collapsible,defaultOpen=true})=>{
  // Collapsible sections really collapse (tap to expand) · "buried" surfaces
  // like photos/measurements stay reachable instead of being hidden entirely.
  const [open,setOpen]=useState(!collapsible||defaultOpen);
  return(<div style={{marginTop:6}}>
    <div onClick={collapsible?()=>setOpen(o=>!o):undefined}
      style={{fontSize:11,fontWeight:700,color:C.t3,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6,borderBottom:`1px solid ${C.bl}`,paddingBottom:4,display:"flex",justifyContent:"space-between",alignItems:"center",cursor:collapsible?"pointer":"default"}}>
      <span>{title}</span>
      {collapsible&&<span style={{fontSize:10}}>{open?"▴":"▾"}</span>}
    </div>
    {open&&children}
  </div>);
};
const Br=({v,max,color=C.p,h=5})=>(
  <div style={{height:h,background:C.bl,borderRadius:6,overflow:"hidden"}}>
    <div style={{width:`${Math.min(100,(v/(max||1))*100)}%`,height:"100%",background:color,borderRadius:6,transition:"width 0.3s"}}/>
  </div>
);

const Ch=({data,color=C.p,height=52,label,yUnit="",empty})=>{
  if(!data||data.length<2){
    if(!empty)return null;
    return(<X style={{padding:"10px 14px"}}>{label&&<div style={{fontSize:11,fontWeight:600,color:C.t3,letterSpacing:"0.06em",marginBottom:4}}>{label}</div>}
      <div style={{height,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <span style={{fontSize:13,color:C.t3}}>{empty}</span>
      </div></X>);
  }
  const vals=data.map(d=>d.v),mn=Math.min(...vals),mx=Math.max(...vals),rng=mx-mn||1,pad=rng*0.12;
  const w=data.length*32,h=height;
  const pts=data.map((d,i)=>[i*(w/(data.length-1)),h-6-((d.v-(mn-pad))/(rng+pad*2))*(h-16)]);
  const line=pts.map(p=>p.join(",")).join(" ");
  const gid="g"+String(label||color).replace(/[^a-z0-9]/gi,"");
  return(
    <X style={{padding:"10px 14px"}}>
      {label&&<div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
        <span style={{fontSize:11,fontWeight:600,color:C.t3,letterSpacing:"0.06em"}}>{label}</span>
        <span style={{fontSize:13,fontWeight:700,color}}>{vals[vals.length-1]}{yUnit}</span>
      </div>}
      <svg viewBox={`0 0 ${w} ${h}`} style={{width:"100%",height}} preserveAspectRatio="none">
        <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.08"/><stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient></defs>
        <polygon points={`0,${h} ${line} ${w},${h}`} fill={`url(#${gid})`}/>
        <polyline points={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        {pts.map((p,i)=><circle key={i} cx={p[0]} cy={p[1]} r="2" fill={C.cd} stroke={color} strokeWidth="1.5"/>)}
      </svg>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:C.t3,marginTop:2}}>
        <span>{data[0].d||""}</span><span>{data[data.length-1].d||""}</span>
      </div>
    </X>
  );
};

// ═══ EDITABLE NUMBER · tap the big number to type it ═══
const EditableNum=({value,onCommit,color,fontSize=34,min=0,label})=>{
  const [edit,setEdit]=useState(false);const [v,setV]=useState("");
  const ref=useRef(null);
  useEffect(()=>{if(edit&&ref.current){ref.current.focus();ref.current.select();}},[edit]);
  const commit=()=>{setEdit(false);const n=parseFloat(v);if(!isNaN(n)&&n>=min)onCommit(n);};
  if(edit)return <input ref={ref} type="text" inputMode="decimal" value={v} onChange={e=>setV(e.target.value.replace(/[^0-9.]/g,""))} onBlur={commit} onKeyDown={e=>{if(e.key==="Enter")commit();if(e.key==="Escape")setEdit(false);}} aria-label={label} style={{width:96,fontSize,fontWeight:800,fontFamily:FD,color,textAlign:"center",border:"none",borderBottom:`2px solid ${C.p}`,background:"transparent",outline:"none",padding:0,fontVariantNumeric:"tabular-nums"}}/>;
  return <button type="button" onClick={()=>{setV(String(value));setEdit(true);}} aria-label={`${label}: ${value}. Tap to type`} style={{background:"transparent",border:"none",fontSize,fontWeight:800,color,fontFamily:FD,fontVariantNumeric:"tabular-nums",padding:"0 6px",minHeight:44,cursor:"text",lineHeight:1}}>{value}</button>;
};

export { N, T, B, X, L, S, Br, Ch, EditableNum };
