import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, addDoc, collection, onSnapshot, updateDoc, deleteDoc, serverTimestamp, query, orderBy, getDocs, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import { gpsPoint, gpsDistanceKm, arrangeByAirDistance, gpsOrigin } from "./route-geo.js";
import { createDeadlineUI } from "./deadlines-ui.js";

const $ = id => document.getElementById(id);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let currentUser = null, groupId = null, unsubShopping = null, unsubWishlist = null, unsubGroup = null, unsubVehicle = null;
let shoppingCache = [], wishlistCache = [];
let authorNames = new Map();
const show = (id, yes=true) => $(id).classList.toggle("hidden", !yes);
const msg = (id, text) => { $(id).textContent = text || ""; };
function toast(text){ const t=$("toast"); t.textContent=text; t.classList.add("show"); setTimeout(()=>t.classList.remove("show"),2600); }
const deadlines=createDeadlineUI({
  db,
  getUser:()=>currentUser,
  getGroup:()=>groupId,
  canWrite:()=>canWrite(),
  onToast:message=>toast(message),
  onWriteFailure:(label,error)=>writeFailed(label,error),
  onWriteSuccess:message=>writeSucceeded(message),
  onOpenVehicle:()=>switchTab("vehicle")
});

function writeNotice(text){
  const notice=$("writeState");
  if(!notice)return; // Older cached HTML: do not interrupt the operation.
  notice.textContent=text;
  notice.classList.toggle("hidden",!text);
}
function canWrite(){
  if(!currentUser||!groupId){toast("Accedi al gruppo familiare prima di modificare i dati.");return false;}
  if(navigator.onLine)return true;
  writeNotice("Salvataggio non avviato: sei offline. Riconnettiti e riprova; la modifica non è stata inviata.");
  toast("Offline: operazione non avviata.");
  return false;
}
function writeFailed(label,error){
  writeNotice(label+" non riuscito: "+friendlyError(error)+" Controlla i dati e riprova.");
  toast(label+" non riuscito.");
}
function writeSucceeded(label){writeNotice("");toast(label);}

let shoppingSync=null, wishlistSync=null, vehicleSync=null, syncError=false;
let vehicleDirty=false;
function setSync(text){ $("syncState").textContent=text; }
function refreshSyncState(){
  if(!navigator.onLine){setSync("Offline · modifiche non garantite");return;}
  if(syncError){setSync("Errore sincronizzazione");return;}
  if(shoppingSync===true && wishlistSync===true && vehicleSync===true){setSync("Dati sincronizzati");return;}
  setSync("Online · sincronizzazione in corso");
}
window.addEventListener("online",()=>{refreshSyncState();if(currentUser&&!groupId)void restoreCurrentGroup();});
window.addEventListener("offline",refreshSyncState);
function setView(view){ ["authView","groupView","appView"].forEach(id=>show(id,false)); show(view); }
function allowGroupChanges(allowed){
  $("createGroupBtn").disabled=!allowed;
  $("joinGroupBtn").disabled=!allowed;
}
function switchTab(name){ document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===name)); document.querySelectorAll(".tab-panel").forEach(p=>p.classList.toggle("hidden",p.id!=="tab-"+name)); }
function escapeHTML(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function groupRef(){return doc(db,"groups",groupId);}
function colRef(name){return collection(db,"groups",groupId,name);}
let restoreInProgress=false;
async function restoreCurrentGroup(){
  if(restoreInProgress||!currentUser)return;
  if(!navigator.onLine){
    setView("groupView");allowGroupChanges(false);
    msg("groupMessage","Sei offline: il gruppo familiare non è stato cancellato. Riconnettiti a Internet e attendi il recupero automatico. Non creare un nuovo gruppo.");
    return;
  }
  restoreInProgress=true;
  try{
    const userDoc=await getDoc(doc(db,"users",currentUser.uid));
    if(userDoc.exists()&&userDoc.data().groupId)await loadGroup(userDoc.data().groupId);
    else {setView("groupView");allowGroupChanges(true);}
    msg("groupMessage","");
  }catch(e){
    setView("groupView");allowGroupChanges(false);
    msg("groupMessage",(!navigator.onLine||e?.code==="unavailable")
      ?"Connessione assente: il gruppo esistente non è stato cancellato. Riconnettiti a Internet per riprovare. Non creare un nuovo gruppo."
      :friendlyError(e));
  }finally{restoreInProgress=false;}
}
function cleanup(){deadlines.disconnect();stopNearbyMonitoring();[unsubShopping,unsubWishlist,unsubGroup,unsubVehicle].forEach(fn=>{if(fn)fn();});unsubShopping=unsubWishlist=unsubGroup=unsubVehicle=null;groupId=null;shoppingCache=[];wishlistCache=[];authorNames=new Map();shoppingSync=wishlistSync=vehicleSync=null;syncError=false;vehicleDirty=false;}
// I nomi sono associati agli UID dei membri; non viene modificato Firestore.
function memberDisplayName(email){
  // Non pubblicare nel sorgente gli indirizzi email completi degli account familiari.
  const [local="",domain=""]=String(email||"").trim().toLowerCase().split("@");
  if(local.startsWith("jacopo"))return "Jacopo";
  if(local.startsWith("azzurra"))return domain==="gmail.com"?"Camper":"Azzurra";
  return null;
}
function authorLabel(uid){
  return typeof uid==="string" && authorNames.has(uid)
    ? "Aggiunto da "+authorNames.get(uid)
    : "Autore non disponibile";
}
async function loadAuthorNames(gid){
  try{
    const members=await getDocs(collection(db,"groups",gid,"members"));
    const names=new Map();
    members.forEach(member=>{
      const name=memberDisplayName(member.data().email);
      if(name)names.set(member.id,name);
    });
    if(groupId!==gid)return;
    authorNames=names;
    renderShopping();renderWishlist();
  }catch(err){
    console.warn("Nomi autori non disponibili:",err);
  }
}
function inviteCode(){
  const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const random=new Uint8Array(12);crypto.getRandomValues(random);
  return Array.from(random,n=>chars[n%chars.length]).join("");
}
function randomGroupId(){return crypto.randomUUID().replaceAll("-","").slice(0,24);}
async function loadGroup(gid){
  cleanup(); groupId=gid;
  const ref=doc(db,"groups",gid); const snap=await getDoc(ref);
  if(!snap.exists()) throw new Error("Il gruppo non esiste più.");
  setView("appView"); $("userLabel").textContent=currentUser.email||"Account"; $("groupTitle").textContent=snap.data().name||"Il nostro camper"; refreshSyncState();
  unsubGroup=onSnapshot(ref,s=>{if(s.exists())$("groupTitle").textContent=s.data().name||"Il nostro camper";});
  void loadAuthorNames(gid);
  unsubShopping=onSnapshot(query(colRef("shopping"),orderBy("createdAt","asc")),{includeMetadataChanges:true},snap=>{
    shoppingCache=snap.docs.map(d=>({id:d.id,...d.data()})); shoppingSync=!snap.metadata.fromCache&&!snap.metadata.hasPendingWrites;refreshSyncState();renderShopping(); updateSummaries();
  },err=>{syncError=true;refreshSyncState();toast("Errore lista spesa: "+err.message);});
  unsubWishlist=onSnapshot(query(colRef("wishlist"),orderBy("createdAt","desc")),{includeMetadataChanges:true},snap=>{
    wishlistCache=snap.docs.map(d=>({id:d.id,...d.data()})); wishlistSync=!snap.metadata.fromCache&&!snap.metadata.hasPendingWrites;refreshSyncState();renderWishlist(); renderSavedPlaces(); updateNearbyState(); updateSummaries();
  },err=>{syncError=true;refreshSyncState();toast("Errore mete: "+err.message);});
  // Ricevi gli aggiornamenti dei dati camper dagli altri dispositivi.
  deadlines.connect(gid);
  unsubVehicle=onSnapshot(doc(db,"groups",gid,"settings","vehicle"),{includeMetadataChanges:true},snap=>{
    vehicleSync=!snap.metadata.fromCache&&!snap.metadata.hasPendingWrites;
    refreshSyncState();
    if(snap.exists()&&!vehicleDirty)fillVehicle(snap.data());
    // Non sovrascrivere un modulo con modifiche non ancora salvate.
  },err=>{syncError=true;refreshSyncState();toast("Errore dati camper: "+err.message);});
}
function renderShopping(){
  const ul=$("shoppingList"); ul.innerHTML="";
  $("shoppingEmpty").classList.toggle("hidden",shoppingCache.length>0);
  for(const item of shoppingCache){
    const li=document.createElement("li");li.className="item-row"+(item.checked?" checked":"");
    li.innerHTML=`<input type="checkbox" aria-label="Acquistato" ${item.checked?"checked":""}><div class="item-main"><div class="item-title">${escapeHTML(item.name)}</div><div class="item-meta">${escapeHTML(item.qty||"Quantità non indicata")} · ${escapeHTML(item.category||"Altro")}</div><div class="item-meta">${escapeHTML(authorLabel(item.createdBy))}</div></div><div class="item-actions"><button class="icon-btn delete-btn">Elimina</button></div>`;
    li.querySelector('input').addEventListener("change",async e=>{if(!canWrite()){e.target.checked=!e.target.checked;return;}try{await updateDoc(doc(db,"groups",groupId,"shopping",item.id),{checked:e.target.checked,updatedAt:serverTimestamp(),updatedBy:currentUser.uid});}catch(err){e.target.checked=!e.target.checked;writeFailed("Spunta",err);}});
    li.querySelector(".delete-btn").addEventListener("click",async()=>{if(confirm(`Eliminare “${item.name}”?`)&&canWrite())try{await deleteDoc(doc(db,"groups",groupId,"shopping",item.id));toast("Articolo eliminato.");}catch(err){writeFailed("Eliminazione articolo",err);}});
    ul.appendChild(li);
  }
}
function parseGpsInputs(latValue,lonValue){
  const lat=String(latValue||"").trim().replace(",",".");
  const lon=String(lonValue||"").trim().replace(",",".");
  if(!lat&&!lon)return null;
  if(!lat||!lon||!/^-?\d+(?:\.\d+)?$/.test(lat)||!/^-?\d+(?:\.\d+)?$/.test(lon)){
    throw new Error("Inserisci entrambe le coordinate GPS in formato numerico (latitudine e longitudine).");
  }
  const result=gpsPoint({latitude:Number(lat),longitude:Number(lon)});
  if(!result)throw new Error("Coordinate fuori intervallo: latitudine da -90 a 90, longitudine da -180 a 180.");
  return result;
}
function gpsInput(placeholder,value){
  const input=document.createElement("input");input.type="text";input.inputMode="decimal";
  input.placeholder=placeholder;input.value=value??"";input.setAttribute("aria-label",placeholder);
  input.maxLength=25;return input;
}

function renderWishlist(){
  const ul=$("wishlistList");ul.innerHTML="";
  $("wishlistEmpty").classList.toggle("hidden",wishlistCache.length>0);
  for(const place of wishlistCache){
    const li=document.createElement("li");li.className="item-row";
    const q=place.address||place.name;
    const mapsUrl="https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(q);
    li.innerHTML=`<div class="item-main"><div class="item-title">${escapeHTML(place.name)}</div><div class="item-meta">${escapeHTML(place.address||"Località da definire")} · Priorità ${escapeHTML(place.priority||"media")}</div><div class="item-meta">${escapeHTML(authorLabel(place.createdBy))}</div>${place.notes?`<p class="muted small">${escapeHTML(place.notes)}</p>`:""}<p><a href="${mapsUrl}" target="_blank" rel="noopener">Apri in Google Maps ↗</a></p></div><div class="item-actions"><button class="icon-btn delete-btn">Elimina</button></div>`;
    li.querySelector(".delete-btn").addEventListener("click",async()=>{if(confirm(`Eliminare la meta “${place.name}”?`)&&canWrite())try{await deleteDoc(doc(db,"groups",groupId,"wishlist",place.id));toast("Meta eliminata.");}catch(err){writeFailed("Eliminazione meta",err);}});
    const gps=gpsPoint(place);
    const details=document.createElement("details");details.className="gps-details";
    const summary=document.createElement("summary");
    summary.textContent=gps?"GPS salvato: "+gps.latitude.toFixed(5)+", "+gps.longitude.toFixed(5)+" · Modifica":"Aggiungi coordinate GPS";
    const latitudeField=gpsInput("Latitudine, es. 45.4408",gps?.latitude);
    const longitudeField=gpsInput("Longitudine, es. 12.3155",gps?.longitude);
    const save=document.createElement("button");save.type="button";save.className="secondary compact";save.textContent="Salva coordinate";
    const note=document.createElement("small");note.className="muted";note.textContent="Lascia entrambi i campi vuoti per rimuovere il GPS. I valori sono condivisi con la famiglia.";
    const inputs=document.createElement("div");inputs.className="gps-editor";
    inputs.append(latitudeField,longitudeField,save,note);details.append(summary,inputs);
    save.addEventListener("click",async()=>{
      if(!canWrite())return;
      try{
        const next=parseGpsInputs(latitudeField.value,longitudeField.value);
        await updateDoc(doc(db,"groups",groupId,"wishlist",place.id),{
          latitude:next?.latitude??null,longitude:next?.longitude??null,updatedAt:serverTimestamp(),updatedBy:currentUser.uid
        });
        writeSucceeded("Coordinate della meta aggiornate.");
      }catch(error){writeFailed("Coordinate GPS",error);}
    });
    li.querySelector(".item-main").appendChild(details);

    ul.appendChild(li);
  }
}
// Monitoraggio GPS volontario soltanto con CamperApp in primo piano.
// Nessun invio di coordinate ad altri servizi e nessuna geolocalizzazione in background.
let nearbyWatchId=null;
let nearbySeen=new Set();
function nearbyGpsCount(){return wishlistCache.filter(place=>gpsPoint(place)).length;}
function updateNearbyState(){
  const output=$("nearbyState");if(!output)return;
  if(nearbyWatchId!==null){
    output.textContent="Controllo GPS attivo mentre CamperApp è aperta · "+nearbyGpsCount()+" mete con coordinate.";
  }else{
    output.textContent="Avvisi disattivati · "+nearbyGpsCount()+" mete con coordinate GPS.";
  }
}
function stopNearbyMonitoring(message){
  if(nearbyWatchId!==null&&navigator.geolocation){
    navigator.geolocation.clearWatch(nearbyWatchId);
  }
  nearbyWatchId=null;nearbySeen.clear();
  const start=$("nearbyStart"),stop=$("nearbyStop"),status=$("nearbyState");
  if(start)start.disabled=false;
  if(stop)stop.disabled=true;
  if(status)status.textContent=message||"Avvisi disattivati.";
}
function checkNearbyPosition(position){
  if(document.visibilityState==="hidden")return;
  const point={latitude:position.coords.latitude,longitude:position.coords.longitude};
  if(!gpsPoint(point))return;
  const radius=Number($("nearbyRadius").value);
  const accuracy=Number(position.coords.accuracy)||0;
  if(accuracy>radius*1000){
    $("nearbyState").textContent="GPS troppo impreciso (±"+Math.round(accuracy)+" m). Non invio avvisi per evitare falsi allarmi.";
    return;
  }
  const nearbyList=$("nearbyMatches");
  const activeIds=new Set();
  for(const place of wishlistCache){
    const distance=gpsDistanceKm(point,place);
    if(distance===null)continue;
    if(distance<=radius){
      activeIds.add(place.id);
      if(!nearbySeen.has(place.id)){
        nearbySeen.add(place.id);
        const li=document.createElement("li");
        li.textContent="📍 "+place.name+" a circa "+Math.round(distance*1000)+" metri (in linea d’aria)";
        nearbyList.prepend(li);
        while(nearbyList.children.length>6)nearbyList.lastChild.remove();
        toast("Meta vicina: "+place.name);
      }
    }else if(distance>radius*1.5){
      nearbySeen.delete(place.id);
    }
  }
  $("nearbyState").textContent="GPS attivo · precisione ±"+Math.round(accuracy)+" m · mete nel raggio: "+activeIds.size+". Il monitoraggio può fermarsi se chiudi l’app.";
}
$("nearbyStart").addEventListener("click",()=>{
  if(nearbyWatchId!==null)return;
  if(!navigator.geolocation){$("nearbyState").textContent="GPS non disponibile sul dispositivo.";return;}
  if(!nearbyGpsCount()){$("nearbyState").textContent="Aggiungi prima le coordinate GPS ad almeno una meta salvata.";return;}
  nearbySeen.clear();$("nearbyMatches").replaceChildren();
  $("nearbyStart").disabled=true;$("nearbyStop").disabled=false;
  $("nearbyState").textContent="Richiesta autorizzazione alla posizione in corso…";
  try{
    nearbyWatchId=navigator.geolocation.watchPosition(
      checkNearbyPosition,
      error=>{
        const label={1:"Permesso posizione negato",2:"Posizione non disponibile",3:"Ricerca posizione scaduta"}[error.code]||"Errore GPS";
        stopNearbyMonitoring(label+". Puoi riprovare dalle impostazioni del dispositivo.");
      },
      {enableHighAccuracy:true,maximumAge:20000,timeout:20000}
    );
  }catch(error){stopNearbyMonitoring("Impossibile attivare il GPS: "+error.message);}
});
$("nearbyStop").addEventListener("click",()=>stopNearbyMonitoring("Monitoraggio GPS interrotto."));
// Se la PWA passa in secondo piano, interrompi il GPS: no consumo nascosto e no allarmi promessi in background.
document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState==="hidden"&&nearbyWatchId!==null)stopNearbyMonitoring("Monitoraggio sospeso: riapri CamperApp e riattivalo.");
});

function updateSummaries(){
  const unchecked=shoppingCache.filter(x=>!x.checked).length;
  $("shoppingSummary").textContent=`${unchecked} articoli da acquistare`;
  $("wishlistSummary").textContent=`${wishlistCache.length} mete salvate`;
}
function fillVehicle(v){$("vehicleLength").value=v.length??7.38;$("vehicleWidth").value=v.width??2.32;$("vehicleHeight").value=v.height??2.95;$("vehicleMass").value=v.maxMassKg??3500;}
$("loginBtn").addEventListener("click",async()=>{try{msg("authMessage","");await signInWithEmailAndPassword(auth,$("email").value.trim(),$("password").value); }catch(e){msg("authMessage",friendlyError(e));}});
$("registerBtn").addEventListener("click",async()=>{try{msg("authMessage","");if($("password").value.length<6)throw new Error("La password deve contenere almeno 6 caratteri.");await createUserWithEmailAndPassword(auth,$("email").value.trim(),$("password").value); }catch(e){msg("authMessage",friendlyError(e));}});
$("logoutBtn").addEventListener("click",async()=>{cleanup();await signOut(auth);});
$("createGroupBtn").addEventListener("click",async()=>{
  try{
    msg("groupMessage","");const gid=randomGroupId(),code=inviteCode(),name=$("groupName").value.trim()||"Il nostro camper";
    await setDoc(doc(db,"groups",gid),{name,ownerUid:currentUser.uid,createdAt:serverTimestamp()});
    await setDoc(doc(db,"groups",gid,"members",currentUser.uid),{uid:currentUser.uid,email:currentUser.email,role:"owner",joinedAt:serverTimestamp()});
    await setDoc(doc(db,"invites",code),{groupId:gid,createdBy:currentUser.uid,createdAt:serverTimestamp()});
    await setDoc(doc(db,"users",currentUser.uid),{email:currentUser.email,groupId:gid,updatedAt:serverTimestamp()},{merge:true});
    alert("Codice d'invito per il secondo account: "+code+"\nConservalo e inseriscilo dal secondo account.");
    await loadGroup(gid);
  }catch(e){msg("groupMessage",friendlyError(e));}
});
$("joinGroupBtn").addEventListener("click",async()=>{
  try{
    msg("groupMessage","");const code=$("inviteCode").value.trim().toUpperCase();if(!code)throw new Error("Inserisci il codice d'invito.");
    const inv=await getDoc(doc(db,"invites",code));if(!inv.exists())throw new Error("Codice non valido.");
    const gid=inv.data().groupId;
    await setDoc(doc(db,"groups",gid,"members",currentUser.uid),{uid:currentUser.uid,email:currentUser.email,role:"member",inviteCode:code,joinedAt:serverTimestamp()});
    await setDoc(doc(db,"users",currentUser.uid),{email:currentUser.email,groupId:gid,updatedAt:serverTimestamp()},{merge:true});
    await loadGroup(gid);
  }catch(e){msg("groupMessage",friendlyError(e));}
});
$("shoppingForm").addEventListener("submit",async e=>{
  e.preventDefault();if(!canWrite())return;try{await addDoc(colRef("shopping"),{name:$("itemName").value.trim(),qty:$("itemQty").value.trim(),category:$("itemCategory").value,checked:false,createdAt:serverTimestamp(),createdBy:currentUser.uid,updatedAt:serverTimestamp(),updatedBy:currentUser.uid});$("itemName").value="";$("itemQty").value="";writeSucceeded("Articolo aggiunto.");}catch(err){writeFailed("Aggiunta articolo",err);}
});
$("resetShoppingBtn").addEventListener("click",async()=>{
  if(!confirm("Rimettere tutti gli articoli come non acquistati?")||!canWrite())return;
  try{const batch=writeBatch(db);shoppingCache.filter(x=>x.checked).forEach(item=>batch.update(doc(db,"groups",groupId,"shopping",item.id),{checked:false,updatedAt:serverTimestamp(),updatedBy:currentUser.uid}));await batch.commit();writeSucceeded("Spunte azzerate. Gli articoli restano nella lista.");}catch(err){writeFailed("Reset spunte",err);}
});
$("wishlistForm").addEventListener("submit",async e=>{
  e.preventDefault();if(!canWrite())return;
  try{
    const gps=parseGpsInputs($("placeLatitude").value,$("placeLongitude").value);
    const data={name:$("placeName").value.trim(),address:$("placeAddress").value.trim(),priority:$("placePriority").value,notes:$("placeNotes").value.trim(),createdAt:serverTimestamp(),createdBy:currentUser.uid,updatedAt:serverTimestamp()};
    if(gps)Object.assign(data,gps);
    await addDoc(colRef("wishlist"),data);
    $("wishlistForm").reset();writeSucceeded("Meta salvata.");
  }catch(err){writeFailed("Salvataggio meta",err);}
});
$("vehicleForm").addEventListener("input",()=>{vehicleDirty=true;});
$("vehicleForm").addEventListener("submit",async e=>{
  e.preventDefault();if(!canWrite())return;try{await setDoc(doc(db,"groups",groupId,"settings","vehicle"),{length:Number($("vehicleLength").value),width:Number($("vehicleWidth").value),height:Number($("vehicleHeight").value),maxMassKg:Number($("vehicleMass").value),updatedAt:serverTimestamp(),updatedBy:currentUser.uid});vehicleDirty=false;writeSucceeded("Dati camper salvati.");}catch(err){writeFailed("Salvataggio dati camper",err);}
});

// Itinerario: la posizione è richiesta solo quando l'utente tocca il pulsante.
$("locateBtn").addEventListener("click",()=>{
  const status=$("locationStatus");
  if(!navigator.geolocation){status.textContent="Questo dispositivo non supporta la geolocalizzazione. Inserisci la partenza manualmente.";return;}
  status.textContent="Ricerca della posizione in corso…";
  navigator.geolocation.getCurrentPosition(pos=>{
    const {latitude,longitude}=pos.coords;
    $("routeOrigin").value=`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    status.textContent="Posizione rilevata. Puoi modificarla manualmente se necessario.";
  },err=>{
    const reasons={1:"Permesso posizione negato.",2:"Posizione non disponibile.",3:"Richiesta scaduta."};
    status.textContent=(reasons[err.code]||"Non riesco a rilevare la posizione.")+" Inserisci la partenza manualmente.";
  },{enableHighAccuracy:true,timeout:15000,maximumAge:60000});
});
$("itineraryForm").addEventListener("submit",e=>{
  e.preventDefault();
  const origin=$("routeOrigin").value.trim(),destination=$("routeDestination").value.trim();
  if(!origin||!destination){toast("Inserisci partenza e destinazione.");return;}
  const params=new URLSearchParams({api:"1",origin,destination,travelmode:"driving"});
  const waypoints=$("routeWaypoints").value.trim();
  const stops=waypoints.split(";").map(x=>x.trim()).filter(Boolean);
  // Maps URLs: su browser Android supporta al massimo tre tappe intermedie.
  if(stops.length>3){toast("Su Android Google Maps supporta fino a 3 tappe: apri le singole giornate.");return;}
  if(stops.length)params.set("waypoints",stops.join("|"));
  window.open("https://www.google.com/maps/dir/?"+params.toString(),"_blank","noopener");
});


// Le mete vengono lette dalla lista già sincronizzata; non si salvano copie o nuovi dati.
function renderSavedPlaces(){
  const container=$("routeSavedPlaces");
  if(!container)return;
  container.replaceChildren();
  if(!wishlistCache.length){
    const p=document.createElement("p");
    p.className="muted small";
    p.textContent="Nessuna meta salvata. Aggiungine una nella sezione Mete.";
    container.appendChild(p);
    return;
  }
  wishlistCache.forEach(place=>{
    const row=document.createElement("div");
    row.className="route-place-row";
    const info=document.createElement("div");
    info.className="route-place-info";
    const title=document.createElement("strong");
    title.textContent=place.name;
    const detail=document.createElement("small");
    detail.textContent=place.address||"Località non specificata";
    info.append(title,detail);
    const location=(place.address||place.name||"").trim();
    const destinationBtn=document.createElement("button");
    destinationBtn.type="button";
    destinationBtn.className="secondary compact";
    destinationBtn.textContent="Destinazione";
    destinationBtn.disabled=!location;
    destinationBtn.addEventListener("click",()=>{
      $("routeDestination").value=location;
      toast("Destinazione impostata.");
    });
    const stopBtn=document.createElement("button");
    stopBtn.type="button";
    stopBtn.className="secondary compact";
    stopBtn.textContent="Aggiungi tappa";
    stopBtn.disabled=!location;
    stopBtn.addEventListener("click",()=>{
      const field=$("routeWaypoints");
      const places=field.value.split(";").map(p=>p.trim()).filter(Boolean);
      if(places.some(p=>p.toLocaleLowerCase()===location.toLocaleLowerCase())){
        toast("Tappa già presente.");
        return;
      }
      places.push(location);
      field.value=places.join("; ");
      toast("Tappa aggiunta.");
    });
    const buttons=document.createElement("div");
    buttons.className="route-place-buttons";
    buttons.append(destinationBtn,stopBtn);
    row.append(info,buttons);
    container.appendChild(row);
  });
}


// La bozza usa soltanto mete esistenti: nessun geocoding, distanza o durata inventati.
function normalizePlanText(value){
  return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("it").trim();
}
let plannedDays=[];
function planPlaceLocation(place){return (place.address||place.name||"").trim();}
function planSearchLink(label,place){
  const a=document.createElement("a");
  a.href="https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(label+" vicino a "+place);
  a.target="_blank";a.rel="noopener";
  a.textContent=label+" · "+place;
  return a;
}
function dayDate(index){
  const value=$("planStartDate").value;
  if(!/^\d{4}-\d\d-\d\d$/.test(value))return null;
  const date=new Date(value+"T12:00:00Z");
  if(Number.isNaN(date.getTime()))return null;
  date.setUTCDate(date.getUTCDate()+index);
  return date.toISOString().slice(0,10);
}
function planEventsLink(place,date){
  const a=document.createElement("a");
  const query="sagre feste eventi in programma "+place+" "+(date||"");
  a.href="https://www.google.com/search?q="+encodeURIComponent(query);
  a.target="_blank";a.rel="noopener";
  a.textContent="🎉 Cerca eventi e sagre"+(date?" · "+date:"")+" · "+place;
  return a;
}
function openDayDirections(dayIndex){
  const places=plannedDays[dayIndex]||[];
  const locations=places.map(planPlaceLocation).filter(Boolean);
  if(!locations.length){toast("Giornata senza mete.");return;}
  if(locations.length>4){toast("Riduci a massimo 4 mete per usare Google Maps su Android.");return;}
  const previous=plannedDays.slice(0,dayIndex).flat().map(planPlaceLocation).filter(Boolean);
  const origin=dayIndex===0?$("routeOrigin").value.trim():previous[previous.length-1]||"";
  const params=new URLSearchParams({api:"1",destination:locations[locations.length-1],travelmode:"driving"});
  if(origin)params.set("origin",origin);
  if(locations.length>1)params.set("waypoints",locations.slice(0,-1).join("|"));
  window.open("https://www.google.com/maps/dir/?"+params.toString(),"_blank","noopener");
}
function renderTripPlan(){
  const results=$("planResults");results.replaceChildren();
  plannedDays.forEach((places,dayIndex)=>{
    const section=document.createElement("section");section.className="route-plan-day";
    const date=dayDate(dayIndex);
    const title=document.createElement("strong");title.textContent="Giorno "+(dayIndex+1)+(date?" · "+date:"");
    section.appendChild(title);
    if(!places.length){
      const empty=document.createElement("p");empty.className="muted small";
      empty.textContent="Giornata libera: puoi trasferire qui una meta da un altro giorno.";
      section.appendChild(empty);
    }
    places.forEach((place,index)=>{
      const item=document.createElement("div");item.className="route-plan-place";
      const label=document.createElement("span");
      const earlier=index?places[index-1]:plannedDays.slice(0,dayIndex).flat().slice(-1)[0];
      const km=earlier?gpsDistanceKm(earlier,place):null;
      label.textContent=place.name+(place.address?" — "+place.address:"")+
        (km!==null?" · circa "+km.toFixed(1)+" km in linea d’aria dalla tappa precedente":"");
      item.appendChild(label);
      const controls=document.createElement("div");controls.className="route-place-buttons";
      const add=(caption,disabled,action)=>{
        const button=document.createElement("button");button.type="button";
        button.className="secondary compact";button.textContent=caption;button.disabled=disabled;
        button.addEventListener("click",action);controls.appendChild(button);
      };
      add("↑",index===0,()=>{[places[index-1],places[index]]=[places[index],places[index-1]];renderTripPlan();});
      add("↓",index===places.length-1,()=>{[places[index+1],places[index]]=[places[index],places[index+1]];renderTripPlan();});
      add("Giorno −",dayIndex===0,()=>{places.splice(index,1);plannedDays[dayIndex-1].push(place);renderTripPlan();});
      add("Giorno +",dayIndex===plannedDays.length-1,()=>{places.splice(index,1);plannedDays[dayIndex+1].push(place);renderTripPlan();});
      add("Escludi",false,()=>{places.splice(index,1);renderTripPlan();});
      item.appendChild(controls);section.appendChild(item);
    });
    if(places.length){
      const nav=document.createElement("button");
      nav.type="button";nav.className="secondary compact";
      nav.textContent="🗺️ Apri questa giornata in Google Maps";
      nav.addEventListener("click",()=>openDayDirections(dayIndex));
      section.appendChild(nav);
      const searches=document.createElement("div");searches.className="route-plan-searches";
      places.forEach(place=>{
        const locality=planPlaceLocation(place);
        if(!locality)return;
        searches.append(
          planSearchLink("🏕️ Campeggi",locality),
          planSearchLink("🚐 Aree sosta",locality),
          planSearchLink("💧 Carico/scarico e WC",locality),
          planEventsLink(locality,date)
        );
      });
      section.appendChild(searches);
    }
    results.appendChild(section);
  });
  $("planApplyBtn").classList.toggle("hidden",!plannedDays.some(day=>day.length));
}
function generateTripPlan(){
  const area=$("planArea").value.trim();
  const days=Number($("planDays").value);
  const status=$("planMessage");
  plannedDays=[];$("planResults").replaceChildren();$("planApplyBtn").classList.add("hidden");
  if(!area){status.textContent="Indica una zona o località da cercare tra le mete salvate.";return;}
  if(!Number.isInteger(days)||days<1||days>14){status.textContent="Inserisci da 1 a 14 giorni.";return;}
  const needle=normalizePlanText(area);
  const ranked={alta:0,media:1,bassa:2};
  // Prima le corrispondenze nella località, poi nel nome; le sole note sono facoltative.
  const includeNotes=$("planIncludeNotes").checked;
  function matchRank(place){
    const address=normalizePlanText(place.address);
    const name=normalizePlanText(place.name);
    const notes=normalizePlanText(place.notes);
    if(address.split(",").map(x=>x.trim()).includes(needle))return 0;
    if(address.includes(needle))return 1;
    if(name.includes(needle))return 2;
    if(includeNotes&&notes.includes(needle))return 3;
    return 99;
  }
  const matches=wishlistCache
    .filter(p=>matchRank(p)<99)
    .sort((x,y)=>matchRank(x)-matchRank(y)||(ranked[x.priority]??1)-(ranked[y.priority]??1));
  if(!matches.length){
    status.textContent="Nessuna meta salvata contiene «"+area+"». Prova una zona diversa o aggiungi mete con località e note.";
    return;
  }
  // Massimo due mete per giornata: è una distribuzione indicativa, non basata sulle distanze.
  plannedDays=Array.from({length:days},()=>[]);
  const selected=matches.slice(0,days*2);
  const located=selected.filter(place=>gpsPoint(place)).length;
  const ordered=located>=2?arrangeByAirDistance(selected,gpsOrigin($("routeOrigin").value)):selected;
  ordered.forEach((place,i)=>plannedDays[Math.floor(i/2)].push(place));
  status.textContent="Trovate "+matches.length+" mete; selezionate "+selected.length+". Mete con coordinate: "+located+". "+
    (located>=2?"Ordine geografico indicativo calcolato per distanze in linea d'aria, NON su strada.":"Ordine per località e priorità: servono almeno due mete GPS per calcolare le distanze.")+
    " Per viaggi su Android apri Google Maps giornata per giornata. Eventi e servizi sono ricerche esterne da verificare.";
  renderTripPlan();
}
function applyTripPlan(){
  const locations=plannedDays.flat().map(planPlaceLocation).filter(Boolean);
  if(!locations.length){toast("Non ci sono mete nella proposta.");return;}
  // Il trasferimento non apre automaticamente Google Maps e non modifica Firestore.
  if(locations.length>10){toast("Troppe tappe per il percorso: riduci la proposta prima di applicarla.");return;}
  $("routeDestination").value=locations[locations.length-1];
  $("routeWaypoints").value=locations.slice(0,-1).join("; ");
  toast(locations.length>4?"Tappe trasferite: su Android apri ogni giornata separatamente.":"Tappe trasferite. Controlla partenza e ordine.");
}
$("planGenerateBtn").addEventListener("click",generateTripPlan);
$("planStartDate").addEventListener("change",()=>{if(plannedDays.length)renderTripPlan();});
$("planApplyBtn").addEventListener("click",applyTripPlan);

// Ricerca di strutture presso destinazione e tappe inserite.
function routeSearchLocations(){
  const destination=$("routeDestination").value.trim();
  const waypoints=$("routeWaypoints").value.split(";").map(x=>x.trim()).filter(Boolean);
  return [...new Set([destination,...waypoints].filter(Boolean))];
}
function openStopSearch(kind){
  const locations=routeSearchLocations();
  if(!locations.length){toast("Inserisci prima una destinazione o una tappa.");return;}
  const label=kind==="campground"?"campeggi":kind==="services"?"camper service carico scarico acque WC":"aree sosta camper";
  const list=$("routeStopSearches");
  list.replaceChildren();
  locations.forEach(place=>{
    const query=label+" vicino a "+place;
    const link=document.createElement("a");
    link.href="https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(query);
    link.target="_blank";link.rel="noopener";link.textContent=label.charAt(0).toUpperCase()+label.slice(1)+" vicino a "+place+" ↗";
    list.appendChild(link);
  });
  if(locations.length===1)window.open("https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(label+" vicino a "+locations[0]),"_blank","noopener");
}
$("searchCampgroundsBtn").addEventListener("click",()=>openStopSearch("campground"));
$("searchStopoversBtn").addEventListener("click",()=>openStopSearch("stopover"));
$("searchServicesBtn").addEventListener("click",()=>openStopSearch("services"));

document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>switchTab(b.dataset.tab)));
document.querySelectorAll("[data-goto]").forEach(b=>b.addEventListener("click",()=>switchTab(b.dataset.goto)));
onAuthStateChanged(auth,async user=>{
  cleanup();currentUser=user;show("logoutBtn",!!user);
  if(!user){setView("authView");show("setupNotice",true);return;}
  show("setupNotice",false);$("userLabel").textContent=user.email||"Account";
  allowGroupChanges(false);
  await restoreCurrentGroup();
});
function friendlyError(e){
  const code=e?.code||"";
  if(code.includes("auth/invalid-credential"))return "Email o password non corretti.";
  if(code.includes("auth/email-already-in-use"))return "Questa email è già registrata: prova ad accedere.";
  if(code.includes("auth/weak-password"))return "Scegli una password di almeno 6 caratteri.";
  if(code.includes("auth/invalid-email"))return "L'indirizzo email non è valido.";
  if(code.includes("permission-denied"))return "Permesso negato. Verifica le regole di sicurezza Firestore nel README.";
  return e?.message||"Si è verificato un errore.";
}
if("serviceWorker" in navigator)window.addEventListener("load",()=>{
  navigator.serviceWorker.register("./sw.js",{updateViaCache:"none"})
    .then(registration=>registration.update())
    .catch(err=>console.warn("Controllo aggiornamenti non disponibile:",err));
});
