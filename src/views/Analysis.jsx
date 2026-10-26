const { useState, useEffect, useRef, useCallback } = React;
import { td, coachBrief } from "../../lib/engine.mjs";
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
      // The engine builds the brief (same numbers the Coach sees); the model may only cite what is in it.
      const payload={range,brief:coachBrief(data,td(),days)};

      const r=await fetch("/api/analyze",{method:"POST",headers:{"Content-Type":"application/json","x-sync-token":data.settings?.syncToken||""},body:JSON.stringify(payload)});
      const resp=await r.json();
      if(resp.error)throw new Error(resp.error);
      setResult(resp);
    }catch(e){setError(e.message||"Analysis failed. Check your connection and try again.");}
    setLoading(false);
  };

  const ScoreBar=({label,score,color})=>(
    <div style={{marginBottom:8}}>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:15,marginBottom:3}}>
        <span style={{color:C.t2,fontWeight:600}}>{label}</span>
        <span style={{color,fontWeight:500}}>{score}/100</span>
      </div>
      <Br v={score} max={100} color={color} h={6}/>
    </div>
  );

  const scoreColor=(s)=>s>=70?C.g:s>=45?C.t2:C.t;

  return(
    <div style={{marginTop:8,borderTop:`1px solid ${C.bl}`,paddingTop:10}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={{fontSize:17,fontWeight:500,color:C.t}}>Weekly analysis</div>
        <div style={{display:"flex",gap:3}}>
          {["7d","14d","30d"].map(r=>(
            <button key={r} onClick={()=>setRange(r)} style={{
              padding:"5px 10px",minHeight:44,minWidth:44,borderRadius:8,fontSize:15,fontWeight:500,cursor:"pointer",fontFamily:"inherit",
              border:`1px solid ${range===r?C.t:C.bd}`,background:range===r?C.bg:"transparent",color:range===r?C.t:C.t3,
            }}>{r}</button>
          ))}
        </div>
      </div>

      <B full outline onClick={runAnalysis} disabled={loading} style={{marginBottom:8}}>
        {loading?"Analyzing…":`Analyze the last ${range.replace("d"," days")}`}
      </B>

      {error&&<div style={{fontSize:15,color:C.r,padding:"8px 10px",background:C.rl,borderRadius:6,marginBottom:8}}>{error}</div>}

      {result&&(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {/* Scores */}
          {result.scores&&(
            <X style={{padding:12}}>
              <div style={{fontSize:15,fontWeight:500,color:C.t,marginBottom:10}}>Scores · Last {range}</div>
              {result.scores.overall!=null&&<ScoreBar label="Overall" score={result.scores.overall} color={scoreColor(result.scores.overall)}/>}
              {result.scores.training!=null&&<ScoreBar label="Training" score={result.scores.training} color={scoreColor(result.scores.training)}/>}
              {result.scores.nutrition!=null&&<ScoreBar label="Nutrition" score={result.scores.nutrition} color={scoreColor(result.scores.nutrition)}/>}
              {result.scores.recovery!=null&&<ScoreBar label="Recovery" score={result.scores.recovery} color={scoreColor(result.scores.recovery)}/>}
              {result.scores.habits!=null&&<ScoreBar label="Habits" score={result.scores.habits} color={scoreColor(result.scores.habits)}/>}
            </X>
          )}

          {/* What the analysis could not see comes first */}
          {result.dataGaps&&result.dataGaps.length>0&&(
            <X style={{padding:12}}>
              <div style={{fontSize:15,fontWeight:500,color:C.t,marginBottom:6}}>Missing data{result.confidence?` · ${result.confidence} confidence`:""}</div>
              {result.dataGaps.map((g,i)=><div key={i} style={{fontSize:15,color:C.t2,marginBottom:4}}>{g}</div>)}
            </X>
          )}

          {/* Summary */}
          {result.summary&&(
            <X style={{padding:12}}>
              <div style={{fontSize:15,color:C.t,lineHeight:1.6}}>{result.summary}</div>
            </X>
          )}

          {/* Wins & Gaps */}
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {result.wins&&result.wins.length>0&&(
              <X style={{padding:10,borderTop:`3px solid ${C.g}`}}>
                <div style={{fontSize:15,fontWeight:500,color:C.g,marginBottom:6}}>Wins</div>
                {result.wins.map((w,i)=>(
                  <div key={i} style={{fontSize:13,color:C.t2,marginBottom:4,paddingLeft:8,borderLeft:`2px solid ${C.gl}`}}>{w}</div>
                ))}
              </X>
            )}
            {result.gaps&&result.gaps.length>0&&(
              <X style={{padding:10,borderTop:`3px solid ${C.bd}`}}>
                <div style={{fontSize:13,fontWeight:500,color:C.t2,marginBottom:6}}>Gaps</div>
                {result.gaps.map((g,i)=>(
                  <div key={i} style={{fontSize:13,color:C.t2,marginBottom:4,paddingLeft:8,borderLeft:`2px solid ${C.rl}`}}>{g}</div>
                ))}
              </X>
            )}
          </div>

          {/* Trends */}
          {result.trends&&result.trends.length>0&&(
            <X style={{padding:10}}>
              <div style={{fontSize:15,fontWeight:500,color:C.t3,marginBottom:6}}>Trends</div>
              {result.trends.map((t,i)=>(
                <div key={i} style={{fontSize:15,color:C.t2,marginBottom:5,display:"flex",gap:6,alignItems:"flex-start"}}>
                  <span style={{color:C.t3,fontWeight:500,minWidth:14}}>→</span>
                  <span>{t}</span>
                </div>
              ))}
            </X>
          )}

          {/* Correlations */}
          {result.correlations&&result.correlations.length>0&&(
            <X style={{padding:10}}>
              <div style={{fontSize:15,fontWeight:500,color:C.t3,marginBottom:6}}>Correlations</div>
              {result.correlations.map((c,i)=>(
                <div key={i} style={{fontSize:15,color:C.t2,marginBottom:5,display:"flex",gap:6,alignItems:"flex-start"}}>
                  <span style={{color:C.t2,fontWeight:500,minWidth:14}}>↔</span>
                  <span>{c}</span>
                </div>
              ))}
            </X>
          )}

          {/* Recommendations */}
          {result.recommendations&&result.recommendations.length>0&&(
            <X style={{padding:10}}>
              <div style={{fontSize:15,fontWeight:500,color:C.t2,marginBottom:6}}>Recommendations</div>
              {result.recommendations.map((r,i)=>(
                <div key={i} style={{fontSize:15,color:C.t,marginBottom:6,paddingBottom:6,borderBottom:i<result.recommendations.length-1?`1px solid ${C.bl}`:"none"}}>
                  <span style={{fontWeight:500,color:C.t2}}>{i+1}. </span>{r}
                </div>
              ))}
            </X>
          )}

          {/* Next Week Focus */}
          {result.nextWeekFocus&&(
            <X style={{padding:12,background:C.bg,border:`1px solid ${C.bd}`}}>
              <div style={{fontSize:15,fontWeight:500,color:C.t2,marginBottom:4}}>Next week's focus</div>
              <div style={{fontSize:16,color:C.t,fontWeight:600,lineHeight:1.5}}>{result.nextWeekFocus}</div>
            </X>
          )}

          {/* Body Composition */}
          {result.bodyComposition&&(
            <X style={{padding:10}}>
              <div style={{fontSize:15,fontWeight:500,color:C.t2,marginBottom:6}}>Body composition</div>
              {result.bodyComposition.bfTrend&&<div style={{fontSize:15,color:C.t2,marginBottom:4}}>Body fat trend: {result.bodyComposition.bfTrend}</div>}
              {result.bodyComposition.recompSignal&&<div style={{fontSize:15,color:C.t2,marginBottom:4}}>Cut signal: {result.bodyComposition.recompSignal}</div>}
              {result.bodyComposition.muscleQuality&&<div style={{fontSize:15,color:C.t2,marginBottom:4}}>Muscle quality: {result.bodyComposition.muscleQuality}</div>}
              {result.bodyComposition.photoReminder&&<div style={{fontSize:15,color:C.t2}}>{result.bodyComposition.photoReminder}</div>}
            </X>
          )}
        </div>
      )}
    </div>
  );
};

export { AnalysisSection };
