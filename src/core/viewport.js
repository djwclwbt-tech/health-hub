// ═══ VIEWPORT · iOS keyboard and scroll fixes ═══
// iOS (Safari and home-screen apps) lifts position:fixed bars with the keyboard and can
// leave them stranded mid-screen after it closes; it also scrolls the page behind an
// open sheet because it ignores overflow:hidden on body. Fixes:
//  · while an input has focus, <html> gets .kb and the bottom docks (.hh-dock) hide;
//  · when focus leaves, a zero-distance scroll makes iOS re-pin fixed elements;
//  · lockScroll() pins the body in place under an overlay (counted, so sheets can stack).
const isField=el=>!!el&&(el.tagName==="TEXTAREA"||el.tagName==="SELECT"||(el.tagName==="INPUT"&&!/^(button|checkbox|radio|range|submit|reset|file|color)$/i.test(el.type||"")));
const repin=()=>requestAnimationFrame(()=>window.scrollTo(window.scrollX,window.scrollY));
let kbTimer=null;
const installViewportFixes=()=>{
  const root=document.documentElement;
  document.addEventListener("focusin",e=>{if(isField(e.target)){clearTimeout(kbTimer);root.classList.add("kb");}});
  document.addEventListener("focusout",()=>{clearTimeout(kbTimer);kbTimer=setTimeout(()=>{if(!isField(document.activeElement)){root.classList.remove("kb");repin();}},120);});
  // The keyboard can also close without a focusout (swipe down, "Done"): watch the visual viewport.
  const vv=window.visualViewport;
  if(vv)vv.addEventListener("resize",()=>{if(vv.height>window.innerHeight*0.85&&!isField(document.activeElement)){root.classList.remove("kb");repin();}});
  window.addEventListener("orientationchange",()=>setTimeout(repin,300));
};

let locks=0,savedY=0;
const lockScroll=()=>{
  if(locks++>0)return;
  savedY=window.scrollY;const b=document.body.style;
  b.position="fixed";b.top=`-${savedY}px`;b.left="0";b.right="0";b.width="100%";
};
const unlockScroll=()=>{
  if(locks===0||--locks>0)return;
  const b=document.body.style;b.position="";b.top="";b.left="";b.right="";b.width="";
  window.scrollTo(0,savedY);
};

export { installViewportFixes, lockScroll, unlockScroll };
