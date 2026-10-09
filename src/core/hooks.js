const { useState, useEffect, useRef, useCallback } = React;
import { td } from "../../lib/engine.mjs";
import { sv, svSB } from "./storage.js";

// Today's date key, refreshed every minute, so keep-alive tabs roll over at midnight.
const useToday=()=>{const [t,setT]=useState(td());useEffect(()=>{const iv=setInterval(()=>setT(td()),60000);return()=>clearInterval(iv);},[]);return t;};

// ═══ WATER · one mutation helper for every surface ═══
const waterOps=(setData,date)=>({
  add:(oz)=>setData(prev=>{const nv=Math.max(0,Math.round((Number(prev.water?.[date])||0)+oz));const water={...(prev.water||{})};if(nv>0)water[date]=nv;else delete water[date];const nd={...prev,water};sv(nd);svSB.water(date,nv);return nd;}),
  reset:()=>setData(prev=>{const water={...(prev.water||{})};delete water[date];const nd={...prev,water};sv(nd);svSB.delWater(date);return nd;}),
});
const WATER_PRESETS=[{oz:24,l:"SMALL BOTTLE"},{oz:32,l:"BIG BOTTLE"},{oz:64,l:"JUG"}];

export { useToday, waterOps, WATER_PRESETS };
