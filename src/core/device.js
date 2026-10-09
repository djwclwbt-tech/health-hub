import { ld } from "./storage.js";

const haptic=(pattern=12)=>{try{if(navigator.vibrate)navigator.vibrate(pattern);}catch{}};
const isStandalone=()=>{try{return window.matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;}catch{return false;}};
const ensureNotificationPermission=async()=>{
  if(typeof Notification==="undefined")return false;
  if(Notification.permission==="granted")return true;
  if(Notification.permission==="denied")return false;
  try{return (await Notification.requestPermission())==="granted";}catch{return false;}
};
const notifyViaServiceWorker=async(payload)=>{
  if(!("serviceWorker" in navigator))return false;
  try{
    const reg=await navigator.serviceWorker.ready;
    if(reg?.active){reg.active.postMessage({type:"SHOW_NOTIFICATION",payload});return true;}
    if(reg?.showNotification){await reg.showNotification(payload.title||"Health Hub",payload);return true;}
  }catch{}
  return false;
};
const notifyDevice=async(title,options={})=>{
  if(!(await ensureNotificationPermission()))return false;
  const opts={title,icon:"/icon-192.png",badge:"/icon-192.png",vibrate:[200,100,200,100,200],renotify:true,requireInteraction:true,...options};
  if(await notifyViaServiceWorker(opts))return true;
  try{new Notification(title,opts);return true;}catch{return false;}
};
const scheduleDeviceNotification=async(title,options={},fireAt)=>{
  if(!(await ensureNotificationPermission()))return false;
  const payload={title,icon:"/icon-192.png",badge:"/icon-192.png",vibrate:[200,100,200,100,200],renotify:true,requireInteraction:true,...options,fireAt};
  if("serviceWorker" in navigator){
    try{const reg=await navigator.serviceWorker.ready;if(reg?.active){reg.active.postMessage({type:"SCHEDULE_NOTIFICATION",payload,fireAt});return true;}}catch{}
  }
  const delay=Math.max(0,fireAt-Date.now());
  setTimeout(()=>notifyDevice(title,options),delay);
  return true;
};
const cancelDeviceNotification=async(tag)=>{
  if(!tag||!("serviceWorker" in navigator))return;
  try{const reg=await navigator.serviceWorker.ready;reg?.active?.postMessage({type:"CANCEL_NOTIFICATION",tag});}catch{}
};
let vapidPublicKeyCache=null;
const urlBase64ToUint8Array=(base64String)=>{
  const padding="=".repeat((4-base64String.length%4)%4);
  const base64=(base64String+padding).replace(/-/g,"+").replace(/_/g,"/");
  const raw=atob(base64);
  return Uint8Array.from([...raw].map(ch=>ch.charCodeAt(0)));
};
const getVapidPublicKey=async()=>{
  if(vapidPublicKeyCache)return vapidPublicKeyCache;
  const r=await fetch("/api/push-schedule");
  const d=await r.json();
  if(!r.ok||!d.publicKey)throw new Error(d.error||"Push not configured");
  vapidPublicKeyCache=d.publicKey;
  return vapidPublicKeyCache;
};
const ensurePushSubscription=async()=>{
  if(!("serviceWorker" in navigator)||!("PushManager" in window))return null;
  if(!(await ensureNotificationPermission()))return null;
  const reg=await navigator.serviceWorker.ready;
  let sub=await reg.pushManager.getSubscription();
  if(sub)return sub;
  const key=await getVapidPublicKey();
  return reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(key)});
};
const scheduleServerPush=async({title="Rest complete",body="Next set is ready.",tag,dueAt,url="/"})=>{
  try{
    const sub=await ensurePushSubscription();
    if(!sub)return false;
    const notifyToken=ld()?.settings?.notifyToken||"";
    const r=await fetch("/api/push-schedule",{method:"POST",
      headers:{"Content-Type":"application/json",...(notifyToken?{"x-notify-token":notifyToken}:{})},
      body:JSON.stringify({subscription:sub.toJSON(),title,body,tag,dueAt,url})});
    return r.ok;
  }catch{return false;}
};

// Clears a booked rest alert on the server (skip, cancel, finish). Never prompts.
const cancelServerPush=async(tag)=>{
  try{
    if(!tag||!("serviceWorker" in navigator)||!("PushManager" in window))return false;
    const sub=await (await navigator.serviceWorker.ready).pushManager.getSubscription();
    if(!sub)return false;
    const notifyToken=ld()?.settings?.notifyToken||"";
    const r=await fetch("/api/push-schedule",{method:"POST",
      headers:{"Content-Type":"application/json",...(notifyToken?{"x-notify-token":notifyToken}:{})},
      body:JSON.stringify({cancel:true,subscription:{endpoint:sub.endpoint},tag})});
    return r.ok;
  }catch{return false;}
};

export { haptic, isStandalone, ensureNotificationPermission, notifyDevice, scheduleDeviceNotification, cancelDeviceNotification, scheduleServerPush, cancelServerPush };
