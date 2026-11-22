import { schede } from './vademecum-data.js';
import { normeSosta, normeVerificateIl } from './norme-sosta.js';
import { normeRegionali } from './norme-regionali.js';

const list=document.getElementById('guideList');
const detail=document.getElementById('guideDetail');
const search=document.getElementById('guideSearch');
const escapeHTML=value=>String(value??"").replace(/[&<>"']/g,character=>({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[character]));
const paragraph=(heading,text)=>'<h4>'+escapeHTML(heading)+'</h4><p>'+escapeHTML(text||'Informazione non verificata per questa voce.')+'</p>';

function sourceLinks(sources){
  if(!sources?.length)return '<p class="small muted">Fonte specifica non ancora disponibile: questa informazione non è una conferma di liceità.</p>';
  return '<ul class="guide-sources">'+sources.map(source=>
    '<li><a href="'+escapeHTML(source.url)+'" target="_blank" rel="noopener noreferrer">'+escapeHTML(source.titolo)+'</a></li>'
  ).join('')+'</ul>';
}

function nationalDetails(rule){
  let html='<p class="small muted"><strong>Ambito:</strong> '+escapeHTML(rule.ambito||'Non specificato')+'</p>';
  html+=paragraph('Sosta diurna e parcheggio',rule.sosta);
  html+=paragraph('Pernottamento e sosta notturna',rule.notte);
  html+=paragraph('Campeggio libero e occupazione esterna',rule.campeggio);
  html+=paragraph('Carico, scarico acque e WC',rule.servizi);
  html+=paragraph('Controlli territoriali prima di fermarsi',rule.locali);
  html+='<h4>Fonti e documenti consultati</h4>'+sourceLinks(rule.fonti);
  html+='<p class="small muted">Ricognizione: '+escapeHTML(rule.verificatoIl||normeVerificateIl)+'. Non sono necessariamente verificati tutti gli aggiornamenti, i regolamenti locali o l’apertura delle strutture.</p>';
  return html;
}

function showCard(index){
  const place=schede[index];if(!place)return;
  const italy=place.kind==='regione';
  const national=normeSosta[italy?'Italia':place.name];
  const regional=italy?normeRegionali[place.name]:null;
  detail.classList.remove('hidden');
  let html='<p class="eyebrow">'+escapeHTML(place.group)+'</p><h3>'+escapeHTML(place.name)+'</h3>';
  html+='<p class="small muted">Sintesi documentale; le fonti citate possono avere ambito nazionale, regionale, locale o meramente informativo.</p>';
  if(italy){
    html+='<h4>Regole regionali specifiche</h4>';
    if(regional){
      html+='<p><strong>'+escapeHTML(regional.stato)+'</strong></p>';
      html+='<p class="guide-legal-summary">'+escapeHTML(regional.dettaglio)+'</p>';
      html+='<h4>Fonti regionali</h4>'+sourceLinks(regional.fonti);
      html+='<p class="small muted">'+escapeHTML(regional.limiti)+'</p>';
      html+='<p class="small muted">Ricognizione regionale: '+escapeHTML(regional.verificatoIl||'Non indicata')+'.</p>';
    }else{
      html+='<p class="muted">Documentazione regionale non disponibile. Non presumere autorizzazioni.</p>';
    }
    if(national){
      html+='<details class="guide-details"><summary>Regole valide in Italia: art. 185 Codice della Strada e scarichi</summary>';
      html+='<p><strong>'+escapeHTML(national.stato)+'</strong></p>'+nationalDetails(national)+'</details>';
    }
  }else if(national){
    html+='<h4>Disposizioni e indicazioni disponibili</h4>';
    html+='<p><strong>'+escapeHTML(national.stato)+'</strong></p>';
    html+=nationalDetails(national);
  }else{
    html+='<p><strong>Normativa specifica non documentata.</strong> Non è stata verificata l’autorizzazione a sostare o campeggiare nel luogo scelto.</p>';
  }
  html+='<details class="guide-details"><summary>Controlli indispensabili prima della sosta</summary>';
  html+='<ul><li>Verificare cartelli, ordinanze del Comune, limiti orari e ZTL.</li>';
  html+='<li>Controllare l’accesso e le dimensioni ammesse, specie in parcheggi, centri storici e strade di montagna.</li>';
  html+='<li>Distinguere parcheggio del veicolo, pernottamento a bordo e allestimento del campeggio.</li>';
  html+='<li>Usare solo impianti di scarico e carico autorizzati; controllare l’area protetta e le condizioni del gestore.</li></ul></details>';
  html+='<h4>📍 Mete consigliate</h4><p>'+escapeHTML(place.places)+'</p>';
  html+='<p class="small muted">Le mete sono spunti turistici e non aree camper verificate. Il testo della scheda non è un permesso a parcheggiare o pernottare nel luogo indicato.</p>';
  detail.innerHTML=html;
  detail.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function render(){
  const q=search.value.toLocaleLowerCase('it').trim();list.replaceChildren();let count=0;
  schede.forEach((place,index)=>{
    if(!(place.name+' '+place.places).toLocaleLowerCase('it').includes(q))return;
    const button=document.createElement('button');
    button.type='button';
    button.className='secondary guide-entry';
    button.textContent=place.name+' · '+place.group;
    button.addEventListener('click',()=>showCard(index));
    list.appendChild(button);count++;
  });
  if(!count)list.textContent='Nessuna scheda trovata.';
}
search.addEventListener('input',render);
render();
