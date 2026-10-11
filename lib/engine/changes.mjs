// ═══ ENGINE · CHANGES ═══ The Coach's write path: applyChanges and exerciseReport.
import {exLibById} from "./program.mjs";
import {progKey,saneSet} from "./state.mjs";
import {getProgPr,e1rm,calcVolume,bestSetByE1rm,resolveWeight} from "./progression.mjs";
// ═══ PROGRAM UPDATES · the Coach's write path ═══
// Pure: apply a list of changes to {settings, program}. Used server-side by
// /api/mcp and /api/update, and by tests. Returns new objects + descriptions.
export const SETTINGS_FIELDS=["calories","protein","water","steps","sleep","fiber","trainingCal","wednesdayCal","weekendCal"];
export const applyChanges=(changes,{settings={},program={}}={})=>{
  const s={...settings};const p=JSON.parse(JSON.stringify(program||{}));
  const applied=[];const rejected=[];const results=[];
  const ok=(msg)=>{applied.push(msg);results.push({ok:true,summary:msg});};
  const no=(c,error)=>{rejected.push({change:c,error});results.push({ok:false,error});};
  for(const c of changes||[]){
    if(!c||typeof c!=="object"){no(c,"empty change");continue;}
    if(c.type==="settings"){
      if(!SETTINGS_FIELDS.includes(c.field)){no(c,`unknown settings field ${c.field}`);continue;}
      const v=Number(c.value);if(!Number.isFinite(v)||v<0){no(c,"value must be a non-negative number");continue;}
      const old=s[c.field];s[c.field]=v;ok(`${c.field}: ${old??"unset"} → ${v}`);
    }else if(c.type==="exercise"){
      // update/swap hit EVERY day that holds the lift (e.g. seated calf on Tue and Fri).
      const findDays=(id)=>Object.entries(p).filter(([,d])=>(d?.exercises||[]).some(e=>e.id===id)).map(([dn])=>dn);
      if(c.action==="update"&&c.exerciseId&&c.fields){
        const dns=findDays(c.exerciseId);if(!dns.length){no(c,`no exercise ${c.exerciseId} in program`);continue;}
        let name;for(const dn of dns){const ex=p[dn].exercises.find(e=>e.id===c.exerciseId);Object.assign(ex,c.fields);name=ex.name;}
        ok(`Updated ${name}: ${Object.keys(c.fields).join(", ")}${dns.length>1?` (${dns.join(", ")})`:""}`);
      }else if(c.action==="swap"&&c.oldExerciseId&&c.newExercise?.id){
        const dns=findDays(c.oldExerciseId);if(!dns.length){no(c,`no exercise ${c.oldExerciseId} in program`);continue;}
        let oldName;for(const dn of dns){const idx=p[dn].exercises.findIndex(e=>e.id===c.oldExerciseId);const old=p[dn].exercises[idx];oldName=old.name;
          p[dn].exercises[idx]={...c.newExercise,anchor:c.newExercise.anchor??old.anchor};}
        ok(`Swapped ${oldName} → ${c.newExercise.name} (${dns.join(", ")})`);
      }else if(c.action==="add"&&c.day&&c.exercise?.id){
        if(!p[c.day]){no(c,`no training day ${c.day}`);continue;}
        if((p[c.day].exercises||[]).some(e=>e.id===c.exercise.id)){no(c,`${c.exercise.id} already on ${c.day}`);continue;}
        p[c.day].exercises=[...(p[c.day].exercises||[]),c.exercise];ok(`Added ${c.exercise.name} to ${c.day}`);
      }else if(c.action==="remove"&&c.day&&c.exerciseId){
        const day=p[c.day];const idx=(day?.exercises||[]).findIndex(e=>e.id===c.exerciseId);
        if(idx<0){no(c,`no ${c.exerciseId} on ${c.day}`);continue;}
        const [gone]=day.exercises.splice(idx,1);ok(`Removed ${gone.name} from ${c.day}`);
      }else no(c,`unsupported exercise action ${c.action}`);
    }else no(c,`unknown change type ${c.type}`);
  }
  return{settings:s,program:p,applied,rejected,results};
};

// Exercise view for coaching: sessions, e1RM line, PR, working weight, swaps.
export const exerciseReport=(data,ex,progKeyStr)=>{
  const sessions=Object.entries(data.wk||{}).sort((a,b)=>b[0].localeCompare(a[0])).map(([d,w])=>{
    const wex=w.exercises?.find(e=>(progKeyStr&&e.progKey===progKeyStr)||e.id===ex.id);if(!wex)return null;
    const cs=(wex.sets||[]).filter(saneSet);if(!cs.length)return null;
    const best=bestSetByE1rm(cs);
    return{date:d,sets:cs.map(x=>({weight:Number(x.weight)||0,reps:Number(x.reps)||0,rir:x.rir??null})),e1rm:e1rm(best.weight,best.reps),volume:calcVolume([{sets:cs}])};
  }).filter(Boolean);
  return{id:ex.id,name:ex.name,progKey:progKeyStr,pr:getProgPr(data.prog||{},{...ex,progKey:progKeyStr}),
    workingWeight:resolveWeight(data,{...ex,progKey:progKeyStr},ex.sw,ex),sessions};
};

// ═══ PLAIN-WORDS SUMMARY OF A COACH CHANGE ═══
// Newer program_updates rows carry a summary; older ones only the payload.
const FIELD_LABELS={calories:"Base calories",protein:"Protein target",water:"Water target",steps:"Steps target",sleep:"Sleep target",fiber:"Fiber target",
  trainingCal:"Training-day calories",wednesdayCal:"Wednesday calories",weekendCal:"Weekend calories"};
const UNITS={protein:" g",water:" oz",sleep:" h",fiber:" g"};
const nameOfId=id=>exLibById[id]?.name||String(id||"").replace(/-/g," ").replace(/^./,c=>c.toUpperCase());
export const describeChange=(c)=>{
  if(c?.summary&&!/^rejected:/.test(c.summary))return c.summary;
  let p=c?.payload;if(typeof p==="string"){try{p=JSON.parse(p);}catch{p=null;}}
  if(!p)return c?.summary||"Change";
  if(p.type==="settings"&&p.field){const v=typeof p.value==="number"?p.value.toLocaleString("en-US"):String(p.value);
    return`${FIELD_LABELS[p.field]||p.field} → ${v}${UNITS[p.field]||""}`;}
  if(p.type==="exercise"){
    const nw=p.newExercise?.name||nameOfId(p.newExercise?.id||p.exerciseId);
    if(p.action==="swap")return`Swap ${nameOfId(p.oldExerciseId)} → ${nw}`;
    if(p.action==="add")return`Add ${nw}${p.day?` on ${p.day.charAt(0).toUpperCase()+p.day.slice(1)}`:""}`;
    if(p.action==="remove")return`Remove ${nameOfId(p.exerciseId||p.oldExerciseId)}`;
    if(p.action==="update"){const f=Object.keys(p.updates||p.fields||{}).join(", ");return`Update ${nameOfId(p.exerciseId)}${f?` (${f})`:""}`;}
  }
  return c?.summary||`${p.type||"Change"}${p.action?` · ${p.action}`:""}`;
};
