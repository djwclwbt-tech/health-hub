const { useState, useEffect, useRef, useCallback } = React;

// ═══ OVERLAY HISTORY ═══
// Every sheet/modal pushes one history entry while open, so the Android back
// button (and browser back) closes the overlay instead of leaving the app.
// history.back() is asynchronous, so a push requested while a back is in flight
// is queued until that popstate lands; otherwise the browser ends one entry short
// and the next back would leave the page.
const navStack=[];const queuedPushes=[];let navSeq=0,ignorePops=0,flushTimer=null;
const pushEntry=(entry)=>{try{history.pushState({hh:entry.id},"");}catch{}};
const flushQueued=()=>{clearTimeout(flushTimer);flushTimer=null;while(queuedPushes.length){const e=queuedPushes.shift();if(navStack.includes(e))pushEntry(e);}};
const requestPush=(entry)=>{if(ignorePops>0){queuedPushes.push(entry);if(!flushTimer)flushTimer=setTimeout(()=>{ignorePops=0;flushQueued();},500);}else pushEntry(entry);};
window.addEventListener("popstate",()=>{
  if(ignorePops>0){ignorePops--;if(ignorePops===0)flushQueued();return;}
  const top=navStack.pop();if(!top)return;top.closing=true;try{top.close();}catch{}
});
const useBackClose=(open,close)=>{
  const ref=useRef(null);
  useEffect(()=>{if(ref.current)ref.current.close=close;});
  useEffect(()=>{
    const release=()=>{const entry=ref.current;if(!entry)return;ref.current=null;
      const idx=navStack.indexOf(entry);if(idx<0)return;navStack.splice(idx,1);
      const qi=queuedPushes.indexOf(entry);if(qi>=0){queuedPushes.splice(qi,1);return;}
      if(!entry.closing&&idx===navStack.length){ignorePops++;try{history.back();}catch{ignorePops--;}}};
    if(open&&!ref.current){const entry={id:++navSeq,close,closing:false};ref.current=entry;navStack.push(entry);requestPush(entry);}
    else if(!open)release();
    return release;
  },[open]);
};

export { useBackClose };
