// ═══ ENGINE · STATE ═══ Blank data shape (bl), migrate, historical seed, meal totals,
// and the progression key helpers (lift + rep range).
import {PROG,DEFAULTS} from "./program.mjs";
// Progression is tracked by lift + rep range so strength and hypertrophy slots don't corrupt each other.
export const repTrack=rr=>(rr&&rr.length===2)?`${rr[0]}-${rr[1]}`:"default";
export const rrTxt=rr=>(rr&&rr.length===2)?(rr[0]===rr[1]?String(rr[0]):rr.join("-")):"";
export const progKey=(ex,slot)=>ex?.progKey||`${ex?.id}__${repTrack((slot||ex)?.rr)}`;
export const legacyAmbiguousIds=new Set(["leg-press","rdl","lying-leg-curl"]);
export const saneSet=s=>s&&s.done&&Number(s.reps)>0&&(Number(s.weight)>0||s.weight===0);
export const bl=()=>({wk:{},nut:{},wt:{},rec:{},prog:{},steps:{},mob:{},stp:{},debrief:{},habits:{},water:{},cardio:{},bodyComp:{},bodyMeas:{},photoSlots:{},travelDays:{},tdeeExclude:{},autoregLog:{},lytes:{},coachLog:[],programVersion:null,tdeeCal:null,socialWeekend:{active:false,weekOf:null},settings:{...DEFAULTS},program:JSON.parse(JSON.stringify(PROG.days))});
export const migrate=(d)=>{const b=bl();const rawMob=d.mob||{};const mob={};
  for(const[date,v]of Object.entries(rawMob)){mob[date]=v===true?{done:true,dur:null}:v;}
  return{...b,...d,
  wk:d.wk||d.workoutLog||{},nut:d.nut||d.nutritionLog||{},wt:d.wt||d.weightLog||{},
  rec:d.rec||d.recoveryLog||{},steps:d.steps||{},prog:d.prog||d.progressionState||{},
  mob,stp:d.stp||{},debrief:d.debrief||{},habits:d.habits||{},water:d.water||{},
  cardio:d.cardio||{},bodyComp:d.bodyComp||{},travelDays:d.travelDays||{},
  settings:{...DEFAULTS,...(d.settings||{})},program:d.program||JSON.parse(JSON.stringify(PROG.days))};};

// Historical data seed for TDEE bootstrap
export const SEED_DATA=[
  {date:"2026-03-09",cal:1986,protein:172,carbs:152,fat:55,weight:188.7},
  {date:"2026-03-10",cal:1844,protein:176,carbs:175,fat:49,weight:188.2},
  {date:"2026-03-11",cal:2119,protein:200,carbs:231,fat:52,weight:188.5},
  {date:"2026-03-12",cal:2358,protein:208,carbs:229,fat:65,weight:186.5},
  {date:"2026-03-13",cal:2602,protein:217,carbs:213,fat:107,weight:185.0},
  {date:"2026-03-14",cal:2809,protein:212,carbs:215,fat:157,weight:181.4},
  {date:"2026-03-15",cal:3000,protein:180,carbs:0,fat:0,weight:182.8},
];
export const seedHistorical=(d)=>{
  for(const s of SEED_DATA){
    if(!d.wt[s.date])d.wt[s.date]=s.weight;
    if(!d.nut[s.date]||!d.nut[s.date].totalCal){
      d.nut[s.date]={meals:[{description:"MFP Import",cal:s.cal,protein:s.protein,carbs:s.carbs,fat:s.fat,fiber:0,source:"import"}],
        totalCal:s.cal,totalProtein:s.protein,totalCarbs:s.carbs,totalFat:s.fat,totalFiber:0};
    }
  }
  return d;
};

// Meal list → daily totals (Food tab, coach log_meal, tests).
export const sumMeals=ms=>({meals:ms,totalCal:Math.round(ms.reduce((s,m)=>s+(Number(m.cal)||0),0)),totalProtein:Math.round(ms.reduce((s,m)=>s+(Number(m.protein)||0),0)*10)/10,
  totalCarbs:Math.round(ms.reduce((s,m)=>s+(Number(m.carbs)||0),0)*10)/10,totalFat:Math.round(ms.reduce((s,m)=>s+(Number(m.fat)||0),0)*10)/10,totalFiber:Math.round(ms.reduce((s,m)=>s+(Number(m.fiber)||0),0)*10)/10});
