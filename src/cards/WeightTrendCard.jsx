import { PROG, td } from "../../lib/engine.mjs";
import { C, FD } from "../core/theme.js";
import { X } from "../ui/atoms.jsx";

// CUT TRAJECTORY card · mock 1g. Dotted raw weigh-ins, solid EWMA trend (ember),
// dashed projection to PROG.targetWeight at the current getTrend() rate, goal line,
// checkpoint marker, pace verdict. Same getTrend() engine · presentation only.
const WeightTrendCard=({trend,compact=false,tdee=null})=>{
  if(!trend)return null;
  const goal=PROG.targetWeight,rate=trend.rate,pts=trend.points,lastP=pts[pts.length-1],cur=lastP.v;
  const wkNum=Math.max(1,Math.min(PROG.weeks,Math.floor((new Date(td()+"T12:00:00")-new Date(PROG.start+"T12:00:00"))/6048e5)+1));
  const toGo=Math.max(0,+(cur-goal).toFixed(1));
  const daysToGoal=rate<-0.05&&cur>goal?(cur-goal)/(-rate)*7:null;
  const projDate=daysToGoal!=null&&daysToGoal<=180?(()=>{const d=new Date(td()+"T12:00:00");d.setDate(d.getDate()+Math.round(daysToGoal));return d;})():null;
  const projLabel=projDate?projDate.toLocaleDateString("en-US",{month:"short",day:"numeric"}).toUpperCase():"○";
  const dLbl=ds=>new Date(ds+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"}).toUpperCase();
  const dteEnd=(new Date(PROG.end+"T12:00:00")-new Date(td()+"T12:00:00"))/864e5;
  const wtEnd=rate<-0.05&&dteEnd>0?Math.max(goal,+(cur+rate*(dteEnd/7)).toFixed(1)):null;
  const st=rate>=0.1?{txt:`OFF PACE · +${rate.toFixed(1)} LB/WK`,c:C.r}
    :rate<=-2?{txt:`FAST · −${Math.abs(rate).toFixed(1)} LB/WK`,c:C.t2}
    :rate<=-0.6?{txt:`ON PACE · −${Math.abs(rate).toFixed(1)} LB/WK`,c:C.g}
    :rate<=-0.1?{txt:`SLOW · −${Math.abs(rate).toFixed(1)} LB/WK`,c:C.t2}
    :{txt:"HOLDING",c:C.t2};
  const yr=+td().slice(0,4);
  const dayOf=md=>{let d=new Date(`${yr}-${md}T12:00:00`);if(d-new Date(td()+"T12:00:00")>1728e5)d=new Date(`${yr-1}-${md}T12:00:00`);return d;};
  const d0=dayOf(pts[0].d),dx=p=>(dayOf(p.d)-d0)/864e5,lastX=dx(lastP);
  const endX=Math.max(lastX+10,Math.min(lastX+84,daysToGoal!=null?lastX+daysToGoal:lastX+28));
  const W=358,H=compact?96:120,padT=10,padB=10,padR=4;
  const gx=d=>d/endX*(W-padR);
  const vals=[...pts.map(p=>Number(p.raw)),...pts.map(p=>p.v),goal];
  const mn=Math.min(...vals)-0.6,mx=Math.max(...vals)+0.6;
  const gy=v=>padT+(mx-v)/(mx-mn)*(H-padT-padB);
  const rawLine=pts.map(p=>`${gx(dx(p)).toFixed(1)},${gy(Number(p.raw)).toFixed(1)}`).join(" ");
  const emaLine=pts.map(p=>`${gx(dx(p)).toFixed(1)},${gy(p.v).toFixed(1)}`).join(" ");
  const cx=gx(lastX),cy=gy(cur);
  const projY=daysToGoal!=null?(daysToGoal<=84?gy(goal):gy(cur+rate*((endX-lastX)/7))):null;
  const ckD=PROG.checkpoint?.date?(new Date(PROG.checkpoint.date+"T12:00:00")-d0)/864e5:null;
  const showCk=!compact&&ckD!=null&&ckD>0&&ckD<endX;
  const tagW=76,tagX=cx>W-tagW-14?cx-tagW-10:cx+10,tagY=Math.max(padT,Math.min(H-padB-16,cy-8));
  const delta=+(PROG.startWeight-cur).toFixed(1);
  return(
    <X style={{padding:"12px 14px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:8}}>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.14em",color:C.t3,fontFamily:FD,whiteSpace:"nowrap"}}>CUT TRAJECTORY · WK {wkNum}/{PROG.weeks}</div>
        <div style={{fontSize:12,fontWeight:700,color:compact?st.c:(wtEnd!=null?(wtEnd<=goal+0.75?C.g:C.t2):st.c),fontFamily:FD,letterSpacing:"0.04em",whiteSpace:"nowrap"}}>{compact?st.txt:(wtEnd!=null?`PROJECTED ${wtEnd.toFixed(1)} BY ${dLbl(PROG.end)}`:st.txt)}</div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:H,marginTop:8,display:"block"}}>
        <line x1="0" y1={gy(goal)} x2={W} y2={gy(goal)} stroke={C.g} strokeWidth="1.5" strokeDasharray="5,4" opacity="0.7"/>
        <text x="2" y={gy(goal)-4} fontFamily={FD} fontSize="10" fontWeight="800" fill={C.g}>GOAL {goal}</text>
        <text x="2" y={Math.max(padT+8,gy(pts[0].v)-6)} fontFamily={FD} fontSize="10" fontWeight="700" fill={C.t3}>{Math.round(pts[0].v)}</text>
        {showCk&&<line x1={gx(ckD)} y1={padT-4} x2={gx(ckD)} y2={H-padB+4} stroke={C.bd} strokeWidth="1"/>}
        {showCk&&<text x={gx(ckD)+4} y={padT+4} fontFamily={FD} fontSize="9" fontWeight="700" fill={C.t3}>{`CHECKPOINT ${dLbl(PROG.checkpoint.date)}${PROG.checkpoint.week===PROG.deload?" · DELOAD":""}`}</text>}
        <polyline points={rawLine} fill="none" stroke={C.bd} strokeWidth="1.5" strokeDasharray="2,3"/>
        <polyline points={emaLine} fill="none" stroke={C.p} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        {projY!=null&&<polyline points={`${cx},${cy} ${W-padR},${projY}`} fill="none" stroke={C.p} strokeWidth="1.5" strokeDasharray="5,4" opacity="0.55"/>}
        {!compact&&projY!=null&&daysToGoal!=null&&daysToGoal<=84&&(<g><rect x={W-92} y={Math.max(padT,projY-22)} width="88" height="15" rx="3" fill={C.gl}/><text x={W-48} y={Math.max(padT,projY-22)+11} textAnchor="middle" fontFamily={FD} fontSize="10" fontWeight="800" fill={C.g}>{projLabel} · {goal}</text></g>)}
        <circle cx={cx} cy={cy} r="4.5" fill={C.cd} stroke={C.p} strokeWidth="2.5"/>
        <rect x={tagX} y={tagY} width={tagW} height="16" rx="3" fill={C.t}/>
        <text x={tagX+tagW/2} y={tagY+11.5} textAnchor="middle" fontFamily={FD} fontSize="10" fontWeight="800" fill={C.oa}>{compact?`${cur.toFixed(1)} TODAY`:`${cur.toFixed(1)} · ${delta>=0?"−":"+"}${Math.abs(delta).toFixed(1)}`}</text>
      </svg>
      {!compact&&<div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:9,fontWeight:700,letterSpacing:"0.08em",color:C.t3,fontFamily:FD}}><span>{dLbl(PROG.start)} · {PROG.startWeight}</span><span>CHECKPOINT {dLbl(PROG.checkpoint.date)}</span><span>{dLbl(PROG.end)} · GOAL {goal}</span></div>}
      {compact&&<div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:11,fontWeight:700,color:C.t2,fontFamily:FD,letterSpacing:"0.04em"}}><span>{rate>0?"+":""}{rate.toFixed(1)} LB/WK</span><span>{toGo.toFixed(1)} LBS TO {goal}</span><span>GOAL BY {projLabel}</span></div>}
      {!compact&&<div style={{display:"flex",gap:7,marginTop:10}}>
        {[[rate.toFixed(1),"LB/WK PACE"],[toGo.toFixed(1),"LBS TO GO"],[`${trend.weighIns7}/7`,"WEIGH-INS"],tdee?[Math.round(tdee).toLocaleString(),"TDEE EST"]:[projLabel,"GOAL BY"]].map(([v,l])=>(
          <div key={l} style={{flex:1,background:C.bg,borderRadius:8,padding:"8px 4px",textAlign:"center"}}>
            <div style={{fontSize:18,fontWeight:800,color:C.t,fontFamily:FD}}>{v}</div>
            <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.06em",color:C.t3,fontFamily:FD}}>{l}</div>
          </div>))}
      </div>}
    </X>
  );
};

export { WeightTrendCard };
