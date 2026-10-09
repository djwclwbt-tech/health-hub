const { useState, useEffect, useRef, useCallback } = React;
import { PROG, DEFAULTS, lds, td, wkn } from "../../lib/engine.mjs";
import { C } from "../core/theme.js";
import { B, Br, X } from "../ui/atoms.jsx";

// ═══ ANALYSIS SECTION ═══
const AnalysisSection=({data})=>{
  const [range,setRange]=useState("7d");
  const [loading,setLoading]=useState(false);
  const [result,setResult]=useState(null);
  const [error,setError]=useState("");

  const runAnalysis=async()=>{
    setLoading(true);setResult(null);setError("");
    try{
      const days=range==="7d"?7:range==="14d"?14:30;
      const cutoff=new Date();cutoff.setDate(cutoff.getDate()-days);
      const cutStr=lds(cutoff);

      // Summarize data within range
      const wkEntries=Object.entries(data.wk||{}).filter(([d])=>d>=cutStr);
      const nutEntries=Object.entries(data.nut||{}).filter(([d])=>d>=cutStr);
      const recEntries=Object.entries(data.rec||{}).filter(([d])=>d>=cutStr);
      const wtEntries=Object.entries(data.wt||{}).filter(([d])=>d>=cutStr).sort((a,b)=>a[0].localeCompare(b[0]));
      const stepsEntries=Object.entries(data.steps||{}).filter(([d])=>d>=cutStr);
      const habitsEntries=Object.entries(data.habits||{}).filter(([d])=>d>=cutStr);
      const waterEntries=Object.entries(data.water||{}).filter(([d])=>d>=cutStr);

      // Nutrition averages
      const nutAvg=nutEntries.length?{
        cal:Math.round(nutEntries.reduce((s,[,n])=>s+(n.totalCal||0),0)/nutEntries.length),
        protein:Math.round(nutEntries.reduce((s,[,n])=>s+(n.totalProtein||0),0)/nutEntries.length),
        carbs:Math.round(nutEntries.reduce((s,[,n])=>s+(n.totalCarbs||0),0)/nutEntries.length),
        fat:Math.round(nutEntries.reduce((s,[,n])=>s+(n.totalFat||0),0)/nutEntries.length),
        fiber:Math.round(nutEntries.reduce((s,[,n])=>s+(n.totalFiber||0),0)/nutEntries.length),
        days:nutEntries.length,
      }:null;

      // Recovery averages
      const recWithScore=recEntries.filter(([,r])=>r.recoveryScore);
      const recAvg=recWithScore.length?{
        recovery:Math.round(recWithScore.reduce((s,[,r])=>s+r.recoveryScore,0)/recWithScore.length),
        hrv:Math.round(recEntries.filter(([,r])=>r.hrv).reduce((s,[,r])=>s+r.hrv,0)/(recEntries.filter(([,r])=>r.hrv).length||1)),
        rhr:Math.round(recEntries.filter(([,r])=>r.rhr).reduce((s,[,r])=>s+r.rhr,0)/(recEntries.filter(([,r])=>r.rhr).length||1)),
        sleep:+(recEntries.filter(([,r])=>r.sleepHours).reduce((s,[,r])=>s+r.sleepHours,0)/(recEntries.filter(([,r])=>r.sleepHours).length||1)).toFixed(1),
        days:recWithScore.length,
      }:null;

      // Weight trend
      const wtTrend=wtEntries.length>=2?{
        start:wtEntries[0][1],end:wtEntries[wtEntries.length-1][1],
        change:+(wtEntries[wtEntries.length-1][1]-wtEntries[0][1]).toFixed(1),
        entries:wtEntries.length,
      }:wtEntries.length===1?{current:wtEntries[0][1],entries:1}:null;

      // Steps avg
      const stepsAvg=stepsEntries.length?Math.round(stepsEntries.reduce((s,[,v])=>s+v,0)/stepsEntries.length):null;

      // Workout summary
      const wkSummary={count:wkEntries.length,days:wkEntries.map(([d,w])=>w.day),
        progressions:Object.entries(data.prog||{}).filter(([,p])=>p.lastDate&&p.lastDate>=cutStr&&p.progressed).length};

      // Habits summary
      const chLen=(data.settings.customHabits||[]).length;
      const habScores=habitsEntries.map(([,h])=>{if(!h)return null;
        let c=0;const tot=7+chLen;
        if(h.alcohol===false)c++;if(h.cannabis===false)c++;if(h.screensOff===true)c++;
        if(h.sunlight===true)c++;if(h.bedBy1030===true)c++;if(h.readBeforeBed===true)c++;if(h.supplements===true)c++;
        c+=Object.values(h.custom||{}).filter(v=>v).length;
        return c/tot;}).filter(v=>v!==null);
      const habAvg=habScores.length?Math.round(habScores.reduce((a,b)=>a+b,0)/habScores.length*100):null;

      // Water avg
      const waterAvg=waterEntries.length?Math.round(waterEntries.reduce((s,[,v])=>s+v,0)/waterEntries.length):null;

      // Body comp assessments in window
      const bcEntries=Object.entries(data.bodyComp||{}).filter(([d,v])=>d>=cutStr&&v&&typeof v==="object"&&v.analysis).sort((a,b)=>b[0].localeCompare(a[0]));

      const payload={
        range,days,
        workouts:wkSummary,
        nutrition:nutAvg,
        recovery:recAvg,
        weight:wtTrend,
        steps:stepsAvg,
        habits:habAvg,
        water:waterAvg,
        program:{name:PROG.name,week:wkn(td()),totalWeeks:PROG.weeks},
        targets:data.settings||DEFAULTS,
        bodyComp:bcEntries.length?{assessments:bcEntries.map(([d,v])=>({date:d,bfRange:v.analysis.bodyFatRange,muscleDev:v.analysis.muscleDevelopment,progress:v.analysis.areasOfProgress,focus:v.analysis.focusAreas,notes:v.analysis.notes})),count:bcEntries.length,lastPhotoDate:bcEntries[0][0],daysSincePhoto:Math.round((new Date()-new Date(bcEntries[0][0]+"T12:00:00"))/864e5)}:null,
      };

      const r=await fetch("/api/analyze",{method:"POST",headers:{"Content-Type":"application/json","x-sync-token":data.settings?.syncToken||""},body:JSON.stringify(payload)});
      const resp=await r.json();
      if(resp.error)throw new Error(resp.error);
      setResult(resp);
    }catch(e){setError(e.message||"Analysis failed. Check your connection and try again.");}
    setLoading(false);
  };

  const ScoreBar=({label,score,color})=>(
    <div style={{marginBottom:8}}>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:3}}>
        <span style={{color:C.t2,fontWeight:600}}>{label}</span>
        <span style={{color,fontWeight:700}}>{score}/100</span>
      </div>
      <Br v={score} max={100} color={color} h={6}/>
    </div>
  );

  const scoreColor=(s)=>s>=70?C.g:s>=45?C.t2:C.r;

  return(
    <div style={{marginTop:8,borderTop:`1px solid ${C.bl}`,paddingTop:10}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={{fontSize:14,fontWeight:700,color:C.t}}>AI Analysis</div>
        <div style={{display:"flex",gap:3}}>
          {["7d","14d","30d"].map(r=>(
            <button key={r} onClick={()=>setRange(r)} style={{
              padding:"5px 10px",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
              border:`1px solid ${range===r?C.p:C.bd}`,background:range===r?C.pl:"transparent",color:range===r?C.p:C.t3,
            }}>{r}</button>
          ))}
        </div>
      </div>

      <B full onClick={runAnalysis} disabled={loading} color={C.v} style={{marginBottom:8}}>
        {loading?"Analyzing...":"⚡ Run Analysis"}
      </B>

      {error&&<div style={{fontSize:13,color:C.r,padding:"8px 10px",background:C.rl,borderRadius:6,marginBottom:8}}>{error}</div>}

      {result&&(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {/* Scores */}
          {result.scores&&(
            <X style={{padding:12}}>
              <div style={{fontSize:12,fontWeight:700,color:C.t3,letterSpacing:"0.06em",marginBottom:10}}>Scores · Last {range}</div>
              {result.scores.overall!=null&&<ScoreBar label="Overall" score={result.scores.overall} color={scoreColor(result.scores.overall)}/>}
              {result.scores.training!=null&&<ScoreBar label="Training" score={result.scores.training} color={scoreColor(result.scores.training)}/>}
              {result.scores.nutrition!=null&&<ScoreBar label="Nutrition" score={result.scores.nutrition} color={scoreColor(result.scores.nutrition)}/>}
              {result.scores.recovery!=null&&<ScoreBar label="Recovery" score={result.scores.recovery} color={scoreColor(result.scores.recovery)}/>}
              {result.scores.habits!=null&&<ScoreBar label="Habits" score={result.scores.habits} color={scoreColor(result.scores.habits)}/>}
            </X>
          )}

          {/* Summary */}
          {result.summary&&(
            <X style={{padding:12,borderLeft:`3px solid ${C.bd}`}}>
              <div style={{fontSize:13,color:C.t,lineHeight:1.6}}>{result.summary}</div>
            </X>
          )}

          {/* Wins & Gaps */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
            {result.wins&&result.wins.length>0&&(
              <X style={{padding:10,borderTop:`3px solid ${C.g}`}}>
                <div style={{fontSize:11,fontWeight:700,color:C.g,letterSpacing:"0.06em",marginBottom:6}}>Wins</div>
                {result.wins.map((w,i)=>(
                  <div key={i} style={{fontSize:12,color:C.t2,marginBottom:4,paddingLeft:8,borderLeft:`2px solid ${C.gl}`}}>{w}</div>
                ))}
              </X>
            )}
            {result.gaps&&result.gaps.length>0&&(
              <X style={{padding:10,borderTop:`3px solid ${C.r}`}}>
                <div style={{fontSize:11,fontWeight:700,color:C.r,letterSpacing:"0.06em",marginBottom:6}}>Gaps</div>
                {result.gaps.map((g,i)=>(
                  <div key={i} style={{fontSize:12,color:C.t2,marginBottom:4,paddingLeft:8,borderLeft:`2px solid ${C.rl}`}}>{g}</div>
                ))}
              </X>
            )}
          </div>

          {/* Trends */}
          {result.trends&&result.trends.length>0&&(
            <X style={{padding:10}}>
              <div style={{fontSize:11,fontWeight:700,color:C.t3,letterSpacing:"0.06em",marginBottom:6}}>Trends</div>
              {result.trends.map((t,i)=>(
                <div key={i} style={{fontSize:13,color:C.t2,marginBottom:5,display:"flex",gap:6,alignItems:"flex-start"}}>
                  <span style={{color:C.t3,fontWeight:700,minWidth:14}}>→</span>
                  <span>{t}</span>
                </div>
              ))}
            </X>
          )}

          {/* Correlations */}
          {result.correlations&&result.correlations.length>0&&(
            <X style={{padding:10}}>
              <div style={{fontSize:11,fontWeight:700,color:C.t3,letterSpacing:"0.06em",marginBottom:6}}>Correlations</div>
              {result.correlations.map((c,i)=>(
                <div key={i} style={{fontSize:13,color:C.t2,marginBottom:5,display:"flex",gap:6,alignItems:"flex-start"}}>
                  <span style={{color:C.v,fontWeight:700,minWidth:14}}>↔</span>
                  <span>{c}</span>
                </div>
              ))}
            </X>
          )}

          {/* Recommendations */}
          {result.recommendations&&result.recommendations.length>0&&(
            <X style={{padding:10,borderLeft:`3px solid ${C.bd}`}}>
              <div style={{fontSize:11,fontWeight:700,color:C.p,letterSpacing:"0.06em",marginBottom:6}}>Recommendations</div>
              {result.recommendations.map((r,i)=>(
                <div key={i} style={{fontSize:13,color:C.t,marginBottom:6,paddingBottom:6,borderBottom:i<result.recommendations.length-1?`1px solid ${C.bl}`:"none"}}>
                  <span style={{fontWeight:700,color:C.p}}>{i+1}. </span>{r}
                </div>
              ))}
            </X>
          )}

          {/* Next Week Focus */}
          {result.nextWeekFocus&&(
            <X style={{padding:12,background:C.pl,border:`1px solid ${C.p}`}}>
              <div style={{fontSize:11,fontWeight:700,color:C.p,letterSpacing:"0.06em",marginBottom:4}}>Next Week Focus</div>
              <div style={{fontSize:14,color:C.t,fontWeight:600,lineHeight:1.5}}>{result.nextWeekFocus}</div>
            </X>
          )}

          {/* Body Composition */}
          {result.bodyComposition&&(
            <X style={{padding:10,borderLeft:`3px solid ${C.bd}`}}>
              <div style={{fontSize:11,fontWeight:700,color:C.v,letterSpacing:"0.06em",marginBottom:6}}>Body Composition</div>
              {result.bodyComposition.bfTrend&&<div style={{fontSize:13,color:C.t2,marginBottom:4}}>BF% Trend: {result.bodyComposition.bfTrend}</div>}
              {result.bodyComposition.recompSignal&&<div style={{fontSize:13,color:C.t2,marginBottom:4}}>Cut Signal: {result.bodyComposition.recompSignal}</div>}
              {result.bodyComposition.muscleQuality&&<div style={{fontSize:13,color:C.t2,marginBottom:4}}>Muscle Quality: {result.bodyComposition.muscleQuality}</div>}
              {result.bodyComposition.photoReminder&&<div style={{fontSize:13,color:C.t2}}>{"📸"} {result.bodyComposition.photoReminder}</div>}
            </X>
          )}
        </div>
      )}
    </div>
  );
};

export { AnalysisSection };
