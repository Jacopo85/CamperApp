import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, addDoc, collection, onSnapshot, updateDoc, deleteDoc, serverTimestamp, query, orderBy, getDocs, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const $ = id => document.getElementById(id);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let currentUser = null, groupId = null, unsubShopping = null, unsubWishlist = null, unsubGroup = null;
let shoppingCache = [], wishlistCache = [];
let authorNames = new Map();
const show = (id, yes=true) => $(id).classList.toggle("hidden", !yes);
const msg = (id, text) => { $(id).textContent = text || ""; };
function toast(text){ const t=$("toast"); t.textContent=text; t.classList.add("show"); setTimeout(()=>t.classList.remove("show"),2600); }
function setSync(text){ $("syncState").textContent=text; }
function setView(view){ ["authView","groupView","appView"].forEach(id=>show(id,false)); show(view); }
function switchTab(name){ document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===name)); document.querySelectorAll(".tab-panel").forEach(p=>p.classList.toggle("hidden",p.id!=="tab-"+name)); }
function escapeHTML(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function groupRef(){return doc(db,"groups",groupId);}
function colRef(name){return collection(db,"groups",groupId,name);}
function cleanup(){[unsubShopping,unsubWishlist,unsubGroup].forEach(fn=>{if(fn)fn();});unsubShopping=unsubWishlist=unsubGroup=null;groupId=null;shoppingCache=[];wishlistCache=[];authorNames=new Map();}
// I nomi sono associati agli UID dei membri; non viene modificato Firestore.
function memberDisplayName(email){
  const names={
    "jacoporeggioli@libero.it":"Jacopo",
    "azzurra.bellini@libero.it":"Azzurra",
    "azzurra.bellini@gmail.com":"Camper"
  };
  return names[String(email||"").trim().toLowerCase()]||null;
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
function inviteCode(){const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";let out="";for(let i=0;i<12;i++)out+=chars[Math.floor(Math.random()*chars.length)];return out;}
function randomGroupId(){return crypto.randomUUID().replaceAll("-","").slice(0,24);}
async function loadGroup(gid){
  cleanup(); groupId=gid;
  const ref=doc(db,"groups",gid); const snap=await getDoc(ref);
  if(!snap.exists()) throw new Error("Il gruppo non esiste più.");
  setView("appView"); $("userLabel").textContent=currentUser.email||"Account"; $("groupTitle").textContent=snap.data().name||"Il nostro camper"; setSync("Sincronizzazione attiva");
  unsubGroup=onSnapshot(ref,s=>{if(s.exists())$("groupTitle").textContent=s.data().name||"Il nostro camper";});
  void loadAuthorNames(gid);
  unsubShopping=onSnapshot(query(colRef("shopping"),orderBy("createdAt","asc")),snap=>{
    shoppingCache=snap.docs.map(d=>({id:d.id,...d.data()})); renderShopping(); updateSummaries();
  },err=>{setSync("Errore sincronizzazione");toast("Errore lista spesa: "+err.message);});
  unsubWishlist=onSnapshot(query(colRef("wishlist"),orderBy("createdAt","desc")),snap=>{
    wishlistCache=snap.docs.map(d=>({id:d.id,...d.data()})); renderWishlist(); updateSummaries();
  },err=>{setSync("Errore sincronizzazione");toast("Errore mete: "+err.message);});
  const vehicleSnap=await getDoc(doc(db,"groups",gid,"settings","vehicle"));
  if(vehicleSnap.exists()) fillVehicle(vehicleSnap.data());
  else await setDoc(doc(db,"groups",gid,"settings","vehicle"),{length:7.38,width:2.32,height:2.95,maxMassKg:3500,updatedAt:serverTimestamp()});
}
function renderShopping(){
  const ul=$("shoppingList"); ul.innerHTML="";
  $("shoppingEmpty").classList.toggle("hidden",shoppingCache.length>0);
  for(const item of shoppingCache){
    const li=document.createElement("li");li.className="item-row"+(item.checked?" checked":"");
    li.innerHTML=`<input type="checkbox" aria-label="Acquistato" ${item.checked?"checked":""}><div class="item-main"><div class="item-title">${escapeHTML(item.name)}</div><div class="item-meta">${escapeHTML(item.qty||"Quantità non indicata")} · ${escapeHTML(item.category||"Altro")}</div><div class="item-meta">${escapeHTML(authorLabel(item.createdBy))}</div></div><div class="item-actions"><button class="icon-btn delete-btn">Elimina</button></div>`;
    li.querySelector('input').addEventListener("change",async e=>{try{await updateDoc(doc(db,"groups",groupId,"shopping",item.id),{checked:e.target.checked,updatedAt:serverTimestamp(),updatedBy:currentUser.uid});}catch(err){toast("Non riesco a salvare la spunta: "+err.message);}});
    li.querySelector(".delete-btn").addEventListener("click",async()=>{if(confirm(`Eliminare “${item.name}”?`))try{await deleteDoc(doc(db,"groups",groupId,"shopping",item.id));toast("Articolo eliminato.");}catch(err){toast("Eliminazione non riuscita: "+err.message);}});
    ul.appendChild(li);
  }
}
function renderWishlist(){
  const ul=$("wishlistList");ul.innerHTML="";
  $("wishlistEmpty").classList.toggle("hidden",wishlistCache.length>0);
  for(const place of wishlistCache){
    const li=document.createElement("li");li.className="item-row";
    const q=place.address||place.name;
    const mapsUrl="https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(q);
    li.innerHTML=`<div class="item-main"><div class="item-title">${escapeHTML(place.name)}</div><div class="item-meta">${escapeHTML(place.address||"Località da definire")} · Priorità ${escapeHTML(place.priority||"media")}</div><div class="item-meta">${escapeHTML(authorLabel(place.createdBy))}</div>${place.notes?`<p class="muted small">${escapeHTML(place.notes)}</p>`:""}<p><a href="${mapsUrl}" target="_blank" rel="noopener">Apri in Google Maps ↗</a></p></div><div class="item-actions"><button class="icon-btn delete-btn">Elimina</button></div>`;
    li.querySelector(".delete-btn").addEventListener("click",async()=>{if(confirm(`Eliminare la meta “${place.name}”?`))try{await deleteDoc(doc(db,"groups",groupId,"wishlist",place.id));toast("Meta eliminata.");}catch(err){toast("Eliminazione non riuscita: "+err.message);}});
    ul.appendChild(li);
  }
}
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
  e.preventDefault();try{await addDoc(colRef("shopping"),{name:$("itemName").value.trim(),qty:$("itemQty").value.trim(),category:$("itemCategory").value,checked:false,createdAt:serverTimestamp(),createdBy:currentUser.uid,updatedAt:serverTimestamp(),updatedBy:currentUser.uid});$("itemName").value="";$("itemQty").value="";toast("Articolo aggiunto.");}catch(err){toast("Non riesco ad aggiungere l'articolo: "+err.message);}
});
$("resetShoppingBtn").addEventListener("click",async()=>{
  if(!confirm("Rimettere tutti gli articoli come non acquistati?"))return;
  try{const batch=writeBatch(db);shoppingCache.filter(x=>x.checked).forEach(item=>batch.update(doc(db,"groups",groupId,"shopping",item.id),{checked:false,updatedAt:serverTimestamp(),updatedBy:currentUser.uid}));await batch.commit();toast("Spunte azzerate. Gli articoli restano nella lista.");}catch(err){toast("Reset non riuscito: "+err.message);}
});
$("wishlistForm").addEventListener("submit",async e=>{
  e.preventDefault();try{await addDoc(colRef("wishlist"),{name:$("placeName").value.trim(),address:$("placeAddress").value.trim(),priority:$("placePriority").value,notes:$("placeNotes").value.trim(),createdAt:serverTimestamp(),createdBy:currentUser.uid,updatedAt:serverTimestamp()});$("wishlistForm").reset();toast("Meta salvata.");}catch(err){toast("Non riesco a salvare la meta: "+err.message);}
});
$("vehicleForm").addEventListener("submit",async e=>{
  e.preventDefault();try{await setDoc(doc(db,"groups",groupId,"settings","vehicle"),{length:Number($("vehicleLength").value),width:Number($("vehicleWidth").value),height:Number($("vehicleHeight").value),maxMassKg:Number($("vehicleMass").value),updatedAt:serverTimestamp(),updatedBy:currentUser.uid});toast("Dati camper salvati.");}catch(err){toast("Salvataggio non riuscito: "+err.message);}
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
  if(waypoints)params.set("waypoints",waypoints.split(";").map(x=>x.trim()).filter(Boolean).join("|"));
  window.open("https://www.google.com/maps/dir/?"+params.toString(),"_blank","noopener");
});

// Ricerca di campeggi e aree sosta presso destinazione e tappe inserite.
function routeSearchLocations(){
  const destination=$("routeDestination").value.trim();
  const waypoints=$("routeWaypoints").value.split(";").map(x=>x.trim()).filter(Boolean);
  return [...new Set([destination,...waypoints].filter(Boolean))];
}
function openStopSearch(kind){
  const locations=routeSearchLocations();
  if(!locations.length){toast("Inserisci prima una destinazione o una tappa.");return;}
  const label=kind==="campground"?"campeggi": "aree sosta camper";
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

document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>switchTab(b.dataset.tab)));
document.querySelectorAll("[data-goto]").forEach(b=>b.addEventListener("click",()=>switchTab(b.dataset.goto)));
onAuthStateChanged(auth,async user=>{
  cleanup();currentUser=user;show("logoutBtn",!!user);
  if(!user){setView("authView");show("setupNotice",true);return;}
  show("setupNotice",false);$("userLabel").textContent=user.email||"Account";
  try{
    const userDoc=await getDoc(doc(db,"users",user.uid));
    if(userDoc.exists()&&userDoc.data().groupId){await loadGroup(userDoc.data().groupId);}
    else setView("groupView");
  }catch(e){setView("groupView");msg("groupMessage",friendlyError(e));}
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
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
