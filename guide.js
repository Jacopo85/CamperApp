import { schede } from './vademecum-data.js';
import { normeSosta, normeVerificateIl } from './norme-sosta.js';
import { normeRegionali } from './norme-regionali.js';

const list=document.getElementById('guideList');
const detail=document.getElementById('guideDetail');
const search=document.getElementById('guideSearch');
const escapeHTML=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const paragraph=(heading,text)=>'<h4>'+escapeHTML(heading)+'</h4><p>'+escapeHTML(text)+'</p>';

function sourceLinks(fonti){
  if(!fonti?.length)return '<p class="small muted">Nessuna fonte sufficientemente specifica individuata per questa materia.</p>';
  return '<ul>'+fonti.map(f=>
    '<li><a target="_blank" rel="noopener noreferrer" href="'+escapeHTML(f.url)+'">'+escapeHTML(f.titolo)+'</a></li>'
  ).join('')+'</ul>';
}

function showCard(i){
  const s=schede[i];if(!s)return;
  const italy=s.kind==='regione';
  const national=normeSosta[italy?'Italia':s.name];
  const regional=italy?normeRegionali[s.name]:null;
  detail.classList.remove('hidden');
  let content='<p class="eyebrow">'+escapeHTML(s.group)+'</p><h3>'+escapeHTML(s.name)+'</h3>';
  content+='<p class="notice warning"><strong>Prima di sostare:</strong> questa guida non conferma l’autorizzazione a parcheggiare, dormire o campeggiare in un luogo specifico. Controllare cartelli, ordinanze, aree protette, accessi e regole del gestore.</p>';
  content+='<h4>🚐 Regole sulla sosta del camper</h4>';
  if(national){
    content+='<p><strong>Stato delle fonti nazionali: '+escapeHTML(national.stato)+'</strong></p>';
    content+='<p class="small muted">Ambito: '+escapeHTML(national.ambito||'Da definire')+'</p>';
    content+=paragraph('Sosta diurna e parcheggio',national.sosta);
    content+=paragraph('Sosta notturna e pernottamento',national.notte);
    content+=paragraph('Campeggio libero e occupazione esterna',national.campeggio);
    content+=paragraph('Carico, scarico acque e WC',national.servizi);
    content+=paragraph('Limiti territoriali e controlli sul posto',national.locali);
    content+='<h4>Fonti nazionali e riferimenti di contesto</h4>'+sourceLinks(national.fonti);
    content+='<p class="small muted">Data ricognizione della scheda: '+escapeHTML(national.verificatoIl||normeVerificateIl)+'. La presenza di una fonte non equivale a una verifica di tutte le regole locali.</p>';
  }else{
    content+='<p><strong>Stato: disposizioni normative ancora insufficientemente documentate.</strong></p>';
    content+=paragraph('Sosta e pernottamento','Non sono disponibili riferimenti sufficienti per determinare dove sia consentito fermarsi o dormire nel mezzo.');
    content+=paragraph('Campeggio e servizi','Regole di campeggio libero, carico e scarico ancora da accertare. Non presumere alcuna autorizzazione.');
  }
  if(italy){
    content+='<h4>🇮🇹 Disciplina regionale: '+escapeHTML(s.name)+'</h4>';
    if(regional){
      content+='<p><strong>Stato della verifica regionale: '+escapeHTML(regional.stato)+'</strong></p>';
      content+='<p>'+escapeHTML(regional.dettaglio)+'</p>';
      content+='<p class="small muted">'+escapeHTML(regional.limiti)+'</p>';
      content+='<h4>Fonti regionali</h4>'+sourceLinks(regional.fonti);
      content+='<p class="small muted">Data ricognizione regionale: '+escapeHTML(regional.verificatoIl||'Non indicata')+'.</p>';
    }else{
      content+='<p>Non è disponibile una verifica regionale. Valgono i controlli sul posto.</p>';
    }
  }
  content+='<h4>📍 Mete consigliate</h4><p>'+escapeHTML(s.places)+'</p>';
  content+='<p class="small muted">Le mete sono spunti turistici, non parcheggi o aree di sosta autorizzati. Per i limiti di altezza, larghezza, lunghezza e massa del camper occorre controllare il tragitto e la segnaletica.</p>';
  detail.innerHTML=content;
  detail.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function render(){
  const q=search.value.toLocaleLowerCase('it').trim();list.replaceChildren();let count=0;
  schede.forEach((s,i)=>{
    if(!(s.name+' '+s.places).toLocaleLowerCase('it').includes(q))return;
    count++;
    const button=document.createElement('button');
    button.type='button';
    button.className='secondary guide-entry';
    button.textContent=s.name+' · '+s.group;
    button.addEventListener('click',()=>showCard(i));
    list.appendChild(button);
  });
  if(!count)list.textContent='Nessuna scheda trovata.';
}
search.addEventListener('input',render);
render();
