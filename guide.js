import { schede } from './vademecum-data.js';
const list=document.getElementById('guideList'), detail=document.getElementById('guideDetail'), search=document.getElementById('guideSearch');
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function showCard(i){const s=schede[i];if(!s)return;
 const italy=s.kind==='regione';
 detail.classList.remove('hidden');
 detail.innerHTML=`<p class="eyebrow">${escapeHTML(s.group)}</p><h3>${escapeHTML(s.name)}</h3><h4>🚐 Norme e soste</h4><p><strong>Stato: da verificare con fonti ufficiali.</strong> Controlla parcheggio e pernottamento, campeggio libero, carico/scarico, aree attrezzate, divieti comunali, ZTL, parchi e sanzioni. Non considerare autorizzata la sosta solo perché una meta compare qui.</p>${italy?'<p>In Italia la distinzione generale tra sosta e campeggio è disciplinata dall’art. 185 del Codice della Strada; restano rilevanti le norme regionali e i provvedimenti locali.</p><p><a target="_blank" rel="noopener" href="https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:1992-04-30;285">Codice della Strada – fonte normativa nazionale</a></p>':''}<h4>📍 Mete consigliate</h4><p>${escapeHTML(s.places)}</p><p class="small muted">Le mete sono spunti turistici, non aree di sosta confermate. Fonte locale e data di verifica normativa: da completare. Ultimo aggiornamento del catalogo: 31/10/2026.</p>`;
 detail.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function render(){const q=search.value.toLocaleLowerCase('it').trim();list.replaceChildren();let count=0;schede.forEach((s,i)=>{if(!(s.name+' '+s.places).toLocaleLowerCase('it').includes(q))return;count++;const b=document.createElement('button');b.type='button';b.className='secondary guide-entry';b.textContent=`${s.name} · ${s.group}`;b.addEventListener('click',()=>showCard(i));list.appendChild(b)});if(!count)list.textContent='Nessuna scheda trovata.'}
search.addEventListener('input',render);render();
