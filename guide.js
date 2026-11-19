import { schede } from './vademecum-data.js';
import { normeSosta, normeVerificateIl } from './norme-sosta.js';
const list=document.getElementById('guideList'), detail=document.getElementById('guideDetail'), search=document.getElementById('guideSearch');
const escapeHTML=s=>String(s??"").replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paragraph=(heading,text)=>'<h4>'+escapeHTML(heading)+'</h4><p>'+escapeHTML(text)+'</p>';
function showCard(i){
  const s=schede[i];if(!s)return;
  const italy=s.kind==='regione';
  const rules=normeSosta[italy?'Italia':s.name];
  detail.classList.remove('hidden');
  let content='<p class="eyebrow">'+escapeHTML(s.group)+'</p><h3>'+escapeHTML(s.name)+'</h3><h4>🚐 Norme e soste</h4>';
  if(rules){
    content+='<p><strong>Stato: '+escapeHTML(rules.stato)+'</strong></p>';
    if(italy)content+='<p class="notice warning">Per '+escapeHTML(s.name)+' è documentata soltanto la disciplina nazionale italiana: norme e provvedimenti regionali e comunali ancora da verificare.</p>';
    content+='<p class="small muted">Ambito: '+escapeHTML(rules.ambito)+'</p>';
    content+=paragraph('Sosta diurna e parcheggio',rules.sosta);
    content+=paragraph('Sosta notturna e pernottamento',rules.notte);
    content+=paragraph('Campeggio libero e occupazione esterna',rules.campeggio);
    content+=paragraph('Carico, scarico acque e WC',rules.servizi);
    content+=paragraph('Norme regionali, comunali e locali',rules.locali);
    content+='<h4>Fonti consultate</h4><ul>';
    rules.fonti.forEach(f=>{content+='<li><a href="'+escapeHTML(f.url)+'" target="_blank" rel="noopener">'+escapeHTML(f.titolo)+'</a></li>';});
    content+='</ul><p class="small muted">Data consultazione fonti: '+escapeHTML(normeVerificateIl)+'. La data non certifica che ogni ordinanza locale sia stata verificata.</p>';
  }else{
    content+='<p><strong>Stato: normativa di sosta ancora da verificare con fonti istituzionali.</strong></p>';
    content+=paragraph('Sosta diurna e notturna','Non sono ancora disponibili nella scheda fonti normative sufficienti a indicare dove sia consentito fermarsi o pernottare.');
    content+=paragraph('Campeggio e servizi','Campeggio libero, carico e scarico delle acque e WC non sono ancora verificati. Utilizzare solo strutture autorizzate e controllare i regolamenti locali.');
    content+=paragraph('Controlli necessari','Consultare legislazione nazionale e territoriale, provvedimenti comunali, segnaletica, ZTL e aree protette. Nessuna autorizzazione o sanzione è presunta.');
  }
  content+='<h4>📍 Mete consigliate</h4><p>'+escapeHTML(s.places)+'</p><p class="small muted">Queste sono mete turistiche, non aree di sosta verificate. Non basare una decisione di parcheggio o pernottamento sulla sola presenza di una località in questo elenco.</p>';
  detail.innerHTML=content;
  detail.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function render(){
  const q=search.value.toLocaleLowerCase('it').trim();list.replaceChildren();let count=0;
  schede.forEach((s,i)=>{
    if(!(s.name+' '+s.places).toLocaleLowerCase('it').includes(q))return;
    count++;const b=document.createElement('button');b.type='button';b.className='secondary guide-entry';
    b.textContent=s.name+' · '+s.group;b.addEventListener('click',()=>showCard(i));list.appendChild(b);
  });
  if(!count)list.textContent='Nessuna scheda trovata.';
}
search.addEventListener('input',render);render();
