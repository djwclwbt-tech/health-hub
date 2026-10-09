import { useBackClose } from "../core/nav.js";
import { C, FD } from "../core/theme.js";
import { B } from "./atoms.jsx";

// Overlays render at document.body so no animated ancestor can trap them under the tab bar.
const Portal=({children})=>ReactDOM.createPortal(children,document.body);

// ═══ CONFIRM MODAL ═══
const ConfirmModal=({title,message,onConfirm,onCancel,confirmText="Confirm",confirmColor=C.g})=>{
  useBackClose(true,onCancel);
  return(<Portal><div className="hh-fade" onClick={onCancel} style={{position:"fixed",inset:0,background:C.scrim,zIndex:320,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
    <div className="hh-sheet" role="alertdialog" aria-modal="true" onClick={e=>e.stopPropagation()} style={{background:C.cd,borderRadius:12,padding:20,width:"100%",maxWidth:320,border:`1px solid ${C.bd}`,boxShadow:C.sh}}>
      <div style={{fontSize:16,fontWeight:700,color:C.t,marginBottom:6}}>{title}</div>
      <div style={{fontSize:14,color:C.t2,marginBottom:16}}>{message}</div>
      <div style={{display:"flex",gap:8}}>
        <B full outline onClick={onCancel} style={{flex:1}}>Cancel</B>
        <B full onClick={onConfirm} color={confirmColor} style={{flex:1}}>{confirmText}</B>
      </div>
    </div>
  </div></Portal>);
};

// ═══ BOTTOM SHEET · every overlay uses this: slide-up, scrim tap + back button close ═══
const Sheet=({open,onClose,title,children,right,maxHeight="82vh"})=>{
  useBackClose(!!open,onClose);
  if(!open)return null;
  return(<Portal><div className="hh-fade" onClick={onClose} style={{position:"fixed",inset:0,background:C.scrim,zIndex:300,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
    <div className="hh-sheet" role="dialog" aria-modal="true" onClick={e=>e.stopPropagation()} style={{background:C.cd,borderRadius:"14px 14px 0 0",width:"100%",maxWidth:520,maxHeight,overflowY:"auto",padding:"8px 16px calc(18px + var(--safe-b))",border:`1px solid ${C.bd}`,boxShadow:C.sh}}>
      <div style={{width:36,height:4,borderRadius:2,background:C.bl,margin:"0 auto 10px"}}/>
      {(title||right)&&<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,gap:8}}>
        <div style={{fontSize:17,fontWeight:800,color:C.t,fontFamily:FD,textTransform:"uppercase",letterSpacing:"0.03em"}}>{title}</div>{right}
      </div>}
      {children}
    </div>
  </div></Portal>);
};

// ═══ TOAST ═══
const ToastStack=({toasts,dismiss})=>{
  if(!toasts.length)return null;
  return(<Portal><div role="status" aria-live="polite" style={{position:"fixed",bottom:"calc(var(--tabbar-h) + var(--safe-b) + 10px)",left:"50%",transform:"translateX(-50%)",zIndex:9999,display:"flex",flexDirection:"column",gap:6,maxWidth:440,width:"92%",pointerEvents:"none"}}>
    {toasts.map(t=>(<div key={t.id} className="hh-toast" onClick={()=>{if(t.action){t.action.fn();}dismiss(t.id);}} style={{pointerEvents:"auto",background:t.type==="success"?C.g:t.type==="error"?C.r:C.t,color:C.oa,padding:"11px 14px",borderRadius:9,fontSize:13,fontWeight:600,boxShadow:C.sh,display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,cursor:"pointer"}}>
      <span>{t.message}</span>
      {t.action&&<span style={{fontFamily:FD,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.06em",fontSize:12,whiteSpace:"nowrap",borderBottom:"1px solid var(--on-accent-line)"}}>{t.action.label}</span>}
    </div>))}
  </div></Portal>);
};

export { Portal, ConfirmModal, Sheet, ToastStack };
