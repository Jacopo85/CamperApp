import {doc,onSnapshot,runTransaction,serverTimestamp} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import {DEADLINE_CATEGORIES,DEADLINE_LEADS,validDeadlineDate,daysUntilDeadline,deadlineState,cleanDeadline,formatDeadlineDate,deadlineIcs} from "./deadline-utils.js";

// Lo scadenzario usa groups/{groupId}/settings/deadlines: raccolta già autorizzata.
// Niente Cloud Functions, nessun permesso Firebase aggiuntivo.
export function createDeadlineUI({db,getUser,getGroup,canWrite,onToast,onWriteFailure,onWriteSuccess,onOpenVehicle,onSync=()=>{}}){
  const $=id=>document.getElementById(id);
  let group=null,unsubscribe=null,entries=[],loaded=false,editing=null,busy=false;
  const pendingNotifications=new Set();
  const notifiedThisSession=new Set();
  const prefKey="camperapp-deadlines-foreground-notifications-v1";
  const eventForm=$("deadlineForm");

  function savedNotificationsEnabled(){
    try{return localStorage.getItem(prefKey)==="yes";}catch{return false;}
  }
  function saveNotificationPreference(enabled){
    try{if(enabled)localStorage.setItem(prefKey,"yes");else localStorage.removeItem(prefKey);}catch{}
  }
  function showNotificationPreference(){
    const enabled=savedNotificationsEnabled();
    $("deadlineEnableNotifications").textContent=enabled?"🔕 Disattiva avvisi web":"🔔 Attiva avvisi con app aperta";
    if(enabled&&("Notification" in window)&&Notification.permission==="granted"){
      $("deadlineNotificationState").textContent="Avvisi web abilitati su questo dispositivo, solo con CamperApp aperta. Per gli avvisi a app chiusa usa il calendario Android.";
    }else{
      $("deadlineNotificationState").textContent="Per avvisi anche quando CamperApp è chiusa, importa le scadenze nel calendario Android e controlla che l'avviso sia attivo.";
    }
  }
  function resetEditor(){
    editing=null;eventForm.reset();$("deadlineLead").value="7";
    $("deadlineSaveBtn").textContent="Salva scadenza";
    $("deadlineCancelEdit").classList.add("hidden");
  }
  function statusClass(kind){return kind==="overdue"?"overdue":kind==="today"?"today":kind==="soon"?"soon":"future";}
  function dueItems(){
    return entries.filter(entry=>["overdue","today","soon"].includes(deadlineState(entry).kind));
  }
  function displaySummary(){
    const due=dueItems();
    const banner=$("deadlineBanner");
    banner.classList.toggle("hidden",due.length===0);
    banner.textContent="📅 "+due.length+" "+(due.length===1?"scadenza del camper da controllare":"scadenze del camper da controllare")+" · apri";
    $("deadlineHomeSummary").textContent=due.length?due.length+" scadenze da controllare":"Scadenzario · "+entries.length+" registrate";
  }
  function button(text,callback,cssClass="secondary compact"){
    const element=document.createElement("button");
    element.type="button";element.className=cssClass;element.textContent=text;
    element.disabled=busy;element.addEventListener("click",callback);
    return element;
  }
  function render(){
    const list=$("deadlineList");
    list.replaceChildren();
    $("deadlineExportAll").disabled=entries.length===0;
    const sorted=[...entries].sort((a,b)=>{
      const av=daysUntilDeadline(a.date),bv=daysUntilDeadline(b.date);
      return (av??999999)-(bv??999999)||a.title.localeCompare(b.title,"it");
    });
    if(!sorted.length){
      const message=document.createElement("p");message.className="muted small";
      message.textContent=loaded?"Nessuna scadenza registrata. Inizia con bollo, assicurazione o revisione.":"Caricamento scadenze…";
      list.appendChild(message);
    }
    sorted.forEach(entry=>{
      const info=deadlineState(entry);
      const row=document.createElement("div");row.className="deadline-entry deadline-"+statusClass(info.kind);
      const description=document.createElement("div");description.className="deadline-entry-info";
      const heading=document.createElement("strong");heading.textContent=entry.category+" · "+entry.title;
      const when=document.createElement("p");when.className="small";
      when.textContent="Scadenza: "+formatDeadlineDate(entry.date)+" · Preavviso: "+(entry.leadDays===0?"il giorno stesso":entry.leadDays+" giorni prima");
      const status=document.createElement("span");status.className="deadline-status deadline-"+statusClass(info.kind);
      status.textContent=info.text;
      description.append(heading,when,status);
      if(entry.notes){const notes=document.createElement("p");notes.className="small muted";notes.textContent=entry.notes;description.appendChild(notes);}
      const actions=document.createElement("div");actions.className="deadline-entry-buttons";
      actions.append(
        button("Modifica",()=>{
          editing=entry.id;
          $("deadlineCategory").value=entry.category;$("deadlineTitle").value=entry.title;
          $("deadlineDate").value=entry.date;$("deadlineLead").value=String(entry.leadDays);
          $("deadlineNotes").value=entry.notes||"";
          $("deadlineSaveBtn").textContent="Aggiorna scadenza";
          $("deadlineCancelEdit").classList.remove("hidden");
          eventForm.scrollIntoView({behavior:"smooth",block:"center"});
        }),
        button("Calendario (.ics)",()=>downloadCalendar([entry])),
        button("Elimina",async()=>{
          if(!confirm("Eliminare la scadenza «"+entry.title+"»?"))return;
          await mutateDeadline(entry.id,null);
        })
      );
      row.append(description,actions);list.appendChild(row);
    });
    displaySummary();
  }
  function downloadCalendar(selected){
    const items=selected.filter(item=>cleanDeadline(item));
    if(!items.length){onToast("Non ci sono scadenze da esportare.");return;}
    const file=new Blob([deadlineIcs(items)],{type:"text/calendar;charset=utf-8"});
    const url=URL.createObjectURL(file);
    const anchor=document.createElement("a");anchor.href=url;
    anchor.download=items.length===1?"camper-scadenza.ics":"camper-scadenzario.ics";
    document.body.appendChild(anchor);anchor.click();anchor.remove();
    setTimeout(()=>URL.revokeObjectURL(url),10000);
    $("deadlineNotificationState").textContent="Calendario esportato. Apri il file .ics, importalo nel calendario Android e verifica il promemoria. L'esportazione non sincronizza automaticamente gli aggiornamenti successivi.";
  }
  async function mutateDeadline(id,newValue){
    if(busy||!loaded||!group||!getUser())return false;
    if(!canWrite())return false;
    const targetGroup=group,userId=getUser().uid;
    busy=true;$("deadlineSaveBtn").disabled=true;
    try{
      const reference=doc(db,"groups",targetGroup,"settings","deadlines");
      await runTransaction(db,async transaction=>{
        const existing=await transaction.get(reference);
        const items=Array.isArray(existing.data()?.items)?existing.data().items:[];
        if(items.length>80)throw new Error("Scadenzario pieno: elimina le scadenze non necessarie.");
        const position=items.findIndex(item=>item.id===id);
        if(newValue===null){
          if(position<0)throw new Error("Scadenza non più presente. Ricarica la pagina.");
          items.splice(position,1);
        }else if(position>=0){
          items[position]=newValue;
        }else{
          if(editing!==null)throw new Error("Scadenza modificata da un altro dispositivo: ricarica prima di salvare.");
          if(items.length>=80)throw new Error("Massimo 80 scadenze per il gruppo.");
          items.push(newValue);
        }
        transaction.set(reference,{items,updatedAt:serverTimestamp(),updatedBy:userId},{merge:true});
      });
      if(editing===id)resetEditor();
      onWriteSuccess(newValue===null?"Scadenza eliminata.":"Scadenza salvata e condivisa.");
      return true;
    }catch(error){onWriteFailure("Scadenzario",error);return false;}
    finally{busy=false;$("deadlineSaveBtn").disabled=false;render();}
  }
  async function submit(event){
    event.preventDefault();
    if(busy||!loaded)return;
    const id=editing||crypto.randomUUID();
    const entry=cleanDeadline({
      id,category:$("deadlineCategory").value,title:$("deadlineTitle").value,
      date:$("deadlineDate").value,leadDays:Number($("deadlineLead").value),
      notes:$("deadlineNotes").value
    });
    if(!entry){$("deadlineSyncState").textContent="Inserisci una descrizione e una data di scadenza valida.";return;}
    const saved=await mutateDeadline(id,entry);
    if(saved)resetEditor();
  }
  async function maybeNotify(){
    if(!group||!loaded||document.visibilityState==="hidden")return;
    if(!savedNotificationsEnabled()||!("Notification" in window)||Notification.permission!=="granted")return;
    if(!("serviceWorker" in navigator))return;
    const user=getUser();if(!user)return;
    const matching=entries.filter(entry=>["today","soon"].includes(deadlineState(entry).kind));
    if(!matching.length)return;
    try{
      const registration=await navigator.serviceWorker.getRegistration();
      if(!registration||typeof registration.showNotification!=="function")return;
      for(const entry of matching){
        if(group!==getGroup())return;
        const key=["camperapp",user.uid,group,entry.id,entry.date,entry.leadDays].join("|");
        if(pendingNotifications.has(key)||notifiedThisSession.has(key))continue;
        let wasShown=false;
        try{wasShown=localStorage.getItem(key)==="shown";}catch{}
        if(wasShown)continue;
        pendingNotifications.add(key);
        try{
          await registration.showNotification("Scadenza camper: "+entry.category,{
            body:entry.title+" · "+formatDeadlineDate(entry.date)+" · "+deadlineState(entry).text,
            tag:"camperapp-deadline-"+entry.id
          });
          notifiedThisSession.add(key);
          try{localStorage.setItem(key,"shown");}catch{}
        }catch(error){console.warn("Avviso scadenza non disponibile:",error);}
        finally{pendingNotifications.delete(key);}
      }
    }catch(error){console.warn("Avvisi browser non disponibili:",error);}
  }
  async function toggleNotifications(){
    if(savedNotificationsEnabled()){
      saveNotificationPreference(false);showNotificationPreference();return;
    }
    if(!("Notification" in window)||!("serviceWorker" in navigator)){
      $("deadlineNotificationState").textContent="Questo browser non supporta avvisi web. Usa il file calendario con preavviso.";return;
    }
    try{
      const result=await Notification.requestPermission();
      if(result!=="granted"){
        $("deadlineNotificationState").textContent="Permesso notifiche non concesso. Rimangono visibili gli avvisi nell'app e puoi usare il calendario.";
        return;
      }
      saveNotificationPreference(true);showNotificationPreference();
      await maybeNotify();
    }catch(error){
      $("deadlineNotificationState").textContent="Impossibile attivare gli avvisi web: "+error.message;
    }
  }
  function connect(groupId){
    disconnect();
    group=groupId;
    $("deadlineSyncState").textContent="Caricamento scadenze condivise…";
    onSync(null);
    const reference=doc(db,"groups",groupId,"settings","deadlines");
    unsubscribe=onSnapshot(reference,{includeMetadataChanges:true},snapshot=>{
      if(group!==groupId)return;
      const raw=snapshot.exists()&&Array.isArray(snapshot.data().items)?snapshot.data().items:[];
      entries=raw.map(cleanDeadline).filter(item=>item&&item.id);
      loaded=true;
      const synced=!snapshot.metadata.fromCache&&!snapshot.metadata.hasPendingWrites;
      onSync(synced);
      $("deadlineSyncState").textContent=snapshot.metadata.fromCache||snapshot.metadata.hasPendingWrites
        ?"Scadenze da copia locale · sincronizzazione da verificare"
        :"Scadenze sincronizzate tra i dispositivi";
      render();void maybeNotify();
    },error=>{
      if(group!==groupId)return;
      loaded=false;onSync(false,true);
      $("deadlineSyncState").textContent="Impossibile sincronizzare le scadenze: "+error.message;
    });
  }
  function disconnect(){
    if(unsubscribe){unsubscribe();unsubscribe=null;}
    group=null;entries=[];editing=null;loaded=false;busy=false;pendingNotifications.clear();
    resetEditor();
    $("deadlineBanner").classList.add("hidden");
    $("deadlineHomeSummary").textContent="Dimensioni e scadenze";
    $("deadlineSyncState").textContent="Accedi al gruppo per vedere lo scadenzario.";
    $("deadlineList").replaceChildren();
    $("deadlineExportAll").disabled=true;
  }
  eventForm.addEventListener("submit",submit);
  $("deadlineCancelEdit").addEventListener("click",resetEditor);
  $("deadlineExportAll").addEventListener("click",()=>downloadCalendar(entries));
  $("deadlineEnableNotifications").addEventListener("click",toggleNotifications);
  $("deadlineBanner").addEventListener("click",onOpenVehicle);
  document.addEventListener("visibilitychange",()=>{
    if(document.visibilityState==="visible"&&group){render();void maybeNotify();}
  });
  window.addEventListener("focus",()=>{if(group){render();void maybeNotify();}});
  setInterval(()=>{if(group&&document.visibilityState==="visible"){render();void maybeNotify();}},900000);
  showNotificationPreference();
  return {connect,disconnect,refresh:()=>{if(group){render();void maybeNotify();}}};
}
