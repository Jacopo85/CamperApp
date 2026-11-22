// Funzioni pure dello scadenzario, senza accesso a Firebase.
export const DEADLINE_CATEGORIES=["Bollo","Assicurazione","Tagliando","Revisione","Manutenzione","Altro"];
export const DEADLINE_LEADS=[0,1,3,7,15,30,60,90];

export function validDeadlineDate(value){
  if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const [y,m,d]=value.split("-").map(Number);
  const date=new Date(Date.UTC(y,m-1,d));
  return y>=2000&&y<=2100&&date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d;
}
export function daysUntilDeadline(value,now=new Date()){
  if(!validDeadlineDate(value))return null;
  const [y,m,d]=value.split("-").map(Number);
  const start=Date.UTC(now.getFullYear(),now.getMonth(),now.getDate());
  return Math.round((Date.UTC(y,m-1,d)-start)/86400000);
}
export function deadlineState(item,now=new Date()){
  const delta=daysUntilDeadline(item?.date,now);
  if(delta===null)return {kind:"invalid",days:null,text:"Data non valida"};
  if(delta<0)return {kind:"overdue",days:delta,text:"Scaduta da "+Math.abs(delta)+" "+(delta===-1?"giorno":"giorni")};
  if(delta===0)return {kind:"today",days:0,text:"Scade oggi"};
  if(delta<=Number(item.leadDays??7))return {kind:"soon",days:delta,text:"Scade tra "+delta+" "+(delta===1?"giorno":"giorni")};
  return {kind:"future",days:delta,text:"Tra "+delta+" giorni"};
}
export function cleanDeadline(item){
  if(!item||typeof item!=="object")return null;
  const category=DEADLINE_CATEGORIES.includes(item.category)?item.category:"Altro";
  const title=String(item.title||"").trim().slice(0,100);
  if(!title||!validDeadlineDate(item.date))return null;
  const leadDays=DEADLINE_LEADS.includes(Number(item.leadDays))?Number(item.leadDays):7;
  return {id:String(item.id||"").slice(0,80),category,title,date:item.date,leadDays,notes:String(item.notes||"").slice(0,400)};
}
export function formatDeadlineDate(date){
  if(!validDeadlineDate(date))return "Data non valida";
  const [y,m,d]=date.split("-");
  return d+"/"+m+"/"+y;
}
function icsEscape(value){
  return String(value??"").replace(/\\/g,"\\\\").replace(/\r\n|\r|\n/g,"\\n").replace(/,/g,"\\,").replace(/;/g,"\\;");
}
function icsDate(date){
  return date.replaceAll("-","");
}
function addDay(ymd){
  const [y,m,d]=ymd.split("-").map(Number);
  const day=new Date(Date.UTC(y,m-1,d+1));
  return [day.getUTCFullYear(),String(day.getUTCMonth()+1).padStart(2,"0"),String(day.getUTCDate()).padStart(2,"0")].join("");
}
function icsTimestamp(date){
  const d=date instanceof Date&&Number.isFinite(date.getTime())?date:new Date();
  return d.toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");
}
function foldICalLine(line){
  // RFC 5545: ogni riga logica va ripiegata entro 75 ottetti UTF-8.
  const encoder=new TextEncoder();
  let result="",chunk="",bytes=0;
  for(const char of line){
    const count=encoder.encode(char).length;
    if(bytes+count>75){
      result+=chunk+"\r\n";
      chunk=" ";bytes=1;
    }
    chunk+=char;bytes+=count;
  }
  return result+chunk;
}
// Evento già compilato sul sito Google Calendar; l'utente deve salvare
// e impostare manualmente il preavviso (il link non può imporre l'allarme).
export function deadlineGoogleCalendarUrl(item,timeZone="Europe/Rome"){
  const entry=cleanDeadline(item);
  if(!entry)return null;
  const date=icsDate(entry.date);
  const zone=String(timeZone||"Europe/Rome").trim();
  const details="Scadenza CamperApp Family. Preavviso scelto: "+entry.leadDays+
    " giorni prima. Imposta il promemoria nelle opzioni di Google Calendar e salva l'evento."+
    (entry.notes?"\nNote: "+entry.notes:"");
  const params=new URLSearchParams({
    action:"TEMPLATE",
    text:"Camper – "+entry.category+": "+entry.title,
    dates:date+"T090000/"+date+"T093000",
    details,
    ctz:zone
  });
  return "https://calendar.google.com/calendar/render?"+params.toString();
}
export function deadlineIcs(items,now=new Date()){
  const valid=(Array.isArray(items)?items:[]).map(cleanDeadline).filter(Boolean);
  const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//CamperApp Family//Scadenzario//IT","CALSCALE:GREGORIAN","METHOD:PUBLISH"];
  for(const entry of valid){
    const description="Scadenza del camper. Preavviso richiesto: "+entry.leadDays+" giorni."+(entry.notes?" Note: "+entry.notes:"");
    const uid=(entry.id.replace(/[^a-zA-Z0-9-]/g,"")||"scadenza")+"@camperapp-family";
    lines.push("BEGIN:VEVENT");
    lines.push("UID:"+uid);
    lines.push("DTSTAMP:"+icsTimestamp(now));
    // Evento locale alle 09:00: non richiede un fuso orario in ingresso.
    lines.push("DTSTART:"+icsDate(entry.date)+"T090000");
    lines.push("DTEND:"+icsDate(entry.date)+"T093000");
    lines.push("SUMMARY:"+icsEscape("Camper – "+entry.category+": "+entry.title));
    lines.push("DESCRIPTION:"+icsEscape(description));
    lines.push("BEGIN:VALARM");
    lines.push("ACTION:DISPLAY");
    lines.push("DESCRIPTION:"+icsEscape("Promemoria camper: "+entry.title));
    lines.push("TRIGGER:"+(entry.leadDays?"-P"+entry.leadDays+"D":"PT0S"));
    lines.push("END:VALARM");
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldICalLine).join("\r\n")+"\r\n";
}
